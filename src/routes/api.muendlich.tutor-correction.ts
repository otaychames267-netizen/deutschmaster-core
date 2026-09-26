import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateVoiceTutorCorrection } from "@/lib/grading/voice-tutor-correction";

/**
 * Authenticated route: runs the deferred, post-session language-correction
 * pass for a finished AI Voice Tutor session. Mirrors grade-essay.ts's
 * auth/rate-limit/persist convention. No credit deduct/refund dance here —
 * unlike essay grading, the Voice Tutor's cost gate (the 45-min daily cap)
 * was already spent live during the conversation itself; a correction-call
 * failure doesn't need to "give back" anything, it just means the student
 * doesn't get corrections for that session and can be told so plainly.
 */

const MIN_TRANSCRIPT_NODES = 2;

export const Route = createFileRoute("/api/muendlich/tutor-correction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          return new Response("Server not configured", { status: 503 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Missing Bearer token" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseAsUser = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: authError } = await supabaseAsUser.auth.getUser(token);
        if (authError || !userData?.user) {
          return Response.json({ error: "Invalid token" }, { status: 401 });
        }
        const userId = userData.user.id;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");
        const allowed = await checkRateLimit(supabaseAdmin, { key: `tutor-correction:${userId}`, windowSeconds: 60, maxRequests: 5 });
        if (!allowed) {
          return Response.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
        }

        let body: { session_id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const sessionId = body.session_id;
        if (!sessionId) {
          return Response.json({ error: "session_id is required" }, { status: 400 });
        }

        // Ownership-checked lookup, service role (students have no direct
        // read grant needed here — the check IS the userId match below).
        const { data: session, error: sessionError } = await (supabaseAdmin as any)
          .from("voice_tutor_sessions")
          .select("id, user_id, level")
          .eq("id", sessionId)
          .maybeSingle();
        if (sessionError || !session || session.user_id !== userId) {
          return Response.json({ error: "Session not found" }, { status: 404 });
        }

        // Already corrected? Return the existing row instead of re-spending a
        // Claude call — UNIQUE(session_id) on voice_tutor_corrections means a
        // second insert would fail anyway.
        const { data: existing } = await (supabaseAdmin as any)
          .from("voice_tutor_corrections")
          .select("feedback, model")
          .eq("session_id", sessionId)
          .maybeSingle();
        if (existing) {
          return Response.json({ ...existing.feedback, model: existing.model, already_existed: true });
        }

        const { data: nodes, error: nodesError } = await (supabaseAdmin as any)
          .from("voice_tutor_transcript_nodes")
          .select("speaker, text, started_at")
          .eq("session_id", sessionId)
          .order("started_at", { ascending: true });
        if (nodesError) {
          return Response.json({ error: "Could not load transcript" }, { status: 500 });
        }
        if (!nodes || nodes.length < MIN_TRANSCRIPT_NODES) {
          return Response.json(
            { error: "TRANSCRIPT_TOO_SHORT", message: "Das Gespräch war zu kurz für eine Auswertung." },
            { status: 422 },
          );
        }

        const transcriptText = nodes.map((n: { speaker: string; text: string }) => `${n.speaker}: ${n.text}`).join("\n");
        const level: "B1" | "B2" = String(session.level ?? "").toUpperCase().includes("B1") ? "B1" : "B2";

        let result;
        try {
          result = await generateVoiceTutorCorrection(transcriptText, level);
        } catch (e) {
          console.error("[tutor-correction] correction failed:", e);
          return Response.json(
            { error: "CORRECTION_FAILED", message: "Die Auswertung ist fehlgeschlagen. Deine Sitzung wurde trotzdem gespeichert." },
            { status: 502 },
          );
        }

        const feedback = {
          error_correction_matrix: result.error_correction_matrix,
          better_formulations: result.better_formulations,
          vocabulary_enrichment: result.vocabulary_enrichment,
          summary: result.summary,
        };
        const { error: saveError } = await (supabaseAdmin as any)
          .from("voice_tutor_corrections")
          .insert({ session_id: sessionId, user_id: userId, feedback, model: result.model });
        if (saveError) {
          console.error("[tutor-correction] failed to persist correction:", saveError);
        }

        return Response.json({ ...feedback, model: result.model });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { gradeEssay, normalizeCefrLevel } from "@/lib/grading/essay-grader";

/**
 * Authenticated route: finishes a Prüfungssimulation attempt.
 *
 * Objective sections (Lesen/Sprachbausteine/Hören) are already scored by the
 * client calling score_simulation_sections() directly beforehand — pure SQL,
 * no AI, no reason to round-trip through a server route. This route only
 * handles the one step that CANNOT happen inside Postgres: grading the
 * Schreiben essay via Claude. Deliberately does NOT touch the essay-credit
 * system (deduct_essay_credit) — per product decision, a full simulation's
 * Schreiben grading is included free, not billed against practice credits.
 */
export const Route = createFileRoute("/api/schreiben/submit-simulation")({
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
        const allowed = await checkRateLimit(supabaseAdmin, { key: `submit-simulation:${userId}`, windowSeconds: 60, maxRequests: 5 });
        if (!allowed) {
          return Response.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
        }

        let body: { attempt_id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const attemptId = body.attempt_id;
        if (!attemptId) {
          return Response.json({ error: "attempt_id is required" }, { status: 400 });
        }

        // Ownership + shape check — service role read, but scoped explicitly
        // to this user's own attempt (never trust the client's claim alone).
        // Cast: simulation_attempts/finalize_simulation aren't in the generated
        // types yet (Supabase CLI type regen is broken on this machine) — same
        // `as any` pattern used elsewhere in this repo ahead of the generated types.
        const { data: attempt, error: attemptError } = await (supabaseAdmin as any)
          .from("simulation_attempts")
          .select("id, user_id, status, score_lesen, score_sb, score_hoeren, schreiben_exam_id, schreiben_text")
          .eq("id", attemptId)
          .eq("user_id", userId)
          .maybeSingle();
        if (attemptError || !attempt) {
          return Response.json({ error: "Attempt not found" }, { status: 404 });
        }
        if (attempt.status !== "in_progress") {
          return Response.json({ error: "ATTEMPT_NOT_IN_PROGRESS" }, { status: 409 });
        }
        if (attempt.score_lesen === null || attempt.score_sb === null || attempt.score_hoeren === null) {
          return Response.json({ error: "OBJECTIVE_SECTIONS_NOT_SCORED" }, { status: 409 });
        }

        const essayText = (attempt.schreiben_text ?? "").trim();
        const wordCount = essayText ? essayText.split(/\s+/).filter(Boolean).length : 0;

        let scoreSchreiben = 0;
        let essayGradingId: string | null = null;

        // Ran out of time / left it blank — score 0 without wasting an AI call.
        if (wordCount >= 15) {
          const { data: examRow } = await supabaseAdmin
            .from("exams")
            .select("id, metadata")
            .eq("id", attempt.schreiben_exam_id as string)
            .maybeSingle();
          const { data: item } = await supabaseAdmin
            .from("exam_items")
            .select("id, content")
            .eq("exam_id", attempt.schreiben_exam_id as string)
            .eq("kind", "writing_prompt")
            .maybeSingle();
          const task = (item?.content as any)?.task as string | undefined;

          if (examRow && item && task) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("level")
              .eq("id", userId)
              .maybeSingle();
            const level = normalizeCefrLevel(profile?.level);
            const category = (examRow.metadata as any)?.category as string | undefined;

            try {
              const result = await gradeEssay(task, essayText, supabaseAsUser, level, category);
              scoreSchreiben = result.overall_score;

              const { data: saved } = await (supabaseAdmin as any)
                .from("essay_gradings")
                .insert({
                  user_id: userId,
                  exam_id: examRow.id,
                  exam_item_id: item.id,
                  essay_text: essayText,
                  word_count: wordCount,
                  model: result.model,
                  task_achievement_score: result.task_achievement_score,
                  communicative_design_score: result.communicative_design_score,
                  formal_accuracy_score: result.formal_accuracy_score,
                  overall_score: result.overall_score,
                  passed: result.passed,
                  feedback: result.feedback,
                })
                .select("id")
                .single();
              essayGradingId = saved?.id ?? null;
            } catch (e) {
              console.error("[submit-simulation] Schreiben grading failed, scoring 0:", e);
              scoreSchreiben = 0;
            }
          }
        }

        const { data: finalized, error: finalizeError } = await (supabaseAsUser as any).rpc("finalize_simulation", {
          p_attempt_id: attemptId,
          p_score_schreiben: scoreSchreiben,
          p_essay_grading_id: essayGradingId,
        });
        if (finalizeError) {
          console.error("[submit-simulation] finalize_simulation failed:", finalizeError);
          return Response.json({ error: "Could not finalize the exam. Please try again." }, { status: 500 });
        }

        return Response.json({ ...(finalized as object), essay_grading_id: essayGradingId });
      },
    },
  },
});

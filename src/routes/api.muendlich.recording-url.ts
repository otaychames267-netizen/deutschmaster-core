import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Authenticated route: returns a short-lived signed URL for the caller's OWN
 * exam recording — never the exam partner's. The 'muendlich-recordings'
 * bucket (muendlich-relay/server.ts's uploadRecordings()) has no storage RLS
 * policies at all; this route IS the access control, matching the schema's
 * own documented design intent ("signed URLs generated server-side per the
 * owning participant"). Ownership is checked via muendlich_participants —
 * the exact same join used by the existing transcript/session SELECT
 * policies — not trusted from the request body.
 */

export const Route = createFileRoute("/api/muendlich/recording-url")({
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

        let body: { session_id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const sessionId = body.session_id;
        if (!sessionId) return Response.json({ error: "session_id required" }, { status: 400 });

        const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

        const { data: session } = await admin
          .from("muendlich_exam_sessions")
          .select("room_id, recording_a_path, recording_b_path")
          .eq("id", sessionId)
          .maybeSingle();
        if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

        const { data: participant } = await admin
          .from("muendlich_participants")
          .select("slot")
          .eq("room_id", session.room_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!participant) return Response.json({ error: "Not a participant of this exam session" }, { status: 403 });

        const path = participant.slot === "A" ? session.recording_a_path : session.recording_b_path;
        if (!path) return Response.json({ error: "No recording available for this session" }, { status: 404 });

        const { data: signed, error: signError } = await admin.storage
          .from("muendlich-recordings")
          .createSignedUrl(path, 600); // 10 minutes — enough to load and listen, short-lived by design
        if (signError || !signed?.signedUrl) {
          return Response.json({ error: signError?.message ?? "Could not create signed URL" }, { status: 500 });
        }

        return Response.json({ url: signed.signedUrl });
      },
    },
  },
});

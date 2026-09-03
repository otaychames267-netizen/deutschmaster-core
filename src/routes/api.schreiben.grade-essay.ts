import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { gradeEssay, isBudgetExceeded, normalizeCefrLevel } from "@/lib/grading/essay-grader";

/**
 * Authenticated route: grades a student's essay against strict telc B2 criteria.
 * Sequence: verify bearer token -> per-user rate limit -> check the global
 * AI budget cap (before spending a credit) -> deduct 1 credit (atomic
 * RPC, as the student's own auth context) -> call Claude -> on failure
 * refund the credit -> on success persist the grading and return it.
 *
 * The ANTHROPIC_API_KEY never reaches the client — it's only read server-side
 * inside essay-grader.ts.
 */

const MIN_ESSAY_WORDS = 20;

export const Route = createFileRoute("/api/schreiben/grade-essay")({
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

        // Client scoped to the student's own token, so auth.uid() inside the
        // deduct/refund RPCs resolves to this student (same pattern as
        // src/integrations/supabase/auth-middleware.ts).
        const supabaseAsUser = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: authError } = await supabaseAsUser.auth.getUser(token);
        if (authError || !userData?.user) {
          return Response.json({ error: "Invalid token" }, { status: 401 });
        }
        const userId = userData.user.id;

        // Rate limit before any expensive work (budget check, DB lookups,
        // Gemini call) — bounds how fast a user with credits can fire
        // requests, independent of the credit-balance gate itself.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");
        const allowed = await checkRateLimit(supabaseAdmin, { key: `grade-essay:${userId}`, windowSeconds: 60, maxRequests: 5 });
        if (!allowed) {
          return Response.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
        }

        let body: { exam_item_id?: string; essay_text?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const examItemId = body.exam_item_id;
        const essayText = (body.essay_text ?? "").trim();
        if (!examItemId || !essayText) {
          return Response.json({ error: "exam_item_id and essay_text are required" }, { status: 400 });
        }

        const wordCount = essayText.split(/\s+/).filter(Boolean).length;
        if (wordCount < MIN_ESSAY_WORDS) {
          return Response.json(
            { error: `Essay too short (${wordCount} words) — write at least ${MIN_ESSAY_WORDS} words before submitting for grading.` },
            { status: 400 },
          );
        }

        // Trusted server-side lookup of the item's task prompt — bypasses RLS
        // deliberately, this is a read-only lookup of published exam content.
        const { data: item, error: itemError } = await supabaseAdmin
          .from("exam_items")
          .select("id, exam_id, kind, content")
          .eq("id", examItemId)
          .maybeSingle();
        if (itemError || !item || item.kind !== "writing_prompt") {
          return Response.json({ error: "Writing prompt not found" }, { status: 404 });
        }
        const task = (item.content as any)?.task as string | undefined;
        if (!task) {
          return Response.json({ error: "Malformed exercise content" }, { status: 500 });
        }

        // 1. Global budget gate — checked BEFORE spending a credit, so a
        // budget-exceeded rejection never costs the student anything.
        if (await isBudgetExceeded(supabaseAsUser)) {
          return Response.json(
            { error: "BUDGET_EXCEEDED", message: "Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut." },
            { status: 503 },
          );
        }

        // 2. Atomic deduction. Race-safe: a concurrent double-submit will have
        // exactly one call succeed, the other raises INSUFFICIENT_CREDITS.
        const { data: newBalance, error: deductError } = await supabaseAsUser.rpc("deduct_essay_credit", {
          p_user_id: userId,
        });
        if (deductError) {
          if (deductError.message?.includes("INSUFFICIENT_CREDITS")) {
            return Response.json({ error: "INSUFFICIENT_CREDITS", message: "You don't have enough credits for another grading attempt." }, { status: 402 });
          }
          return Response.json({ error: "Could not process credit" }, { status: 500 });
        }

        // 3. Call the grader against the student's own exam level (profiles.level),
        // not a hardcoded standard — a B1 student must be graded on B1 criteria.
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("level")
          .eq("id", userId)
          .maybeSingle();
        const level = normalizeCefrLevel(profile?.level);

        let result;
        try {
          result = await gradeEssay(task, essayText, supabaseAsUser, level);
        } catch (e) {
          await supabaseAsUser.rpc("refund_essay_credit", { p_user_id: userId, p_reason: "essay_grading_refund" });
          console.error("[grade-essay] grading failed, credit refunded:", e);
          return Response.json(
            { error: "GRADING_FAILED", message: "Grading failed — your credit was refunded. Please try again.", debug: String((e as any)?.message ?? e) },
            { status: 502 },
          );
        }

        // 4. Persist the result (service role — students have no direct insert grant).
        // Cast: generated types.ts still reflects the pre-rubric-v2 essay_gradings
        // shape (Supabase CLI type regen is broken on this machine — see
        // scripts/db-apply.mjs workaround note); same `as any` pattern already
        // used elsewhere in this repo for tables/columns ahead of the generated types.
        const { data: saved, error: saveError } = await (supabaseAdmin as any)
          .from("essay_gradings")
          .insert({
            user_id: userId,
            exam_id: item.exam_id,
            exam_item_id: examItemId,
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
          .select("id, created_at")
          .single();
        if (saveError) {
          console.error("[grade-essay] failed to persist grading (credit already spent):", saveError);
        }

        return Response.json({
          grading_id: saved?.id ?? null,
          ...result,
          remaining_balance: newBalance,
        });
      },
    },
  },
});

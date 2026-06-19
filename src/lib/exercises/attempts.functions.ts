import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gradeAnswer, type ExerciseKind } from "./grading";

type SubmitInput = {
  exerciseId: string;
  answer: unknown;
  durationSeconds?: number;
  examSessionId?: string | null;
};

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SubmitInput) => d)
  .handler(async ({ data, context }) => {
    const { data: ex, error } = await context.supabase
      .from("exercises")
      .select("id,kind,correct,options,explanation,status")
      .eq("id", data.exerciseId)
      .maybeSingle();
    if (error || !ex) throw new Error(error?.message ?? "Exercise not found");
    if (ex.status !== "published") throw new Error("Exercise is not available");

    const result = gradeAnswer(
      ex.kind as ExerciseKind,
      data.answer,
      (ex.correct as unknown[]) ?? [],
      ex.options,
    );

    const { error: insErr } = await context.supabase.from("user_exercise_attempts").insert({
      user_id: context.userId,
      exercise_id: ex.id,
      answer: data.answer as never,
      score: result.score,
      is_correct: result.isCorrect,
      duration_seconds: data.durationSeconds ?? null,
      needs_review: result.needsReview,
      exam_session_id: data.examSessionId ?? null,
      completed_at: new Date().toISOString(),
    });
    if (insErr) throw new Error(insErr.message);

    // For passage_mcq, expose the per-question correct map so the client can
    // mark every embedded item green/red on the review screen.
    let correctOut: string[] | Record<string, string> = Array.isArray(ex.correct)
      ? (ex.correct as unknown[]).map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      : [];
    if (ex.kind === "passage_mcq" && ex.options && typeof ex.options === "object" && !Array.isArray(ex.options)) {
      const qs = ((ex.options as any).questions ?? []) as Array<{ n: string; correct: string | null }>;
      const map: Record<string, string> = {};
      for (const q of qs) if (q?.correct != null) map[String(q.n)] = String(q.correct);
      correctOut = map;
    }

    return {
      score: result.score,
      isCorrect: result.isCorrect,
      needsReview: result.needsReview,
      correct: correctOut,
      explanation: ex.explanation,
    };
  });
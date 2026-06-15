import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Level = "b1" | "b2";
type Mode = "schriftlich" | "muendlich";

// Standard TELC structure (counts per Teil, total exam minutes).
const BLUEPRINT: Record<Mode, { durationMin: number; parts: Array<{ module: string; teil: number; count: number }> }> = {
  schriftlich: {
    durationMin: 165,
    parts: [
      { module: "lesen", teil: 1, count: 5 },
      { module: "lesen", teil: 2, count: 5 },
      { module: "lesen", teil: 3, count: 10 },
      { module: "sprachbausteine", teil: 1, count: 10 },
      { module: "sprachbausteine", teil: 2, count: 10 },
      { module: "hoeren", teil: 1, count: 5 },
      { module: "hoeren", teil: 2, count: 10 },
      { module: "hoeren", teil: 3, count: 5 },
      { module: "schreiben", teil: 1, count: 1 },
    ],
  },
  muendlich: {
    durationMin: 30,
    parts: [
      { module: "muendlich", teil: 1, count: 1 },
      { module: "muendlich", teil: 2, count: 1 },
      { module: "muendlich", teil: 3, count: 1 },
    ],
  },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const startExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { level: Level; mode: Mode }) => d)
  .handler(async ({ data, context }) => {
    const bp = BLUEPRINT[data.mode];
    const ids: string[] = [];
    for (const p of bp.parts) {
      const { data: pool } = await context.supabase
        .from("exercises")
        .select("id")
        .eq("level", data.level)
        .eq("module", p.module as never)
        .eq("teil", p.teil)
        .eq("status", "published");
      const picked = shuffle((pool ?? []).map((r) => r.id)).slice(0, p.count);
      ids.push(...picked);
    }
    if (ids.length === 0) {
      throw new Error("No published exercises available for this level yet. Ask your admin to publish content.");
    }

    const endsAt = new Date(Date.now() + bp.durationMin * 60 * 1000).toISOString();
    const { data: session, error } = await context.supabase
      .from("exam_sessions")
      .insert({
        user_id: context.userId,
        level: data.level,
        mode: data.mode,
        exercise_ids: ids,
        ends_at: endsAt,
        status: "in_progress",
      })
      .select("id,exercise_ids,started_at,ends_at,status")
      .single();
    if (error || !session) throw new Error(error?.message ?? "Could not start exam");
    return { session };
  });

export const getExamSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("exam_sessions")
      .select("id,level,mode,exercise_ids,started_at,ends_at,submitted_at,status,score_total,score_breakdown")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !session) throw new Error(error?.message ?? "Session not found");

    const { data: exercises } = await context.supabase
      .from("exercises")
      .select("id,module,teil,kind,title,prompt,passage,audio_id,options")
      .in("id", session.exercise_ids as string[]);

    // Re-order by exercise_ids
    const map = new Map((exercises ?? []).map((e) => [e.id, e]));
    const ordered = (session.exercise_ids as string[]).map((id) => map.get(id)).filter(Boolean);

    const audioIds = Array.from(new Set(ordered.map((e: any) => e.audio_id).filter(Boolean))) as string[];
    const signed: Record<string, string> = {};
    if (audioIds.length) {
      const { data: assets } = await context.supabase.from("audio_assets").select("id,storage_path").in("id", audioIds);
      for (const a of assets ?? []) {
        const { data: s } = await context.supabase.storage.from("audio").createSignedUrl(a.storage_path, 3600);
        if (s?.signedUrl) signed[a.id] = s.signedUrl;
      }
    }

    const { data: existingAttempts } = await context.supabase
      .from("user_exercise_attempts")
      .select("exercise_id,answer,score,is_correct,needs_review")
      .eq("exam_session_id", data.sessionId)
      .eq("user_id", context.userId);

    return { session, exercises: ordered, audioUrls: signed, attempts: existingAttempts ?? [] };
  });

export const finishExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: attempts } = await context.supabase
      .from("user_exercise_attempts")
      .select("score,is_correct,needs_review,exercises:exercise_id(module)")
      .eq("exam_session_id", data.sessionId)
      .eq("user_id", context.userId);

    const list = (attempts ?? []) as Array<{ score: number | null; is_correct: boolean; needs_review: boolean; exercises: { module: string } | null }>;
    const total = list.length ? Math.round(list.reduce((s, a) => s + (a.score ?? 0), 0) / list.length) : 0;
    const breakdown: Record<string, { count: number; avg: number }> = {};
    for (const a of list) {
      const k = a.exercises?.module ?? "other";
      const b = breakdown[k] ?? { count: 0, avg: 0 };
      b.avg = (b.avg * b.count + (a.score ?? 0)) / (b.count + 1);
      b.count += 1;
      breakdown[k] = b;
    }
    for (const k of Object.keys(breakdown)) breakdown[k].avg = Math.round(breakdown[k].avg);

    const { error } = await context.supabase
      .from("exam_sessions")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score_total: total,
        score_breakdown: breakdown,
      })
      .eq("id", data.sessionId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return { total, breakdown, needsReview: list.filter((a) => a.needs_review).length };
  });
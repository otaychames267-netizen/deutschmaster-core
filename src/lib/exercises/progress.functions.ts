import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ModuleKey = "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";

export const getMyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceIso = since.toISOString();

    const [attemptsRes, publishedRes] = await Promise.all([
      supabase
        .from("user_exercise_attempts")
        .select("id,exercise_id,score,is_correct,completed_at,duration_seconds,exercises:exercise_id(module,teil)")
        .eq("user_id", userId)
        .gte("completed_at", sinceIso)
        .order("completed_at", { ascending: false }),
      supabase
        .from("exercises")
        .select("id,module,teil")
        .eq("status", "published"),
    ]);
    if (attemptsRes.error) throw new Error(attemptsRes.error.message);
    if (publishedRes.error) throw new Error(publishedRes.error.message);

    const attempts = (attemptsRes.data ?? []) as Array<{
      id: string; exercise_id: string; score: number | null; is_correct: boolean;
      completed_at: string; duration_seconds: number | null;
      exercises: { module: string; teil: number } | null;
    }>;
    const published = (publishedRes.data ?? []) as Array<{ id: string; module: string; teil: number }>;

    // Per-module progress (unique exercises completed / published)
    const moduleStats: Record<ModuleKey, { completed: number; total: number; avg: number; accuracy: number }> = {
      lesen: { completed: 0, total: 0, avg: 0, accuracy: 0 },
      sprachbausteine: { completed: 0, total: 0, avg: 0, accuracy: 0 },
      hoeren: { completed: 0, total: 0, avg: 0, accuracy: 0 },
      schreiben: { completed: 0, total: 0, avg: 0, accuracy: 0 },
      muendlich: { completed: 0, total: 0, avg: 0, accuracy: 0 },
    };
    for (const p of published) {
      const k = p.module as ModuleKey;
      if (moduleStats[k]) moduleStats[k].total += 1;
    }
    const byModuleDone = new Map<ModuleKey, Set<string>>();
    const byModuleScores = new Map<ModuleKey, number[]>();
    const byModuleCorrect = new Map<ModuleKey, { hit: number; total: number }>();
    for (const a of attempts) {
      const k = (a.exercises?.module ?? "lesen") as ModuleKey;
      if (!byModuleDone.has(k)) byModuleDone.set(k, new Set());
      byModuleDone.get(k)!.add(a.exercise_id);
      if (!byModuleScores.has(k)) byModuleScores.set(k, []);
      byModuleScores.get(k)!.push(a.score ?? 0);
      const c = byModuleCorrect.get(k) ?? { hit: 0, total: 0 };
      c.total += 1;
      if (a.is_correct) c.hit += 1;
      byModuleCorrect.set(k, c);
    }
    for (const k of Object.keys(moduleStats) as ModuleKey[]) {
      moduleStats[k].completed = byModuleDone.get(k)?.size ?? 0;
      const ss = byModuleScores.get(k) ?? [];
      moduleStats[k].avg = ss.length ? Math.round(ss.reduce((s, n) => s + n, 0) / ss.length) : 0;
      const cc = byModuleCorrect.get(k);
      moduleStats[k].accuracy = cc && cc.total ? Math.round((cc.hit / cc.total) * 100) : 0;
    }

    // Streak: consecutive days ending today with ≥1 attempt
    const dayKeys = new Set<string>(
      attempts.map((a) => new Date(a.completed_at).toISOString().slice(0, 10)),
    );
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 60; i++) {
      const k = cursor.toISOString().slice(0, 10);
      if (dayKeys.has(k)) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
      else if (i === 0) { cursor.setDate(cursor.getDate() - 1); }
      else break;
    }

    // 30-day activity (counts per day, oldest first)
    const last30: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      last30.push({ date: k, count: 0 });
    }
    const byDay = new Map(last30.map((d) => [d.date, d]));
    for (const a of attempts) {
      const k = new Date(a.completed_at).toISOString().slice(0, 10);
      const row = byDay.get(k);
      if (row) row.count += 1;
    }

    const totalAttempts = attempts.length;
    const correct = attempts.filter((a) => a.is_correct).length;
    const accuracy = totalAttempts ? Math.round((correct / totalAttempts) * 100) : 0;
    const minutesToday = Math.round(
      attempts
        .filter((a) => a.completed_at.slice(0, 10) === today.toISOString().slice(0, 10))
        .reduce((s, a) => s + (a.duration_seconds ?? 0), 0) / 60,
    );

    return {
      streak,
      totalAttempts,
      accuracy,
      minutesToday,
      modules: moduleStats,
      last30,
    };
  });
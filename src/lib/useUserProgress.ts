import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { toast } from "sonner";

export interface UserProgress {
  total_xp: number;
  level: number;
  streak_current: number;
  streak_longest: number;
  streak_last_active: string | null;
  exercises_completed: number;
  simulations_completed: number;
  total_study_sec: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  hidden: boolean;
  sort_order: number;
  unlocked_at: string | null;
}

const DEFAULT_PROGRESS: UserProgress = {
  total_xp: 0,
  level: 1,
  streak_current: 0,
  streak_longest: 0,
  streak_last_active: null,
  exercises_completed: 0,
  simulations_completed: 0,
  total_study_sec: 0,
};

/* XP needed to reach the NEXT level from current level */
export function xpForNextLevel(level: number): number {
  return (level * (level + 1) / 2) * 100;
}

export function xpForCurrentLevel(level: number): number {
  return level <= 1 ? 0 : ((level - 1) * level / 2) * 100;
}

export function levelProgress(totalXp: number, level: number): number {
  const curr = xpForCurrentLevel(level);
  const next = xpForNextLevel(level);
  if (next <= curr) return 100;
  return Math.min(100, Math.round(((totalXp - curr) / (next - curr)) * 100));
}

export function useUserProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [progressRes, achievementsRes, unlockedRes] = await Promise.all([
      supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("achievements")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id),
    ]);

    if (progressRes.data) {
      setProgress(progressRes.data as unknown as UserProgress);
    }

    if (achievementsRes.data) {
      const unlockedMap = new Map(
        (unlockedRes.data ?? []).map((u) => [u.achievement_id, u.unlocked_at])
      );
      setAchievements(
        achievementsRes.data.map((a) => ({
          ...a,
          unlocked_at: unlockedMap.get(a.id) ?? null,
        })) as Achievement[]
      );
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { progress, achievements, loading, reload: load };
}

/* Call this after an exercise or simulation is submitted */
export async function recordCompletion(
  userId: string,
  options: { isPerfect?: boolean; isSimulation?: boolean; xpOverride?: number } = {}
) {
  try {
    await supabase.rpc("record_exercise_completion", {
      _user_id:       userId,
      _is_perfect:    options.isPerfect ?? false,
      _is_simulation: options.isSimulation ?? false,
    });

    // Check & unlock achievements client-side
    await checkAndUnlockAchievements(userId);
  } catch (e) {
    console.warn("[XP] Failed to record completion", e);
  }
}

async function checkAndUnlockAchievements(userId: string) {
  const [progressRes, existingRes] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);

  const p = progressRes.data as UserProgress | null;
  if (!p) return;

  const unlocked = new Set((existingRes.data ?? []).map((u) => u.achievement_id));

  const toUnlock: { achievement_id: string; user_id: string }[] = [];

  function check(id: string, condition: boolean) {
    if (condition && !unlocked.has(id)) toUnlock.push({ achievement_id: id, user_id: userId });
  }

  check("first_exercise",   p.exercises_completed >= 1);
  check("exercise_5",       p.exercises_completed >= 5);
  check("exercise_10",      p.exercises_completed >= 10);
  check("exercise_25",      p.exercises_completed >= 25);
  check("exercise_50",      p.exercises_completed >= 50);
  check("exercise_100",     p.exercises_completed >= 100);
  check("exercise_500",     p.exercises_completed >= 500);
  check("first_simulation", p.simulations_completed >= 1);
  check("simulation_5",     p.simulations_completed >= 5);
  check("streak_3",         p.streak_current >= 3);
  check("streak_7",         p.streak_current >= 7);
  check("streak_14",        p.streak_current >= 14);
  check("streak_30",        p.streak_current >= 30);
  check("streak_60",        p.streak_current >= 60);
  check("streak_100",       p.streak_current >= 100);
  check("level_5",          p.level >= 5);
  check("level_10",         p.level >= 10);
  check("level_25",         p.level >= 25);

  if (toUnlock.length === 0) return;

  const { data: achievementsData } = await supabase
    .from("achievements")
    .select("id, title, xp_reward")
    .in("id", toUnlock.map((u) => u.achievement_id));

  await supabase.from("user_achievements").insert(toUnlock);

  for (const ach of achievementsData ?? []) {
    toast.success(`🏆 Achievement unlocked: ${ach.title}`, { duration: 4000 });
    if (ach.xp_reward > 0) {
      await supabase.rpc("award_xp", { _user_id: userId, _xp: ach.xp_reward });
    }
  }
}

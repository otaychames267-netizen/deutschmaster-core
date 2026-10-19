/**
 * Fetches learning_aids->'translation' for one exercise, once, lazily (only
 * on the first Translate click anywhere on the page) — never on mount, never
 * per-item. Safe to call any time the student can see the exercise text
 * (get_exercise_translation never returns answer-adjacent data), gated
 * server-side by the same has_plan_access/free-sample check as the content
 * itself.
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Skill } from "./types";

export interface TranslationData {
  text?: string;
  questions?: Record<string, string>;
}

export function useExerciseTranslation(skill: Skill, exerciseId: string) {
  const [data, setData] = useState<TranslationData | null>(null);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    try {
      const { data: raw, error } = await (supabase as any).rpc("get_exercise_translation", {
        p_skill: skill,
        p_exercise_id: exerciseId,
      });
      if (error) throw error;
      setData((raw ?? null) as TranslationData | null);
    } catch (e) {
      console.error("Übersetzung konnte nicht geladen werden:", e);
      fetched.current = false;
    } finally {
      setLoading(false);
    }
  }, [skill, exerciseId]);

  return { data, loading, ensureLoaded };
}

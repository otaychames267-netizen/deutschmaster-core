-- ============================================================
-- Real gap found during hands-on QA: Lesen Teil 1 and Teil 3 both let a
-- student click "Lösung anzeigen" to see the correct answers immediately —
-- even before submitting. Teil 2 only reveals a correct answer per-question,
-- and only for questions the student got WRONG after a full submission
-- (score_and_save_lesen_t2 always writes a real row to lesen_attempts, so it
-- can't safely be reused for a "just let me peek" button without polluting
-- the student's real score history with a fake 0/N attempt).
--
-- Fix: a read-only sibling function that returns the correct answers without
-- ever touching lesen_attempts — safe to call as many times as a student
-- likes. NOT yet wired into Teil2Exercise.tsx's UI (see that component for
-- the follow-up); this migration only adds the backend piece.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_lesen_t2_solution(p_exercise_id uuid)
RETURNS TABLE(number integer, correct_answer text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT q.number, q.correct
  FROM lesen_t2_questions q
  WHERE q.exercise_id = p_exercise_id
  ORDER BY q.number;
$$;

GRANT EXECUTE ON FUNCTION public.get_lesen_t2_solution(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_lesen_t2_solution(uuid) FROM anon;

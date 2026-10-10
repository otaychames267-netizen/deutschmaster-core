-- Regression fix: get_exercise_catalog (20260718010000) declares
-- RETURNS TABLE (id uuid, title text, ord integer), but sb_exercises.position
-- and hoeren_exercises.position are smallint, not integer. Postgres's strict
-- RETURNS TABLE type-checking rejects the mismatch at execution time
-- (42804: "Returned type smallint does not match expected type integer"),
-- so the whole RPC call errored for sprachbausteine/hoeren. The frontend hook
-- swallows the error into an empty array, which LockedExerciseOverview then
-- correctly renders as "No exercises here yet." for what looks like an empty
-- catalog — the exercises were never actually queried. lesen_exercises.sort_order
-- is already `integer`, which is why Lesen was unaffected.
CREATE OR REPLACE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
RETURNS TABLE (id uuid, title text, ord integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_skill = 'lesen' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.sort_order
      FROM public.lesen_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.sort_order NULLS LAST, e.created_at;
  ELSIF p_skill = 'hoeren' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer
      FROM public.sb_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSE
    RETURN;
  END IF;
END;
$$;

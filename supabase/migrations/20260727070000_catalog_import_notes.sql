-- The non-subscriber "locked preview" (LockedExerciseOverview) uses this
-- titles-only RPC, a completely separate path from the full-content fetch
-- subscribers use. It never returned import_notes, so the Tunisia-notice
-- grouping (added 2026-07-27 to the subscriber-facing pages) was invisible
-- to non-subscribers even when the underlying exercises were flagged.
-- import_notes is plain informational text (no answers/content), safe to
-- expose in the titles-only catalog.
-- Postgres rejects CREATE OR REPLACE when the return signature changes
-- (adding a column counts as a signature change) — must drop first.
DROP FUNCTION IF EXISTS public.get_exercise_catalog(text, text, integer);

CREATE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
RETURNS TABLE (id uuid, title text, ord integer, import_notes text)
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
      SELECT e.id, e.title, e.sort_order, e.import_notes
      FROM public.lesen_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.sort_order NULLS LAST, e.created_at;
  ELSIF p_skill = 'hoeren' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes
      FROM public.sb_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSE
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_exercise_catalog(text, text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_exercise_catalog(text, text, integer) TO authenticated;

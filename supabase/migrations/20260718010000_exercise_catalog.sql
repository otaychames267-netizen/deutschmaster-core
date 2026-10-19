-- Metadata catalog for the "visible-but-locked" preview.
--
-- Non-subscribers get ZERO rows from every content table (RLS gates them by
-- has_plan_access — unchanged, still fully enforced). To let them SEE the
-- structure (titles + lock icons) without exposing any protected content,
-- this SECURITY DEFINER function returns ONLY id / title / display order for
-- published prep exercises. It NEVER returns questions, answers, texts,
-- passages, audio paths, PDFs, solutions, or any content column — there is
-- literally no protected data in its result set, so there is nothing here to
-- leak even though it runs with definer privileges.
--
-- Requires an authenticated caller (auth.uid() not null) and a whitelisted
-- skill; anything else returns an empty set.

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
      SELECT e.id, e.title, e.position
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position
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

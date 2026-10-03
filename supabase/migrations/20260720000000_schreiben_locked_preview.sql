-- Schreiben (Beschwerde / Bitte) was the one prep section never wired into
-- the "visible-but-locked" preview pattern that Lesen, Hören, and
-- Sprachbausteine already use (get_exercise_catalog, 20260718010000 +
-- 20260719000000). Non-subscribers hitting /schreiben/beschwerde or
-- /schreiben/bitte got RLS-filtered zero rows from `exams`, which the
-- frontend rendered identically to "no content imported yet" — confirmed
-- live in the code, not a hypothetical. This adds the matching
-- SECURITY DEFINER catalog function for Schreiben, keyed by
-- metadata->>'category' (exams.teil is null for every schreiben row —
-- category is the real sub-type discriminator: 'beschwerde' today).
-- Same contract as get_exercise_catalog: id + title only, never task text.

CREATE OR REPLACE FUNCTION public.get_schreiben_catalog(p_level text, p_category text)
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

  RETURN QUERY
    SELECT e.id, e.title, e.display_order
    FROM public.exams e
    WHERE e.section = 'schreiben'
      AND e.level = p_level::public.user_level
      AND e.status = 'published'::public.exam_pub_status
      AND e.metadata->>'category' = p_category
    ORDER BY e.display_order NULLS LAST, e.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_schreiben_catalog(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_schreiben_catalog(text, text) TO authenticated;

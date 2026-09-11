-- Surfaces hoeren_exercises.reference_code through get_exercise_catalog so
-- the locked-preview path (non-subscribers/guests seeing a placeholder in
-- the "not yet unlocked" list) can also show the source lookup code, not
-- just the direct-fetch path already covered for subscribers. Lesen/
-- Sprachbausteine have no such column — NULL for those branches.

DROP FUNCTION IF EXISTS public.get_exercise_catalog(text, text, integer);

CREATE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
 RETURNS TABLE(id uuid, title text, ord integer, import_notes text, is_free_sample boolean, has_audio boolean, reference_code text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_skill = 'lesen' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.sort_order, e.import_notes, e.is_free_sample, NULL::boolean, NULL::text
      FROM public.lesen_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.sort_order NULLS LAST, e.created_at;
  ELSIF p_skill = 'hoeren' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample, (e.audio_path IS NOT NULL), e.reference_code
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample, NULL::boolean, NULL::text
      FROM public.sb_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSE
    RETURN;
  END IF;
END;
$function$;

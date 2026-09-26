-- Extend the titles-only catalog RPCs to also return is_free_sample, so the
-- frontend can badge + route non-subscribers into the real exercise UI for
-- exactly the flagged free-sample rows, without a second round-trip.
-- Byte-identical to the prior version except the added column.
-- RETURNS TABLE shape changed, so the old signatures must be dropped first.

DROP FUNCTION IF EXISTS public.get_exercise_catalog(text, text, integer);
DROP FUNCTION IF EXISTS public.get_schreiben_catalog(text, text);

CREATE OR REPLACE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
 RETURNS TABLE(id uuid, title text, ord integer, import_notes text, is_free_sample boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_skill = 'lesen' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.sort_order, e.import_notes, e.is_free_sample
      FROM public.lesen_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.sort_order NULLS LAST, e.created_at;
  ELSIF p_skill = 'hoeren' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample
      FROM public.sb_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSE
    RETURN;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_schreiben_catalog(p_level text, p_category text)
 RETURNS TABLE(id uuid, title text, ord integer, is_free_sample boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT e.id, e.title, e.display_order, e.is_free_sample
    FROM public.exams e
    WHERE e.section = 'schreiben'
      AND e.level = p_level::public.user_level
      AND e.status = 'published'::public.exam_pub_status
      AND e.metadata->>'category' = p_category
    ORDER BY e.display_order NULLS LAST, e.created_at;
END;
$function$;

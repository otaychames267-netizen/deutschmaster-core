-- get_exercise_catalog is the actual primary surface students (and guests)
-- see Hören exercises through — including the "Neu" badge row. The Teil-2
-- practice-list query and the Prüfungssimulation RPC were already patched
-- to respect hoeren_exercises.is_hidden in 20260808130000; this closes the
-- catalog gap so "Der Baumpfleger Matthias ( Neu )" is fully hidden.
CREATE OR REPLACE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
 RETURNS TABLE(id uuid, title text, ord integer, import_notes text, is_free_sample boolean, has_audio boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_skill = 'lesen' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.sort_order, e.import_notes, e.is_free_sample, NULL::boolean
      FROM public.lesen_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.sort_order NULLS LAST, e.created_at;
  ELSIF p_skill = 'hoeren' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample, (e.audio_path IS NOT NULL)
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample, NULL::boolean
      FROM public.sb_exercises e
      WHERE e.level = p_level AND e.teil = p_teil
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSE
    RETURN;
  END IF;
END;
$function$;

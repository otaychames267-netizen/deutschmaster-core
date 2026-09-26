-- Freemium guest-preview overhaul, part 1: let anonymous visitors browse the
-- title-only exercise catalog (id/title/order/free-flag — never protected
-- content) so the "browse locked, subscribe to unlock" experience works
-- without an account, not just for logged-in-unsubscribed users. The parent
-- content tables' "free sample read" RLS policies already run `TO public`
-- (covers anon), so the only gap was these two SECURITY DEFINER catalog RPCs
-- hard-blocking any caller with a null auth.uid().
--
-- Also adds a `has_audio` flag to the Hören branch of get_exercise_catalog so
-- the guest/unsubscribed Hören preview can list audio-bearing exercises
-- first without ever exposing the audio path itself.

DROP FUNCTION IF EXISTS public.get_exercise_catalog(text, text, integer);

CREATE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
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
      WHERE e.level = p_level AND e.teil = p_teil
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

CREATE OR REPLACE FUNCTION public.get_schreiben_catalog(p_level text, p_category text)
 RETURNS TABLE(id uuid, title text, ord integer, is_free_sample boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

GRANT EXECUTE ON FUNCTION public.get_exercise_catalog(text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_schreiben_catalog(text, text) TO anon, authenticated;

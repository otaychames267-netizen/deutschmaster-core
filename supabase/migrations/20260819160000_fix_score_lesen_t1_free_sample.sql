-- score_lesen_t1 (the non-saving "Lösung anzeigen" preview RPC) lost its
-- is_free_sample exemption when 20260810180000_learning_assistance_foundation.sql
-- re-created it to add learning_aids output — every sibling function
-- (score_and_save_lesen_t1, score_lesen_t2, score_lesen_t3, score_sb_t1/t2,
-- score_and_save_hoeren, reveal_hoeren) kept the exemption, only this one
-- was dropped. Root cause of "Lösung anzeigen" wrongly paywalling free-sample
-- Lesen Teil 1 exercises for non-subscribers. Restoring the same clause used
-- by every other scoring RPC, no other logic changed.
CREATE OR REPLACE FUNCTION public.score_lesen_t1(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_text       RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
  v_aids       JSONB;
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM lesen_exercises WHERE id = p_exercise_id;

  FOR v_text IN
    SELECT position, correct_headline FROM lesen_t1_texts WHERE exercise_id = p_exercise_id ORDER BY position
  LOOP
    v_total    := v_total + 1;
    v_chosen   := p_answers ->> v_text.position::TEXT;
    v_is_correct := (UPPER(v_chosen) = UPPER(v_text.correct_headline));
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'position', v_text.position, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_text.correct_headline END,
      'learning_aids', COALESCE(v_aids -> v_text.position::TEXT, 'null'::JSONB)
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

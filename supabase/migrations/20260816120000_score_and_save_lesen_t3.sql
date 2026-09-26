-- score_and_save_lesen_t3: same pattern as score_and_save_lesen_t2, but for
-- the situation->ad-letter matching structure (score_lesen_t3 already exists
-- as the non-saving preview variant). Records the attempt in lesen_attempts
-- so Statistics/attempt history work for Teil 3 the same way they do for
-- Teil 1 and Teil 2, and gives the frontend an attempt_id to key off of.
CREATE OR REPLACE FUNCTION public.score_and_save_lesen_t3(p_exercise_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_situation  RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
  v_aids       JSONB;
  v_uid        UUID  := auth.uid();
  v_attempt_id UUID;
BEGIN
  IF NOT (public.has_plan_access(v_uid, 'schriftlich') OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM lesen_exercises WHERE id = p_exercise_id;

  FOR v_situation IN
    SELECT number, correct_letter, no_match FROM lesen_t3_situations WHERE exercise_id = p_exercise_id ORDER BY number
  LOOP
    v_total    := v_total + 1;
    v_chosen   := p_answers ->> v_situation.number::TEXT;
    IF v_situation.no_match THEN
      v_is_correct := (v_chosen = '0' OR v_chosen IS NULL OR v_chosen = '');
    ELSE
      v_is_correct := (LOWER(v_chosen) = LOWER(v_situation.correct_letter));
    END IF;
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'number', v_situation.number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_situation.no_match THEN '0' WHEN v_is_correct THEN v_chosen ELSE v_situation.correct_letter END,
      'learning_aids', COALESCE(v_aids -> v_situation.number::TEXT, 'null'::JSONB)
    );
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Exercise % has no situations or does not exist', p_exercise_id;
  END IF;

  INSERT INTO lesen_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, 3, v_score, v_total, COALESCE(p_answers, '{}'::JSONB), v_results)
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results, 'attempt_id', v_attempt_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.score_and_save_lesen_t3(uuid, jsonb) TO authenticated;

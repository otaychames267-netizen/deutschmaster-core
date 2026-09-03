-- CRITICAL scoring bug, found via a live Pruefungssimulation test (0 answers
-- submitted was returning ~8/75 instead of 0/75): score_lesen_t3 and
-- score_and_save_lesen_t3 treated an UNANSWERED "no match" situation
-- (lesen_t3_situations.no_match = true, i.e. "X - keine passende Anzeige")
-- as CORRECT --
--   v_is_correct := (v_chosen = '0' OR v_chosen IS NULL OR v_chosen = '');
-- -- awarding free points for every no_match situation (1-2 per Lesen T3
-- exercise) the student never touched. A real "X" answer must be an
-- EXPLICIT '0' selection (the LesenT3Input/Teil3Exercise UI's own "X - keine
-- passende Anzeige" option sends '0'); leaving it blank is a skipped
-- question and must score as incorrect, same as every other question type.
--
-- Also normalizes v_is_correct to never be SQL NULL (only ever true/false)
-- in score_lesen_t1/t2/t3 for a blank answer -- previously an unanswered
-- non-no_match question stored `"correct": null` in the results array
-- (harmless for the numeric score, since `IF NULL THEN` never increments
-- it, but wrong for "unanswered must count as incorrect" applied to the
-- per-question result the student/exam review actually renders).
--
-- score_and_save_lesen_t1 already used COALESCE(v_chosen,'') and is
-- unaffected; only score_and_save_lesen_t2 needed the same normalization
-- as score_lesen_t2.

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
    v_is_correct := (v_chosen IS NOT NULL AND UPPER(v_chosen) = UPPER(v_text.correct_headline));
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

CREATE OR REPLACE FUNCTION public.score_lesen_t2(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_results  JSONB := '[]'::JSONB;
  v_score    INT   := 0;
  v_total    INT   := 0;
  v_question RECORD;
  v_chosen   TEXT;
  v_is_correct BOOLEAN;
  v_aids     JSONB;
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM lesen_exercises WHERE id = p_exercise_id;

  FOR v_question IN
    SELECT number, correct FROM lesen_t2_questions WHERE exercise_id = p_exercise_id ORDER BY number
  LOOP
    v_total    := v_total + 1;
    v_chosen   := p_answers ->> v_question.number::TEXT;
    v_is_correct := (v_chosen IS NOT NULL AND v_chosen = v_question.correct);
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'number', v_question.number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_question.correct END,
      'learning_aids', COALESCE(v_aids -> v_question.number::TEXT, 'null'::JSONB)
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_lesen_t3(p_exercise_id uuid, p_answers jsonb)
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
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
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
      -- Only an EXPLICIT "X" selection ('0') is correct. A blank/unanswered
      -- situation is a skipped question, not a free correct answer.
      v_is_correct := (v_chosen = '0');
    ELSE
      v_is_correct := (v_chosen IS NOT NULL AND LOWER(v_chosen) = LOWER(v_situation.correct_letter));
    END IF;
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'number', v_situation.number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_situation.no_match THEN '0' WHEN v_is_correct THEN v_chosen ELSE v_situation.correct_letter END,
      'learning_aids', COALESCE(v_aids -> v_situation.number::TEXT, 'null'::JSONB)
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_and_save_lesen_t2(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_results    JSONB   := '[]'::JSONB;
  v_score      INT     := 0;
  v_total      INT     := 0;
  v_question   RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
  v_uid        UUID    := auth.uid();
  v_attempt_id UUID;
  v_aids       JSONB;
BEGIN
  IF NOT (public.has_plan_access(v_uid, 'schriftlich') OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM lesen_exercises WHERE id = p_exercise_id;

  FOR v_question IN
    SELECT number, correct FROM lesen_t2_questions WHERE exercise_id = p_exercise_id ORDER BY number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_question.number::TEXT;
    v_is_correct := (v_chosen IS NOT NULL AND v_chosen = v_question.correct);
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'number', v_question.number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_question.correct END,
      'learning_aids', COALESCE(v_aids -> v_question.number::TEXT, 'null'::JSONB)
    );
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Exercise % has no questions or does not exist', p_exercise_id;
  END IF;

  INSERT INTO lesen_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, 2, v_score, v_total, COALESCE(p_answers, '{}'::JSONB), v_results)
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results, 'attempt_id', v_attempt_id);
END;
$function$;

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
      v_is_correct := (v_chosen = '0');
    ELSE
      v_is_correct := (v_chosen IS NOT NULL AND LOWER(v_chosen) = LOWER(v_situation.correct_letter));
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

-- Extend the 8 scoring/reveal RPCs to also accept free-sample exercises for
-- non-subscribers. Read access to free-sample content was already granted
-- via RLS in the prior migration — without this, a non-subscriber could see
-- a free-sample exercise but never get it graded. Every function body below
-- is byte-identical to what's already in production except the single
-- authorization IF condition, which gains one additional OR EXISTS clause
-- checking is_free_sample on that function's own target exercise table.

CREATE OR REPLACE FUNCTION public.score_and_save_lesen_t1(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid    UUID := auth.uid();
  v_results JSONB := '[]'::JSONB;
  v_score  INT := 0;
  v_total  INT := 0;
  v_t      RECORD;
  v_chosen TEXT;
  v_ok     BOOLEAN;
  v_attempt UUID;
BEGIN
  IF NOT (public.has_plan_access(v_uid, 'schriftlich') OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  FOR v_t IN SELECT position, correct_headline FROM lesen_t1_texts WHERE exercise_id = p_exercise_id ORDER BY position LOOP
    v_total := v_total + 1;
    v_chosen := p_answers ->> v_t.position::TEXT;
    v_ok := (UPPER(COALESCE(v_chosen,'')) = UPPER(v_t.correct_headline));
    IF v_ok THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'position', v_t.position, 'correct', v_ok,
      'your_answer', COALESCE(v_chosen,''),
      'correct_answer', CASE WHEN v_ok THEN v_chosen ELSE v_t.correct_headline END
    );
  END LOOP;

  INSERT INTO lesen_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, 1, v_score, v_total, p_answers, v_results)
  RETURNING id INTO v_attempt;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results, 'attempt_id', v_attempt);
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
BEGIN
  IF NOT (public.has_plan_access(v_uid, 'schriftlich') OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  FOR v_question IN
    SELECT number, correct FROM lesen_t2_questions WHERE exercise_id = p_exercise_id ORDER BY number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_question.number::TEXT;
    v_is_correct := (v_chosen = v_question.correct);
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'number', v_question.number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_question.correct END
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
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  FOR v_question IN
    SELECT number, correct FROM lesen_t2_questions WHERE exercise_id = p_exercise_id ORDER BY number
  LOOP
    v_total    := v_total + 1;
    v_chosen   := p_answers ->> v_question.number::TEXT;
    v_is_correct := (v_chosen = v_question.correct);
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'number', v_question.number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_question.correct END
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
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

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
      'correct_answer', CASE WHEN v_situation.no_match THEN '0' WHEN v_is_correct THEN v_chosen ELSE v_situation.correct_letter END
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_sb_t1(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_gap        RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM sb_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  FOR v_gap IN
    SELECT gap_number, correct FROM sb_t1_gaps WHERE exercise_id = p_exercise_id ORDER BY gap_number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_gap.gap_number::TEXT;
    v_is_correct := (LOWER(v_chosen) = LOWER(v_gap.correct));
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'gap_number', v_gap.gap_number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_gap.correct END
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_sb_t2(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_gap        RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM sb_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  FOR v_gap IN
    SELECT gap_number, correct_word FROM sb_t2_gaps WHERE exercise_id = p_exercise_id ORDER BY gap_number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_gap.gap_number::TEXT;
    v_is_correct := (LOWER(TRIM(v_chosen)) = LOWER(TRIM(v_gap.correct_word)));
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'gap_number', v_gap.gap_number, 'correct', v_is_correct,
      'your_answer', COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_gap.correct_word END
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

CREATE OR REPLACE FUNCTION public.score_and_save_hoeren(p_exercise_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid        UUID := auth.uid();
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_teil       SMALLINT;
  v_s          RECORD;
  v_chosen     BOOLEAN;
  v_is_correct BOOLEAN;
  v_attempt    UUID;
BEGIN
  IF NOT (public.has_plan_access(v_uid, 'schriftlich') OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM hoeren_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT teil INTO v_teil FROM hoeren_exercises WHERE id = p_exercise_id;

  FOR v_s IN
    SELECT statement_number, correct_answer FROM hoeren_statements WHERE exercise_id = p_exercise_id ORDER BY statement_number
  LOOP
    v_total  := v_total + 1;
    v_chosen := (p_answers ->> v_s.statement_number::TEXT)::BOOLEAN;
    v_is_correct := (v_chosen IS NOT NULL AND v_chosen = v_s.correct_answer);
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'statement_number', v_s.statement_number, 'correct', v_is_correct,
      'your_answer', to_jsonb(v_chosen), 'correct_answer', to_jsonb(v_s.correct_answer)
    );
  END LOOP;

  INSERT INTO hoeren_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, COALESCE(v_teil, 1), v_score, v_total, p_answers, v_results)
  RETURNING id INTO v_attempt;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results, 'attempt_id', v_attempt);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reveal_hoeren(p_exercise_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_results JSONB := '[]'::JSONB;
  v_s       RECORD;
BEGIN
  IF NOT (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM hoeren_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  FOR v_s IN
    SELECT statement_number, correct_answer FROM hoeren_statements WHERE exercise_id = p_exercise_id ORDER BY statement_number
  LOOP
    v_results := v_results || jsonb_build_object(
      'statement_number', v_s.statement_number, 'correct_answer', to_jsonb(v_s.correct_answer)
    );
  END LOOP;

  RETURN jsonb_build_object('results', v_results);
END;
$function$;

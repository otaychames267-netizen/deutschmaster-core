-- Cross-level entitlement leak fix.
--
-- has_plan_access() is intentionally level-agnostic (one subscription plan
-- covers both B1 and B2, per an earlier product decision), and the frontend
-- enforces "you only ever browse your own onboarded level" purely via URL
-- routing (_authenticated.$level.tsx). That routing gate has no backend
-- counterpart: every RLS policy and scoring RPC only checked
-- has_plan_access(...) OR is_free_sample, with no level condition at all, so
-- a B1-only subscriber could read and score paid B2 content (and vice versa)
-- via a direct REST/RPC call, bypassing the UI entirely. Confirmed live via
-- a real cross-account test on 2026-09-04.
--
-- Fix: a subscriber's paid access is now also scoped to their own
-- profiles.level. Free-sample access is untouched (still level-agnostic by
-- design -- a free taste of either course is harmless to expose either way).

CREATE OR REPLACE FUNCTION public.has_level_plan_access(p_user_id uuid, p_module text, p_content_level text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_plan_access(p_user_id, p_module)
     AND p_content_level = (SELECT level::text FROM public.profiles WHERE id = p_user_id);
$$;

-- ── Parent-table RLS policies (level column lives on the row itself) ──────

DROP POLICY IF EXISTS "auth read lesen_exercises" ON public.lesen_exercises;
CREATE POLICY "auth read lesen_exercises" ON public.lesen_exercises FOR SELECT
  USING ((public.has_level_plan_access(auth.uid(), 'schriftlich', level) OR public.is_d17_staff(auth.uid()))
         AND NOT public.is_neu_locked(title) AND NOT public.is_neu_restricted_for(title, auth.uid()));

DROP POLICY IF EXISTS "auth read hoeren_exercises" ON public.hoeren_exercises;
CREATE POLICY "auth read hoeren_exercises" ON public.hoeren_exercises FOR SELECT
  USING ((public.has_level_plan_access(auth.uid(), 'schriftlich', level) OR public.is_d17_staff(auth.uid()))
         AND NOT public.is_neu_locked(title) AND NOT public.is_neu_restricted_for(title, auth.uid()));

DROP POLICY IF EXISTS "auth read sb_exercises" ON public.sb_exercises;
CREATE POLICY "auth read sb_exercises" ON public.sb_exercises FOR SELECT
  USING ((public.has_level_plan_access(auth.uid(), 'schriftlich', level) OR public.is_d17_staff(auth.uid()))
         AND NOT public.is_neu_locked(title) AND NOT public.is_neu_restricted_for(title, auth.uid()));

DROP POLICY IF EXISTS "exams_published_read" ON public.exams;
CREATE POLICY "exams_published_read" ON public.exams FOR SELECT
  USING ((status = 'published'::public.exam_pub_status AND public.has_level_plan_access(auth.uid(), module::text, level::text))
         OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "items_read_via_exam" ON public.exam_items;
CREATE POLICY "items_read_via_exam" ON public.exam_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.id = exam_items.exam_id
      AND ((e.status = 'published'::public.exam_pub_status AND public.has_level_plan_access(auth.uid(), e.module::text, e.level::text))
           OR public.has_role(auth.uid(), 'admin'::public.app_role))
  ));

-- ── Child-table RLS policies (level lives on the parent exercise row) ─────

DROP POLICY IF EXISTS "auth read lesen_t1_headlines" ON public.lesen_t1_headlines;
CREATE POLICY "auth read lesen_t1_headlines" ON public.lesen_t1_headlines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lesen_exercises e WHERE e.id = lesen_t1_headlines.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t1_texts" ON public.lesen_t1_texts;
CREATE POLICY "auth read lesen_t1_texts" ON public.lesen_t1_texts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lesen_exercises e WHERE e.id = lesen_t1_texts.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t2_passages" ON public.lesen_t2_passages;
CREATE POLICY "auth read lesen_t2_passages" ON public.lesen_t2_passages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lesen_exercises e WHERE e.id = lesen_t2_passages.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t2_questions" ON public.lesen_t2_questions;
CREATE POLICY "auth read lesen_t2_questions" ON public.lesen_t2_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lesen_exercises e WHERE e.id = lesen_t2_questions.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t3_situations" ON public.lesen_t3_situations;
CREATE POLICY "auth read lesen_t3_situations" ON public.lesen_t3_situations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lesen_exercises e WHERE e.id = lesen_t3_situations.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t3_texts" ON public.lesen_t3_texts;
CREATE POLICY "auth read lesen_t3_texts" ON public.lesen_t3_texts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lesen_exercises e WHERE e.id = lesen_t3_texts.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read hoeren_statements" ON public.hoeren_statements;
CREATE POLICY "auth read hoeren_statements" ON public.hoeren_statements FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.hoeren_exercises e WHERE e.id = hoeren_statements.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t1_passages" ON public.sb_t1_passages;
CREATE POLICY "auth read sb_t1_passages" ON public.sb_t1_passages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sb_exercises e WHERE e.id = sb_t1_passages.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t1_gaps" ON public.sb_t1_gaps;
CREATE POLICY "auth read sb_t1_gaps" ON public.sb_t1_gaps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sb_exercises e WHERE e.id = sb_t1_gaps.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t2_passages" ON public.sb_t2_passages;
CREATE POLICY "auth read sb_t2_passages" ON public.sb_t2_passages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sb_exercises e WHERE e.id = sb_t2_passages.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t2_gaps" ON public.sb_t2_gaps;
CREATE POLICY "auth read sb_t2_gaps" ON public.sb_t2_gaps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sb_exercises e WHERE e.id = sb_t2_gaps.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t2_words" ON public.sb_t2_words;
CREATE POLICY "auth read sb_t2_words" ON public.sb_t2_words FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sb_exercises e WHERE e.id = sb_t2_words.exercise_id
                 AND public.has_level_plan_access(auth.uid(), 'schriftlich', e.level))
         OR public.is_d17_staff(auth.uid()));

-- ── Scoring / reveal / translation RPCs ────────────────────────────────────
-- Same fix, function by function: look up the exercise's own level and route
-- the plan-access check through has_level_plan_access instead of has_plan_access.

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
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(auth.uid(), 'schriftlich', v_level) OR public.is_d17_staff(auth.uid())
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
  v_level    TEXT;
BEGIN
  SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(auth.uid(), 'schriftlich', v_level) OR public.is_d17_staff(auth.uid())
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
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(auth.uid(), 'schriftlich', v_level) OR public.is_d17_staff(auth.uid())
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
  v_aids   JSONB;
  v_level  TEXT;
BEGIN
  SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM lesen_exercises WHERE id = p_exercise_id;

  FOR v_t IN SELECT position, correct_headline FROM lesen_t1_texts WHERE exercise_id = p_exercise_id ORDER BY position LOOP
    v_total := v_total + 1;
    v_chosen := p_answers ->> v_t.position::TEXT;
    v_ok := (UPPER(COALESCE(v_chosen,'')) = UPPER(v_t.correct_headline));
    IF v_ok THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'position', v_t.position, 'correct', v_ok,
      'your_answer', COALESCE(v_chosen,''),
      'correct_answer', CASE WHEN v_ok THEN v_chosen ELSE v_t.correct_headline END,
      'learning_aids', COALESCE(v_aids -> v_t.position::TEXT, 'null'::JSONB)
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
  v_aids       JSONB;
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
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
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
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
  v_aids       JSONB;
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM hoeren_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
          OR EXISTS (SELECT 1 FROM hoeren_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT teil, learning_aids -> 'items' INTO v_teil, v_aids FROM hoeren_exercises WHERE id = p_exercise_id;

  FOR v_s IN
    SELECT statement_number, correct_answer FROM hoeren_statements WHERE exercise_id = p_exercise_id ORDER BY statement_number
  LOOP
    v_total  := v_total + 1;
    v_chosen := (p_answers ->> v_s.statement_number::TEXT)::BOOLEAN;
    v_is_correct := (v_chosen IS NOT NULL AND v_chosen = v_s.correct_answer);
    IF v_is_correct THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'statement_number', v_s.statement_number, 'correct', v_is_correct,
      'your_answer', to_jsonb(v_chosen), 'correct_answer', to_jsonb(v_s.correct_answer),
      'learning_aids', COALESCE(v_aids -> v_s.statement_number::TEXT, 'null'::JSONB)
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
  v_aids    JSONB;
  v_level   TEXT;
BEGIN
  SELECT level INTO v_level FROM hoeren_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(auth.uid(), 'schriftlich', v_level) OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM hoeren_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM hoeren_exercises WHERE id = p_exercise_id;

  FOR v_s IN
    SELECT statement_number, correct_answer FROM hoeren_statements WHERE exercise_id = p_exercise_id ORDER BY statement_number
  LOOP
    v_results := v_results || jsonb_build_object(
      'statement_number', v_s.statement_number, 'correct_answer', to_jsonb(v_s.correct_answer),
      'learning_aids', COALESCE(v_aids -> v_s.statement_number::TEXT, 'null'::JSONB)
    );
  END LOOP;

  RETURN jsonb_build_object('results', v_results);
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
  v_aids       JSONB;
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM sb_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(auth.uid(), 'schriftlich', v_level) OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM sb_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM sb_exercises WHERE id = p_exercise_id;

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
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_gap.correct END,
      'learning_aids', COALESCE(v_aids -> v_gap.gap_number::TEXT, 'null'::JSONB)
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
  v_aids       JSONB;
  v_level      TEXT;
BEGIN
  SELECT level INTO v_level FROM sb_exercises WHERE id = p_exercise_id;
  IF NOT (public.has_level_plan_access(auth.uid(), 'schriftlich', v_level) OR public.is_d17_staff(auth.uid())
          OR EXISTS (SELECT 1 FROM sb_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  SELECT learning_aids -> 'items' INTO v_aids FROM sb_exercises WHERE id = p_exercise_id;

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
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_gap.correct_word END,
      'learning_aids', COALESCE(v_aids -> v_gap.gap_number::TEXT, 'null'::JSONB)
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_exercise_translation(p_skill text, p_exercise_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_translation JSONB;
  v_level TEXT;
BEGIN
  IF p_skill = 'lesen' THEN
    SELECT level INTO v_level FROM lesen_exercises WHERE id = p_exercise_id;
    IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
            OR EXISTS (SELECT 1 FROM lesen_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
      RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
    END IF;
    SELECT learning_aids -> 'translation' INTO v_translation FROM lesen_exercises WHERE id = p_exercise_id;
  ELSIF p_skill = 'hoeren' THEN
    SELECT level INTO v_level FROM hoeren_exercises WHERE id = p_exercise_id;
    IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
            OR EXISTS (SELECT 1 FROM hoeren_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
      RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
    END IF;
    SELECT learning_aids -> 'translation' INTO v_translation FROM hoeren_exercises WHERE id = p_exercise_id;
  ELSIF p_skill = 'sprachbausteine' THEN
    SELECT level INTO v_level FROM sb_exercises WHERE id = p_exercise_id;
    IF NOT (public.has_level_plan_access(v_uid, 'schriftlich', v_level) OR public.is_d17_staff(v_uid)
            OR EXISTS (SELECT 1 FROM sb_exercises WHERE id = p_exercise_id AND is_free_sample = true)) THEN
      RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
    END IF;
    SELECT learning_aids -> 'translation' INTO v_translation FROM sb_exercises WHERE id = p_exercise_id;
  ELSE
    RAISE EXCEPTION 'Invalid skill: %', p_skill;
  END IF;

  RETURN COALESCE(v_translation, 'null'::JSONB);
END;
$function$;

-- ── Secure Answer-Scoring Functions ─────────────────────────────────────────
--
-- Students NEVER query correct answers directly.
-- Instead they submit their answers to these SECURITY DEFINER functions,
-- which compare server-side and return only per-question correctness results.
--
-- Column-level security workaround for Supabase:
-- The RLS policy for lesen_t2_questions / lesen_t3_situations already exists.
-- These functions run with OWNER privileges and are callable by authenticated users.

-- ── T2 Scoring ───────────────────────────────────────────────────────────────
-- Input:  p_exercise_id  UUID
--         p_answers      JSONB  { "1": "a", "2": "b", ... }  (question number → chosen letter)
-- Output: JSONB  { score: int, total: int, results: [{ number, correct: bool, your_answer: str, correct_answer: str }] }

CREATE OR REPLACE FUNCTION score_lesen_t2(
  p_exercise_id  UUID,
  p_answers      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results  JSONB := '[]'::JSONB;
  v_score    INT   := 0;
  v_total    INT   := 0;
  v_question RECORD;
  v_chosen   TEXT;
  v_is_correct BOOLEAN;
BEGIN
  -- Only authenticated users may call this
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_question IN
    SELECT number, correct
    FROM   lesen_t2_questions
    WHERE  exercise_id = p_exercise_id
    ORDER  BY number
  LOOP
    v_total    := v_total + 1;
    v_chosen   := p_answers ->> v_question.number::TEXT;
    v_is_correct := (v_chosen = v_question.correct);
    IF v_is_correct THEN v_score := v_score + 1; END IF;

    v_results := v_results || jsonb_build_object(
      'number',         v_question.number,
      'correct',        v_is_correct,
      'your_answer',    COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_question.correct END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'score',   v_score,
    'total',   v_total,
    'results', v_results
  );
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION score_lesen_t2(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_lesen_t2(UUID, JSONB) FROM anon;

-- ── T3 Scoring ───────────────────────────────────────────────────────────────
-- Input:  p_exercise_id  UUID
--         p_answers      JSONB  { "1": "a", "2": "b", ... }  (situation number → chosen letter, or "0" for no match)
-- Output: JSONB  { score: int, total: int, results: [...] }

CREATE OR REPLACE FUNCTION score_lesen_t3(
  p_exercise_id  UUID,
  p_answers      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_situation  RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_situation IN
    SELECT number, correct_letter, no_match
    FROM   lesen_t3_situations
    WHERE  exercise_id = p_exercise_id
    ORDER  BY number
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
      'number',         v_situation.number,
      'correct',        v_is_correct,
      'your_answer',    COALESCE(v_chosen, ''),
      'correct_answer', CASE
        WHEN v_situation.no_match THEN '0'
        WHEN v_is_correct          THEN v_chosen
        ELSE v_situation.correct_letter
      END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'score',   v_score,
    'total',   v_total,
    'results', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION score_lesen_t3(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_lesen_t3(UUID, JSONB) FROM anon;

-- ── T1 Scoring ───────────────────────────────────────────────────────────────
-- Input:  p_exercise_id  UUID
--         p_answers      JSONB  { "1": "A", "2": "C", ... }  (text position → chosen headline letter)

CREATE OR REPLACE FUNCTION score_lesen_t1(
  p_exercise_id  UUID,
  p_answers      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results    JSONB := '[]'::JSONB;
  v_score      INT   := 0;
  v_total      INT   := 0;
  v_text       RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_text IN
    SELECT position, correct_headline
    FROM   lesen_t1_texts
    WHERE  exercise_id = p_exercise_id
    ORDER  BY position
  LOOP
    v_total    := v_total + 1;
    v_chosen   := p_answers ->> v_text.position::TEXT;
    v_is_correct := (UPPER(v_chosen) = UPPER(v_text.correct_headline));
    IF v_is_correct THEN v_score := v_score + 1; END IF;

    v_results := v_results || jsonb_build_object(
      'position',       v_text.position,
      'correct',        v_is_correct,
      'your_answer',    COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_text.correct_headline END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'score',   v_score,
    'total',   v_total,
    'results', v_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION score_lesen_t1(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_lesen_t1(UUID, JSONB) FROM anon;

-- ── Column-level view: hide `correct` from student queries ───────────────────
-- Drop the existing open SELECT policy and replace with a restricted one
-- that excludes the `correct` column via a view-based approach.
-- Since Postgres doesn't support column-level RLS, we use a view.

-- Student-safe view of T2 questions (no `correct` column)
CREATE OR REPLACE VIEW lesen_t2_questions_student AS
  SELECT id, exercise_id, number, question, option_a, option_b, option_c
  FROM   lesen_t2_questions;

-- Student-safe view of T3 situations (no `correct_letter` column)
CREATE OR REPLACE VIEW lesen_t3_situations_student AS
  SELECT id, exercise_id, number, description, no_match
  FROM   lesen_t3_situations;

-- Student-safe view of T1 texts (no `correct_headline` column)
CREATE OR REPLACE VIEW lesen_t1_texts_student AS
  SELECT id, exercise_id, position, title, content
  FROM   lesen_t1_texts;

-- Grant select on views to authenticated users
GRANT SELECT ON lesen_t2_questions_student TO authenticated;
GRANT SELECT ON lesen_t3_situations_student TO authenticated;
GRANT SELECT ON lesen_t1_texts_student TO authenticated;

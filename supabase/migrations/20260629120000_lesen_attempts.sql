-- ─────────────────────────────────────────────────────────────────────────────
-- Lesen practice attempts — durable, per-user attempt history for Teil 1/2/3.
--
-- Foundation for the M0 "Attempt persistence" priority and downstream
-- history / statistics / streaks / goals (Engineering Spec §23, §35).
--
-- Attempts are written by SECURITY DEFINER scoring functions so the score is
-- always computed server-side from the official answer key and can never be
-- forged by a client. One generic table serves all three Teile.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lesen_attempts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID        NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  teil        SMALLINT    NOT NULL CHECK (teil IN (1, 2, 3)),
  score       SMALLINT    NOT NULL,
  total       SMALLINT    NOT NULL,
  answers     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  results     JSONB       NOT NULL DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesen_attempts_user_idx     ON lesen_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lesen_attempts_exercise_idx ON lesen_attempts(exercise_id);

ALTER TABLE lesen_attempts ENABLE ROW LEVEL SECURITY;

-- Users may read and self-insert ONLY their own attempts; no client update/delete.
DROP POLICY IF EXISTS "own read lesen_attempts"   ON lesen_attempts;
DROP POLICY IF EXISTS "own insert lesen_attempts" ON lesen_attempts;
CREATE POLICY "own read lesen_attempts"   ON lesen_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own insert lesen_attempts" ON lesen_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ── Score + persist a Teil 2 attempt atomically ─────────────────────────────
-- Mirrors score_lesen_t2() but records the attempt and returns its id.
CREATE OR REPLACE FUNCTION score_and_save_lesen_t2(
  p_exercise_id UUID,
  p_answers     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_question IN
    SELECT number, correct
    FROM   lesen_t2_questions
    WHERE  exercise_id = p_exercise_id
    ORDER  BY number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_question.number::TEXT;
    v_is_correct := (v_chosen = v_question.correct);
    IF v_is_correct THEN v_score := v_score + 1; END IF;

    v_results := v_results || jsonb_build_object(
      'number',         v_question.number,
      'correct',        v_is_correct,
      'your_answer',    COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_question.correct END
    );
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Exercise % has no questions or does not exist', p_exercise_id;
  END IF;

  INSERT INTO lesen_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, 2, v_score, v_total, COALESCE(p_answers, '{}'::JSONB), v_results)
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object(
    'score',      v_score,
    'total',      v_total,
    'results',    v_results,
    'attempt_id', v_attempt_id
  );
END;
$$;

GRANT EXECUTE  ON FUNCTION score_and_save_lesen_t2(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_and_save_lesen_t2(UUID, JSONB) FROM anon;

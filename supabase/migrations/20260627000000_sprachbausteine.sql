-- ─────────────────────────────────────────────────────────────────────────────
-- Sprachbausteine exercise tables for TELC B2
-- Teil 1: gap-fill with A/B/C options (questions 31-40)
-- Teil 2: gap-fill from word bank, each word used once (questions 41-50)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Top-level exercise container ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sb_exercises (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  teil         SMALLINT    NOT NULL CHECK (teil IN (1, 2)),
  level        TEXT        NOT NULL DEFAULT 'TELC_B2',
  source_pdf   TEXT,
  import_notes TEXT,
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sb_exercises_teil_idx ON sb_exercises(teil);

-- ── Teil 1 ─────────────────────────────────────────────────────────────────
-- The full text with numbered placeholders like [31], [32] ... [40]
CREATE TABLE IF NOT EXISTS sb_t1_passages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID NOT NULL REFERENCES sb_exercises(id) ON DELETE CASCADE,
  title        TEXT,
  instructions TEXT,
  passage      TEXT NOT NULL   -- text with gap markers like {{31}}, {{32}} … {{40}}
);
CREATE INDEX IF NOT EXISTS sb_t1_passages_ex_idx ON sb_t1_passages(exercise_id);

-- One row per gap: gap number, three options, correct answer
CREATE TABLE IF NOT EXISTS sb_t1_gaps (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID     NOT NULL REFERENCES sb_exercises(id) ON DELETE CASCADE,
  gap_number   SMALLINT NOT NULL,          -- 31 … 40 (or 1 … 10)
  option_a     TEXT     NOT NULL,
  option_b     TEXT     NOT NULL,
  option_c     TEXT     NOT NULL,
  correct      CHAR(1)  NOT NULL CHECK (correct IN ('a','b','c'))
);
CREATE INDEX IF NOT EXISTS sb_t1_gaps_ex_idx ON sb_t1_gaps(exercise_id);

-- ── Teil 2 ─────────────────────────────────────────────────────────────────
-- Full text with numbered gaps
CREATE TABLE IF NOT EXISTS sb_t2_passages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID NOT NULL REFERENCES sb_exercises(id) ON DELETE CASCADE,
  title        TEXT,
  instructions TEXT,
  passage      TEXT NOT NULL   -- text with gap markers like {{41}}, {{42}} … {{50}}
);
CREATE INDEX IF NOT EXISTS sb_t2_passages_ex_idx ON sb_t2_passages(exercise_id);

-- Word bank: 15 words (10 correct + 5 distractors). word_number is display order in box.
CREATE TABLE IF NOT EXISTS sb_t2_words (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID     NOT NULL REFERENCES sb_exercises(id) ON DELETE CASCADE,
  word_number  SMALLINT NOT NULL,          -- 1 … 15 (display order in word box)
  word         TEXT     NOT NULL
);
CREATE INDEX IF NOT EXISTS sb_t2_words_ex_idx ON sb_t2_words(exercise_id);

-- One row per gap: which word_number is correct
CREATE TABLE IF NOT EXISTS sb_t2_gaps (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id   UUID     NOT NULL REFERENCES sb_exercises(id) ON DELETE CASCADE,
  gap_number    SMALLINT NOT NULL,          -- 41 … 50 (or 1 … 10)
  correct_word  TEXT     NOT NULL           -- the exact word (redundant but useful for scoring)
);
CREATE INDEX IF NOT EXISTS sb_t2_gaps_ex_idx ON sb_t2_gaps(exercise_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE sb_exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_t1_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_t1_gaps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_t2_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_t2_words    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_t2_gaps     ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all exercise content (answers hidden via views + RPCs)
CREATE POLICY "auth read sb_exercises"   ON sb_exercises   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read sb_t1_passages" ON sb_t1_passages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read sb_t1_gaps"     ON sb_t1_gaps     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read sb_t2_passages" ON sb_t2_passages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read sb_t2_words"    ON sb_t2_words    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read sb_t2_gaps"     ON sb_t2_gaps     FOR SELECT TO authenticated USING (true);

-- Admin write access
CREATE POLICY "admin write sb_exercises" ON sb_exercises FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write sb_t1_passages" ON sb_t1_passages FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write sb_t1_gaps" ON sb_t1_gaps FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write sb_t2_passages" ON sb_t2_passages FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write sb_t2_words" ON sb_t2_words FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write sb_t2_gaps" ON sb_t2_gaps FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── Student-safe views (no correct answers) ──────────────────────────────────
CREATE OR REPLACE VIEW sb_t1_gaps_student AS
  SELECT id, exercise_id, gap_number, option_a, option_b, option_c
  FROM   sb_t1_gaps;

CREATE OR REPLACE VIEW sb_t2_gaps_student AS
  SELECT id, exercise_id, gap_number
  FROM   sb_t2_gaps;

GRANT SELECT ON sb_t1_gaps_student TO authenticated;
GRANT SELECT ON sb_t2_gaps_student TO authenticated;

-- ── Scoring RPCs ──────────────────────────────────────────────────────────────

-- T1 scoring: p_answers = {"31": "a", "32": "c", ...}
CREATE OR REPLACE FUNCTION score_sb_t1(
  p_exercise_id UUID,
  p_answers     JSONB
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
  v_gap        RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR v_gap IN
    SELECT gap_number, correct FROM sb_t1_gaps
    WHERE exercise_id = p_exercise_id ORDER BY gap_number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_gap.gap_number::TEXT;
    v_is_correct := (LOWER(v_chosen) = LOWER(v_gap.correct));
    IF v_is_correct THEN v_score := v_score + 1; END IF;

    v_results := v_results || jsonb_build_object(
      'gap_number',     v_gap.gap_number,
      'correct',        v_is_correct,
      'your_answer',    COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_gap.correct END
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$$;

GRANT EXECUTE ON FUNCTION score_sb_t1(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_sb_t1(UUID, JSONB) FROM anon;

-- T2 scoring: p_answers = {"41": "gestern", "42": "obwohl", ...} (gap_number → word text)
CREATE OR REPLACE FUNCTION score_sb_t2(
  p_exercise_id UUID,
  p_answers     JSONB
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
  v_gap        RECORD;
  v_chosen     TEXT;
  v_is_correct BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR v_gap IN
    SELECT gap_number, correct_word FROM sb_t2_gaps
    WHERE exercise_id = p_exercise_id ORDER BY gap_number
  LOOP
    v_total      := v_total + 1;
    v_chosen     := p_answers ->> v_gap.gap_number::TEXT;
    v_is_correct := (LOWER(TRIM(v_chosen)) = LOWER(TRIM(v_gap.correct_word)));
    IF v_is_correct THEN v_score := v_score + 1; END IF;

    v_results := v_results || jsonb_build_object(
      'gap_number',     v_gap.gap_number,
      'correct',        v_is_correct,
      'your_answer',    COALESCE(v_chosen, ''),
      'correct_answer', CASE WHEN v_is_correct THEN v_chosen ELSE v_gap.correct_word END
    );
  END LOOP;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
END;
$$;

GRANT EXECUTE ON FUNCTION score_sb_t2(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_sb_t2(UUID, JSONB) FROM anon;

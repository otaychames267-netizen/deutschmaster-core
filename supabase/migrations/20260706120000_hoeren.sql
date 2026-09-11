-- ─────────────────────────────────────────────────────────────────────────────
-- Hören exercise tables for TELC B2. Three independent Teile, each a set of
-- Richtig/Falsch statements about a short spoken text (audio added later —
-- Phase 1 ships text/image/grading only, matching the eventual exam UI).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hoeren_exercises (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  teil         SMALLINT    NOT NULL CHECK (teil IN (1, 2, 3)),
  level        TEXT        NOT NULL DEFAULT 'B2',
  image_path   TEXT,                          -- object path in the public "hoeren-images" bucket
  instructions TEXT,
  source_pdf   TEXT,
  import_notes TEXT,
  position     SMALLINT    NOT NULL DEFAULT 0,  -- official source order within its Teil
  version_tag  TEXT,                            -- e.g. "اساسي" / "معدل" / "VERSION 2" for paired variants
  variant_group TEXT,                            -- groups variants of one base exercise
  audio_path   TEXT,                             -- filled in later, Phase 2 — nullable, unused for now
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hoeren_exercises_teil_idx ON hoeren_exercises(teil, position);

-- One row per Richtig/Falsch statement.
CREATE TABLE IF NOT EXISTS hoeren_statements (
  id               UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id      UUID     NOT NULL REFERENCES hoeren_exercises(id) ON DELETE CASCADE,
  statement_number SMALLINT NOT NULL,       -- e.g. 41-45 for Teil 1, as printed in the source
  statement_text   TEXT     NOT NULL,
  correct_answer   BOOLEAN  NOT NULL        -- true = "Richtig", false = "Falsch"
);
CREATE INDEX IF NOT EXISTS hoeren_statements_ex_idx ON hoeren_statements(exercise_id);

-- Durable per-user attempt history (mirrors lesen_attempts).
CREATE TABLE IF NOT EXISTS hoeren_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id),
  exercise_id  UUID        NOT NULL REFERENCES hoeren_exercises(id) ON DELETE CASCADE,
  teil         SMALLINT    NOT NULL,
  score        INT         NOT NULL,
  total        INT         NOT NULL,
  answers      JSONB       NOT NULL,
  results      JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hoeren_attempts_user_idx ON hoeren_attempts(user_id, exercise_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE hoeren_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hoeren_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hoeren_attempts   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read hoeren_exercises"  ON hoeren_exercises  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read hoeren_statements" ON hoeren_statements FOR SELECT TO authenticated USING (true);

CREATE POLICY "own read hoeren_attempts" ON hoeren_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin write hoeren_exercises" ON hoeren_exercises FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write hoeren_statements" ON hoeren_statements FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── Student-safe view (no correct_answer) ────────────────────────────────────
CREATE OR REPLACE VIEW hoeren_statements_student AS
  SELECT id, exercise_id, statement_number, statement_text
  FROM   hoeren_statements;

GRANT SELECT ON hoeren_statements_student TO authenticated;

-- ── Scoring RPC: p_answers = {"41": true, "42": false, ...} (statement_number → chosen boolean) ──
CREATE OR REPLACE FUNCTION score_and_save_hoeren(
  p_exercise_id UUID,
  p_answers     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT teil INTO v_teil FROM hoeren_exercises WHERE id = p_exercise_id;

  FOR v_s IN
    SELECT statement_number, correct_answer FROM hoeren_statements
    WHERE exercise_id = p_exercise_id ORDER BY statement_number
  LOOP
    v_total  := v_total + 1;
    v_chosen := (p_answers ->> v_s.statement_number::TEXT)::BOOLEAN;
    v_is_correct := (v_chosen IS NOT NULL AND v_chosen = v_s.correct_answer);
    IF v_is_correct THEN v_score := v_score + 1; END IF;

    v_results := v_results || jsonb_build_object(
      'statement_number', v_s.statement_number,
      'correct',          v_is_correct,
      'your_answer',      to_jsonb(v_chosen),
      'correct_answer',   to_jsonb(v_s.correct_answer)
    );
  END LOOP;

  INSERT INTO hoeren_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, COALESCE(v_teil, 1), v_score, v_total, p_answers, v_results)
  RETURNING id INTO v_attempt;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results, 'attempt_id', v_attempt);
END;
$$;

GRANT EXECUTE ON FUNCTION score_and_save_hoeren(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_and_save_hoeren(UUID, JSONB) FROM anon;

-- ── Reveal-only RPC (for "Lösung anzeigen" without recording an attempt) ─────
CREATE OR REPLACE FUNCTION reveal_hoeren(p_exercise_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results JSONB := '[]'::JSONB;
  v_s       RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR v_s IN
    SELECT statement_number, correct_answer FROM hoeren_statements
    WHERE exercise_id = p_exercise_id ORDER BY statement_number
  LOOP
    v_results := v_results || jsonb_build_object(
      'statement_number', v_s.statement_number,
      'correct_answer',   to_jsonb(v_s.correct_answer)
    );
  END LOOP;

  RETURN jsonb_build_object('results', v_results);
END;
$$;

GRANT EXECUTE ON FUNCTION reveal_hoeren(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION reveal_hoeren(UUID) FROM anon;

-- ── Public image bucket (exercise photos, not sensitive) ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('hoeren-images', 'hoeren-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read hoeren-images" ON storage.objects FOR SELECT
  USING (bucket_id = 'hoeren-images');

CREATE POLICY "admin write hoeren-images" ON storage.objects FOR ALL TO authenticated
  USING    (bucket_id = 'hoeren-images' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (bucket_id = 'hoeren-images' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

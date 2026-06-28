-- ─────────────────────────────────────────────────────────────────────────────
-- Lesen exercise tables for TELC B2 Vorbereitung
-- Three completely independent importers: Teil 1, Teil 2, Teil 3
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Top-level exercise container ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesen_exercises (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  teil         SMALLINT    NOT NULL CHECK (teil IN (1, 2, 3)),
  level        TEXT        NOT NULL DEFAULT 'TELC_B2',
  difficulty   TEXT        NOT NULL DEFAULT 'medium',
  source_pdf   TEXT,
  import_notes TEXT,
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesen_exercises_teil_idx ON lesen_exercises(teil);

-- ── Teil 1 — Schlagzeilen (Überschriften zuordnen) ──────────────────────────
-- 10 headlines per exercise (A–J). 5 are correct, 5 are distractors.
CREATE TABLE IF NOT EXISTS lesen_t1_headlines (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id   UUID     NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  letter        CHAR(1)  NOT NULL,          -- A … J
  text          TEXT     NOT NULL,
  is_distractor BOOLEAN  NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS lesen_t1_headlines_ex_idx ON lesen_t1_headlines(exercise_id);

-- 5 texts per exercise (positions 1–5)
CREATE TABLE IF NOT EXISTS lesen_t1_texts (
  id               UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id      UUID     NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  position         SMALLINT NOT NULL,       -- 1 … 5
  title            TEXT,
  content          TEXT     NOT NULL,
  correct_headline CHAR(1)  NOT NULL        -- A … J
);
CREATE INDEX IF NOT EXISTS lesen_t1_texts_ex_idx ON lesen_t1_texts(exercise_id);

-- ── Teil 2 — Längerer Text + Multiple Choice ────────────────────────────────
-- One passage per exercise
CREATE TABLE IF NOT EXISTS lesen_t2_passages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  title        TEXT,
  instructions TEXT,
  passage      TEXT NOT NULL
);

-- 5 questions per exercise (numbers 6–10 in real exam; stored as 1–5 here)
CREATE TABLE IF NOT EXISTS lesen_t2_questions (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID     NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  number       SMALLINT NOT NULL,           -- 6 … 10
  question     TEXT     NOT NULL,
  option_a     TEXT     NOT NULL,
  option_b     TEXT     NOT NULL,
  option_c     TEXT     NOT NULL,
  correct      CHAR(1)  NOT NULL CHECK (correct IN ('a','b','c'))
);
CREATE INDEX IF NOT EXISTS lesen_t2_questions_ex_idx ON lesen_t2_questions(exercise_id);

-- ── Teil 3 — Situationen + Anzeigen (A–L) ───────────────────────────────────
-- 10 situations per exercise (numbers 11–20 in real exam)
CREATE TABLE IF NOT EXISTS lesen_t3_situations (
  id             UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id    UUID     NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  number         SMALLINT NOT NULL,         -- 11 … 20
  description    TEXT     NOT NULL,
  correct_letter CHAR(1),                   -- A … L, NULL when no_match is true
  no_match       BOOLEAN  NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS lesen_t3_situations_ex_idx ON lesen_t3_situations(exercise_id);

-- 12 texts per exercise (A–L)
CREATE TABLE IF NOT EXISTS lesen_t3_texts (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  UUID     NOT NULL REFERENCES lesen_exercises(id) ON DELETE CASCADE,
  letter       CHAR(1)  NOT NULL,           -- A … L
  title        TEXT,
  content      TEXT     NOT NULL
);
CREATE INDEX IF NOT EXISTS lesen_t3_texts_ex_idx ON lesen_t3_texts(exercise_id);

-- ── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE lesen_exercises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesen_t1_headlines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesen_t1_texts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesen_t2_passages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesen_t2_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesen_t3_situations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesen_t3_texts      ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all exercise content
CREATE POLICY "auth read lesen_exercises"     ON lesen_exercises     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lesen_t1_headlines"  ON lesen_t1_headlines  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lesen_t1_texts"      ON lesen_t1_texts      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lesen_t2_passages"   ON lesen_t2_passages   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lesen_t2_questions"  ON lesen_t2_questions  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lesen_t3_situations" ON lesen_t3_situations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read lesen_t3_texts"      ON lesen_t3_texts      FOR SELECT TO authenticated USING (true);

-- Admins/owners can insert, update, delete
-- Uses user_roles table with app_role enum (admin, super_admin, owner)
CREATE POLICY "admin write lesen_exercises"    ON lesen_exercises     FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write lesen_t1_headlines" ON lesen_t1_headlines  FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write lesen_t1_texts"     ON lesen_t1_texts      FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write lesen_t2_passages"  ON lesen_t2_passages   FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write lesen_t2_questions" ON lesen_t2_questions  FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write lesen_t3_situations" ON lesen_t3_situations FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin write lesen_t3_texts"     ON lesen_t3_texts      FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

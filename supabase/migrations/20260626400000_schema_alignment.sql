-- ─────────────────────────────────────────────────────────────────────────────
-- Schema alignment: add missing columns and tables that code references
-- ─────────────────────────────────────────────────────────────────────────────

-- ── exercise_collections ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_collections (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  level      TEXT,
  module     TEXT,
  teil       SMALLINT,
  notes      TEXT,
  created_by UUID        REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE exercise_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read exercise_collections" ON exercise_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write exercise_collections" ON exercise_collections FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── exercises — add missing columns ──────────────────────────────────────────
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS collection_id  UUID REFERENCES exercise_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_variant  TEXT;

-- ── audio_assets — add title column ──────────────────────────────────────────
ALTER TABLE audio_assets
  ADD COLUMN IF NOT EXISTS title TEXT;

-- ── profiles — add role/referral/ban columns used in admin pages ──────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin','super_admin','owner')),
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_banned     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin      BOOLEAN NOT NULL DEFAULT false;

-- ── pdf_imports — add level column ──────────────────────────────────────────
ALTER TABLE pdf_imports
  ADD COLUMN IF NOT EXISTS level         TEXT;

-- ── attempt_results — add missing columns ────────────────────────────────────
ALTER TABLE attempt_results
  ADD COLUMN IF NOT EXISTS section       TEXT,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS max_score     INTEGER;

-- ── weekly_goals — add target/done columns ────────────────────────────────────
ALTER TABLE weekly_goals
  ADD COLUMN IF NOT EXISTS exercises_target   INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS simulations_target INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS study_hours_target NUMERIC NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS study_hours_done   NUMERIC NOT NULL DEFAULT 0;

-- ── study_sessions — add duration_minutes ────────────────────────────────────
ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- ── devices — add device_fingerprint if missing ──────────────────────────────
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- ── user_exercise_attempts — add FK to exercises if not present ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_exercise_attempts_exercise_id_fkey'
      AND table_name = 'user_exercise_attempts'
  ) THEN
    ALTER TABLE user_exercise_attempts
      ADD CONSTRAINT user_exercise_attempts_exercise_id_fkey
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
  END IF;
END
$$;

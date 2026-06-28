-- ─────────────────────────────────────────────────────────────────────────────
-- Exercises table + audio assets + extended pdf_imports + extended enums
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extend import_status enum ────────────────────────────────────────────────
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'extracting';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'extracted';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'extraction_failed';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'building';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'built';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'built_needs_review';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'build_failed';
ALTER TYPE import_status ADD VALUE IF NOT EXISTS 'parsed';

-- ── Extend pdf_imports with missing columns ───────────────────────────────────
ALTER TABLE pdf_imports
  ADD COLUMN IF NOT EXISTS original_name        TEXT,
  ADD COLUMN IF NOT EXISTS content_hash         TEXT,
  ADD COLUMN IF NOT EXISTS kind                 TEXT,
  ADD COLUMN IF NOT EXISTS extraction_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linked_import_id     UUID REFERENCES pdf_imports(id);

-- ── audio_assets ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audio_assets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     TEXT        NOT NULL,
  storage_path TEXT        NOT NULL,
  duration_ms  INTEGER,
  size_bytes   INTEGER,
  created_by   UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE audio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read audio_assets" ON audio_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write audio_assets" ON audio_assets FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── exercises ─────────────────────────────────────────────────────────────────
-- Generic exercise table shared by all modules (Lesen, Hören, Sprachbausteine…)
-- The lesen_* tables are used for the structured Lesen import pipeline.
-- This table is used by the general exercise editor and the exam session system.
CREATE TABLE IF NOT EXISTS exercises (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level                TEXT        NOT NULL CHECK (level IN ('b1','b2')),
  module               TEXT        NOT NULL CHECK (module IN ('lesen','hoeren','sprachbausteine','schreiben','muendlich')),
  teil                 SMALLINT    NOT NULL,
  position             SMALLINT    NOT NULL DEFAULT 1,
  title                TEXT        NOT NULL DEFAULT '',
  prompt               TEXT        NOT NULL DEFAULT '',
  passage              TEXT,
  audio_id             UUID        REFERENCES audio_assets(id),
  kind                 TEXT        NOT NULL CHECK (kind IN ('multiple_choice','true_false','matching','cloze','open_text','passage_mcq','heading_match','situation_match')),
  options              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  correct              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  explanation          TEXT,
  tags                 TEXT[]      NOT NULL DEFAULT '{}',
  status               TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','archived')),
  original_numbering   TEXT,
  source_pdf_import_id UUID        REFERENCES pdf_imports(id),
  created_by           UUID        REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exercises_level_module_teil ON exercises(level, module, teil);
CREATE INDEX IF NOT EXISTS exercises_status ON exercises(status);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
-- Subscribers can read published exercises (without correct/explanation — see note below)
CREATE POLICY "auth read published exercises" ON exercises FOR SELECT TO authenticated
  USING (status = 'published');
-- Admins can read all, insert, update, delete
CREATE POLICY "admin full exercises" ON exercises FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── Trigger to auto-update updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

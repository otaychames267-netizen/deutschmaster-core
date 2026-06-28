-- ─────────────────────────────────────────────────────────────────────────────
-- Import staging layer (Milestone 1)
--
-- Drafts produced by the importer live here until a human explicitly APPROVES
-- them in the review workflow. Only on approval are they promoted to the live
-- lesen_* (and future section) tables. Nothing here is ever shown to students.
--
-- Purely additive: no existing table is modified. Admin/owner access only.
-- ─────────────────────────────────────────────────────────────────────────────

-- One batch per (PDF, section, teil) processing run.
CREATE TABLE IF NOT EXISTS import_batches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf    TEXT        NOT NULL,                 -- file name / path of the source PDF
  section       TEXT        NOT NULL,                 -- 'lesen' | 'sprachbausteine' | 'hoeren' | 'schreiben' | 'muendlich'
  teil          SMALLINT,                             -- 1 | 2 | 3 (nullable for sections without Teile)
  status        TEXT        NOT NULL DEFAULT 'extracting'  -- extracting | ready | partially_committed | committed | error
                            CHECK (status IN ('extracting','ready','partially_committed','committed','error')),
  total_pages   INT,
  total_exercises INT,
  notes         TEXT,
  created_by    UUID        REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_pdf, section, teil)
);
CREATE INDEX IF NOT EXISTS import_batches_status_idx ON import_batches(status);

-- One draft exercise per extracted exercise. Section-specific structure
-- (questions, options, answer keys, headlines, texts, situations, ads…) lives
-- in `payload` so a single table serves every section/Teil. `article` holds the
-- literal body text (article / passage) that requires verbatim review.
CREATE TABLE IF NOT EXISTS import_draft_exercises (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID        NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  idx           INT         NOT NULL,                 -- order within the PDF (preserves original order)
  section       TEXT        NOT NULL,
  teil          SMALLINT,
  title         TEXT,                                 -- final title (may carry version number)
  raw_title     TEXT,                                 -- title exactly as printed, before version numbering
  article       TEXT,                                 -- literal body text (article / passage), verbatim — never reworded
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- section-specific structured content
  flags         JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- validation / coherence flags
  coherence     NUMERIC,                              -- 0..1 coherence score of the body text
  structure_ok  BOOLEAN     NOT NULL DEFAULT FALSE,   -- passed structural validation for its section/Teil
  article_source TEXT,                                -- e.g. 'ocr@3x', 'manual'
  page_images   JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- Supabase Storage paths of the source page images
  status        TEXT        NOT NULL DEFAULT 'pending'      -- pending | approved | rejected
                            CHECK (status IN ('pending','approved','rejected')),
  promoted_exercise_id UUID,                          -- live exercise id once promoted (else NULL)
  reviewed_by   UUID        REFERENCES profiles(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, idx)
);
CREATE INDEX IF NOT EXISTS import_draft_ex_batch_idx  ON import_draft_exercises(batch_id);
CREATE INDEX IF NOT EXISTS import_draft_ex_status_idx ON import_draft_exercises(status);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS import_batches_set_updated ON import_batches;
CREATE TRIGGER import_batches_set_updated BEFORE UPDATE ON import_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS import_draft_ex_set_updated ON import_draft_exercises;
CREATE TRIGGER import_draft_ex_set_updated BEFORE UPDATE ON import_draft_exercises
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row-Level Security: admin / super_admin / owner only ─────────────────────
ALTER TABLE import_batches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_draft_exercises  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all import_batches" ON import_batches FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

CREATE POLICY "admin all import_draft_exercises" ON import_draft_exercises FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

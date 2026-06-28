-- pdf_imports: ocr_used, notes
ALTER TABLE pdf_imports
  ADD COLUMN IF NOT EXISTS ocr_used  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes     TEXT;

-- exercises: writing_category, muendlich_part, content_type
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS writing_category TEXT,
  ADD COLUMN IF NOT EXISTS muendlich_part   SMALLINT,
  ADD COLUMN IF NOT EXISTS content_type     TEXT;

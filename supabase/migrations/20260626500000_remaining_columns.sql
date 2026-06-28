-- pdf_imports: add extracted_text, extracted_candidates; make filename nullable
ALTER TABLE pdf_imports
  ADD COLUMN IF NOT EXISTS extracted_text        TEXT,
  ADD COLUMN IF NOT EXISTS extracted_candidates  JSONB;

ALTER TABLE pdf_imports ALTER COLUMN filename DROP NOT NULL;

-- weekly_goals: add streak_target and completed
ALTER TABLE weekly_goals
  ADD COLUMN IF NOT EXISTS streak_target  INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS completed      BOOLEAN NOT NULL DEFAULT false;

-- login_history: add device_fingerprint if missing
ALTER TABLE login_history
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

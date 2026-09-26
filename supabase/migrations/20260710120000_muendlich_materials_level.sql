-- muendlich_materials had no level column at all, so Sprechen prep content
-- (Teil 1 categories, Teil 2 topics, Teil 3 planning prompts) was shown
-- identically regardless of which level (/b1 or /b2) the student was in —
-- the exact cross-level leak this migration closes. All existing rows are
-- B2-oriented content (the only level built for Mündlich so far), so they
-- backfill as TELC_B2; future B1 content must be tagged TELC_B1 on insert.

ALTER TABLE muendlich_materials
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('TELC_B1', 'TELC_B2'));

UPDATE muendlich_materials SET level = 'TELC_B2' WHERE level IS NULL;

ALTER TABLE muendlich_materials ALTER COLUMN level SET NOT NULL;

CREATE INDEX IF NOT EXISTS muendlich_materials_level_idx ON muendlich_materials(level, teil, category);

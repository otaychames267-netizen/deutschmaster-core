-- Mündlich Phase 2, step 1: content schema for Teil 2/3 topic selection cards.
--
-- Teil 2 (Gespräch, 44 items expected): title-only display in Room 1 — the
-- existing muendlich_materials.title column already covers this with ZERO
-- schema change (SelBlock in pruefung.tsx already renders title-only buttons).
--
-- Teil 3 (Planung, 36 items expected): full short topic text inside the
-- selection micro-cards, not just a title — needs a new nullable body_text
-- column. Nullable because Teil 1/2 rows never use it.
ALTER TABLE muendlich_materials
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS source_pdf TEXT,
  ADD COLUMN IF NOT EXISTS position INT;

COMMENT ON COLUMN muendlich_materials.body_text IS 'Full topic text for Teil 3 planning-prompt micro-cards. NULL for Teil 1/2 (title-only).';
COMMENT ON COLUMN muendlich_materials.source_pdf IS 'Origin PDF filename, for import audit trail (same convention as hoeren/schreiben/sb imports).';
COMMENT ON COLUMN muendlich_materials.position IS 'Original source order (PDF page/sequence), for stable, review-friendly ordering independent of sort_order.';

-- storage_path was NOT NULL (designed for PDF-per-material rows: tipps/
-- redemittel/repeated_questions). Teil 2/3 'themen' rows are pure text/DB-driven
-- selection cards with no per-topic PDF, so relax the constraint for that
-- category only — tipps/redemittel/repeated_questions still require a real path.
ALTER TABLE muendlich_materials ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE muendlich_materials
  ADD CONSTRAINT muendlich_materials_storage_required_unless_themen
  CHECK (category = 'themen' OR storage_path IS NOT NULL);

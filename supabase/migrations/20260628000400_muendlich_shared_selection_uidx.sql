-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: the table-level UNIQUE(room_id, teil, slot) on muendlich_selections does
-- NOT constrain shared (Teil 2/3) rows, because Postgres treats NULL slots as
-- distinct in unique indexes. That let duplicate shared selections accumulate and
-- broke upsert-on-conflict for the NULL-slot case. We enforce uniqueness for the
-- shared case with a PARTIAL unique index.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Remove any pre-existing duplicate shared rows (keep the most recently updated;
--    tie-break on id) so the unique index can be created.
DELETE FROM muendlich_selections a
USING muendlich_selections b
WHERE a.slot IS NULL AND b.slot IS NULL
  AND a.room_id = b.room_id AND a.teil = b.teil
  AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.id < b.id));

-- 2) One shared selection per (room, teil).
CREATE UNIQUE INDEX IF NOT EXISTS muendlich_sel_shared_uidx
  ON muendlich_selections (room_id, teil)
  WHERE slot IS NULL;

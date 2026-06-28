-- ─────────────────────────────────────────────────────────────────────────────
-- Import audit log (validation milestone)
--
-- Records validation / reprocess events: what happened to which draft, why,
-- what changed, and when. Admin-only. Purely additive.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID        REFERENCES import_batches(id) ON DELETE CASCADE,
  draft_id    UUID        REFERENCES import_draft_exercises(id) ON DELETE SET NULL,
  draft_idx   INT,
  event       TEXT        NOT NULL,   -- validated | flagged_reprocess | reprocessed | promoted | corrected
  reason      TEXT,                   -- why (e.g. failing checks)
  details     JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- before/after, confidence, checks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS import_audit_batch_idx ON import_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS import_audit_event_idx ON import_audit_log(event);

ALTER TABLE import_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all import_audit_log" ON import_audit_log FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

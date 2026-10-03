-- ============================================================
-- D17 v3 hardening — Phase 10: admin replay support column.
-- Distinguishes admin-triggered re-analysis rows (using already-uploaded
-- screenshots, no new upload) from real student submissions in the
-- attempt history — never overwrites the original row (item 11/37:
-- immutable, never-deleted history), just adds a new one.
-- ============================================================
ALTER TABLE public.d17_verification_attempts
  ADD COLUMN IF NOT EXISTS is_admin_replay boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS d17_attempts_replay_idx ON public.d17_verification_attempts(order_id) WHERE is_admin_replay = true;

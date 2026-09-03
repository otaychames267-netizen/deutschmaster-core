-- ============================================================
-- Production audit finding: D17 destination phone number/IBAN were read
-- directly from process.env (D17_OFFICIAL_NUMBER/D17_OFFICIAL_IBAN) at order
-- creation, with no admin-dashboard way to change them without a code
-- redeploy, and no "account holder" field existed at all. Fixes the
-- explicit requirement that D17 phone number, IBAN, and account holder be
-- "fully configurable from the Admin Dashboard without modifying the code."
--
-- Reuses the exact platform_settings + set_platform_setting mechanism the
-- dynamic risk config (20260714030000) already established — same admin
-- gate, same automatic history logging, no new table/RPC needed. Seeded as
-- empty strings so a fresh deploy behaves identically to before this
-- migration (app code falls back to the env vars when these are unset).
--
-- d17_orders gets a new destination_account_holder column so the account
-- holder name is snapshotted onto each order at creation time exactly like
-- destination_number/destination_iban already are — this is what makes
-- "previous orders remain unchanged" true after an admin edits the config.
-- ============================================================

ALTER TABLE public.d17_orders
  ADD COLUMN IF NOT EXISTS destination_account_holder text;

INSERT INTO public.platform_settings (key, value) VALUES
  ('d17_payment_number', '""'::jsonb),
  ('d17_payment_iban', '""'::jsonb),
  ('d17_payment_account_holder', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

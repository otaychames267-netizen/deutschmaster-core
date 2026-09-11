-- D17 fraud-hardening Phase A: per-slot screenshot-type classification and
-- per-field OCR confidence, so the rule engine can distinguish "confidently
-- wrong" (hard reject, no Manual Review) from "genuinely unclear" (Manual
-- Review) on a field-by-field basis. Previously only one overall
-- ocr_confidence existed per screenshot pair, and screenshot slots were
-- trusted positionally with no explicit type check.

alter table public.d17_verification_attempts
  add column if not exists screenshot_type text,
  add column if not exists screenshot_type_2 text,
  add column if not exists confidence_authorization_number numeric,
  add column if not exists confidence_amount numeric,
  add column if not exists confidence_currency numeric,
  add column if not exists confidence_destination numeric,
  add column if not exists confidence_payment_datetime numeric;

comment on column public.d17_verification_attempts.screenshot_type is
  'Model-classified type of the slot-1 (Payment Success) screenshot: payment_success | journal | unknown. Independent of which slot it was uploaded into.';
comment on column public.d17_verification_attempts.screenshot_type_2 is
  'Model-classified type of the slot-2 (Journal D17) screenshot.';
comment on column public.d17_verification_attempts.confidence_authorization_number is
  'Per-field 0-100 OCR confidence for the authorization number, independent of the overall ocr_confidence. Gates whether an authorization-number mismatch hard-rejects (high confidence) or routes to Manual Review (low confidence).';

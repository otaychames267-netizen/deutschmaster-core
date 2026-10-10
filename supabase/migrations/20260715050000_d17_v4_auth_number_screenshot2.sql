-- D17 v4 Phase 19 (item 7): "same transaction" cross-screenshot checking
-- was incomplete — amount/currency/date-time/destination were all
-- independently re-verified by the rule engine, but the Authorization
-- Number (usually the strongest identifier on the screenshot) was never
-- captured for screenshot 2 at all, so cross-checking it relied entirely
-- on the AI's own self-reported cross_check.consistent, never independently
-- re-derived like the other fields. Mirrors ocr_destination_2's existing
-- pattern.
ALTER TABLE public.d17_verification_attempts
  ADD COLUMN IF NOT EXISTS ocr_authorization_number_2 text;

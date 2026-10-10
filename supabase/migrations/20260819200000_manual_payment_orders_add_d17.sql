-- Unify D17 with the existing manual (WhatsApp-receipt) payment flow already
-- used by Virement Postal / Virement Bancaire — replacing the old automated
-- OCR/screenshot-upload pipeline for all NEW D17 orders. The old d17_orders
-- table, its verification pipeline, and the 56 orders already in flight
-- there are untouched and keep working exactly as before.
alter table manual_payment_orders drop constraint manual_payment_orders_method_check;
alter table manual_payment_orders add constraint manual_payment_orders_method_check
  check (method = any (array['postal'::text, 'bancaire'::text, 'd17'::text]));

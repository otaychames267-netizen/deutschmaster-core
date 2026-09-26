-- D17 v3 Phase 14: emergency D17-only switch.
-- Distinct from payment_verification_kill_switch (Phase 5), which routes
-- new verification ATTEMPTS to manual review while the D17 payment OPTION
-- stays visible and usable. d17_disabled instead hides/blocks starting a
-- NEW D17 order entirely (the /billing button disappears client-side, and
-- createD17OrderImpl rejects new-order creation server-side) — Lemon
-- Squeezy card checkout is completely unaffected either way, and any
-- already-created D17 order keeps working through upload/verification/
-- admin review regardless of this switch, since it only gates the
-- "start a brand new order" path.
insert into public.platform_settings (key, value)
values ('d17_disabled', 'false'::jsonb)
on conflict (key) do nothing;

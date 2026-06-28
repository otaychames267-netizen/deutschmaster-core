-- ─────────────────────────────────────────────────────────────────────────────
-- Canonical pricing (single source of truth). These TND prices must match the
-- Landing page, Billing page, Help/FAQ, and any checkout/subscription logic:
--   Schriftlich = 25 TND   Mündlich = 45 TND   Komplett = 60 TND
-- (Komplett = 60 saves 10 TND vs. 25 + 45 = 70 bought separately.)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.plans SET price_tnd = 25 WHERE code = 'schriftlich';
UPDATE public.plans SET price_tnd = 45 WHERE code = 'muendlich';
UPDATE public.plans SET price_tnd = 60 WHERE code = 'komplett';

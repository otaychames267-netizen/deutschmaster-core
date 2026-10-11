-- Owner 2026-10-11: new price list with 2-month packs.
--   Schriftlich (+ Mündlich ohne KI):  30 TND / 1 month,   50 TND / 2 months  (instead of 60 = 2 x 30)
--   Komplett (mit KI-Sprachtrainer):   55 TND / 1 month,  110 TND / 2 months  (launch offer; regular price 65 / 130)
--
-- Design: `plans` stays the single source of truth for what is charged. The 1-month price is plans.price_tnd (as before); the 2-month price and the
-- "regular" (struck-through) prices are new columns. The Komplett prices are a LAUNCH OFFER with an end date: after plans.offer_ends_at the charge
-- AUTOMATICALLY becomes the regular price (list_price_tnd / list_price_tnd_2m), so the struck-through "regular price" shown to students is a price that
-- really applies later — never a made-up anchor. Extending the offer = updating offer_ends_at (or clearing it to keep 55/110 for good).
-- Schriftlich's 2-month "instead of 60" has no end date: 60 is exactly 2 x 30, so the saving is real for as long as the pack exists.
--
-- Orders carry the term (`manual_payment_orders.months`, 1 or 2): the amount is snapshotted from plan_term_price() at creation, and the subscription
-- grant on approval is 30 x months days (server code, src/lib/payment/manual-orders.functions.ts).

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS price_tnd_2m      numeric,
  ADD COLUMN IF NOT EXISTS list_price_tnd    numeric,
  ADD COLUMN IF NOT EXISTS list_price_tnd_2m numeric,
  ADD COLUMN IF NOT EXISTS offer_ends_at     timestamptz;

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_term_prices_min_30;
ALTER TABLE public.plans ADD CONSTRAINT plans_term_prices_min_30 CHECK (
  (price_tnd_2m IS NULL OR price_tnd_2m >= 30.00) AND (list_price_tnd IS NULL OR list_price_tnd >= 30.00) AND (list_price_tnd_2m IS NULL OR list_price_tnd_2m >= 30.00)
);

ALTER TABLE public.manual_payment_orders
  ADD COLUMN IF NOT EXISTS months smallint NOT NULL DEFAULT 1;
ALTER TABLE public.manual_payment_orders DROP CONSTRAINT IF EXISTS manual_payment_orders_months_check;
ALTER TABLE public.manual_payment_orders ADD CONSTRAINT manual_payment_orders_months_check CHECK (months IN (1, 2));

UPDATE public.plans SET price_tnd_2m = 50, list_price_tnd_2m = 60 WHERE code::text = 'schriftlich';
UPDATE public.plans SET price_tnd = 55, price_tnd_2m = 110, list_price_tnd = 65, list_price_tnd_2m = 130,
  offer_ends_at = timestamptz '2026-12-10 23:59:59+01' WHERE code::text = 'komplett_ai';

-- The amount to charge for a plan and term, NOW (server-side only; the web app never decides a price).
CREATE OR REPLACE FUNCTION public.plan_term_price(p_code text, p_months int)
 RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.plans%ROWTYPE; over boolean;
BEGIN
  IF p_months NOT IN (1, 2) THEN RAISE EXCEPTION 'INVALID_TERM'; END IF;
  SELECT * INTO r FROM public.plans WHERE code::text = p_code AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'UNKNOWN_PLAN'; END IF;
  over := r.offer_ends_at IS NOT NULL AND now() > r.offer_ends_at;
  IF p_months = 1 THEN
    RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd, r.price_tnd) ELSE r.price_tnd END;
  END IF;
  IF r.price_tnd_2m IS NULL THEN RAISE EXCEPTION 'TERM_NOT_AVAILABLE'; END IF;
  RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd_2m, r.price_tnd_2m) ELSE r.price_tnd_2m END;
END;
$$;

-- What the pricing cards show (public, no secrets): per sellable plan the terms with the price charged now, the struck-through regular price only
-- while it is a genuine reduction, and the offer end date only while the offer runs.
CREATE OR REPLACE FUNCTION public.get_plan_pricing()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r public.plans%ROWTYPE; res jsonb := '[]'::jsonb; over boolean; p1 numeric; p2 numeric; l1 numeric; l2 numeric; terms jsonb;
BEGIN
  FOR r IN SELECT * FROM public.plans WHERE active AND code::text IN ('schriftlich', 'komplett_ai')
           ORDER BY CASE code::text WHEN 'schriftlich' THEN 1 ELSE 2 END LOOP
    over := r.offer_ends_at IS NOT NULL AND now() > r.offer_ends_at;
    p1 := CASE WHEN over THEN COALESCE(r.list_price_tnd, r.price_tnd) ELSE r.price_tnd END;
    p2 := CASE WHEN r.price_tnd_2m IS NULL THEN NULL WHEN over THEN COALESCE(r.list_price_tnd_2m, r.price_tnd_2m) ELSE r.price_tnd_2m END;
    l1 := CASE WHEN over THEN NULL WHEN r.list_price_tnd > p1 THEN r.list_price_tnd END;
    l2 := CASE WHEN over OR p2 IS NULL THEN NULL WHEN r.list_price_tnd_2m > p2 THEN r.list_price_tnd_2m END;
    terms := jsonb_build_array(jsonb_build_object('months', 1, 'price', p1, 'list_price', l1));
    IF p2 IS NOT NULL THEN terms := terms || jsonb_build_array(jsonb_build_object('months', 2, 'price', p2, 'list_price', l2)); END IF;
    res := res || jsonb_build_array(jsonb_build_object(
      'code', r.code::text,
      'offer_ends_at', CASE WHEN r.offer_ends_at IS NOT NULL AND NOT over THEN r.offer_ends_at END,
      'terms', terms));
  END LOOP;
  RETURN res;
END;
$$;

REVOKE ALL ON FUNCTION public.plan_term_price(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plan_term_price(text, int) TO service_role;
REVOKE ALL ON FUNCTION public.get_plan_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_plan_pricing() TO anon, authenticated, service_role;

-- Fail loudly if the migration did not leave the intended price list in place.
DO $$
BEGIN
  IF public.plan_term_price('schriftlich', 1) <> 30 OR public.plan_term_price('schriftlich', 2) <> 50 THEN RAISE EXCEPTION 'schriftlich prices wrong'; END IF;
  IF now() <= timestamptz '2026-12-10 23:59:59+01' AND (public.plan_term_price('komplett_ai', 1) <> 55 OR public.plan_term_price('komplett_ai', 2) <> 110) THEN RAISE EXCEPTION 'komplett_ai offer prices wrong'; END IF;
END $$;

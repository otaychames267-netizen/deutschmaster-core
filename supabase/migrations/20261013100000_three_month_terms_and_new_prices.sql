-- Owner decision 2026-10-13: a 3-month term and a new price list.
--   Platinum (komplett_ai): 47 TND / 1 month, 86 TND / 2 months, 122 TND / 3 months
--   Gold (schriftlich):     30 TND / 1 month, 50 TND / 2 months,  70 TND / 3 months   (1 and 2 months unchanged)
-- The Platinum launch offer (55 / 110 until 2026-12-10, auto-reverting to 65 / 130) is REPLACED by these prices: offer_ends_at is cleared, so nothing reverts
-- and no "regular price" is struck through except the pack list prices (months x the 1-month price), which a student can really pay.
--
-- ROLLBACK (previous values):
--   UPDATE public.plans SET price_tnd = 55, price_tnd_2m = 110, list_price_tnd = 65, list_price_tnd_2m = 130, price_tnd_3m = NULL, list_price_tnd_3m = NULL,
--          offer_ends_at = '2026-12-10 22:59:59+00' WHERE code::text = 'komplett_ai';
--   UPDATE public.plans SET price_tnd_3m = NULL, list_price_tnd_3m = NULL WHERE code::text = 'schriftlich';
-- (the functions below accept term 3 only when price_tnd_3m is set, so after the rollback the 3-month term is simply not offered)

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS price_tnd_3m numeric,
  ADD COLUMN IF NOT EXISTS list_price_tnd_3m numeric;

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_term_prices_min_30;
ALTER TABLE public.plans ADD CONSTRAINT plans_term_prices_min_30 CHECK (
  (price_tnd_2m IS NULL OR price_tnd_2m >= 30.00)
  AND (price_tnd_3m IS NULL OR price_tnd_3m >= 30.00)
  AND (list_price_tnd IS NULL OR list_price_tnd >= 30.00)
  AND (list_price_tnd_2m IS NULL OR list_price_tnd_2m >= 30.00)
  AND (list_price_tnd_3m IS NULL OR list_price_tnd_3m >= 30.00)
);

ALTER TABLE public.manual_payment_orders DROP CONSTRAINT IF EXISTS manual_payment_orders_months_check;
ALTER TABLE public.manual_payment_orders ADD CONSTRAINT manual_payment_orders_months_check CHECK (months = ANY (ARRAY[1, 2, 3]));

-- The ONE price source for order creation (service_role only, as before) — now for 1, 2 and 3 months.
CREATE OR REPLACE FUNCTION public.plan_term_price(p_code text, p_months integer)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.plans%ROWTYPE; over boolean;
BEGIN
  IF p_months NOT IN (1, 2, 3) THEN RAISE EXCEPTION 'INVALID_TERM'; END IF;
  SELECT * INTO r FROM public.plans WHERE code::text = p_code AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'UNKNOWN_PLAN'; END IF;
  IF p_code = 'komplett_ai' AND NOT public.platinum_is_open() THEN RAISE EXCEPTION 'PLAN_CLOSED'; END IF;
  over := r.offer_ends_at IS NOT NULL AND now() > r.offer_ends_at;
  IF p_months = 1 THEN
    RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd, r.price_tnd) ELSE r.price_tnd END;
  ELSIF p_months = 2 THEN
    IF r.price_tnd_2m IS NULL THEN RAISE EXCEPTION 'TERM_NOT_AVAILABLE'; END IF;
    RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd_2m, r.price_tnd_2m) ELSE r.price_tnd_2m END;
  END IF;
  IF r.price_tnd_3m IS NULL THEN RAISE EXCEPTION 'TERM_NOT_AVAILABLE'; END IF;
  RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd_3m, r.price_tnd_3m) ELSE r.price_tnd_3m END;
END;
$function$;

-- What the price cards show (public). A struck-through list price only while it is a genuine reduction.
CREATE OR REPLACE FUNCTION public.get_plan_pricing()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.plans%ROWTYPE; res jsonb := '[]'::jsonb; over boolean; terms jsonb; m int; price numeric; list numeric; sale numeric; listp numeric;
BEGIN
  FOR r IN SELECT * FROM public.plans WHERE active AND code::text IN ('schriftlich', 'komplett_ai')
           ORDER BY CASE code::text WHEN 'schriftlich' THEN 1 ELSE 2 END LOOP
    over := r.offer_ends_at IS NOT NULL AND now() > r.offer_ends_at;
    terms := '[]'::jsonb;
    FOR m IN 1..3 LOOP
      sale  := CASE m WHEN 1 THEN r.price_tnd WHEN 2 THEN r.price_tnd_2m ELSE r.price_tnd_3m END;
      listp := CASE m WHEN 1 THEN r.list_price_tnd WHEN 2 THEN r.list_price_tnd_2m ELSE r.list_price_tnd_3m END;
      CONTINUE WHEN sale IS NULL;
      price := CASE WHEN over THEN COALESCE(listp, sale) ELSE sale END;
      list  := CASE WHEN over THEN NULL WHEN listp > price THEN listp END;
      terms := terms || jsonb_build_array(jsonb_build_object('months', m, 'price', price, 'list_price', list));
    END LOOP;
    res := res || jsonb_build_array(jsonb_build_object(
      'code', r.code::text,
      'open', CASE WHEN r.code::text = 'komplett_ai' THEN public.platinum_is_open() ELSE true END,
      'offer_ends_at', CASE WHEN r.offer_ends_at IS NOT NULL AND NOT over THEN r.offer_ends_at END,
      'terms', terms));
  END LOOP;
  RETURN res;
END;
$function$;

-- The new price list. List prices of the packs = months x the 1-month price (a real alternative the student could pay), so the strike-through is honest.
UPDATE public.plans SET price_tnd = 47, price_tnd_2m = 86, price_tnd_3m = 122,
                        list_price_tnd = NULL, list_price_tnd_2m = 94, list_price_tnd_3m = 141,
                        offer_ends_at = NULL
 WHERE code::text = 'komplett_ai';
UPDATE public.plans SET price_tnd_3m = 70, list_price_tnd_3m = 90
 WHERE code::text = 'schriftlich';

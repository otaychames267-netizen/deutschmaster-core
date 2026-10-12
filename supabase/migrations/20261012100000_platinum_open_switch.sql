-- Platinum (komplett_ai) sale switch.
--   platform_settings.platinum_open = false  -> the sale is closed: plan_term_price (the one function both order flows take the amount from) refuses the plan with
--                                               PLAN_CLOSED, and get_plan_pricing tells the pages ("open": false) so they show "opens this evening".
--   absent / true                            -> open, exactly as before.
-- Existing subscriptions and already-created orders are untouched; schriftlich is never affected.
-- Close:  INSERT INTO public.platform_settings (key, value) VALUES ('platinum_open', 'false'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
-- Open:   UPDATE public.platform_settings SET value = 'true'::jsonb, updated_at = now() WHERE key = 'platinum_open';

CREATE OR REPLACE FUNCTION public.platinum_is_open()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT value = 'true'::jsonb FROM public.platform_settings WHERE key = 'platinum_open'), true);
$$;
REVOKE ALL ON FUNCTION public.platinum_is_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platinum_is_open() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.plan_term_price(p_code text, p_months int)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.plans%ROWTYPE; over boolean;
BEGIN
  IF p_months NOT IN (1, 2) THEN RAISE EXCEPTION 'INVALID_TERM'; END IF;
  SELECT * INTO r FROM public.plans WHERE code::text = p_code AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'UNKNOWN_PLAN'; END IF;
  IF p_code = 'komplett_ai' AND NOT public.platinum_is_open() THEN RAISE EXCEPTION 'PLAN_CLOSED'; END IF;
  over := r.offer_ends_at IS NOT NULL AND now() > r.offer_ends_at;
  IF p_months = 1 THEN
    RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd, r.price_tnd) ELSE r.price_tnd END;
  END IF;
  IF r.price_tnd_2m IS NULL THEN RAISE EXCEPTION 'TERM_NOT_AVAILABLE'; END IF;
  RETURN CASE WHEN over THEN COALESCE(r.list_price_tnd_2m, r.price_tnd_2m) ELSE r.price_tnd_2m END;
END;
$$;
REVOKE ALL ON FUNCTION public.plan_term_price(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plan_term_price(text, int) TO service_role;

CREATE OR REPLACE FUNCTION public.get_plan_pricing()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
      'open', CASE WHEN r.code::text = 'komplett_ai' THEN public.platinum_is_open() ELSE true END,
      'offer_ends_at', CASE WHEN r.offer_ends_at IS NOT NULL AND NOT over THEN r.offer_ends_at END,
      'terms', terms));
  END LOOP;
  RETURN res;
END;
$$;

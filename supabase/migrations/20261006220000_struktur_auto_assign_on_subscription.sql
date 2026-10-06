-- Auto-assign the two personal Strukturen the moment a subscription is opened (owner request 2026-10-06):
--   B1 subscriber → one letter from pool A + one from pool B   (user_schreiben_struktur_b1)
--   B2 subscriber → one Produkt + one Dienstleistung card      (user_schreiben_struktur)
-- Until now a pair was only assigned lazily on the subscriber's first visit of the Struktur page (get_or_assign_my_struktur[_b1]); those RPCs
-- stay as the fallback (profile level not set yet when the plan was bought, level switched later, pool was exhausted at activation).
-- The assignment NEVER makes the subscription write fail: any error (e.g. an exhausted pool) is swallowed with a WARNING and the work of that
-- call is rolled back (no half pair).

CREATE OR REPLACE FUNCTION public.assign_struktur_for_user(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_level   text;
  v_p       text;
  v_card    uuid;
  v_produkt uuid;
  v_dienst  uuid;
  v_attempt int;
BEGIN
  SELECT pr.level::text INTO v_level FROM public.profiles AS pr WHERE pr.id = p_user;

  BEGIN
    IF v_level = 'TELC_B1' THEN
      FOREACH v_p IN ARRAY ARRAY['A', 'B'] LOOP
        IF NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = p_user AND s.pool = v_p) THEN
          v_attempt := 0;
          LOOP
            v_attempt := v_attempt + 1;
            -- balanced exactly like get_or_assign_my_struktur_b1: topic with the most open cards first, then a random card inside it
            SELECT o.id INTO v_card
            FROM (
              SELECT c.id, count(*) OVER (PARTITION BY c.theme_title) AS open_in_theme
              FROM public.schreiben_produkt_cards AS c
              WHERE c.level = 'TELC_B1' AND c.category = 'informell' AND left(c.topic_group, 1) = v_p
                AND NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.card_id = c.id)
            ) AS o
            ORDER BY o.open_in_theme DESC, random()
            LIMIT 1;
            IF v_card IS NULL THEN
              RAISE EXCEPTION 'STRUKTUR_POOL_EXHAUSTED_B1';
            END IF;
            BEGIN
              INSERT INTO public.user_schreiben_struktur_b1 (user_id, pool, card_id) VALUES (p_user, v_p, v_card);
              EXIT;
            EXCEPTION WHEN unique_violation THEN
              IF EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = p_user AND s.pool = v_p) THEN
                EXIT;
              END IF;
              IF v_attempt >= 5 THEN
                RAISE;
              END IF;
            END;
          END LOOP;
        END IF;
      END LOOP;

    ELSIF v_level = 'TELC_B2' THEN
      IF NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur AS s WHERE s.user_id = p_user) THEN
        v_attempt := 0;
        LOOP
          v_attempt := v_attempt + 1;
          SELECT c.id INTO v_produkt
          FROM public.schreiben_produkt_cards AS c
          WHERE c.level = 'TELC_B2' AND c.category = 'produkt'
            AND c.id NOT IN (SELECT s.produkt_card_id FROM public.user_schreiben_struktur AS s)
          ORDER BY random() LIMIT 1;
          IF v_produkt IS NULL THEN
            RAISE EXCEPTION 'STRUKTUR_POOL_EXHAUSTED_PRODUKT';
          END IF;
          SELECT c.id INTO v_dienst
          FROM public.schreiben_produkt_cards AS c
          WHERE c.level = 'TELC_B2' AND c.category = 'dienstleistung'
            AND c.id NOT IN (SELECT s.dienstleistung_card_id FROM public.user_schreiben_struktur AS s)
          ORDER BY random() LIMIT 1;
          IF v_dienst IS NULL THEN
            RAISE EXCEPTION 'STRUKTUR_POOL_EXHAUSTED_DIENSTLEISTUNG';
          END IF;
          BEGIN
            INSERT INTO public.user_schreiben_struktur (user_id, produkt_card_id, dienstleistung_card_id) VALUES (p_user, v_produkt, v_dienst);
            EXIT;
          EXCEPTION WHEN unique_violation THEN
            IF EXISTS (SELECT 1 FROM public.user_schreiben_struktur AS s WHERE s.user_id = p_user) THEN
              EXIT;
            END IF;
            IF v_attempt >= 5 THEN
              RAISE;
            END IF;
          END;
        END LOOP;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'assign_struktur_for_user(%) skipped: %', p_user, SQLERRM;
  END;
END;
$$;

-- internal only: it takes any user id, so no client role may call it
REVOKE ALL ON FUNCTION public.assign_struktur_for_user(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_subscriptions_assign_struktur()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- same entitlement rule as has_plan_access(user, 'schriftlich'), evaluated on the row itself (has_plan_access refuses when the caller is not the user)
  IF NEW.status::text = 'active'
     AND NEW.expires_at > now()
     AND (
       NEW.plan_code IS NULL
       OR NEW.plan_code::text IN ('komplett', 'premium', 'schriftlich')
       OR NEW.started_at < timestamptz '2026-10-05 10:50:47+00'
     )
  THEN
    PERFORM public.assign_struktur_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_subscriptions_assign_struktur() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subs_assign_struktur ON public.subscriptions;
CREATE TRIGGER subs_assign_struktur
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_subscriptions_assign_struktur();

-- get_or_assign_my_struktur_b1 now also returns the Tunisian-Arabic guide of each letter (schreiben_produkt_cards.arabic_guide, NULL until generated).
-- Same logic as 20261006180000_b1_struktur_two_pools.sql; only the extra OUT column is new (return type changes → DROP + CREATE, grants re-applied).

DROP FUNCTION IF EXISTS public.get_or_assign_my_struktur_b1();
CREATE FUNCTION public.get_or_assign_my_struktur_b1()
RETURNS TABLE (
  pool          text,
  card_id       uuid,
  card_title    text,
  theme_title   text,
  topic_group   text,
  template_text text,
  example_text  text,
  arabic_guide  jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user    uuid := auth.uid();
  v_p       text;
  v_card    uuid;
  v_attempt int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF (SELECT count(*) FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = v_user) < 2 THEN
    IF NOT public.has_plan_access(v_user, 'schriftlich') THEN
      IF public.is_d17_staff(v_user) THEN
        -- staff without a subscription: preview one random letter per pool, consume nothing
        RETURN QUERY
          SELECT pp.p, x.id, x.card_title, x.theme_title, x.topic_group, x.template_text, x.example_text, x.arabic_guide
          FROM unnest(ARRAY['A', 'B']) AS pp(p)
          CROSS JOIN LATERAL (
            SELECT c.id, c.card_title, c.theme_title, c.topic_group, c.template_text, c.example_text, c.arabic_guide
            FROM public.schreiben_produkt_cards AS c
            WHERE c.level = 'TELC_B1' AND c.category = 'informell' AND left(c.topic_group, 1) = pp.p
            ORDER BY random() LIMIT 1
          ) AS x
          ORDER BY pp.p;
        RETURN;
      END IF;
      RAISE EXCEPTION 'NOT_ENTITLED';
    END IF;

    -- both pools are assigned inside this one call; if either is exhausted the whole call rolls back (no half pair)
    FOREACH v_p IN ARRAY ARRAY['A', 'B'] LOOP
      IF NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = v_user AND s.pool = v_p) THEN
        v_attempt := 0;
        LOOP
          v_attempt := v_attempt + 1;

          -- balanced: take the topic that still has the most open cards, then a random card inside it
          SELECT o.id INTO v_card
          FROM (
            SELECT c.id,
                   count(*) OVER (PARTITION BY c.theme_title) AS open_in_theme
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
            INSERT INTO public.user_schreiben_struktur_b1 (user_id, pool, card_id) VALUES (v_user, v_p, v_card);
            EXIT;
          EXCEPTION WHEN unique_violation THEN
            -- either a concurrent call of this user already assigned this pool, or another subscriber just took the card
            IF EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = v_user AND s.pool = v_p) THEN
              EXIT;
            END IF;
            IF v_attempt >= 5 THEN
              RAISE;
            END IF;
          END;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY
    SELECT s.pool, c.id, c.card_title, c.theme_title, c.topic_group, c.template_text, c.example_text, c.arabic_guide
    FROM public.user_schreiben_struktur_b1 AS s
    JOIN public.schreiben_produkt_cards AS c ON c.id = s.card_id
    WHERE s.user_id = v_user
    ORDER BY s.pool;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.get_or_assign_my_struktur_b1() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_assign_my_struktur_b1() TO authenticated;

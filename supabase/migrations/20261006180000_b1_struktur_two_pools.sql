-- B1 Struktur: TWO pools (owner decision 2026-10-06, mirrors B2's Produkt/Dienstleistung).
--   Pool A "Einladung, Vorschlag & Planung": the friend proposes / invites / plans something together.
--   Pool B "Neuigkeiten, Rat & Bitte":       the friend shares news or a problem and asks for advice or help.
-- Every B1 subscriber is permanently assigned ONE letter from EACH pool (2 letters). The 500 cards keep their rows; only their
-- topic_group changes (10 authoring sections -> the 2 pools). Safe to run because nothing was assigned yet (asserted below).

DO $$
BEGIN
  IF (SELECT count(*) FROM public.user_schreiben_struktur_b1) > 0 THEN
    RAISE EXCEPTION 'b1 struktur already has assignments - re-pooling needs a data migration, not this one';
  END IF;
END $$;

UPDATE public.schreiben_produkt_cards SET topic_group = 'A · Einladung, Vorschlag & Planung'
WHERE level = 'TELC_B1' AND category = 'informell' AND theme_title IN (
    'Alicia – Gartenparty für den Englischkurs',
    'Tobias – Einzugsparty in Wien',
    'Jennifer – Hochzeit der Schwester',
    'Anne – Laras 30. Geburtstag',
    'Claudia – Jonas'' Geburtstag im Zoo',
    'Cora und Alex – Besuch im Sommer',
    'Mara – Reise mit dem neuen Freund',
    'Tamara – Treffen auf der Dienstreise',
    'Annika – Günstig verreisen',
    'Paul – Wanderurlaub in Südtirol',
    'Petra – Ferienhaus im Schwarzwald',
    'Clara – Einkaufen vor dem Urlaub',
    'Thomas – Ausflug mit Bus und Schiff',
    'Nadja – Gemeinsamer Garten',
    'Sonja – Musikfestival in Rüdesheim',
    'Corinna – Reise nach der Prüfung',
    'Emilia – Lerntipps und Besuch'
);

UPDATE public.schreiben_produkt_cards SET topic_group = 'B · Neuigkeiten, Rat & Bitte'
WHERE level = 'TELC_B1' AND category = 'informell' AND theme_title IN (
    'Iris – Abschlussparty für den Deutschkurs',
    'Rita – Hochzeit und Hochzeitsreise',
    'Caroline – Austauschschülerin zu Besuch',
    'Naco – Neue Wohnung und Nachbarn',
    'Andreas – Neue Wohnung und Computer',
    'Jakob – Lauter Nachbar',
    'Karla – Neues Leben in Bamberg',
    'Nora – Neue Freunde finden',
    'Sophie – Allein in Würzburg',
    'Andreas – Neuer Kollege Roberto',
    'Nicole – Der Bruder vor dem Fernseher',
    'Eva – Neue Stelle als Journalistin',
    'Miroslav – Eigene Firma gegründet',
    'Vera – Neue Arbeitsstelle und Arbeitsweg',
    'Anna – Katze und Blumen im Juli',
    'Jan – Grüße aus Rom',
    'Moritz – Grüße aus San Diego',
    'Viktor – Grüße von Malta'
);

-- one row per (user, pool); card_id stays globally UNIQUE so a card is closed for everybody else
ALTER TABLE public.user_schreiben_struktur_b1 DROP CONSTRAINT IF EXISTS user_schreiben_struktur_b1_pkey;
ALTER TABLE public.user_schreiben_struktur_b1 ADD COLUMN IF NOT EXISTS pool text;
UPDATE public.user_schreiben_struktur_b1 u SET pool = left(c.topic_group, 1)
  FROM public.schreiben_produkt_cards c WHERE c.id = u.card_id AND u.pool IS NULL;
ALTER TABLE public.user_schreiben_struktur_b1 ALTER COLUMN pool SET NOT NULL;
ALTER TABLE public.user_schreiben_struktur_b1 DROP CONSTRAINT IF EXISTS user_schreiben_struktur_b1_pool_chk;
ALTER TABLE public.user_schreiben_struktur_b1 ADD CONSTRAINT user_schreiben_struktur_b1_pool_chk CHECK (pool IN ('A', 'B'));
ALTER TABLE public.user_schreiben_struktur_b1 ADD PRIMARY KEY (user_id, pool);

-- the RPC now returns BOTH letters (one per pool), assigning whichever is missing
DROP FUNCTION IF EXISTS public.get_or_assign_my_struktur_b1();
CREATE FUNCTION public.get_or_assign_my_struktur_b1()
RETURNS TABLE (
  pool          text,
  card_id       uuid,
  card_title    text,
  theme_title   text,
  topic_group   text,
  template_text text,
  example_text  text
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
          SELECT pp.p, x.id, x.card_title, x.theme_title, x.topic_group, x.template_text, x.example_text
          FROM unnest(ARRAY['A', 'B']) AS pp(p)
          CROSS JOIN LATERAL (
            SELECT c.id, c.card_title, c.theme_title, c.topic_group, c.template_text, c.example_text
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
    SELECT s.pool, c.id, c.card_title, c.theme_title, c.topic_group, c.template_text, c.example_text
    FROM public.user_schreiben_struktur_b1 AS s
    JOIN public.schreiben_produkt_cards AS c ON c.id = s.card_id
    WHERE s.user_id = v_user
    ORDER BY s.pool;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.get_or_assign_my_struktur_b1() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_assign_my_struktur_b1() TO authenticated;

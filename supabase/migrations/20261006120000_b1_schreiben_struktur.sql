-- B1 personal Struktur (owner request 2026-10-06): 500 individually-written informal-letter structures for B1 subscribers.
-- Same model as the B2 Produkt / Service Struktur (20260911200000): every subscriber is permanently assigned exactly ONE card, never
-- shared (UNIQUE card_id is the DB-level guarantee), the card is "closed" for everyone else, and the pool is divided by topic so
-- the admin can see how many cards each topic still has. B1's only Schreiben format is the informal reply letter, so there is one
-- category ('informell') and one card per subscriber. The 500 cards are the 35 real B1 Schreiben tasks x 14-15 letters each,
-- grouped into 10 topic groups (topic_group).
--
-- Cards live in the existing schreiben_produkt_cards table (level = 'TELC_B1', category = 'informell'); the B2 rows, their
-- assignment table and get_or_assign_my_struktur() are untouched.

-- 1. category 'informell' + the topic grouping used by the admin capacity view
ALTER TABLE public.schreiben_produkt_cards DROP CONSTRAINT IF EXISTS schreiben_produkt_cards_category_chk;
ALTER TABLE public.schreiben_produkt_cards
  ADD CONSTRAINT schreiben_produkt_cards_category_chk CHECK (category IN ('produkt', 'dienstleistung', 'informell'));
ALTER TABLE public.schreiben_produkt_cards ADD COLUMN IF NOT EXISTS topic_group text;

-- 2. permanent per-user assignment (one card per subscriber)
CREATE TABLE IF NOT EXISTS public.user_schreiben_struktur_b1 (
  user_id     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id     uuid        NOT NULL UNIQUE REFERENCES public.schreiben_produkt_cards(id),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_schreiben_struktur_b1 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own b1 struktur" ON public.user_schreiben_struktur_b1;
DROP POLICY IF EXISTS "staff reads all b1 struktur" ON public.user_schreiben_struktur_b1;
DROP POLICY IF EXISTS "admin writes b1 struktur" ON public.user_schreiben_struktur_b1;

CREATE POLICY "user reads own b1 struktur" ON public.user_schreiben_struktur_b1 FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "staff reads all b1 struktur" ON public.user_schreiben_struktur_b1 FOR SELECT TO authenticated
  USING (public.is_d17_staff(auth.uid()));
CREATE POLICY "admin writes b1 struktur" ON public.user_schreiben_struktur_b1 FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'owner')));

-- 3. a subscriber's JWT can read exactly their own assigned B1 card (staff already read everything via the existing policy)
DROP POLICY IF EXISTS "own assigned b1 struktur" ON public.schreiben_produkt_cards;
CREATE POLICY "own assigned b1 struktur" ON public.schreiben_produkt_cards FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_schreiben_struktur_b1 u
    WHERE u.user_id = auth.uid() AND u.card_id = schreiben_produkt_cards.id
  ));

-- 4. get_or_assign_my_struktur_b1 — idempotent assignment
-- Subscribers: returns their existing card, else assigns one never-assigned card (race-safe, retries on a cross-user collision;
-- a concurrent duplicate call from the same account just returns the row that appeared). The pick is balanced: it takes a random
-- open card from the task that still has the MOST open cards, so topics drain evenly instead of one running dry first.
-- Raises STRUKTUR_POOL_EXHAUSTED_B1 instead of ever reusing a card.
-- Staff without a subscription only get a PREVIEW (random card, nothing assigned) so that admin visits never close a card.
-- NB: RETURNS TABLE declares OUT variables named card_id etc., so every column reference below is alias-qualified (42702 otherwise).
CREATE OR REPLACE FUNCTION public.get_or_assign_my_struktur_b1()
RETURNS TABLE (
  card_id      uuid,
  card_title   text,
  theme_title  text,
  topic_group  text,
  template_text text,
  example_text  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    uuid := auth.uid();
  v_card    uuid;
  v_attempt int  := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = v_user) THEN
    IF NOT public.has_plan_access(v_user, 'schriftlich') THEN
      IF public.is_d17_staff(v_user) THEN
        RETURN QUERY
          SELECT c.id, c.card_title, c.theme_title, c.topic_group, c.template_text, c.example_text
          FROM public.schreiben_produkt_cards AS c
          WHERE c.level = 'TELC_B1' AND c.category = 'informell'
          ORDER BY random() LIMIT 1;
        RETURN;
      END IF;
      RAISE EXCEPTION 'NOT_ENTITLED';
    END IF;

    LOOP
      v_attempt := v_attempt + 1;

      SELECT o.id INTO v_card
      FROM (
        SELECT c.id,
               count(*) OVER (PARTITION BY c.theme_title) AS open_in_theme
        FROM public.schreiben_produkt_cards AS c
        WHERE c.level = 'TELC_B1' AND c.category = 'informell'
          AND NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.card_id = c.id)
      ) AS o
      ORDER BY o.open_in_theme DESC, random()
      LIMIT 1;

      IF v_card IS NULL THEN
        RAISE EXCEPTION 'STRUKTUR_POOL_EXHAUSTED_B1';
      END IF;

      BEGIN
        INSERT INTO public.user_schreiben_struktur_b1 (user_id, card_id) VALUES (v_user, v_card);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF EXISTS (SELECT 1 FROM public.user_schreiben_struktur_b1 AS s WHERE s.user_id = v_user) THEN
          EXIT;
        END IF;
        IF v_attempt >= 5 THEN
          RAISE;
        END IF;
      END;
    END LOOP;
  END IF;

  RETURN QUERY
    SELECT c.id, c.card_title, c.theme_title, c.topic_group, c.template_text, c.example_text
    FROM public.user_schreiben_struktur_b1 AS s
    JOIN public.schreiben_produkt_cards AS c ON c.id = s.card_id
    WHERE s.user_id = v_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_assign_my_struktur_b1() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_or_assign_my_struktur_b1() TO authenticated;

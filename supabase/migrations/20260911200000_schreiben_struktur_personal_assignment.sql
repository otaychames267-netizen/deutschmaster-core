-- Replace the shared "Vorlagen" writing system with a per-subscriber
-- personal Struktur: every active subscriber gets exactly one Produkt-
-- Beschwerde and one Dienstleistung-Beschwerde card, permanently assigned
-- and never shared with anyone else. Repurposes the existing 150+150
-- individually-written schreiben_produkt_cards rows (built earlier this
-- session) as the assignment pool instead of browsing all 150 per category.

-- ── 1. Hide "Vorlagen" completely — even for admin/staff ────────────────
-- Deny-all SELECT (drops the is_d17_staff bypass too, per owner request
-- that Vorlagen be inaccessible even to the admin account). Table/storage
-- data itself is left intact — this only removes read access.

DROP POLICY IF EXISTS "plan-gated read vorlagen" ON schreiben_vorlagen;
DROP POLICY IF EXISTS "vorlagen hidden" ON schreiben_vorlagen;
CREATE POLICY "vorlagen hidden" ON schreiben_vorlagen FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS "plan-gated read schreiben-vorlagen" ON storage.objects;
DROP POLICY IF EXISTS "schreiben-vorlagen hidden" ON storage.objects;
CREATE POLICY "schreiben-vorlagen hidden" ON storage.objects FOR SELECT TO authenticated
  USING (false);

-- ── 2. Permanent per-user assignment table ──────────────────────────────
-- UNIQUE on both card-id columns is the actual guarantee that no card is
-- ever handed to two different users — enforced by the database, not just
-- application logic.

CREATE TABLE IF NOT EXISTS public.user_schreiben_struktur (
  user_id                 uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  produkt_card_id         uuid        NOT NULL UNIQUE REFERENCES public.schreiben_produkt_cards(id),
  dienstleistung_card_id  uuid        NOT NULL UNIQUE REFERENCES public.schreiben_produkt_cards(id),
  assigned_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_schreiben_struktur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own struktur" ON public.user_schreiben_struktur;
DROP POLICY IF EXISTS "staff reads all struktur" ON public.user_schreiben_struktur;
DROP POLICY IF EXISTS "admin writes struktur" ON public.user_schreiben_struktur;

CREATE POLICY "user reads own struktur" ON public.user_schreiben_struktur FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "staff reads all struktur" ON public.user_schreiben_struktur FOR SELECT TO authenticated
  USING (public.is_d17_staff(auth.uid()));

CREATE POLICY "admin writes struktur" ON public.user_schreiben_struktur FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ── 3. Lock down schreiben_produkt_cards to "my own assigned rows only" ─
-- Previously any schriftlich subscriber could SELECT all 300 rows directly
-- (that's how the old browse-all-150 UI worked). Now a regular subscriber's
-- own JWT can only ever see the exact 2 rows assigned to them; staff keep
-- full visibility for content management, matching every other content
-- table in this app.

DROP POLICY IF EXISTS "plan-gated read produkt cards" ON schreiben_produkt_cards;
DROP POLICY IF EXISTS "own assigned struktur or staff" ON schreiben_produkt_cards;

CREATE POLICY "own assigned struktur or staff" ON schreiben_produkt_cards FOR SELECT TO authenticated
  USING (
    public.is_d17_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_schreiben_struktur u
      WHERE u.user_id = auth.uid()
        AND (u.produkt_card_id = schreiben_produkt_cards.id OR u.dienstleistung_card_id = schreiben_produkt_cards.id)
    )
  );

-- Titles-only catalog RPC is no longer meaningful for a 1-per-user system —
-- its only callers (the locked-preview branches of the two routes) are
-- being replaced with static teaser copy.
DROP FUNCTION IF EXISTS public.get_produkt_cards_catalog(text, text);

-- ── 4. get_or_assign_my_struktur — the assignment RPC ───────────────────
-- Idempotent: returns the caller's existing pair if one exists; otherwise
-- picks one never-assigned card per category and inserts the pair. Retries
-- on a rare cross-user race (two accounts grabbing the same never-assigned
-- card at the same instant); if the retry loop finds our own row already
-- exists (a concurrent duplicate call from the same account), it simply
-- returns that. Raises STRUKTUR_POOL_EXHAUSTED_* instead of silently
-- reusing a card once a category's 150-row pool is fully spoken for.

CREATE OR REPLACE FUNCTION public.get_or_assign_my_struktur(p_level text DEFAULT 'TELC_B2')
RETURNS TABLE (
  produkt_card_id               uuid,
  produkt_card_title             text,
  produkt_theme_title            text,
  produkt_template_text          text,
  produkt_example_text           text,
  dienstleistung_card_id         uuid,
  dienstleistung_card_title      text,
  dienstleistung_theme_title     text,
  dienstleistung_template_text   text,
  dienstleistung_example_text    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_produkt_id  uuid;
  v_dienst_id   uuid;
  v_attempt     int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Every bare reference to produkt_card_id/dienstleistung_card_id below is
  -- deliberately qualified with a table alias (s./c.) — RETURNS TABLE
  -- implicitly declares OUT parameters of the same names as PL/pgSQL
  -- variables in this function's scope, so an unqualified column of the
  -- same name is ambiguous (variable vs. column) and Postgres rejects it.

  IF NOT EXISTS (SELECT 1 FROM public.user_schreiben_struktur AS s WHERE s.user_id = v_user_id) THEN
    IF NOT (public.has_plan_access(v_user_id, 'schriftlich') OR public.is_d17_staff(v_user_id)) THEN
      RAISE EXCEPTION 'NOT_ENTITLED';
    END IF;

    LOOP
      v_attempt := v_attempt + 1;

      SELECT c.id INTO v_produkt_id
      FROM public.schreiben_produkt_cards AS c
      WHERE c.level = p_level AND c.category = 'produkt'
        AND c.id NOT IN (SELECT s.produkt_card_id FROM public.user_schreiben_struktur AS s)
      ORDER BY random()
      LIMIT 1;

      IF v_produkt_id IS NULL THEN
        RAISE EXCEPTION 'STRUKTUR_POOL_EXHAUSTED_PRODUKT';
      END IF;

      SELECT c.id INTO v_dienst_id
      FROM public.schreiben_produkt_cards AS c
      WHERE c.level = p_level AND c.category = 'dienstleistung'
        AND c.id NOT IN (SELECT s.dienstleistung_card_id FROM public.user_schreiben_struktur AS s)
      ORDER BY random()
      LIMIT 1;

      IF v_dienst_id IS NULL THEN
        RAISE EXCEPTION 'STRUKTUR_POOL_EXHAUSTED_DIENSTLEISTUNG';
      END IF;

      BEGIN
        INSERT INTO public.user_schreiben_struktur (user_id, produkt_card_id, dienstleistung_card_id)
        VALUES (v_user_id, v_produkt_id, v_dienst_id);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF EXISTS (SELECT 1 FROM public.user_schreiben_struktur AS s WHERE s.user_id = v_user_id) THEN
          EXIT;
        END IF;
        IF v_attempt >= 5 THEN
          RAISE;
        END IF;
      END;
    END LOOP;
  END IF;

  RETURN QUERY
    SELECT p.id, p.card_title, p.theme_title, p.template_text, p.example_text,
           d.id, d.card_title, d.theme_title, d.template_text, d.example_text
    FROM public.user_schreiben_struktur AS s
    JOIN public.schreiben_produkt_cards AS p ON p.id = s.produkt_card_id
    JOIN public.schreiben_produkt_cards AS d ON d.id = s.dienstleistung_card_id
    WHERE s.user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_assign_my_struktur(text) TO authenticated;

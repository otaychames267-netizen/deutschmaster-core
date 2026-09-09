-- Schreiben "Karten" — 70 professional B2 Beschwerde-Produkt writing cards,
-- each pairing an adaptable template (Vorlage) with a full worked example
-- (Beispiel) based on a real, existing exam theme (never an invented one —
-- see the user's explicit requirement). 17 real themes x up to 5 rhetorical
-- strategies (S1-S5) = 70 cards, content-authored session 2026-09-09.
--
-- Access model mirrors the large per-item exercise banks (lesen_exercises /
-- hoeren_exercises / sb_exercises), NOT schreiben_vorlagen's simpler
-- whole-row gating: 70 rows is closer to "large bank" than "a couple of
-- category PDFs", so non-subscribers get a titles-only locked preview via
-- a SECURITY DEFINER catalog RPC (mirrors get_exercise_catalog), while the
-- real template/example text stays behind plan-gated RLS on the table
-- itself. No free-sample carve-out here (matches schreiben_vorlagen, which
-- also has none) -- this is a premium add-on to Schreiben prep, not a
-- graded practice exercise.

CREATE TABLE IF NOT EXISTS schreiben_produkt_cards (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level          TEXT        NOT NULL CHECK (level IN ('TELC_B1','TELC_B2')) DEFAULT 'TELC_B2',
  theme_title    TEXT        NOT NULL,   -- e.g. "DIGIBIKE – Hightech-Fahrrad"
  theme_source   TEXT,                    -- traceability: the real exam title this card is based on
  strategy_code  TEXT        NOT NULL CHECK (strategy_code IN ('S1','S2','S3','S4','S5')),
  strategy_label TEXT        NOT NULL,   -- e.g. "Chronologisch-klassisch"
  template_text  TEXT        NOT NULL,   -- Seite 1: bracketed, adaptable Vorlage
  example_text   TEXT        NOT NULL,   -- Seite 2: full worked Beispiel (>=150 words)
  sort_order     INT         NOT NULL DEFAULT 0,
  created_by     UUID        REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schreiben_produkt_cards_idx ON schreiben_produkt_cards(level, sort_order);

ALTER TABLE schreiben_produkt_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan-gated read produkt cards" ON schreiben_produkt_cards;
DROP POLICY IF EXISTS "admin write produkt cards" ON schreiben_produkt_cards;

CREATE POLICY "plan-gated read produkt cards" ON schreiben_produkt_cards FOR SELECT TO authenticated
  USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

CREATE POLICY "admin write produkt cards" ON schreiben_produkt_cards FOR ALL TO authenticated
  USING    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- Titles-only catalog for the visible-but-locked preview (mirrors
-- get_exercise_catalog) -- never returns template_text/example_text.
CREATE OR REPLACE FUNCTION public.get_produkt_cards_catalog(p_level text)
RETURNS TABLE (id uuid, theme_title text, strategy_code text, strategy_label text, sort_order int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.theme_title, c.strategy_code, c.strategy_label, c.sort_order
  FROM public.schreiben_produkt_cards c
  WHERE c.level = p_level
  ORDER BY c.sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.get_produkt_cards_catalog(text) TO authenticated;

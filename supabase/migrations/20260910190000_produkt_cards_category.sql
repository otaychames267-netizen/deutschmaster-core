-- Extend the Schreiben card bank to a second exam family: Dienstleistung
-- (service) complaints, alongside the existing 150 Produkt cards. Same table,
-- same connected-letter shape (template_text = fixed German prose with
-- [placeholders]; example_text = same letter fully filled). A `category`
-- column separates the two; a parallel route (.../schreiben/service-karten)
-- renders the same browser component with category="dienstleistung".
--
-- All existing rows are Produkt, so the column defaults to 'produkt' and no
-- backfill is needed.

ALTER TABLE public.schreiben_produkt_cards
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'produkt';

ALTER TABLE public.schreiben_produkt_cards
  DROP CONSTRAINT IF EXISTS schreiben_produkt_cards_category_chk;
ALTER TABLE public.schreiben_produkt_cards
  ADD CONSTRAINT schreiben_produkt_cards_category_chk
  CHECK (category IN ('produkt', 'dienstleistung'));

CREATE INDEX IF NOT EXISTS schreiben_produkt_cards_level_cat_sort_idx
  ON public.schreiben_produkt_cards (level, category, sort_order);

-- Catalog RPC (titles-only locked preview) gains an optional category filter.
-- Default 'produkt' keeps the existing produkt-karten route call unchanged.
DROP FUNCTION IF EXISTS public.get_produkt_cards_catalog(text);
DROP FUNCTION IF EXISTS public.get_produkt_cards_catalog(text, text);

CREATE FUNCTION public.get_produkt_cards_catalog(p_level text, p_category text DEFAULT 'produkt')
RETURNS TABLE (id uuid, card_title text, theme_title text, sort_order int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.card_title, c.theme_title, c.sort_order
  FROM public.schreiben_produkt_cards c
  WHERE c.level = p_level
    AND c.category = p_category
  ORDER BY c.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_produkt_cards_catalog(text, text) TO authenticated;

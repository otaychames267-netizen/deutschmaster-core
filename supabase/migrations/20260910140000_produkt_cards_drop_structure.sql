-- Produkt-Karte "Struktur" final shape (owner clarification 2026-09-10): the
-- Struktur tab is ONE complete, connected complaint-letter template — fixed
-- professional German prose that reads naturally from Betreff to Grußformel,
-- with only the topic-dependent information as [placeholders]. It is not a
-- stepped flow and not separate section cards. The Beispiel tab mirrors the
-- exact same template with every placeholder filled in for the specific theme.
--
-- The step-flow `structure` JSONB column (added 20260910120000) is therefore
-- unused; the connected template lives in `template_text` again.

ALTER TABLE public.schreiben_produkt_cards
  DROP COLUMN IF EXISTS structure;

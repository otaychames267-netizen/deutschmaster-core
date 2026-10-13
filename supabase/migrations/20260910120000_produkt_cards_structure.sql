-- Produkt-Karten "Struktur" redesign (owner request 2026-09-10): the flat
-- "## Label / paragraph" template_text was judged too document-like. The
-- Struktur tab is now a connected, step-by-step writing framework: a visual
-- 13-step flow (Einstieg -> ... -> Professioneller Schluss), and per step a
-- Zweck / Was-gehoert-hinein / Vorlage / Konnektoren / Uebergang-zum-naechsten
-- breakdown so the student sees how the whole letter is built and how each
-- section connects to the next.
--
-- Stored as a structured JSON document in a new `structure` column;
-- `template_text` is kept as a fallback for any row that hasn't been migrated
-- to the new shape yet (the frontend prefers `structure` when present).

ALTER TABLE public.schreiben_produkt_cards
  ADD COLUMN IF NOT EXISTS structure jsonb;

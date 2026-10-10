-- Tunisian-Arabic explanation of a B1 Struktur letter (owner request 2026-10-06: "explain in Arabic, not only German").
-- Shape: { "summary": text, "paragraphs": [text, ...], "model": text }  — one entry per body paragraph of the letter.
-- Lives on the card, so a student reads it exactly where RLS already lets them read their own assigned card.
ALTER TABLE public.schreiben_produkt_cards ADD COLUMN IF NOT EXISTS arabic_guide jsonb;

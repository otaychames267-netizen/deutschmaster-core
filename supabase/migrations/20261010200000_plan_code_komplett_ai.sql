-- Owner decision (2026-10-10): a new sellable plan "Komplett" (code komplett_ai, 60 TND/month) = the whole Schriftlich plan + the Mündlich Vorbereitung
-- cards + the AI Sprachtrainer 1:1. It is a SEPARATE plan code on purpose: the 87 existing "komplett" subscribers keep their 30 TND price and do NOT get
-- the AI tutor. This statement must be committed before the new value can be used, hence its own migration.
ALTER TYPE public.plan_code ADD VALUE IF NOT EXISTS 'komplett_ai';

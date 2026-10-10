-- Structured, per-exercise admin note for placeholders — e.g. correcting a
-- previously-stated reference code. Nullable; only Erdbeeren gets one right
-- now. Rendered on the placeholder card only when present, so this never
-- affects the other 4 new placeholders.

alter table public.hoeren_exercises add column if not exists admin_note text;

update public.hoeren_exercises
set admin_note = 'Wichtiger Hinweis: Der zuvor angegebene Referenzcode 1245 ist falsch. Der korrekte Referenzcode für Erdbeeren ist 125.'
where id = 'ec5857c1-3c4d-4c34-9842-df4e44d924e8'; -- Erdbeeren, Teil 1

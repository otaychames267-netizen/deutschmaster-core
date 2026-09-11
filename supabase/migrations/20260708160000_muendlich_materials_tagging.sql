-- Structural metadata for muendlich_materials (Sprechen Teil 2/3 topic content):
-- difficulty_level + theme_category for future UI filtering, key_arguments for
-- rendering Teil 2 discussion prompts as bullet points. All nullable/additive —
-- existing rows (and Teil 1 study-PDF rows, which don't use these) are unaffected.
alter table public.muendlich_materials
  add column if not exists difficulty_level text check (difficulty_level in ('B2', 'C1')),
  add column if not exists theme_category text,
  add column if not exists key_arguments text[];

-- Admin content management: explicit, editable ordering for prep exercises.
--
-- lesen_exercises had NO order column — student listings fell back to
-- created_at, which is why some Lesen Teil 2 items appeared as 3,2,1 instead
-- of 1,2,3. This adds an explicit sort_order, backfilled from the current
-- created_at order within each (level, teil) group so nothing visibly moves
-- until an admin deliberately reorders. hoeren_exercises.position and
-- exams.display_order already exist; sb_exercises.position exists but is
-- nullable, so we backfill it on the same basis.
--
-- All admin writes (rename / reorder) go through service-role server
-- functions (src/lib/admin/content.functions.ts), consistent with every
-- other admin write path in this app — so NO new client-facing RLS write
-- policy is added here (that would widen the attack surface for zero benefit).

ALTER TABLE public.lesen_exercises ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY level, teil ORDER BY created_at, id) AS rn
  FROM public.lesen_exercises
)
UPDATE public.lesen_exercises e
SET sort_order = r.rn
FROM ranked r
WHERE e.id = r.id AND e.sort_order IS NULL;

-- sb_exercises.position is nullable — give every row a deterministic value so
-- reordering always has a well-defined basis.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY level, teil ORDER BY created_at, id) AS rn
  FROM public.sb_exercises
)
UPDATE public.sb_exercises e
SET position = r.rn
FROM ranked r
WHERE e.id = r.id AND e.position IS NULL;

CREATE INDEX IF NOT EXISTS lesen_exercises_order_idx ON public.lesen_exercises(level, teil, sort_order);

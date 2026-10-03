-- Owner decision (2026-08-10): the PDF viewer is removed entirely and
-- replaced by Hero Cards that open the real content in a modal on click,
-- gated by the same has_plan_access RLS the table already enforces (a
-- non-entitled click's direct row fetch simply returns nothing, and the
-- caller shows the paywall instead). The catalog RPC's only remaining job
-- is the browsable grid — title/category/badge/is_unassigned_center — so
-- body_text and redemittel_data come back out of it: leaving them in would
-- mean a non-subscriber could still read real topic content straight off
-- the network response even though the UI shows a paywall on click.
DROP FUNCTION IF EXISTS public.get_muendlich_catalog(integer, text);

CREATE FUNCTION public.get_muendlich_catalog(p_teil integer, p_level text)
RETURNS TABLE (
  id uuid, title text, theme_category text, difficulty_level text, is_unassigned_center boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.title, m.theme_category, m.difficulty_level, m.is_unassigned_center
  FROM public.muendlich_materials m
  WHERE m.teil = p_teil AND m.level = p_level AND m.category = 'themen'
  ORDER BY m.is_unassigned_center, m.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_muendlich_catalog(integer, text) TO anon, authenticated;

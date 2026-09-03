-- Owner decision (2026-08-10): the Hero Card grid needs a plain-text
-- scenario snippet on the card face itself (title + image accent + snippet
-- + "Thema öffnen" button), not just title/badge — so body_text comes back
-- into the catalog RPC. Still never speaking_toolbox/storage_path: the
-- real exam-prep content (dialogue, Redemittel, Wortschatz, Arabic) only
-- ever leaves the server through the per-topic has_plan_access-gated fetch
-- triggered by actually opening a card.
DROP FUNCTION IF EXISTS public.get_muendlich_catalog(integer, text);

CREATE FUNCTION public.get_muendlich_catalog(p_teil integer, p_level text)
RETURNS TABLE (
  id uuid, title text, theme_category text, difficulty_level text,
  is_unassigned_center boolean, body_text text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.title, m.theme_category, m.difficulty_level, m.is_unassigned_center, m.body_text
  FROM public.muendlich_materials m
  WHERE m.teil = p_teil AND m.level = p_level AND m.category = 'themen'
  ORDER BY m.is_unassigned_center, m.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_muendlich_catalog(integer, text) TO anon, authenticated;

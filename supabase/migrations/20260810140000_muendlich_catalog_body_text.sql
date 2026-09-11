-- Extends get_muendlich_catalog with body_text (the raw topic scenario/task
-- prompt — no solutions, dialogue, Redemittel, or vocabulary). Owner
-- decision (2026-08-10): the native Mündlich page now shows only this plain
-- scenario text to everyone, subscriber or not — the actual exam-prep
-- content (Struktur, Beispieldialog, Wortschatz, Arabic explanations) lives
-- exclusively in the protected PDF. Same "show the prompt, lock the answer"
-- pattern already used for Lesen/Hören exercise previews elsewhere in the
-- app — body_text alone carries no exam value on its own.
DROP FUNCTION IF EXISTS public.get_muendlich_catalog(integer, text);

CREATE FUNCTION public.get_muendlich_catalog(p_teil integer, p_level text)
RETURNS TABLE (id uuid, title text, theme_category text, difficulty_level text, body_text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.title, m.theme_category, m.difficulty_level, m.body_text
  FROM public.muendlich_materials m
  WHERE m.teil = p_teil AND m.level = p_level AND m.category = 'themen'
    AND m.is_unassigned_center = false
  ORDER BY m.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_muendlich_catalog(integer, text) TO anon, authenticated;

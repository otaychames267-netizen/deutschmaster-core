-- Freemium preview for Mündlich, mirroring get_exercise_catalog: lets
-- non-subscribers (including anonymous visitors) browse the topic list
-- (title + category only) so the Mündlich dashboard is browsable-but-locked
-- like every other module, instead of returning zero rows via the
-- has_plan_access-gated table RLS. Never returns body_text,
-- speaking_toolbox, or storage_path — nothing a non-subscriber could use as
-- real exam content. is_unassigned_center rows stay excluded here too, same
-- as the plan-gated path — non-exam-verified topics are never shown to
-- non-admins regardless of subscription status.
CREATE OR REPLACE FUNCTION public.get_muendlich_catalog(p_teil integer, p_level text)
RETURNS TABLE (id uuid, title text, theme_category text, difficulty_level text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.title, m.theme_category, m.difficulty_level
  FROM public.muendlich_materials m
  WHERE m.teil = p_teil AND m.level = p_level AND m.category = 'themen'
    AND m.is_unassigned_center = false
  ORDER BY m.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_muendlich_catalog(integer, text) TO anon, authenticated;

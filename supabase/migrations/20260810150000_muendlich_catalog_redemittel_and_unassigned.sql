-- Owner decision (2026-08-10): topic cards must now show each topic's own
-- associated Redemittel/expressions (Teil 3: the topic-specific demo
-- Frage/Antwort/Reaktion per Struktur section; Teil 2: the redemittel
-- phrase arrays already authored across its 7-page toolbox), and the
-- "never introduced in a Tunisian exam center" topics move from
-- admin-only/PDF-appendix-only back into the native page, in their own
-- clearly-labeled bottom section — so the WHERE is_unassigned_center=false
-- filter is dropped and the flag is now returned to the caller instead.
--
-- Still deliberately narrow: this returns Struktur/Redemittel data only,
-- never beispieldialog, wortschatz, erklaerung, or any Arabic explanation —
-- that content stays exclusively in the protected PDF (see
-- MuendlichDualDisplay's ProtectedPdfShowcase).
DROP FUNCTION IF EXISTS public.get_muendlich_catalog(integer, text);

CREATE FUNCTION public.get_muendlich_catalog(p_teil integer, p_level text)
RETURNS TABLE (
  id uuid, title text, theme_category text, difficulty_level text,
  body_text text, is_unassigned_center boolean, redemittel_data jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.title, m.theme_category, m.difficulty_level, m.body_text, m.is_unassigned_center,
    CASE
      WHEN p_teil = 3 THEN m.speaking_toolbox -> 'struktur'
      WHEN p_teil = 2 THEN jsonb_build_object(
        'inhalt_redemittel', m.speaking_toolbox -> 'page2_inhalt' -> 'inhalt_redemittel',
        'meinung_redemittel', m.speaking_toolbox -> 'page3_meinung' -> 'redemittel',
        'experience_redemittel', m.speaking_toolbox -> 'page4_erfahrung' -> 'experience_redemittel',
        'heimatland_redemittel', m.speaking_toolbox -> 'page4_erfahrung' -> 'heimatland_redemittel',
        'vorteile_redemittel', m.speaking_toolbox -> 'page5_procontra' -> 'vorteile' -> 'redemittel',
        'nachteile_redemittel', m.speaking_toolbox -> 'page5_procontra' -> 'nachteile' -> 'redemittel'
      )
      ELSE NULL
    END AS redemittel_data
  FROM public.muendlich_materials m
  WHERE m.teil = p_teil AND m.level = p_level AND m.category = 'themen'
  ORDER BY m.is_unassigned_center, m.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_muendlich_catalog(integer, text) TO anon, authenticated;

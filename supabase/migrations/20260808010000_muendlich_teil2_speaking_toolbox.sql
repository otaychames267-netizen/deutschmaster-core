-- Mündlich Teil 2 content overhaul: each topic gets a rich 5-page "speaking
-- toolbox" (page 1 = existing body_text, unchanged; pages 2-5 = topic
-- explanation/ideas/Redemittel, personal-experience, Vorteile/Nachteile,
-- vocabulary) instead of just body_text + a flat key_arguments list.
--
-- One JSONB column rather than a dozen typed columns/arrays: the ideas
-- lists are naturally variable-length and vary in shape per topic, and this
-- app already uses this pattern for similarly free-form structured content
-- (attempt_answers/results, rule_engine_result). Shape (documented here,
-- enforced app-side, not by a DB constraint — same trust level as every
-- other JSONB content column in this schema):
--
-- {
--   "page2": {
--     "explanation": "string",
--     "ideas": [{ "idea": "string", "verbs": "string" }, ...],
--     "content_redemittel": ["string", ...],
--     "opinion_redemittel": ["string", ...],
--     "worked_example": "string"
--   },
--   "page3": { "redemittel": ["string", ...], "ideas": ["string", ...] },
--   "page4": {
--     "vorteile": { "redemittel": ["string", ...], "ideas": ["string", ...] },
--     "nachteile": { "redemittel": ["string", ...], "ideas": ["string", ...] }
--   },
--   "page5": {
--     "verben": ["string", ...], "nomen": ["string", ...],
--     "adjektive": ["string", ...], "expressions": ["string", ...]
--   }
-- }
alter table public.muendlich_materials
  add column if not exists speaking_toolbox jsonb,
  add column if not exists is_unassigned_center boolean not null default false;

comment on column public.muendlich_materials.speaking_toolbox is
  'Teil-2-only rich 5-page speaking-toolbox content (pages 2-5); NULL until authored. See migration 20260808010000 for the documented shape.';
comment on column public.muendlich_materials.is_unassigned_center is
  'Teil-2-only: true for the 9 topics the owner has not yet introduced in any physical teaching center. Forced into a dedicated "Noch in keinem Zentrum eingeführte Themen" section at the very end of the topic list regardless of theme_category.';

-- The 9 topics named explicitly by the owner — matched by exact existing
-- title text (all already present in muendlich_materials from earlier
-- imports; this only sets the flag, changes no other content).
update public.muendlich_materials
set is_unassigned_center = true
where teil = 2 and category = 'themen' and title in (
  'Elektroautos - Verkehrsmittel der näheren Zukunft?',
  'Wie sinnvoll sind Nahrungsergänzungsmittel',
  'Getrennte Schulen für Mädchen und Jungen?',
  'Haushaltsgeräte erleichtern die Hausarbeit',
  'Wo sollen wir einkaufen',
  'Wählen schon mit 16',
  'Die Europäische Union - Pro und Contra',
  'Der Ruf nach mehr direkter Demokratie',
  'Orthographie und Handschrift heute'
);

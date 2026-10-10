-- Documents the v2 (7-page) speaking_toolbox JSON shape. No structural change —
-- speaking_toolbox is already jsonb (see 20260808010000). Rows are migrated to v2
-- content topic-by-topic; the student UI treats any row without
-- `speaking_toolbox->>'schema_version' = '2'` as "not yet available" beyond Page 1.
comment on column public.muendlich_materials.speaking_toolbox is
'Mündlich Teil 2 "Sprech-Toolbox" content for teil=2/category=''themen'' rows. v2 (7-page) shape:
{
  "schema_version": 2,
  "page2_inhalt": {
    "ar_summary": "Arabic explanation of what the text is about",
    "extraction_guide_ar": "Arabic guide on identifying the main topic",
    "inhalt_de": "German Inhalt/Zusammenfassung",
    "inhalt_redemittel": [{"de": "...", "ar": "..."}],
    "ideas": [{"idea": "...", "verbs": "..."}]
  },
  "page3_meinung": {
    "redemittel": [{"de": "...", "ar": "..."}],
    "ideas": [{"idea": "...", "verbs": "..."}],
    "example": {"text": "...**connector**...", "ar": "..."}
  },
  "page4_erfahrung": {
    "experience_redemittel": [{"de": "...", "ar": "..."}],
    "heimatland_redemittel": [{"de": "...", "ar": "..."}],
    "experience_ideas": ["..."],
    "heimatland_ideas": ["..."],
    "example": {"label": "Beispiel", "text": "...**connector**...", "ar": "..."}
  },
  "page5_procontra": {
    "vorteile": {"redemittel": [{"de","ar"}], "ideas": [{"idea","verbs"}]},
    "nachteile": {"redemittel": [{"de","ar"}], "ideas": [{"idea","verbs"}]},
    "example": {"text": "...**connector**...", "ar": "..."}
  },
  "page6_fragen": {
    "questions": [{"q_de": "...", "q_ar": "...", "answer_ideas": ["..."]}]
  },
  "page7_wortschatz": {
    "verben": [{"de","ar"}], "nomen": [{"de","ar"}], "adjektive": [{"de","ar"}], "expressions": [{"de","ar"}]
  }
}
Sample-paragraph fields (page3/4/5 "example.text") mark connector/Redemittel phrases with
**double asterisks** for UI/PDF highlighting. Bilingual {de, ar} pairs are gated behind the
student-facing translation toggle; page2_inhalt.ar_summary/extraction_guide_ar are original
explanatory content and always visible, not toggle-gated.';

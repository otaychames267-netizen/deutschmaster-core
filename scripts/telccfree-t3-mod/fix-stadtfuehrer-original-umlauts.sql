-- B2 Lesen Teil 3 "Stadtführer" (original): the situations were stored without umlauts / with grammar slips ("Stadtfuhrer", "mochte", "mogen", "Eine bekannter" ...).
-- Spelling-only correction (owner said "sale7" 2026-10-07); letters, answer key, ads and translations are untouched. The corrected wording equals telccfree's
-- version of the same original (quiz/stadtfuehrer.html). The matching "paraphrase.question" strings in learning_aids are updated to the same text.
DO $fix$
DECLARE
  v_id uuid := '7c655055-e1aa-479e-b923-0c9c36f97530';
  r record; v_la jsonb;
BEGIN
  UPDATE lesen_t3_situations s SET description = v.d
  FROM (VALUES
    (11, 'Ein Bekannter möchte mit seiner zehnjährigen Tochter eine Ausstellung besuchen. Es sollte auch ein Angebot für Kinder geben.'),
    (12, 'Ein Freund würde gerne als Stadtführer arbeiten, hat aber noch keine Berufserfahrung.'),
    (14, 'Ihr Bruder möchte einen Vortrag zu einem historischen Thema hören.'),
    (16, 'Ihre Schwester möchte bald ihr Bad renovieren lassen. Sie sucht Bilder von modernen Badezimmern.'),
    (17, 'Ihre Tante möchte einen Vortrag über die Sehenswürdigkeiten Roms besuchen.'),
    (18, 'Sie möchten im Urlaub an einer besonderen Stadtführung teilnehmen.'),
    (19, 'Sie möchten wissen, wie Pflegeprodukte hergestellt werden.'),
    (20, 'Sie mögen leichte Unterhaltung und würden gerne mal wieder richtig lachen.')
  ) AS v(n, d)
  WHERE s.exercise_id = v_id AND s.number = v.n;

  SELECT learning_aids INTO v_la FROM lesen_exercises WHERE id = v_id;
  FOR r IN SELECT number, description FROM lesen_t3_situations WHERE exercise_id = v_id LOOP
    IF jsonb_typeof(v_la->'items'->(r.number::text)) = 'object' AND jsonb_typeof(v_la->'items'->(r.number::text)->'paraphrase'->0) = 'object' THEN
      v_la := jsonb_set(v_la, ARRAY['items', r.number::text, 'paraphrase', '0', 'question'], to_jsonb(r.description));
    END IF;
  END LOOP;
  UPDATE lesen_exercises SET learning_aids = v_la,
    import_notes = COALESCE(NULLIF(import_notes, '') || ' | ', '') || '2026-10-07: Rechtschreibung der Situationen korrigiert (fehlende Umlaute/Grammatikfehler), Lösungen unverändert.'
  WHERE id = v_id;
END
$fix$;

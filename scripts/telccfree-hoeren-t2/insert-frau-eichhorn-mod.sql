-- B2 Hören Teil 2: add "Frau Eichhorn (معدل)" = telccfree.com "Frau Eichhorn 2" (quiz/marktstand-eigenes-geschaeft.html), owner request 2026-10-07.
-- telccfree uses the SAME recording as the existing Aura "Frau Eichhorn" (vom-marktstand-zum-eigenen-geschaeft.m4a) and the same 10 statements (46-55);
-- so this row reuses the existing hoeren-audio object (no new file) and the original's statements/learning_aids. Only difference in the source key:
-- statement 50 (telccfree: richtig, Aura original from the owner's PDF: falsch). Imported as the source says; conflict flagged in import_notes.
-- Insert-only except positions of the rows behind the original (+1) so the variant sits directly after it. One DO block = one transaction.
DO $mig$
DECLARE
  v_base uuid := '9d65952e-f768-446b-8719-94f3506d498f';
  v_new uuid; v_pos int; v_la jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM hoeren_exercises WHERE level = 'TELC_B2' AND teil = 2 AND title = 'Frau Eichhorn (معدل)') THEN
    RAISE EXCEPTION 'already imported';
  END IF;
  SELECT position INTO v_pos FROM hoeren_exercises WHERE id = v_base;
  UPDATE hoeren_exercises SET position = position + 1 WHERE level = 'TELC_B2' AND teil = 2 AND position > v_pos;

  SELECT learning_aids INTO v_la FROM hoeren_exercises WHERE id = v_base;
  v_la := jsonb_set(v_la, '{items,50}', jsonb_build_object(
    'keyword', 'ausschließlich',
    'explanation_wrong', 'Achtung bei absoluten Wörtern wie „ausschließlich“: In dieser Fassung gilt die Aussage als richtig — das Angebot ist tatsächlich auf Kunden aus der eigenen Stadt beschränkt.',
    'explanation_correct', 'Achtung bei absoluten Wörtern wie „ausschließlich“: In dieser Fassung gilt die Aussage als richtig — das Angebot ist tatsächlich auf Kunden aus der eigenen Stadt beschränkt.'));

  INSERT INTO hoeren_exercises (title, teil, level, image_path, instructions, source_pdf, import_notes, position, version_tag, variant_group, audio_path, is_free_sample, is_hidden, learning_aids)
  SELECT 'Frau Eichhorn (معدل)', teil, level, image_path, instructions, 'telccfree.com (معدل variant)',
    'Variante (معدل) der vorhandenen Übung "Frau Eichhorn" (id 9d65952e-f768-446b-8719-94f3506d498f) von telccfree.com ("Frau Eichhorn 2", quiz/marktstand-eigenes-geschaeft.html) — 2026-10-07 auf Nutzerwunsch. Gleiche Aufnahme (telccfree: vom-marktstand-zum-eigenen-geschaeft.m4a; hier das vorhandene teil2/frau-eichhorn.m4a wiederverwendet) und gleiche 10 Aussagen 46–55 wie das Original. Lösungsschlüssel laut telccfree = Original bis auf Aussage 50 („…ausschließlich an Kunden aus der eigenen Stadt“): telccfree „richtig“, Original (PDF des Nutzers) „falsch“. Wie in der Quelle übernommen; Widerspruch ungeklärt — wartet auf Entscheidung/Audio-Prüfung durch den Nutzer.',
    v_pos + 1, 'معدل', 'Frau Eichhorn', audio_path, false, false, v_la
  FROM hoeren_exercises WHERE id = v_base
  RETURNING id INTO v_new;

  INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
  SELECT v_new, statement_number, statement_text, CASE WHEN statement_number = 50 THEN true ELSE correct_answer END
  FROM hoeren_statements WHERE exercise_id = v_base;
END
$mig$;

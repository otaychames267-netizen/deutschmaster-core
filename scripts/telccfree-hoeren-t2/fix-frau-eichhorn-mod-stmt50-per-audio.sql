-- B2 Hören Teil 2 "Frau Eichhorn (معدل)": statement 50 must be FALSCH (owner asked, 2026-10-07, for a decision verified by actually listening to the audio).
-- The stored recording (hoeren-audio/teil2/frau-eichhorn.m4a, transcribed with Groq Whisper large-v3) says at 5:14-5:40:
--   Q: "Richtet sich Ihr Angebot hauptsächlich an Menschen aus Ihrer eigenen Stadt?"
--   A: "... das Angebot richtet sich NICHT AUSSCHLIESSLICH an Menschen von hier. Viele Kunden kommen aus Nachbarorten ... Wir beliefern auch kleine Büros in der Umgebung ..."
-- => "Das Angebot des Geschäfts richtet sich ausschließlich an Kunden aus der eigenen Stadt" is falsch. This matches Aura's original "Frau Eichhorn" (which stays untouched).
-- telccfree's key (both of its Eichhorn pages) and the colour marking in the owner's PDF (page 2, statement 6 green) say richtig - both contradict this recording.
-- The variant was first imported with telccfree's key (richtig) -> this corrects only that new row (its statement + its learning-aid item + its notes).
DO $fix$
DECLARE
  v_base uuid := '9d65952e-f768-446b-8719-94f3506d498f';
  v_mod uuid;
BEGIN
  SELECT id INTO v_mod FROM hoeren_exercises WHERE title = 'Frau Eichhorn (معدل)' AND level = 'TELC_B2' AND teil = 2;
  IF v_mod IS NULL THEN RAISE EXCEPTION 'variant missing'; END IF;

  UPDATE hoeren_statements SET correct_answer = false WHERE exercise_id = v_mod AND statement_number = 50;

  UPDATE hoeren_exercises SET
    learning_aids = jsonb_set(learning_aids, '{items,50}', (SELECT learning_aids->'items'->'50' FROM hoeren_exercises WHERE id = v_base)),
    import_notes = 'Variante (معدل) der vorhandenen Übung "Frau Eichhorn" (id 9d65952e-f768-446b-8719-94f3506d498f) von telccfree.com ("Frau Eichhorn 2", quiz/marktstand-eigenes-geschaeft.html) — 2026-10-07 auf Nutzerwunsch. Gleiche Aufnahme (vorhandenes teil2/frau-eichhorn.m4a wiederverwendet) und gleiche 10 Aussagen 46–55 wie das Original. Lösungen anhand des Audios geprüft (Groq-Whisper-Transkript): alle 10 stimmen mit der Aufnahme überein. Aussage 50 = falsch, denn die Sprecherin sagt (5:19): „das Angebot richtet sich nicht ausschließlich an Menschen von hier“. Der Schlüssel von telccfree (richtig) und die Markierung im PDF des Nutzers (grün) widersprechen der Aufnahme und wurden hier NICHT übernommen. Aussage 51 (Zweifel an der Qualität) ist in der Aufnahme nicht ganz eindeutig („nicht unbedingt Misstrauen gegenüber der Qualität, sondern ob der Preis nachvollziehbar ist“) — alle drei Quellen sagen richtig, unverändert gelassen.'
  WHERE id = v_mod;
END
$fix$;

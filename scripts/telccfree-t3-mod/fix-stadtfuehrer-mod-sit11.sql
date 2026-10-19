-- Stadtführer (معدل), Situation 11 — owner approved 2026-10-09 ("yalla").
-- telccfree's wording says the woman "erhält bei dieser Aktivität Ermäßigungen", but NO ad (A-L) mentions a discount; only ad A (Kinder ab 8 Jahren) fits.
-- Reworded to what ad A really offers; answer key A unchanged. Touches: situation text, learning-aid paraphrase question, Arabic translation, import_notes.
DO $fix$
DECLARE v_id uuid := 'bf1a569a-bc92-410f-b958-c624854a62d1'; n int;
  v_de text := 'Eine Frau möchte mit ihrem 10-jährigen Sohn eine Aktivität durchführen, bei der es ein spezielles Angebot für Kinder gibt.';
  v_ar text := 'ترغب امرأة في القيام بنشاط مع ابنها البالغ من العمر 10 سنوات، ويكون فيه عرض خاص للأطفال.';
BEGIN
  UPDATE lesen_t3_situations SET description = v_de
   WHERE exercise_id = v_id AND number = 11 AND description LIKE '%Ermäßigungen%' AND correct_letter = 'A';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'situation 11 not found / already changed (%)', n; END IF;
  UPDATE lesen_exercises SET
    learning_aids = jsonb_set(jsonb_set(learning_aids, '{items,11,paraphrase,0,question}', to_jsonb(v_de)), '{translation,questions,11}', to_jsonb(v_ar)),
    import_notes = replace(import_notes,
      'Hinweis: Situation 11 nennt "Ermäßigungen", die in Anzeige A nicht vorkommen (so in der Quelle).',
      'Situation 11 am 2026-10-09 mit Zustimmung des Nutzers umformuliert: die Quelle nannte "Ermäßigungen", die in keiner Anzeige vorkommen; jetzt "spezielles Angebot für Kinder" (Schlüssel A unverändert).')
   WHERE id = v_id;
END $fix$;

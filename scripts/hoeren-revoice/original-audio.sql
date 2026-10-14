-- 2026-10-14 owner "yalla 1": Professor Steiner (Original) f760700a-1d89-427d-9f72-d78925c33240 gets the REAL recording ("Berufe heute", same file as Steiner (معدل), re-voiced) instead of the paraphrased
-- "Medienexperte" recording that did not match the telccfree/PDF key. Keys 51 and 53 go back to Richtig (= telccfree Original key FRFFFRFRRR, verified against the real audio).
-- ROLLBACK (the old audio file stays in the bucket):
--   update public.hoeren_exercises set audio_path = 'clean/teil2/professor-steiner-original.m4a' where id = 'f760700a-1d89-427d-9f72-d78925c33240';
--   then run the ROLLBACK of key-original.sql's inverse: set 51 + 53 to false (ids 675fb495-cd5a-4b0e-a4d8-15e9684098ad, 19abed7b-5d43-4b6c-84cd-7bd597d39920) and restore the previous explanations (see key-original.sql).
update public.hoeren_exercises set audio_path = 'voice2/teil2/steiner.m4a',
  import_notes = import_notes || E'\n\nAudio 2026-10-14: ersetzt durch die echte Aufnahme „Berufe heute“ (identisch mit Steiner (معدل)); die frühere Datei (clean/teil2/professor-steiner-original.m4a) war ein anderer, umformulierter Text. Schlüssel 51 und 53 = Richtig laut telccfree.com und Audio.'
 where id = 'f760700a-1d89-427d-9f72-d78925c33240' and audio_path = 'clean/teil2/professor-steiner-original.m4a';
update public.hoeren_statements set correct_answer = true
 where id in ('675fb495-cd5a-4b0e-a4d8-15e9684098ad','19abed7b-5d43-4b6c-84cd-7bd597d39920') and correct_answer = false;
update public.hoeren_exercises set learning_aids = jsonb_set(jsonb_set(learning_aids, '{items,51}',
  $j${"keyword":"Lust haben, etwas zu entdecken","explanation_wrong":"Diese Aussage ist Richtig. Steiner sagt: „Generell sollte ein Journalist von Neugier getrieben sein“ – Neugier bedeutet Lust, etwas zu entdecken.","explanation_correct":"Diese Aussage ist Richtig. Steiner sagt: „Generell sollte ein Journalist von Neugier getrieben sein“ – Neugier bedeutet Lust, etwas zu entdecken."}$j$::jsonb), '{items,53}',
  $j${"keyword":"während seines Journalistik-Studiums","explanation_wrong":"Diese Aussage ist Richtig. Achte auf die zeitliche Einordnung: Steiner sagt, dass ihm schon „während des Journalistikstudiums“ das Angebot vom ZDF kam, die Diskussionssendung „Doppelpunkt“ zu moderieren.","explanation_correct":"Diese Aussage ist Richtig. Achte auf die zeitliche Einordnung: Steiner sagt, dass ihm schon „während des Journalistikstudiums“ das Angebot vom ZDF kam, die Diskussionssendung „Doppelpunkt“ zu moderieren."}$j$::jsonb)
 where id = 'f760700a-1d89-427d-9f72-d78925c33240';

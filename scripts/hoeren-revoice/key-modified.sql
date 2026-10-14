-- 2026-10-14 owner "51 zeda m3adel": Steiner (معدل) fc06d9e6-75fa-45c3-b604-5360e2c0d5d5, statement 51 "Journalisten sollten Lust haben, etwas zu entdecken"
-- key Falsch -> Richtig (audio: "Generell sollte ein Journalist von Neugier getrieben sein, gleichzeitig diszipliniert und sorgfältig arbeiten ...").
-- ROLLBACK:
--   update public.hoeren_statements set correct_answer = false where id = '3132a254-38f2-4d83-bb3d-beef5ee8f012';
--   update public.hoeren_exercises set learning_aids = jsonb_set(learning_aids,'{items,51}',
--     '{"keyword":"etwas zu entdecken","explanation_wrong":"Allgemeine Charaktereigenschaften ohne enge Einschränkung wirken hier plausibel, aber prüfe genau die Formulierung im Hörtext. Diese Aussage ist Falsch.","explanation_correct":"Allgemeine Charaktereigenschaften ohne enge Einschränkung wirken hier plausibel, aber prüfe genau die Formulierung im Hörtext. Diese Aussage ist Falsch."}'::jsonb)
--     where id = 'fc06d9e6-75fa-45c3-b604-5360e2c0d5d5';
update public.hoeren_statements set correct_answer = true where id = '3132a254-38f2-4d83-bb3d-beef5ee8f012' and correct_answer = false;
update public.hoeren_exercises set learning_aids = jsonb_set(learning_aids, '{items,51}',
  $j${"keyword":"etwas zu entdecken","explanation_wrong":"Diese Aussage ist Richtig. Steiner sagt: „Generell sollte ein Journalist von Neugier getrieben sein“ – Neugier bedeutet Lust, etwas zu entdecken.","explanation_correct":"Diese Aussage ist Richtig. Steiner sagt: „Generell sollte ein Journalist von Neugier getrieben sein“ – Neugier bedeutet Lust, etwas zu entdecken."}$j$::jsonb)
 where id = 'fc06d9e6-75fa-45c3-b604-5360e2c0d5d5';

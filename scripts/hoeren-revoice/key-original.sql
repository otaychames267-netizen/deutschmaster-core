-- 2026-10-14 owner "badel original awalan": Professor Steiner (Original) f760700a-1d89-427d-9f72-d78925c33240 — audio vs key audit:
--   51 "Journalisten sollten Lust haben, etwas zu entdecken."  key Richtig -> Falsch (the audio never says this: Sprache, Recherche, kritisches Denken, Medienkompetenz, ethisches Bewusstsein)
--   53 "...für das ZDF-Fußballspiele moderiert."               key Richtig -> Falsch ("Während des Studiums habe ich kleinere Beiträge produziert. Moderiert habe ich erst später, nach dem Abschluss.")
-- ROLLBACK:
--   update public.hoeren_statements set correct_answer = true where id in ('675fb495-cd5a-4b0e-a4d8-15e9684098ad','19abed7b-5d43-4b6c-84cd-7bd597d39920');
--   update public.hoeren_exercises set learning_aids = jsonb_set(jsonb_set(learning_aids,'{items,51}',
--     '{"keyword":"Lust haben, etwas zu entdecken","explanation_wrong":"Diese Aussage ist Richtig. Achte auf genannte Charaktereigenschaften oder Motivationen, die als wichtige Voraussetzung beschrieben werden.","explanation_correct":"Diese Aussage ist Richtig. Achte auf genannte Charaktereigenschaften oder Motivationen, die als wichtige Voraussetzung beschrieben werden."}'::jsonb),'{items,53}',
--     '{"keyword":"während seines Journalistik-Studiums","explanation_wrong":"Diese Aussage ist Richtig. Achte auf die zeitliche Einordnung von Tätigkeiten, hier „während des Studiums“.","explanation_correct":"Diese Aussage ist Richtig. Achte auf die zeitliche Einordnung von Tätigkeiten, hier „während des Studiums“."}'::jsonb)
--     where id = 'f760700a-1d89-427d-9f72-d78925c33240';
update public.hoeren_statements set correct_answer = false
 where id in ('675fb495-cd5a-4b0e-a4d8-15e9684098ad','19abed7b-5d43-4b6c-84cd-7bd597d39920') and correct_answer = true;
update public.hoeren_exercises set learning_aids = jsonb_set(jsonb_set(learning_aids, '{items,51}',
  $j${"keyword":"Lust haben, etwas zu entdecken","explanation_wrong":"Diese Aussage ist Falsch. Im Interview werden Sprache, Recherche, kritisches Denken, Medienkompetenz und ethisches Bewusstsein als wichtige Fähigkeiten genannt – dass Journalisten „Lust haben sollen, etwas zu entdecken“, wird nicht gesagt.","explanation_correct":"Diese Aussage ist Falsch. Im Interview werden Sprache, Recherche, kritisches Denken, Medienkompetenz und ethisches Bewusstsein als wichtige Fähigkeiten genannt – dass Journalisten „Lust haben sollen, etwas zu entdecken“, wird nicht gesagt."}$j$::jsonb), '{items,53}',
  $j${"keyword":"während seines Journalistik-Studiums","explanation_wrong":"Diese Aussage ist Falsch. Während des Studiums hat Steiner nur kleinere Beiträge produziert – „Moderiert habe ich erst später, nach dem Abschluss.“","explanation_correct":"Diese Aussage ist Falsch. Während des Studiums hat Steiner nur kleinere Beiträge produziert – „Moderiert habe ich erst später, nach dem Abschluss.“"}$j$::jsonb)
 where id = 'f760700a-1d89-427d-9f72-d78925c33240';

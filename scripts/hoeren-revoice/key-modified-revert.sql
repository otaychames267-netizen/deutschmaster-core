-- 2026-10-14 owner listened to the ORIGINAL recording: the word before "getrieben" is NOT "Neugier" -> Steiner (معدل) statement 51 back to Falsch (= telccfree key), old explanation restored.
-- The re-voiced audio (voice2/teil2/steiner.m4a) says "Neugier" (my guess), so the modified exercise TEMPORARILY plays the old recording again (correct word, old voices) until the sentence is re-synthesized with the real word.
-- The Original exercise keeps voice2/teil2/steiner.m4a ("Neugier" = key Richtig per telccfree Original).
update public.hoeren_statements set correct_answer = false where id = '3132a254-38f2-4d83-bb3d-beef5ee8f012';
update public.hoeren_exercises set learning_aids = jsonb_set(learning_aids,'{items,51}',
  '{"keyword":"etwas zu entdecken","explanation_wrong":"Allgemeine Charaktereigenschaften ohne enge Einschränkung wirken hier plausibel, aber prüfe genau die Formulierung im Hörtext. Diese Aussage ist Falsch.","explanation_correct":"Allgemeine Charaktereigenschaften ohne enge Einschränkung wirken hier plausibel, aber prüfe genau die Formulierung im Hörtext. Diese Aussage ist Falsch."}'::jsonb),
  audio_path = 'clean/teil2/steiner.m4a'
 where id = 'fc06d9e6-75fa-45c3-b604-5360e2c0d5d5';

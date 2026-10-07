-- B2 Lesen Teil 3: add the two "(معدل)" (modified) variants that exist on telccfree.com but not in AuraLingovia (owner request 2026-10-07).
--   telccfree "Ausflug معدل"   -> Aura "Ausflug (معدل)"  (base = Aura "Ausflug")
--   telccfree "Schlafzug معدل" -> Aura "Berlin (معدل)"   (telccfree's "Schlafzug" is Aura's "Berlin": same answer key, 10/10 identical situations)
-- Content-checked first (normalized hashes, see scripts/telccfree-t3-mod/README.md): both variants keep the original's ads + answer letters;
-- Ausflug mod rewords situations 11 + 13, Berlin mod rewords all 10 situations. Ads are copied from the Aura original (telccfree's ads are
-- lightly re-typed copies with source typos). Insert-only; the only existing rows touched are sort_order shifts so each variant sits right
-- after its original. One transaction (DO block): either everything is added or nothing.

DO $mig$
DECLARE
  v_base_ausflug uuid := '6a704b65-49eb-4f66-8cde-bb712792a79c';
  v_base_berlin  uuid := 'b81efafd-83a3-4373-9c83-7b081ba8ce1f';
  v_new uuid;
  v_la jsonb;
  v_so int;
BEGIN
  IF EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 3 AND level = 'TELC_B2' AND title IN ('Ausflug (معدل)', 'Berlin (معدل)')) THEN
    RAISE EXCEPTION 'already imported';
  END IF;

  -- ===== 1) Ausflug (معدل) =====
  SELECT sort_order INTO v_so FROM lesen_exercises WHERE id = v_base_ausflug;
  UPDATE lesen_exercises SET sort_order = sort_order + 1 WHERE teil = 3 AND level = 'TELC_B2' AND sort_order > v_so;

  SELECT learning_aids INTO v_la FROM lesen_exercises WHERE id = v_base_ausflug;
  v_la := jsonb_set(v_la, '{translation,questions,11}', to_jsonb('ترغب في قضاء يوم يتضمن بعض النشاط والحركة.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,13}', to_jsonb('ابنك يريد إقامة حفلة ويحتاج إلى مساعدة.'::text));
  v_la := jsonb_set(v_la, '{items,13,explanation_correct}', to_jsonb('يوضح الإعلان (F) أنه خدمة كاملة لتنظيم حفلات الأطفال (ديكور، طعام، ألعاب) - يطابق حاجة من يريد تنظيم حفلة لابنه ويحتاج مساعدة.'::text));

  INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf, import_notes, created_by, sort_order, is_free_sample, is_hidden, learning_aids)
  SELECT 'Ausflug (معدل)', teil, level, difficulty, 'telccfree.com (معدل variant)',
    'Variante (معدل) der vorhandenen Übung "Ausflug" (id 6a704b65-49eb-4f66-8cde-bb712792a79c) von telccfree.com ("Ausflug معدل", quiz/ausflug-mod.html) — 2026-10-07 auf Nutzerwunsch. Die 12 Anzeigen, alle Lösungsbuchstaben und die learning_aids sind 1:1 aus dem Original übernommen; nur die Situationen 11 und 13 sind wie in der Quelle umformuliert. Der Wortlaut der Quelle ist bewusst unverändert (er enthält offensichtliche Tippfehler: "ein Tag machen", "Freier" statt "Feier"); Korrektur wartet auf Freigabe. Übersetzung und Erklärung zu Item 13 wurden an die neue Formulierung angepasst.',
    created_by, v_so + 1, false, false, v_la
  FROM lesen_exercises WHERE id = v_base_ausflug
  RETURNING id INTO v_new;

  INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
  SELECT v_new, letter, title, content FROM lesen_t3_texts WHERE exercise_id = v_base_ausflug;

  INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
  SELECT v_new, number,
    CASE number WHEN 11 THEN 'Sie möchten ein Tag machen und sich dabei bewegen.'
                WHEN 13 THEN 'Ihr Sohn möchte einen Freier und braucht Hilfe.'
                ELSE description END,
    correct_letter, no_match
  FROM lesen_t3_situations WHERE exercise_id = v_base_ausflug;

  -- ===== 2) Berlin (معدل) (telccfree "Schlafzug معدل") =====
  SELECT sort_order INTO v_so FROM lesen_exercises WHERE id = v_base_berlin;
  UPDATE lesen_exercises SET sort_order = sort_order + 1 WHERE teil = 3 AND level = 'TELC_B2' AND sort_order > v_so;

  INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf, import_notes, created_by, sort_order, is_free_sample, is_hidden, learning_aids)
  SELECT 'Berlin (معدل)', teil, level, difficulty, 'telccfree.com (معدل variant)',
    'Variante (معدل) der vorhandenen Übung "Berlin" (id b81efafd-83a3-4373-9c83-7b081ba8ce1f) von telccfree.com (dort unter dem Titel "Schlafzug معدل", quiz/schlafzug-mod.html) — 2026-10-07 auf Nutzerwunsch. Anzeigen A–L und Lösungsbuchstaben sind identisch mit dem Original (telccfree "Schlafzug" = Aura "Berlin", 10/10 Situationen gleich); alle 10 Situationen sind wie in der Quelle umformuliert (gleiche Bedeutung, gleiche Lösung). learning_aids und Übersetzungen unverändert aus dem Original übernommen.',
    created_by, v_so + 1, false, false, learning_aids
  FROM lesen_exercises WHERE id = v_base_berlin
  RETURNING id INTO v_new;

  INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
  SELECT v_new, letter, title, content FROM lesen_t3_texts WHERE exercise_id = v_base_berlin;

  INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
  SELECT v_new, number,
    CASE number
      WHEN 11 THEN 'Ein Bekannter hält sich einige Tage in Berlin auf und möchte in dieser Zeit verschiedene Kunstausstellungen besuchen.'
      WHEN 12 THEN 'Eine Freundin von mir wünscht sich, irgendwann selbst eine Rolle in einem Film zu spielen.'
      WHEN 13 THEN 'Ein Freund möchte sich gerne einen Dokumentarfilm über Tiere anschauen.'
      WHEN 14 THEN 'Eine Freundin sucht einen Nebenjob, bei dem sie gerne viel Zeit im Freien verbringen würde.'
      WHEN 15 THEN 'Ihr Cousin ist Student und möchte in den Sommermonaten einer Nebentätigkeit nachgehen.'
      WHEN 16 THEN 'Ihre Nichte ist acht Jahre alt, liebt Tiere und Natur, und deshalb möchten Sie ihr ein Buch zum Geburtstag geben.'
      WHEN 17 THEN 'Sie haben vor, eine besondere Stadtführung durch Berlin zu reservieren.'
      WHEN 18 THEN 'Sie planen, mit Ihren Freunden einen Film zu schauen, der gute Unterhaltung bietet.'
      WHEN 19 THEN 'Sie gehen auf eine Kostümfeier und suchen dafür ein geeignetes Kostüm.'
      WHEN 20 THEN 'Sie planen eine mehrtägige Städtereise mit Freunden und möchten dafür ein geeignetes Angebot finden.'
    END,
    correct_letter, no_match
  FROM lesen_t3_situations WHERE exercise_id = v_base_berlin;
END
$mig$;

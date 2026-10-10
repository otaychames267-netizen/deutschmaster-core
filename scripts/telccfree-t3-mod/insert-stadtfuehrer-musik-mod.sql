-- B2 Lesen Teil 3: add "Stadtführer (معدل)" and "Musik (معدل)" from telccfree.com (owner request 2026-10-07: "add them, if there is a change").
--   telccfree "Reiseführer 2" (quiz/reisefuehrer-2.html) = modified Stadtführer: 9/10 situations reworded + a different answer key (A K X X H X F X B L vs original A K D C X E X H F L).
--   telccfree "Musik (معدل)" (quiz/musik-mod.html): situations 11, 12, 13 reworded, same ads and same answer key as the original.
-- Content-checked first (normalized hashes, scripts/telccfree-t3-mod/README.md). Ads are copied from the Aura originals (telccfree re-typed them in its variants, adding typos).
-- Insert-only; sort_order of the rows behind each original is shifted +1 so a variant sits directly after its original. One DO block = one transaction.
DO $mig$
DECLARE
  v_base_stadt uuid := '7c655055-e1aa-479e-b923-0c9c36f97530';
  v_base_musik uuid := '5cfd305d-7639-442b-be91-8b920648deda';
  v_new uuid; v_la jsonb; v_items jsonb; v_so int; v_it jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 3 AND level = 'TELC_B2' AND title IN ('Stadtführer (معدل)', 'Musik (معدل)')) THEN
    RAISE EXCEPTION 'already imported';
  END IF;

  -- ===================== 1) Stadtführer (معدل) =====================
  SELECT sort_order INTO v_so FROM lesen_exercises WHERE id = v_base_stadt;
  UPDATE lesen_exercises SET sort_order = sort_order + 1 WHERE teil = 3 AND level = 'TELC_B2' AND sort_order > v_so;
  SELECT learning_aids INTO v_la FROM lesen_exercises WHERE id = v_base_stadt;

  v_items := jsonb_build_object(
    '11', jsonb_build_object(
      'keyword', 'Für Kinder ab 8 Jahren gibt es viel zu entdecken',
      'keywords', jsonb_build_array('Aktivität', 'Kind', 'Museum'),
      'paraphrase', jsonb_build_array(jsonb_build_object('text', 'Für Kinder ab 8 Jahren gibt es viel zu entdecken: Sie können die Ausstellung mithilfe eines Comics oder einer Museumsrallye erkunden.', 'question', 'Eine Frau möchte mit ihrem 10-jährigen Sohn eine Aktivität durchführen und erhält bei dieser Aktivität Ermäßigungen.')),
      'evidence_text', 'Für Kinder ab 8 Jahren gibt es viel zu entdecken: Sie können die Ausstellung mithilfe eines Comics oder einer Museumsrallye erkunden.',
      'explanation_correct', 'يوفر متحف ثقافة الاستحمام (A) أنشطة مخصصة للأطفال من عمر 8 سنوات فما فوق (قصة مصورة وجولة استكشافية) - وهو الإعلان الوحيد الذي يقدّم نشاطاً مناسباً لطفل عمره 10 سنوات.',
      'evidence_translation', 'للأطفال من عمر 8 سنوات فما فوق الكثير لاكتشافه: يمكنهم استكشاف المعرض بمساعدة قصة مصورة أو جولة استكشافية في المتحف.'),
    '12', jsonb_set(v_la->'items'->'12', '{paraphrase,0,question}', to_jsonb('Ihr Freund möchte als Stadtführer arbeiten und hat keine Erfahrungen.'::text)),
    '13', 'null'::jsonb,
    '14', 'null'::jsonb,
    '15', jsonb_build_object(
      'keyword', 'Sehen Sie eine andere Seite der Stadt',
      'keywords', jsonb_build_array('Urlaub', 'besondere Aktivitäten', 'Tour'),
      'paraphrase', jsonb_build_array(jsonb_build_object('text', 'Erleben Sie die Ewige Stadt nach Einbruch der Dunkelheit bei einer Besichtigungstour in einer kleinen Gruppe.', 'question', 'Sie möchten irgendwo einen Urlaub mit besonderen Aktivitäten verbringen.')),
      'evidence_text', 'Erleben Sie die Ewige Stadt nach Einbruch der Dunkelheit bei einer Besichtigungstour in einer kleinen Gruppe.',
      'explanation_wrong', 'احذر: الإعلان (G) أيضاً دليل سياحي لروما، لكنه كتاب يُقرأ للاستكشاف الذاتي وليس نشاطاً خاصاً يمكن المشاركة فيه كما في (H).',
      'explanation_correct', 'يقدّم الإعلان (H) جولة ليلية خاصة ومميزة في روما بمجموعة صغيرة (بيتزا، الكولوسيوم، إضاءة ليلية) - نشاط مميز يطابق الرغبة في قضاء عطلة بأنشطة خاصة.',
      'evidence_translation', 'عِش تجربة المدينة الخالدة بعد حلول الظلام في جولة سياحية بمجموعة صغيرة.'),
    '16', 'null'::jsonb,
    '17', jsonb_set(jsonb_set(jsonb_set(v_la->'items'->'19', '{paraphrase,0,question}', to_jsonb('Sie möchten wissen, wie man aus der Natur gewonnene Kosmetik zubereitet.'::text)),
              '{keywords}', jsonb_build_array('Naturkosmetik', 'Herstellung', 'Fabrik')),
              '{explanation_correct}', to_jsonb('يتيح الإعلان (F) جولة داخل مصنع Alpen-Naturkosmetik لمشاهدة المختبرات وخط الإنتاج حتى التعبئة - يطابق مباشرة رغبة معرفة كيف تُصنَّع مستحضرات التجميل الطبيعية.'::text)),
    '18', 'null'::jsonb,
    '19', jsonb_build_object(
      'keyword', 'Über 50 Musterbäder warten darauf, von Ihnen erkundet zu werden',
      'keywords', jsonb_build_array('Badezimmer', 'modern', 'Musterbäder'),
      'paraphrase', jsonb_build_array(jsonb_build_object('text', 'Über 50 Musterbäder warten darauf, von Ihnen erkundet zu werden.', 'question', 'Ihre Schwester erneuert ihr Badezimmer und sucht nach modernen Badezimmermodellen.')),
      'evidence_text', 'Über 50 Musterbäder warten darauf, von Ihnen erkundet zu werden. Besuchen Sie unsere Bäder- und Fliesenwelt und flanieren Sie in entspannter Atmosphäre durch unsere Schaubäder.',
      'explanation_wrong', 'احذر: الإعلان (E) كتاب عن الحمامات أيضاً (صور ومخططات)، لكنه كتاب للتصفح؛ أما «النماذج» (Musterbäder) فهي حمامات حقيقية معروضة في معرض (B).',
      'explanation_correct', 'يعرض الإعلان (B) أكثر من 50 حماماً نموذجياً (Musterbäder) في معرض - يطابق مباشرة بحث الأخت عن نماذج حمامات حديثة لتجديد حمامها.',
      'evidence_translation', 'أكثر من 50 حماماً نموذجياً في انتظار أن تكتشفوها. زوروا عالمنا للحمامات والبلاط وتجولوا في أجواء مريحة بين نماذج حماماتنا المعروضة.'),
    '20', jsonb_set(v_la->'items'->'20', '{paraphrase,0,question}', to_jsonb('Sie mögen leichte Unterhaltung und würden gerne mal wieder richtig lachen.'::text))
  );
  v_la := jsonb_set(v_la, '{items}', v_items);
  v_la := jsonb_set(v_la, '{translation,questions,11}', to_jsonb('ترغب امرأة في القيام بنشاط مع ابنها البالغ من العمر 10 سنوات، وتحصل خلال هذا النشاط على تخفيضات.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,12}', to_jsonb('يرغب صديقك في العمل كمرشد سياحي وليست لديه أي خبرة.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,13}', to_jsonb('يرغب أخوك في الاستماع إلى قصص تاريخية عن المدن.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,14}', to_jsonb('ترغب في قضاء عطلتك في برلين وتحتاج إلى مرشد سياحي.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,15}', to_jsonb('ترغب في قضاء عطلة في مكان ما مع أنشطة خاصة.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,16}', to_jsonb('ترغب عمتك/خالتك في زيارة أو مشاهدة أماكن ترفيه معروفة في روما.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,17}', to_jsonb('ترغب في معرفة كيفية تحضير مستحضرات التجميل المستخلصة من الطبيعة.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,18}', to_jsonb('صديقتك طاهية وتبحث عن عمل.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,19}', to_jsonb('تجدد أختك حمامها وتبحث عن نماذج حمامات عصرية.'::text));

  INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf, import_notes, created_by, sort_order, is_free_sample, is_hidden, learning_aids)
  SELECT 'Stadtführer (معدل)', teil, level, difficulty, 'telccfree.com (معدل variant)',
    'Variante (معدل) der vorhandenen Übung "Stadtführer" (id 7c655055-e1aa-479e-b923-0c9c36f97530) von telccfree.com (dort "Reiseführer 2", quiz/reisefuehrer-2.html) — 2026-10-07 auf Nutzerwunsch. Situationen 11–19 und Lösungsschlüssel (A K X X H X F X B L) wie in der Quelle, Situation 20 unverändert. Die Anzeigen A–L stammen aus dem Original (Aura-Fassung): telccfree hat sie in der Variante leicht umformuliert und neu abgetippt (dabei u. a. neue Tippfehler wie "Rumbelsheim"/"Fergens"), das wurde bewusst nicht übernommen. Hinweis: Situation 11 nennt "Ermäßigungen", die in Anzeige A nicht vorkommen (so in der Quelle). learning_aids zu den geänderten Zuordnungen (11, 12, 15, 17, 19, 20) neu bzw. angepasst geschrieben; Anzeigenübersetzungen aus dem Original.',
    created_by, v_so + 1, false, false, v_la
  FROM lesen_exercises WHERE id = v_base_stadt
  RETURNING id INTO v_new;

  INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
  SELECT v_new, letter, title, content FROM lesen_t3_texts WHERE exercise_id = v_base_stadt;

  INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
  VALUES
    (v_new, 11, 'Eine Frau möchte mit ihrem 10-jährigen Sohn eine Aktivität durchführen und erhält bei dieser Aktivität Ermäßigungen.', 'A', false),
    (v_new, 12, 'Ihr Freund möchte als Stadtführer arbeiten und hat keine Erfahrungen.', 'K', false),
    (v_new, 13, 'Ihr Bruder möchte etwas über historische Geschichten über Städte hören.', NULL, true),
    (v_new, 14, 'Sie möchten Ihren Urlaub in Berlin verbringen und benötigen einen Stadtführer.', NULL, true),
    (v_new, 15, 'Sie möchten irgendwo einen Urlaub mit besonderen Aktivitäten verbringen.', 'H', false),
    (v_new, 16, 'Ihre Tante möchte bekannte Unterhaltungsmöglichkeiten in Rom besuchen oder sehen.', NULL, true),
    (v_new, 17, 'Sie möchten wissen, wie man aus der Natur gewonnene Kosmetik zubereitet.', 'F', false),
    (v_new, 18, 'Ihre Bekannte ist Köchin und sucht einen Job.', NULL, true),
    (v_new, 19, 'Ihre Schwester erneuert ihr Badezimmer und sucht nach modernen Badezimmermodellen.', 'B', false),
    (v_new, 20, 'Sie mögen leichte Unterhaltung und würden gerne mal wieder richtig lachen.', 'L', false);

  -- ===================== 2) Musik (معدل) =====================
  SELECT sort_order INTO v_so FROM lesen_exercises WHERE id = v_base_musik;
  UPDATE lesen_exercises SET sort_order = sort_order + 1 WHERE teil = 3 AND level = 'TELC_B2' AND sort_order > v_so;
  SELECT learning_aids INTO v_la FROM lesen_exercises WHERE id = v_base_musik;

  v_it := jsonb_set(v_la->'items'->'11', '{paraphrase,0,question}', to_jsonb('Ein Bekannter 55 Jahre alt spielt Gitarre und möchte ein weiteres Instrument lernen.'::text));
  v_la := jsonb_set(v_la, '{items,11}', v_it);
  v_it := jsonb_set(jsonb_set(jsonb_set(v_la->'items'->'12', '{paraphrase,0,question}', to_jsonb('Ein Kollege möchte mit sechs Freunden eine mehrtägige Musikveranstaltung besuchen.'::text)),
            '{explanation_wrong}', to_jsonb('الإعلان F (رحلات موسيقية) يبدو مغريًا لأنه يتضمن لقاءات مع موسيقيين، لكنه يشترط عشرة مشاركين على الأقل، وهو عدد أكبر من مجموعتكم هنا (سبعة أشخاص).'::text)),
            '{explanation_correct}', to_jsonb('الإعلان C يقدّم رحلات جماعية بدءًا من خمسة أشخاص (مناسبة لزميلكم وأصدقائه الستة) إلى فعالية موسيقية تمتد عدة أيام مثل مهرجان الجاز.'::text));
  v_la := jsonb_set(v_la, '{items,12}', v_it);
  v_it := jsonb_set(jsonb_set(v_la->'items'->'13', '{paraphrase,0,question}', to_jsonb('Ein Bekannter hat bei der Veranstaltung Frankfurt gearbeitet und sucht eine andere Stelle in diesem Bereich.'::text)),
            '{explanation_correct}', to_jsonb('عمل زميلكم سابقًا في فعالية فرانكفورت ويبحث عن وظيفة أخرى في نفس المجال؛ الإعلان B يبحث تحديدًا عن موظفين لتنظيم المعارض والفعاليات (Messeorganisation und -durchführung).'::text));
  v_la := jsonb_set(v_la, '{items,13}', v_it);
  v_la := jsonb_set(v_la, '{translation,questions,11}', to_jsonb('يبلغ أحد المعارف 55 عامًا ويعزف الغيتار ويرغب في تعلم آلة موسيقية أخرى.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,12}', to_jsonb('يرغب أحد الزملاء في حضور فعالية موسيقية تستمر عدة أيام مع ستة من أصدقائه.'::text));
  v_la := jsonb_set(v_la, '{translation,questions,13}', to_jsonb('عمل أحد المعارف في فعالية فرانكفورت ويبحث عن وظيفة أخرى في هذا المجال.'::text));

  INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf, import_notes, created_by, sort_order, is_free_sample, is_hidden, learning_aids)
  SELECT 'Musik (معدل)', teil, level, difficulty, 'telccfree.com (معدل variant)',
    'Variante (معدل) der vorhandenen Übung "Musik" (id 5cfd305d-7639-442b-be91-8b920648deda) von telccfree.com (quiz/musik-mod.html) — 2026-10-07 auf Nutzerwunsch. Anzeigen und Lösungsbuchstaben identisch mit dem Original; nur die Situationen 11 ("55 Jahre alt"), 12 ("sechs Freunden") und 13 ("Veranstaltung Frankfurt" statt "Messe Frankfurt") sind wie in der Quelle geändert (Wortlaut der Quelle unverändert). learning_aids und Übersetzung zu 11–13 angepasst, der Rest aus dem Original.',
    created_by, v_so + 1, false, false, v_la
  FROM lesen_exercises WHERE id = v_base_musik
  RETURNING id INTO v_new;

  INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
  SELECT v_new, letter, title, content FROM lesen_t3_texts WHERE exercise_id = v_base_musik;

  INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
  SELECT v_new, number,
    CASE number WHEN 11 THEN 'Ein Bekannter 55 Jahre alt spielt Gitarre und möchte ein weiteres Instrument lernen.'
                WHEN 12 THEN 'Ein Kollege möchte mit sechs Freunden eine mehrtägige Musikveranstaltung besuchen.'
                WHEN 13 THEN 'Ein Bekannter hat bei der Veranstaltung Frankfurt gearbeitet und sucht eine andere Stelle in diesem Bereich.'
                ELSE description END,
    correct_letter, no_match
  FROM lesen_t3_situations WHERE exercise_id = v_base_musik;
END
$mig$;

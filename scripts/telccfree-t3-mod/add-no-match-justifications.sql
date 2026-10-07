-- B2 Lesen Teil 3: justifications (learning_aids.items) for the NO-MATCH (X) situations of today's three variants that lacked them
-- (owner: "add translation + justification for the ones we added today", 2026-10-07). Musik (معدل) already inherits its X items from the original.
-- Same shape as the existing X items: keyword, keywords (+ "kein Treffer"), explanation_correct in Arabic naming the closest trap ad.
-- Translations (ads A-L and situations 11-20) were already complete for all four variants (audited).
DO $j$
DECLARE
  v_ausflug uuid; v_berlin uuid; v_stadt uuid;
BEGIN
  SELECT id INTO v_ausflug FROM lesen_exercises WHERE teil = 3 AND level = 'TELC_B2' AND title = 'Ausflug (معدل)';
  SELECT id INTO v_berlin  FROM lesen_exercises WHERE teil = 3 AND level = 'TELC_B2' AND title = 'Berlin (معدل)';
  SELECT id INTO v_stadt   FROM lesen_exercises WHERE teil = 3 AND level = 'TELC_B2' AND title = 'Stadtführer (معدل)';
  IF v_ausflug IS NULL OR v_berlin IS NULL OR v_stadt IS NULL THEN RAISE EXCEPTION 'variant missing'; END IF;

  -- ---- Ausflug (معدل): 12, 17 ----
  UPDATE lesen_exercises SET learning_aids =
    jsonb_set(jsonb_set(learning_aids,
      '{items,12}', jsonb_build_object('keyword', 'Vortrag statt Hafenfahrt', 'keywords', jsonb_build_array('Hamburger Hafen', 'Fahrt buchen', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان يعرض رحلة (جولة) في ميناء هامبورغ؛ الإعلان (E) يتحدث عن ميناء هامبورغ لكنه محاضرة مدتها ساعتان عن أهميته الاقتصادية، وليس رحلة يمكن حجزها.')),
      '{items,17}', jsonb_build_object('keyword', 'Kochkurs statt Restaurant', 'keywords', jsonb_build_array('essen gehen', 'amerikanische Küche', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان عن مطعم أمريكي؛ الإعلان (G) عن الأكل الأمريكي (Hamburger & Co.) لكنه دورة طبخ لتعلّم تحضيره، وليس مطعماً يمكن الذهاب إليه لتناول الطعام مع صديقة.'))
  WHERE id = v_ausflug;

  -- ---- Berlin (معدل): 13, 16 ----
  UPDATE lesen_exercises SET learning_aids =
    jsonb_set(jsonb_set(learning_aids,
      '{items,13}', jsonb_build_object('keyword', 'kein Dokumentarfilm über Tiere', 'keywords', jsonb_build_array('Dokumentarfilm', 'Tiere', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان عن فيلم وثائقي عن الحيوانات؛ الإعلان (A) عن مهرجان أفلام لكن الفيلم المعروض كوميديا رومانسية، والإعلان (G) عن الحيوانات لكنه متحف للتاريخ الطبيعي وليس فيلماً.')),
      '{items,16}', jsonb_build_object('keyword', 'kein Buch über Tiere und Natur', 'keywords', jsonb_build_array('Buch', 'Tiere', 'Natur', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان عن كتاب للأطفال عن الحيوانات والطبيعة؛ الإعلان (B) كتاب لكنه عن تاريخ السينما، والإعلان (G) عن الحيوانات والطبيعة لكنه متحف وليس كتاباً يمكن إهداؤه.'))
  WHERE id = v_berlin;

  -- ---- Stadtführer (معدل): 13, 14, 16, 18 ----
  UPDATE lesen_exercises SET learning_aids =
    jsonb_set(jsonb_set(jsonb_set(jsonb_set(learning_aids,
      '{items,13}', jsonb_build_object('keyword', 'Geschichte des Essens ≠ Geschichte von Städten', 'keywords', jsonb_build_array('historische Geschichten', 'Städte', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان عن محاضرة أو حكايات تاريخية عن المدن؛ الإعلان (C) محاضرة تاريخية لكنها عن تاريخ الطعام (الحلويات) وليس عن المدن، والإعلان (J) معرض عن طعام الكلت والرومان.')),
      '{items,14}', jsonb_build_object('keyword', 'Stellenanzeige statt Stadtführung', 'keywords', jsonb_build_array('Urlaub in Berlin', 'Stadtführer', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان يعرض مرشداً أو جولة سياحية في برلين لمن يزورها؛ الإعلان (I) عن برلين لكنه إعلان توظيف: الشركة تبحث عن مرشدين سياحيين للعمل لديها، وليس خدمة موجهة لسائح.')),
      '{items,16}', jsonb_build_object('keyword', 'Sehenswürdigkeiten ≠ Unterhaltung', 'keywords', jsonb_build_array('Unterhaltungsmöglichkeiten', 'Rom', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان عن وسائل ترفيه (عروض، مسرح، حفلات) في روما؛ الإعلان (H) عن روما لكنه جولة لمشاهدة المعالم التاريخية، والإعلان (G) كتاب دليل سياحي وليس ترفيهاً.')),
      '{items,18}', jsonb_build_object('keyword', 'keine Stelle für Köche', 'keywords', jsonb_build_array('Köchin', 'Job', 'kein Treffer'),
        'explanation_correct', 'لا يوجد إعلان وظيفة لطاهية؛ الإعلان (I) عرض عمل لكنه لمرشدين سياحيين، والإعلان (L) عن الطهاة لكنه فيلم كوميدي وليس عرض عمل.'))
  WHERE id = v_stadt;
END
$j$;

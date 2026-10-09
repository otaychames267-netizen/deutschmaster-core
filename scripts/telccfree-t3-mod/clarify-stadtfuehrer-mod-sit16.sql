-- Stadtführer (معدل), Situation 16 (X) — owner 2026-10-09: keep the key, make the "Warum?" explicit.
-- The weak point was that H (Rom bei Nacht) could also be read as a match; the explanation now says why it is NOT (sights, not entertainment),
-- that H belongs to situation 15 and an ad can be used only once, and why G does not fit either.
DO $fix$
DECLARE n int;
BEGIN
  UPDATE lesen_exercises SET learning_aids = jsonb_set(learning_aids, '{items,16,explanation_correct}', to_jsonb(
    'لا يوجد إعلان يناسب «وسائل الترفيه» في روما، لذلك الجواب X. الإعلان (H) عن روما لكنه جولة لمشاهدة المعالم التاريخية (Sehenswürdigkeiten) وليس ترفيهاً؛ ثم إنّ (H) هو الجواب الصحيح للموقف 15 (عطلة بأنشطة خاصة)، وكل إعلان يُستعمل مرة واحدة فقط. أما الإعلان (G) فهو كتاب دليل سياحي للقراءة وليس مكاناً للترفيه.'::text))
   WHERE id = 'bf1a569a-bc92-410f-b958-c624854a62d1' AND learning_aids->'items'->'16'->>'keyword' = 'Sehenswürdigkeiten ≠ Unterhaltung';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'item 16 not found (%)', n; END IF;
END $fix$;

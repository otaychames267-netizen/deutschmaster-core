-- ─────────────────────────────────────────────────────────────────────────────
-- Server/admin variant of import_lesen_t2_exercise for the headless import
-- runner (scripts/import-lesen-t2.mjs), which executes via the Supabase
-- Management API as a privileged role with no auth.uid() / JWT context.
--
-- Identical validation (§21) and §17 duplicate-title auto-rename and atomicity
-- (§28) as the interactive RPC, but the admin user id is passed explicitly
-- instead of read from auth.uid(). Not granted to anon/authenticated — only the
-- trusted server runner calls it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION import_lesen_t2_exercise_admin(
  p_created_by UUID,
  p_title      TEXT,
  p_passage    TEXT,
  p_questions  JSONB,
  p_source_pdf TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base   TEXT;
  v_title  TEXT;
  v_n      INT  := 0;
  v_count  INT;
  v_q      JSONB;
  v_ex_id  UUID;
BEGIN
  IF p_passage IS NULL OR length(btrim(p_passage)) = 0 THEN
    RAISE EXCEPTION 'Passage is empty';
  END IF;

  v_count := COALESCE(jsonb_array_length(p_questions), 0);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No questions provided';
  END IF;

  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions) LOOP
    IF COALESCE(btrim(v_q->>'question'), '') = '' THEN RAISE EXCEPTION 'A question has empty text'; END IF;
    IF COALESCE(btrim(v_q->>'option_a'), '') = '' THEN RAISE EXCEPTION 'A question has an empty option a'; END IF;
    IF COALESCE(btrim(v_q->>'option_b'), '') = '' THEN RAISE EXCEPTION 'A question has an empty option b'; END IF;
    IF COALESCE(btrim(v_q->>'option_c'), '') = '' THEN RAISE EXCEPTION 'A question has an empty option c'; END IF;
    IF LOWER(COALESCE(v_q->>'correct', '')) NOT IN ('a','b','c') THEN RAISE EXCEPTION 'A question has an invalid answer key'; END IF;
  END LOOP;

  -- §17 title rule: keep empty if empty; auto-suffix duplicates
  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN
    v_title := '';
  ELSE
    v_title := v_base;
    WHILE EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 2 AND title = v_title) LOOP
      v_n := v_n + 1;
      v_title := v_base || ' ' || v_n;
    END LOOP;
  END IF;

  INSERT INTO lesen_exercises (title, teil, source_pdf, created_by)
  VALUES (v_title, 2, p_source_pdf, p_created_by)
  RETURNING id INTO v_ex_id;

  INSERT INTO lesen_t2_passages (exercise_id, title, instructions, passage)
  VALUES (v_ex_id, v_title, '', p_passage);

  INSERT INTO lesen_t2_questions (exercise_id, number, question, option_a, option_b, option_c, correct)
  SELECT v_ex_id,
         (q->>'number')::SMALLINT,
         q->>'question', q->>'option_a', q->>'option_b', q->>'option_c',
         LOWER(q->>'correct')
  FROM jsonb_array_elements(p_questions) q;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;

REVOKE EXECUTE ON FUNCTION import_lesen_t2_exercise_admin(UUID, TEXT, TEXT, JSONB, TEXT) FROM anon, authenticated;

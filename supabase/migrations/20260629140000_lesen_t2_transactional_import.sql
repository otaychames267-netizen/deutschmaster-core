-- ─────────────────────────────────────────────────────────────────────────────
-- Transactional, validated import for Lesen Teil 2 (Engineering Spec §17, §21,
-- §25, §28).
--
-- Replaces the previous client-side multi-insert (which could leave an orphaned
-- exercise row if a later insert failed). This single SECURITY DEFINER function:
--   * runs as one atomic transaction — all-or-nothing, no orphans (§28);
--   * validates completeness server-side — passage present, every question has
--     non-empty options and a valid answer key (§21, §25);
--   * applies the §17 title rule — an empty title stays empty (admin sets it
--     later), and duplicate printed titles are auto-suffixed
--     "Parkuhren" → "Parkuhren 1" → "Parkuhren 2" (never overwritten/merged).
--
-- Titles are NEVER invented here; the caller passes the printed title (or '').
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION import_lesen_t2_exercise(
  p_title      TEXT,
  p_passage    TEXT,
  p_questions  JSONB,            -- [{number,question,option_a,option_b,option_c,correct}]
  p_source_pdf TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID    := auth.uid();
  v_is_admin BOOLEAN;
  v_base     TEXT;
  v_title    TEXT;
  v_n        INT     := 0;
  v_count    INT;
  v_q        JSONB;
  v_ex_id    UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_uid AND role IN ('admin','super_admin','owner')
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- ── Completeness validation (§21 — never import incomplete) ──
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

  -- ── §17 title rule: keep empty if empty; auto-suffix duplicates ──
  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN
    v_title := '';                       -- leave empty; admin renames later
  ELSE
    v_title := v_base;
    WHILE EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 2 AND title = v_title) LOOP
      v_n := v_n + 1;
      v_title := v_base || ' ' || v_n;   -- "Parkuhren" → "Parkuhren 1" → "Parkuhren 2"
    END LOOP;
  END IF;

  -- ── Atomic insert (function body is one transaction) ──
  INSERT INTO lesen_exercises (title, teil, source_pdf, created_by)
  VALUES (v_title, 2, p_source_pdf, v_uid)
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

GRANT EXECUTE  ON FUNCTION import_lesen_t2_exercise(TEXT, TEXT, JSONB, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION import_lesen_t2_exercise(TEXT, TEXT, JSONB, TEXT) FROM anon;

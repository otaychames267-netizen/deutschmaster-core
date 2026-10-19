-- ─────────────────────────────────────────────────────────────────────────────
-- Manual admin "add exercise" capability, requested by the user 2026-07-27:
-- "full capability to manually add or insert whatever exercises I want
-- directly ... from the system/admin side" for every Teil across Lesen,
-- Hören, and Sprachbausteine.
--
-- Six atomic, fully-validated SECURITY DEFINER functions — one per exercise
-- shape (Hören is schema-identical across all 3 Teile, so one function
-- covers it; Lesen and Sprachbausteine each have a genuinely different shape
-- per Teil). Mirrors the exact validation/atomicity/§17-title-dedup style
-- already established by import_lesen_t1_exercise_admin (20260630120000) and
-- import_lesen_t2_exercise_admin (20260629160000) — same engineering bar,
-- extended with p_level (every existing Lesen import path silently omits
-- this and defaults to TELC_B2 — a real gap) and p_import_notes (so the
-- Tunisia-notice flag, or any other note, can be set at creation time by the
-- calling server function rather than needing a follow-up UPDATE).
--
-- service_role-only (REVOKE ... FROM anon, authenticated, matching the
-- existing *_admin functions) — called exclusively from
-- src/lib/admin/exercise-create.functions.ts, which does its own
-- requireSupabaseAuth + assertAdmin check in TS before calling via the
-- service-role supabaseAdmin client. The admin check is NOT duplicated here
-- in SQL for the same reason content.functions.ts doesn't duplicate it —
-- single source of truth for "is this caller an admin" stays in TS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Lesen Teil 1 ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_lesen_t1_exercise(
  p_created_by   UUID,
  p_title        TEXT,
  p_level        TEXT,
  p_import_notes TEXT,
  p_headlines    JSONB,   -- [{letter, text, is_distractor}] (10, A–J)
  p_texts        JSONB    -- [{position, title, content, correct_headline}] (5)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT; v_title TEXT; v_n INT := 0;
  v_h JSONB; v_t JSONB; v_letter TEXT;
  v_distractor_count INT; v_correct_count INT;
  v_ex_id UUID; v_letters TEXT[]; v_sort_order INT;
BEGIN
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level: %', p_level; END IF;

  IF COALESCE(jsonb_array_length(p_headlines), 0) <> 10 THEN
    RAISE EXCEPTION 'Expected 10 headlines, got %', COALESCE(jsonb_array_length(p_headlines), 0);
  END IF;
  v_letters := '{}'; v_distractor_count := 0;
  FOR v_h IN SELECT * FROM jsonb_array_elements(p_headlines) LOOP
    v_letter := UPPER(COALESCE(v_h->>'letter', ''));
    IF v_letter !~ '^[A-J]$' THEN RAISE EXCEPTION 'Invalid headline letter: %', v_letter; END IF;
    IF v_letter = ANY(v_letters) THEN RAISE EXCEPTION 'Duplicate headline letter: %', v_letter; END IF;
    IF COALESCE(btrim(v_h->>'text'), '') = '' THEN RAISE EXCEPTION 'Headline % has empty text', v_letter; END IF;
    v_letters := array_append(v_letters, v_letter);
    IF COALESCE((v_h->>'is_distractor')::BOOLEAN, FALSE) THEN v_distractor_count := v_distractor_count + 1; END IF;
  END LOOP;
  IF v_distractor_count <> 5 THEN RAISE EXCEPTION 'Expected 5 distractor headlines, got %', v_distractor_count; END IF;

  IF COALESCE(jsonb_array_length(p_texts), 0) <> 5 THEN
    RAISE EXCEPTION 'Expected 5 texts, got %', COALESCE(jsonb_array_length(p_texts), 0);
  END IF;
  FOR v_t IN SELECT * FROM jsonb_array_elements(p_texts) LOOP
    IF (v_t->>'position')::INT NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Invalid text position'; END IF;
    IF COALESCE(btrim(v_t->>'content'), '') = '' THEN RAISE EXCEPTION 'Text % has empty content', v_t->>'position'; END IF;
    v_letter := UPPER(COALESCE(v_t->>'correct_headline', ''));
    IF v_letter !~ '^[A-J]$' THEN RAISE EXCEPTION 'Text % has invalid correct_headline', v_t->>'position'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_headlines) h
      WHERE UPPER(h->>'letter') = v_letter AND NOT COALESCE((h->>'is_distractor')::BOOLEAN, FALSE)
    ) THEN RAISE EXCEPTION 'Text % correct_headline % is not a valid (non-distractor) headline', v_t->>'position', v_letter; END IF;
  END LOOP;
  SELECT COUNT(DISTINCT UPPER(t->>'correct_headline')) INTO v_correct_count FROM jsonb_array_elements(p_texts) t;
  IF v_correct_count <> 5 THEN RAISE EXCEPTION 'Texts must map to 5 distinct headlines, got %', v_correct_count; END IF;

  -- §17 title rule (matches import_lesen_t1_exercise_admin): blank titles are
  -- allowed and stay blank (PDF extraction often can't find a printed title);
  -- only non-blank titles get duplicate-suffix auto-numbering.
  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN
    v_title := '';
  ELSE
    v_title := v_base;
    WHILE EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 1 AND level = p_level AND title = v_title) LOOP
      v_n := v_n + 1;
      v_title := v_base || ' ' || v_n;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order FROM lesen_exercises WHERE teil = 1 AND level = p_level;

  INSERT INTO lesen_exercises (title, teil, level, source_pdf, import_notes, created_by, sort_order)
  VALUES (v_title, 1, p_level, NULL, p_import_notes, p_created_by, v_sort_order)
  RETURNING id INTO v_ex_id;

  INSERT INTO lesen_t1_headlines (exercise_id, letter, text, is_distractor)
  SELECT v_ex_id, UPPER(h->>'letter'), h->>'text', COALESCE((h->>'is_distractor')::BOOLEAN, FALSE)
  FROM jsonb_array_elements(p_headlines) h;

  INSERT INTO lesen_t1_texts (exercise_id, position, title, content, correct_headline)
  SELECT v_ex_id, (t->>'position')::SMALLINT, NULLIF(btrim(COALESCE(t->>'title','')),''), t->>'content', UPPER(t->>'correct_headline')
  FROM jsonb_array_elements(p_texts) t;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_lesen_t1_exercise(UUID, TEXT, TEXT, TEXT, JSONB, JSONB) FROM anon, authenticated;

-- ── 2. Lesen Teil 2 ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_lesen_t2_exercise(
  p_created_by   UUID,
  p_title        TEXT,
  p_level        TEXT,
  p_import_notes TEXT,
  p_passage      TEXT,
  p_questions    JSONB    -- [{number, question, option_a, option_b, option_c, correct}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT; v_title TEXT; v_n INT := 0; v_count INT; v_q JSONB; v_ex_id UUID; v_sort_order INT;
BEGIN
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level: %', p_level; END IF;
  IF p_passage IS NULL OR length(btrim(p_passage)) = 0 THEN RAISE EXCEPTION 'Passage is empty'; END IF;

  v_count := COALESCE(jsonb_array_length(p_questions), 0);
  IF v_count = 0 THEN RAISE EXCEPTION 'No questions provided'; END IF;
  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions) LOOP
    IF COALESCE(btrim(v_q->>'question'), '') = '' THEN RAISE EXCEPTION 'A question has empty text'; END IF;
    IF COALESCE(btrim(v_q->>'option_a'), '') = '' THEN RAISE EXCEPTION 'A question has an empty option a'; END IF;
    IF COALESCE(btrim(v_q->>'option_b'), '') = '' THEN RAISE EXCEPTION 'A question has an empty option b'; END IF;
    IF COALESCE(btrim(v_q->>'option_c'), '') = '' THEN RAISE EXCEPTION 'A question has an empty option c'; END IF;
    IF LOWER(COALESCE(v_q->>'correct', '')) NOT IN ('a','b','c') THEN RAISE EXCEPTION 'A question has an invalid answer key'; END IF;
  END LOOP;

  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN
    v_title := '';
  ELSE
    v_title := v_base;
    WHILE EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 2 AND level = p_level AND title = v_title) LOOP
      v_n := v_n + 1;
      v_title := v_base || ' ' || v_n;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order FROM lesen_exercises WHERE teil = 2 AND level = p_level;

  INSERT INTO lesen_exercises (title, teil, level, source_pdf, import_notes, created_by, sort_order)
  VALUES (v_title, 2, p_level, NULL, p_import_notes, p_created_by, v_sort_order)
  RETURNING id INTO v_ex_id;

  INSERT INTO lesen_t2_passages (exercise_id, title, instructions, passage)
  VALUES (v_ex_id, v_title, '', p_passage);

  INSERT INTO lesen_t2_questions (exercise_id, number, question, option_a, option_b, option_c, correct)
  SELECT v_ex_id, (q->>'number')::SMALLINT, q->>'question', q->>'option_a', q->>'option_b', q->>'option_c', LOWER(q->>'correct')
  FROM jsonb_array_elements(p_questions) q;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_lesen_t2_exercise(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon, authenticated;

-- ── 3. Lesen Teil 3 ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_lesen_t3_exercise(
  p_created_by   UUID,
  p_title        TEXT,
  p_level        TEXT,
  p_import_notes TEXT,
  p_texts        JSONB,   -- [{letter, title, content}]
  p_situations   JSONB    -- [{number, description, correct_letter, no_match}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT; v_title TEXT; v_n INT := 0; v_ex_id UUID; v_sort_order INT;
  v_t JSONB; v_s JSONB; v_letter TEXT; v_letters TEXT[];
BEGIN
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level: %', p_level; END IF;
  IF COALESCE(jsonb_array_length(p_texts), 0) < 1 THEN RAISE EXCEPTION 'At least one ad/text is required'; END IF;
  IF COALESCE(jsonb_array_length(p_situations), 0) < 1 THEN RAISE EXCEPTION 'At least one situation is required'; END IF;

  v_letters := '{}';
  FOR v_t IN SELECT * FROM jsonb_array_elements(p_texts) LOOP
    v_letter := UPPER(COALESCE(v_t->>'letter', ''));
    IF v_letter !~ '^[A-Z]$' THEN RAISE EXCEPTION 'Invalid ad letter: %', v_letter; END IF;
    IF v_letter = ANY(v_letters) THEN RAISE EXCEPTION 'Duplicate ad letter: %', v_letter; END IF;
    IF COALESCE(btrim(v_t->>'content'), '') = '' THEN RAISE EXCEPTION 'Ad % has empty content', v_letter; END IF;
    v_letters := array_append(v_letters, v_letter);
  END LOOP;

  FOR v_s IN SELECT * FROM jsonb_array_elements(p_situations) LOOP
    IF COALESCE(btrim(v_s->>'description'), '') = '' THEN RAISE EXCEPTION 'A situation has empty description'; END IF;
    IF COALESCE((v_s->>'no_match')::BOOLEAN, FALSE) THEN
      CONTINUE; -- correct_letter not required when no_match
    END IF;
    v_letter := UPPER(COALESCE(v_s->>'correct_letter', ''));
    IF v_letter = '' OR NOT (v_letter = ANY(v_letters)) THEN
      RAISE EXCEPTION 'Situation % has correct_letter % that does not match any ad letter', v_s->>'number', v_letter;
    END IF;
  END LOOP;

  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN
    v_title := '';
  ELSE
    v_title := v_base;
    WHILE EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 3 AND level = p_level AND title = v_title) LOOP
      v_n := v_n + 1;
      v_title := v_base || ' ' || v_n;
    END LOOP;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order FROM lesen_exercises WHERE teil = 3 AND level = p_level;

  INSERT INTO lesen_exercises (title, teil, level, source_pdf, import_notes, created_by, sort_order)
  VALUES (v_title, 3, p_level, NULL, p_import_notes, p_created_by, v_sort_order)
  RETURNING id INTO v_ex_id;

  INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
  SELECT v_ex_id, UPPER(t->>'letter'), NULLIF(btrim(COALESCE(t->>'title','')),''), t->>'content'
  FROM jsonb_array_elements(p_texts) t;

  INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
  SELECT v_ex_id, (s->>'number')::SMALLINT, s->>'description',
         CASE WHEN COALESCE((s->>'no_match')::BOOLEAN, FALSE) THEN NULL ELSE UPPER(s->>'correct_letter') END,
         COALESCE((s->>'no_match')::BOOLEAN, FALSE)
  FROM jsonb_array_elements(p_situations) s;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_lesen_t3_exercise(UUID, TEXT, TEXT, TEXT, JSONB, JSONB) FROM anon, authenticated;

-- ── 4. Hören (shared across Teil 1/2/3) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_hoeren_exercise(
  p_created_by   UUID,
  p_title        TEXT,
  p_teil         SMALLINT,
  p_level        TEXT,
  p_import_notes TEXT,
  p_instructions TEXT,
  p_image_path   TEXT,
  p_audio_path   TEXT,
  p_statements   JSONB   -- [{statement_number, statement_text, correct_answer}] (5)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT; v_title TEXT; v_n INT := 0; v_ex_id UUID; v_position INT;
  v_s JSONB; v_numbers INT[];
BEGIN
  IF p_teil NOT IN (1, 2, 3) THEN RAISE EXCEPTION 'Invalid teil: %', p_teil; END IF;
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level: %', p_level; END IF;
  IF COALESCE(jsonb_array_length(p_statements), 0) <> 5 THEN
    RAISE EXCEPTION 'Expected 5 statements, got %', COALESCE(jsonb_array_length(p_statements), 0);
  END IF;

  v_numbers := '{}';
  FOR v_s IN SELECT * FROM jsonb_array_elements(p_statements) LOOP
    IF COALESCE(btrim(v_s->>'statement_text'), '') = '' THEN RAISE EXCEPTION 'A statement has empty text'; END IF;
    IF v_s->>'correct_answer' IS NULL THEN RAISE EXCEPTION 'A statement is missing correct_answer'; END IF;
    IF (v_s->>'statement_number')::INT = ANY(v_numbers) THEN RAISE EXCEPTION 'Duplicate statement_number: %', v_s->>'statement_number'; END IF;
    v_numbers := array_append(v_numbers, (v_s->>'statement_number')::INT);
  END LOOP;

  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN RAISE EXCEPTION 'Title is required'; END IF;
  v_title := v_base;
  WHILE EXISTS (SELECT 1 FROM hoeren_exercises WHERE teil = p_teil AND level = p_level AND title = v_title) LOOP
    v_n := v_n + 1;
    v_title := v_base || ' ' || v_n;
  END LOOP;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position FROM hoeren_exercises WHERE teil = p_teil AND level = p_level;

  INSERT INTO hoeren_exercises (title, teil, level, image_path, instructions, source_pdf, import_notes, position, audio_path, created_by)
  VALUES (v_title, p_teil, p_level, NULLIF(p_image_path, ''), NULLIF(p_instructions, ''), NULL, p_import_notes, v_position, NULLIF(p_audio_path, ''), p_created_by)
  RETURNING id INTO v_ex_id;

  INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
  SELECT v_ex_id, (s->>'statement_number')::SMALLINT, s->>'statement_text', (s->>'correct_answer')::BOOLEAN
  FROM jsonb_array_elements(p_statements) s;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_hoeren_exercise(UUID, TEXT, SMALLINT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon, authenticated;

-- ── 5. Sprachbausteine Teil 1 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_sb_t1_exercise(
  p_created_by   UUID,
  p_title        TEXT,
  p_level        TEXT,
  p_import_notes TEXT,
  p_passage      TEXT,
  p_instructions TEXT,
  p_gaps         JSONB   -- [{gap_number, option_a, option_b, option_c, correct}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT; v_title TEXT; v_n INT := 0; v_ex_id UUID; v_position INT;
  v_g JSONB; v_numbers INT[];
BEGIN
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level: %', p_level; END IF;
  IF p_passage IS NULL OR length(btrim(p_passage)) = 0 THEN RAISE EXCEPTION 'Passage is empty'; END IF;
  IF COALESCE(jsonb_array_length(p_gaps), 0) < 1 THEN RAISE EXCEPTION 'At least one gap is required'; END IF;

  v_numbers := '{}';
  FOR v_g IN SELECT * FROM jsonb_array_elements(p_gaps) LOOP
    IF COALESCE(btrim(v_g->>'option_a'), '') = '' THEN RAISE EXCEPTION 'A gap has an empty option a'; END IF;
    IF COALESCE(btrim(v_g->>'option_b'), '') = '' THEN RAISE EXCEPTION 'A gap has an empty option b'; END IF;
    IF COALESCE(btrim(v_g->>'option_c'), '') = '' THEN RAISE EXCEPTION 'A gap has an empty option c'; END IF;
    IF LOWER(COALESCE(v_g->>'correct', '')) NOT IN ('a','b','c') THEN RAISE EXCEPTION 'A gap has an invalid answer key'; END IF;
    IF (v_g->>'gap_number')::INT = ANY(v_numbers) THEN RAISE EXCEPTION 'Duplicate gap_number: %', v_g->>'gap_number'; END IF;
    v_numbers := array_append(v_numbers, (v_g->>'gap_number')::INT);
  END LOOP;

  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN RAISE EXCEPTION 'Title is required'; END IF;
  v_title := v_base;
  WHILE EXISTS (SELECT 1 FROM sb_exercises WHERE teil = 1 AND level = p_level AND title = v_title) LOOP
    v_n := v_n + 1;
    v_title := v_base || ' ' || v_n;
  END LOOP;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position FROM sb_exercises WHERE teil = 1 AND level = p_level;

  INSERT INTO sb_exercises (title, teil, level, source_pdf, import_notes, created_by, position)
  VALUES (v_title, 1, p_level, NULL, p_import_notes, p_created_by, v_position)
  RETURNING id INTO v_ex_id;

  INSERT INTO sb_t1_passages (exercise_id, title, instructions, passage)
  VALUES (v_ex_id, v_title, NULLIF(p_instructions, ''), p_passage);

  INSERT INTO sb_t1_gaps (exercise_id, gap_number, option_a, option_b, option_c, correct)
  SELECT v_ex_id, (g->>'gap_number')::SMALLINT, g->>'option_a', g->>'option_b', g->>'option_c', LOWER(g->>'correct')
  FROM jsonb_array_elements(p_gaps) g;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_sb_t1_exercise(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon, authenticated;

-- ── 6. Sprachbausteine Teil 2 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_sb_t2_exercise(
  p_created_by   UUID,
  p_title        TEXT,
  p_level        TEXT,
  p_import_notes TEXT,
  p_passage      TEXT,
  p_instructions TEXT,
  p_words        JSONB,  -- [{word_number, word}]
  p_gaps         JSONB   -- [{gap_number, correct_word}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base TEXT; v_title TEXT; v_n INT := 0; v_ex_id UUID; v_position INT;
  v_w JSONB; v_g JSONB; v_words TEXT[]; v_wnumbers INT[]; v_gnumbers INT[];
BEGIN
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN RAISE EXCEPTION 'Invalid level: %', p_level; END IF;
  IF p_passage IS NULL OR length(btrim(p_passage)) = 0 THEN RAISE EXCEPTION 'Passage is empty'; END IF;
  IF COALESCE(jsonb_array_length(p_words), 0) < 1 THEN RAISE EXCEPTION 'At least one word is required'; END IF;
  IF COALESCE(jsonb_array_length(p_gaps), 0) < 1 THEN RAISE EXCEPTION 'At least one gap is required'; END IF;

  v_words := '{}'; v_wnumbers := '{}';
  FOR v_w IN SELECT * FROM jsonb_array_elements(p_words) LOOP
    IF COALESCE(btrim(v_w->>'word'), '') = '' THEN RAISE EXCEPTION 'A word entry is empty'; END IF;
    IF (v_w->>'word_number')::INT = ANY(v_wnumbers) THEN RAISE EXCEPTION 'Duplicate word_number: %', v_w->>'word_number'; END IF;
    v_wnumbers := array_append(v_wnumbers, (v_w->>'word_number')::INT);
    v_words := array_append(v_words, btrim(v_w->>'word'));
  END LOOP;

  v_gnumbers := '{}';
  FOR v_g IN SELECT * FROM jsonb_array_elements(p_gaps) LOOP
    IF COALESCE(btrim(v_g->>'correct_word'), '') = '' THEN RAISE EXCEPTION 'A gap has an empty correct_word'; END IF;
    IF NOT (btrim(v_g->>'correct_word') = ANY(v_words)) THEN
      RAISE EXCEPTION 'Gap % correct_word "%" does not match any word in the word bank', v_g->>'gap_number', v_g->>'correct_word';
    END IF;
    IF (v_g->>'gap_number')::INT = ANY(v_gnumbers) THEN RAISE EXCEPTION 'Duplicate gap_number: %', v_g->>'gap_number'; END IF;
    v_gnumbers := array_append(v_gnumbers, (v_g->>'gap_number')::INT);
  END LOOP;

  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN RAISE EXCEPTION 'Title is required'; END IF;
  v_title := v_base;
  WHILE EXISTS (SELECT 1 FROM sb_exercises WHERE teil = 2 AND level = p_level AND title = v_title) LOOP
    v_n := v_n + 1;
    v_title := v_base || ' ' || v_n;
  END LOOP;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position FROM sb_exercises WHERE teil = 2 AND level = p_level;

  INSERT INTO sb_exercises (title, teil, level, source_pdf, import_notes, created_by, position)
  VALUES (v_title, 2, p_level, NULL, p_import_notes, p_created_by, v_position)
  RETURNING id INTO v_ex_id;

  INSERT INTO sb_t2_passages (exercise_id, title, instructions, passage)
  VALUES (v_ex_id, v_title, NULLIF(p_instructions, ''), p_passage);

  INSERT INTO sb_t2_words (exercise_id, word_number, word)
  SELECT v_ex_id, (w->>'word_number')::SMALLINT, btrim(w->>'word')
  FROM jsonb_array_elements(p_words) w;

  INSERT INTO sb_t2_gaps (exercise_id, gap_number, correct_word)
  SELECT v_ex_id, (g->>'gap_number')::SMALLINT, btrim(g->>'correct_word')
  FROM jsonb_array_elements(p_gaps) g;

  RETURN jsonb_build_object('exercise_id', v_ex_id, 'title', v_title);
END;
$$;
REVOKE EXECUTE ON FUNCTION admin_create_sb_t2_exercise(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM anon, authenticated;

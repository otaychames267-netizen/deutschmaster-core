-- ─────────────────────────────────────────────────────────────────────────────
-- Transactional, validated admin import for Lesen Teil 1 (Spec §17/§21/§25/§28).
--
-- Teil 1 = 5 texts (positions 1–5) matched to 10 headlines (A–J); exactly 5
-- headlines are correct (one per text) and 5 are distractors. Same engineering
-- standards as the Teil 2 importer: one atomic SECURITY DEFINER function, full
-- server-side validation, §17 empty/duplicate-title handling, no auth.uid()
-- (the headless runner passes created_by and calls via the Management API).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION import_lesen_t1_exercise_admin(
  p_created_by UUID,
  p_title      TEXT,
  p_headlines  JSONB,            -- [{letter, text, is_distractor}]  (10, A–J)
  p_texts      JSONB,            -- [{position, title, content, correct_headline}] (5)
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
  v_h      JSONB;
  v_t      JSONB;
  v_letter TEXT;
  v_correct_count INT;
  v_distractor_count INT;
  v_ex_id  UUID;
  v_letters TEXT[];
BEGIN
  -- ── Validate headlines: exactly 10, letters A–J unique, non-empty text ──
  IF COALESCE(jsonb_array_length(p_headlines), 0) <> 10 THEN
    RAISE EXCEPTION 'Expected 10 headlines, got %', COALESCE(jsonb_array_length(p_headlines), 0);
  END IF;
  v_letters := '{}';
  v_distractor_count := 0;
  FOR v_h IN SELECT * FROM jsonb_array_elements(p_headlines) LOOP
    v_letter := UPPER(COALESCE(v_h->>'letter', ''));
    IF v_letter !~ '^[A-J]$' THEN RAISE EXCEPTION 'Invalid headline letter: %', v_letter; END IF;
    IF v_letter = ANY(v_letters) THEN RAISE EXCEPTION 'Duplicate headline letter: %', v_letter; END IF;
    IF COALESCE(btrim(v_h->>'text'), '') = '' THEN RAISE EXCEPTION 'Headline % has empty text', v_letter; END IF;
    v_letters := array_append(v_letters, v_letter);
    IF COALESCE((v_h->>'is_distractor')::BOOLEAN, FALSE) THEN v_distractor_count := v_distractor_count + 1; END IF;
  END LOOP;
  IF v_distractor_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 distractor headlines, got %', v_distractor_count;
  END IF;

  -- ── Validate texts: exactly 5, positions 1–5, correct_headline A–J non-distractor ──
  IF COALESCE(jsonb_array_length(p_texts), 0) <> 5 THEN
    RAISE EXCEPTION 'Expected 5 texts, got %', COALESCE(jsonb_array_length(p_texts), 0);
  END IF;
  FOR v_t IN SELECT * FROM jsonb_array_elements(p_texts) LOOP
    IF (v_t->>'position')::INT NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Invalid text position'; END IF;
    IF COALESCE(btrim(v_t->>'content'), '') = '' THEN RAISE EXCEPTION 'Text % has empty content', v_t->>'position'; END IF;
    v_letter := UPPER(COALESCE(v_t->>'correct_headline', ''));
    IF v_letter !~ '^[A-J]$' THEN RAISE EXCEPTION 'Text % has invalid correct_headline', v_t->>'position'; END IF;
    -- correct_headline must reference a non-distractor headline
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_headlines) h
      WHERE UPPER(h->>'letter') = v_letter AND NOT COALESCE((h->>'is_distractor')::BOOLEAN, FALSE)
    ) THEN
      RAISE EXCEPTION 'Text % correct_headline % is not a valid (non-distractor) headline', v_t->>'position', v_letter;
    END IF;
  END LOOP;

  -- The 5 texts must map to 5 DISTINCT correct headlines (one each)
  SELECT COUNT(DISTINCT UPPER(t->>'correct_headline')) INTO v_correct_count
  FROM jsonb_array_elements(p_texts) t;
  IF v_correct_count <> 5 THEN
    RAISE EXCEPTION 'Texts must map to 5 distinct headlines, got %', v_correct_count;
  END IF;

  -- ── §17 title rule ──
  v_base := NULLIF(btrim(COALESCE(p_title, '')), '');
  IF v_base IS NULL THEN
    v_title := '';
  ELSE
    v_title := v_base;
    WHILE EXISTS (SELECT 1 FROM lesen_exercises WHERE teil = 1 AND title = v_title) LOOP
      v_n := v_n + 1;
      v_title := v_base || ' ' || v_n;
    END LOOP;
  END IF;

  -- ── Atomic insert ──
  INSERT INTO lesen_exercises (title, teil, source_pdf, created_by)
  VALUES (v_title, 1, p_source_pdf, p_created_by)
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

REVOKE EXECUTE ON FUNCTION import_lesen_t1_exercise_admin(UUID, TEXT, JSONB, JSONB, TEXT) FROM anon, authenticated;

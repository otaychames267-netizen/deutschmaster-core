-- ─────────────────────────────────────────────────────────────────────────────
-- Promotion RPC (Milestone 4)
--
-- Transactionally promotes APPROVED Lesen Teil 2 drafts from the staging layer
-- into the live tables (lesen_exercises / lesen_t2_passages / lesen_t2_questions).
-- Admin-only. Idempotent: drafts already promoted (promoted_exercise_id set) are
-- skipped. Duplicate printed titles within the batch are numbered (… 1, … 2).
--
-- Nothing here promotes pending/rejected drafts — only status='approved'.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION promote_lesen_t2_drafts(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_src text;
  d record;
  v_id uuid;
  v_title text;
  v_count int := 0;
  v_ids uuid[] := '{}';
  q jsonb;
  v_correct text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT source_pdf INTO v_src FROM import_batches WHERE id = p_batch_id;

  FOR d IN
    SELECT de.*,
           row_number() OVER (PARTITION BY lower(trim(de.raw_title)) ORDER BY de.idx) AS ver,
           count(*)     OVER (PARTITION BY lower(trim(de.raw_title)))                  AS cnt
    FROM import_draft_exercises de
    WHERE de.batch_id = p_batch_id
      AND de.status = 'approved'
      AND de.promoted_exercise_id IS NULL
      AND de.teil = 2
    ORDER BY de.idx
  LOOP
    IF d.title IS NULL OR length(trim(d.title)) = 0 THEN CONTINUE; END IF;
    v_title := CASE WHEN d.cnt > 1 THEN d.title || ' ' || d.ver ELSE d.title END;

    INSERT INTO lesen_exercises (title, teil, created_by, source_pdf)
      VALUES (v_title, 2, auth.uid(), v_src)
      RETURNING id INTO v_id;

    INSERT INTO lesen_t2_passages (exercise_id, title, passage)
      VALUES (v_id, v_title, d.article);

    FOR q IN SELECT * FROM jsonb_array_elements(d.payload->'questions') LOOP
      SELECT (elem->>'answer') INTO v_correct
        FROM jsonb_array_elements(d.payload->'answer_key') elem
        WHERE (elem->>'number')::int = (q->>'number')::int
        LIMIT 1;
      INSERT INTO lesen_t2_questions (exercise_id, number, question, option_a, option_b, option_c, correct)
        VALUES (v_id, (q->>'number')::int, q->>'text', q->>'option_a', q->>'option_b', q->>'option_c', lower(v_correct));
    END LOOP;

    UPDATE import_draft_exercises SET promoted_exercise_id = v_id WHERE id = d.id;
    v_count := v_count + 1;
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  UPDATE import_batches
    SET status = CASE WHEN EXISTS (
      SELECT 1 FROM import_draft_exercises WHERE batch_id = p_batch_id AND status = 'approved' AND promoted_exercise_id IS NULL
    ) THEN 'partially_committed' ELSE 'committed' END
    WHERE id = p_batch_id;

  RETURN jsonb_build_object('promoted', v_count, 'exercise_ids', to_jsonb(v_ids));
END;
$$;

GRANT EXECUTE ON FUNCTION promote_lesen_t2_drafts(uuid) TO authenticated;

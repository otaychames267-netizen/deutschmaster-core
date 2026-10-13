-- score_and_save_lesen_t1 — scores Lesen Teil 1 server-side from the official
-- answer key AND records the attempt in lesen_attempts (durable history /
-- statistics), mirroring score_and_save_lesen_t2. The `correct_headline` never
-- leaves the server.
CREATE OR REPLACE FUNCTION score_and_save_lesen_t1(
  p_exercise_id UUID,
  p_answers     JSONB           -- { "1": "A", "2": "C", ... } text position → chosen headline
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_results JSONB := '[]'::JSONB;
  v_score  INT := 0;
  v_total  INT := 0;
  v_t      RECORD;
  v_chosen TEXT;
  v_ok     BOOLEAN;
  v_attempt UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  FOR v_t IN SELECT position, correct_headline FROM lesen_t1_texts WHERE exercise_id = p_exercise_id ORDER BY position LOOP
    v_total := v_total + 1;
    v_chosen := p_answers ->> v_t.position::TEXT;
    v_ok := (UPPER(COALESCE(v_chosen,'')) = UPPER(v_t.correct_headline));
    IF v_ok THEN v_score := v_score + 1; END IF;
    v_results := v_results || jsonb_build_object(
      'position', v_t.position,
      'correct', v_ok,
      'your_answer', COALESCE(v_chosen,''),
      'correct_answer', CASE WHEN v_ok THEN v_chosen ELSE v_t.correct_headline END
    );
  END LOOP;

  INSERT INTO lesen_attempts (user_id, exercise_id, teil, score, total, answers, results)
  VALUES (v_uid, p_exercise_id, 1, v_score, v_total, p_answers, v_results)
  RETURNING id INTO v_attempt;

  RETURN jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results, 'attempt_id', v_attempt);
END;
$$;
GRANT EXECUTE ON FUNCTION score_and_save_lesen_t1(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION score_and_save_lesen_t1(UUID, JSONB) FROM anon;

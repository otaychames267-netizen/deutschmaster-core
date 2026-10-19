-- Backfill of the per-Teil scoring (migration 20261006250000) for simulation attempts finished BEFORE the fix (owner: "yalla", 2026-10-08).
-- Re-scores every submitted attempt that has no teil_scores yet from its stored answers + exercise ids, with the same functions the live scoring uses
-- (score_lesen_t1/t2/t3, score_sb_t1/t2 under a staff identity; Hören counted directly = what score_and_save_hoeren counts, without writing hoeren_attempts rows).
-- Sets score_lesen / score_sb / score_hoeren / teil_scores, recomputes score_total (+ Schreiben as already stored) and passed (>= 135).
-- section_results / answers / essay data are untouched. Uses the CURRENT answer keys (a key fixed since the attempt is therefore reflected).
-- v_apply = false -> dry run: rolls back and reports the effect in the error message; set it to true to write.
DO $bf$
DECLARE
  v_apply constant boolean := false;
  r record; v_staff uuid; v_res jsonb; ts jsonb; v_l numeric; v_s numeric; v_h numeric; pts numeric; c int; n int; v_tot numeric; v_pass boolean;
  n_att int := 0; n_flip_up int := 0; n_flip_down int := 0; sum_old numeric := 0; sum_new numeric := 0; n_noschr int := 0;
BEGIN
  SELECT u.id INTO v_staff FROM auth.users u WHERE public.is_d17_staff(u.id) LIMIT 1;
  IF v_staff IS NULL THEN RAISE EXCEPTION 'no staff user'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_staff)::text, true);

  FOR r IN SELECT * FROM simulation_attempts WHERE status = 'submitted' AND score_lesen IS NOT NULL AND teil_scores IS NULL ORDER BY started_at LOOP
    ts := '{}'::jsonb; v_l := 0; v_s := 0; v_h := 0;

    v_res := score_lesen_t1(r.lesen_t1_id, COALESCE(r.answers->'lesen_t1', '{}'::jsonb)); c := (v_res->>'score')::int; n := (v_res->>'total')::int; pts := sim_teil_points(c, n, 25); v_l := v_l + pts;
    ts := ts || jsonb_build_object('lesen_t1', jsonb_build_object('points', pts, 'max', 25, 'correct', c, 'items', n));
    v_res := score_lesen_t2(r.lesen_t2_id, COALESCE(r.answers->'lesen_t2', '{}'::jsonb)); c := (v_res->>'score')::int; n := (v_res->>'total')::int; pts := sim_teil_points(c, n, 25); v_l := v_l + pts;
    ts := ts || jsonb_build_object('lesen_t2', jsonb_build_object('points', pts, 'max', 25, 'correct', c, 'items', n));
    v_res := score_lesen_t3(r.lesen_t3_id, COALESCE(r.answers->'lesen_t3', '{}'::jsonb)); c := (v_res->>'score')::int; n := (v_res->>'total')::int; pts := sim_teil_points(c, n, 25); v_l := v_l + pts;
    ts := ts || jsonb_build_object('lesen_t3', jsonb_build_object('points', pts, 'max', 25, 'correct', c, 'items', n));

    v_res := score_sb_t1(r.sb_t1_id, COALESCE(r.answers->'sb_t1', '{}'::jsonb)); c := (v_res->>'score')::int; n := (v_res->>'total')::int; pts := sim_teil_points(c, n, 15); v_s := v_s + pts;
    ts := ts || jsonb_build_object('sb_t1', jsonb_build_object('points', pts, 'max', 15, 'correct', c, 'items', n));
    v_res := score_sb_t2(r.sb_t2_id, COALESCE(r.answers->'sb_t2', '{}'::jsonb)); c := (v_res->>'score')::int; n := (v_res->>'total')::int; pts := sim_teil_points(c, n, 15); v_s := v_s + pts;
    ts := ts || jsonb_build_object('sb_t2', jsonb_build_object('points', pts, 'max', 15, 'correct', c, 'items', n));

    SELECT count(*) FILTER (WHERE (r.answers->'hoeren_t1'->>(statement_number::text))::boolean = correct_answer), count(*) INTO c, n FROM hoeren_statements WHERE exercise_id = r.hoeren_t1_id;
    pts := sim_teil_points(c, n, 25); v_h := v_h + pts; ts := ts || jsonb_build_object('hoeren_t1', jsonb_build_object('points', pts, 'max', 25, 'correct', c, 'items', n));
    SELECT count(*) FILTER (WHERE (r.answers->'hoeren_t2'->>(statement_number::text))::boolean = correct_answer), count(*) INTO c, n FROM hoeren_statements WHERE exercise_id = r.hoeren_t2_id;
    pts := sim_teil_points(c, n, 25); v_h := v_h + pts; ts := ts || jsonb_build_object('hoeren_t2', jsonb_build_object('points', pts, 'max', 25, 'correct', c, 'items', n));
    SELECT count(*) FILTER (WHERE (r.answers->'hoeren_t3'->>(statement_number::text))::boolean = correct_answer), count(*) INTO c, n FROM hoeren_statements WHERE exercise_id = r.hoeren_t3_id;
    pts := sim_teil_points(c, n, 25); v_h := v_h + pts; ts := ts || jsonb_build_object('hoeren_t3', jsonb_build_object('points', pts, 'max', 25, 'correct', c, 'items', n));

    n_att := n_att + 1;
    IF r.score_schreiben IS NULL THEN
      n_noschr := n_noschr + 1; v_tot := r.score_total; v_pass := r.passed;
    ELSE
      v_tot := v_l + v_s + v_h + r.score_schreiben; v_pass := v_tot >= 135;
    END IF;
    sum_old := sum_old + COALESCE(r.score_total, 0); sum_new := sum_new + COALESCE(v_tot, 0);
    IF COALESCE(r.passed, false) = false AND v_pass THEN n_flip_up := n_flip_up + 1; END IF;
    IF COALESCE(r.passed, false) = true AND NOT v_pass THEN n_flip_down := n_flip_down + 1; END IF;

    IF v_apply THEN
      UPDATE simulation_attempts SET score_lesen = v_l, score_sb = v_s, score_hoeren = v_h, teil_scores = ts, score_total = v_tot, passed = v_pass WHERE id = r.id;
    END IF;
  END LOOP;

  IF NOT v_apply THEN
    RAISE EXCEPTION 'DRY-RUN attempts=% | passed false->true=% | passed true->false=% | avg total old=% new=% | without Schreiben score=%',
      n_att, n_flip_up, n_flip_down, round(sum_old / greatest(n_att, 1), 1), round(sum_new / greatest(n_att, 1), 1), n_noschr;
  END IF;
END
$bf$;

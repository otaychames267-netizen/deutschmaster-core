-- Prüfungssimulation: score every Teil out of its own fixed maximum (telc B2 scheme), not one pooled scale per skill.
--
-- BUG: score_simulation_sections pooled ALL questions of a skill and scaled the raw count to 75 (Lesen / Hören), so every
-- question was worth 75 / (total questions). B2 Lesen has 5 + 5 + 10 questions and Hören 5 + 10 + 5, i.e. 20 each, so every
-- question was worth 3.75 points. In the real exam each Teil is worth 25 points (Lesen T1 5 x 5, T2 5 x 5, T3 10 x 2.5;
-- Hören T1 5 x 5, T2 10 x 2.5, T3 5 x 5). Example of the error: all of Lesen T1 + T2 right and T3 wrong = 50/75 in the
-- real exam, but 37.5 -> 38/75 in the old simulation. Sprachbausteine was not affected (10 + 10 gaps = 15 + 15).
--
-- FIX: each Teil = ROUND(correct * max / items * 2) / 2 (telc awards half points), the skill score is the sum of its Teile.
-- Because half points exist, score_lesen/score_sb/score_hoeren/score_total become numeric(5,1). The per-Teil points are also
-- stored (teil_scores) so the results screen can show "Teil 1 .. / 25". Earlier attempts keep the scores they were given.

ALTER TABLE public.simulation_attempts
  ALTER COLUMN score_lesen TYPE numeric(5,1),
  ALTER COLUMN score_sb TYPE numeric(5,1),
  ALTER COLUMN score_hoeren TYPE numeric(5,1),
  ALTER COLUMN score_total TYPE numeric(5,1);

ALTER TABLE public.simulation_attempts ADD COLUMN IF NOT EXISTS teil_scores jsonb;

CREATE OR REPLACE FUNCTION public.sim_teil_points(p_correct int, p_items int, p_max numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT CASE WHEN p_items > 0 THEN ROUND(p_correct * p_max / p_items * 2) / 2 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.score_simulation_sections(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.simulation_attempts%ROWTYPE;
  v_lesen numeric := 0; v_sb numeric := 0; v_hoeren numeric := 0;
  v_pts numeric; v_correct int; v_items int;
  v_res jsonb;
  v_section_results jsonb := '{}'::jsonb;
  v_teil_scores jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO v_row FROM public.simulation_attempts WHERE id = p_attempt_id;
  IF v_row.user_id IS NULL OR v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_row.status <> 'in_progress' THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_IN_PROGRESS';
  END IF;

  -- Lesen: 3 Teile x 25
  v_res := score_lesen_t1(v_row.lesen_t1_id, COALESCE(v_row.answers->'lesen_t1', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 25);
  v_lesen := v_lesen + v_pts;
  v_section_results := v_section_results || jsonb_build_object('lesen_t1', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('lesen_t1', jsonb_build_object('points', v_pts, 'max', 25, 'correct', v_correct, 'items', v_items));

  v_res := score_lesen_t2(v_row.lesen_t2_id, COALESCE(v_row.answers->'lesen_t2', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 25);
  v_lesen := v_lesen + v_pts;
  v_section_results := v_section_results || jsonb_build_object('lesen_t2', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('lesen_t2', jsonb_build_object('points', v_pts, 'max', 25, 'correct', v_correct, 'items', v_items));

  v_res := score_lesen_t3(v_row.lesen_t3_id, COALESCE(v_row.answers->'lesen_t3', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 25);
  v_lesen := v_lesen + v_pts;
  v_section_results := v_section_results || jsonb_build_object('lesen_t3', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('lesen_t3', jsonb_build_object('points', v_pts, 'max', 25, 'correct', v_correct, 'items', v_items));

  -- Sprachbausteine: 2 Teile x 15
  v_res := score_sb_t1(v_row.sb_t1_id, COALESCE(v_row.answers->'sb_t1', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 15);
  v_sb := v_sb + v_pts;
  v_section_results := v_section_results || jsonb_build_object('sb_t1', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('sb_t1', jsonb_build_object('points', v_pts, 'max', 15, 'correct', v_correct, 'items', v_items));

  v_res := score_sb_t2(v_row.sb_t2_id, COALESCE(v_row.answers->'sb_t2', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 15);
  v_sb := v_sb + v_pts;
  v_section_results := v_section_results || jsonb_build_object('sb_t2', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('sb_t2', jsonb_build_object('points', v_pts, 'max', 15, 'correct', v_correct, 'items', v_items));

  -- Hören: 3 Teile x 25. score_and_save_hoeren also inserts an hoeren_attempts row (same durable history table real Hören
  -- practice uses) — a deliberate, harmless side effect, not worked around.
  v_res := score_and_save_hoeren(v_row.hoeren_t1_id, COALESCE(v_row.answers->'hoeren_t1', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 25);
  v_hoeren := v_hoeren + v_pts;
  v_section_results := v_section_results || jsonb_build_object('hoeren_t1', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('hoeren_t1', jsonb_build_object('points', v_pts, 'max', 25, 'correct', v_correct, 'items', v_items));

  v_res := score_and_save_hoeren(v_row.hoeren_t2_id, COALESCE(v_row.answers->'hoeren_t2', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 25);
  v_hoeren := v_hoeren + v_pts;
  v_section_results := v_section_results || jsonb_build_object('hoeren_t2', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('hoeren_t2', jsonb_build_object('points', v_pts, 'max', 25, 'correct', v_correct, 'items', v_items));

  v_res := score_and_save_hoeren(v_row.hoeren_t3_id, COALESCE(v_row.answers->'hoeren_t3', '{}'::jsonb));
  v_correct := (v_res->>'score')::int; v_items := (v_res->>'total')::int; v_pts := sim_teil_points(v_correct, v_items, 25);
  v_hoeren := v_hoeren + v_pts;
  v_section_results := v_section_results || jsonb_build_object('hoeren_t3', v_res->'results');
  v_teil_scores := v_teil_scores || jsonb_build_object('hoeren_t3', jsonb_build_object('points', v_pts, 'max', 25, 'correct', v_correct, 'items', v_items));

  UPDATE public.simulation_attempts SET
    score_lesen = v_lesen, score_sb = v_sb, score_hoeren = v_hoeren,
    section_results = v_section_results, teil_scores = v_teil_scores
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score_lesen', v_lesen, 'score_sb', v_sb, 'score_hoeren', v_hoeren, 'teil_scores', v_teil_scores);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_simulation(p_attempt_id uuid, p_score_schreiben integer, p_essay_grading_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.simulation_attempts%ROWTYPE;
  v_total numeric;
  v_passed boolean;
BEGIN
  SELECT * INTO v_row FROM public.simulation_attempts WHERE id = p_attempt_id;
  IF v_row.user_id IS NULL OR v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_row.status <> 'in_progress' THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_IN_PROGRESS';
  END IF;
  IF v_row.score_lesen IS NULL OR v_row.score_sb IS NULL OR v_row.score_hoeren IS NULL THEN
    RAISE EXCEPTION 'OBJECTIVE_SECTIONS_NOT_SCORED';
  END IF;
  IF p_score_schreiben < 0 OR p_score_schreiben > 45 THEN
    RAISE EXCEPTION 'Invalid Schreiben score';
  END IF;
  IF p_essay_grading_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.essay_gradings WHERE id = p_essay_grading_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Invalid essay_grading_id';
  END IF;

  v_total := v_row.score_lesen + v_row.score_sb + v_row.score_hoeren + p_score_schreiben;
  v_passed := v_total >= 135; -- 60% of 225, same threshold convention used everywhere else in this app

  UPDATE public.simulation_attempts SET
    score_schreiben = p_score_schreiben,
    essay_grading_id = p_essay_grading_id,
    score_total = v_total,
    passed = v_passed,
    status = 'submitted',
    submitted_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'score_lesen', v_row.score_lesen, 'score_sb', v_row.score_sb, 'score_hoeren', v_row.score_hoeren,
    'score_schreiben', p_score_schreiben, 'score_total', v_total, 'passed', v_passed,
    'teil_scores', v_row.teil_scores
  );
END;
$function$;

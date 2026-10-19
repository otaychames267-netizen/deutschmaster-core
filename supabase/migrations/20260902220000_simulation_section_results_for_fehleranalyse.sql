-- Foundation for the Prüfungssimulation "Fehleranalyse" (Arabic mistake
-- analysis) feature: score_simulation_sections already calls
-- score_lesen_t1/t2/t3 and score_sb_t1/t2 (which return a full per-question
-- `results` array, each item carrying that question's `learning_aids` --
-- already authored in professional Arabic, see sb_exercises/lesen_exercises
-- .learning_aids) plus score_and_save_hoeren for the three Hoeren sections --
-- but it only ever kept `.score`/`.total` and threw the `results` arrays
-- away. This migration captures them into a new `section_results` column so
-- the results screen can render a real per-question review (correct
-- answer / your answer / why) without any extra round-trip and, for
-- Hoeren specifically, without re-calling the SAVING variant a second time
-- (which would insert a duplicate hoeren_attempts row on every results-page
-- view).
--
-- section_results shape: {"lesen_t1": [...], "lesen_t2": [...],
-- "lesen_t3": [...], "sb_t1": [...], "sb_t2": [...], "hoeren_t1": [...],
-- "hoeren_t2": [...], "hoeren_t3": [...]} -- each array is exactly what the
-- underlying score_* RPC already returns as `results`, snapshotted once at
-- scoring time (an honest historical record, immune to later admin edits
-- to the exercise's own learning_aids/answer key).

ALTER TABLE public.simulation_attempts ADD COLUMN IF NOT EXISTS section_results jsonb;

CREATE OR REPLACE FUNCTION public.score_simulation_sections(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.simulation_attempts%ROWTYPE;
  v_lesen_raw int := 0; v_lesen_total int := 0;
  v_sb_raw int := 0; v_sb_total int := 0;
  v_hoeren_raw int := 0; v_hoeren_total int := 0;
  v_lesen_pts int; v_sb_pts int; v_hoeren_pts int;
  v_res jsonb;
  v_section_results jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO v_row FROM public.simulation_attempts WHERE id = p_attempt_id;
  IF v_row.user_id IS NULL OR v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_row.status <> 'in_progress' THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_IN_PROGRESS';
  END IF;

  v_res := score_lesen_t1(v_row.lesen_t1_id, COALESCE(v_row.answers->'lesen_t1', '{}'::jsonb));
  v_lesen_raw := v_lesen_raw + (v_res->>'score')::int; v_lesen_total := v_lesen_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('lesen_t1', v_res->'results');

  v_res := score_lesen_t2(v_row.lesen_t2_id, COALESCE(v_row.answers->'lesen_t2', '{}'::jsonb));
  v_lesen_raw := v_lesen_raw + (v_res->>'score')::int; v_lesen_total := v_lesen_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('lesen_t2', v_res->'results');

  v_res := score_lesen_t3(v_row.lesen_t3_id, COALESCE(v_row.answers->'lesen_t3', '{}'::jsonb));
  v_lesen_raw := v_lesen_raw + (v_res->>'score')::int; v_lesen_total := v_lesen_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('lesen_t3', v_res->'results');

  v_res := score_sb_t1(v_row.sb_t1_id, COALESCE(v_row.answers->'sb_t1', '{}'::jsonb));
  v_sb_raw := v_sb_raw + (v_res->>'score')::int; v_sb_total := v_sb_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('sb_t1', v_res->'results');

  v_res := score_sb_t2(v_row.sb_t2_id, COALESCE(v_row.answers->'sb_t2', '{}'::jsonb));
  v_sb_raw := v_sb_raw + (v_res->>'score')::int; v_sb_total := v_sb_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('sb_t2', v_res->'results');

  -- score_and_save_hoeren also inserts an hoeren_attempts row (same durable
  -- history table real Hören practice uses) — a deliberate, harmless side
  -- effect, not worked around.
  v_res := score_and_save_hoeren(v_row.hoeren_t1_id, COALESCE(v_row.answers->'hoeren_t1', '{}'::jsonb));
  v_hoeren_raw := v_hoeren_raw + (v_res->>'score')::int; v_hoeren_total := v_hoeren_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('hoeren_t1', v_res->'results');

  v_res := score_and_save_hoeren(v_row.hoeren_t2_id, COALESCE(v_row.answers->'hoeren_t2', '{}'::jsonb));
  v_hoeren_raw := v_hoeren_raw + (v_res->>'score')::int; v_hoeren_total := v_hoeren_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('hoeren_t2', v_res->'results');

  v_res := score_and_save_hoeren(v_row.hoeren_t3_id, COALESCE(v_row.answers->'hoeren_t3', '{}'::jsonb));
  v_hoeren_raw := v_hoeren_raw + (v_res->>'score')::int; v_hoeren_total := v_hoeren_total + (v_res->>'total')::int;
  v_section_results := v_section_results || jsonb_build_object('hoeren_t3', v_res->'results');

  v_lesen_pts  := CASE WHEN v_lesen_total  > 0 THEN ROUND(v_lesen_raw  * 75.0 / v_lesen_total)  ELSE 0 END;
  v_sb_pts     := CASE WHEN v_sb_total     > 0 THEN ROUND(v_sb_raw     * 30.0 / v_sb_total)     ELSE 0 END;
  v_hoeren_pts := CASE WHEN v_hoeren_total > 0 THEN ROUND(v_hoeren_raw * 75.0 / v_hoeren_total) ELSE 0 END;

  UPDATE public.simulation_attempts SET
    score_lesen = v_lesen_pts, score_sb = v_sb_pts, score_hoeren = v_hoeren_pts,
    section_results = v_section_results
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score_lesen', v_lesen_pts, 'score_sb', v_sb_pts, 'score_hoeren', v_hoeren_pts);
END;
$function$;

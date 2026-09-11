-- Prüfungssimulation flagship rebuild: schema + RPCs.
--
-- One row per full timed exam attempt. The 9 exercise-id columns are picked
-- once at start (start_simulation) and never change afterward — this is what
-- makes "no duplicated reading texts / listening tasks / questions within one
-- exam" trivially true (one exercise per Teil) and "no duplicated content
-- across repeat attempts" achievable (start_simulation excludes every id the
-- user has ever been assigned before, falling back to the full pool only once
-- a Teil's history is exhausted — with 43+ rows per B2 Teil today that's a
-- very long runway).
--
-- All writes go through SECURITY DEFINER RPCs, not direct table grants —
-- `authenticated` gets SELECT only on this table, exactly so a client can
-- never self-write score_total/passed/etc. the way the profiles.level hole
-- (see 20260722000000) allowed for a different table.
CREATE TABLE IF NOT EXISTS public.simulation_attempts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level                 text        NOT NULL DEFAULT 'TELC_B2' CHECK (level = 'TELC_B2'),
  status                text        NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
  started_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL,
  submitted_at          timestamptz,
  current_section       text        NOT NULL DEFAULT 'lesen_t1' CHECK (current_section IN (
                           'lesen_t1', 'lesen_t2', 'lesen_t3', 'sb_t1', 'sb_t2',
                           'hoeren_t1', 'hoeren_t2', 'hoeren_t3', 'schreiben'
                         )),
  -- fixed at start, immutable afterward
  lesen_t1_id           uuid        REFERENCES public.lesen_exercises(id),
  lesen_t2_id           uuid        REFERENCES public.lesen_exercises(id),
  lesen_t3_id           uuid        REFERENCES public.lesen_exercises(id),
  sb_t1_id              uuid        REFERENCES public.sb_exercises(id),
  sb_t2_id              uuid        REFERENCES public.sb_exercises(id),
  hoeren_t1_id          uuid        REFERENCES public.hoeren_exercises(id),
  hoeren_t2_id          uuid        REFERENCES public.hoeren_exercises(id),
  hoeren_t3_id          uuid        REFERENCES public.hoeren_exercises(id),
  schreiben_exam_id     uuid        REFERENCES public.exams(id),
  -- student progress
  answers               jsonb       NOT NULL DEFAULT '{}'::jsonb, -- { lesen_t1: {...}, lesen_t2: {...}, sb_t1: {...}, hoeren_t1: {...}, ... }
  schreiben_text        text,
  schreiben_word_count  int,
  -- results, filled by score_simulation_sections / finalize_simulation
  score_lesen           int         CHECK (score_lesen BETWEEN 0 AND 75),
  score_sb              int         CHECK (score_sb BETWEEN 0 AND 30),
  score_hoeren          int         CHECK (score_hoeren BETWEEN 0 AND 75),
  score_schreiben       int         CHECK (score_schreiben BETWEEN 0 AND 45),
  score_total           int         CHECK (score_total BETWEEN 0 AND 225),
  passed                boolean,
  essay_grading_id      uuid        REFERENCES public.essay_gradings(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS simulation_attempts_user_idx ON public.simulation_attempts(user_id, created_at DESC);

ALTER TABLE public.simulation_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select own simulation attempts" ON public.simulation_attempts;
CREATE POLICY "select own simulation attempts" ON public.simulation_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT ON public.simulation_attempts TO authenticated;
GRANT ALL ON public.simulation_attempts TO service_role;

-- ============================================================
-- start_simulation — resume-or-create, monthly cap, no-duplicate random pick
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_simulation(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff   boolean;
  v_count      int;
  v_used       uuid[];
  v_existing   uuid;
  v_attempt_id uuid;
  v_expires    timestamptz;
  v_lesen_t1 uuid; v_lesen_t2 uuid; v_lesen_t3 uuid;
  v_sb_t1 uuid; v_sb_t2 uuid;
  v_hoeren_t1 uuid; v_hoeren_t2 uuid; v_hoeren_t3 uuid;
  v_schreiben uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT (public.has_plan_access(p_user_id, 'schriftlich') OR public.is_d17_staff(p_user_id)) THEN
    RAISE EXCEPTION 'Forbidden: active schriftlich subscription required';
  END IF;

  -- Lazy-expire any of this user's own stale in_progress rows (mirrors the
  -- lazy-expiry pattern already used for Mündlich minutes).
  UPDATE public.simulation_attempts SET status = 'expired'
    WHERE user_id = p_user_id AND status = 'in_progress' AND expires_at <= now();

  -- Resume rather than risk a second parallel attempt.
  SELECT id INTO v_existing FROM public.simulation_attempts
    WHERE user_id = p_user_id AND status = 'in_progress' AND expires_at > now()
    ORDER BY started_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', v_existing, 'resumed', true);
  END IF;

  v_is_staff := public.is_d17_staff(p_user_id);
  IF NOT v_is_staff THEN
    SELECT count(*) INTO v_count FROM public.simulation_attempts
      WHERE user_id = p_user_id AND created_at >= date_trunc('month', now());
    IF v_count >= 20 THEN
      RAISE EXCEPTION 'MONTHLY_LIMIT_REACHED';
    END IF;
  END IF;

  SELECT array_remove(array_agg(DISTINCT x), NULL) INTO v_used
    FROM public.simulation_attempts,
    LATERAL (VALUES (lesen_t1_id), (lesen_t2_id), (lesen_t3_id), (sb_t1_id), (sb_t2_id),
                     (hoeren_t1_id), (hoeren_t2_id), (hoeren_t3_id), (schreiben_exam_id)) AS t(x)
    WHERE user_id = p_user_id;
  v_used := COALESCE(v_used, ARRAY[]::uuid[]);

  SELECT id INTO v_lesen_t1 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 1 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t1 IS NULL THEN SELECT id INTO v_lesen_t1 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 1 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_lesen_t2 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 2 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t2 IS NULL THEN SELECT id INTO v_lesen_t2 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 2 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_lesen_t3 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 3 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t3 IS NULL THEN SELECT id INTO v_lesen_t3 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 3 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_sb_t1 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 1 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_sb_t1 IS NULL THEN SELECT id INTO v_sb_t1 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 1 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_sb_t2 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 2 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_sb_t2 IS NULL THEN SELECT id INTO v_sb_t2 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 2 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 1 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t1 IS NULL THEN SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 1 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 2 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t2 IS NULL THEN SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 2 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 3 AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t3 IS NULL THEN SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 3 ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_schreiben FROM public.exams
    WHERE level = 'TELC_B2' AND module = 'schriftlich' AND section = 'schreiben'
      AND exam_type = 'vorbereitung' AND status = 'published' AND id <> ALL(v_used)
    ORDER BY random() LIMIT 1;
  IF v_schreiben IS NULL THEN
    SELECT id INTO v_schreiben FROM public.exams
      WHERE level = 'TELC_B2' AND module = 'schriftlich' AND section = 'schreiben'
        AND exam_type = 'vorbereitung' AND status = 'published'
      ORDER BY random() LIMIT 1;
  END IF;

  IF v_lesen_t1 IS NULL OR v_lesen_t2 IS NULL OR v_lesen_t3 IS NULL OR v_sb_t1 IS NULL OR v_sb_t2 IS NULL
     OR v_hoeren_t1 IS NULL OR v_hoeren_t2 IS NULL OR v_hoeren_t3 IS NULL OR v_schreiben IS NULL THEN
    RAISE EXCEPTION 'NOT_ENOUGH_CONTENT';
  END IF;

  v_expires := now() + interval '145 minutes';
  INSERT INTO public.simulation_attempts (
    user_id, expires_at, lesen_t1_id, lesen_t2_id, lesen_t3_id, sb_t1_id, sb_t2_id,
    hoeren_t1_id, hoeren_t2_id, hoeren_t3_id, schreiben_exam_id
  ) VALUES (
    p_user_id, v_expires, v_lesen_t1, v_lesen_t2, v_lesen_t3, v_sb_t1, v_sb_t2,
    v_hoeren_t1, v_hoeren_t2, v_hoeren_t3, v_schreiben
  ) RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'expires_at', v_expires, 'resumed', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.start_simulation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.start_simulation(uuid) FROM anon;

-- ============================================================
-- save_simulation_progress — the only way answers/current_section/Schreiben
-- text can change; blocks writes once expired or already submitted.
-- ============================================================
CREATE OR REPLACE FUNCTION public.save_simulation_progress(
  p_attempt_id uuid,
  p_section text DEFAULT NULL,
  p_section_answers jsonb DEFAULT NULL,
  p_schreiben_text text DEFAULT NULL,
  p_advance_to text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_owner   uuid;
  v_status  text;
  v_expires timestamptz;
  v_words   int;
BEGIN
  SELECT user_id, status, expires_at INTO v_owner, v_status, v_expires
    FROM public.simulation_attempts WHERE id = p_attempt_id;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'ATTEMPT_NOT_IN_PROGRESS';
  END IF;
  IF now() > v_expires THEN
    UPDATE public.simulation_attempts SET status = 'expired' WHERE id = p_attempt_id;
    RAISE EXCEPTION 'ATTEMPT_EXPIRED';
  END IF;

  IF p_schreiben_text IS NOT NULL THEN
    v_words := CASE WHEN trim(p_schreiben_text) = '' THEN 0
      ELSE array_length(regexp_split_to_array(trim(p_schreiben_text), '\s+'), 1) END;
  END IF;

  UPDATE public.simulation_attempts SET
    answers = CASE WHEN p_section IS NOT NULL AND p_section_answers IS NOT NULL
      THEN jsonb_set(answers, ARRAY[p_section], p_section_answers) ELSE answers END,
    schreiben_text = COALESCE(p_schreiben_text, schreiben_text),
    schreiben_word_count = COALESCE(v_words, schreiben_word_count),
    current_section = COALESCE(p_advance_to, current_section)
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_simulation_progress(uuid, text, jsonb, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.save_simulation_progress(uuid, text, jsonb, text, text) FROM anon;

-- ============================================================
-- score_simulation_sections — objective scoring (Lesen/SB/Hören), reusing
-- the existing per-Teil scoring RPCs verbatim. Callable regardless of
-- expiry (this is exactly what lets a just-timed-out exam still be scored).
-- ============================================================
CREATE OR REPLACE FUNCTION public.score_simulation_sections(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.simulation_attempts%ROWTYPE;
  v_lesen_raw int := 0; v_lesen_total int := 0;
  v_sb_raw int := 0; v_sb_total int := 0;
  v_hoeren_raw int := 0; v_hoeren_total int := 0;
  v_lesen_pts int; v_sb_pts int; v_hoeren_pts int;
  v_res jsonb;
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

  v_res := score_lesen_t2(v_row.lesen_t2_id, COALESCE(v_row.answers->'lesen_t2', '{}'::jsonb));
  v_lesen_raw := v_lesen_raw + (v_res->>'score')::int; v_lesen_total := v_lesen_total + (v_res->>'total')::int;

  v_res := score_lesen_t3(v_row.lesen_t3_id, COALESCE(v_row.answers->'lesen_t3', '{}'::jsonb));
  v_lesen_raw := v_lesen_raw + (v_res->>'score')::int; v_lesen_total := v_lesen_total + (v_res->>'total')::int;

  v_res := score_sb_t1(v_row.sb_t1_id, COALESCE(v_row.answers->'sb_t1', '{}'::jsonb));
  v_sb_raw := v_sb_raw + (v_res->>'score')::int; v_sb_total := v_sb_total + (v_res->>'total')::int;

  v_res := score_sb_t2(v_row.sb_t2_id, COALESCE(v_row.answers->'sb_t2', '{}'::jsonb));
  v_sb_raw := v_sb_raw + (v_res->>'score')::int; v_sb_total := v_sb_total + (v_res->>'total')::int;

  -- score_and_save_hoeren also inserts an hoeren_attempts row (same durable
  -- history table real Hören practice uses) — a deliberate, harmless side
  -- effect, not worked around.
  v_res := score_and_save_hoeren(v_row.hoeren_t1_id, COALESCE(v_row.answers->'hoeren_t1', '{}'::jsonb));
  v_hoeren_raw := v_hoeren_raw + (v_res->>'score')::int; v_hoeren_total := v_hoeren_total + (v_res->>'total')::int;

  v_res := score_and_save_hoeren(v_row.hoeren_t2_id, COALESCE(v_row.answers->'hoeren_t2', '{}'::jsonb));
  v_hoeren_raw := v_hoeren_raw + (v_res->>'score')::int; v_hoeren_total := v_hoeren_total + (v_res->>'total')::int;

  v_res := score_and_save_hoeren(v_row.hoeren_t3_id, COALESCE(v_row.answers->'hoeren_t3', '{}'::jsonb));
  v_hoeren_raw := v_hoeren_raw + (v_res->>'score')::int; v_hoeren_total := v_hoeren_total + (v_res->>'total')::int;

  v_lesen_pts  := CASE WHEN v_lesen_total  > 0 THEN ROUND(v_lesen_raw  * 75.0 / v_lesen_total)  ELSE 0 END;
  v_sb_pts     := CASE WHEN v_sb_total     > 0 THEN ROUND(v_sb_raw     * 30.0 / v_sb_total)     ELSE 0 END;
  v_hoeren_pts := CASE WHEN v_hoeren_total > 0 THEN ROUND(v_hoeren_raw * 75.0 / v_hoeren_total) ELSE 0 END;

  UPDATE public.simulation_attempts SET
    score_lesen = v_lesen_pts, score_sb = v_sb_pts, score_hoeren = v_hoeren_pts
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('score_lesen', v_lesen_pts, 'score_sb', v_sb_pts, 'score_hoeren', v_hoeren_pts);
END;
$$;
GRANT EXECUTE ON FUNCTION public.score_simulation_sections(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.score_simulation_sections(uuid) FROM anon;

-- ============================================================
-- finalize_simulation — called by the TS layer after Schreiben AI grading
-- (which can't happen inside Postgres) to record the Schreiben score, total,
-- and pass/fail, and close out the attempt.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_simulation(
  p_attempt_id uuid,
  p_score_schreiben int,
  p_essay_grading_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.simulation_attempts%ROWTYPE;
  v_total int;
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
    'score_schreiben', p_score_schreiben, 'score_total', v_total, 'passed', v_passed
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.finalize_simulation(uuid, int, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_simulation(uuid, int, uuid) FROM anon;

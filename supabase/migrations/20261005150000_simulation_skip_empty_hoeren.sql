-- start_simulation: never pick a Hören exercise that has no statements.
-- The "content pending" Teil-3 placeholders (Schlagminger, Neu Autobahn, Frankfurt) are is_hidden=false but empty, so ~5% of simulations got an empty
-- Hören T3 section. Only the six Hören pickers change (3 main + 3 fallback queries); everything else is the live definition verbatim.
-- Regression test: scripts/simulationEmptyHoeren.live-test.mjs
CREATE OR REPLACE FUNCTION public.start_simulation(p_user_id uuid, p_level text DEFAULT 'TELC_B2'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  IF p_level NOT IN ('TELC_B1', 'TELC_B2') THEN
    RAISE EXCEPTION 'Invalid level: %', p_level;
  END IF;

  IF NOT (public.has_plan_access(p_user_id, 'schriftlich') OR public.is_d17_staff(p_user_id)) THEN
    UPDATE public.profiles SET free_simulation_used = true
      WHERE id = p_user_id AND free_simulation_used = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Forbidden: active schriftlich subscription required (free trial already used)';
    END IF;
  END IF;

  UPDATE public.simulation_attempts SET status = 'expired'
    WHERE user_id = p_user_id AND status = 'in_progress' AND expires_at <= now();

  SELECT id INTO v_existing FROM public.simulation_attempts
    WHERE user_id = p_user_id AND status = 'in_progress' AND expires_at > now()
    ORDER BY started_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', v_existing, 'resumed', true);
  END IF;

  SELECT array_remove(array_agg(DISTINCT x), NULL) INTO v_used
    FROM public.simulation_attempts,
    LATERAL (VALUES (lesen_t1_id), (lesen_t2_id), (lesen_t3_id), (sb_t1_id), (sb_t2_id),
                     (hoeren_t1_id), (hoeren_t2_id), (hoeren_t3_id), (schreiben_exam_id)) AS t(x)
    WHERE user_id = p_user_id;
  v_used := COALESCE(v_used, ARRAY[]::uuid[]);

  -- lesen_exercises/sb_exercises/hoeren_exercises.level is plain `text`
  -- (unlike exams.level, which is the `user_level` enum below) -- no cast.
  SELECT id INTO v_lesen_t1 FROM public.lesen_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t1 IS NULL THEN SELECT id INTO v_lesen_t1 FROM public.lesen_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_lesen_t2 FROM public.lesen_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t2 IS NULL THEN SELECT id INTO v_lesen_t2 FROM public.lesen_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_lesen_t3 FROM public.lesen_exercises WHERE level = p_level AND teil = 3 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t3 IS NULL THEN SELECT id INTO v_lesen_t3 FROM public.lesen_exercises WHERE level = p_level AND teil = 3 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_sb_t1 FROM public.sb_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_sb_t1 IS NULL THEN SELECT id INTO v_sb_t1 FROM public.sb_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_sb_t2 FROM public.sb_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_sb_t2 IS NULL THEN SELECT id INTO v_sb_t2 FROM public.sb_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false AND EXISTS (SELECT 1 FROM public.hoeren_statements hs WHERE hs.exercise_id = hoeren_exercises.id) AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t1 IS NULL THEN SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false AND EXISTS (SELECT 1 FROM public.hoeren_statements hs WHERE hs.exercise_id = hoeren_exercises.id) ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false AND EXISTS (SELECT 1 FROM public.hoeren_statements hs WHERE hs.exercise_id = hoeren_exercises.id) AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t2 IS NULL THEN SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false AND EXISTS (SELECT 1 FROM public.hoeren_statements hs WHERE hs.exercise_id = hoeren_exercises.id) ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = p_level AND teil = 3 AND is_hidden = false AND EXISTS (SELECT 1 FROM public.hoeren_statements hs WHERE hs.exercise_id = hoeren_exercises.id) AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t3 IS NULL THEN SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = p_level AND teil = 3 AND is_hidden = false AND EXISTS (SELECT 1 FROM public.hoeren_statements hs WHERE hs.exercise_id = hoeren_exercises.id) ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_schreiben FROM public.exams
    WHERE level = p_level::public.user_level AND module = 'schriftlich' AND section = 'schreiben'
      AND exam_type = 'vorbereitung' AND status = 'published' AND id <> ALL(v_used)
    ORDER BY random() LIMIT 1;
  IF v_schreiben IS NULL THEN
    SELECT id INTO v_schreiben FROM public.exams
      WHERE level = p_level::public.user_level AND module = 'schriftlich' AND section = 'schreiben'
        AND exam_type = 'vorbereitung' AND status = 'published'
      ORDER BY random() LIMIT 1;
  END IF;

  IF v_lesen_t1 IS NULL OR v_lesen_t2 IS NULL OR v_lesen_t3 IS NULL OR v_sb_t1 IS NULL OR v_sb_t2 IS NULL
     OR v_hoeren_t1 IS NULL OR v_hoeren_t2 IS NULL OR v_hoeren_t3 IS NULL OR v_schreiben IS NULL THEN
    RAISE EXCEPTION 'NOT_ENOUGH_CONTENT';
  END IF;

  v_expires := now() + interval '145 minutes';
  INSERT INTO public.simulation_attempts (
    user_id, level, expires_at, lesen_t1_id, lesen_t2_id, lesen_t3_id, sb_t1_id, sb_t2_id,
    hoeren_t1_id, hoeren_t2_id, hoeren_t3_id, schreiben_exam_id
  ) VALUES (
    p_user_id, p_level, v_expires, v_lesen_t1, v_lesen_t2, v_lesen_t3, v_sb_t1, v_sb_t2,
    v_hoeren_t1, v_hoeren_t2, v_hoeren_t3, v_schreiben
  ) RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'expires_at', v_expires, 'resumed', false);
END;
$function$
;

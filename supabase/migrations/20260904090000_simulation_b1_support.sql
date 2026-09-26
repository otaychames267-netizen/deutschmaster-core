-- Prüfungssimulation: add B1 support.
--
-- start_simulation() was hardcoded to TELC_B2 in every one of its 9
-- random-pick queries (and simulation_attempts.level itself only allowed
-- 'TELC_B2' via a CHECK constraint) -- a leftover from when B1 was not a
-- launchable product. Adds a p_level parameter (default 'TELC_B2', so any
-- existing call site that doesn't pass it keeps behaving identically) and
-- threads it through every pick + the inserted row's own `level` column.
-- No other function in this flow (save_simulation_progress,
-- finalize_simulation, score_simulation_sections) references level at all,
-- so none of them need touching.

ALTER TABLE public.simulation_attempts
  DROP CONSTRAINT IF EXISTS simulation_attempts_level_check;
ALTER TABLE public.simulation_attempts
  ADD CONSTRAINT simulation_attempts_level_check CHECK (level IN ('TELC_B1', 'TELC_B2'));

-- Old 1-arg signature must be dropped explicitly -- CREATE OR REPLACE with a
-- different parameter list creates a second overload instead of replacing
-- it, which would make supabase-js's .rpc('start_simulation', {p_user_id})
-- call ambiguous between the two.
DROP FUNCTION IF EXISTS public.start_simulation(uuid);

CREATE OR REPLACE FUNCTION public.start_simulation(p_user_id uuid, p_level text DEFAULT 'TELC_B2')
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

  SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t1 IS NULL THEN SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = p_level AND teil = 1 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t2 IS NULL THEN SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = p_level AND teil = 2 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = p_level AND teil = 3 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t3 IS NULL THEN SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = p_level AND teil = 3 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

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
$function$;
GRANT EXECUTE ON FUNCTION public.start_simulation(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.start_simulation(uuid, text) FROM anon;

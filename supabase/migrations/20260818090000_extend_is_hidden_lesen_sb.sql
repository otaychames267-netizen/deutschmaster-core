-- Extends the is_hidden content-visibility flag (already used by
-- hoeren_exercises, see 20260808130000_hoeren_hide_matthias.sql) to
-- lesen_exercises and sb_exercises, so "hidden from Vorbereitung" can
-- actually be expressed for those two skills at all — today neither table
-- has any hide/publish concept, meaning Prüfungssimulation's random-pick
-- has no way to honor a hide decision that doesn't exist yet.
--
-- Defaults to false for every existing row, so nothing changes for any
-- currently-visible exercise. Not a deletion — same reversible posture as
-- the Hören precedent.

alter table public.lesen_exercises add column if not exists is_hidden boolean not null default false;
alter table public.sb_exercises add column if not exists is_hidden boolean not null default false;

-- get_exercise_catalog: the non-subscriber locked-preview catalog RPC
-- already excludes is_hidden for hoeren; extend the same exclusion to
-- lesen and sprachbausteine so a hidden exercise never appears even as a
-- locked/"subscribe to unlock" row.
CREATE OR REPLACE FUNCTION public.get_exercise_catalog(p_skill text, p_level text, p_teil integer)
 RETURNS TABLE(id uuid, title text, ord integer, import_notes text, is_free_sample boolean, has_audio boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_skill = 'lesen' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.sort_order, e.import_notes, e.is_free_sample, NULL::boolean
      FROM public.lesen_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.sort_order NULLS LAST, e.created_at;
  ELSIF p_skill = 'hoeren' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample, (e.audio_path IS NOT NULL)
      FROM public.hoeren_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSIF p_skill = 'sprachbausteine' THEN
    RETURN QUERY
      SELECT e.id, e.title, e.position::integer, e.import_notes, e.is_free_sample, NULL::boolean
      FROM public.sb_exercises e
      WHERE e.level = p_level AND e.teil = p_teil AND e.is_hidden = false
      ORDER BY e.position NULLS LAST, e.created_at;
  ELSE
    RETURN;
  END IF;
END;
$function$;

-- start_simulation: apply the same is_hidden exclusion to the Lesen and
-- Sprachbausteine random-pick branches that Hören already has, so
-- "Vorbereitung visibility = source of truth" holds for every skill in
-- Prüfungssimulation, not just Hören.
CREATE OR REPLACE FUNCTION public.start_simulation(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT id INTO v_lesen_t1 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 1 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t1 IS NULL THEN SELECT id INTO v_lesen_t1 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 1 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_lesen_t2 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 2 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t2 IS NULL THEN SELECT id INTO v_lesen_t2 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 2 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_lesen_t3 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 3 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_lesen_t3 IS NULL THEN SELECT id INTO v_lesen_t3 FROM public.lesen_exercises WHERE level = 'TELC_B2' AND teil = 3 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_sb_t1 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 1 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_sb_t1 IS NULL THEN SELECT id INTO v_sb_t1 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 1 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_sb_t2 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 2 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_sb_t2 IS NULL THEN SELECT id INTO v_sb_t2 FROM public.sb_exercises WHERE level = 'TELC_B2' AND teil = 2 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 1 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t1 IS NULL THEN SELECT id INTO v_hoeren_t1 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 1 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 2 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t2 IS NULL THEN SELECT id INTO v_hoeren_t2 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 2 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

  SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 3 AND is_hidden = false AND id <> ALL(v_used) ORDER BY random() LIMIT 1;
  IF v_hoeren_t3 IS NULL THEN SELECT id INTO v_hoeren_t3 FROM public.hoeren_exercises WHERE level = 'TELC_B2' AND teil = 3 AND is_hidden = false ORDER BY random() LIMIT 1; END IF;

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
$function$;

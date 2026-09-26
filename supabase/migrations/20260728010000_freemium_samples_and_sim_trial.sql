-- Freemium sample exercises + 1 free Prüfungssimulation trial.
--
-- Design: every new policy below is ADDITIVE (a new permissive SELECT
-- policy alongside the existing "auth read <table>" policy that already
-- gates paying users via has_plan_access). Postgres OR's multiple
-- permissive policies for the same command together, so this can never
-- narrow existing access — it only adds a second, much narrower door.
-- Nothing changes for any existing user until is_free_sample is actually
-- set to true on specific rows (done in a separate, reviewable step).

-- ── Free-sample columns ─────────────────────────────────────────────
alter table public.lesen_exercises  add column if not exists is_free_sample boolean not null default false;
alter table public.hoeren_exercises add column if not exists is_free_sample boolean not null default false;
alter table public.sb_exercises     add column if not exists is_free_sample boolean not null default false;
alter table public.exams            add column if not exists is_free_sample boolean not null default false;

-- ── Free-sample RLS policies: parent tables (direct flag) ───────────
create policy "free sample read lesen_exercises" on public.lesen_exercises
  for select using (is_free_sample = true);
create policy "free sample read hoeren_exercises" on public.hoeren_exercises
  for select using (is_free_sample = true);
create policy "free sample read sb_exercises" on public.sb_exercises
  for select using (is_free_sample = true);
create policy "free sample read exams" on public.exams
  for select using (is_free_sample = true);

-- ── Free-sample RLS policies: child tables (via parent exercise_id) ─
create policy "free sample read lesen_t1_headlines" on public.lesen_t1_headlines
  for select using (exists (select 1 from public.lesen_exercises e where e.id = lesen_t1_headlines.exercise_id and e.is_free_sample = true));
create policy "free sample read lesen_t1_texts" on public.lesen_t1_texts
  for select using (exists (select 1 from public.lesen_exercises e where e.id = lesen_t1_texts.exercise_id and e.is_free_sample = true));
create policy "free sample read lesen_t2_passages" on public.lesen_t2_passages
  for select using (exists (select 1 from public.lesen_exercises e where e.id = lesen_t2_passages.exercise_id and e.is_free_sample = true));
create policy "free sample read lesen_t2_questions" on public.lesen_t2_questions
  for select using (exists (select 1 from public.lesen_exercises e where e.id = lesen_t2_questions.exercise_id and e.is_free_sample = true));
create policy "free sample read lesen_t3_situations" on public.lesen_t3_situations
  for select using (exists (select 1 from public.lesen_exercises e where e.id = lesen_t3_situations.exercise_id and e.is_free_sample = true));
create policy "free sample read lesen_t3_texts" on public.lesen_t3_texts
  for select using (exists (select 1 from public.lesen_exercises e where e.id = lesen_t3_texts.exercise_id and e.is_free_sample = true));

create policy "free sample read hoeren_statements" on public.hoeren_statements
  for select using (exists (select 1 from public.hoeren_exercises e where e.id = hoeren_statements.exercise_id and e.is_free_sample = true));

create policy "free sample read sb_t1_passages" on public.sb_t1_passages
  for select using (exists (select 1 from public.sb_exercises e where e.id = sb_t1_passages.exercise_id and e.is_free_sample = true));
create policy "free sample read sb_t1_gaps" on public.sb_t1_gaps
  for select using (exists (select 1 from public.sb_exercises e where e.id = sb_t1_gaps.exercise_id and e.is_free_sample = true));
create policy "free sample read sb_t2_passages" on public.sb_t2_passages
  for select using (exists (select 1 from public.sb_exercises e where e.id = sb_t2_passages.exercise_id and e.is_free_sample = true));
create policy "free sample read sb_t2_gaps" on public.sb_t2_gaps
  for select using (exists (select 1 from public.sb_exercises e where e.id = sb_t2_gaps.exercise_id and e.is_free_sample = true));
create policy "free sample read sb_t2_words" on public.sb_t2_words
  for select using (exists (select 1 from public.sb_exercises e where e.id = sb_t2_words.exercise_id and e.is_free_sample = true));

create policy "free sample read exam_items" on public.exam_items
  for select using (exists (select 1 from public.exams e where e.id = exam_items.exam_id and e.is_free_sample = true));

-- ── Prüfungssimulation: 1 free trial per account ────────────────────
alter table public.profiles add column if not exists free_simulation_used boolean not null default false;

create or replace function public.start_simulation(p_user_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    -- Free trial: atomic compare-and-set claim, race-safe under concurrent
    -- calls (only one caller can ever flip false -> true for a given row;
    -- same pattern as this app's existing atomic-claim RPCs). Never lets a
    -- non-subscriber claim more than one trial regardless of timing.
    UPDATE public.profiles SET free_simulation_used = true
      WHERE id = p_user_id AND free_simulation_used = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Forbidden: active schriftlich subscription required (free trial already used)';
    END IF;
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
$function$;

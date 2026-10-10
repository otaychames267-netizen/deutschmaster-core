-- Fix: a Prüfungssimulation attempt "stopping" mid-exam for a legitimate
-- subscriber. Root cause: start_simulation() checks has_plan_access() once,
-- at attempt creation, and locks in randomly-chosen exercise/exam ids for
-- the whole 145-minute attempt. But every content table the exam page reads
-- from while the attempt is in progress (lesen/hoeren/sb exercises, their
-- child passages/questions/gaps/statements/texts tables, exam_items, and
-- the hoeren-images storage bucket) re-checks has_level_plan_access() /
-- has_plan_access() on EVERY read via its own "auth read" RLS policy. If a
-- subscriber's subscription boundary falls inside that 145-minute window —
-- plausible any time a renewal is due while a student happens to be mid
-- mock-exam — every one of those reads starts returning nothing partway
-- through, even though they were legitimately admitted when the attempt
-- started. That silently breaks whatever section they're on next.
--
-- Fix: one additive permissive SELECT policy per table (Postgres ORs
-- multiple permissive SELECT policies, so this only WIDENS access, the same
-- non-destructive pattern as this project's existing "free sample read X"
-- policies) that keeps an in-progress attempt's own assigned content
-- readable to its owner regardless of live subscription state — bounded by
-- the attempt's own expires_at, so exposure is capped at whatever was left
-- of the 145-minute window, never indefinite.

-- ── Parent exercise/exam tables ─────────────────────────────────────
create policy "in-progress simulation attempt read lesen_exercises" on public.lesen_exercises
  for select using (
    (not is_neu_locked(title)) and (not is_neu_restricted_for(title, auth.uid())) and
    exists (
      select 1 from public.simulation_attempts sa
      where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
        and (sa.lesen_t1_id = lesen_exercises.id or sa.lesen_t2_id = lesen_exercises.id or sa.lesen_t3_id = lesen_exercises.id)
    )
  );

create policy "in-progress simulation attempt read hoeren_exercises" on public.hoeren_exercises
  for select using (
    (not is_neu_locked(title)) and (not is_neu_restricted_for(title, auth.uid())) and
    exists (
      select 1 from public.simulation_attempts sa
      where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
        and (sa.hoeren_t1_id = hoeren_exercises.id or sa.hoeren_t2_id = hoeren_exercises.id or sa.hoeren_t3_id = hoeren_exercises.id)
    )
  );

create policy "in-progress simulation attempt read sb_exercises" on public.sb_exercises
  for select using (
    (not is_neu_locked(title)) and (not is_neu_restricted_for(title, auth.uid())) and
    exists (
      select 1 from public.simulation_attempts sa
      where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
        and (sa.sb_t1_id = sb_exercises.id or sa.sb_t2_id = sb_exercises.id)
    )
  );

create policy "in-progress simulation attempt read exams" on public.exams
  for select using (
    exists (
      select 1 from public.simulation_attempts sa
      where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
        and sa.schreiben_exam_id = exams.id
    )
  );

create policy "in-progress simulation attempt read exam_items" on public.exam_items
  for select using (
    exists (
      select 1 from public.simulation_attempts sa
      where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
        and sa.schreiben_exam_id = exam_items.exam_id
    )
  );

-- ── Lesen child content ──────────────────────────────────────────────
create policy "in-progress simulation attempt read lesen_t1_headlines" on public.lesen_t1_headlines
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.lesen_t1_id = lesen_t1_headlines.exercise_id)
  );
create policy "in-progress simulation attempt read lesen_t1_texts" on public.lesen_t1_texts
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.lesen_t1_id = lesen_t1_texts.exercise_id)
  );
create policy "in-progress simulation attempt read lesen_t2_passages" on public.lesen_t2_passages
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.lesen_t2_id = lesen_t2_passages.exercise_id)
  );
create policy "in-progress simulation attempt read lesen_t2_questions" on public.lesen_t2_questions
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.lesen_t2_id = lesen_t2_questions.exercise_id)
  );
create policy "in-progress simulation attempt read lesen_t3_situations" on public.lesen_t3_situations
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.lesen_t3_id = lesen_t3_situations.exercise_id)
  );
create policy "in-progress simulation attempt read lesen_t3_texts" on public.lesen_t3_texts
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.lesen_t3_id = lesen_t3_texts.exercise_id)
  );

-- ── Sprachbausteine child content (sb_t1_gaps is the base table behind
--    the answer-key-free sb_t1_gaps_student view the exam page reads) ──
create policy "in-progress simulation attempt read sb_t1_passages" on public.sb_t1_passages
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.sb_t1_id = sb_t1_passages.exercise_id)
  );
create policy "in-progress simulation attempt read sb_t1_gaps" on public.sb_t1_gaps
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.sb_t1_id = sb_t1_gaps.exercise_id)
  );
create policy "in-progress simulation attempt read sb_t2_passages" on public.sb_t2_passages
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.sb_t2_id = sb_t2_passages.exercise_id)
  );
create policy "in-progress simulation attempt read sb_t2_words" on public.sb_t2_words
  for select using (
    exists (select 1 from public.simulation_attempts sa where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now() and sa.sb_t2_id = sb_t2_words.exercise_id)
  );

-- ── Hören child content (base table behind hoeren_statements_student) ──
create policy "in-progress simulation attempt read hoeren_statements" on public.hoeren_statements
  for select using (
    exists (
      select 1 from public.simulation_attempts sa
      where sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
        and (sa.hoeren_t1_id = hoeren_statements.exercise_id or sa.hoeren_t2_id = hoeren_statements.exercise_id or sa.hoeren_t3_id = hoeren_statements.exercise_id)
    )
  );

-- ── hoeren-images storage bucket (the Hören section's image, fetched via
--    a signed URL that is itself gated by this bucket's own RLS) ──
create policy "in-progress simulation attempt read hoeren-images" on storage.objects
  for select using (
    bucket_id = 'hoeren-images' and exists (
      select 1 from public.hoeren_exercises he
      join public.simulation_attempts sa on sa.hoeren_t1_id = he.id or sa.hoeren_t2_id = he.id or sa.hoeren_t3_id = he.id
      where he.image_path = objects.name and sa.user_id = auth.uid() and sa.status = 'in_progress' and sa.expires_at > now()
    )
  );

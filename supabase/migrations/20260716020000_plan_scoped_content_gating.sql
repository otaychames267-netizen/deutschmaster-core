-- Strict plan-scoped content gating. Explicit user decision: "Access to all
-- exercises, exam simulations, AI features, and premium content must require
-- an active paid subscription... Access is granted strictly according to the
-- purchased package only: Schriftlich -> only Schriftlich content. Mündlich
-- -> only Mündlich content. Complete -> everything. If the subscription
-- expires, is cancelled, rejected, refunded, or disabled, access must be
-- revoked immediately."
--
-- Before this migration every content table's RLS SELECT policy was
-- `qual: true` or `status = 'published'` — gated by authentication only,
-- confirmed via direct query against the live project. This closes that
-- gap system-wide via one shared helper, re-evaluated live by Postgres on
-- every single query (not cached), so expiry/cancellation/suspension/
-- rejection all revoke access on the very next request with zero extra
-- machinery.

CREATE OR REPLACE FUNCTION public.has_plan_access(p_user_id uuid, p_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.expires_at > now()
      AND (p_module IS NULL OR s.plan_code::text = 'komplett' OR s.plan_code::text = p_module)
  );
$$;

-- ── Schriftlich content ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth read lesen_exercises" ON public.lesen_exercises;
CREATE POLICY "auth read lesen_exercises" ON public.lesen_exercises
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t1_headlines" ON public.lesen_t1_headlines;
CREATE POLICY "auth read lesen_t1_headlines" ON public.lesen_t1_headlines
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t1_texts" ON public.lesen_t1_texts;
CREATE POLICY "auth read lesen_t1_texts" ON public.lesen_t1_texts
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t2_passages" ON public.lesen_t2_passages;
CREATE POLICY "auth read lesen_t2_passages" ON public.lesen_t2_passages
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t2_questions" ON public.lesen_t2_questions;
CREATE POLICY "auth read lesen_t2_questions" ON public.lesen_t2_questions
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t3_situations" ON public.lesen_t3_situations;
CREATE POLICY "auth read lesen_t3_situations" ON public.lesen_t3_situations
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read lesen_t3_texts" ON public.lesen_t3_texts;
CREATE POLICY "auth read lesen_t3_texts" ON public.lesen_t3_texts
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read hoeren_exercises" ON public.hoeren_exercises;
CREATE POLICY "auth read hoeren_exercises" ON public.hoeren_exercises
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read hoeren_statements" ON public.hoeren_statements;
CREATE POLICY "auth read hoeren_statements" ON public.hoeren_statements
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_exercises" ON public.sb_exercises;
CREATE POLICY "auth read sb_exercises" ON public.sb_exercises
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t1_gaps" ON public.sb_t1_gaps;
CREATE POLICY "auth read sb_t1_gaps" ON public.sb_t1_gaps
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t1_passages" ON public.sb_t1_passages;
CREATE POLICY "auth read sb_t1_passages" ON public.sb_t1_passages
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t2_gaps" ON public.sb_t2_gaps;
CREATE POLICY "auth read sb_t2_gaps" ON public.sb_t2_gaps
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t2_passages" ON public.sb_t2_passages;
CREATE POLICY "auth read sb_t2_passages" ON public.sb_t2_passages
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read sb_t2_words" ON public.sb_t2_words;
CREATE POLICY "auth read sb_t2_words" ON public.sb_t2_words
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'schriftlich') OR public.is_d17_staff(auth.uid()));

-- ── Mündlich content ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth read materials" ON public.muendlich_materials;
CREATE POLICY "auth read materials" ON public.muendlich_materials
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'muendlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "rooms select" ON public.muendlich_rooms;
CREATE POLICY "rooms select" ON public.muendlich_rooms
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'muendlich') OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "participants select" ON public.muendlich_participants;
CREATE POLICY "participants select" ON public.muendlich_participants
  FOR SELECT USING (public.has_plan_access(auth.uid(), 'muendlich') OR public.is_d17_staff(auth.uid()));

-- ── Per-row module (exercises.module is a real column; exams.module too) ──
DROP POLICY IF EXISTS "auth read published exercises" ON public.exercises;
CREATE POLICY "auth read published exercises" ON public.exercises
  FOR SELECT USING (status = 'published' AND (public.has_plan_access(auth.uid(), module) OR public.is_d17_staff(auth.uid())));

DROP POLICY IF EXISTS exams_published_read ON public.exams;
CREATE POLICY exams_published_read ON public.exams
  FOR SELECT USING (
    (status = 'published'::exam_pub_status AND public.has_plan_access(auth.uid(), module::text))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS items_read_via_exam ON public.exam_items;
CREATE POLICY items_read_via_exam ON public.exam_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_items.exam_id
        AND (
          (e.status = 'published'::exam_pub_status AND public.has_plan_access(auth.uid(), e.module::text))
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- ── Cross-cutting, any active plan (module NULL) ───────────────────────
-- listening_models/reading_models/speaking_topics/writing_topics/exercises/
-- exercise_collections are 0-row legacy/scaffold tables today (confirmed by
-- direct count) — gated anyway for consistency in case they're ever
-- populated; a single-line policy change, low effort either way.
DROP POLICY IF EXISTS achievements_read ON public.achievements;
CREATE POLICY achievements_read ON public.achievements
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read audio_assets" ON public.audio_assets;
CREATE POLICY "auth read audio_assets" ON public.audio_assets
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS audio_public_read ON public.audio_files;
CREATE POLICY audio_public_read ON public.audio_files
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS challenges_read_authenticated ON public.challenges;
CREATE POLICY challenges_read_authenticated ON public.challenges
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS collections_read_authenticated ON public.exercise_collections;
CREATE POLICY collections_read_authenticated ON public.exercise_collections
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS "auth read exercise_collections" ON public.exercise_collections;
CREATE POLICY "auth read exercise_collections" ON public.exercise_collections
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS pdfs_read_authenticated ON public.pdf_files;
CREATE POLICY pdfs_read_authenticated ON public.pdf_files
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS listening_read_authenticated ON public.listening_models;
CREATE POLICY listening_read_authenticated ON public.listening_models
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS content_read_authenticated ON public.reading_models;
CREATE POLICY content_read_authenticated ON public.reading_models
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS speaking_read_authenticated ON public.speaking_topics;
CREATE POLICY speaking_read_authenticated ON public.speaking_topics
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS writing_read_authenticated ON public.writing_topics;
CREATE POLICY writing_read_authenticated ON public.writing_topics
  FOR SELECT USING (public.has_plan_access(auth.uid()) OR public.is_d17_staff(auth.uid()));

-- ── AI-feature checks: plan_code alongside the existing balance check ──
-- Previously pure balance checks, decoupled from plan_code — a Schriftlich-
-- only user with stray Mündlich minutes (e.g. a stale admin grant) could
-- still use them, and vice versa.
CREATE OR REPLACE FUNCTION public.deduct_essay_credit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_new_balance int;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if not public.has_plan_access(p_user_id, 'schriftlich') then
    raise exception 'NO_ACTIVE_SUBSCRIPTION';
  end if;

  update public.student_credits
  set balance = balance - 1, updated_at = now()
  where user_id = p_user_id and balance >= 1
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.credit_transactions (user_id, delta, reason)
  values (p_user_id, -1, 'essay_grading');

  return v_new_balance;
end;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_muendlich_minutes_dual(p_room_id uuid, p_user_a uuid, p_user_b uuid, p_minutes integer)
RETURNS TABLE(deducted_user_id uuid, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bal_a INT;
  v_bal_b INT;
BEGIN
  IF p_minutes <= 0 THEN RAISE EXCEPTION 'p_minutes must be positive'; END IF;

  IF auth.uid() IS DISTINCT FROM p_user_a AND auth.uid() IS DISTINCT FROM p_user_b THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF (SELECT count(*) FROM muendlich_participants WHERE room_id = p_room_id AND user_id IN (p_user_a, p_user_b)) <> 2 THEN
    RAISE EXCEPTION 'Both users must be participants of the given room';
  END IF;

  IF NOT public.has_plan_access(p_user_a, 'muendlich') THEN RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION_A'; END IF;
  IF NOT public.has_plan_access(p_user_b, 'muendlich') THEN RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION_B'; END IF;

  PERFORM expire_muendlich_window(p_user_a);
  PERFORM expire_muendlich_window(p_user_b);

  UPDATE muendlich_credits SET minutes_balance = minutes_balance - p_minutes, updated_at = now()
    WHERE user_id = p_user_a AND is_subscribed AND minutes_balance >= p_minutes
    RETURNING minutes_balance INTO v_bal_a;
  IF v_bal_a IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_MINUTES_A'; END IF;

  UPDATE muendlich_credits SET minutes_balance = minutes_balance - p_minutes, updated_at = now()
    WHERE user_id = p_user_b AND is_subscribed AND minutes_balance >= p_minutes
    RETURNING minutes_balance INTO v_bal_b;
  IF v_bal_b IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_MINUTES_B'; END IF;

  INSERT INTO muendlich_credit_transactions (user_id, delta_minutes, reason, room_id) VALUES
    (p_user_a, -p_minutes, 'room2_usage', p_room_id),
    (p_user_b, -p_minutes, 'room2_usage', p_room_id);

  RETURN QUERY SELECT p_user_a, v_bal_a UNION ALL SELECT p_user_b, v_bal_b;
END;
$function$;

-- ── Manual admin revoke (refund/dispute stand-in until real Lemon
-- Squeezy credentials + order_refunded webhook handling exist) ──────────
-- No RLS write policy needed — service-role-only via the new
-- adminRevokeSubscription server function, same posture as every other
-- admin-only write path in this app.

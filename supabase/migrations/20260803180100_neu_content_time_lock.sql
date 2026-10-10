-- Business decision: exercises whose title carries the "( Neu ... )" marker
-- (the same marker src/lib/exercise-variant.ts's parseVariant() already
-- reads to render the orange NEW badge — see 387915d) must be genuinely
-- inaccessible to every user, regardless of subscription/free-sample status,
-- until 21:00 Africa/Tunis tonight (2026-08-03 20:00:00 UTC, fixed UTC+1, no
-- DST — same convention as 20260802010000_global_launch_event.sql).
--
-- NOTE: Postgres POSIX ARE (the `~*` operator) does not support the `\b`
-- word-boundary escape the way the TS regex does — confirmed empirically
-- (query returned 0 rows with \b, correct rows without it). The `\(...\)`
-- structural requirement alone is sufficient to avoid false positives like
-- "...neue Seen..." (no parens), so dropping \b is safe and matches the
-- real title data exactly.
--
-- Enforced at the RLS layer (the actual access-control source of truth, not
-- just a UI hide) by AND-ing a lock check into every SELECT policy that
-- could otherwise expose these rows: both "auth read" (plan-gated) and
-- "free sample read" (is_free_sample bypass) on each of the three tables
-- that use title-embedded variant markers. "admin write ..." policies are
-- untouched — the admin content-management panel must keep full visibility
-- to do its job; "ALL users" in the business ask means students/subscribers,
-- not the admin's own CRUD console.
--
-- Reverts automatically the moment now() >= the deadline, no cron job and no
-- manual toggle required — same self-expiring shape as the launch event.
CREATE OR REPLACE FUNCTION public.is_neu_locked(p_title text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_title ~* '\(\s*neu[^)]*\)'
     AND now() < '2026-08-03 20:00:00+00'::timestamptz;
$$;

GRANT EXECUTE ON FUNCTION public.is_neu_locked(text) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "auth read lesen_exercises" ON public.lesen_exercises;
CREATE POLICY "auth read lesen_exercises" ON public.lesen_exercises FOR SELECT TO authenticated
  USING ((has_plan_access(auth.uid(), 'schriftlich'::text) OR is_d17_staff(auth.uid())) AND NOT public.is_neu_locked(title));

DROP POLICY IF EXISTS "free sample read lesen_exercises" ON public.lesen_exercises;
CREATE POLICY "free sample read lesen_exercises" ON public.lesen_exercises FOR SELECT
  USING (is_free_sample = true AND NOT public.is_neu_locked(title));

DROP POLICY IF EXISTS "auth read hoeren_exercises" ON public.hoeren_exercises;
CREATE POLICY "auth read hoeren_exercises" ON public.hoeren_exercises FOR SELECT TO authenticated
  USING ((has_plan_access(auth.uid(), 'schriftlich'::text) OR is_d17_staff(auth.uid())) AND NOT public.is_neu_locked(title));

DROP POLICY IF EXISTS "free sample read hoeren_exercises" ON public.hoeren_exercises;
CREATE POLICY "free sample read hoeren_exercises" ON public.hoeren_exercises FOR SELECT
  USING (is_free_sample = true AND NOT public.is_neu_locked(title));

DROP POLICY IF EXISTS "auth read sb_exercises" ON public.sb_exercises;
CREATE POLICY "auth read sb_exercises" ON public.sb_exercises FOR SELECT TO authenticated
  USING ((has_plan_access(auth.uid(), 'schriftlich'::text) OR is_d17_staff(auth.uid())) AND NOT public.is_neu_locked(title));

DROP POLICY IF EXISTS "free sample read sb_exercises" ON public.sb_exercises;
CREATE POLICY "free sample read sb_exercises" ON public.sb_exercises FOR SELECT
  USING (is_free_sample = true AND NOT public.is_neu_locked(title));

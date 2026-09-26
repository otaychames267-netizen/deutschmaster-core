-- Per-user NEU content restriction. The 2026-08-03 time-boxed NEU lock
-- (20260803180100_neu_content_time_lock.sql, public.is_neu_locked) already
-- expired and NEU content is open to everyone again. This adds a durable,
-- per-account lock: an admin can flag one specific account
-- (profiles.neu_restricted) so "( Neu ... )"-marked exercises stay
-- inaccessible to that one account only, independent of subscription status,
-- until an admin unflags them. Same title-marker regex as is_neu_locked, same
-- three tables (lesen_exercises/hoeren_exercises/sb_exercises — the only ones
-- whose titles carry variant markers), enforced at the RLS layer (the real
-- access-control boundary) plus the SECURITY DEFINER titles-only catalog RPC,
-- so a restricted account never sees the NEU title even in the "locked —
-- subscribe" preview list; it is simply absent, not offered behind a paywall
-- it isn't actually gated by.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS neu_restricted boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_neu_restricted_for(p_title text, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_title ~* '\(\s*neu[^)]*\)'
     AND p_user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND neu_restricted = true);
$$;

GRANT EXECUTE ON FUNCTION public.is_neu_restricted_for(text, uuid) TO authenticated, anon, service_role;

-- lesen_exercises
DROP POLICY IF EXISTS "auth read lesen_exercises" ON public.lesen_exercises;
CREATE POLICY "auth read lesen_exercises" ON public.lesen_exercises FOR SELECT TO authenticated
  USING ((has_plan_access(auth.uid(), 'schriftlich'::text) OR is_d17_staff(auth.uid()))
         AND NOT public.is_neu_locked(title)
         AND NOT public.is_neu_restricted_for(title, auth.uid()));

DROP POLICY IF EXISTS "free sample read lesen_exercises" ON public.lesen_exercises;
CREATE POLICY "free sample read lesen_exercises" ON public.lesen_exercises FOR SELECT
  USING (is_free_sample = true AND NOT public.is_neu_locked(title) AND NOT public.is_neu_restricted_for(title, auth.uid()));

-- hoeren_exercises
DROP POLICY IF EXISTS "auth read hoeren_exercises" ON public.hoeren_exercises;
CREATE POLICY "auth read hoeren_exercises" ON public.hoeren_exercises FOR SELECT TO authenticated
  USING ((has_plan_access(auth.uid(), 'schriftlich'::text) OR is_d17_staff(auth.uid()))
         AND NOT public.is_neu_locked(title)
         AND NOT public.is_neu_restricted_for(title, auth.uid()));

DROP POLICY IF EXISTS "free sample read hoeren_exercises" ON public.hoeren_exercises;
CREATE POLICY "free sample read hoeren_exercises" ON public.hoeren_exercises FOR SELECT
  USING (is_free_sample = true AND NOT public.is_neu_locked(title) AND NOT public.is_neu_restricted_for(title, auth.uid()));

-- sb_exercises
DROP POLICY IF EXISTS "auth read sb_exercises" ON public.sb_exercises;
CREATE POLICY "auth read sb_exercises" ON public.sb_exercises FOR SELECT TO authenticated
  USING ((has_plan_access(auth.uid(), 'schriftlich'::text) OR is_d17_staff(auth.uid()))
         AND NOT public.is_neu_locked(title)
         AND NOT public.is_neu_restricted_for(title, auth.uid()));

DROP POLICY IF EXISTS "free sample read sb_exercises" ON public.sb_exercises;
CREATE POLICY "free sample read sb_exercises" ON public.sb_exercises FOR SELECT
  USING (is_free_sample = true AND NOT public.is_neu_locked(title) AND NOT public.is_neu_restricted_for(title, auth.uid()));

-- Titles-only catalog RPC is intentionally left untouched (still lists NEU
-- titles for a restricted caller, exactly like it lists any other item a
-- non-subscriber can't open) — a restricted account must still SEE the
-- exercise exists and get a lock icon, not have it silently vanish. Real
-- access stays blocked purely by the RLS policies above, on the tables that
-- actually hold the protected content.

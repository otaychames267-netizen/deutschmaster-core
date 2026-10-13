-- Global launch event: every authenticated user (new or existing) gets full
-- Premium access until the deadline below, then it reverts automatically —
-- no per-user trial state, no cron job, no manual toggle. `has_plan_access`
-- is the single chokepoint every RLS policy, the simulation RPCs, storage
-- bucket policies, and the client's useHasPlanAccess hook all call (see
-- 20260716020000/20260716030000 and the many later migrations that gate
-- through it) — overriding it here is therefore sufficient on its own to
-- unlock literally everything Premium normally requires a subscription for,
-- and reverting is equally global: the moment `now() >= deadline`, this
-- function falls straight through to the real subscription check below,
-- for every caller simultaneously, with no other code path to update.
--
-- Deadline is 2026-08-03T00:00:00+01:00 (Africa/Tunis, fixed UTC+1, no DST)
-- == 2026-08-02T23:00:00+00 UTC, written below in UTC since that's what
-- Postgres `now()` compares against.
CREATE OR REPLACE FUNCTION public.has_plan_access(p_user_id uuid, p_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN false;
  END IF;

  IF now() < '2026-08-02 23:00:00+00'::timestamptz THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.expires_at > now()
      AND (p_module IS NULL OR s.plan_code::text = 'komplett' OR s.plan_code::text = p_module)
  );
END;
$$;

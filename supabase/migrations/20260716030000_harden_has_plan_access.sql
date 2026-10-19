-- Tighten has_plan_access: every one of the ~25 RLS policies added in
-- 20260716020000 always calls it as has_plan_access(auth.uid(), '<module>')
-- — the caller's own id, never a stranger's. But the function itself had no
-- such restriction, and it's granted EXECUTE to `authenticated` (needed for
-- the one direct client-side RPC call in room.ts) — meaning any signed-in
-- user could otherwise call has_plan_access('<someone-else's-uuid>', ...)
-- and learn whether a stranger holds an active plan. Minor information
-- disclosure, not a payment/access bypass, but cheap to close: deny outright
-- when called with a real end-user session (auth.uid() IS NOT NULL) whose id
-- doesn't match p_user_id. service-role callers (auth.uid() IS NULL, e.g.
-- deduct_essay_credit/deduct_muendlich_minutes_dual's internal calls, which
-- already independently verify the caller owns p_user_id before reaching
-- here) are unaffected.
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

  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.expires_at > now()
      AND (p_module IS NULL OR s.plan_code::text = 'komplett' OR s.plan_code::text = p_module)
  );
END;
$$;

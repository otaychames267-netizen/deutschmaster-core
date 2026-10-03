-- Owner decision (2026-08-10): consolidate all subscription plans into full
-- platform access. has_plan_access previously required the subscriber's
-- plan_code to match the requested module (or be 'komplett') — a
-- Schriftlich-only subscriber had no Mündlich access, and vice versa. Now
-- any active subscription, regardless of which plan it was purchased under,
-- grants every module. This retroactively upgrades every currently-active
-- Schriftlich-only subscriber to full access with no other change needed,
-- since has_plan_access is the single choke point every content RLS policy
-- and the useHasPlanAccess()/useContentAccess() UI hooks call through.
--
-- p_module is kept in the signature (unused in the body) so every existing
-- caller — ~25 RLS policies, has_plan_access RPC calls from the client —
-- keeps working unchanged.
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
  );
END;
$$;

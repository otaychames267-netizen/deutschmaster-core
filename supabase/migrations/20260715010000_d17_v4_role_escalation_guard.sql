-- D17 v4 Phase 15: close a self-privilege-escalation hole found during a
-- security audit. profiles_update_own's RLS policy is "(id = auth.uid()) OR
-- has_role(admin)" with no WITH CHECK restricting which columns/values can
-- be set — any authenticated user can currently rewrite their OWN
-- profiles.role to 'owner'/'admin'/'super_admin' via a direct client call,
-- no admin gate exists on that path at all (RLS treats "it's my row" as
-- sufficient regardless of what changes). Confirmed profiles.role is NOT
-- read by has_role()/assertAdmin() anywhere in app code today (they read
-- user_roles instead), so this isn't live privilege escalation yet — but
-- it's a dormant hole that becomes a full admin takeover the moment
-- anyone wires profiles.role into an authorization check, which is an easy
-- mistake given how naturally-named the column is. A BEFORE UPDATE trigger
-- (not a WITH CHECK, which can only see the new row, not old-vs-new) closes
-- this regardless of caller: RLS-subject clients AND service-role callers
-- both pass through triggers. auth.uid() IS NULL is allowed through
-- (service-role/backend script context, which already gates on assertAdmin
-- before ever reaching here).
CREATE OR REPLACE FUNCTION public.guard_profiles_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'admin'::app_role)
       AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change a user''s role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_role_change ON public.profiles;
CREATE TRIGGER trg_guard_profiles_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_role_change();

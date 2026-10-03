-- 20260722000000_lock_profile_level_after_onboarding.sql rewrote
-- guard_profiles_role_change() to add the level/target_level clause, but in
-- doing so it was based on an earlier version of the function and silently
-- dropped the `NEW.suspended IS DISTINCT FROM OLD.suspended` clause that
-- 20260719150000_fix_referral_fraud_credit_farming_profile_guard.sql had
-- added — reopening the self-escalation hole on profiles.suspended that fix
-- was written to close. Restore it, keeping the (correct, verified)
-- onboarding-aware level guard from 20260722000000 intact.
CREATE OR REPLACE FUNCTION public.guard_profiles_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
     OR NEW.suspended IS DISTINCT FROM OLD.suspended
     OR (
       (NEW.level IS DISTINCT FROM OLD.level OR NEW.target_level IS DISTINCT FROM OLD.target_level)
       AND OLD.onboarding_completed = true
     ) THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'admin'::app_role)
       AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change role, is_admin, is_banned, suspended, or level after onboarding.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

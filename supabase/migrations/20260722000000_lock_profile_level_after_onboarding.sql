-- AuraLingovia is a dedicated TELC B2 platform for now — level is chosen once
-- at onboarding and never again. Today profiles_update_own's RLS policy has
-- no WITH CHECK restricting which columns a user may write to their own row,
-- so nothing stops a signed-in user from calling
-- supabase.from('profiles').update({level:'TELC_B1'}) directly and silently
-- re-entering a level the product no longer offers post-onboarding.
--
-- Extend the existing guard_profiles_role_change BEFORE UPDATE trigger
-- (already guards role/is_admin/is_banned, see 20260715010000 and
-- 20260718020000) rather than inventing a new mechanism — same admin/
-- super_admin bypass, same "auth.uid() IS NULL passes through" allowance for
-- service-role/backend contexts. The onboarding write itself is unaffected:
-- OLD.onboarding_completed is false at that point, so the guard only engages
-- on attempts to change level/target_level AFTER onboarding has completed.
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
     OR (
       (NEW.level IS DISTINCT FROM OLD.level OR NEW.target_level IS DISTINCT FROM OLD.target_level)
       AND OLD.onboarding_completed = true
     ) THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'admin'::app_role)
       AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change role, is_admin, is_banned, or level after onboarding.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Trigger itself is unchanged (already BEFORE UPDATE on profiles, already
-- calls this function) — CREATE OR REPLACE FUNCTION above is sufficient.

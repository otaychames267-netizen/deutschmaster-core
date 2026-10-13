-- Business decision: every account created from now on gets full ("komplett")
-- access for free, no payment/D17 verification required. Scoped to NEW
-- signups only — existing accounts are untouched and still go through the
-- normal subscription/D17 flow. Implemented as a real `subscriptions` row
-- (not a special-cased branch in has_plan_access) so it's indistinguishable
-- from a paid grant to every other part of the app: RLS policies, the
-- simulation RPCs, storage bucket policies, and useHasPlanAccess all just
-- see an active 'komplett' subscription and work unchanged.
--
-- expires_at is NOT NULL on subscriptions, so a 100-year horizon stands in
-- for "no real expiry" — there is no time-boxed end to this policy the way
-- 20260802010000_global_launch_event.sql had one; if/when this should stop,
-- revert this migration (drops the grant from the trigger for signups after
-- that point — already-created free grants are unaffected either way, same
-- as any other subscription).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, level, target_level)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'TELC_B2', 'TELC_B2')
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email = 'otaychames267@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES
      (NEW.id, 'owner'),
      (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
  VALUES (NEW.id, 'komplett', 'active', false, now(), now() + interval '100 years')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    NEW.id,
    'Welcome to AuraLingovia 🎉',
    'Your account is ready — full access to all TELC exam preparation content is unlocked, free.',
    'success'
  );

  RETURN NEW;
END;
$function$;


-- Ensure has_role is callable by app roles
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- Update handle_new_user notification text to Lingovia
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trial_already_used boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, preferred_language)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'preferred_language','en'))
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT DO NOTHING;

  SELECT EXISTS(
    SELECT 1 FROM public.trial_claims
    WHERE lower(email) = lower(new.email) AND user_id <> new.id
  ) INTO trial_already_used;

  IF NOT trial_already_used THEN
    INSERT INTO public.trial_claims (user_id, email)
    VALUES (new.id, new.email)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
    SELECT new.id, 'premium', 'trial', true, now(), now() + interval '3 days'
    WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = new.id);

    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Free trial active', 'Your 3-day free trial is now active. Start with Schriftlich or Mündlich from your dashboard.', 'trial');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Welcome back to Lingovia', 'Your free trial has already been used. Subscribe to continue learning.', 'info');
  END IF;

  RETURN new;
END
$function$;

-- Rewrite any legacy DeutschMaster notifications already in the DB
UPDATE public.notifications
SET title = REPLACE(REPLACE(title, 'DeutschMaster Core', 'Lingovia'), 'DeutschMaster', 'Lingovia'),
    body  = REPLACE(REPLACE(body,  'DeutschMaster Core', 'Lingovia'), 'DeutschMaster', 'Lingovia')
WHERE title ILIKE '%deutschmaster%' OR body ILIKE '%deutschmaster%';

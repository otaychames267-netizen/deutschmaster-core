-- Revert 20260803180000_new_account_free_access.sql — business decision
-- changed: the free-for-new-signups grant is dropped for now. Restores
-- handle_new_user() to its exact pre-change form (no subscriptions insert,
-- original welcome notification copy). NEU content time-lock
-- (20260803180100) and the one-off manual grant to abdelmokitabed@gmail.com
-- are untouched — only the new-account auto-grant is being pulled.
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

  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    NEW.id,
    'Welcome to AuraLingovia 🎉',
    'Your account is ready. Choose a subscription plan to unlock TELC exam preparation content.',
    'success'
  );

  RETURN NEW;
END;
$function$;

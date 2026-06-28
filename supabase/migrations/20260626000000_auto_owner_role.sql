-- Auto-assign owner + admin roles when the platform owner email registers.
-- Also updates handle_new_user to perform the assignment on INSERT.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_used BOOLEAN;
BEGIN
  -- Check if this email has used a trial before
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = NEW.email AND id != NEW.id
  ) INTO trial_used;

  -- Create profile row
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Auto-assign owner + admin to the platform owner
  IF NEW.email = 'otaychames267@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES
      (NEW.id, 'owner'),
      (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Send appropriate notification
  IF trial_used THEN
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (NEW.id, 'Welcome back to AuraLingovia', 'Your free trial has already been used. Subscribe to continue learning.', 'info');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (NEW.id, 'Welcome to AuraLingovia 🎉', 'Your 3-day free trial has started. Start practising for your TELC exam!', 'success');
  END IF;

  RETURN NEW;
END;
$$;

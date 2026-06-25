-- AuraLingovia — Rebranding: replace all Lingovia references in database data

-- Fix notification titles and bodies
UPDATE notifications
SET
  title = REPLACE(REPLACE(title, 'Lingovia', 'AuraLingovia'), 'DeutschMaster', 'AuraLingovia'),
  body  = REPLACE(REPLACE(body,  'Lingovia', 'AuraLingovia'), 'DeutschMaster', 'AuraLingovia')
WHERE title ILIKE '%Lingovia%'
   OR title ILIKE '%DeutschMaster%'
   OR body  ILIKE '%Lingovia%'
   OR body  ILIKE '%DeutschMaster%';

-- Fix handle_new_user function that creates welcome notifications
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

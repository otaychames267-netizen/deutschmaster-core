-- ============================================================
-- Real, live production bug found during hands-on QA of the actual
-- registration flow: handle_new_user() — the trigger that fires on every
-- single new signup — was NEVER updated when the free-trial system was
-- removed (20260716010000_remove_trial_system.sql only dropped the
-- trial_claims table and deleted trial.functions.ts; this trigger had its
-- own separate, independent trial-notification logic that nobody
-- re-audited). Verified live: registering a real new account through the
-- actual UI produces a notification reading "Welcome to AuraLingovia 🎉
-- Your 3-day free trial has started. Start practising for your TELC
-- exam!" — directly contradicting the user's explicit, binding decision
-- that no free trial exists anywhere in the system. Every real student
-- signing up right now sees this false claim.
--
-- Also found in the same trigger: the profiles insert only ever set
-- (id, email) — the "Full name" field collected on the registration form
-- (and correctly stored in auth.users.raw_user_meta_data) was silently
-- discarded, never copied into profiles.full_name. Confirmed via a real
-- signup: profiles.full_name was null despite the user typing a real name.
--
-- Fixed: removed the trial_used check and both trial-mentioning
-- notification variants, replaced with one accurate welcome message; full
-- name is now copied from raw_user_meta_data exactly like the original
-- (pre-trial-system) version of this function already did correctly.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile row, now correctly carrying over the name typed at signup.
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  -- Auto-assign owner + admin to the platform owner
  IF NEW.email = 'otaychames267@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES
      (NEW.id, 'owner'),
      (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Accurate welcome notification — no free-trial claim of any kind.
  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (
    NEW.id,
    'Welcome to AuraLingovia 🎉',
    'Your account is ready. Choose a subscription plan to unlock TELC exam preparation content.',
    'success'
  );

  RETURN NEW;
END;
$$;

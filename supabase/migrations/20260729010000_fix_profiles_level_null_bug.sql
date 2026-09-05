-- ============================================================
-- Real production bug: admin.users table showed "—" under Level for every
-- new signup (e.g. "Dhouha dhouib", "Marwa") because handle_new_user()'s
-- profiles insert never set level/target_level, and the columns had no
-- default — so they sat NULL from account creation until (if ever) the
-- user finished onboarding. Confirmed: 34 real accounts stuck this way,
-- dating back to 2026-07-17, all with onboarding_completed = false.
--
-- AuraLingovia is a dedicated TELC B2 platform today (B1 is admin-only,
-- never offered in onboarding — see Teil2Exercise.tsx's own comment on
-- this), so 'TELC_B2' is not a guess: it is the only value onboarding
-- itself would ever have written for these accounts anyway. Defaulting to
-- it here doesn't foreclose anything onboarding would have chosen.
--
-- _authenticated.tsx's onboarding gate already checks
-- `!onboarding_completed`, so giving level a real value from creation
-- doesn't skip onboarding for anyone -- it only removes level's role as a
-- second, redundant "not onboarded yet" signal (the `!data.level` half of
-- its needsOnboarding check), which is exactly the gap this bug lived in.
-- ============================================================

-- 1. Data patch: fix every account currently stuck showing "—".
UPDATE public.profiles SET level = 'TELC_B2' WHERE level IS NULL;
UPDATE public.profiles SET target_level = 'TELC_B2' WHERE target_level IS NULL;

-- 2. DB-level fallback: new rows default to TELC_B2 even if an insert
-- path forgets to set it explicitly (defense in depth alongside fix #3).
ALTER TABLE public.profiles ALTER COLUMN level SET DEFAULT 'TELC_B2';
ALTER TABLE public.profiles ALTER COLUMN target_level SET DEFAULT 'TELC_B2';

-- 3. Hard constraint: level can never be NULL again, for any reason.
ALTER TABLE public.profiles ALTER COLUMN level SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN target_level SET NOT NULL;

-- 4. Registration hook: set level/target_level explicitly at signup too
-- (not just relying on the column default), so the intent is visible
-- directly in the function that creates every profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

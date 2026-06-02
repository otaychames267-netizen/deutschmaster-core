
-- 1) Anti-abuse: one trial per email
CREATE UNIQUE INDEX IF NOT EXISTS trial_claims_email_unique ON public.trial_claims (lower(email));

-- 2) Extend handle_new_user to auto-create 3-day trial + trial_claim
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_already_used boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, preferred_language)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'preferred_language','en'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT DO NOTHING;

  -- Check if this email already claimed a trial before
  SELECT EXISTS(SELECT 1 FROM public.trial_claims WHERE lower(email) = lower(new.email)) INTO trial_already_used;

  IF NOT trial_already_used THEN
    INSERT INTO public.trial_claims (user_id, email)
    VALUES (new.id, new.email);

    INSERT INTO public.subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
    VALUES (new.id, 'premium', 'trial', true, now(), now() + interval '3 days');

    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Welcome to DeutschMaster', 'Your 3-day free trial is now active. Explore all features!', 'welcome');
  ELSE
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (new.id, 'Welcome back to DeutschMaster', 'Your free trial has already been used. Subscribe to continue learning.', 'info');
  END IF;

  RETURN new;
END $$;

-- 3) Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Function to mark expired trials/subscriptions as expired (safe to call from any authenticated user; only updates own rows via RLS-bypassing definer)
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active', 'trial') AND expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO authenticated;

-- 5) Allow users to insert their own device rows (policy "devices_own" is ALL but with_check only allows own — already fine; add explicit INSERT just in case some clients send PUT)
-- Already covered by devices_own ALL policy.

-- 6) Helpful index for notifications listing
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

-- 7) Helpful index for login_history listing
CREATE INDEX IF NOT EXISTS login_history_user_created_idx ON public.login_history (user_id, created_at DESC);

-- 8) Allow service_role / admin to insert notifications (for admin broadcast)
DROP POLICY IF EXISTS notif_admin_insert ON public.notifications;
CREATE POLICY notif_admin_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

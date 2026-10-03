-- D17 v4 Phase 20: RLS consistency fix. assertAdmin() in every D17 server
-- function (approve/reject/replay/etc.) treats 'admin' OR 'super_admin' as
-- equally authorized, but every D17-related RLS SELECT policy only checked
-- 'admin' — a super_admin-only account (no separate 'admin' row) would pass
-- every write action but see empty results reading these tables directly
-- via the anon-key client (e.g. the admin payments queue). Not live today
-- (the only real admin account holds both roles), but a latent
-- inconsistency worth closing outright.
CREATE OR REPLACE FUNCTION public.is_d17_staff(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'admin'::app_role) OR public.has_role(p_user_id, 'super_admin'::app_role);
$$;

DROP POLICY IF EXISTS d17_orders_select_own_or_admin ON public.d17_orders;
CREATE POLICY d17_orders_select_own_or_admin ON public.d17_orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS d17_attempts_select_own_or_admin ON public.d17_verification_attempts;
CREATE POLICY d17_attempts_select_own_or_admin ON public.d17_verification_attempts
  FOR SELECT USING (user_id = auth.uid() OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS d17_admin_actions_select_admin ON public.d17_admin_actions;
CREATE POLICY d17_admin_actions_select_admin ON public.d17_admin_actions
  FOR SELECT USING (public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS d17_alerts_select_admin ON public.d17_alerts;
CREATE POLICY d17_alerts_select_admin ON public.d17_alerts
  FOR SELECT USING (public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS d17_fraud_suspensions_select_own_or_admin ON public.d17_fraud_suspensions;
CREATE POLICY d17_fraud_suspensions_select_own_or_admin ON public.d17_fraud_suspensions
  FOR SELECT USING (user_id = auth.uid() OR public.is_d17_staff(auth.uid()));

DROP POLICY IF EXISTS platform_settings_history_read_admin ON public.platform_settings_history;
CREATE POLICY platform_settings_history_read_admin ON public.platform_settings_history
  FOR SELECT USING (public.is_d17_staff(auth.uid()));

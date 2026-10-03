-- Minor consistency fix found during the RLS audit: platform_settings'
-- SELECT policy checked has_role(admin) only, while every sibling table
-- (platform_settings_history, d17_orders, d17_admin_actions, etc.) uses
-- is_d17_staff (admin OR super_admin). Not independently exploitable —
-- nothing in app code does a raw client-side table SELECT on
-- platform_settings (everything goes through the now-hardened
-- get_platform_setting RPC) — but a super_admin-only account would
-- otherwise be inconsistently blocked from a direct read a peer table
-- allows. Aligned for consistency.
DROP POLICY IF EXISTS "platform_settings_read_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_read_admin" ON public.platform_settings FOR SELECT TO authenticated
  USING (public.is_d17_staff(auth.uid()));

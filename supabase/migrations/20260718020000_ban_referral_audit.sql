-- Final E2E audit fixes (2026-07-18):
--
-- 1) profiles_update_own has NO WITH CHECK — any authenticated user can
--    currently rewrite ANY column on their own row via a direct client call,
--    including is_admin and is_banned (self-grant admin / self-unban). The
--    existing role-escalation trigger (20260715010000) only guards `role`.
--    Extend the SAME BEFORE UPDATE trigger to also guard is_admin/is_banned.
-- 2) The admin "Ban user" button only ever wrote profiles.is_banned from the
--    client — nothing anywhere (RLS, login, content gating) ever READ that
--    column, so a ban had zero real effect: a banned user could still log
--    in, still access every gated table. Add an is_banned check to
--    has_plan_access (defense-in-depth; the real login-level block is done
--    via Supabase's native banned_until, set from a new TS server function).
-- 3) The referral system had no working conversion/reward pipeline at all:
--    registration never captured ?ref=, nothing ever set referrals.status
--    to 'converted', and nothing ever inserted referral_rewards or granted
--    days. Build the minimal correct pipeline, with the user's explicit
--    reward cap: 5 converted referrals = 5 total free days, 10 converted =
--    7 total free days MAXIMUM (never a full month, never uncapped).
-- 4) A generic admin_audit_log for ban/admin-role/moderation events (Section
--    14 "Logging & Audit Trail" requirement) — payments already have
--    d17_admin_actions; this covers everything else.

-- ============================================================
-- 1) Extend the profiles self-escalation guard to is_admin/is_banned
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_profiles_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'admin'::app_role)
       AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change role, is_admin, or is_banned.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Trigger itself is unchanged (already BEFORE UPDATE on profiles, already
-- calls this function) — CREATE OR REPLACE FUNCTION above is sufficient.

-- ============================================================
-- 2) Ban enforcement in content-access gating (defense-in-depth alongside
--    the real GoTrue-level ban set by the new adminSetBan server function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_plan_access(p_user_id uuid, p_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND s.expires_at > now()
      AND (p_module IS NULL OR s.plan_code::text = 'komplett' OR s.plan_code::text = p_module)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.is_banned = true
  );
$$;

-- ============================================================
-- 3) Referral pipeline
-- ============================================================

-- Backfill + auto-populate profiles.referral_code from the existing
-- generate_referral_code() (already deployed, already matches the value the
-- client derives today — this just gives it a real, indexed, lookup-able
-- home instead of being re-derived ad hoc in the browser).
UPDATE public.profiles SET referral_code = public.generate_referral_code(id) WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_set_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_referral_code();

-- Called by a just-registered user (auth.uid() = their own new id) to link
-- their signup to whoever referred them. Self-referral is already blocked by
-- the no_self_referral CHECK constraint; one-referral-per-referred-user by
-- the existing UNIQUE(referred_id). Silently no-ops on an unknown code or a
-- duplicate call — registration must never fail because of a bad/missing
-- referral code.
CREATE OR REPLACE FUNCTION public.register_referral(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
BEGIN
  IF auth.uid() IS NULL OR p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN;
  END IF;
  SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(trim(p_code));
  IF v_referrer IS NULL OR v_referrer = auth.uid() THEN
    RETURN;
  END IF;
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
  VALUES (v_referrer, auth.uid(), upper(trim(p_code)), 'pending')
  ON CONFLICT (referred_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.register_referral(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.register_referral(text) TO authenticated;

-- Idempotency: at most one reward row per (user, reason) — lets
-- process_referral_conversion be called freely on every subscription
-- activation without ever double-granting a milestone.
ALTER TABLE public.referral_rewards ADD CONSTRAINT referral_rewards_user_reason_uidx UNIQUE (user_id, reason);

-- Called (best-effort, from a try/catch in application code — must NEVER
-- block or fail a real payment activation) right after a user's subscription
-- becomes active for the first time. Marks their referral converted, then
-- grants the referrer the INCREMENTAL days for any newly-crossed milestone.
-- Reward schedule is EXACTLY what was specified, nothing invented: 5
-- converted referrals = 5 total free days; 10 converted = 7 total free days,
-- which is the hard cap — referrals beyond 10 grant nothing further, and a
-- full month is never granted at any tier.
CREATE OR REPLACE FUNCTION public.process_referral_conversion(p_referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_converted_count int;
  v_target_days int;
  v_reason text;
  v_already_granted int;
  v_delta int;
BEGIN
  SELECT * INTO v_referral FROM public.referrals
    WHERE referred_id = p_referred_user_id AND status = 'pending'
    LIMIT 1;
  IF v_referral IS NULL THEN
    RETURN; -- not a referred user, or already converted — nothing to do
  END IF;

  UPDATE public.referrals SET status = 'converted', converted_at = now() WHERE id = v_referral.id;

  SELECT count(*) INTO v_converted_count FROM public.referrals
    WHERE referrer_id = v_referral.referrer_id AND status = 'converted';

  IF v_converted_count >= 10 THEN
    v_target_days := 7; v_reason := '10_referrals';
  ELSIF v_converted_count >= 5 THEN
    v_target_days := 5; v_reason := '5_referrals';
  ELSE
    RETURN; -- below the first reward threshold — no reward yet
  END IF;

  SELECT coalesce(sum(days_granted), 0) INTO v_already_granted
    FROM public.referral_rewards WHERE user_id = v_referral.referrer_id;
  v_delta := v_target_days - v_already_granted;
  IF v_delta <= 0 THEN
    RETURN; -- this tier's reward (or a higher one) was already granted
  END IF;

  INSERT INTO public.referral_rewards (user_id, referral_id, days_granted, reason)
    VALUES (v_referral.referrer_id, v_referral.id, v_delta, v_reason)
    ON CONFLICT (user_id, reason) DO NOTHING;

  -- Extend the referrer's currently-active subscription only — if they have
  -- none right now, the reward row above still stands as a record, but no
  -- days are applied until they have an active subscription to extend
  -- (deliberately conservative: never fabricates a subscription row).
  UPDATE public.subscriptions
    SET expires_at = expires_at + make_interval(days => v_delta)
    WHERE user_id = v_referral.referrer_id AND status = 'active' AND expires_at > now();
END;
$$;
REVOKE ALL ON FUNCTION public.process_referral_conversion(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.process_referral_conversion(uuid) TO service_role;

-- ============================================================
-- 4) Generic admin audit log (Section 14 requirement)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES auth.users(id),
  action        text NOT NULL, -- 'ban' | 'unban' | 'grant_role' | 'revoke_role' | ...
  target_user_id uuid,
  note          text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
DROP POLICY IF EXISTS admin_audit_log_select_admin ON public.admin_audit_log;
CREATE POLICY admin_audit_log_select_admin ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

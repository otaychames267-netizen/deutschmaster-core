-- Replaces the referral reward schedule in process_referral_conversion().
-- OLD (20260718020000_ban_referral_audit.sql): milestone-based — 5 converted
-- referrals granted a one-time +5 total days, 10 converted granted +7 total
-- days, hard cap forever. Never approached a full month at any tier.
-- NEW (explicit product decision, 2026-09-26): each converted referral
-- grants +7 days, linearly, capped at +30 total days (one month) once 5
-- referrals have converted. Referral 5 grants only +2 days (28 -> 30) so the
-- running total lands exactly on the 30-day cap instead of overshooting to
-- 35; referrals beyond the 5th grant nothing further (delta <= 0).
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

  v_target_days := LEAST(v_converted_count * 7, 30);
  v_reason := 'referral_' || v_converted_count::text;

  SELECT coalesce(sum(days_granted), 0) INTO v_already_granted
    FROM public.referral_rewards WHERE user_id = v_referral.referrer_id;
  v_delta := v_target_days - v_already_granted;
  IF v_delta <= 0 THEN
    RETURN; -- cap already reached — nothing further to grant
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

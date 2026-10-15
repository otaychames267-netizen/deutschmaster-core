-- Owner decision 2026-10-15: referral reward is +10 days per converted friend (was +7), still capped at +30 total days (one free month) -> reached at 3 friends.
-- Plus a way for a signed-in user to ENTER a friend's referral code by hand (apply_referral_code); before, a referral could only be linked through a ?ref=CODE link.
--
-- ROLLBACK:
--   re-create public.process_referral_conversion from 20260926140000_referral_linear_7day_30cap.sql (v_target_days := LEAST(v_converted_count * 7, 30))
--   drop function public.apply_referral_code(text);

CREATE OR REPLACE FUNCTION public.process_referral_conversion(p_referred_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_target_days := LEAST(v_converted_count * 10, 30);
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

  -- Extend the referrer's currently-active subscription only — if they have none right now, the reward row above still stands as a record,
  -- but no days are applied until they have an active subscription to extend (never fabricates a subscription row).
  UPDATE public.subscriptions
    SET expires_at = expires_at + make_interval(days => v_delta)
    WHERE user_id = v_referral.referrer_id AND status = 'active' AND expires_at > now();
END;
$function$;

-- Manual code entry: returns a status string so the UI can tell the student what happened.
--   ok | invalid | own_code | already_referred | already_subscribed | unauthenticated
-- Only users who never paid (no non-trial subscription row) can be linked, so a renewal can never be turned into a referral reward afterwards.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_referrer uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN 'unauthenticated'; END IF;
  IF length(v_code) = 0 OR length(v_code) > 32 THEN RETURN 'invalid'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_uid) THEN RETURN 'already_referred'; END IF;
  SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = v_code;
  IF v_referrer IS NULL THEN RETURN 'invalid'; END IF;
  IF v_referrer = v_uid THEN RETURN 'own_code'; END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_uid AND is_trial = false) THEN RETURN 'already_subscribed'; END IF;
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
    VALUES (v_referrer, v_uid, v_code, 'pending')
    ON CONFLICT (referred_id) DO NOTHING;
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

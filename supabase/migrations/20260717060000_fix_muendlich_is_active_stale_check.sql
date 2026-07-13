-- ============================================================
-- Real gap found during end-to-end acceptance testing: muendlich_is_active
-- (the relay's pre-flight matchmaking guard, called from
-- muendlich-relay/src/server.ts's startRoomIfReady before it ever opens a
-- real, billable Gemini Live session) only checked the muendlich_credits
-- WALLET — is_subscribed flag + minutes_balance > 0 — never the live
-- subscriptions table's status/expires_at.
--
-- is_subscribed is a one-way flag: provision_muendlich_subscription sets
-- it true once and nothing ever flips it back to false when the
-- underlying subscription later expires, is cancelled, or is admin-
-- revoked/rejected. Verified live: force-expiring a subscription while a
-- room already exists and minutes remain in the wallet still returned
-- true from muendlich_is_active — meaning a fully-expired student could
-- still start a brand-new room and open a real, costly Gemini Live
-- session, only getting cut off up to 60 seconds later by the credit
-- tick's deduct_muendlich_minutes_dual call (a separate, correctly-
-- checking-live-status mechanism, fixed earlier this same session).
--
-- Fix: also require a live active subscription, checked via the same
-- direct query pattern used in deduct_muendlich_minutes_dual's fix
-- earlier this migration set (not the has_plan_access wrapper, since that
-- function's caller-identity restriction shouldn't be depended on here —
-- this function is called via a service-role context today, but a direct
-- inline check is robust regardless of future calling context).
-- ============================================================

CREATE OR REPLACE FUNCTION public.muendlich_is_active(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_row muendlich_credits%ROWTYPE;
BEGIN
  PERFORM expire_muendlich_window(p_user_id);
  SELECT * INTO v_row FROM muendlich_credits WHERE user_id = p_user_id;
  RETURN FOUND AND v_row.is_subscribed AND v_row.minutes_balance > 0 AND EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = p_user_id AND s.status = 'active' AND s.expires_at > now()
      AND (s.plan_code::text = 'komplett' OR s.plan_code::text = 'muendlich')
  );
END;
$$;

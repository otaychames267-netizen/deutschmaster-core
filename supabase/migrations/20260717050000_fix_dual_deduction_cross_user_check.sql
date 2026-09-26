-- ============================================================
-- CRITICAL functional regression found during real end-to-end acceptance
-- testing: deduct_muendlich_minutes_dual checks BOTH participants' plan
-- access via has_plan_access(p_user_a/p_user_b, 'muendlich'). But
-- has_plan_access was hardened in 20260716030000 (a real info-disclosure
-- fix) to deny any check where the caller's own auth.uid() doesn't match
-- the p_user_id being checked. This function always executes under
-- participant A's own JWT (muendlich-relay/src/server.ts calls it via
-- userScopedClient(pa.accessToken) — confirmed by reading the actual relay
-- code), and SECURITY DEFINER does NOT change what auth.uid() resolves to
-- for nested calls (session-level JWT claim, unaffected by execution-
-- privilege escalation) — so the has_plan_access(p_user_b, ...) check
-- always saw auth.uid() = A's id != B's id and returned false
-- unconditionally, REGARDLESS of B's real subscription status.
--
-- Net effect verified live: every real two-person Mündlich speaking
-- session's minute-deduction tick would immediately fail with
-- NO_ACTIVE_SUBSCRIPTION_B (or _A depending on which JWT is used), and the
-- relay hard-stops the room on the very first tick — the entire Mündlich
-- speaking-room feature has been non-functional in production since the
-- has_plan_access hardening shipped, despite subscriptions being
-- perfectly valid. Caught via a real end-to-end test using the exact same
-- call pattern the production relay uses (participant A's real access
-- token), not a synthetic/service-role shortcut that would have masked
-- this.
--
-- Fix: deduct_muendlich_minutes_dual now checks both participants' plan
-- access with its own direct query (the same logic has_plan_access uses
-- internally) instead of going through the guarded wrapper — this
-- function already independently verifies BOTH ids are real participants
-- of the given room before this point, so re-deriving the has_plan_access
-- query directly is exactly as safe as the wrapper, without inheriting
-- its caller-identity restriction (which is correct for the wrapper's own
-- direct-RPC info-disclosure use case, but wrong for this already-
-- authorized internal cross-user check).
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_muendlich_minutes_dual(p_room_id uuid, p_user_a uuid, p_user_b uuid, p_minutes integer)
RETURNS TABLE(deducted_user_id uuid, new_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bal_a INT;
  v_bal_b INT;
BEGIN
  IF p_minutes <= 0 THEN RAISE EXCEPTION 'p_minutes must be positive'; END IF;

  IF auth.uid() IS DISTINCT FROM p_user_a AND auth.uid() IS DISTINCT FROM p_user_b THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF (SELECT count(*) FROM muendlich_participants WHERE room_id = p_room_id AND user_id IN (p_user_a, p_user_b)) <> 2 THEN
    RAISE EXCEPTION 'Both users must be participants of the given room';
  END IF;

  -- Direct query, not has_plan_access() — see migration comment above for
  -- why the guarded wrapper can't be used here.
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = p_user_a AND s.status = 'active' AND s.expires_at > now()
      AND (s.plan_code::text = 'komplett' OR s.plan_code::text = 'muendlich')
  ) THEN RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION_A'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = p_user_b AND s.status = 'active' AND s.expires_at > now()
      AND (s.plan_code::text = 'komplett' OR s.plan_code::text = 'muendlich')
  ) THEN RAISE EXCEPTION 'NO_ACTIVE_SUBSCRIPTION_B'; END IF;

  PERFORM expire_muendlich_window(p_user_a);
  PERFORM expire_muendlich_window(p_user_b);

  UPDATE muendlich_credits SET minutes_balance = minutes_balance - p_minutes, updated_at = now()
    WHERE user_id = p_user_a AND is_subscribed AND minutes_balance >= p_minutes
    RETURNING minutes_balance INTO v_bal_a;
  IF v_bal_a IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_MINUTES_A'; END IF;

  UPDATE muendlich_credits SET minutes_balance = minutes_balance - p_minutes, updated_at = now()
    WHERE user_id = p_user_b AND is_subscribed AND minutes_balance >= p_minutes
    RETURNING minutes_balance INTO v_bal_b;
  IF v_bal_b IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_MINUTES_B'; END IF;

  INSERT INTO muendlich_credit_transactions (user_id, delta_minutes, reason, room_id) VALUES
    (p_user_a, -p_minutes, 'room2_usage', p_room_id),
    (p_user_b, -p_minutes, 'room2_usage', p_room_id);

  RETURN QUERY SELECT p_user_a, v_bal_a UNION ALL SELECT p_user_b, v_bal_b;
END;
$$;

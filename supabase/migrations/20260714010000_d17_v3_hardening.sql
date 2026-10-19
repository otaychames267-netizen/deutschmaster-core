-- ============================================================
-- D17 v3 hardening — Phase 9: atomic subscription activation.
--
-- Replaces the JS-side multi-round-trip provisioning sequence (upsert
-- subscription -> provision_muendlich_subscription -> provision_essay_credits
-- -> insert payments -> update d17_orders) with a single plpgsql function.
-- Every statement inside one function body commits or rolls back together,
-- so "payment approved but subscription not unlocked" can never happen —
-- a mid-sequence crash/network failure now leaves the order untouched
-- (still awaiting resolution) rather than half-provisioned.
--
-- Used by both the automated pipeline (finalizeAttempt's auto_approved
-- branch) and admin actions (approve / adjust-grant) — the exact same
-- gating logic (minutes only for muendlich/komplett, credits only for
-- schriftlich/komplett) that already existed duplicated across
-- verify.functions.ts and admin-actions.functions.ts, now defined once.
-- ============================================================
CREATE OR REPLACE FUNCTION public.activate_d17_order(
  p_order_id uuid,
  p_user_id uuid,
  p_plan_code text,
  p_amount_tnd numeric,
  p_currency text,
  p_reason text,
  p_status text,
  p_resolved_by uuid DEFAULT NULL,
  p_provider_payment_id text DEFAULT NULL,
  p_override_minutes int DEFAULT NULL,
  p_override_credits int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_sub_id uuid;
  v_sub_id           uuid;
BEGIN
  IF p_status NOT IN ('auto_approved', 'admin_approved') THEN
    RAISE EXCEPTION 'activate_d17_order: invalid status "%"', p_status;
  END IF;

  SELECT id INTO v_existing_sub_id FROM subscriptions WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1;

  IF v_existing_sub_id IS NOT NULL THEN
    UPDATE subscriptions
      SET plan_code = p_plan_code::plan_code, status = 'active', is_trial = false,
          expires_at = now() + interval '30 days', updated_at = now()
      WHERE id = v_existing_sub_id
      RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO subscriptions (user_id, plan_code, status, is_trial, started_at, expires_at)
    VALUES (p_user_id, p_plan_code::plan_code, 'active', false, now(), now() + interval '30 days')
    RETURNING id INTO v_sub_id;
  END IF;

  IF p_plan_code IN ('muendlich', 'komplett') THEN
    PERFORM provision_muendlich_subscription(p_user_id, COALESCE(p_override_minutes, 300), p_reason);
  END IF;
  IF p_plan_code IN ('schriftlich', 'komplett') THEN
    PERFORM provision_essay_credits(p_user_id, COALESCE(p_override_credits, 30), p_reason);
  END IF;

  INSERT INTO payments (user_id, subscription_id, amount, currency, status, provider, provider_payment_id, description)
  VALUES (
    p_user_id, v_sub_id, p_amount_tnd, p_currency, 'succeeded', 'd17_manual',
    COALESCE(p_provider_payment_id, p_order_id::text),
    'D17 payment verified (order ' || p_order_id || ')'
  );

  UPDATE d17_orders
    SET status = p_status::d17_order_status, resolved_at = now(), resolved_by = p_resolved_by,
        subscription_id = v_sub_id, updated_at = now()
    WHERE id = p_order_id;

  RETURN v_sub_id;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_d17_order(uuid, uuid, text, numeric, text, text, text, uuid, text, int, int) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.activate_d17_order(uuid, uuid, text, numeric, text, text, text, uuid, text, int, int) TO service_role;

-- ============================================================
-- Phase 9: locked_for_admin_only wiring support. The column already
-- existed (Phase 1) but was never set — add an index so admin queue
-- filtering by it stays fast once the app starts writing it.
-- ============================================================
CREATE INDEX IF NOT EXISTS d17_orders_locked_idx ON public.d17_orders(locked_for_admin_only) WHERE locked_for_admin_only = true;

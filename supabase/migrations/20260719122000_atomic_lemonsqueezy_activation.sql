-- SECURITY/RELIABILITY FIX: the Lemon Squeezy webhook's subscription_created/
-- subscription_updated handler did a manual multi-round-trip sequence
-- (upsert subscriptions row -> provision_muendlich_subscription ->
-- provision_essay_credits -> process_referral_conversion), each a separate
-- await/network round-trip — unlike D17's activate_d17_order (see
-- 20260714010000_d17_v3_hardening.sql), which wraps the equivalent sequence
-- in one plpgsql function so it commits or rolls back atomically. A crash or
-- network failure between steps here could leave a subscription row marked
-- 'active' with no wallet minutes/credits ever granted — a real customer who
-- paid and got nothing. Not currently reachable in production (Lemon
-- Squeezy API credentials are unset, so this path is dormant), but must be
-- correct before real credentials are added.
--
-- Also fixes a genuine D17/Lemon Squeezy conflict found during this audit:
-- activate_d17_order() selects "the latest subscription row for this user"
-- with no regard for whether that row is Lemon-Squeezy-managed. If a user
-- had an active LS subscription and was later manually approved via D17,
-- D17 would silently overwrite the LS-linked row's plan/status/expiry
-- (while leaving lemonsqueezy_subscription_id intact) — and the next LS
-- webhook for that same subscription would just as silently overwrite it
-- back, fighting D17 for the same row with no reconciliation. Fixed by
-- excluding LS-managed rows from D17's "existing row" lookup, so D17 only
-- ever touches D17-only subscriptions and creates a fresh row otherwise.

CREATE OR REPLACE FUNCTION public.activate_lemonsqueezy_subscription(
  p_user_id uuid,
  p_plan_code text,
  p_status text,
  p_expires_at timestamptz,
  p_ls_subscription_id text,
  p_ls_customer_id text,
  p_ls_variant_id text,
  p_should_provision boolean,
  p_reason text DEFAULT 'lemonsqueezy_renewal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_sub_id      uuid;
BEGIN
  SELECT id INTO v_existing_id
    FROM subscriptions
    WHERE lemonsqueezy_subscription_id = p_ls_subscription_id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE subscriptions
      SET plan_code = p_plan_code::plan_code,
          status = p_status::subscription_status,
          is_trial = false,
          expires_at = p_expires_at,
          lemonsqueezy_customer_id = p_ls_customer_id,
          lemonsqueezy_variant_id = p_ls_variant_id,
          updated_at = now()
      WHERE id = v_existing_id
      RETURNING id INTO v_sub_id;
  ELSE
    INSERT INTO subscriptions (
      user_id, plan_code, status, is_trial, started_at, expires_at,
      lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id
    )
    VALUES (
      p_user_id, p_plan_code::plan_code, p_status::subscription_status, false, now(), p_expires_at,
      p_ls_subscription_id, p_ls_customer_id, p_ls_variant_id
    )
    RETURNING id INTO v_sub_id;
  END IF;

  IF p_should_provision THEN
    IF p_plan_code IN ('muendlich', 'komplett') THEN
      PERFORM provision_muendlich_subscription(p_user_id, 300, p_reason);
    END IF;
    IF p_plan_code IN ('schriftlich', 'komplett') THEN
      PERFORM provision_essay_credits(p_user_id, 30, p_reason);
    END IF;
  END IF;

  RETURN v_sub_id;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_lemonsqueezy_subscription(uuid, text, text, timestamptz, text, text, text, boolean, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.activate_lemonsqueezy_subscription(uuid, text, text, timestamptz, text, text, text, boolean, text) TO service_role;

-- ── D17/Lemon Squeezy row-ownership guard ────────────────────────────────
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

  -- Only ever adopt a row D17 itself owns (never Lemon-Squeezy-managed) —
  -- otherwise create a fresh D17 row rather than fighting a live LS
  -- subscription for the same user.
  SELECT id INTO v_existing_sub_id
    FROM subscriptions
    WHERE user_id = p_user_id AND lemonsqueezy_subscription_id IS NULL
    ORDER BY created_at DESC LIMIT 1;

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

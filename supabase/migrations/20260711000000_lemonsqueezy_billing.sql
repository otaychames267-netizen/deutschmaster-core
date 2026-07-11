-- Lemon Squeezy payment integration foundation: re-pricing, LS-specific
-- subscription columns, idempotent webhook event log, webhook rate-limit
-- lockout, global Gemini API cost cap, hard-reset provisioning RPCs for both
-- existing wallets (muendlich_credits, student_credits), and a single-active-
-- session guard for Mündlich rooms. Follows the same atomic-RPC / RLS
-- conventions as essay_grading_credits.sql and muendlich_credits.sql.

-- ============================================================
-- Re-price plans (supersedes the prior "canonical pricing" migration —
-- confirmed with the user this is the real final price set). The existing
-- price_eur/price_usd values were stale/inconsistent (schriftlich and
-- muendlich shared identical EUR/USD despite different TND prices), so
-- EUR/USD are recomputed here from approximate market rates (~3.3 TND/EUR,
-- ~3.1 TND/USD) rather than preserved from a broken ratio. These are
-- display-only estimates for the /billing page — the actual Lemon Squeezy
-- checkout charge is computed separately via TND_TO_USD_RATE (Phase 4).
-- ============================================================
UPDATE public.plans SET price_tnd = 30, price_eur = 9.10,  price_usd = 9.70  WHERE code = 'schriftlich';
UPDATE public.plans SET price_tnd = 55, price_eur = 16.70, price_usd = 17.70 WHERE code = 'muendlich';
UPDATE public.plans SET price_tnd = 65, price_eur = 19.70, price_usd = 21.00 WHERE code = 'komplett';
-- 'premium' plan_code is a separate internal marker used only for the
-- auto-granted free trial (see src/lib/trial.functions.ts) — not a
-- purchasable tier, deliberately left untouched here.

-- ============================================================
-- Lemon Squeezy columns on subscriptions (additive — stripe_* columns are
-- dead/unused and left dormant rather than risking a rename).
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id     text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_order_id        text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_variant_id      text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_ls_subscription_id_idx
  ON public.subscriptions (lemonsqueezy_subscription_id)
  WHERE lemonsqueezy_subscription_id IS NOT NULL;

-- ============================================================
-- LEMONSQUEEZY_EVENTS — idempotency + audit + replay-safety for the webhook.
-- Service-role only; never read by the client.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lemonsqueezy_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ls_event_id    text        NOT NULL UNIQUE,
  event_type     text        NOT NULL,
  payload        jsonb       NOT NULL,
  user_id        uuid        REFERENCES auth.users(id),
  processed_at   timestamptz,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lemonsqueezy_events_user_idx ON public.lemonsqueezy_events(user_id, created_at DESC);

ALTER TABLE public.lemonsqueezy_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.lemonsqueezy_events TO service_role;
-- Deliberately no policy for authenticated/anon — service_role bypasses RLS
-- entirely, and this table is never meant to be queried by a client.

-- ============================================================
-- WEBHOOK_RATE_LIMITS — signature-failure lockout, 3 failures/10min → 1hr lock.
-- Generic scope_key so future webhook endpoints can reuse this table.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_rate_limits (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key      text        NOT NULL UNIQUE,
  failure_count  int         NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.webhook_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.record_webhook_signature_failure(p_scope_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.webhook_rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.webhook_rate_limits (scope_key, failure_count, updated_at)
  VALUES (p_scope_key, 1, now())
  ON CONFLICT (scope_key) DO UPDATE
    SET failure_count = CASE
          WHEN public.webhook_rate_limits.updated_at < now() - interval '10 minutes' THEN 1
          ELSE public.webhook_rate_limits.failure_count + 1
        END,
        updated_at = now()
  RETURNING * INTO v_row;

  IF v_row.failure_count >= 3 THEN
    UPDATE public.webhook_rate_limits SET locked_until = now() + interval '1 hour' WHERE scope_key = p_scope_key;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_webhook_signature_failure(text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_webhook_locked(p_scope_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT locked_until > now() FROM public.webhook_rate_limits WHERE scope_key = p_scope_key), false);
$$;
GRANT EXECUTE ON FUNCTION public.is_webhook_locked(text) TO service_role;

-- ============================================================
-- API_USAGE_LEDGER — global daily Gemini token counter, for the hard budget
-- cap. The cap value itself (GEMINI_DAILY_TOKEN_CAP) lives in application env,
-- not here, so it stays adjustable without a migration.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_usage_ledger (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_date    date        NOT NULL UNIQUE DEFAULT current_date,
  total_tokens  bigint      NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_usage_ledger ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.api_usage_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.record_api_usage(p_tokens bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.api_usage_ledger (usage_date, total_tokens)
  VALUES (current_date, p_tokens)
  ON CONFLICT (usage_date) DO UPDATE
    SET total_tokens = public.api_usage_ledger.total_tokens + p_tokens, updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_api_usage(bigint) TO service_role;

-- Callable by authenticated too — both the relay's pre-flight check and the
-- grading route run in an authenticated-user context, not service_role.
CREATE OR REPLACE FUNCTION public.get_today_api_usage()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT total_tokens FROM public.api_usage_ledger WHERE usage_date = current_date), 0);
$$;
GRANT EXECUTE ON FUNCTION public.get_today_api_usage() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_today_api_usage() FROM anon;
-- Note: the actual over-budget comparison (usage vs. GEMINI_DAILY_TOKEN_CAP)
-- happens in application code (the cap is an env var) — this function only
-- exposes the raw usage figure.

-- ============================================================
-- Hard-reset provisioning RPCs (service-role-only — these are the webhook's
-- exclusive integration point into both existing wallets). Distinct from
-- admin_grant_muendlich_minutes/admin_grant_credits, which are top-up
-- semantics for manual admin use and are left untouched.
--
-- Audit-log nuance: muendlich_credit_transactions.delta_minutes and
-- credit_transactions.delta are "change amount" everywhere else (top-ups/
-- spends are true deltas). A hard-reset breaks that semantic if we log the
-- raw grant amount, so both functions below log the ACTUAL delta
-- (new_balance - old_balance) instead, keeping the audit trail honest.
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_muendlich_subscription(p_user_id uuid, p_minutes int, p_reason text DEFAULT 'lemonsqueezy_renewal')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance int;
  v_delta       int;
BEGIN
  IF p_minutes <= 0 OR p_minutes > 300 THEN
    RAISE EXCEPTION 'Invalid minute grant amount';
  END IF;

  SELECT minutes_balance INTO v_old_balance FROM muendlich_credits WHERE user_id = p_user_id;
  v_old_balance := COALESCE(v_old_balance, 0);

  INSERT INTO muendlich_credits (user_id, is_subscribed, minutes_balance, window_started_at)
  VALUES (p_user_id, true, p_minutes, now())
  ON CONFLICT (user_id) DO UPDATE
    SET is_subscribed = true, minutes_balance = p_minutes, window_started_at = now(), updated_at = now();

  v_delta := p_minutes - v_old_balance;
  INSERT INTO muendlich_credit_transactions (user_id, delta_minutes, reason)
  VALUES (p_user_id, v_delta, p_reason);

  RETURN p_minutes;
END;
$$;
REVOKE ALL ON FUNCTION public.provision_muendlich_subscription(uuid, int, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.provision_muendlich_subscription(uuid, int, text) TO service_role;

CREATE OR REPLACE FUNCTION public.provision_essay_credits(p_user_id uuid, p_amount int, p_reason text DEFAULT 'lemonsqueezy_renewal')
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance int;
  v_delta       int;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid credit grant amount';
  END IF;

  SELECT balance INTO v_old_balance FROM public.student_credits WHERE user_id = p_user_id;
  v_old_balance := COALESCE(v_old_balance, 0);

  INSERT INTO public.student_credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = p_amount, updated_at = now();

  v_delta := p_amount - v_old_balance;
  INSERT INTO public.credit_transactions (user_id, delta, reason)
  VALUES (p_user_id, v_delta, p_reason);

  RETURN p_amount;
END;
$$;
REVOKE ALL ON FUNCTION public.provision_essay_credits(uuid, int, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.provision_essay_credits(uuid, int, text) TO service_role;

-- ============================================================
-- Single-active-Mündlich-session guard. A partial unique index can't express
-- this (the predicate would need to correlate to a joined table's live state,
-- which Postgres partial-index predicates can't do) — a BEFORE INSERT trigger
-- is the correct mechanism.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_single_active_muendlich_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM muendlich_participants p
    JOIN muendlich_rooms r ON r.id = p.room_id
    WHERE p.user_id = NEW.user_id
      AND p.room_id <> NEW.room_id
      AND r.state NOT IN ('finished', 'abandoned')
  ) THEN
    RAISE EXCEPTION 'ALREADY_IN_ACTIVE_SESSION';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_active_muendlich_session ON muendlich_participants;
CREATE TRIGGER trg_single_active_muendlich_session
  BEFORE INSERT ON muendlich_participants
  FOR EACH ROW EXECUTE FUNCTION public.check_single_active_muendlich_session();

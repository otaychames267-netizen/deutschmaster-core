-- Mündlich Phase 2, step 2: minute-metered subscription for Room 2 (the AI exam
-- room). Deliberately separate from the existing generic `subscriptions`/`plans`
-- tables (those are flat monthly-per-module; this is a hard-capped 30-day/300-
-- minute window with NO auto-renewal, matching the explicit "anti-revenue-leak"
-- requirement). Mirrors the essay-credits pattern (student_credits/
-- credit_transactions/deduct_essay_credit) from the Schreiben grading system —
-- same atomic-RPC, race-safe-by-construction approach.
--
-- Payment integration is explicitly OUT OF SCOPE for now (Stripe/D17 pending
-- account approval) — `is_subscribed` starts as a manually-set mock flag, not
-- wired to any payment webhook yet.

CREATE TABLE IF NOT EXISTS muendlich_credits (
  user_id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_subscribed     BOOLEAN     NOT NULL DEFAULT FALSE,   -- mock flag until Stripe/D17 wired
  minutes_balance   INT         NOT NULL DEFAULT 0 CHECK (minutes_balance >= 0),
  window_started_at TIMESTAMPTZ,                          -- set when a subscription/top-up is granted
  window_days       INT         NOT NULL DEFAULT 30,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE muendlich_credits IS 'Minute-metered Room 2 balance. Hard 30-day OR 300-minute cap, whichever comes first — never auto-renews. See expire_muendlich_window().';

CREATE TABLE IF NOT EXISTS muendlich_credit_transactions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta_minutes      INT         NOT NULL,                -- +N grant/top-up, -N room-2 usage
  reason             TEXT        NOT NULL,                -- 'admin_grant' | 'room2_usage' | 'window_expired'
  room_id            UUID        REFERENCES muendlich_rooms(id),
  granted_by         UUID        REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS muendlich_credit_tx_user_idx ON muendlich_credit_transactions(user_id, created_at DESC);

ALTER TABLE muendlich_credits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE muendlich_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credits select own or admin" ON muendlich_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));
CREATE POLICY "credit tx select own or admin" ON muendlich_credit_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','owner')));

-- ============================================================
-- Lazy window expiry — called at the start of any credit-checking operation
-- (no pg_cron dependency). Hard-resets is_subscribed=false, minutes=0 the
-- moment the 30-day window has elapsed. NEVER grants/renews anything.
-- ============================================================
CREATE OR REPLACE FUNCTION expire_muendlich_window(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row muendlich_credits%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM muendlich_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_row.is_subscribed
     AND v_row.window_started_at IS NOT NULL
     AND now() > v_row.window_started_at + (v_row.window_days || ' days')::INTERVAL
  THEN
    UPDATE muendlich_credits
    SET is_subscribed = FALSE, minutes_balance = 0, updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO muendlich_credit_transactions (user_id, delta_minutes, reason)
    VALUES (p_user_id, -v_row.minutes_balance, 'window_expired');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION expire_muendlich_window(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION expire_muendlich_window(UUID) FROM anon;

-- ============================================================
-- Is this user currently allowed into Room 2? (expires lazily first)
-- ============================================================
CREATE OR REPLACE FUNCTION muendlich_is_active(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row muendlich_credits%ROWTYPE;
BEGIN
  PERFORM expire_muendlich_window(p_user_id);
  SELECT * INTO v_row FROM muendlich_credits WHERE user_id = p_user_id;
  RETURN FOUND AND v_row.is_subscribed AND v_row.minutes_balance > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION muendlich_is_active(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION muendlich_is_active(UUID) FROM anon;

-- ============================================================
-- Atomic DUAL-participant deduction. A single Postgres function call is
-- already one transaction — if the second UPDATE's WHERE clause matches zero
-- rows (insufficient balance), we RAISE, and Postgres rolls back the whole
-- function automatically, undoing the first participant's deduction too. No
-- explicit BEGIN/ROLLBACK needed; that's what wrapping both updates in one
-- SECURITY DEFINER function buys us for free.
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_muendlich_minutes_dual(
  p_room_id UUID, p_user_a UUID, p_user_b UUID, p_minutes INT
)
-- Output column deliberately NOT named `user_id` — PL/pgSQL treats a RETURNS
-- TABLE column as an implicit variable in scope for the whole function body,
-- which shadows the `user_id` column referenced in this function's own WHERE
-- clauses and raises "column reference is ambiguous". Caught via live testing.
RETURNS TABLE(deducted_user_id UUID, new_balance INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal_a INT;
  v_bal_b INT;
BEGIN
  IF p_minutes <= 0 THEN RAISE EXCEPTION 'p_minutes must be positive'; END IF;

  -- Caller must be one of the two participants being charged, AND both must
  -- actually be participants of p_room_id — without this, any authenticated
  -- user could drain an arbitrary pair of strangers' minute balances.
  IF auth.uid() IS DISTINCT FROM p_user_a AND auth.uid() IS DISTINCT FROM p_user_b THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF (SELECT count(*) FROM muendlich_participants WHERE room_id = p_room_id AND user_id IN (p_user_a, p_user_b)) <> 2 THEN
    RAISE EXCEPTION 'Both users must be participants of the given room';
  END IF;

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
  -- ^ reaching here with A already deducted but B failing still rolls back A —
  -- the whole function is one transaction (see comment above).

  INSERT INTO muendlich_credit_transactions (user_id, delta_minutes, reason, room_id) VALUES
    (p_user_a, -p_minutes, 'room2_usage', p_room_id),
    (p_user_b, -p_minutes, 'room2_usage', p_room_id);

  RETURN QUERY SELECT p_user_a, v_bal_a UNION ALL SELECT p_user_b, v_bal_b;
END;
$$;
GRANT EXECUTE ON FUNCTION deduct_muendlich_minutes_dual(UUID, UUID, UUID, INT) TO authenticated;
REVOKE EXECUTE ON FUNCTION deduct_muendlich_minutes_dual(UUID, UUID, UUID, INT) FROM anon;

-- ============================================================
-- Admin grant / top-up (manual only — no auto-renewal, ever). Starts or
-- extends the 30-day window from NOW on every grant (simplest, most honest
-- interpretation of "hard 30-day window" — a top-up is a fresh window, not a
-- silent extension of a stale one).
-- ============================================================
CREATE OR REPLACE FUNCTION admin_grant_muendlich_minutes(p_user_id UUID, p_minutes INT, p_note TEXT DEFAULT 'admin_grant')
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new_balance INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_minutes <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_minutes > 300 THEN RAISE EXCEPTION 'Single grant cannot exceed the 300-minute hard cap'; END IF;

  INSERT INTO muendlich_credits (user_id, is_subscribed, minutes_balance, window_started_at)
  VALUES (p_user_id, TRUE, p_minutes, now())
  ON CONFLICT (user_id) DO UPDATE
    SET is_subscribed = TRUE,
        minutes_balance = LEAST(300, muendlich_credits.minutes_balance + p_minutes),
        window_started_at = now(),
        updated_at = now()
  RETURNING minutes_balance INTO v_new_balance;

  INSERT INTO muendlich_credit_transactions (user_id, delta_minutes, reason, granted_by)
  VALUES (p_user_id, p_minutes, p_note, auth.uid());

  RETURN v_new_balance;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_grant_muendlich_minutes(UUID, INT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_grant_muendlich_minutes(UUID, INT, TEXT) FROM anon;

CREATE OR REPLACE FUNCTION get_my_muendlich_credits()
RETURNS TABLE(is_subscribed BOOLEAN, minutes_balance INT, window_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM expire_muendlich_window(auth.uid());
  -- LEFT JOIN against a synthetic single row guarantees exactly one row comes
  -- back even when the user has no muendlich_credits row yet (a bare `WHERE
  -- user_id = auth.uid()` on zero matching rows returns zero rows, not a
  -- defaulted one — caught this exact class of bug in get_my_credit_balance
  -- for the essay-grading system earlier tonight; fixing it here up front).
  RETURN QUERY
    SELECT COALESCE(c.is_subscribed, FALSE), COALESCE(c.minutes_balance, 0),
           CASE WHEN c.window_started_at IS NULL THEN NULL ELSE c.window_started_at + (c.window_days || ' days')::INTERVAL END
    FROM (SELECT 1) AS one_row
    LEFT JOIN muendlich_credits c ON c.user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION get_my_muendlich_credits() TO authenticated;
REVOKE EXECUTE ON FUNCTION get_my_muendlich_credits() FROM anon;

-- D17 v4 Phase 16: close a race condition found during a security audit.
-- runVerificationPipeline reads attempts_used ONCE at pipeline start, checks
-- it against the configured cap, then makes a multi-second Gemini call
-- before ever inserting the attempt row (which is what the existing
-- d17_increment_attempts AFTER INSERT trigger actually increments).
-- Concurrent requests for the same order all read the same stale count and
-- can all pass the check — an attacker firing parallel requests can exceed
-- both the burst (3-in-10-min) and per-order (5) caps.
--
-- Fixed with a BEFORE INSERT trigger that takes a row lock on the parent
-- d17_orders row (SELECT ... FOR UPDATE) before checking either cap —
-- Postgres serializes concurrent transactions trying to lock the SAME row,
-- so a second concurrent insert-attempt blocks until the first one's whole
-- transaction (including the AFTER INSERT increment) commits, at which
-- point it re-evaluates against the now-current count. This is real
-- atomicity, not just a narrower race window. The one-active-order-per-user
-- unique index means a user can only ever have concurrent attempts against
-- ONE order at a time, so locking per-order-row also effectively serializes
-- the per-user burst check.
--
-- Also fixes a real discrepancy this audit surfaced: the existing
-- d17_increment_attempts trigger increments attempts_used unconditionally,
-- even for admin-replay attempts — contradicting admin-actions.functions.ts's
-- own documented intent ("does NOT increment attempts_used — a replay is
-- free, not a new student attempt"). Both triggers now correctly exempt
-- is_admin_replay rows.
CREATE OR REPLACE FUNCTION public.d17_increment_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin_replay IS NOT TRUE THEN
    UPDATE public.d17_orders SET attempts_used = attempts_used + 1, updated_at = now() WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.d17_enforce_attempt_caps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_attempts   int;
  v_max_attempts     int;
  v_burst_limit      int;
  v_recent_10min     int;
  v_user_id          uuid;
BEGIN
  IF NEW.is_admin_replay IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Row lock on the parent order — the actual serialization point. Any
  -- second concurrent attempt-insert for the same order blocks here until
  -- the first transaction fully commits.
  SELECT attempts_used, user_id INTO v_order_attempts, v_user_id
    FROM public.d17_orders WHERE id = NEW.order_id FOR UPDATE;

  SELECT COALESCE((value)::text::int, 5) INTO v_max_attempts
    FROM public.platform_settings WHERE key = 'd17_max_attempts_per_order';
  v_max_attempts := COALESCE(v_max_attempts, 5);

  IF v_order_attempts >= v_max_attempts THEN
    RAISE EXCEPTION 'd17_enforce_attempt_caps: order % already has % attempts (max %)', NEW.order_id, v_order_attempts, v_max_attempts;
  END IF;

  SELECT COALESCE((value)::text::int, 3) INTO v_burst_limit
    FROM public.platform_settings WHERE key = 'd17_ten_minute_submission_limit';
  v_burst_limit := COALESCE(v_burst_limit, 3);

  SELECT count(*) INTO v_recent_10min
    FROM public.d17_verification_attempts
    WHERE user_id = v_user_id AND created_at >= now() - interval '10 minutes';

  IF v_recent_10min >= v_burst_limit THEN
    RAISE EXCEPTION 'd17_enforce_attempt_caps: user % already has % attempts in the last 10 minutes (limit %)', v_user_id, v_recent_10min, v_burst_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_d17_enforce_attempt_caps ON public.d17_verification_attempts;
CREATE TRIGGER trg_d17_enforce_attempt_caps
  BEFORE INSERT ON public.d17_verification_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.d17_enforce_attempt_caps();

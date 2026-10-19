-- D17 v4 Phase 18: HTTP-level rate limiting on D17 endpoints. Only
-- business-logic "verified attempt" counters existed before (the
-- burst/hourly caps in verify.functions.ts) — raw request flooding against
-- createD17Order/submitVerificationAttempt/getD17Order was unthrottled;
-- each request does several DB queries regardless of whether it eventually
-- throws, so this is a real cost-amplification/DoS vector distinct from the
-- "3 uploads in 10 minutes" business rule.
--
-- Fixed-window counter, DB-backed (no Redis/queue infra — matches this
-- system's established architecture constraint). check_and_increment_rate_limit
-- is a single atomic UPSERT (INSERT ... ON CONFLICT DO UPDATE), safe under
-- concurrency the same way the attempt-cap trigger is.
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

-- Old windows are cheap to accumulate (one row per key per window) but
-- unbounded over time — opportunistic pruning inside the check function
-- itself keeps this self-cleaning with no cron (matches this app's
-- established "no cron exists" lazy-cleanup pattern).
CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx ON public.api_rate_limits (window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies — service-role-only, same posture as platform_settings/kill switch.

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max_requests int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count int;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.api_rate_limits (bucket_key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start) DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  -- Opportunistic prune of windows old enough they can never be queried
  -- again (1 hour is comfortably past every rate-limit window this app
  -- uses) — runs on ~1% of calls so it doesn't add latency to every request.
  IF random() < 0.01 THEN
    DELETE FROM public.api_rate_limits WHERE window_start < now() - interval '1 hour';
  END IF;

  RETURN v_count <= p_max_requests;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) TO service_role;

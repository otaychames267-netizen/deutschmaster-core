-- ============================================================
-- Production audit finding (Medium): get_platform_setting(p_key text) is a
-- SECURITY DEFINER function granted EXECUTE to `anon` with zero internal
-- restriction on which key can be read — verified live that a completely
-- unauthenticated request (just the public anon key, no session) can pull
-- every D17 fraud-detection tuning value: auto-approve confidence
-- threshold, attempt caps (burst/hourly), suspension durations. Knowing
-- these exact numbers helps an attacker calibrate exactly how many
-- verification attempts they can make and how to pace them to stay under
-- the rate-limit/attempt-cap trip-wires.
--
-- First attempt at this fix (auth.uid() IS NULL passthrough) was WRONG and
-- didn't close the hole: an anon-key Postman request has auth.uid() = NULL
-- (no `sub` claim) exactly like a real service-role call does, since
-- neither represents a signed-in user — auth.uid() alone can't distinguish
-- "anonymous public request" from "trusted internal service-role request".
-- Verified this empirically (the first version of this migration still
-- leaked every value to a real anon-key test call) before landing on the
-- correct check: auth.role(), which reflects the actual JWT `role` claim
-- PostgREST sets for the request (anon/authenticated/service_role) and is
-- unaffected by SECURITY DEFINER's owner-privilege escalation.
--
-- This doesn't affect internal app code, which already reads
-- platform_settings via a direct service-role table SELECT
-- (src/lib/d17/config.ts, src/lib/d17/payment-config.ts), not through this
-- RPC — those bypass RLS/grants entirely as service_role and are
-- unaffected either way.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_platform_setting(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_keys text[] := ARRAY['d17_disabled', 'payment_verification_kill_switch'];
BEGIN
  IF p_key = ANY(v_public_keys) THEN
    RETURN (SELECT value FROM public.platform_settings WHERE key = p_key);
  END IF;

  IF auth.role() = 'service_role' OR public.is_d17_staff(auth.uid()) THEN
    RETURN (SELECT value FROM public.platform_settings WHERE key = p_key);
  END IF;

  RETURN NULL;
END;
$$;

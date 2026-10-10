-- ============================================================
-- Production audit finding (Low/Medium): check_and_increment_rate_limit and
-- record_api_usage were both grantable to anon/authenticated with no
-- internal auth check, unlike every other privileged D17 RPC
-- (activate_d17_order, provision_essay_credits,
-- provision_muendlich_subscription, set_platform_setting), which are all
-- already service_role-only. Grepped the whole src/ tree and confirmed
-- both are exclusively called server-side via supabaseAdmin
-- (rate-limit.server.ts, verify.functions.ts, admin-actions.functions.ts,
-- essay-grader-gemini.ts) — no legitimate client-side caller exists.
--
-- Exploitability if left open:
-- - check_and_increment_rate_limit(p_key, ...): p_key is just an arbitrary
--   caller-supplied string, not tied to auth.uid() — an attacker who knows
--   (or guesses) another user's UUID could pre-poison that user's own
--   rate-limit bucket (e.g. "submitVerificationAttempt:<victim-uuid>") to
--   deny them legitimate D17 uploads before they even try.
-- - record_api_usage(p_tokens): repeated direct calls with an inflated
--   token count exhaust the daily Gemini budget ledger early, forcing
--   isBudgetExceeded() to route every D17 verification attempt for every
--   user into manual_review for the rest of the day — a cheap way to
--   degrade the automated-approval path platform-wide.
--
-- Both are now service_role-only, matching every sibling privileged RPC.
-- ============================================================

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.record_api_usage(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_api_usage(bigint) TO service_role;

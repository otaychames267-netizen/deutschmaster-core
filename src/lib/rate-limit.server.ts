/**
 * Thin wrapper around check_and_increment_rate_limit (see
 * 20260715040000_d17_v4_rate_limiting.sql) — a DB-backed, atomic, fixed-
 * window rate limiter. No Redis/queue infra, matching this app's
 * established architecture constraint. Not a *.server.ts import-hazard
 * concern here since this file is itself already server-only and always
 * dynamically imported by its callers.
 */
export async function checkRateLimit(
  supabaseAdmin: any,
  params: { key: string; windowSeconds: number; maxRequests: number },
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("check_and_increment_rate_limit", {
    p_key: params.key,
    p_window_seconds: params.windowSeconds,
    p_max_requests: params.maxRequests,
  });
  if (error) {
    // Fail OPEN, not closed: a rate-limiter outage must never itself become
    // a way to deny legitimate payment verification. Errors are still
    // visible in server logs for investigation.
    console.error("[rate-limit] check failed, allowing request:", error.message);
    return true;
  }
  return data === true;
}

export async function assertNotRateLimited(
  supabaseAdmin: any,
  params: { key: string; windowSeconds: number; maxRequests: number },
): Promise<void> {
  const allowed = await checkRateLimit(supabaseAdmin, params);
  if (!allowed) {
    throw new Error("Too many requests. Please wait a moment and try again.");
  }
}

/** Structured result so callers that need to know whether delivery actually
 * succeeded (see src/lib/auth/confirmation-email.server.ts's retry+log
 * wrapper) can act on it — existing fire-and-forget callers are unaffected
 * since they never inspected the old `void` return. */
export interface SendEmailResult {
  ok: boolean;
  /** Resend's own message id on success — the durable cross-reference for
   * looking a send up in Resend's dashboard/API later. */
  id: string | null;
  /** HTTP status Resend returned, or null if the request itself threw
   * (network error, timeout) before a response was ever received. */
  status: number | null;
  error: string | null;
}

/**
 * Pluggable transactional email sender via Resend's plain REST API (no SDK
 * dependency needed). Build-ahead-of-credentials pattern: no-ops and logs
 * when RESEND_API_KEY is unset, so callers never need to branch on whether
 * email is configured — same pattern already proven for Lemon Squeezy's
 * checkout (src/lib/billing/checkout.functions.ts's mock-checkout fallback).
 * Real key activates this with zero code changes.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const { to, subject, html } = params;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] (RESEND_API_KEY not set, not sent) to=${to} subject="${subject}"`);
    return { ok: false, id: null, status: null, error: "RESEND_API_KEY not set" };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "AuraLingovia <noreply@auralingoviatestdeutsch.academy>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errText = body ? JSON.stringify(body).slice(0, 500) : "";
      console.error(`[email] Resend send failed (${res.status}) to=${to}: ${errText}`);
      return { ok: false, id: null, status: res.status, error: errText || `HTTP ${res.status}` };
    }
    return { ok: true, id: body?.id ?? null, status: res.status, error: null };
  } catch (err) {
    console.error(`[email] Resend send threw, to=${to}:`, err);
    return { ok: false, id: null, status: null, error: err instanceof Error ? err.message : String(err) };
  }
}

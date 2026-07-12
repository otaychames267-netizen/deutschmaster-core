/**
 * Pluggable transactional email sender via Resend's plain REST API (no SDK
 * dependency needed). Build-ahead-of-credentials pattern: no-ops and logs
 * when RESEND_API_KEY is unset, so callers never need to branch on whether
 * email is configured — same pattern already proven for Lemon Squeezy's
 * checkout (src/lib/billing/checkout.functions.ts's mock-checkout fallback).
 * Real key activates this with zero code changes.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const { to, subject, html } = params;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] (RESEND_API_KEY not set, not sent) to=${to} subject="${subject}"`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "AuraLingovia <noreply@auralingovia.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[email] Resend send failed (${res.status}) to=${to}: ${errText.slice(0, 500)}`);
    }
  } catch (err) {
    console.error(`[email] Resend send threw, to=${to}:`, err);
  }
}

/**
 * confirmation-email.server.ts — the authoritative, monitored confirmation-
 * email pipeline. Replaces reliance on Supabase Auth's own SMTP-triggered
 * mailer for this critical path.
 *
 * ROOT CAUSE this exists to fix (investigated 2026-07-29): Supabase Auth's
 * SMTP password is only editable via the Dashboard UI — the Management
 * API's PATCH for that one field has repeatedly proven unreliable (silent
 * no-ops, or wiping the value entirely), and there is no way for this app
 * to detect a broken value: Supabase's own signup endpoint returns 200 OK
 * regardless of whether its internal SMTP send succeeds, so a broken
 * smtp_pass produces zero errors anywhere in this app's logs. Confirmed
 * live on 2026-07-29: the currently configured smtp_pass does not even
 * match Resend's key format and Resend's own API rejects it outright
 * ("API key is invalid") — while this app's own RESEND_API_KEY (used below,
 * already proven reliable for D17 notification emails) is unaffected,
 * since it's a completely separate credential on a completely separate
 * code path.
 *
 * The fix: never let Supabase's own mailer be the only delivery attempt.
 * `generateLink()` creates/looks up the user and returns a real, valid
 * confirmation link WITHOUT Supabase ever attempting to send anything
 * itself — so this is not "in addition to" Supabase's mailer, it's a full
 * replacement for it. Delivery then goes through the same Resend HTTP API
 * path already relied on elsewhere in this app, wrapped in retry-with-
 * backoff and logged to auth_email_log (see the migration of the same
 * name) for permanent visibility — see src/routes/_authenticated.admin.email-log.tsx.
 */
import { sendEmail } from "@/lib/notify/email.server";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 4000]; // between attempts 1->2 and 2->3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function confirmationEmailHtml(actionLink: string, fullName: string): string {
  const greeting = fullName ? `Hi ${fullName},` : "Hi,";
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #111;">Confirm your email address</h2>
      <p>${greeting}</p>
      <p>Thanks for signing up for AuraLingovia. Click the button below to confirm your email and activate your account.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${actionLink}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm email address</a>
      </p>
      <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${actionLink}</p>
      <p style="color: #666; font-size: 13px;">If you didn't create this account, you can safely ignore this email.</p>
    </div>
  `;
}

/**
 * Writes the initial `retrying` row, attempts delivery up to MAX_ATTEMPTS
 * times with backoff, updates the row to its final state, and returns
 * whether delivery ultimately succeeded. Never throws — a delivery failure
 * must never block account creation (matching this app's existing
 * never-let-email-break-the-core-flow precedent, e.g. D17's notifyAndEmail).
 */
async function sendAndLog(
  supabaseAdmin: any,
  params: { userId: string | null; email: string; emailType: "signup_confirmation" | "resend_confirmation"; actionLink: string; fullName: string },
): Promise<boolean> {
  const { data: logRow, error: insertError } = await supabaseAdmin
    .from("auth_email_log")
    .insert({ user_id: params.userId, email: params.email, email_type: params.emailType, status: "retrying" })
    .select("id")
    .single();
  if (insertError || !logRow) {
    console.error("[confirmation-email] could not create auth_email_log row:", insertError);
  }
  const logId = logRow?.id as string | undefined;

  const subject = params.emailType === "signup_confirmation" ? "Confirm your AuraLingovia email address" : "Your AuraLingovia confirmation link";
  const html = confirmationEmailHtml(params.actionLink, params.fullName);

  let lastError: string | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await sendEmail({ to: params.email, subject, html });
    if (logId) {
      await supabaseAdmin
        .from("auth_email_log")
        .update({ attempt_count: attempt, last_attempted_at: new Date().toISOString() })
        .eq("id", logId);
    }
    if (result.ok) {
      if (logId) {
        await supabaseAdmin
          .from("auth_email_log")
          .update({ status: "sent", provider_message_id: result.id, sent_at: new Date().toISOString(), error_message: null })
          .eq("id", logId);
      }
      return true;
    }
    lastError = result.error;
    // Only retry on failures that are plausibly transient (network error/
    // no status, or a 5xx/429 from Resend) — a 4xx like a malformed
    // recipient address will never succeed on retry, so don't waste
    // attempts on it.
    const transient = result.status === null || result.status >= 500 || result.status === 429;
    if (!transient || attempt === MAX_ATTEMPTS) break;
    await sleep(RETRY_DELAYS_MS[attempt - 1]);
  }

  if (logId) {
    await supabaseAdmin.from("auth_email_log").update({ status: "failed", error_message: lastError }).eq("id", logId);
  }
  console.error(`[confirmation-email] delivery FAILED after retries: to=${params.email} type=${params.emailType} error=${lastError}`);
  return false;
}

/**
 * The registration path. Creates the user via generateLink (type: 'signup')
 * — this is the ONLY step that touches auth.users; Supabase never attempts
 * its own send. On success, delivers the confirmation email ourselves.
 * Returns a shape compatible with what api.auth.register.ts's existing
 * frontend contract expects (an error with .message on failure).
 */
export async function createUserAndSendConfirmation(
  supabaseAdmin: any,
  params: { email: string; password: string; fullName: string; redirectTo?: string },
): Promise<{ ok: true; userId: string } | { ok: false; status: number; errorCode: string; message: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email: params.email,
    password: params.password,
    options: { data: { full_name: params.fullName }, ...(params.redirectTo ? { redirectTo: params.redirectTo } : {}) },
  });

  if (error || !data?.properties?.action_link || !data.user) {
    // Mirrors the error shape api.auth.register.ts already returns to the
    // frontend for a failed /auth/v1/signup call (error_code + message),
    // so register.tsx needs no changes to its error handling.
    const status = typeof error?.status === "number" ? error.status : 400;
    return {
      ok: false,
      status,
      errorCode: error?.code ?? "SIGNUP_FAILED",
      message: error?.message ?? "Could not create account.",
    };
  }

  // Fire-and-forget from the caller's perspective — the account is already
  // created and must be returned to the client regardless of delivery
  // outcome (a failed send is retried automatically and is visible in the
  // admin dashboard either way; it must never turn into a 500 for a
  // student who successfully created an account).
  void sendAndLog(supabaseAdmin, {
    userId: data.user.id,
    email: params.email,
    emailType: "signup_confirmation",
    actionLink: data.properties.action_link,
    fullName: params.fullName,
  });

  return { ok: true, userId: data.user.id };
}

/**
 * The "Resend verification email" path, for an EXISTING unconfirmed user.
 * Deliberately uses generateLink's 'magiclink' type, NOT 'signup': magiclink
 * requires no password (the frontend never has it, nor should it), never
 * touches the stored credential, and — like every GoTrue verification
 * type — confirms the email as a side effect of a successful click, which
 * is exactly the outcome "resend confirmation" needs.
 */
export async function resendConfirmationEmail(
  supabaseAdmin: any,
  params: { email: string; redirectTo?: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: params.email,
    options: params.redirectTo ? { redirectTo: params.redirectTo } : {},
  });

  if (error || !data?.properties?.action_link || !data.user) {
    return { ok: false, message: error?.message ?? "Could not generate a new confirmation link." };
  }

  const delivered = await sendAndLog(supabaseAdmin, {
    userId: data.user.id,
    email: params.email,
    emailType: "resend_confirmation",
    actionLink: data.properties.action_link,
    fullName: (data.user.user_metadata as { full_name?: string } | null)?.full_name ?? "",
  });

  if (!delivered) {
    return { ok: false, message: "We couldn't send the email right now. Please try again in a moment." };
  }
  return { ok: true };
}

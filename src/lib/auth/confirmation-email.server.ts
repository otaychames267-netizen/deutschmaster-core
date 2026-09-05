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

function passwordRecoveryEmailHtml(actionLink: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #111;">Reset your password</h2>
      <p>We received a request to reset your AuraLingovia password. Click the button below to choose a new one.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${actionLink}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a>
      </p>
      <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${actionLink}</p>
      <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    </div>
  `;
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
  params: { userId: string | null; email: string; emailType: "signup_confirmation" | "resend_confirmation" | "password_recovery"; actionLink: string; fullName: string },
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

  const subject =
    params.emailType === "signup_confirmation" ? "Confirm your AuraLingovia email address"
    : params.emailType === "password_recovery" ? "Reset your AuraLingovia password"
    : "Your AuraLingovia confirmation link";
  const html = params.emailType === "password_recovery"
    ? passwordRecoveryEmailHtml(params.actionLink)
    : confirmationEmailHtml(params.actionLink, params.fullName);

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

  // MUST be awaited, not fire-and-forget: confirmed live (2026-07-29) that
  // an un-awaited call here never actually runs on Vercel's serverless
  // runtime — the function is frozen/terminated the instant the HTTP
  // response is sent, so the "background" send silently never happens and
  // every auth_email_log row was stuck at status='retrying' forever. This
  // was caught by testing the deployed fix against real production, not by
  // local dev (which has no such runtime-freeze behavior) — exactly why
  // step 5 of the task ("test everything before deployment... repeat until
  // it succeeds") matters. sendAndLog() never throws (it catches and logs
  // internally), so awaiting it here still can't turn a successful account
  // creation into a failed HTTP response — a slow/failing send only adds
  // latency to this request, it can't fail it.
  await sendAndLog(supabaseAdmin, {
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

/**
 * Password recovery — the flow this whole module was, until 2026-08-04,
 * missing. It kept calling supabase.auth.resetPasswordForEmail() directly,
 * which still depends on the same broken smtp_pass documented above; a real
 * user requesting a reset got back the raw GoTrue 500
 * {"error_code":"unexpected_failure","msg":"Error sending recovery email"}.
 * Same fix as signup: generateLink({type:'recovery'}) never lets Supabase
 * attempt its own send, we deliver via Resend ourselves.
 *
 * Security note this function must preserve: the caller (the API route)
 * must ALWAYS report success to the client regardless of what happens here
 * — whether the email doesn't belong to any account, or our own send fails
 * — exactly matching resetPasswordForEmail's own anti-enumeration behavior
 * (never reveal whether an email is registered). Real failures are still
 * fully visible via auth_email_log for admins; nothing is silently lost,
 * it's just not surfaced to whoever is sitting at the form.
 */
export async function sendPasswordRecoveryEmail(
  supabaseAdmin: any,
  params: { email: string; redirectTo?: string },
): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: params.redirectTo ? { redirectTo: params.redirectTo } : {},
  });

  if (error || !data?.properties?.action_link || !data.user) {
    // Almost always just "no account with this email" — expected, frequent,
    // and must never be distinguishable from success to the caller.
    console.log(`[password-recovery] generateLink no-op for ${params.email}: ${error?.message ?? "no user"}`);
    return;
  }

  await sendAndLog(supabaseAdmin, {
    userId: data.user.id,
    email: params.email,
    emailType: "password_recovery",
    actionLink: data.properties.action_link,
    fullName: (data.user.user_metadata as { full_name?: string } | null)?.full_name ?? "",
  });
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side "resend confirmation email" — replaces the client's direct
 * supabase.auth.resend({ type: "signup" }) call, which (like the original
 * registration flow) depended entirely on Supabase Auth's own SMTP-
 * triggered mailer. This goes through the same owned, logged, retried
 * pipeline as registration (see confirmation-email.server.ts).
 *
 * Targets the CALLER'S OWN email only (derived from their session, never
 * accepted as input) — this can't be used to spam an arbitrary address.
 * Rate-limited per user to match the existing 30s client-side cooldown
 * with a real server-side floor behind it.
 */
export const resendConfirmationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = context.claims.email;
    if (!email) {
      throw new Error("No email address on this account.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `resendConfirmation:${context.userId}`, windowSeconds: 30, maxRequests: 1 });

    // getSiteUrl() falls back to window.location.origin when unset, which
    // doesn't exist in this server handler — read the env var directly
    // instead, matching the same canonical production URL it resolves to
    // client-side (see src/lib/site-url.ts).
    const siteUrl = (process.env.VITE_SITE_URL ?? "").trim().replace(/\/$/, "");
    const { resendConfirmationEmail: doResend } = await import("./confirmation-email.server");
    const result = await doResend(supabaseAdmin, { email, redirectTo: siteUrl ? `${siteUrl}/dashboard` : undefined });

    if (!result.ok) {
      throw new Error(result.message);
    }
    return { ok: true };
  });

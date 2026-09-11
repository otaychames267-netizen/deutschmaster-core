import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-side password-recovery proxy — replaces the client's direct
 * supabase.auth.resetPasswordForEmail() call. That call depends on
 * Supabase Auth's own SMTP-triggered mailer, which is configured against a
 * smtp_pass that Resend has been rejecting outright ("535 Authentication
 * credentials invalid" — reproduced directly against the Auth API and
 * confirmed in the Auth service logs on 2026-08-04). Every real recovery
 * request was hitting that 500 and surfacing "Error sending recovery
 * email" straight to the user. Same root cause, and same fix, as
 * api.auth.register.ts: generateLink() creates the recovery link without
 * Supabase attempting to send anything; this app delivers it itself via
 * Resend, with retry + permanent logging (auth_email_log).
 *
 * Rate limiting is new here and deliberate: the public GoTrue /recover
 * endpoint this replaces had its own built-in abuse throttling, which is
 * bypassed entirely by calling generateLink() through the admin API
 * server-side. Without a replacement, this endpoint would have no throttle
 * at all. IP + email are both capped — email additionally, since (unlike
 * registration) a fixed target email is always known up front here.
 */

const IP_WINDOW_SECONDS = 60 * 60;
const IP_MAX_ATTEMPTS = 10;
const EMAIL_WINDOW_SECONDS = 60 * 60;
const EMAIL_MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: string; redirect_to?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const email = (body.email ?? "").trim().toLowerCase();
        if (!email) {
          return Response.json({ error: "Email is required" }, { status: 400 });
        }

        const req = getRequest() ?? request;
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");

        const [ipAllowed, emailAllowed] = await Promise.all([
          checkRateLimit(supabaseAdmin, { key: `forgot-password-ip:${ip}`, windowSeconds: IP_WINDOW_SECONDS, maxRequests: IP_MAX_ATTEMPTS }),
          checkRateLimit(supabaseAdmin, { key: `forgot-password-email:${email}`, windowSeconds: EMAIL_WINDOW_SECONDS, maxRequests: EMAIL_MAX_ATTEMPTS }),
        ]);
        if (!ipAllowed || !emailAllowed) {
          console.warn(`[forgot-password] rate-limited ip=${ip} email=${email}`);
          // Same anti-enumeration rule as below: a rate-limited request
          // still reports generic success, never a distinguishable error.
          return Response.json({ ok: true });
        }

        const { sendPasswordRecoveryEmail } = await import("@/lib/auth/confirmation-email.server");
        try {
          await sendPasswordRecoveryEmail(supabaseAdmin, { email, redirectTo: body.redirect_to });
        } catch (err) {
          // sendPasswordRecoveryEmail itself never throws (generateLink
          // failures are handled internally) — this is a genuine
          // last-resort guard so an unexpected error still can't leak
          // whether the email exists via a different response shape.
          console.error(`[forgot-password] unexpected error for email=${email}:`, err);
        }

        console.log(`[forgot-password] processed ip=${ip} email=${email}`);
        return Response.json({ ok: true });
      },
    },
  },
});

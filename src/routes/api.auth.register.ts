import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-side registration proxy — mass-registration/bot protection the
 * direct client-side supabase.auth.signUp() call had none of. Same pattern
 * as api/auth/login.ts. Rate-limited by IP only (not email — an attacker
 * spamming registrations always varies the email, so IP is the only stable
 * signal available before an account exists).
 *
 * A relatively generous cap (10/hour/IP): shared networks (university wifi,
 * offices, mobile carrier NAT) can legitimately have several real signups
 * from the same apparent IP in an hour, and this must never block a
 * legitimate wave of real students. This is a floor against obvious bot
 * spam, not a precise per-user gate — full disposable-email-domain
 * blocking and CAPTCHA are still open follow-ups (see the security audit
 * report), each needing a decision or third-party credentials this session
 * doesn't have.
 *
 * Account creation + confirmation-email delivery deliberately do NOT go
 * through Supabase Auth's public /auth/v1/signup REST endpoint anymore —
 * that endpoint always triggers Supabase's own SMTP-triggered mailer,
 * which depends on a Dashboard-only smtp_pass field that has repeatedly
 * proven unreliable to keep correct (see confirmation-email.server.ts's
 * header comment for the full investigation). generateLink() creates the
 * user without Supabase attempting to send anything; this app delivers the
 * email itself via Resend, with retry + permanent logging.
 */

const IP_WINDOW_SECONDS = 60 * 60;
const IP_MAX_ATTEMPTS = 10;

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: string; password?: string; full_name?: string; email_redirect_to?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const email = (body.email ?? "").trim().toLowerCase();
        const password = body.password ?? "";
        if (!email || !password) {
          return Response.json({ error: "Email and password are required" }, { status: 400 });
        }
        if (password.length < 8) {
          return Response.json({ error: "WEAK_PASSWORD", message: "Password must be at least 8 characters." }, { status: 400 });
        }

        const req = getRequest() ?? request;
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");

        const ipAllowed = await checkRateLimit(supabaseAdmin, {
          key: `register-ip:${ip}`,
          windowSeconds: IP_WINDOW_SECONDS,
          maxRequests: IP_MAX_ATTEMPTS,
        });
        if (!ipAllowed) {
          console.warn(`[register] rate-limited ip=${ip} email=${email}`);
          return Response.json(
            { error: "TOO_MANY_ATTEMPTS", message: "Too many registration attempts from this network. Please try again later." },
            { status: 429 },
          );
        }

        const { createUserAndSendConfirmation } = await import("@/lib/auth/confirmation-email.server");
        const result = await createUserAndSendConfirmation(supabaseAdmin, {
          email,
          password,
          fullName: body.full_name ?? "",
          redirectTo: body.email_redirect_to,
        });

        if (!result.ok) {
          console.warn(`[register] failed ip=${ip} email=${email} status=${result.status} code=${result.errorCode}`);
          return Response.json({ error: result.errorCode, message: result.message }, { status: result.status });
        }

        console.log(`[register] success ip=${ip} email=${email} user_id=${result.userId}`);
        return Response.json({ id: result.userId, email });
      },
    },
  },
});

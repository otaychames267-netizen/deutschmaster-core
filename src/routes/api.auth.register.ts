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
 * Account creation deliberately does NOT go through Supabase Auth's public
 * /auth/v1/signup REST endpoint — that endpoint always triggers Supabase's
 * own SMTP-triggered mailer, whose reliability this app has never been able
 * to fully trust (see confirmation-email.server.ts's 2026-07-29 history).
 * Creates the user (unconfirmed) via generateLink and emails a short code
 * (createUserAndSendCode) — the client verifies it inline via
 * /api/auth/verify-code without ever leaving the registration page or
 * clicking a link.
 */

const IP_WINDOW_SECONDS = 60 * 60;
const IP_MAX_ATTEMPTS = 10;

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: string; password?: string; full_name?: string };
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

        const { createUserAndSendCode } = await import("@/lib/auth/confirmation-email.server");
        const result = await createUserAndSendCode(supabaseAdmin, {
          email,
          password,
          fullName: body.full_name ?? "",
        });

        if (!result.ok) {
          console.warn(`[register] failed ip=${ip} email=${email} status=${result.status} code=${result.errorCode}`);
          return Response.json({ error: result.errorCode, message: result.message }, { status: result.status });
        }

        console.log(`[register] success, code sent ip=${ip} email=${email} user_id=${result.userId}`);
        return Response.json({ id: result.userId, email });
      },
    },
  },
});

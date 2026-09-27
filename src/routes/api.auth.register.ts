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
 * own SMTP-triggered mailer to send a confirmation email, and real users
 * kept mistaking that required step for a broken signup (see
 * createConfirmedUser's doc comment, 2026-09-27). The user is created
 * already confirmed via the admin API, then immediately signed in
 * server-side (same token-endpoint call api/auth/login.ts uses) so the
 * response carries a real session the client can hydrate — no separate
 * login step, no email to check.
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

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !ANON_KEY) {
          return new Response("Server not configured", { status: 503 });
        }

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

        const { createConfirmedUser } = await import("@/lib/auth/confirmation-email.server");
        const result = await createConfirmedUser(supabaseAdmin, {
          email,
          password,
          fullName: body.full_name ?? "",
        });

        if (!result.ok) {
          console.warn(`[register] failed ip=${ip} email=${email} status=${result.status} code=${result.errorCode}`);
          return Response.json({ error: result.errorCode, message: result.message }, { status: result.status });
        }

        // Sign the freshly-created (already-confirmed) user in immediately —
        // same token-endpoint call api/auth/login.ts uses — so the client
        // gets a real session in this same response instead of needing a
        // separate login step or an email to click.
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({ email, password }),
        });
        const authBody = await authRes.json();
        if (!authRes.ok) {
          // The account WAS created successfully — this would only be a
          // transient GoTrue hiccup on the immediately-following sign-in
          // call. Tell the client to fall back to the normal login page
          // rather than reporting the registration itself as failed.
          console.error(`[register] account created but auto-login failed ip=${ip} email=${email} status=${authRes.status}`);
          return Response.json({ id: result.userId, email, autoLoginFailed: true });
        }

        console.log(`[register] success ip=${ip} email=${email} user_id=${result.userId}`);
        return Response.json(authBody);
      },
    },
  },
});

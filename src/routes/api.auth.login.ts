import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-side login proxy — brute-force protection the direct client-side
 * supabase.auth.signInWithPassword() call had none of. Confirmed live
 * (2026-07-20): 8 rapid wrong-password attempts against the same account
 * all returned 400 invalid_credentials with zero backoff.
 *
 * Rate-limited two ways using the same DB-backed atomic limiter D17 already
 * uses (check_and_increment_rate_limit — no new migration needed):
 *   - per email: 5 attempts / 15 minutes (credential-stuffing a single account)
 *   - per IP:   20 attempts / 15 minutes (spraying many accounts from one source)
 * Both are checked BEFORE the Supabase Auth call, so a locked-out caller
 * never even reaches it. Every attempt (allowed or blocked, success or
 * failure) is logged server-side — no dedicated audit table exists yet, so
 * this is Vercel function-log based today; a queryable table is a
 * reasonable follow-up if the volume ever warrants it.
 *
 * Deliberately not wired into an app-level CAPTCHA (hCaptcha/Turnstile):
 * that requires a third-party account + site/secret keys this session has
 * no credentials for and cannot provision.
 */

const EMAIL_WINDOW_SECONDS = 15 * 60;
const EMAIL_MAX_ATTEMPTS = 5;
const IP_WINDOW_SECONDS = 15 * 60;
const IP_MAX_ATTEMPTS = 20;

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !ANON_KEY) {
          return new Response("Server not configured", { status: 503 });
        }

        let body: { email?: string; password?: string };
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

        const req = getRequest() ?? request;
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");

        const emailAllowed = await checkRateLimit(supabaseAdmin, {
          key: `login-email:${email}`,
          windowSeconds: EMAIL_WINDOW_SECONDS,
          maxRequests: EMAIL_MAX_ATTEMPTS,
        });
        const ipAllowed = await checkRateLimit(supabaseAdmin, {
          key: `login-ip:${ip}`,
          windowSeconds: IP_WINDOW_SECONDS,
          maxRequests: IP_MAX_ATTEMPTS,
        });

        if (!emailAllowed || !ipAllowed) {
          console.warn(`[login] rate-limited email=${email} ip=${ip} emailAllowed=${emailAllowed} ipAllowed=${ipAllowed}`);
          return Response.json(
            { error: "TOO_MANY_ATTEMPTS", message: "Too many login attempts. Please wait a few minutes and try again." },
            { status: 429 },
          );
        }

        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({ email, password }),
        });
        const authBody = await authRes.json();

        if (!authRes.ok) {
          console.warn(`[login] failed email=${email} ip=${ip} status=${authRes.status} code=${authBody?.error_code ?? authBody?.code}`);
          return Response.json(
            { error: authBody?.error_code ?? "AUTH_FAILED", message: authBody?.msg ?? authBody?.error_description ?? "Invalid login credentials" },
            { status: authRes.status },
          );
        }

        console.log(`[login] success email=${email} ip=${ip}`);
        return Response.json(authBody);
      },
    },
  },
});

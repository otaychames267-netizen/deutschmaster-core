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
 */

const IP_WINDOW_SECONDS = 60 * 60;
const IP_MAX_ATTEMPTS = 10;

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !ANON_KEY) {
          return new Response("Server not configured", { status: 503 });
        }

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

        // Supabase Auth's REST signup endpoint takes the post-verification
        // redirect as a `redirect_to` query param, not a body field (that's
        // an artifact of the client SDK's options.emailRedirectTo, which
        // itself just forwards it this way).
        const signupUrl = new URL(`${SUPABASE_URL}/auth/v1/signup`);
        if (body.email_redirect_to) signupUrl.searchParams.set("redirect_to", body.email_redirect_to);

        const signupRes = await fetch(signupUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({
            email,
            password,
            data: { full_name: body.full_name ?? "" },
          }),
        });
        const signupBody = await signupRes.json();

        if (!signupRes.ok) {
          console.warn(`[register] failed ip=${ip} email=${email} status=${signupRes.status} code=${signupBody?.error_code ?? signupBody?.code}`);
          return Response.json(
            { error: signupBody?.error_code ?? "SIGNUP_FAILED", message: signupBody?.msg ?? signupBody?.error_description ?? "Could not create account." },
            { status: signupRes.status },
          );
        }

        console.log(`[register] success ip=${ip} email=${email}`);
        return Response.json(signupBody);
      },
    },
  },
});

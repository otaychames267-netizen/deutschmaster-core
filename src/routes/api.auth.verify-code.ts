import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Verifies the code createUserAndSendCode() emailed during registration and,
 * on success, returns a real session — GoTrue's own /auth/v1/verify
 * endpoint confirms the email AND signs the user in as one atomic call
 * (confirmed empirically this session), so there's no separate sign-in step
 * needed here the way register/login proxies elsewhere in this app have.
 *
 * Rate-limited per email only (not IP): the attacker's goal here is
 * brute-forcing one specific victim's 6-8 digit code, which is inherently
 * tied to the email being targeted, not the caller's network.
 */

const EMAIL_WINDOW_SECONDS = 15 * 60;
const EMAIL_MAX_ATTEMPTS = 8;

export const Route = createFileRoute("/api/auth/verify-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
        if (!SUPABASE_URL || !ANON_KEY) {
          return new Response("Server not configured", { status: 503 });
        }

        let body: { email?: string; code?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const email = (body.email ?? "").trim().toLowerCase();
        const code = (body.code ?? "").trim();
        if (!email || !code) {
          return Response.json({ error: "Email and code are required" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");

        const emailAllowed = await checkRateLimit(supabaseAdmin, {
          key: `verify-code-email:${email}`,
          windowSeconds: EMAIL_WINDOW_SECONDS,
          maxRequests: EMAIL_MAX_ATTEMPTS,
        });
        if (!emailAllowed) {
          const req = getRequest() ?? request;
          const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
          console.warn(`[verify-code] rate-limited email=${email} ip=${ip}`);
          return Response.json(
            { error: "TOO_MANY_ATTEMPTS", message: "Too many attempts. Please wait a few minutes and try again." },
            { status: 429 },
          );
        }

        const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON_KEY },
          body: JSON.stringify({ type: "signup", email, token: code }),
        });
        const verifyBody = await verifyRes.json();

        if (!verifyRes.ok) {
          console.warn(`[verify-code] failed email=${email} status=${verifyRes.status} code=${verifyBody?.error_code ?? verifyBody?.code}`);
          return Response.json(
            { error: verifyBody?.error_code ?? "INVALID_CODE", message: verifyBody?.msg ?? verifyBody?.error_description ?? "That code is incorrect or has expired." },
            { status: verifyRes.status },
          );
        }

        // Same single-session enforcement api/auth/login.ts applies on every
        // real sign-in — best-effort, never blocks a successful verification.
        if (verifyBody?.access_token) {
          supabaseAdmin.auth.admin.signOut(verifyBody.access_token, "others").catch((e: unknown) => {
            console.error(`[verify-code] single-session revoke failed email=${email}:`, e);
          });
        }

        console.log(`[verify-code] success email=${email}`);
        return Response.json(verifyBody);
      },
    },
  },
});

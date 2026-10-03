import { createFileRoute } from "@tanstack/react-router";

/**
 * Re-sends a fresh signup code for the still-unconfirmed account
 * api.auth.register.ts just created. Reuses createUserAndSendCode() itself
 * — generateLink({type:'signup'}) against an existing unconfirmed email
 * issues a brand-new code and automatically invalidates the previous one
 * (confirmed empirically this session), so no separate "resend" primitive
 * is needed. Requires the password back from the client because
 * generateLink's signup type needs one — register.tsx still holds it in
 * memory from the registration form on this same page, so the user never
 * has to retype it.
 */

const EMAIL_WINDOW_SECONDS = 15 * 60;
const EMAIL_MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/auth/resend-code")({
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { checkRateLimit } = await import("@/lib/rate-limit.server");

        const emailAllowed = await checkRateLimit(supabaseAdmin, {
          key: `resend-code-email:${email}`,
          windowSeconds: EMAIL_WINDOW_SECONDS,
          maxRequests: EMAIL_MAX_ATTEMPTS,
        });
        if (!emailAllowed) {
          console.warn(`[resend-code] rate-limited email=${email}`);
          return Response.json(
            { error: "TOO_MANY_ATTEMPTS", message: "Too many resend attempts. Please wait a few minutes and try again." },
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
          console.warn(`[resend-code] failed email=${email} status=${result.status} code=${result.errorCode}`);
          return Response.json({ error: result.errorCode, message: result.message }, { status: result.status });
        }

        console.log(`[resend-code] success email=${email}`);
        return Response.json({ ok: true });
      },
    },
  },
});

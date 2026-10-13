import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

/**
 * Landing point for every OAuth redirect (Google, and any provider added
 * later). Deliberately NOT under `_authenticated` — at the moment Google
 * redirects back here there is no session yet from _authenticated.tsx's
 * point of view, so nesting under that guard would bounce straight to
 * /login before the code exchange below ever runs.
 *
 * supabase-js's default `detectSessionInUrl: true` already exchanges the
 * `?code=` param for a session automatically when the client initializes
 * on this page — no manual exchangeCodeForSession() call needed (and
 * calling it a second time would fail: PKCE codes are single-use). This
 * page's only job is to wait for that exchange to land, then do a HARD
 * navigation to /dashboard — the same "hard nav, not client nav" fix
 * documented in login.tsx: AuthProvider only reliably picks up a fresh
 * session via its own initial getSession() call on a real remount, not via
 * the SIGNED_IN event alone.
 */
function AuthCallbackPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setErrorMsg(oauthError);
      return;
    }

    pollRef.current = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        window.location.href = "/dashboard";
      }
    }, 300);

    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setErrorMsg("Sign-in is taking longer than expected. Please try again.");
    }, 15000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
        <GraduationCap className="h-6 w-6 text-primary-foreground" />
      </div>
      {errorMsg ? (
        <>
          <p className="text-sm font-medium text-destructive">{errorMsg}</p>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Back to login
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </>
      )}
    </div>
  );
}

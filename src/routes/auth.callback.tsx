import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reportClientError } from "@/lib/client-error-report";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
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
 *
 * 2026-10-16: a student on a phone saw "Sign-in is taking longer than
 * expected" with no way to tell why. When the exchange FAILS (PKCE verifier
 * missing because the flow was started in another tab/browser or a second
 * Google tab overwrote it, code already used or expired, network) supabase-js
 * only logs to the console and getSession() just keeps returning "no
 * session" — so the old page waited out a fixed 15 s and showed a generic
 * line. initialize() resolves with the REAL error of that exchange, so we now
 * react to it at once, write it to client_error_log, and offer "try again"
 * (a fresh Google flow fixes every one of those causes). A slow mobile
 * network gets 45 s with a "still working" hint instead of 15 s.
 */
const SLOW_HINT_MS = 8_000;
const GIVE_UP_MS = 45_000;

function AuthCallbackPage() {
  const [phase, setPhase] = useState<"working" | "slow" | "failed">("working");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let finished = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let poll: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      finished = true;
      if (poll) clearInterval(poll);
      timers.forEach(clearTimeout);
    };
    const toDashboard = () => {
      if (finished) return;
      stop();
      window.location.href = "/dashboard";
    };
    const fail = (message: string, step: string) => {
      if (finished) return;
      stop();
      setDetail(message);
      setPhase("failed");
      // the callback URL carries a one-time code, so log the bare path only
      reportClientError("window", new Error(message), { where: "auth-callback", step, path: "/auth/callback" });
    };
    // a session that is already there (e.g. a reloaded callback tab whose code was used a moment ago) is a success, not an error
    const sessionOrFail = async (message: string, step: string) => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return toDashboard();
      } catch { /* fall through to the error */ }
      fail(message, step);
    };

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      fail(oauthError, "provider-error");
      return stop;
    }

    poll = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) toDashboard();
    }, 300);

    timers.push(setTimeout(() => { if (!finished) setPhase("slow"); }, SLOW_HINT_MS));
    timers.push(setTimeout(() => { void sessionOrFail("Sign-in did not finish in time", "timeout"); }, GIVE_UP_MS));

    // Resolves with the real outcome of the code exchange (the same promise supabase-js already runs — no second exchange). Two failure shapes:
    //  - error: the exchange itself failed (used/expired code, bad flow state, network);
    //  - no error but no session: supabase-js does not even treat the URL as a PKCE callback because the code verifier is missing from this
    //    browser's storage (flow started in another tab/browser, storage cleared) — the old page just spun until its timeout in that case.
    void supabase.auth.initialize().then(({ error }) => {
      void sessionOrFail(
        error?.message || "No sign-in in progress here: the sign-in was started in another tab or browser, or its data was cleared",
        error ? "exchange" : "no-pkce-callback",
      );
    });

    return stop;
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
        <GraduationCap className="h-6 w-6 text-primary-foreground" />
      </div>
      {phase === "failed" ? (
        <>
          <p className="max-w-xs text-sm font-medium text-destructive">We couldn&apos;t finish signing you in with Google.</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            This usually happens when the sign-in was started in another tab or browser, the link expired, or the connection dropped. Just try again.
          </p>
          <div className="w-full max-w-xs">
            <GoogleAuthButton />
          </div>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Back to login
          </a>
          {detail && <p className="max-w-xs break-words text-[11px] text-muted-foreground/70">{detail}</p>}
        </>
      ) : (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
          {phase === "slow" && <p className="max-w-xs text-xs text-muted-foreground">Your connection looks slow — still working, please keep this page open.</p>}
        </>
      )}
    </div>
  );
}

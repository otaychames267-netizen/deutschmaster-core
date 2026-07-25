import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [checking, setChecking]         = useState(true);
  const checkedForRef                   = useRef<string | null>(null);
  const redirectedToLoginRef            = useRef(false);

  /* Redirect unauthenticated users */
  useEffect(() => {
    if (!loading && !user) {
      if (redirectedToLoginRef.current) return;
      redirectedToLoginRef.current = true;
      nav({ to: "/login", replace: true });
    }
  }, [user?.id, loading, nav]);

  /* Gate unverified emails before anything else can render. A user must have
   * clicked their confirmation link (email_confirmed_at set) to reach
   * onboarding or any content — otherwise fake/unowned emails could sign up
   * and use the app freely. */
  const emailVerified = !!user?.email_confirmed_at;
  useEffect(() => {
    if (!user) return;
    if (!emailVerified && !loc.pathname.startsWith("/verify-email")) {
      nav({ to: "/verify-email", replace: true });
    } else if (emailVerified && loc.pathname.startsWith("/verify-email")) {
      nav({ to: "/dashboard", replace: true });
    }
  }, [user?.id, emailVerified, loc.pathname, nav]);

  /* Check onboarding completion.
   *
   * Two real, confirmed bugs lived here, both from the same underlying
   * flaw: checkedForRef.current was claimed SYNCHRONOUSLY, before the
   * async profile query resolved. Any second invocation of this effect
   * while that query was still in flight would see the ref already
   * claimed for this user and skip its own check entirely — silently
   * discarding whatever the in-flight query eventually returned, and
   * never redirecting to /onboarding. Caught live: a real never-onboarded
   * account landed straight on /dashboard after a normal login.
   *
   * 1. loc.pathname was a dependency — login.tsx navigates to /dashboard
   *    immediately after sign-in, before this query can resolve, and that
   *    navigation alone re-triggers this effect mid-flight. Fixed by
   *    reading the current path via a ref instead, so the "don't
   *    redirect if already on /onboarding" loop-guard doesn't require
   *    the effect to re-run on every navigation.
   * 2. Independently of (1), React 18 Strict Mode's dev-only
   *    mount→cleanup→remount double-invocation hits the exact same flaw
   *    on EVERY mount, not just this specific login race — confirmed via
   *    real network-log inspection showing the profiles query firing
   *    twice back-to-back with the first attempt's result discarded.
   *    Fixed at the root: checkedForRef is now only claimed AFTER the
   *    query actually completes (inside the non-cancelled branch), so a
   *    cancelled run never blocks the run that replaces it — each
   *    invocation either finishes the check or cleanly gets out of the
   *    way, with no "claimed but never finished" state possible.
   */
  const pathRef = useRef(loc.pathname);
  pathRef.current = loc.pathname;

  useEffect(() => {
    if (!user || !emailVerified) return;
    redirectedToLoginRef.current = false;

    if (checkedForRef.current === user.id) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    // Safety net: never let the app hang on the loading screen forever if
    // this check stalls (slow network, a rejected promise nothing below
    // catches). Onboarding-redirect is a UX nicety, not the security
    // boundary (real content access is separately RLS-gated per-table) —
    // so timing out into "just show the page" is the safe failure mode.
    // Mirrors the identical pattern already proven in useAuth (src/lib/auth.tsx).
    const safety = setTimeout(() => {
      if (!cancelled) { cancelled = true; setChecking(false); }
    }, 8000);

    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed, level")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        clearTimeout(safety);
        checkedForRef.current = user.id;

        const needsOnboarding = !data || !data.onboarding_completed || !data.level;
        if (needsOnboarding && !pathRef.current.startsWith("/onboarding")) {
          nav({ to: "/onboarding", replace: true });
          return;
        }
        setChecking(false);
      } catch {
        // Query rejected outright (network failure, etc.) — fail open into
        // "just show the page" rather than hang; do NOT claim checkedForRef
        // so a later successful check for this user can still run.
        if (!cancelled) { cancelled = true; setChecking(false); }
      }
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, [user?.id, emailVerified, nav]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  /* Unverified users only ever see the verify-email holding page */
  if (!emailVerified) {
    return loc.pathname.startsWith("/verify-email") ? <Outlet /> : <LoadingScreen />;
  }

  if (checking && !loc.pathname.startsWith("/onboarding")) {
    return <LoadingScreen />;
  }

  /* Onboarding has its own full-screen layout */
  if (loc.pathname.startsWith("/onboarding")) {
    return <Outlet />;
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto p-5 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

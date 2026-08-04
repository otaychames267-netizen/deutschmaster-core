import { createFileRoute, Outlet, useNavigate, useLocation, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

/** The one subtree a signed-out visitor may browse: the B2 Schriftlich
 * catalog preview (titles + the 4 free samples per section, everything else
 * shown locked). Includes the Schriftlich landing page itself (`/b2/schriftlich`)
 * — it's pure navigation chrome with no personal data, and it's also the page
 * the sidebar's "Schriftlich" link actually points to, so excluding it used to
 * bounce a guest straight to the login page the moment they clicked the most
 * obvious nav item, before they'd seen any content at all. B1 stays gated
 * (LevelLayout's useB1Visible check never runs for a guest anyway, since this
 * pattern only matches /b2), and Prüfung/Mündlich/account/admin pages all
 * still require a real session — those are genuine locked sections, so
 * hitting them redirecting to login is correct, not a bug. */
const GUEST_ALLOWED_PATTERN = /^\/b2\/schriftlich(\/vorbereitung(\/|$)|\/?$)/;

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const isGuestAllowedPath = GUEST_ALLOWED_PATTERN.test(loc.pathname);

  const [checking, setChecking]         = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const checkedForRef                   = useRef<string | null>(null);
  const redirectedToLoginRef            = useRef(false);

  /* Redirect unauthenticated users — except into the guest-browsable
   * preview subtree above, which renders with no session at all. */
  useEffect(() => {
    if (!loading && !user) {
      if (GUEST_ALLOWED_PATTERN.test(loc.pathname)) return;
      if (redirectedToLoginRef.current) return;
      redirectedToLoginRef.current = true;
      nav({ to: "/login", replace: true });
    }
  }, [user?.id, loading, nav, loc.pathname]);

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
   *
   * 3. A third, separate bug on top of those two: calling nav() directly
   *    from inside this async effect's callback was observed live on
   *    production to sometimes never actually change the route at all —
   *    the query completes, checkedForRef gets claimed, yet the app is
   *    stuck on LoadingScreen forever (reproduced repeatedly for brand-new
   *    not-yet-onboarded accounts specifically). Fixed by not calling
   *    nav() here at all: this effect only sets state now, and the render
   *    body below declares the redirect via <Navigate>, the same pattern
   *    already proven reliable elsewhere (LevelGatePage's redirect).
   */
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

        // Set state and let the render below decide whether to redirect,
        // via a declarative <Navigate> — instead of calling nav() directly
        // from inside this async callback, which was observed live to
        // sometimes never actually change the route (the exact mechanism is
        // still unclear, but a real, reproducible hang was confirmed on
        // production for every brand-new not-yet-onboarded account: the
        // profile query completes fine, yet the app never leaves the
        // loading screen). <Navigate> rendered from the component body is
        // the same pattern already proven reliable elsewhere in this app
        // (LevelGatePage's /$level/dashboard redirect).
        setNeedsOnboarding(!data || !data.onboarding_completed || !data.level);
        setChecking(false);
      } catch {
        // Query rejected outright (network failure, etc.) — fail open into
        // "just show the page" rather than hang; do NOT claim checkedForRef
        // so a later successful check for this user can still run.
        if (!cancelled) { cancelled = true; setChecking(false); }
      }
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, [user?.id, emailVerified]);

  if (loading) {
    return <LoadingScreen />;
  }

  /* Guest preview: no session, on the one subtree that allows it — render
   * the same shell a logged-in visitor gets (AppHeader/AppSidebar already
   * degrade gracefully with user=null), skipping every session-only check
   * below (email verification, onboarding) since none of them apply. */
  if (!user) {
    if (!isGuestAllowedPath) {
      return <LoadingScreen />; // redirect to /login is already in flight
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

  /* Unverified users only ever see the verify-email holding page */
  if (!emailVerified) {
    return loc.pathname.startsWith("/verify-email") ? <Outlet /> : <LoadingScreen />;
  }

  if (checking) {
    return <LoadingScreen />;
  }

  if (needsOnboarding && !loc.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
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

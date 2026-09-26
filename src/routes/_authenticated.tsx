import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

/** No unauthenticated access to any content route, full stop (per explicit
 * product decision) — this includes the Hören-only guest-preview carve-out
 * that used to live here. A signed-out visitor must reach /login before
 * anything under /_authenticated renders. HoerenTeilPage still contains its
 * own guest-specific locked-preview branch, but it is now unreachable dead
 * code from a security standpoint — the route guard below is what actually
 * keeps guests out, not that component's internal isGuest handling. */

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [checking, setChecking]         = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const checkedForRef                   = useRef<string | null>(null);
  const redirectedToLoginRef            = useRef(false);
  const redirectedToOnboardingRef       = useRef(false);

  /* Redirect unauthenticated users to /login unconditionally. */
  useEffect(() => {
    if (!loading && !user) {
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
   *    nav() here at all: this effect only sets state now.
   *
   * 4. A fourth bug, found later: the render body used to declare the
   *    redirect via a bare `<Navigate to="/onboarding" replace />` (mirroring
   *    LevelGatePage's own redirect pattern). That's fine for a leaf route
   *    with nothing nested under it, but here it let a child route
   *    (LevelGatePage, mounted at the sibling /dashboard path) render and
   *    fire its OWN redirect before this effect's async profile query
   *    resolved — the two redirects fought each other every render, a real
   *    "Maximum update depth exceeded" crash confirmed live for a brand-new
   *    not-yet-onboarded account landing on bare /dashboard. Fixed by moving
   *    the redirect into its own ref-guarded effect below (same pattern as
   *    redirectedToLoginRef — a plain synchronous effect, not nested inside
   *    this async callback, so bug #3 above doesn't apply) and rendering
   *    LoadingScreen instead of Outlet while needsOnboarding is true, so no
   *    child route can mount until the redirect has actually happened.
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

        // Only set state here — do not call nav() directly from inside this
        // async callback (bug #3 above). The dedicated effect further below
        // owns the actual redirect once this state commits.
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

  /* Fire the onboarding redirect exactly once, from an effect — not
   * declaratively from the render body. Rendering <Navigate> directly in the
   * render body (the previous approach) meant every re-render while
   * needsOnboarding stayed true produced a fresh <Navigate> element; a real,
   * reproducible "Maximum update depth exceeded" crash was caught live for a
   * brand-new not-yet-onboarded account landing on the bare /dashboard
   * route — its own LevelGatePage briefly renders and fires its own
   * redirect to /$level/dashboard before this check's async profile query
   * resolves, and the two redirects fight each other on every subsequent
   * render. A ref-guarded single call (same pattern as redirectedToLoginRef
   * above) cannot repeat regardless of the exact race, and rendering
   * LoadingScreen instead of Outlet while needsOnboarding is true keeps
   * LevelGatePage (or any other child route) from mounting at all until the
   * redirect has actually happened.
   *
   * A FIFTH bug, found live on production right after deploying the fix
   * above: TanStack Router's nav() silently no-ops here when the current
   * route is /$level/dashboard (a route with a required path param) —
   * confirmed via direct React fiber inspection in production: needsOnboarding
   * was correctly true, redirectedToOnboardingRef.current was correctly set
   * to true (proving nav() was actually called), yet the router's own
   * location never changed, leaving the account stuck on this LoadingScreen
   * forever with zero errors. Same failure class as the nav()-from-async-
   * effect bug already documented above, just a different trigger. Fixed the
   * same way this codebase already fixes every other confirmed nav()
   * reliability issue (see login.tsx and _authenticated.onboarding.tsx's own
   * comments) — a hard navigation instead of the client-side router call. */
  useEffect(() => {
    if (needsOnboarding) {
      if (loc.pathname.startsWith("/onboarding") || redirectedToOnboardingRef.current) return;
      redirectedToOnboardingRef.current = true;
      window.location.href = "/onboarding";
    } else {
      redirectedToOnboardingRef.current = false;
    }
  }, [needsOnboarding, loc.pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  /* No session at all — the redirect to /login above is already in flight;
   * never render any content route in the meantime. */
  if (!user) {
    return <LoadingScreen />;
  }

  /* Unverified users only ever see the verify-email holding page */
  if (!emailVerified) {
    return loc.pathname.startsWith("/verify-email") ? <Outlet /> : <LoadingScreen />;
  }

  if (checking) {
    return <LoadingScreen />;
  }

  if (needsOnboarding && !loc.pathname.startsWith("/onboarding")) {
    // The effect above owns navigating away — never render Outlet (and so
    // never mount a child route like LevelGatePage) while that's pending.
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
        <FloatingWhatsAppButton />
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

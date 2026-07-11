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

  /* Check onboarding completion */
  useEffect(() => {
    if (!user || !emailVerified) return;
    redirectedToLoginRef.current = false;

    if (checkedForRef.current === user.id) {
      setChecking(false);
      return;
    }
    checkedForRef.current = user.id;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed, level")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const needsOnboarding = !data || !data.onboarding_completed || !data.level;
      if (needsOnboarding && !loc.pathname.startsWith("/onboarding")) {
        nav({ to: "/onboarding", replace: true });
        return;
      }
      setChecking(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, emailVerified, loc.pathname, nav]);

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

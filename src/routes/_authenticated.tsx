import { createFileRoute, Outlet, useNavigate, useLocation, useNavigate as _u } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Moon, Sun, Globe, User as UserIcon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
      setChecking(false);
      if (data && !data.onboarding_completed && !loc.pathname.startsWith("/onboarding")) {
        nav({ to: "/onboarding", replace: true });
      }
    })();
  }, [user, loc.pathname, nav]);
  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (checking && !loc.pathname.startsWith("/onboarding")) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (loc.pathname.startsWith("/onboarding")) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1"><Outlet /></main>
        <Footer />
      </div>
    );
  }
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 px-4 py-6 md:px-6 animate-in fade-in duration-200"><Outlet /></main>
          <Footer />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
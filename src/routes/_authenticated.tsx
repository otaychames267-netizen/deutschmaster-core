import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LayoutDashboard, User, CreditCard, Shield, Bell, Settings, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, isAdmin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useTranslation();
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto flex-1 flex flex-col md:flex-row gap-6 px-4 py-6">
        <aside className="md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1 text-sm overflow-x-auto">
            <SideLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>{t("nav.dashboard")}</SideLink>
            <SideLink to="/learn" icon={<GraduationCap className="h-4 w-4" />}>Learn</SideLink>
            <SideLink to="/profile" icon={<User className="h-4 w-4" />}>{t("nav.profile")}</SideLink>
            <SideLink to="/billing" icon={<CreditCard className="h-4 w-4" />}>{t("nav.billing")}</SideLink>
            <SideLink to="/security" icon={<Shield className="h-4 w-4" />}>{t("nav.security")}</SideLink>
            <SideLink to="/notifications" icon={<Bell className="h-4 w-4" />}>Notifications</SideLink>
            {isAdmin && <SideLink to="/admin" icon={<Settings className="h-4 w-4" />}>{t("nav.admin")}</SideLink>}
          </nav>
        </aside>
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
      <Footer />
    </div>
  );
}

function SideLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent" activeOptions={{ exact: false }}>
      {icon}<span>{children}</span>
    </Link>
  );
}
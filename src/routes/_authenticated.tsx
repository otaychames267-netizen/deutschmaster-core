import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LayoutDashboard, User, CreditCard, Shield, Bell, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, isAdmin } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);
  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto flex-1 flex flex-col md:flex-row gap-6 px-4 py-6">
        <aside className="md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1 text-sm overflow-x-auto">
            <SideLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>{t("nav.dashboard")}</SideLink>
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
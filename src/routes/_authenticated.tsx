import { createFileRoute, Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Moon, Sun, Globe, User as UserIcon, GraduationCap, Bell, CreditCard, X } from "lucide-react";
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
  const lastOnboardingCheckRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loading && !user) {
      console.debug("[Lingovia diagnostics] AuthLayout redirect to login", { pathname: loc.pathname });
      nav({ to: "/login" });
    }
  }, [user?.id, loading, loc.pathname, nav]);
  useEffect(() => {
    if (!user) return;
    const checkKey = `${user.id}:${loc.pathname}`;
    if (lastOnboardingCheckRef.current === checkKey) return;
    lastOnboardingCheckRef.current = checkKey;
    (async () => {
      console.debug("[Lingovia diagnostics] AuthLayout onboarding check", { userId: user.id, pathname: loc.pathname });
      const { data } = await supabase.from("profiles").select("onboarding_completed, level").eq("id", user.id).maybeSingle();
      const needsOnboarding = !data || !data.onboarding_completed || !data.level;
      if (needsOnboarding && !loc.pathname.startsWith("/onboarding")) {
        console.debug("[Lingovia diagnostics] AuthLayout redirect to onboarding", { pathname: loc.pathname });
        nav({ to: "/onboarding", replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [user?.id, loc.pathname, nav]);
  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (checking && !loc.pathname.startsWith("/onboarding")) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (loc.pathname.startsWith("/onboarding")) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/80 px-4 backdrop-blur">
          <Link to="/" className="flex items-center gap-2 font-bold"><GraduationCap className="h-5 w-5 text-accent" /> Lingovia</Link>
        </header>
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

const LANGS = [
  { code: "en", label: "English" }, { code: "de", label: "Deutsch" }, { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" }, { code: "es", label: "Español" }, { code: "it", label: "Italiano" }, { code: "tr", label: "Türkçe" },
];

function TopBar() {
  const { theme, toggle } = useTheme();
  const { i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("dm-sidebar-hint-seen");
    if (!seen) {
      const t = setTimeout(() => setShowHint(true), 600);
      return () => clearTimeout(t);
    }
  }, []);
  const dismissHint = () => {
    setShowHint(false);
    try { window.localStorage.setItem("dm-sidebar-hint-seen", "1"); } catch {}
  };
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-4">
      <div className="relative">
        <SidebarTrigger onClick={dismissHint} />
        {showHint && (
          <div
            role="dialog"
            className="absolute left-0 top-full mt-2 z-50 w-64 rounded-lg border border-accent/40 bg-popover text-popover-foreground shadow-xl p-3 animate-in fade-in slide-in-from-top-1"
          >
            <div className="absolute -top-1.5 left-3 h-3 w-3 rotate-45 border-l border-t border-accent/40 bg-popover" />
            <div className="flex items-start gap-2">
              <div className="flex-1 text-xs leading-snug">
                <p className="font-semibold mb-0.5">Tipp</p>
                <p className="text-muted-foreground">Click here to expand your learning workspace.</p>
              </div>
              <button
                onClick={dismissHint}
                aria-label="Hinweis schließen"
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={dismissHint}
              className="mt-2 text-[11px] font-medium text-accent hover:underline"
            >
              Verstanden
            </button>
          </div>
        )}
      </div>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" onClick={() => nav({ to: "/billing" })} title="Abrechnung"><CreditCard className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => nav({ to: "/notifications" })} title="Benachrichtigungen"><Bell className="h-4 w-4" /></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><Globe className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANGS.map((l) => <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)}>{l.label}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="icon" onClick={toggle}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><UserIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground" disabled>{user?.email}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => nav({ to: "/profile" })}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={async () => { await signOut(); window.location.href = "/"; }}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
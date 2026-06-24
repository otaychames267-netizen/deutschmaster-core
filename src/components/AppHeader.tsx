import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Moon, Sun, Bell, Globe, LogOut, User,
  CreditCard, Shield, ChevronRight,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import i18n, { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

/* Map route segments → readable labels */
const BREADCRUMB_MAP: Record<string, string> = {
  dashboard:     "Dashboard",
  schriftlich:   "Schriftlich",
  muendlich:     "Mündlich",
  vorbereitung:  "Vorbereitung",
  pruefung:      "Prüfungssimulation",
  lesen:         "Lesen",
  hoeren:        "Hören",
  schreiben:     "Schreiben",
  sprachbausteine: "Sprachbausteine",
  statistik:     "Statistik",
  profile:       "Profil",
  billing:       "Abonnement",
  security:      "Sicherheit",
  notifications: "Benachrichtigungen",
  referrals:     "Empfehlungen",
  help:          "Hilfe",
  admin:         "Admin",
  analytics:     "Analytics",
  users:         "Users",
  exercises:     "Exercises",
  plans:         "Plans",
  subscriptions: "Subscriptions",
  "teil-1":      "Teil 1",
  "teil-2":      "Teil 2",
  "teil-3":      "Teil 3",
  beschwerde:    "Beschwerde",
  bitte:         "Bitte um Info",
};

function Breadcrumbs() {
  const state = useRouterState();
  const pathname = state.location.pathname;

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => BREADCRUMB_MAP[s] ?? s);

  if (segments.length <= 1) return null;

  return (
    <nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
          <span className={i === segments.length - 1 ? "font-medium text-foreground" : ""}>
            {seg}
          </span>
        </span>
      ))}
    </nav>
  );
}

function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-1 ring-primary/30">
      {initials}
    </div>
  );
}

export function AppHeader() {
  const { theme, toggle }   = useTheme();
  const { user, signOut }   = useAuth();

  const displayName = user?.user_metadata?.full_name as string | undefined;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Breadcrumbs />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-0.5">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Globe className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {SUPPORTED_LANGUAGES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={i18n.language === l.code ? "font-medium text-primary" : ""}
              >
                <span className="mr-2 text-base">{l.flag}</span>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-muted">
              <UserAvatar name={displayName} email={user?.email} />
              <div className="hidden max-w-[120px] flex-col sm:flex">
                <span className="truncate text-xs font-medium text-foreground leading-tight">
                  {displayName ?? user?.email?.split("@")[0]}
                </span>
                <span className="truncate text-[10px] text-muted-foreground leading-tight">
                  {user?.email}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-foreground">{displayName ?? user?.email?.split("@")[0]}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/billing" className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" /> Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/security" className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

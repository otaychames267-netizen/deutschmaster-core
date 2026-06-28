import { useTheme } from "@/lib/theme";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Moon, Sun, Bell, Globe, LogOut, User,
  CreditCard, Shield, ChevronRight, Flame, Zap,
  Search, X, CheckCircle2, AlertCircle, Info, Command,
  BookOpen, ArrowRight,
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
import { useUserProgress } from "@/lib/useUserProgress";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Breadcrumb map ────────────────────────────────────────────── */
const BREADCRUMB_MAP: Record<string, string> = {
  dashboard:       "Dashboard",
  schriftlich:     "Schriftlich",
  muendlich:       "Mündlich",
  vorbereitung:    "Vorbereitung",
  pruefung:        "Prüfungssimulation",
  lesen:           "Lesen",
  hoeren:          "Hören",
  schreiben:       "Schreiben",
  sprachbausteine: "Sprachbausteine",
  statistik:       "Statistik",
  profile:         "Profil",
  billing:         "Abonnement",
  security:        "Sicherheit",
  notifications:   "Benachrichtigungen",
  referrals:       "Empfehlungen",
  help:            "Hilfe",
  admin:           "Admin",
  analytics:       "Analytics",
  users:           "Benutzer",
  exercises:       "Exercises",
  plans:           "Plans",
  subscriptions:   "Subscriptions",
  "teil-1":        "Teil 1",
  "teil-2":        "Teil 2",
  "teil-3":        "Teil 3",
  beschwerde:      "Beschwerde",
  bitte:           "Bitte um Info",
  roles:           "Roles",
  settings:        "Settings",
  "pdf-import":    "PDF Import",
  search:          "Suche",
  referrals2:      "Referrals",
};

function Breadcrumbs() {
  const state = useRouterState();
  const pathname = state.location.pathname;
  const segments = pathname.split("/").filter(Boolean)
    .map((s) => ({ raw: s, label: BREADCRUMB_MAP[s] ?? s }));
  if (segments.length <= 1) return null;
  const paths: string[] = [];
  segments.forEach((_, i) => {
    paths.push("/" + segments.slice(0, i + 1).map(s => s.raw).join("/"));
  });
  return (
    <nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[140px]">{seg.label}</span>
            ) : (
              <Link to={paths[i] as never} className="hover:text-foreground transition-colors truncate max-w-[100px]">
                {seg.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ─── Search modal ──────────────────────────────────────────────── */
interface ExamResult { id: string; title: string; section: string; teil: number | null; }

const SECTION_ROUTES: Record<string, string> = {
  lesen:           "/schriftlich/vorbereitung/lesen",
  hoeren:          "/schriftlich/vorbereitung/hoeren",
  schreiben:       "/schriftlich/vorbereitung/schreiben",
  sprachbausteine: "/schriftlich/vorbereitung/sprachbausteine",
};

const QUICK_LINKS = [
  { label: "Schriftlich Vorbereitung", to: "/schriftlich/vorbereitung", icon: BookOpen,    color: "text-blue-500" },
  { label: "Mündlich Vorbereitung",    to: "/muendlich",                icon: BookOpen,    color: "text-rose-500" },
  { label: "Statistik",                to: "/statistik",                icon: ArrowRight,  color: "text-violet-500" },
  { label: "Referral Program",         to: "/referrals",                icon: ArrowRight,  color: "text-emerald-500" },
];

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (!q || q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.from("exams")
        .select("id, title, section, teil")
        .ilike("title", `%${q}%`)
        .limit(8);
      setResults((data as ExamResult[]) ?? []);
      setLoading(false);
    }, 250);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function goTo(path: string) {
    navigate({ to: path as never });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search lessons, sections, exercises…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
          {!loading && query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
              <button onClick={() => goTo("/search")} className="text-xs font-medium text-primary hover:underline">
                Open full search →
              </button>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-1">
              <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Exercises
              </p>
              {results.map((r) => {
                const baseRoute = SECTION_ROUTES[r.section] ?? "/dashboard";
                const href = r.teil ? `${baseRoute}/teil-${r.teil}` : baseRoute;
                return (
                  <button
                    key={r.id}
                    onClick={() => goTo(href)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.section}{r.teil ? ` · Teil ${r.teil}` : ""}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick links */}
          {!query && (
            <div className="py-1">
              <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Quick navigation
              </p>
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.to}
                  onClick={() => goTo(link.to)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <link.icon className={`h-4 w-4 shrink-0 ${link.color}`} />
                  <span className="text-sm text-foreground">{link.label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-4 py-2.5 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">⏎ to navigate · Esc to close</p>
          <button onClick={() => goTo("/search")} className="text-[10px] font-medium text-primary hover:underline">
            Advanced search →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Notification dropdown ─────────────────────────────────────── */
const NOTIF_ICONS = {
  success: { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-500" },
  warning: { icon: AlertCircle,  bg: "bg-amber-500/10",   text: "text-amber-500"   },
  info:    { icon: Info,          bg: "bg-blue-500/10",    text: "text-blue-500"    },
  system:  { icon: Zap,           bg: "bg-primary/10",     text: "text-primary"     },
};

interface Notif {
  id: string;
  type: "success" | "warning" | "info" | "system";
  title: string;
  body: string;
  read: boolean;
}

function buildNotifications(sub: { status: string; expires_at: string } | null): Notif[] {
  const items: Notif[] = [
    { id: "welcome", type: "success", title: "Welcome to AuraLingovia", body: "Start practising to boost your TELC score.", read: false },
  ];
  if (sub?.status === "trial") {
    const days = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000);
    items.push({ id: "trial", type: "warning", title: "Trial ending soon", body: `Your free trial expires in ${days} day${days !== 1 ? "s" : ""}.`, read: false });
  }
  return items;
}

/* ─── User avatar ───────────────────────────────────────────────── */
function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (email?.[0] ?? "U").toUpperCase();
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-[10px] font-black text-primary-foreground ring-1 ring-primary/30">
      {initials}
    </div>
  );
}

/* ─── Main header ───────────────────────────────────────────────── */
export function AppHeader() {
  const { theme, toggle }     = useTheme();
  const { user, signOut }     = useAuth();
  const { progress }          = useUserProgress();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [notifsLoaded, setNotifsLoaded] = useState(false);
  const [subDaysLeft, setSubDaysLeft] = useState<number | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const displayName = user?.user_metadata?.full_name as string | undefined;

  // Load subscription days remaining
  useEffect(() => {
    if (!user) return;
    supabase.from("subscriptions")
      .select("status, expires_at")
      .eq("user_id", user.id)
      .in("status", ["active", "trial"])
      .limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const days = Math.max(0, Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 86400000));
          setSubDaysLeft(days);
          setSubStatus(data.status);
        }
      });
  }, [user?.id]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (notifsLoaded || !user) return;
    const { data } = await supabase.from("subscriptions")
      .select("status, expires_at").eq("user_id", user.id)
      .in("status", ["active", "trial"]).limit(1).maybeSingle();
    setNotifications(buildNotifications(data));
    setNotifsLoaded(true);
  }, [user, notifsLoaded]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-sm">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Breadcrumbs />

        <div className="flex-1" />

        {/* ── Right controls ──────────────────────────────────── */}
        <div className="flex items-center gap-1">

          {/* Search bar trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="ml-1 inline-flex items-center gap-0.5 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-medium">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Subscription days pill */}
          {subDaysLeft !== null && (
            <Link
              to="/billing"
              className={`hidden lg:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors hover:opacity-80 ${
                subDaysLeft <= 3
                  ? "bg-rose-500/10 border-rose-500/15 text-rose-600 dark:text-rose-400"
                  : subStatus === "trial"
                  ? "bg-amber-500/10 border-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <CreditCard className="h-3 w-3" />
              <span>{subDaysLeft}d left</span>
            </Link>
          )}

          {/* XP pill */}
          {progress.total_xp > 0 && (
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-600 dark:text-violet-400">
              <Zap className="h-3 w-3" />
              <span>{progress.total_xp.toLocaleString()} XP</span>
            </div>
          )}

          {/* Streak pill */}
          {progress.streak_current > 0 && (
            <div className="hidden md:flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
              <Flame className="h-3 w-3" />
              <span>{progress.streak_current}d</span>
            </div>
          )}

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Globe className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {SUPPORTED_LANGUAGES.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                  className={i18n.language === l.code ? "font-semibold text-primary" : ""}>
                  <span className="mr-2 text-base">{l.flag}</span>
                  {l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <button onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications dropdown */}
          <DropdownMenu onOpenChange={(open) => { if (open) loadNotifications(); }}>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-bold text-foreground">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Bell className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const cfg = NOTIF_ICONS[n.type];
                    return (
                      <div key={n.id}
                        className={`flex items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 ${n.read ? "opacity-60" : ""}`}>
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                          <cfg.icon className={`h-3.5 w-3.5 ${cfg.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{n.title}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{n.body}</p>
                        </div>
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-border p-2">
                <Link to="/notifications"
                  className="flex w-full items-center justify-center rounded-lg py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
                  View all notifications
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-xl px-2 py-1 text-left transition-colors hover:bg-muted">
                <UserAvatar name={displayName} email={user?.email} />
                <div className="hidden max-w-[110px] flex-col sm:flex">
                  <span className="truncate text-xs font-semibold text-foreground leading-tight">
                    {displayName ?? user?.email?.split("@")[0]}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground leading-tight">
                    {user?.email}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {/* User header */}
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-bold text-foreground">{displayName ?? user?.email?.split("@")[0]}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                    <Zap className="h-2.5 w-2.5" /> Lv {progress.level}
                  </span>
                  {progress.streak_current > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      <Flame className="h-2.5 w-2.5" /> {progress.streak_current}d
                    </span>
                  )}
                  {subDaysLeft !== null && (
                    <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      subDaysLeft <= 3
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      <CreditCard className="h-2.5 w-2.5" /> {subDaysLeft}d
                    </span>
                  )}
                </div>
              </div>

              {/* Primary shortcuts — always 1 click away */}
              <div className="p-1">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Profile</p>
                      <p className="text-[10px] text-muted-foreground">Account info & stats</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/billing" className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Billing & Subscription</p>
                      <p className="text-[10px] text-muted-foreground">
                        {subDaysLeft !== null ? `${subDaysLeft} days remaining` : "Manage your plan"}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/security" className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <Shield className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Security</p>
                      <p className="text-[10px] text-muted-foreground">Password & sessions</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notifications" className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Notifications</p>
                      <p className="text-[10px] text-muted-foreground">Alerts & announcements</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer mx-1 mb-1 rounded-lg">
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global search modal (portal-like) */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}

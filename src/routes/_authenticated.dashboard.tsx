import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Headphones, PenLine, Mic,
  ChevronRight, TrendingUp, Target, Clock, Flame,
  Zap, AlertCircle, Calendar, BarChart2, ArrowUpRight,
  GraduationCap, Trophy,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface Profile {
  full_name: string | null;
  level: string | null;
  onboarding_completed: boolean;
  exam_date: string | null;
}

interface Subscription {
  status: string;
  plan_code: string;
  expires_at: string;
}

const QUICK_ACCESS = [
  {
    label: "Lesen",
    description: "Reading comprehension",
    icon: BookOpen,
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    glow: "shadow-blue-500/10",
    to: "/schriftlich/vorbereitung/lesen/teil-1" as const,
  },
  {
    label: "Hören",
    description: "Listening exercises",
    icon: Headphones,
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    glow: "shadow-violet-500/10",
    to: "/schriftlich/vorbereitung/hoeren/teil-1" as const,
  },
  {
    label: "Schreiben",
    description: "Writing practice",
    icon: PenLine,
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    glow: "shadow-amber-500/10",
    to: "/schriftlich/vorbereitung/schreiben/beschwerde" as const,
  },
  {
    label: "Mündlich",
    description: "Speaking simulation",
    icon: Mic,
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    glow: "shadow-rose-500/10",
    to: "/muendlich/vorbereitung" as const,
  },
];

/* Placeholder weekly activity — will come from real data when exam attempts are recorded */
const WEEKLY_DATA = [
  { day: "Mon", score: 0 },
  { day: "Tue", score: 0 },
  { day: "Wed", score: 0 },
  { day: "Thu", score: 0 },
  { day: "Fri", score: 0 },
  { day: "Sat", score: 0 },
  { day: "Sun", score: 0 },
];

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : null;
}

function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [profileRes, subRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, level, onboarding_completed, exam_date")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("status, plan_code, expires_at")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setProfile(profileRes.data ?? null);
      setSubscription(subRes.data ?? null);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const firstName     = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const levelBadge    = profile?.level === "TELC_B1" ? "B1" : profile?.level === "TELC_B2" ? "B2" : null;
  const examCountdown = daysUntil((profile as any)?.exam_date ?? null);
  const isTrial       = subscription?.status === "trial";
  const hasAccess     = !!subscription;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">

      {/* ── Welcome header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
            {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {levelBadge
              ? `Preparing for TELC ${levelBadge} — let's keep the momentum going.`
              : "Set your exam level to get a personalised study plan."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {levelBadge && (
            <span className="inline-flex h-7 items-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
              TELC {levelBadge}
            </span>
          )}
          {examCountdown !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 h-7 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {examCountdown}d to exam
            </span>
          )}
        </div>
      </div>

      {/* ── Subscription alert ──────────────────────────────────── */}
      {!loading && !hasAccess && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Start your free 3-day trial</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Unlock all practice exams, full simulations, and your analytics dashboard.
            </p>
          </div>
          <Link
            to="/billing"
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      )}

      {!loading && isTrial && subscription && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3.5">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Trial active</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your trial expires on {new Date(subscription.expires_at).toLocaleDateString()}. Upgrade anytime to keep full access.
            </p>
          </div>
          <Link
            to="/billing"
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Day streak",   value: "0",  icon: Flame,      color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Exams done",   value: "0",  icon: Target,     color: "text-blue-500",   bg: "bg-blue-500/10"   },
          { label: "Avg score",    value: "—",  icon: TrendingUp, color: "text-emerald-500",bg: "bg-emerald-500/10"},
          { label: "Study time",   value: "0h", icon: Clock,      color: "text-violet-500", bg: "bg-violet-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Activity chart + Score breakdown ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity chart — takes 3 cols */}
        <div className="col-span-full rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Weekly activity</p>
              <p className="text-xs text-muted-foreground">Practice sessions this week</p>
            </div>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_DATA} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Complete your first practice session to start tracking progress
          </p>
        </div>

        {/* Score breakdown — takes 2 cols */}
        <div className="col-span-full rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">Score by section</p>
            <p className="text-xs text-muted-foreground">Average across all attempts</p>
          </div>
          <div className="space-y-3.5">
            {[
              { label: "Lesen",           pct: 0, color: "bg-blue-500"   },
              { label: "Hören",           pct: 0, color: "bg-violet-500" },
              { label: "Sprachbausteine", pct: 0, color: "bg-emerald-500"},
              { label: "Schreiben",       pct: 0, color: "bg-amber-500"  },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-foreground">{s.label}</span>
                  <span className="tabular-nums text-muted-foreground">—</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-700`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2">
            <Trophy className="h-3.5 w-3.5 text-gold" />
            <p className="text-xs text-muted-foreground">
              Complete exams to see your section scores
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick access ────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Jump back in</h2>
          <Link
            to="/schriftlich/vorbereitung"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md hover:${item.glow}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                <item.icon className={`h-4.5 w-4.5 ${item.text}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Prüfungssimulation CTA ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,oklch(0.5_0.18_264/0.06),transparent)]" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Full simulation
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Prüfungssimulation</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Complete a full TELC exam under realistic conditions — timed, structured, and scored exactly like the real test.
            </p>
          </div>
          <Link
            to="/schriftlich/pruefung"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
          >
            Start simulation <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

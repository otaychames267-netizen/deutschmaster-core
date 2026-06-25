import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserProgress, levelProgress, xpForNextLevel, xpForCurrentLevel } from "@/lib/useUserProgress";
import {
  BookOpen, Headphones, PenLine, Mic,
  ChevronRight, TrendingUp, Target, Clock, Flame,
  Zap, AlertCircle, Calendar, BarChart2,
  Trophy, Star, Play, ArrowUpRight, Sparkles,
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

interface WeeklyActivity {
  day: string;
  score: number;
  count: number;
}

const QUICK_ACCESS = [
  { label: "Lesen",       description: "Reading comprehension", icon: BookOpen,   bg: "bg-blue-500/10",   text: "text-blue-500",   border: "border-blue-500/20",   to: "/schriftlich/vorbereitung/lesen/teil-1"      as const },
  { label: "Hören",       description: "Listening exercises",   icon: Headphones, bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20", to: "/schriftlich/vorbereitung/hoeren/teil-1"     as const },
  { label: "Schreiben",   description: "Writing practice",      icon: PenLine,    bg: "bg-amber-500/10",  text: "text-amber-500",  border: "border-amber-500/20",  to: "/schriftlich/vorbereitung/schreiben/beschwerde" as const },
  { label: "Mündlich",    description: "Speaking practice",     icon: Mic,        bg: "bg-rose-500/10",   text: "text-rose-500",   border: "border-rose-500/20",   to: "/muendlich/vorbereitung"                     as const },
];

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : null;
}

function formatStudyTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* Loading skeleton */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="col-span-full h-64 lg:col-span-3" />
        <Skeleton className="col-span-full h-64 lg:col-span-2" />
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { progress, achievements, loading: progressLoading } = useUserProgress();

  const [profile, setProfile]         = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [weeklyData, setWeeklyData]   = useState<WeeklyActivity[]>([]);
  const [recentResults, setRecentResults] = useState<{ score: number; created_at: string }[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [profileRes, subRes, attemptsRes] = await Promise.all([
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
        supabase
          .from("attempt_results")
          .select("score, created_at")
          .eq("user_id", user.id)
          .order("scored_at", { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;
      setProfile(profileRes.data ?? null);
      setSubscription(subRes.data ?? null);

      const results = (attemptsRes.data ?? []) as { score: number; created_at: string }[];
      setRecentResults(results);

      // Build weekly activity from last 7 days
      const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const today = new Date();
      const weekData: WeeklyActivity[] = days.map((day, i) => {
        const d = new Date(today);
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        const target = new Date(monday);
        target.setDate(monday.getDate() + i);

        const dayResults = results.filter((r) => {
          const d2 = new Date(r.created_at);
          return d2.toDateString() === target.toDateString();
        });

        return {
          day,
          score: dayResults.length > 0 ? Math.round(dayResults.reduce((s, r) => s + r.score, 0) / dayResults.length) : 0,
          count: dayResults.length,
        };
      });
      setWeeklyData(weekData);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading || progressLoading) return <DashboardSkeleton />;

  const firstName     = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const levelBadge    = profile?.level === "TELC_B1" ? "B1" : profile?.level === "TELC_B2" ? "B2" : null;
  const examCountdown = daysUntil(profile?.exam_date ?? null);
  const isTrial       = subscription?.status === "trial";
  const hasAccess     = !!subscription;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const avgScore = recentResults.length > 0
    ? Math.round(recentResults.reduce((s, r) => s + r.score, 0) / recentResults.length)
    : null;

  const xpProgress = levelProgress(progress.total_xp, progress.level);
  const xpCurr = xpForCurrentLevel(progress.level);
  const xpNext = xpForNextLevel(progress.level);

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">

      {/* ── Welcome header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          {levelBadge && (
            <span className="inline-flex h-7 items-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
              TELC {levelBadge}
            </span>
          )}
          {examCountdown !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 h-7 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" /> {examCountdown}d to exam
            </span>
          )}
          {progress.streak_current > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 px-3 h-7 text-xs font-medium text-orange-600 dark:text-orange-400">
              <Flame className="h-3 w-3" /> {progress.streak_current} day streak
            </span>
          )}
        </div>
      </div>

      {/* ── Subscription alerts ──────────────────────────────────── */}
      {!hasAccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Start your free trial</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Unlock all practice exams, simulations, and your full analytics dashboard.</p>
          </div>
          <Link to="/billing" className="shrink-0 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500/90 transition-colors">
            Get started
          </Link>
        </div>
      )}
      {isTrial && subscription && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 px-5 py-4">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Trial active</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Expires {new Date(subscription.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Upgrade anytime to keep full access.
            </p>
          </div>
          <Link to="/billing" className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Upgrade
          </Link>
        </div>
      )}

      {/* ── XP & Level bar ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Level {progress.level}</p>
              <p className="text-xs text-muted-foreground">{progress.total_xp.toLocaleString()} XP total</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-foreground">{progress.total_xp - xpCurr} / {xpNext - xpCurr} XP</p>
            <p className="text-xs text-muted-foreground">to Level {progress.level + 1}</p>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Level {progress.level}</span>
          <span className="font-medium text-primary">{xpProgress}%</span>
          <span>Level {progress.level + 1}</span>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Day streak",  value: progress.streak_current > 0 ? `${progress.streak_current}d` : "0",    icon: Flame,      color: "text-orange-500", bg: "bg-orange-500/10", note: progress.streak_longest > 0 ? `Best: ${progress.streak_longest}d` : "Start today!" },
          { label: "Exercises",   value: progress.exercises_completed.toString(),                                icon: Target,     color: "text-blue-500",   bg: "bg-blue-500/10",   note: "completed" },
          { label: "Avg score",   value: avgScore !== null ? `${avgScore}%` : "—",                              icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", note: avgScore !== null ? (avgScore >= 60 ? "Passing" : "Keep going") : "No data yet" },
          { label: "Study time",  value: formatStudyTime(progress.total_study_sec),                             icon: Clock,      color: "text-violet-500", bg: "bg-violet-500/10",  note: "recorded" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.note}</p>
          </div>
        ))}
      </div>

      {/* ── Activity chart + Achievements ───────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity chart */}
        <div className="col-span-full rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Weekly activity</p>
              <p className="text-xs text-muted-foreground">Average score per day this week</p>
            </div>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </div>
          {weeklyData.some((d) => d.score > 0) ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", fontSize: "0.75rem" }}
                    formatter={(v) => [`${v}%`, "Avg score"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} fill="url(#scoreGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
              <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Complete exercises to see your progress here</p>
            </div>
          )}
        </div>

        {/* Achievements snapshot */}
        <div className="col-span-full rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Achievements</p>
              <p className="text-xs text-muted-foreground">{unlockedCount} / {achievements.length} unlocked</p>
            </div>
            <Link to="/achievements" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {achievements.filter((a) => a.unlocked_at).slice(0, 4).map((ach) => (
              <div key={ach.id} className="flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
                <Trophy className="h-4 w-4 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{ach.title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(ach.unlocked_at!).toLocaleDateString()}</p>
                </div>
                <Star className="h-3 w-3 shrink-0 text-amber-400 fill-amber-400" />
              </div>
            ))}
            {unlockedCount === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Trophy className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Complete exercises to unlock achievements</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick access ──────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Continue learning</p>
          <Link to="/statistik" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View stats <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`group flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${item.border} ${item.bg}/30`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg}`}>
                <item.icon className={`h-4.5 w-4.5 ${item.text}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-3 w-3" /> Start
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Prüfungssimulation CTA ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wide">Ready to test yourself?</p>
            <p className="mt-0.5 text-lg font-bold text-primary-foreground">Schriftliche Prüfungssimulation</p>
            <p className="mt-0.5 text-sm text-primary-foreground/70">Full 2h 25min exam • Auto-generated from your exercise pool</p>
          </div>
          <Link
            to="/schriftlich/pruefung"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
          >
            Start exam <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

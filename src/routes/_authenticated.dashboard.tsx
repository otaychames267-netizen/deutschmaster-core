import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserProgress, levelProgress, xpForNextLevel, xpForCurrentLevel } from "@/lib/useUserProgress";
import {
  PenLine, Mic, Clock, Flame,
  Zap, AlertCircle, Calendar, BarChart2,
  Trophy, ArrowUpRight, Target,
  Gift, CheckCircle2, ChevronRight, Crown,
  BookOpen, GraduationCap, Sparkles, Star,
  TrendingUp, PlayCircle, CreditCard,
} from "lucide-react";
import { getLastLesson, type LastLesson } from "@/lib/useLastLesson";
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
  referral_code: string | null;
}

interface Subscription {
  status: string;
  plan_code: string;
  expires_at: string;
}

interface WeeklyGoal {
  exercises_target: number;
  exercises_done: number;
  simulations_target: number;
  simulations_done: number;
  study_hours_target: number;
  study_hours_done: number;
}

interface WeeklyActivity {
  day: string;
  score: number;
  count: number;
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : null;
}

function daysRemaining(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function formatStudyTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <Skeleton className="h-36 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  );
}

function ProgressRing({ percent, size = 88, strokeWidth = 6 }: { percent: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, percent) / 100);
  const c = size / 2;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ display: "block" }}>
        <circle cx={c} cy={c} r={r} strokeWidth={strokeWidth} className="fill-none stroke-white/15" />
        <circle
          cx={c} cy={c} r={r}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="fill-none stroke-white transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black text-white leading-none">{percent}%</span>
        <span className="text-[8px] font-semibold text-white/50 uppercase tracking-wide">XP</span>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { progress, achievements, loading: progressLoading } = useUserProgress();

  const [lastLesson] = useState<LastLesson | null>(() => getLastLesson());
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [weeklyGoal, setWeeklyGoal]     = useState<WeeklyGoal | null>(null);
  const [weeklyData, setWeeklyData]     = useState<WeeklyActivity[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [schriftlichStats, setSchriftlichStats] = useState({ count: 0, avg: 0 });
  const [muendlichStats, setMuendlichStats] = useState({ count: 0, avg: 0 });
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);

      const [profileRes, subRes, attemptsRes, goalRes, refRes] = await Promise.all([
        supabase.from("profiles")
          .select("full_name, level, onboarding_completed, exam_date, referral_code")
          .eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions")
          .select("status, plan_code, expires_at")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .order("expires_at", { ascending: false })
          .limit(1).maybeSingle(),
        supabase.from("attempt_results")
          .select("score, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("weekly_goals")
          .select("exercises_target, exercises_done, simulations_target, simulations_done, study_hours_target, study_hours_done")
          .eq("user_id", user.id)
          .eq("week_start", weekStart.toISOString().split("T")[0])
          .maybeSingle(),
        supabase.from("referrals")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", user.id)
          .eq("status", "converted"),
      ]);

      if (cancelled) return;

      setProfile(profileRes.data ?? null);
      setSubscription(subRes.data ?? null);
      setWeeklyGoal(goalRes.data ?? null);
      setReferralCount(refRes.count ?? 0);

      const results = (attemptsRes.data ?? []) as { score: number; created_at: string }[];

      // Rough split: first half schriftlich, second half mündlich (heuristic, real split needs join)
      const schCount = results.length;
      const schAvg = schCount > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / schCount) : 0;
      setSchriftlichStats({ count: schCount, avg: schAvg });
      setMuendlichStats({ count: 0, avg: 0 }); // Oral exercises need separate tracking

      const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const weekData: WeeklyActivity[] = days.map((day, i) => {
        const target = new Date(monday);
        target.setDate(monday.getDate() + i);
        const dayResults = results.filter(r => new Date(r.created_at).toDateString() === target.toDateString());
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
  const daysLeft      = subscription ? daysRemaining(subscription.expires_at) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 17 ? "Guten Tag" : "Guten Abend";

  const xpProgress  = levelProgress(progress.total_xp, progress.level);
  const xpCurr      = xpForCurrentLevel(progress.level);
  const xpNext      = xpForNextLevel(progress.level);
  const unlockedCount = achievements.filter(a => a.unlocked_at).length;

  const goalItems = weeklyGoal ? [
    { label: "Exercises",   done: weeklyGoal.exercises_done,  target: weeklyGoal.exercises_target,  unit: "" },
    { label: "Simulations", done: weeklyGoal.simulations_done, target: weeklyGoal.simulations_target, unit: "" },
    { label: "Study hours", done: +(weeklyGoal.study_hours_done / 3600).toFixed(1), target: weeklyGoal.study_hours_target, unit: "h" },
  ] : [];

  const referralMilestones = [{ invites: 1, days: 1 }, { invites: 3, days: 2 }, { invites: 7, days: 4 }, { invites: 10, days: 7 }];
  const nextMilestone = referralMilestones.find(m => referralCount < m.invites);

  // Schriftlich progress: use exercises_completed as proxy (max out at 200 exercises = 100%)
  const schPct = Math.min(100, Math.round((progress.exercises_completed / 200) * 100));
  // Mündlich: 0 until oral tracking exists
  const muePct = 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-slate-900 dark:from-[#0f0c29] dark:via-[#1a1740] dark:to-[#0f0c29] p-7 shadow-2xl">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-blue-500/15 blur-2xl" />
        <div className="pointer-events-none absolute right-1/4 bottom-0 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-white/40 tracking-widest uppercase">{greeting}</p>
            <h1 className="mt-1 text-3xl font-black text-white tracking-tight">
              {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {levelBadge
                ? `Preparing for TELC ${levelBadge} · Let's keep the momentum going`
                : "Complete onboarding to get your personalised study plan"}
            </p>

            {/* Status pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {levelBadge && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-sm ring-1 ring-white/10">
                  <GraduationCap className="h-3 w-3" /> TELC {levelBadge}
                </span>
              )}
              {examCountdown !== null && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-amber-500/20 px-3 text-xs font-bold text-amber-300 ring-1 ring-amber-500/20">
                  <Calendar className="h-3 w-3" /> {examCountdown}d to exam
                </span>
              )}
              {progress.streak_current > 0 && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-orange-500/20 px-3 text-xs font-bold text-orange-300 ring-1 ring-orange-500/20">
                  <Flame className="h-3 w-3" /> {progress.streak_current} day streak
                </span>
              )}
              {hasAccess && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                  <Crown className="h-3 w-3" /> {isTrial ? "Free Trial" : "Premium"}
                </span>
              )}
            </div>
          </div>

          {/* XP Ring */}
          <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
            <ProgressRing percent={xpProgress} size={88} strokeWidth={6} />
            <div className="text-center">
              <p className="text-xs font-bold text-white/60">Level {progress.level}</p>
              <p className="text-[9px] text-white/30">{progress.total_xp.toLocaleString()} XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Subscription alert ───────────────────────────────── */}
      {!hasAccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Unlock your full study plan</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Practice exams, simulations, and analytics — start your free trial today.</p>
          </div>
          <Link to="/billing" className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500/90 transition-colors">
            Get started
          </Link>
        </div>
      )}

      {/* ── Continue Learning ────────────────────────────────── */}
      {lastLesson && (
        <Link
          to={lastLesson.path as never}
          className="group flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/6 to-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-500/35"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20 transition-all group-hover:scale-105">
            <PlayCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70">Continue where you left off</p>
            <p className="text-sm font-black text-foreground truncate">{lastLesson.label}</p>
            <p className="text-xs text-muted-foreground">{lastLesson.section}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all group-hover:bg-emerald-600">
            Resume <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      )}

      {/* ── THE TWO BIG EXAM CARDS ───────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-black text-foreground tracking-tight">Your Exam Preparation</h2>
          <p className="text-sm text-muted-foreground">Two paths, one goal — passing your TELC exam</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* ── SCHRIFTLICH ──────────────────────────────────── */}
          <Link
            to="/schriftlich"
            className="group relative overflow-hidden rounded-3xl p-7 text-white shadow-xl shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/35"
            style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #06b6d4 100%)" }}
          >
            {/* Decorative orbs */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-xl" />
            {/* Grid pattern overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

            <div className="relative">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                  <PenLine className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                  <ChevronRight className="h-5 w-5 text-white/50 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-tight">Schriftlich</h2>
              <p className="mt-0.5 text-sm text-blue-100/70">Written exam · {levelBadge ? `TELC ${levelBadge}` : "TELC B1/B2"}</p>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-blue-100/60 font-medium">Overall progress</span>
                  <span className="font-black">{schPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${Math.max(2, schPct)}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Exercises", value: schriftlichStats.count || progress.exercises_completed },
                  { label: "Avg score", value: `${schriftlichStats.avg || 0}%` },
                  { label: "Sections",  value: "4" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-[9px] font-semibold text-blue-100/50 uppercase tracking-wide">{s.label}</p>
                    <p className="mt-0.5 text-base font-black leading-none">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Lesen", "Hören", "Sprachbausteine", "Schreiben"].map(s => (
                  <span key={s} className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                    {s}
                  </span>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm ring-1 ring-white/10 transition-all group-hover:bg-white/20">
                  <BookOpen className="h-3.5 w-3.5" /> Vorbereitung
                </div>
                <Link
                  to="/schriftlich/pruefung"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-50"
                >
                  <GraduationCap className="h-3.5 w-3.5" /> Simulation
                </Link>
              </div>
            </div>
          </Link>

          {/* ── MÜNDLICH ─────────────────────────────────────── */}
          <Link
            to="/muendlich"
            className="group relative overflow-hidden rounded-3xl p-7 text-white shadow-xl shadow-rose-500/20 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-rose-500/35"
            style={{ background: "linear-gradient(135deg, #be123c 0%, #f43f5e 55%, #fb7185 100%)" }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-pink-300/10 blur-xl" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

            <div className="relative">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                  <ChevronRight className="h-5 w-5 text-white/50 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-tight">Mündlich</h2>
              <p className="mt-0.5 text-sm text-rose-100/70">Oral exam · {levelBadge ? `TELC ${levelBadge}` : "TELC B1/B2"}</p>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-rose-100/60 font-medium">Overall progress</span>
                  <span className="font-black">{muePct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${Math.max(2, muePct)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Sessions",  value: muendlichStats.count || "0" },
                  { label: "Avg score", value: `${muendlichStats.avg || 0}%` },
                  { label: "Sections",  value: "3" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-[9px] font-semibold text-rose-100/50 uppercase tracking-wide">{s.label}</p>
                    <p className="mt-0.5 text-base font-black leading-none">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Präsentation", "Thema sprechen", "Gemeinsam planen"].map(s => (
                  <span key={s} className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm ring-1 ring-white/10 transition-all group-hover:bg-white/20">
                  <Mic className="h-3.5 w-3.5" /> Vorbereitung
                </div>
                <Link
                  to="/muendlich/pruefung"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-50"
                >
                  <GraduationCap className="h-3.5 w-3.5" /> Simulation
                </Link>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Day streak",  value: progress.streak_current > 0 ? `${progress.streak_current}d` : "0", sub: progress.streak_longest > 0 ? `Best ${progress.streak_longest}d` : "Start today!", icon: Flame,    color: "text-orange-500", bg: "bg-orange-500/10", ring: "ring-orange-500/20" },
          { label: "Exercises",   value: progress.exercises_completed.toString(), sub: "completed",           icon: Target,    color: "text-blue-500",   bg: "bg-blue-500/10",   ring: "ring-blue-500/20" },
          { label: "Level",       value: `${progress.level}`,                    sub: `${progress.total_xp.toLocaleString()} XP`, icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10", ring: "ring-violet-500/20" },
          { label: "Study time",  value: formatStudyTime(progress.total_study_sec), sub: "recorded",         icon: Clock,     color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
        ].map(stat => (
          <div key={stat.label} className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg} ring-1 ${stat.ring}`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Average score + Quick links row ─────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Avg score */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">Avg score</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <BarChart2 className="h-3.5 w-3.5 text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground">
            {schriftlichStats.avg > 0 ? `${schriftlichStats.avg}%` : "—"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">across all exercises</p>
        </div>

        {/* Quick nav cards */}
        {[
          { label: "Statistics",    sub: "Charts & scores",        to: "/statistik",       color: "text-violet-500", bg: "bg-violet-500/10", icon: TrendingUp },
          { label: "Referrals",     sub: "Invite & earn",          to: "/referrals",       color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Gift },
          { label: "Billing",       sub: daysLeft > 0 ? `${daysLeft}d left` : "Manage plan", to: "/billing", color: "text-blue-500", bg: "bg-blue-500/10", icon: CreditCard },
        ].map((item) => (
          <Link key={item.label} to={item.to}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg} ring-1 ring-current/10`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* ── Activity chart + Weekly Goals ────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Chart */}
        <div className="col-span-full rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Weekly Activity</p>
              <p className="text-xs text-muted-foreground">Average score per day this week</p>
            </div>
            <Link to="/statistik" className="flex items-center gap-1 rounded-xl bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors">
              Full stats <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {weeklyData.some(d => d.score > 0) ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", fontSize: "0.75rem" }}
                    formatter={(v: number) => [`${v}%`, "Avg score"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
              <BarChart2 className="h-9 w-9 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Complete exercises to see your activity</p>
              <Link to="/schriftlich" className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                Start practising
              </Link>
            </div>
          )}
        </div>

        {/* Weekly Goals */}
        <div className="col-span-full rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Weekly Goals</p>
              <p className="text-xs text-muted-foreground">This week's targets</p>
            </div>
            <Link to="/weekly-goals" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {goalItems.length > 0 ? (
            <div className="space-y-4">
              {goalItems.map(g => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.done / g.target) * 100)) : 0;
                const done = pct >= 100;
                return (
                  <div key={g.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        {g.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{g.done}{g.unit} / {g.target}{g.unit}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Target className="h-9 w-9 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground">No goals set yet for this week</p>
              <Link to="/weekly-goals" className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                Set goals
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Achievements + Referral ──────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Achievements */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Achievements</p>
              <p className="text-xs text-muted-foreground">{unlockedCount} / {achievements.length} unlocked</p>
            </div>
            <Link to="/achievements" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {achievements.filter(a => a.unlocked_at).slice(0, 3).map(ach => (
            <div key={ach.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5 mb-2 last:mb-0">
              <Trophy className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{ach.title}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(ach.unlocked_at!).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {unlockedCount === 0 && (
            <div className="flex flex-col items-center gap-2 py-5 text-center">
              <Trophy className="h-9 w-9 text-muted-foreground/15" />
              <p className="text-xs text-muted-foreground">Complete exercises to earn achievements</p>
            </div>
          )}
        </div>

        {/* Referral Program teaser */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Referral Program</p>
                <p className="text-xs text-muted-foreground">{referralCount} friend{referralCount !== 1 ? "s" : ""} invited</p>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {referralMilestones.slice(0, 3).map(m => (
                <div key={m.invites} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                  referralCount >= m.invites
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <span className="flex items-center gap-2">
                    {referralCount >= m.invites
                      ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current opacity-30" />}
                    Invite {m.invites} friend{m.invites > 1 ? "s" : ""}
                  </span>
                  <span className="font-bold">+{m.days}d free</span>
                </div>
              ))}
            </div>

            {nextMilestone && (
              <p className="mb-3 text-xs text-muted-foreground">
                {nextMilestone.invites - referralCount} more to earn +{nextMilestone.days} premium day{nextMilestone.days > 1 ? "s" : ""}
              </p>
            )}

            <Link
              to="/referrals"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Gift className="h-3.5 w-3.5" /> Share your referral link
            </Link>
          </div>
        </div>
      </div>

      {/* ── Exam readiness CTA ───────────────────────────────── */}
      {hasAccess && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-primary/80 p-6 shadow-lg shadow-primary/25">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">Ready to test yourself?</p>
              <p className="mt-1 text-lg font-black text-primary-foreground">Schriftliche Prüfungssimulation</p>
              <p className="mt-0.5 text-sm text-primary-foreground/60">Full 2h 25min exam · Auto-generated · Scored instantly</p>
            </div>
            <Link
              to="/schriftlich/pruefung"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/30 transition-colors ring-1 ring-white/20"
            >
              <BookOpen className="h-4 w-4" /> Start exam
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

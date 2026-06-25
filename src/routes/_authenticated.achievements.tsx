import { createFileRoute } from "@tanstack/react-router";
import { useUserProgress } from "@/lib/useUserProgress";
import {
  Trophy, Lock, Flame, BookOpen, GraduationCap,
  Star, Zap, ChevronUp, LogIn, UserCheck, Award,
  Medal, Crown, ClipboardCheck, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({
  component: AchievementsPage,
});

/* Map achievement icon names → Lucide components */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "trophy":          Trophy,
  "flame":           Flame,
  "book-open":       BookOpen,
  "graduation-cap":  GraduationCap,
  "star":            Star,
  "zap":             Zap,
  "chevrons-up":     ChevronUp,
  "log-in":          LogIn,
  "user-check":      UserCheck,
  "award":           Award,
  "medal":           Medal,
  "crown":           Crown,
  "clipboard-check": ClipboardCheck,
  "trending-up":     TrendingUp,
};

const CATEGORY_LABELS: Record<string, string> = {
  general:    "General",
  exercise:   "Exercises",
  simulation: "Simulations",
  streak:     "Streaks",
};

const CATEGORY_COLORS: Record<string, string> = {
  general:    "text-violet-500 bg-violet-500/10",
  exercise:   "text-blue-500 bg-blue-500/10",
  simulation: "text-emerald-500 bg-emerald-500/10",
  streak:     "text-orange-500 bg-orange-500/10",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function AchievementsPage() {
  const { achievements, progress, loading } = useUserProgress();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked_at).length;
  const categories = [...new Set(achievements.map((a) => a.category))];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Achievements</h1>
          <p className="text-sm text-muted-foreground">
            {unlocked} of {achievements.length} unlocked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-primary">{unlocked}</p>
            <p className="text-xs text-muted-foreground">Unlocked</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{achievements.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{progress.total_xp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">Overall progress</p>
          <p className="text-sm font-bold text-primary">{Math.round((unlocked / achievements.length) * 100)}%</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
            style={{ width: `${(unlocked / achievements.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          {categories.map((cat) => {
            const catAchs = achievements.filter((a) => a.category === cat);
            const catUnlocked = catAchs.filter((a) => a.unlocked_at).length;
            return (
              <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                {catUnlocked}/{catAchs.length}
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements by category */}
      {categories.map((cat) => {
        const catAchs = achievements.filter((a) => a.category === cat);
        return (
          <div key={cat}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}>
                {CATEGORY_LABELS[cat] ?? cat}
              </span>
              <span className="text-xs text-muted-foreground">
                {catAchs.filter((a) => a.unlocked_at).length} / {catAchs.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catAchs.map((ach) => {
                const Icon = ICON_MAP[ach.icon] ?? Trophy;
                const isUnlocked = !!ach.unlocked_at;
                return (
                  <div
                    key={ach.id}
                    className={`relative flex items-start gap-3.5 rounded-2xl border p-4 shadow-sm transition-all ${
                      isUnlocked
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-border bg-card opacity-60"
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isUnlocked ? "bg-emerald-500/10" : "bg-muted"
                    }`}>
                      {isUnlocked
                        ? <Icon className="h-5 w-5 text-emerald-500" />
                        : <Lock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{ach.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{ach.description}</p>
                      {isUnlocked && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          Unlocked {new Date(ach.unlocked_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    {ach.xp_reward > 0 && (
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        +{ach.xp_reward} XP
                      </span>
                    )}
                    {isUnlocked && (
                      <Star className="absolute right-3 top-3 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

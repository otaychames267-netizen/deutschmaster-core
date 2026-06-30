import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  TrendingUp, Target, Flame, Clock, Award, BookOpen,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { useUserProgress } from "@/lib/useUserProgress";

export const Route = createFileRoute("/_authenticated/statistik")({
  component: StatistikPage,
});

interface AttemptResult {
  section: string;
  score: number;
  max_score: number;
  passed: boolean;
  created_at: string;
}

interface StudySession {
  duration_minutes: number;
  started_at: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  lesen:           "Lesen",
  hoeren:          "Hören",
  schreiben:       "Schreiben",
  sprachbausteine: "Sprachbausteine",
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatistikPage() {
  const { user } = useAuth();
  const { progress, loading: progressLoading } = useUserProgress();

  const [results, setResults]     = useState<AttemptResult[]>([]);
  const [sessions, setSessions]   = useState<StudySession[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("attempt_results")
        .select("section, score, max_score, passed, created_at")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("study_sessions")
        .select("duration_minutes, started_at")
        .eq("user_id", user.id)
        .order("started_at"),
      // Lesen practice attempts — fold into the same shape so every chart counts them.
      (supabase as any)
        .from("lesen_attempts")
        .select("score, total, created_at")
        .eq("user_id", user.id)
        .order("created_at"),
    ]).then(([resR, sesR, lesenR]) => {
      const exam = (resR.data as AttemptResult[]) ?? [];
      const lesen: AttemptResult[] = ((lesenR.data as any[]) ?? []).map((r) => ({
        section: "lesen",
        score: r.score,
        max_score: r.total,
        passed: r.total > 0 && r.score / r.total >= 0.6,
        created_at: r.created_at,
      }));
      const merged = [...exam, ...lesen].sort((a, b) => a.created_at.localeCompare(b.created_at));
      setResults(merged);
      setSessions((sesR.data as StudySession[]) ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  /* ---- derived data ---- */
  const totalStudyMin = sessions.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  const totalStudyHrs = (totalStudyMin / 60).toFixed(1);

  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + (r.max_score ? (r.score / r.max_score) * 100 : 0), 0) / results.length)
    : null;
  const bestScore = results.length
    ? Math.max(...results.map((r) => r.max_score ? Math.round((r.score / r.max_score) * 100) : 0))
    : null;

  /* Monthly bar chart — last 6 months */
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const mo = d.getMonth();
    const yr = d.getFullYear();
    const count = results.filter((r) => {
      const rd = new Date(r.created_at);
      return rd.getMonth() === mo && rd.getFullYear() === yr;
    }).length;
    return { month: MONTHS_SHORT[mo], attempts: count };
  });

  /* Weekly area chart — last 8 weeks */
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(now);
    start.setDate(start.getDate() - (7 * (7 - i)));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = results.filter((r) => {
      const rd = new Date(r.created_at);
      return rd >= start && rd < end;
    }).length;
    return { week: `W${i + 1}`, count };
  });

  /* Radar — section avg */
  const sectionMap: Record<string, { total: number; count: number }> = {};
  for (const r of results) {
    if (!sectionMap[r.section]) sectionMap[r.section] = { total: 0, count: 0 };
    sectionMap[r.section].total += r.max_score ? (r.score / r.max_score) * 100 : 0;
    sectionMap[r.section].count += 1;
  }
  const radarData = Object.entries(SECTION_LABELS).map(([key, label]) => ({
    section: label,
    score: sectionMap[key] ? Math.round(sectionMap[key].total / sectionMap[key].count) : 0,
  }));

  /* Per-section breakdown table */
  const sectionBreakdown = Object.entries(SECTION_LABELS).map(([key, label]) => {
    const rows = results.filter((r) => r.section === key);
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.max_score ? (r.score / r.max_score) * 100 : 0), 0) / rows.length) : null;
    const best = rows.length ? Math.max(...rows.map((r) => r.max_score ? Math.round((r.score / r.max_score) * 100) : 0)) : null;
    const passRate = rows.length ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : null;
    return { key, label, attempts: rows.length, avg, best, passRate };
  });

  const isLoading = loading || progressLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <div className="space-y-2"><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const weakest = [...sectionBreakdown].filter((s) => s.avg !== null).sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0));
  const strongest = [...sectionBreakdown].filter((s) => s.avg !== null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Statistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your progress, scores, and performance across all sections.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Day streak"   value={String(progress.streak_current)} icon={Flame}      color="bg-orange-500/10 text-orange-500"  sub={`Longest: ${progress.streak_longest}`} />
        <StatCard label="Exercises"    value={String(results.length)}           icon={Target}     color="bg-blue-500/10 text-blue-500"      sub="Total completed" />
        <StatCard label="Avg score"    value={avgScore !== null ? `${avgScore}%` : "—"}           icon={Award}      color="bg-amber-500/10 text-amber-500"    sub={bestScore !== null ? `Best: ${bestScore}%` : "No data yet"} />
        <StatCard label="Study time"   value={`${totalStudyHrs}h`}              icon={Clock}      color="bg-violet-500/10 text-violet-500"  sub="Total logged" />
      </div>

      {/* Weakest / Strongest sections */}
      {weakest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
              <p className="text-sm font-semibold text-foreground">Needs practice</p>
            </div>
            {weakest.slice(0, 3).map((s) => (
              <div key={s.key} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="font-semibold text-rose-500">{s.avg}%</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">Strongest sections</p>
            </div>
            {strongest.slice(0, 3).map((s) => (
              <div key={s.key} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="font-semibold text-emerald-500">{s.avg}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly bar chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">Monthly activity</p>
            <p className="text-xs text-muted-foreground">Practice attempts per month</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "0.75rem" }}
                />
                <Bar dataKey="attempts" name="Attempts" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">Section strengths</p>
            <p className="text-xs text-muted-foreground">Average score per exam section</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="section" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickCount={4} />
                <Radar name="Score" dataKey="score" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground">Weekly trend</p>
          <p className="text-xs text-muted-foreground">Practice attempts over the last 8 weeks</p>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "0.75rem" }}
              />
              <Area type="monotone" dataKey="count" name="Attempts" stroke="var(--color-primary)" fill="url(#areaGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section breakdown table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Section breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Section</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Attempts</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Avg score</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Best</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sectionBreakdown.map(({ key, label, attempts, avg, best, passRate }) => (
                <tr key={key} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      {label}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right text-muted-foreground">{attempts}</td>
                  <td className="px-6 py-3.5 text-right">
                    {avg !== null ? (
                      <span className={`font-semibold ${avg >= 60 ? "text-emerald-500" : "text-rose-500"}`}>{avg}%</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {best !== null ? <span className="font-semibold text-foreground">{best}%</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {passRate !== null ? (
                      <span className={`font-semibold ${passRate >= 50 ? "text-emerald-500" : "text-rose-500"}`}>{passRate}%</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-muted/20 px-6 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Complete practice sessions to populate your statistics
          </p>
        </div>
      </div>
    </div>
  );
}

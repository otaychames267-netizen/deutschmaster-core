import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { TrendingUp, Target, Flame, Clock, Award, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/statistik")({
  component: StatistikPage,
});

const SECTION_LABELS: Record<string, string> = {
  lesen:           "Lesen",
  hoeren:          "Hören",
  schreiben:       "Schreiben",
  sprachbausteine: "Sprachbausteine",
  muendlich:       "Mündlich",
};

const RADAR_DATA = [
  { section: "Lesen",           score: 0 },
  { section: "Hören",           score: 0 },
  { section: "Schreiben",       score: 0 },
  { section: "Sprachbausteine", score: 0 },
  { section: "Mündlich",        score: 0 },
];

const MONTHLY_DATA = [
  { month: "Jan", exams: 0 },
  { month: "Feb", exams: 0 },
  { month: "Mar", exams: 0 },
  { month: "Apr", exams: 0 },
  { month: "May", exams: 0 },
  { month: "Jun", exams: 0 },
];

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

function StatistikPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<number>(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        setAttempts(count ?? 0);
        setLoading(false);
      });
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Statistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your progress, scores, and performance breakdown across all sections.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Day streak"    value="0"           icon={Flame}      color="bg-orange-500/10 text-orange-500" sub="Keep practising daily" />
        <StatCard label="Exams done"    value={String(attempts)} icon={Target} color="bg-blue-500/10 text-blue-500"   sub="Total attempts" />
        <StatCard label="Best score"    value="—"           icon={Award}      color="bg-gold/20 text-gold"             sub="Across all exams" />
        <StatCard label="Study time"    value="0h"          icon={Clock}      color="bg-violet-500/10 text-violet-500" sub="Total logged" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly exams bar chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">Exams per month</p>
            <p className="text-xs text-muted-foreground">Practice sessions completed</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="exams" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar chart — section scores */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold text-foreground">Section strengths</p>
            <p className="text-xs text-muted-foreground">Average score per exam section</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA} margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="section" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} tickCount={4} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section breakdown table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Section breakdown</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Section</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Attempts</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Avg score</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Best</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Object.entries(SECTION_LABELS).map(([, label]) => (
              <tr key={label} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-3.5 font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </div>
                </td>
                <td className="px-6 py-3.5 text-right text-muted-foreground">0</td>
                <td className="px-6 py-3.5 text-right text-muted-foreground">—</td>
                <td className="px-6 py-3.5 text-right text-muted-foreground">—</td>
              </tr>
            ))}
          </tbody>
        </table>
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserProgress } from "@/lib/useUserProgress";
import {
  Target, CheckCircle2, Flame, BookOpen,
  Clock, Trophy, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/weekly-goals")({
  component: WeeklyGoalsPage,
});

interface WeeklyGoal {
  id: string;
  week_start: string;
  exercises_target: number;
  exercises_done: number;
  simulations_target: number;
  simulations_done: number;
  study_hours_target: number;
  study_hours_done: number;
  streak_target: number;
  completed: boolean;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function GoalCard({
  icon: Icon,
  label,
  done,
  target,
  color,
  unit = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  done: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min(100, target > 0 ? Math.round((done / target) * 100) : 0);
  const reached = done >= target;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
      reached ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"
    }`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {reached && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
      </div>

      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-2xl font-bold text-foreground">{done}</span>
        <span className="mb-0.5 text-sm text-muted-foreground">/ {target}{unit}</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${reached ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-[10px] text-muted-foreground">{pct}% complete</p>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function WeeklyGoalsPage() {
  const { user } = useAuth();
  const { progress } = useUserProgress();
  const [goal, setGoal]       = useState<WeeklyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [past, setPast]       = useState<WeeklyGoal[]>([]);

  const weekStart = getWeekStart();

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Fetch or create this week's goal
      const { data: existing } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) {
        setGoal(existing as WeeklyGoal);
      } else {
        const { data: created } = await supabase
          .from("weekly_goals")
          .insert({
            user_id: user.id,
            week_start: weekStart,
            exercises_target: 20,
            exercises_done: 0,
            simulations_target: 3,
            simulations_done: 0,
            study_hours_target: 5,
            study_hours_done: 0,
            streak_target: 7,
          })
          .select()
          .single();
        if (created) setGoal(created as WeeklyGoal);
      }

      // Fetch past goals
      const { data: history } = await supabase
        .from("weekly_goals")
        .select("*")
        .eq("user_id", user.id)
        .neq("week_start", weekStart)
        .order("week_start", { ascending: false })
        .limit(5);
      setPast((history as WeeklyGoal[]) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  async function updateTarget(field: "exercises_target" | "simulations_target" | "study_hours_target", value: number) {
    if (!goal || !user) return;
    const updated = { ...goal, [field]: value };
    setGoal(updated);
    const { error } = await supabase.from("weekly_goals").update({ [field]: value }).eq("id", goal.id);
    if (error) toast.error("Failed to update goal.");
    else toast.success("Goal updated.");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-8">
        <div className="space-y-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-60" /></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </div>
    );
  }

  const completedGoals = goal ? [
    (goal.exercises_done >= goal.exercises_target),
    (goal.simulations_done >= goal.simulations_target),
    ((goal.study_hours_done) >= goal.study_hours_target),
    (progress.streak_current >= (goal.streak_target ?? 7)),
  ].filter(Boolean).length : 0;

  const weekLabel = new Date(weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Weekly Goals</h1>
          <p className="text-sm text-muted-foreground">Week of {weekLabel} — {completedGoals}/4 goals reached</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-2 text-center shadow-sm">
          <p className="text-lg font-bold text-primary">{completedGoals}/4</p>
          <p className="text-[10px] text-muted-foreground">Goals met</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">This week's progress</p>
          <p className="text-sm font-bold text-primary">{Math.round((completedGoals / 4) * 100)}%</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-700 ${completedGoals === 4 ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${(completedGoals / 4) * 100}%` }}
          />
        </div>
        {completedGoals === 4 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500 font-semibold">
            <Trophy className="h-4 w-4" /> All goals completed this week!
          </div>
        )}
      </div>

      {goal && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <GoalCard icon={BookOpen}    label="Exercises"        done={goal.exercises_done}                    target={goal.exercises_target}    color="text-blue-500 bg-blue-500/10"     />
            <GoalCard icon={Target}      label="Simulations"      done={goal.simulations_done}                  target={goal.simulations_target}  color="text-violet-500 bg-violet-500/10" />
            <GoalCard icon={Clock}       label="Study hours"      done={Math.round(goal.study_hours_done)}      target={goal.study_hours_target}  color="text-amber-500 bg-amber-500/10"   unit="h" />
            <GoalCard icon={Flame}       label="Day streak"       done={progress.streak_current}                target={goal.streak_target ?? 7}  color="text-orange-500 bg-orange-500/10" />
          </div>

          {/* Adjust targets */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground">Adjust this week's targets</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                { label: "Exercises",   field: "exercises_target"   as const, val: goal.exercises_target,   min: 1, max: 100 },
                { label: "Simulations", field: "simulations_target" as const, val: goal.simulations_target, min: 1, max: 20  },
                { label: "Study hours", field: "study_hours_target" as const, val: goal.study_hours_target, min: 1, max: 40  },
              ] as const).map(({ label, field, val, min, max }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={val}
                    onChange={(e) => updateTarget(field, Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Past weeks */}
      {past.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <RotateCcw className="h-4.5 w-4.5 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Previous weeks</p>
          </div>
          <div className="space-y-3">
            {past.map((pw) => {
              const exPct = pw.exercises_target ? Math.min(100, Math.round((pw.exercises_done / pw.exercises_target) * 100)) : 0;
              const simPct = pw.simulations_target ? Math.min(100, Math.round((pw.simulations_done / pw.simulations_target) * 100)) : 0;
              return (
                <div key={pw.id} className="flex items-center gap-4 rounded-xl bg-muted/20 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      Week of {new Date(pw.week_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Exercises: {pw.exercises_done}/{pw.exercises_target} · Simulations: {pw.simulations_done}/{pw.simulations_target}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pw.completed ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {pw.completed ? "✓ Complete" : `${exPct}%`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

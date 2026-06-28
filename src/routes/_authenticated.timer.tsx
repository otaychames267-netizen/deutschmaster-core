import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Play, Pause, RotateCcw, Coffee, BookOpen,
  Check, Settings2, Clock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/timer")({
  component: TimerPage,
});

type Mode = "focus" | "short" | "long";

const DEFAULTS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5  * 60,
  long:  15 * 60,
};

const MODE_LABELS: Record<Mode, string> = {
  focus: "Focus",
  short: "Short break",
  long:  "Long break",
};

const MODE_COLORS: Record<Mode, string> = {
  focus: "text-primary",
  short: "text-emerald-500",
  long:  "text-blue-500",
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function TimerPage() {
  const { user } = useAuth();

  const [mode, setMode]       = useState<Mode>("focus");
  const [durations, setDur]   = useState({ ...DEFAULTS });
  const [remaining, setRem]   = useState(DEFAULTS.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSess]   = useState(0);
  const [showSettings, setSettings] = useState(false);
  const [totalToday, setTotal] = useState(0);

  const startedAt = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Load today's study time */
  useEffect(() => {
    if (!user) return;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    supabase
      .from("study_sessions")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .gte("started_at", todayStart.toISOString())
      .then(({ data }) => {
        const total = (data ?? []).reduce((s: number, r: { duration_minutes: number | null }) => s + (r.duration_minutes ?? 0), 0);
        setTotal(total);
      });
  }, [user?.id]);

  /* Timer tick */
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRem((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            onComplete();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function start() {
    startedAt.current = new Date();
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setRem(durations[mode]);
  }

  async function onComplete() {
    const elapsed = Math.round((new Date().getTime() - (startedAt.current?.getTime() ?? 0)) / 60000);
    if (mode === "focus" && user && elapsed >= 1) {
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        duration_minutes: elapsed,
        started_at: startedAt.current?.toISOString(),
        ended_at: new Date().toISOString(),
      });
      setTotal((t) => t + elapsed);
      setSess((s) => s + 1);
      toast.success(`Pomodoro done! +${elapsed} min logged.`);
    } else if (mode !== "focus") {
      toast.success("Break over — back to focus!");
    }
    // Auto-switch: after 4 focus sessions → long break; else → short break
    if (mode === "focus") {
      const next: Mode = (sessions + 1) % 4 === 0 ? "long" : "short";
      switchMode(next);
    } else {
      switchMode("focus");
    }
  }

  function switchMode(m: Mode) {
    setRunning(false);
    setMode(m);
    setRem(durations[m]);
  }

  function handleDurationChange(m: Mode, val: number) {
    const clamped = Math.max(1, Math.min(120, val));
    setDur((prev) => ({ ...prev, [m]: clamped * 60 }));
    if (m === mode && !running) setRem(clamped * 60);
  }

  const total = durations[mode];
  const pct   = ((total - remaining) / total) * 100;
  const radius = 90;
  const circ   = 2 * Math.PI * radius;
  const strokeDash = circ - (pct / 100) * circ;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Study Timer</h1>
          <p className="text-sm text-muted-foreground">Pomodoro mode — focus in 25-minute sprints.</p>
        </div>
        <button
          onClick={() => setSettings((v) => !v)}
          className="rounded-xl border border-border bg-card p-2.5 hover:bg-muted/30 transition-colors"
        >
          <Settings2 className="h-4.5 w-4.5 text-muted-foreground" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex items-center rounded-2xl border border-border bg-card p-1.5 gap-1">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
              mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* SVG ring timer */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--color-muted)" strokeWidth="10" />
            <circle
              cx="110" cy="110" r={radius} fill="none"
              stroke={running ? "var(--color-primary)" : "var(--color-muted-foreground)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={strokeDash}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold tabular-nums ${MODE_COLORS[mode]}`}>{fmt(remaining)}</span>
            <span className="mt-1 text-xs text-muted-foreground">{MODE_LABELS[mode]}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={reset}
            className="rounded-2xl border border-border bg-card p-3.5 text-muted-foreground transition-all hover:bg-muted/30"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={running ? pause : start}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
          >
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
          </button>
          <button
            onClick={() => switchMode(mode === "focus" ? "short" : "focus")}
            className="rounded-2xl border border-border bg-card p-3.5 text-muted-foreground transition-all hover:bg-muted/30"
          >
            <Coffee className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sessions today", value: sessions,       icon: BookOpen, color: "text-primary" },
          { label: "Minutes today",  value: totalToday,     icon: Clock,    color: "text-blue-500" },
          { label: "Completed",      value: `${sessions * 25}m`, icon: Check, color: "text-emerald-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
            <Icon className={`mx-auto mb-1.5 h-4.5 w-4.5 ${color}`} />
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-foreground">Duration settings (minutes)</p>
          <div className="grid grid-cols-3 gap-4">
            {(["focus", "short", "long"] as Mode[]).map((m) => (
              <div key={m} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{MODE_LABELS[m]}</label>
                <input
                  type="number"
                  min={1} max={120}
                  value={Math.round(durations[m] / 60)}
                  onChange={(e) => handleDurationChange(m, Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-center focus:border-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <p className="text-center text-xs text-muted-foreground">
        Each completed focus session is automatically logged to your study stats.
      </p>
    </div>
  );
}

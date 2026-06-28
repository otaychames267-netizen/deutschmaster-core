import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen, Headphones, PenLine, Wrench,
  GraduationCap, ChevronRight, Clock, Target, Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/schriftlich/")({
  component: SchriftlichIndexPage,
});

const SKILLS = [
  { icon: BookOpen,    label: "Lesen",           color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    gradient: "from-blue-500/8 to-transparent",    parts: 3 },
  { icon: Headphones,  label: "Hören",           color: "text-violet-500",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  gradient: "from-violet-500/8 to-transparent",  parts: 3 },
  { icon: Wrench,      label: "Sprachbausteine", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", gradient: "from-emerald-500/8 to-transparent", parts: 2 },
  { icon: PenLine,     label: "Schreiben",       color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   gradient: "from-amber-500/8 to-transparent",   parts: 2 },
];

function SchriftlichIndexPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">

      {/* ── Premium Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-8 text-white shadow-xl shadow-blue-500/25">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-36 w-36 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/25">
                <PenLine className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100/60">Written Exam</p>
                <h1 className="text-2xl font-black tracking-tight">Schriftlich</h1>
              </div>
            </div>
            <p className="text-sm text-blue-100/75 max-w-md">
              Master all four sections of the TELC written exam — Reading, Listening, Grammar, and Writing.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Clock className="h-3 w-3" /> 2h 25min
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Target className="h-3 w-3" /> 4 Sections
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Zap className="h-3 w-3" /> Auto-scored
              </span>
            </div>
          </div>

          {/* Progress widget */}
          <div className="hidden sm:block shrink-0">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/15 min-w-[175px]">
              <p className="text-xs font-bold text-blue-100/60 uppercase tracking-wide mb-3">Your Progress</p>
              <div className="space-y-2.5">
                {SKILLS.map(s => (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-[10px]">
                      <span className="text-white/70 font-medium">{s.label}</span>
                      <span className="text-white/50">0%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-white/60" style={{ width: "2%" }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[9px] text-blue-100/40">Start practising to track progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two Action Cards ─────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">

        {/* Vorbereitung → proper route */}
        <Link
          to="/schriftlich/vorbereitung"
          className="group relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500/30"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex w-full items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/15 group-hover:ring-blue-500/30">
              <PenLine className="h-7 w-7 text-blue-500" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-all group-hover:bg-blue-500/10 group-hover:translate-x-0.5">
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
          <div className="relative flex-1">
            <p className="text-xl font-black text-foreground tracking-tight">Vorbereitung</p>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Practice each skill and exam part individually. Build confidence section by section before the full exam.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-1.5">
            {["Lesen", "Hören", "Sprachbausteine", "Schreiben"].map(s => (
              <span key={s} className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {s}
              </span>
            ))}
          </div>
        </Link>

        {/* Prüfungssimulation */}
        <Link
          to="/schriftlich/pruefung"
          className="group relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/8 to-card p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex w-full items-start justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/25 transition-all group-hover:bg-blue-500/20 group-hover:ring-blue-500/40">
              <GraduationCap className="h-7 w-7 text-blue-500" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 transition-all group-hover:bg-blue-500/20 group-hover:translate-x-0.5">
              <ChevronRight className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="relative flex-1">
            <p className="text-xl font-black text-foreground tracking-tight">Prüfungssimulation</p>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Full written exam under timed, realistic conditions. All 4 sections in sequence. Auto-generated and instantly scored.
            </p>
          </div>
          <div className="relative flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-blue-500" /> 2h 25min
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="font-medium">All 4 sections</span>
          </div>
        </Link>
      </div>

      {/* ── Exam Structure Overview ──────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-foreground">Exam Structure</p>
            <p className="text-xs text-muted-foreground">TELC Schriftlich — all four sections</p>
          </div>
          <span className="rounded-xl bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">2h 25min total</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map(skill => (
            <Link
              key={skill.label}
              to="/schriftlich/vorbereitung"
              className={`group rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer bg-gradient-to-br ${skill.gradient} ${skill.border}`}
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${skill.bg} transition-all group-hover:scale-105`}>
                <skill.icon className={`h-4 w-4 ${skill.color}`} />
              </div>
              <p className="text-sm font-black text-foreground">{skill.label}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground/60 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {skill.parts} Teile
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic, GraduationCap, ChevronRight, Clock,
  Presentation, MessageSquare, Users, Target, Zap,
  Lightbulb, BookOpen, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/muendlich/")({
  component: MuendlichIndexPage,
});

const TEILE = [
  {
    number: 1,
    icon: Presentation,
    label: "Präsentation",
    subtitle: "Teil 1",
    description: "Present a prepared topic in 2–3 minutes. You receive a cue card with bullet points and 2 minutes to prepare.",
    duration: "4–5 min",
    skills: ["Structured presentation", "Idiomatic phrases", "Handling follow-up questions"],
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    hover: "hover:border-rose-500/40 hover:shadow-rose-500/10",
    gradient: "from-rose-500/6 to-transparent",
    to: "/muendlich/vorbereitung/teil-1",
  },
  {
    number: 2,
    icon: MessageSquare,
    label: "Über ein Thema sprechen",
    subtitle: "Teil 2",
    description: "React to a short text stimulus (quote, headline, statistic) and discuss it freely with your exam partner.",
    duration: "3–4 min",
    skills: ["Expressing opinions", "Agreeing & disagreeing", "Active listening"],
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    hover: "hover:border-pink-500/40 hover:shadow-pink-500/10",
    gradient: "from-pink-500/6 to-transparent",
    to: "/muendlich/vorbereitung/teil-2",
  },
  {
    number: 3,
    icon: Users,
    label: "Etwas gemeinsam planen",
    subtitle: "Teil 3",
    description: "Plan something jointly with your partner — you must reach a shared decision. Negotiation and compromise required.",
    duration: "4–5 min",
    skills: ["Making proposals", "Finding compromises", "Polite refusals"],
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/20",
    hover: "hover:border-fuchsia-500/40 hover:shadow-fuchsia-500/10",
    gradient: "from-fuchsia-500/6 to-transparent",
    to: "/muendlich/vorbereitung/teil-3",
  },
];

function MuendlichIndexPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">

      {/* ── Premium Hero ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-700 via-rose-500 to-pink-400 p-8 text-white shadow-xl shadow-rose-500/25">
        <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-36 w-36 rounded-full bg-pink-300/15 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/25">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-100/60">Oral Exam</p>
                <h1 className="text-2xl font-black tracking-tight">Mündlich</h1>
              </div>
            </div>
            <p className="text-sm text-rose-100/75 max-w-md">
              Build confidence in all three speaking tasks of the TELC oral exam — present, discuss, and plan together.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Clock className="h-3 w-3" /> ~15 min
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Target className="h-3 w-3" /> 3 Speaking tasks
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Zap className="h-3 w-3" /> Interactive
              </span>
            </div>
          </div>

          {/* Prüfungssimulation quick link */}
          <div className="hidden sm:block shrink-0">
            <Link
              to="/muendlich/pruefung"
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/15 hover:bg-white/15 transition-colors min-w-[160px] text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Prüfungssimulation</p>
                <p className="mt-0.5 text-[10px] text-rose-100/60">All 3 tasks · ~15 min</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Study order tip ─────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm text-foreground">
          <strong>Study order:</strong> Start with Teil 1 (Präsentation) — prepare your topic in advance. Then practice Teil 2 for spontaneous reactions. Tackle Teil 3 last as it requires collaborative negotiation. Run the full Prüfungssimulation once confident.
        </p>
      </div>

      {/* ── Direct Teil Practice Cards ───────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">Vorbereitung</h2>
            <p className="text-sm text-muted-foreground">Click any Teil to start practising immediately.</p>
          </div>
          <Link
            to="/muendlich/pruefung"
            className="flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/8 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors sm:hidden"
          >
            Full Sim <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="space-y-4">
          {TEILE.map((teil) => (
            <Link
              key={teil.to}
              to={teil.to}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-r ${teil.gradient} ${teil.border} ${teil.hover}`}
            >
              <div className="relative flex items-start gap-5 p-6">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${teil.bg} ring-1 ${teil.border} transition-all duration-200 group-hover:scale-105`}>
                    <teil.icon className={`h-6 w-6 ${teil.color}`} />
                  </div>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${teil.bg} ${teil.color}`}>
                    {teil.number}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{teil.subtitle}</p>
                      <p className="text-lg font-black text-foreground mt-0.5">{teil.label}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <span className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                        <Clock className="h-3 w-3" /> {teil.duration}
                      </span>
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${teil.bg} transition-all group-hover:translate-x-0.5`}>
                        <ChevronRight className={`h-4 w-4 ${teil.color}`} />
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{teil.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {teil.skills.map(skill => (
                      <span key={skill} className={`rounded-lg ${teil.bg} px-2.5 py-1 text-[10px] font-semibold ${teil.color}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`border-t border-dashed ${teil.border} bg-muted/20 px-6 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> Tipps & Redemittel</span>
                  <span className="flex items-center gap-1.5"><MessageCircle className="h-3 w-3" /> Phrase examples</span>
                </div>
                <span className={`text-xs font-bold ${teil.color} flex items-center gap-1`}>
                  Start practising <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Exam tips ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-black text-foreground mb-4">What examiners look for</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Fluency", desc: "Speak without long pauses. Mistakes are OK — stopping is not." },
            { label: "Structure", desc: "Use clear introductions and conclusions. Show you can organise ideas." },
            { label: "Interaction", desc: "React to your partner. Asking questions shows active listening." },
          ].map(tip => (
            <div key={tip.label} className="rounded-xl bg-muted/40 p-3.5">
              <p className="text-xs font-black text-foreground mb-1">{tip.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Full simulation CTA (mobile) ─────────────────────── */}
      <Link
        to="/muendlich/pruefung"
        className="sm:hidden group flex items-center justify-between rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/8 to-card p-5 shadow-sm hover:border-rose-500/40 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
            <GraduationCap className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="font-black text-foreground text-sm">Prüfungssimulation</p>
            <p className="text-xs text-muted-foreground">All 3 tasks · ~15 min · Exam conditions</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

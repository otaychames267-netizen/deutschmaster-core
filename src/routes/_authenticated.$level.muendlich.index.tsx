import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic, GraduationCap, ChevronRight, Clock,
  Presentation, MessageSquare, Users, Target, Zap,
  Lightbulb, BookOpen, MessageCircle, Lock, Bot,
} from "lucide-react";
import { useLevelSegment } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/$level/muendlich/")({
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

/** Shared visual shell for the three Mündlich nav entry points (Vorbereitung,
 * Prüfungssimulation, AI 1:1) — a mini hero banner (gradient + decorative
 * blur, matching MuendlichTopicCards.tsx's HeroCard language) over a label
 * block, so these read as the same premium card family as every other
 * Mündlich card instead of a plain bordered icon-in-a-circle tile. */
function NavTileShell({ icon: Icon, title, subtitle, from, to, locked, chevron }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  from: string;
  to: string;
  locked?: boolean;
  chevron?: boolean;
}) {
  return (
    <div className={`flex aspect-square w-full flex-col overflow-hidden rounded-3xl border shadow-sm transition-all duration-300 ${locked ? "cursor-not-allowed border-border" : "group-hover:-translate-y-1 group-hover:shadow-xl border-transparent"}`}>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{ background: locked ? "linear-gradient(150deg, #64748b, #cbd5e1)" : `linear-gradient(150deg, ${from}, ${to})` }}
      >
        {locked && <div className="absolute inset-0 bg-background/55" />}
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-black/10 blur-xl" />
        {locked && (
          <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground shadow-sm">
            <Lock className="h-2.5 w-2.5" /> Bald
          </span>
        )}
        <Icon className={`h-11 w-11 drop-shadow-lg transition-transform duration-300 ${locked ? "text-white/70" : "text-white/90 group-hover:scale-110 group-hover:rotate-6"}`} />
      </div>
      <div className="flex items-center justify-between gap-2 bg-card px-4 py-3">
        <div className="min-w-0">
          <p className={`truncate text-sm font-black ${locked ? "text-muted-foreground" : "text-foreground"}`}>{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {chevron && !locked && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </div>
  );
}

/** A locked, non-interactive square tile — used for features that are
 * temporarily restricted to admin-only preview. Never an <a>/<Link>, so it
 * never navigates and never bounces through a route's own redirect-away
 * gate (which would look like a broken click to a regular user). */
function LockedTile({ icon, title, subtitle, from, to }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; from: string; to: string }) {
  return (
    <div className="select-none">
      <NavTileShell icon={icon} title={title} subtitle={subtitle} from={from} to={to} locked />
    </div>
  );
}

function MuendlichIndexPage() {
  const seg = useLevelSegment();
  const { isAdmin } = useAuth();
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
        </div>
      </div>

      {/* ── Triangle nav: Vorbereitung + Prüfungssimulation on top, AI 1:1 centered below ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => document.getElementById("vorbereitung-teile")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="group text-left"
          >
            <NavTileShell icon={BookOpen} title="Vorbereitung" subtitle="3 Teile einzeln üben" from="#e11d48" to="#fda4af" chevron />
          </button>

          {isAdmin ? (
            <Link to={`/${seg}/muendlich/pruefung` as never} className="group">
              <NavTileShell icon={GraduationCap} title="Prüfungssimulation" subtitle="Alle 3 Teile · ~15 min" from="#a21caf" to="#f0abfc" chevron />
            </Link>
          ) : (
            <LockedTile icon={GraduationCap} title="Prüfungssimulation" subtitle="Alle 3 Teile · ~15 min" from="#a21caf" to="#f0abfc" />
          )}
        </div>

        <div className="flex justify-center">
          <div className="w-[calc(50%-0.5rem)]">
            {isAdmin ? (
              <Link to={`/${seg}/muendlich/voice-tutor` as never} className="group">
                <NavTileShell icon={Bot} title="AI 1:1" subtitle="KI-Sprachpartner · Admin-Vorschau" from="#4338ca" to="#a5b4fc" chevron />
              </Link>
            ) : (
              <LockedTile icon={Bot} title="AI 1:1" subtitle="KI-Sprachpartner · demnächst" from="#4338ca" to="#a5b4fc" />
            )}
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
      <div id="vorbereitung-teile" className="scroll-mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-black text-foreground">Vorbereitung</h2>
          <p className="text-sm text-muted-foreground">Click any Teil to start practising immediately.</p>
        </div>

        <div className="space-y-4">
          {TEILE.map((teil) => (
            <Link
              key={teil.to}
              to={`/${seg}${teil.to}` as never}
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
    </div>
  );
}

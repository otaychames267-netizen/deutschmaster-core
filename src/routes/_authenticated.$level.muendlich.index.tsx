import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic, GraduationCap, ChevronRight, Clock,
  Presentation, MessageSquare, Users, Target, Zap,
  Lightbulb, BookOpen, MessageCircle, Lock, Bot,
} from "lucide-react";
import { useLevelSegment } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { voiceTutorAvailable } from "@/lib/features";

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

/** Big action card — same shape, padding and content layout as Schriftlich's
 * own Vorbereitung/Prüfungssimulation cards (_authenticated.$level.
 * schriftlich.index.tsx): icon chip top-left, chevron top-right, title,
 * description paragraph, then either a chip row or a duration/count line.
 * `accent` is a Tailwind color stem (e.g. "rose") so every usage pulls real
 * utility classes (bg-rose-500/10 etc.), never an interpolated class name
 * Tailwind's build-time scanner wouldn't otherwise see. */
function BigActionCard({ icon: Icon, accent, highlighted, title, description, meta, href, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  accent: "rose" | "fuchsia" | "indigo";
  highlighted?: boolean;
  title: string;
  description: string;
  meta: { chips: string[] } | { duration: string; detail: string };
  // Exactly one of these: `href` for a real sub-page (rendered as a Link,
  // like Schriftlich's own cards), `onClick` for same-page behavior (the
  // Mündlich "Vorbereitung" card scrolls to its section below instead of
  // navigating, since Mündlich has no standalone Vorbereitung page).
  href?: string;
  onClick?: () => void;
}) {
  const ring = { rose: "ring-rose-500/20 group-hover:ring-rose-500/30", fuchsia: "ring-fuchsia-500/20 group-hover:ring-fuchsia-500/30", indigo: "ring-indigo-500/20 group-hover:ring-indigo-500/30" }[accent];
  const iconBg = { rose: "bg-rose-500/10 group-hover:bg-rose-500/15", fuchsia: "bg-fuchsia-500/10 group-hover:bg-fuchsia-500/15", indigo: "bg-indigo-500/10 group-hover:bg-indigo-500/15" }[accent];
  const iconColor = { rose: "text-rose-500", fuchsia: "text-fuchsia-500", indigo: "text-indigo-500" }[accent];
  const border = { rose: "hover:border-rose-500/30", fuchsia: "border-fuchsia-500/25 hover:border-fuchsia-500/50", indigo: "border-indigo-500/25 hover:border-indigo-500/50" }[accent];
  const highlightBg = { rose: "bg-rose-500/15 group-hover:bg-rose-500/20", fuchsia: "bg-fuchsia-500/15 group-hover:bg-fuchsia-500/20", indigo: "bg-indigo-500/15 group-hover:bg-indigo-500/20" }[accent];
  const chevronBg = { rose: "group-hover:bg-rose-500/10", fuchsia: "bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20", indigo: "bg-indigo-500/10 group-hover:bg-indigo-500/20" }[accent];
  const chevronColor = { rose: "group-hover:text-rose-500", fuchsia: "text-fuchsia-500", indigo: "text-indigo-500" }[accent];
  const hoverGradient = { rose: "from-rose-500/4", fuchsia: "from-fuchsia-500/6", indigo: "from-indigo-500/6" }[accent];
  const chipHover = { rose: "group-hover:bg-rose-500/10 group-hover:text-rose-600 dark:group-hover:text-rose-400", fuchsia: "", indigo: "" }[accent];
  const highlightedCard = { rose: "border-rose-500/25 bg-gradient-to-br from-rose-500/8 to-card hover:shadow-rose-500/10", fuchsia: "border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/8 to-card hover:shadow-fuchsia-500/10", indigo: "border-indigo-500/25 bg-gradient-to-br from-indigo-500/8 to-card hover:shadow-indigo-500/10" }[accent];

  const className = `group relative flex w-full flex-col items-start gap-5 overflow-hidden rounded-2xl border p-7 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${highlighted ? `${highlightedCard} ${border}` : `border-border bg-card ${border}`}`;
  const content = (
    <>
      {!highlighted && <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${hoverGradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />}
      <div className="relative flex w-full items-start justify-between">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-all ${highlighted ? highlightBg : iconBg} ${ring}`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all group-hover:translate-x-0.5 ${highlighted ? chevronBg : `bg-muted ${chevronBg}`}`}>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-colors ${chevronColor}`} />
        </div>
      </div>
      <div className="relative flex-1">
        <p className="text-xl font-black text-foreground tracking-tight">{title}</p>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {"chips" in meta ? (
        <div className="relative flex flex-wrap gap-1.5">
          {meta.chips.map((c) => (
            <span key={c} className={`rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide transition-colors ${chipHover}`}>{c}</span>
          ))}
        </div>
      ) : (
        <div className="relative flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium"><Clock className={`h-3.5 w-3.5 ${iconColor}`} /> {meta.duration}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <span className="font-medium">{meta.detail}</span>
        </div>
      )}
    </>
  );
  return href ? (
    <Link to={href as never} className={className}>{content}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{content}</button>
  );
}

/** Locked variant of BigActionCard — same size/shape so the layout never
 * shifts between admin and regular-user views, but a non-interactive `div`
 * (never a Link) so it can't navigate into a route's own redirect-away gate,
 * plus a muted palette and a "Bald" badge instead of the real CTA. */
function LockedBigActionCard({ icon: Icon, title, description, meta }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  meta: { chips: string[] } | { duration: string; detail: string };
}) {
  return (
    <div className="relative flex cursor-not-allowed select-none flex-col items-start gap-5 overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20 p-7 opacity-80">
      <span className="absolute right-5 top-5 flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        <Lock className="h-3 w-3" /> Bald
      </span>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xl font-black text-muted-foreground tracking-tight">{title}</p>
        <p className="mt-1.5 text-sm text-muted-foreground/70 leading-relaxed">{description}</p>
      </div>
      {"chips" in meta ? (
        <div className="flex flex-wrap gap-1.5">
          {meta.chips.map((c) => (
            <span key={c} className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wide">{c}</span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1.5 font-medium"><Clock className="h-3.5 w-3.5" /> {meta.duration}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <span className="font-medium">{meta.detail}</span>
        </div>
      )}
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

      {/* ── Action cards: same shape/size as Schriftlich's own Vorbereitung
          + Prüfungssimulation cards. AI 1:1 is a bonus/preview feature, not
          one of the two core paths, so it gets its own full-width row below
          rather than squeezing into the 2-up grid. ── */}
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <BigActionCard
            icon={BookOpen}
            accent="rose"
            title="Vorbereitung"
            description="Practice each of the three speaking tasks individually. Build confidence task by task before the full exam."
            meta={{ chips: ["Teil 1", "Teil 2", "Teil 3"] }}
            onClick={() => document.getElementById("vorbereitung-teile")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />

          {isAdmin ? (
            <BigActionCard
              icon={GraduationCap}
              accent="fuchsia"
              highlighted
              title="Prüfungssimulation"
              description="Full oral exam with a real exam partner, under timed, realistic conditions. All three tasks in sequence."
              meta={{ duration: "~15 min", detail: "All 3 tasks" }}
              href={`/${seg}/muendlich/pruefung`}
            />
          ) : (
            <LockedBigActionCard
              icon={GraduationCap}
              title="Prüfungssimulation"
              description="Full oral exam with a real exam partner, under timed, realistic conditions. All three tasks in sequence."
              meta={{ duration: "~15 min", detail: "All 3 tasks" }}
            />
          )}
        </div>

        {/* AI 1:1 is closed for students until the public launch (VOICE_TUTOR_ENABLED in features.ts + the relay
            secret MUENDLICH_TUTOR_ENABLED); admins get the preview (VOICE_TUTOR_ADMIN_PREVIEW). */}
        {voiceTutorAvailable(isAdmin) ? (
          <BigActionCard
            icon={Bot}
            accent="rose"
            title="AI 1:1"
            description="Practice solo with an AI speaking partner — no need to wait for another candidate. Admin preview."
            meta={{ duration: "~15 min", detail: "KI-Sprachpartner" }}
            href={`/${seg}/muendlich/voice-tutor`}
          />
        ) : (
          <LockedBigActionCard
            icon={Bot}
            title="AI 1:1"
            description="Practice solo with an AI speaking partner — no need to wait for another candidate. Coming soon."
            meta={{ duration: "Flexible", detail: "KI-Sprachpartner" }}
          />
        )}

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

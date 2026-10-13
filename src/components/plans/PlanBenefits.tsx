import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Bot, BookOpen, CalendarCheck, ClipboardCheck, Headphones, Layers, Mic, PenLine, Puzzle, Sparkles, Timer, TrendingUp, Users } from "lucide-react";

export interface PlanBenefit {
  icon: LucideIcon;
  /** The exam part / feature name, kept in German so students recognise it. */
  title: string;
  /** A few plain-Arabic words saying what the student gets. */
  ar: string;
  /** The things only this platform does — their icon is drawn in the accent colour. */
  highlight?: boolean;
  /** Heading of the block this row sits in (consecutive rows with the same group share one heading). */
  group?: string;
}

/** What the Schriftlich plan really includes. Every line here is backed by the DB/RLS (see has_plan_access, the
 * Struktur/simulation RPCs and learning_aids coverage) — keep it that way: do not add a claim that is not enforced.
 * Prüfungssimulation: ONE server-anchored 145-minute timer across all sections (start_simulation: Lesen T1-3, Sprachbausteine T1-2, Hören T1-3, Schreiben),
 * so the student really does have to split their own time; its Schreiben grading is free and uncapped (api.schreiben.submit-simulation.ts spends no credit,
 * start_simulation has no count limit) — that is what the "بلا حدّ" refers to, NOT the 30 practice-correction credits of the Schreiben tasks. */
export const SCHRIFTLICH_BENEFITS: PlanBenefit[] = [
  { group: "Schriftlich", icon: BookOpen, title: "Lesen", ar: "كل المواضيع + ترجمة وتبرير الإجابات", highlight: true },
  { group: "Schriftlich", icon: Headphones, title: "Hören", ar: "الأجزاء الثلاثة + ترجمة وتلميح لكل إجابة", highlight: true },
  { group: "Schriftlich", icon: Puzzle, title: "Sprachbausteine", ar: "كل المواضيع + شرح القاعدة لكل فراغ", highlight: true },
  { group: "Schriftlich", icon: PenLine, title: "Schreiben", ar: "تمارين Beschwerde و Bitte" },
  { group: "Schriftlich", icon: Bot, title: "Schreiben KI-Korrektur", ar: "تصحيح بمعايير TELC B2: 30 كل شهر (60 مع باقة الشهرين، 90 مع باقة 3 أشهر)", highlight: true },
  { group: "Schriftlich", icon: Sparkles, title: "2 Struktur Schreiben", ar: "خاصان بك وحدك", highlight: true },
  { group: "Prüfungssimulation", icon: Timer, title: "Prüfungssimulation", ar: "امتحان كتابي كامل بهيكل TELC B2 (145 دقيقة) مع تصحيح Schreiben بالذكاء الاصطناعي بلا حدّ", highlight: true },
  { group: "Mündlich & Extras", icon: Mic, title: "Mündlich", ar: "كل مواضيع الأجزاء الثلاثة + نصائح وعبارات، بدون AI", highlight: true },
  { group: "Mündlich & Extras", icon: BarChart3, title: "Extras", ar: "متابعة تقدّمك + مكتبة امتحانات تدريبية" },
];

/** What the Komplett plan (komplett_ai) really includes: everything in Schriftlich + the KI-Sprachtrainer 1:1. Same rule as above — every line is backed
 * by the database or the relay: access = has_plan_access(user, 'muendlich_ai') + a trigger on voice_tutor_sessions; the session is Teil 1 -> 2 -> 3
 * (10-14 minutes: Teil 2 = 5 and Teil 3 = 6 partner turns, answers up to 40 s; measured 9.5-10.6 with short answers, 13.7 on the production relay 2026-10-12, earlier runs 11-13); the correction report is the post-session pass in voice-tutor-correction.ts (verbatim quotes, categories Grammatik /
 * Wortstellung / Kasus / Verbformen / Wortschatz / Redemittel, better formulations, vocabulary); the limits are platform_settings muendlich_ai_daily_limit (2)
 * and muendlich_ai_monthly_limit (50), plus the per-mode USD budget muendlich_ai_budget_usd_one_to_one (8) — migration 20261011180000. The partner (Teil 2 + 3) is the
 * tutor's practice-partner persona; Dein Fortschritt = VoiceTutorProgress (voice_tutor_corrections.feedback.scores, RLS own rows). The tutor does NOT assess pronunciation — never claim it. */
export const KOMPLETT_BENEFITS: PlanBenefit[] = [
  { group: "Inklusive", icon: Layers, title: "Alles aus Gold", ar: "Lesen و Hören و Sprachbausteine و Schreiben + Mündlich Vorbereitung" },
  { group: "KI-Sprachtrainer", icon: Bot, title: "KI-Prüferin", ar: "تتكلّم بصوتك مع ممتحِنة بالذكاء الاصطناعي تردّ عليك مباشرة", highlight: true },
  { group: "KI-Sprachtrainer", icon: Users, title: "KI-Partnerin", ar: "في الجزأين 2 و3 تتحاور وتخطّط مع شريك بصوت مختلف", highlight: true },
  { group: "KI-Sprachtrainer", icon: Mic, title: "Teil 1 · 2 · 3", ar: "امتحان شفوي كامل بتسلسل TELC B2، من 10 إلى 14 دقيقة", highlight: true },
  { group: "KI-Sprachtrainer", icon: ClipboardCheck, title: "Ergebnis & Korrektur", ar: "بعد كل جلسة: درجتك من 75 ومستواك + تقرير بأخطائك وتصحيحها", highlight: true },
  { group: "KI-Sprachtrainer", icon: TrendingUp, title: "Dein Fortschritt", ar: "تتابع نتائج جلساتك وتشوف تقدّمك", highlight: true },
  { group: "KI-Sprachtrainer", icon: CalendarCheck, title: "Fair Use", ar: "حتى جلستين يومياً و50 جلسة شهرياً (100 مع الشهرين، 150 مع 3 أشهر)" },
];

interface Accent { bg: string; text: string; ring: string }
const DEFAULT_ACCENT: Accent = { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" };

/** Rows fade/slide in one after another the first time the list scrolls into view. Server render and no-JS keep
 * everything visible; reduced-motion users never get the hidden "armed" state at all. */
function useRevealOnView() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "armed" | "shown">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, state };
}

/** The feature list of a plan card, drawn for the dark navy/metal card ground: rows grouped under small headings, each row = icon + German title with the
 * Arabic line under it (one line each — keep the copy short). `accent` / `onPrimary` are accepted for older call sites and ignored: the accent colour is the
 * card's own --color-gold (platinum inside .tier-platinum). */
export function PlanBenefits({ benefits }: { benefits: PlanBenefit[]; accent?: Accent; onPrimary?: boolean }) {
  const { ref, state } = useRevealOnView();
  const groups: { name: string | undefined; rows: PlanBenefit[] }[] = [];
  for (const b of benefits) {
    const last = groups[groups.length - 1];
    if (last && last.name === b.group) last.rows.push(b); else groups.push({ name: b.group, rows: [b] });
  }
  let n = 0;
  return (
    <div ref={ref as unknown as React.RefObject<HTMLDivElement>} className="space-y-5">
      {groups.map((g) => (
        <section key={g.name ?? "rows"} aria-label={g.name}>
          {g.name && (
            <h3 className="mb-3 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/45">
              <span>{g.name}</span>
              <span aria-hidden className="h-px flex-1 bg-white/10" />
            </h3>
          )}
          <ul className="space-y-3">
            {g.rows.map((b) => (
              <li
                key={b.title}
                style={{ "--i": n++ } as React.CSSProperties}
                className={`flex items-start gap-3 ${state === "armed" ? "plan-row-armed" : state === "shown" ? "plan-row-show" : ""}`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                    b.highlight ? "bg-gold/15 text-gold ring-gold/30" : "bg-white/[0.05] text-white/60 ring-white/10"
                  }`}
                >
                  <b.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="text-[13.5px] font-semibold leading-tight text-white">{b.title}</p>
                  <p dir="rtl" lang="ar" style={{ textAlign: "left" }} className="mt-0.5 text-[12px] leading-snug text-white/65">{b.ar}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

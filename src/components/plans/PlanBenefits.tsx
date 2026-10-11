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
}

/** What the Schriftlich plan really includes. Every line here is backed by the DB/RLS (see has_plan_access, the
 * Struktur/simulation RPCs and learning_aids coverage) — keep it that way: do not add a claim that is not enforced.
 * Prüfungssimulation: ONE server-anchored 145-minute timer across all sections (start_simulation: Lesen T1-3, Sprachbausteine T1-2, Hören T1-3, Schreiben),
 * so the student really does have to split their own time; its Schreiben grading is free and uncapped (api.schreiben.submit-simulation.ts spends no credit,
 * start_simulation has no count limit) — that is what the "بلا حدّ" refers to, NOT the 30 practice-correction credits of the Schreiben tasks. */
export const SCHRIFTLICH_BENEFITS: PlanBenefit[] = [
  { icon: BookOpen, title: "Lesen", ar: "كل المواضيع + ترجمة وتبرير الإجابات", highlight: true },
  { icon: Headphones, title: "Hören", ar: "مواضيع الأجزاء الثلاثة + ترجمة وتلميح لكل إجابة", highlight: true },
  { icon: Puzzle, title: "Sprachbausteine", ar: "كل المواضيع + شرح القاعدة لكل فراغ", highlight: true },
  { icon: PenLine, title: "Schreiben", ar: "تمارين Beschwerde و Bitte" },
  { icon: Bot, title: "Schreiben KI-Korrektur", ar: "تصحيح بالذكاء الاصطناعي بمعايير TELC B2: 30 تصحيحاً لكل شهر (و60 مع باقة الشهرين)", highlight: true },
  { icon: Sparkles, title: "2 Struktur Schreiben", ar: "خاصان بك وحدك", highlight: true },
  { icon: Timer, title: "Prüfungssimulation", ar: "امتحان كتابي كامل بنفس هيكل TELC B2 وعدّاد واحد 145 دقيقة، مع تصحيح الـSchreiben بالذكاء الاصطناعي — وبلا حدّ لعدد المحاكاة", highlight: true },
  { icon: Mic, title: "Mündlich", ar: "كل مواضيع الأجزاء الثلاثة + نصائح وعبارات، بدون AI", highlight: true },
  { icon: BarChart3, title: "Extras", ar: "متابعة تقدّمك + مكتبة امتحانات تدريبية" },
];

/** What the Komplett plan (komplett_ai) really includes: everything in Schriftlich + the KI-Sprachtrainer 1:1. Same rule as above — every line is backed
 * by the database or the relay: access = has_plan_access(user, 'muendlich_ai') + a trigger on voice_tutor_sessions; the session is Teil 1 -> 2 -> 3
 * (about 10 minutes: Teil 2 = 5 and Teil 3 = 6 partner turns; measured 9.5-10.6, earlier runs 11-13); the correction report is the post-session pass in voice-tutor-correction.ts (verbatim quotes, categories Grammatik /
 * Wortstellung / Kasus / Verbformen / Wortschatz / Redemittel, better formulations, vocabulary); the limits are platform_settings muendlich_ai_daily_limit (2)
 * and muendlich_ai_monthly_limit (50), plus the per-mode USD budget muendlich_ai_budget_usd_one_to_one (8) — migration 20261011180000. The partner (Teil 2 + 3) is the
 * tutor's practice-partner persona; Dein Fortschritt = VoiceTutorProgress (voice_tutor_corrections.feedback.scores, RLS own rows). The tutor does NOT assess pronunciation — never claim it. */
export const KOMPLETT_BENEFITS: PlanBenefit[] = [
  { icon: Layers, title: "Alles aus Schriftlich", ar: "Lesen و Hören و Sprachbausteine و Schreiben + بطاقات Mündlich Vorbereitung" },
  { icon: Bot, title: "KI-Prüferin", ar: "تتكلّم بصوتك مع ممتحِنة بالذكاء الاصطناعي تردّ عليك مباشرة بصوت حقيقي", highlight: true },
  { icon: Users, title: "KI-Partnerin", ar: "في الجزأين 2 و3 تتحاور وتخطّط مع شريك محادثة بصوت مختلف، كما في الامتحان", highlight: true },
  { icon: Mic, title: "Teil 1 · 2 · 3", ar: "امتحان شفوي كامل بنفس تسلسل TELC B2، حوالي 10 دقائق للجلسة", highlight: true },
  { icon: ClipboardCheck, title: "Ergebnis & Korrektur", ar: "بعد كل جلسة: تقدير درجتك من 75 ومستواك، مع تقرير بأخطائك الحقيقية وتصحيحها", highlight: true },
  { icon: TrendingUp, title: "Dein Fortschritt", ar: "تتابع نتائج جلساتك جلسة بجلسة وتشوف تقدّمك", highlight: true },
  { icon: CalendarCheck, title: "Fair Use", ar: "حتى جلستين يومياً و50 جلسة في الشهر (يعني حتى 100 مع باقة الشهرين)" },
];

interface Accent { bg: string; text: string; ring: string }
const DEFAULT_ACCENT: Accent = { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" };

/** Rows fade/slide in one after another the first time the list scrolls into view. Server render and no-JS keep
 * everything visible; reduced-motion users never get the hidden "armed" state at all. */
function useRevealOnView() {
  const ref = useRef<HTMLUListElement>(null);
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

/** `onPrimary` = the landing page's premium navy/gold card (white text, gold accents). One compact RTL line per benefit. */
export function PlanBenefits({ benefits, accent = DEFAULT_ACCENT, onPrimary = false }: { benefits: PlanBenefit[]; accent?: Accent; onPrimary?: boolean }) {
  const { ref, state } = useRevealOnView();
  return (
    <ul ref={ref} dir="rtl" lang="ar" className="space-y-2">
      {benefits.map((b, i) => (
        <li
          key={b.title}
          style={{ "--i": i } as React.CSSProperties}
          className={`flex items-center gap-2.5 ${state === "armed" ? "plan-row-armed" : state === "shown" ? "plan-row-show" : ""}`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              onPrimary
                ? b.highlight ? "bg-gold/20 text-gold" : "text-white/55"
                : b.highlight ? `${accent.bg} ${accent.text}` : "text-muted-foreground"
            }`}
          >
            <b.icon className="h-3.5 w-3.5" />
          </span>
          <span className={`min-w-0 flex-1 text-[12.5px] leading-snug ${onPrimary ? "text-white/75" : "text-muted-foreground"}`}>
            <b dir="ltr" className={`font-semibold ${onPrimary ? "text-white" : "text-foreground"}`}>{b.title}</b>
            <span aria-hidden="true"> — </span>
            {b.ar}
          </span>
        </li>
      ))}
    </ul>
  );
}

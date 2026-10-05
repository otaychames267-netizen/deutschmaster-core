import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Bot, BookOpen, Headphones, Mic, PenLine, Puzzle, Sparkles, Timer } from "lucide-react";

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
 * Prüfungssimulation: ONE server-anchored 145-minute timer across all sections (start_simulation), so the student
 * really does have to split their own time. */
export const SCHRIFTLICH_BENEFITS: PlanBenefit[] = [
  { icon: BookOpen, title: "Lesen", ar: "كل المواضيع + ترجمة وتبرير الإجابات", highlight: true },
  { icon: Headphones, title: "Hören", ar: "مواضيع الأجزاء الثلاثة + ترجمة وتلميح لكل إجابة", highlight: true },
  { icon: Puzzle, title: "Sprachbausteine", ar: "كل المواضيع + شرح القاعدة لكل فراغ", highlight: true },
  { icon: PenLine, title: "Schreiben", ar: "تمارين Beschwerde و Bitte" },
  { icon: Bot, title: "Schreiben KI-Korrektur", ar: "تصحيح بالذكاء الاصطناعي بمعايير TELC B2، ولكل اشتراك 30 تصحيحاً", highlight: true },
  { icon: Sparkles, title: "2 Struktur Schreiben", ar: "خاصان بك وحدك", highlight: true },
  { icon: Timer, title: "Prüfungssimulation", ar: "امتحان بنظام TELC كما ستجتازه، وتتعلّم تقسيم وقتك", highlight: true },
  { icon: Mic, title: "Mündlich", ar: "كل مواضيع الأجزاء الثلاثة + نصائح وعبارات، بدون AI", highlight: true },
  { icon: BarChart3, title: "Extras", ar: "متابعة تقدّمك + مكتبة امتحانات تدريبية" },
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

import type { LucideIcon } from "lucide-react";
import { BookOpen, Headphones, Lightbulb, Mic, PenLine, Puzzle, Sparkles, Timer } from "lucide-react";

export interface PlanBenefit {
  icon: LucideIcon;
  /** The exam part / feature name, kept in German so students recognise it. */
  title: string;
  /** A few plain-Arabic words saying what the student gets — the whole benefit stays on ONE line. */
  ar: string;
  /** The things only this platform does — their icon is drawn in the accent colour. */
  highlight?: boolean;
}

/** What the Schriftlich plan really includes. Every line here is backed by the DB/RLS (see has_plan_access, the
 * Struktur/simulation RPCs and learning_aids coverage) — keep it that way: do not add a claim that is not enforced. */
export const SCHRIFTLICH_BENEFITS: PlanBenefit[] = [
  { icon: BookOpen, title: "Lesen", ar: "نصوص وأسئلة بنظام TELC" },
  { icon: Headphones, title: "Hören", ar: "تمارين استماع بصيغة الامتحان" },
  { icon: Puzzle, title: "Sprachbausteine", ar: "شرح قاعدة كل فراغ", highlight: true },
  { icon: Lightbulb, title: "Warum?", ar: "ترجمة عربية وتبرير لكل إجابة", highlight: true },
  { icon: PenLine, title: "Schreiben", ar: "تمارين Beschwerde و Bitte" },
  { icon: Sparkles, title: "2 Struktur Schreiben", ar: "خاصان بك وحدك", highlight: true },
  { icon: Timer, title: "Prüfungssimulation", ar: "امتحانات كاملة طوال الشهر", highlight: true },
  { icon: Mic, title: "Mündlich", ar: "بطاقات التحضير (بدون AI)" },
];

interface Accent { bg: string; text: string; ring: string }
const DEFAULT_ACCENT: Accent = { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" };

/** `onPrimary` = drawn on the landing page's solid primary-coloured card (white text). One compact RTL line per benefit. */
export function PlanBenefits({ benefits, accent = DEFAULT_ACCENT, onPrimary = false }: { benefits: PlanBenefit[]; accent?: Accent; onPrimary?: boolean }) {
  return (
    <ul dir="rtl" lang="ar" className="space-y-1.5">
      {benefits.map((b) => (
        <li key={b.title} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              onPrimary
                ? b.highlight ? "bg-white/20 text-primary-foreground" : "text-primary-foreground/70"
                : b.highlight ? `${accent.bg} ${accent.text}` : "text-muted-foreground"
            }`}
          >
            <b.icon className="h-3.5 w-3.5" />
          </span>
          <span className={`min-w-0 flex-1 text-[12.5px] leading-snug ${onPrimary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            <b dir="ltr" className={`font-semibold ${onPrimary ? "text-primary-foreground" : "text-foreground"}`}>{b.title}</b>
            <span aria-hidden="true"> — </span>
            {b.ar}
          </span>
        </li>
      ))}
    </ul>
  );
}

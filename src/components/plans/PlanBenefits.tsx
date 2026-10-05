import type { LucideIcon } from "lucide-react";
import { BookOpen, Headphones, Lightbulb, Mic, PenLine, Puzzle, Sparkles, Timer } from "lucide-react";

export interface PlanBenefit {
  icon: LucideIcon;
  /** Short English/German name of the benefit. */
  title: string;
  /** One short plain-Arabic line (keep it to a single line on a phone) explaining what the student gets. */
  ar: string;
  /** The things only this platform does — their icon is drawn in the accent colour. */
  highlight?: boolean;
}

/** What the Schriftlich plan really includes. Every line here is backed by the DB/RLS (see has_plan_access, the
 * Struktur/simulation RPCs and learning_aids coverage) — keep it that way: do not add a claim that is not enforced. */
export const SCHRIFTLICH_BENEFITS: PlanBenefit[] = [
  { icon: BookOpen, title: "Lesen · Teil 1, 2, 3", ar: "نصوص وأسئلة بنظام TELC مع تصحيح فوري" },
  { icon: Headphones, title: "Hören · Teil 1, 2, 3", ar: "تمارين استماع بصيغة الامتحان الحقيقي" },
  { icon: Puzzle, title: "Sprachbausteine · Teil 1, 2", ar: "شرح قاعدة كل فراغ لتفهم الكلمة الصحيحة", highlight: true },
  { icon: Lightbulb, title: "Arabic translation + “Warum?”", ar: "ترجمة عربية وتبرير لكل إجابة", highlight: true },
  { icon: PenLine, title: "Schreiben · Beschwerde & Bitte", ar: "تمارين الرسائل الرسمية بأسلوب الامتحان" },
  { icon: Sparkles, title: "2 personal Struktur cards", ar: "اثنان من Struktur الكتابة خاصان بك وحدك", highlight: true },
  { icon: Timer, title: "Prüfungssimulation · all month", ar: "امتحانات كاملة بالتوقيت مع نتيجة فورية", highlight: true },
  { icon: Mic, title: "Mündlich · Vorbereitung cards", ar: "بطاقات تحضير الشفوي، بدون ذكاء اصطناعي" },
];

interface Accent { bg: string; text: string; ring: string }
const DEFAULT_ACCENT: Accent = { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" };

/** `onPrimary` = drawn on the landing page's solid primary-coloured card (white text). */
export function PlanBenefits({ benefits, accent = DEFAULT_ACCENT, onPrimary = false }: { benefits: PlanBenefit[]; accent?: Accent; onPrimary?: boolean }) {
  return (
    <ul className="space-y-2">
      {benefits.map((b) => (
        <li key={b.title} className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              onPrimary
                ? b.highlight ? "bg-white/20 text-primary-foreground" : "text-primary-foreground/70"
                : b.highlight ? `${accent.bg} ${accent.text}` : "text-muted-foreground"
            }`}
          >
            <b.icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-semibold leading-snug ${onPrimary ? "text-primary-foreground" : "text-foreground"}`}>{b.title}</span>
            <span
              dir="rtl"
              lang="ar"
              className={`block text-xs leading-relaxed ${onPrimary ? "text-primary-foreground/75" : "text-muted-foreground"}`}
            >
              {b.ar}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

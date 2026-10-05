import type { LucideIcon } from "lucide-react";
import { BookOpen, Headphones, Lightbulb, Mic, PenLine, Puzzle, Sparkles, Timer } from "lucide-react";

export interface PlanBenefit {
  icon: LucideIcon;
  /** Short English/German name of the benefit. */
  title: string;
  /** One plain-Arabic sentence explaining what the student actually gets. */
  ar: string;
  /** The things only this platform does — drawn with a tinted background. */
  highlight?: boolean;
}

/** What the Schriftlich plan really includes. Every line here is backed by the DB/RLS (see has_plan_access, the
 * Struktur/simulation RPCs and learning_aids coverage) — keep it that way: do not add a claim that is not enforced. */
export const SCHRIFTLICH_BENEFITS: PlanBenefit[] = [
  { icon: BookOpen, title: "Lesen · Teil 1, 2, 3", ar: "نصوص وأسئلة بنفس نظام امتحان TELC، مع تصحيح فوري لكل جواب." },
  { icon: Headphones, title: "Hören · Teil 1, 2, 3", ar: "تمارين استماع بنفس صيغة أسئلة الامتحان الحقيقي." },
  { icon: Puzzle, title: "Sprachbausteine · Teil 1, 2", ar: "شرح القاعدة النحوية وراء كل فراغ، لتفهم لماذا هذه الكلمة بالذات.", highlight: true },
  { icon: Lightbulb, title: "Arabic translation + “Warum?”", ar: "ترجمة عربية للنصوص، وتبرير لكل إجابة: لماذا هي صحيحة ولماذا الخيارات الأخرى خاطئة.", highlight: true },
  { icon: PenLine, title: "Schreiben · Beschwerde & Bitte", ar: "تمارين الرسائل الرسمية بنفس أسلوب الامتحان." },
  { icon: Sparkles, title: "2 personal Struktur cards", ar: "اثنان من Struktur الكتابة خاصان بك وحدك: واحد لـ Produkt وواحد لـ Dienstleistung، ولا يشاركك فيهما أي مشترك آخر.", highlight: true },
  { icon: Timer, title: "Prüfungssimulation · all month", ar: "امتحانات كاملة بنفس التوقيت والنظام طوال الشهر، مع نتيجة فورية.", highlight: true },
  { icon: Mic, title: "Mündlich · Vorbereitung cards", ar: "بطاقات التحضير للامتحان الشفوي: المواضيع والنصائح والعبارات الجاهزة (بدون ذكاء اصطناعي)." },
];

interface Accent { bg: string; text: string; ring: string }
const DEFAULT_ACCENT: Accent = { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" };

/** `onPrimary` = drawn on the landing page's solid primary-coloured card (white text). */
export function PlanBenefits({ benefits, accent = DEFAULT_ACCENT, onPrimary = false }: { benefits: PlanBenefit[]; accent?: Accent; onPrimary?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {benefits.map((b) => (
        <li
          key={b.title}
          className={`flex items-start gap-3 rounded-xl px-2.5 py-2 ${
            b.highlight ? (onPrimary ? "bg-white/10 ring-1 ring-white/15" : `${accent.bg} ring-1 ${accent.ring}`) : ""
          }`}
        >
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              onPrimary ? "bg-white/15 text-primary-foreground" : b.highlight ? `bg-background ${accent.text} ring-1 ${accent.ring}` : `${accent.bg} ${accent.text}`
            }`}
          >
            <b.icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-semibold leading-snug ${onPrimary ? "text-primary-foreground" : "text-foreground"}`}>{b.title}</span>
            <span
              dir="rtl"
              lang="ar"
              className={`mt-0.5 block text-[13px] leading-relaxed ${onPrimary ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {b.ar}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

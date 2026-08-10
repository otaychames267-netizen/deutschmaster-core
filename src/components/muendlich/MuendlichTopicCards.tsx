/**
 * Shared Hero Card grid building blocks for the Mündlich Teil 2 / Teil 3
 * main pages (owner decision 2026-08-10): the PDF viewer is gone entirely —
 * every topic is a clickable Hero Card (title, B2 badge, gradient/icon
 * accent, CTA) that opens the topic's full content in a modal. The card
 * itself never carries the actual exam content (no scenario text, no
 * Redemittel) — that's fetched fresh on click, gated by the same
 * has_plan_access RLS as everywhere else: an entitled click returns the
 * real row and the modal renders it; a non-entitled click gets nothing back
 * and the caller shows the paywall instead. Shared between both Teile so
 * the visual language and access behavior never drift between them.
 */
import { motion } from "framer-motion";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { getThemeArt } from "./themeArt";

export interface HeroCardTopic {
  id: string;
  title: string;
  theme_category: string | null;
  difficulty_level: string | null;
  is_unassigned_center: boolean;
}

export function HeroCard({ topic, index, onOpen, loading }: { topic: HeroCardTopic; index: number; onOpen: () => void; loading?: boolean }) {
  const art = getThemeArt(topic.theme_category);
  const Icon = art.icon;
  return (
    <motion.button
      onClick={onOpen}
      disabled={loading}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: (index % 6) * 0.04, ease: "easeOut" }}
      className="group flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg disabled:cursor-wait disabled:opacity-70 sm:p-5"
    >
      <div
        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-20 sm:w-20"
        style={{ background: `linear-gradient(150deg, ${art.from}, ${art.to})` }}
      >
        <div className="absolute -right-3 -top-4 h-14 w-14 rounded-full bg-white/15 blur-lg" />
        <Icon className="h-7 w-7 text-white/90 drop-shadow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 sm:h-9 sm:w-9" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {topic.theme_category && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{topic.theme_category}</span>
          )}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">B2</span>
        </div>
        <h3 className="truncate text-base font-black leading-snug text-foreground">{topic.title}</h3>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-opacity group-hover:opacity-90 sm:px-4">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>Thema öffnen <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></>
        )}
      </div>
    </motion.button>
  );
}

/** The "never introduced in a Tunisian exam center" section header + notice — one large, distinguished label followed by the required guidance text, then the same Hero Card stack. */
export function UnassignedTopicsNotice() {
  return (
    <div className="pt-2">
      <h2 className="mb-4 text-xl font-black tracking-tight text-foreground sm:text-2xl">
        Themen, die in Tunesien noch nie vorgekommen sind
      </h2>
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm leading-relaxed text-foreground">
          Hinweis: Diese Themen sind bisher in Tunesien noch nie in den Prüfungen vorgekommen. Wenn Sie noch genügend Zeit haben, unterschätzen Sie diese Themen nicht und gehen Sie sie durch. Falls Ihre Zeit jedoch knapp ist, machen Sie sich keine Sorgen und konzentrieren Sie sich zuerst auf die Hauptthemen.
        </p>
      </div>
    </div>
  );
}

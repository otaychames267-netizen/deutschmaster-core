/**
 * Shared "dual display" building blocks for the Mündlich Teil 2 / Teil 3
 * main pages (owner decision 2026-08-10): a protected, animated PDF
 * showcase (the actual exam-prep content — Struktur, dialogue, vocabulary,
 * Arabic explanations) plus a grid of plain-text-only topic cards (just the
 * raw scenario prompt, safe to show everyone). Shared between both Teile so
 * the visual language and protection behavior never drift between them.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, AlertCircle, Lock, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getThemeArt } from "./themeArt";

export interface DualDisplayTopic {
  id: string;
  title: string;
  body_text: string | null;
  theme_category: string | null;
  difficulty_level: string | null;
  is_unassigned_center?: boolean;
  level?: string | null;
}

export interface MuendlichBook { storage_path: string; title: string }

/**
 * Large animated PDF card. `book` comes from a has_plan_access-gated table
 * read, so it's already `null` for anyone without an active plan — that's
 * the real access boundary, this component just renders the two states.
 * The iframe's `#toolbar=0&navpanes=0` hash params suppress the browser's
 * built-in PDF viewer chrome (including its own download/print buttons) in
 * Chromium-family browsers, and the context-menu block covers the card
 * frame around it — real protection for the PDF's own rendered content
 * inside a cross-origin iframe isn't something page-level JS can reach, so
 * this is a deterrent layer, same honesty as useContentProtection.
 */
export function ProtectedPdfShowcase({ book, onUnlock }: { book: MuendlichBook | null; onUnlock: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!book) { setUrl(null); setError(null); return; }
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any).storage.from("muendlich-pdfs").createSignedUrl(book.storage_path, 3600);
      if (!active) return;
      if (error || !data?.signedUrl) setError(error?.message ?? "PDF konnte nicht geladen werden");
      else setUrl(data.signedUrl);
    })();
    return () => { active = false; };
  }, [book?.storage_path]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-500/10 via-violet-500/10 to-rose-500/10 p-1.5 shadow-xl"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background: "conic-gradient(from 0deg, rgba(14,165,233,.35), rgba(139,92,246,.35), rgba(244,63,94,.35), rgba(14,165,233,.35))",
          animation: "muendlich-pdf-spin 12s linear infinite",
        }}
      />
      <div className="relative rounded-[22px] bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <FileText className="h-4 w-4 shrink-0 text-sky-500" />
          <p className="min-w-0 flex-1 truncate text-sm font-black text-foreground">{book?.title ?? "Sprechen — Das Meisterbuch"}</p>
          {!book && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </div>
        <div
          className="relative h-[420px] overflow-hidden rounded-b-[22px] bg-muted/30 sm:h-[560px]"
          onContextMenu={(e) => e.preventDefault()}
        >
          {!book ? (
            <LockedPdfCta onUnlock={onUnlock} />
          ) : error ? (
            <div className="flex h-full items-center justify-center gap-2 px-6 text-center text-sm text-rose-600"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>
          ) : !url ? (
            <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin" /></div>
          ) : (
            <iframe title={book.title} src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="h-full w-full border-0" />
          )}
        </div>
      </div>
      <style>{`@keyframes muendlich-pdf-spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

function LockedPdfCta({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 p-4 shadow-lg">
        <Lock className="h-7 w-7 text-white" />
      </div>
      <p className="text-sm font-black text-foreground">Vollständiges PDF-Buch</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        Erklärung, Struktur, Redemittel, Beispieldialog, Wortschatz &amp; die arabische Übersetzung — freigeschaltet mit Komplett.
      </p>
      <button
        onClick={onUnlock}
        className="mt-1 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Download className="h-3.5 w-3.5" /> Jetzt freischalten
      </button>
    </div>
  );
}

const ROTATE_CLASS = ["", "sm:translate-y-3", "sm:-translate-y-2"];

/** Plain-text-only topic card — title + raw scenario prompt, no solutions,
 * dialogue, Redemittel, or vocabulary. The staggered translate + varied
 * per-category gradient/icon give the grid visual rhythm without needing an
 * actual masonry layout. */
export function TopicTextCard({ topic, index, isAdmin }: { topic: DualDisplayTopic; index: number; isAdmin: boolean }) {
  const art = getThemeArt(topic.theme_category);
  const Icon = art.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: (index % 6) * 0.05, ease: "easeOut" }}
      className={`group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${ROTATE_CLASS[index % ROTATE_CLASS.length]}`}
    >
      <div
        className="relative flex h-24 items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
      >
        <div className="absolute -right-4 -top-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
        <div className="absolute -left-6 bottom-0 h-16 w-16 rounded-full bg-black/10 blur-lg" />
        <Icon className="h-10 w-10 text-white/90 drop-shadow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {topic.theme_category && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{topic.theme_category}</span>
          )}
          {topic.difficulty_level && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{topic.difficulty_level}</span>
          )}
          {isAdmin && topic.is_unassigned_center && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Nicht eingeführt</span>
          )}
        </div>
        <h3 className="mb-1.5 text-sm font-black leading-snug text-foreground">{topic.title}</h3>
        {topic.body_text && (
          <p className="line-clamp-6 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{topic.body_text}</p>
        )}
      </div>
    </motion.div>
  );
}

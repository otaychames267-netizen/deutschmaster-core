/**
 * Shared "dual display" building blocks for the Mündlich Teil 2 / Teil 3
 * main pages (owner decision 2026-08-10, extended 2026-08-10): a protected,
 * animated PDF showcase (dialogue, vocabulary, Arabic explanations — stays
 * PDF-exclusive) plus a stack of topic cards that each carry the topic's
 * own title, full scenario text, AND its associated Redemittel/expressions.
 * Shared between both Teile so the visual language and protection behavior
 * never drift between them.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, AlertCircle, Lock, Download, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getThemeArt } from "./themeArt";

/** Normalized Redemittel section, computed per-Teil (see MuendlichTeil2/3Themen) from either the admin's raw speaking_toolbox or the catalog RPC's minimized redemittel_data — TopicTextCard only ever sees this shape. */
export interface RedemittelItem { label: string; lines: string[] }

export interface DualDisplayTopic {
  id: string;
  title: string;
  body_text: string | null;
  theme_category: string | null;
  difficulty_level: string | null;
  is_unassigned_center?: boolean;
  level?: string | null;
  redemittelItems?: RedemittelItem[];
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

/** Full topic card — title, complete scenario text, and its associated
 * Redemittel/expressions. No dialogue transcript, vocabulary list, or
 * Arabic explanation — those stay PDF-exclusive. */
export function TopicTextCard({ topic, index }: { topic: DualDisplayTopic; index: number }) {
  const art = getThemeArt(topic.theme_category);
  const Icon = art.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: (index % 6) * 0.04, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="flex items-stretch">
        <div
          className="relative flex w-20 shrink-0 items-center justify-center overflow-hidden sm:w-28"
          style={{ background: `linear-gradient(160deg, ${art.from}, ${art.to})` }}
        >
          <div className="absolute -right-4 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl" />
          <div className="absolute -left-4 bottom-0 h-14 w-14 rounded-full bg-black/10 blur-lg" />
          <Icon className="h-8 w-8 text-white/90 drop-shadow sm:h-10 sm:w-10" />
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {topic.theme_category && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{topic.theme_category}</span>
            )}
          </div>
          <h3 className="mb-2 text-base font-black leading-snug text-foreground">{topic.title}</h3>
          {topic.body_text && (
            <p className="mb-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{topic.body_text}</p>
          )}
          {topic.redemittelItems && topic.redemittelItems.length > 0 && (
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Redemittel</p>
              {topic.redemittelItems.map((item, i) => (
                <div key={i}>
                  <p className="mb-0.5 text-xs font-bold text-foreground">{item.label}</p>
                  <ul className="space-y-0.5">
                    {item.lines.map((line, j) => (
                      <li key={j} className="text-xs italic leading-relaxed text-muted-foreground">„{line}“</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** The "never introduced in a Tunisian exam center" section — one large,
 * distinguished header (no per-topic badges needed, the header + notice
 * already say it) followed by the required guidance notice, then the same
 * TopicTextCard stack. */
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

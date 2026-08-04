/**
 * Hören card for a locked (non-free) exercise, shown to guests and
 * unsubscribed users. Unlike the fully-locked title-only row used by
 * Lesen/Sprachbausteine, Hören's brief/statement text is always public (see
 * `hoeren_statements_student`, which carries no RLS at all) — only the audio
 * and the correct-answer reveal stay behind the paywall. Every interactive
 * element here is a dead end that opens the paywall modal instead of doing
 * anything real; there is no attempt-storage, scoring, or reveal wiring.
 */
import { Headphones, Lock, BookOpen } from "lucide-react";
import { parseVariant } from "@/lib/exercise-variant";
import { VariantBadge, NewBadge } from "@/components/VariantBadges";

export interface HoerenPreviewStatement { statement_number: number; statement_text: string }

interface Props {
  title: string;
  instructions: string;
  hasAudio: boolean;
  statements: HoerenPreviewStatement[];
  onLockedAction: () => void;
}

export function HoerenLockedPreviewCard({ title, instructions, hasAudio, statements, onLockedAction }: Props) {
  const v = parseVariant(title);
  const sorted = [...statements].sort((a, b) => a.statement_number - b.statement_number);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden opacity-95">
      <div className="p-5 space-y-3 border-b border-border bg-muted/10">
        <div className="flex items-start gap-3">
          <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-foreground">{v.baseTitle}</p>
              {v.variant && <VariantBadge variant={v.variant} />}
            </div>
            {instructions && <p className="text-xs text-muted-foreground whitespace-pre-line mt-1 leading-relaxed">{instructions}</p>}
          </div>
          {v.isNew && <NewBadge />}
        </div>

        {/* Locked audio bar — never fetches or signs a real audio URL */}
        <button
          onClick={onLockedAction}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-left transition-colors hover:bg-amber-500/10"
        >
          <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {hasAudio ? "Log in & subscribe to listen" : "Audio wird bald hinzugefügt"}
          </span>
          {hasAudio && <Headphones className="ml-auto h-3.5 w-3.5 shrink-0 text-amber-500/70" />}
        </button>
      </div>

      {/* Statements: text is real and readable, answers are not */}
      <div className="divide-y divide-border">
        {sorted.map((s) => (
          <div key={s.statement_number} className="px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 shrink-0 opacity-50">
                {["Richtig", "Falsch"].map((label) => (
                  <span key={label} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-current opacity-40" />
                    {label}
                  </span>
                ))}
              </div>
              <span className="shrink-0 text-[11px] font-black text-muted-foreground/50 tabular-nums">{s.statement_number}</span>
              <p className="text-sm text-foreground leading-snug flex-1 min-w-[50%]">{s.statement_text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 flex-wrap">
        <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
          <Lock className="h-3 w-3" /> Subscribe to unlock
        </span>
        <button
          onClick={onLockedAction}
          className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
        >
          <Lock className="h-3.5 w-3.5" /> <BookOpen className="h-3.5 w-3.5" /> Lösung anzeigen
        </button>
      </div>
    </div>
  );
}

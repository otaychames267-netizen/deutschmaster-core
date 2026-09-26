/**
 * "Sätze übersetzen" — a bulk toggle revealing every highlighted evidence
 * sentence's pre-authored Arabic translation at once, so a student doesn't
 * have to open each question's own Warum? card individually to see it.
 * Complements TranslateButton's whole-text "Text/Texte übersetzen"; both
 * stay optional and never auto-open. No live translation call — only
 * already-authored evidence_translation data.
 */
import { useState } from "react";
import { Languages, ChevronDown } from "lucide-react";

export interface SentenceTranslationItem {
  itemKey: string;
  label: string;
  german: string;
  arabic: string;
}

interface Props {
  items: SentenceTranslationItem[];
}

export function SentenceTranslations({ items }: Props) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/5 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition-colors hover:bg-indigo-500/10"
      >
        <Languages className="h-3 w-3" />
        {open ? "Sätze ausblenden" : "Sätze übersetzen"}
        <ChevronDown className={`h-2.5 w-2.5 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1.5 space-y-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-3">
          {items.map((it) => (
            <div key={it.itemKey} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-1.5 py-0.5 font-black text-indigo-700 dark:text-indigo-300">
                {it.label}
              </span>
              <div className="flex-1 space-y-0.5">
                <p className="italic text-muted-foreground">„{it.german}“</p>
                <p dir="rtl" className="text-foreground leading-relaxed">{it.arabic}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

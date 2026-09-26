/**
 * Optional "🧠 Wie finde ich die Antwort?" strategy card — teaches a
 * REUSABLE B2 technique (Schlüsselwörter, Synonyme/Paraphrasen, elimination
 * of wrong options), separate from EvidenceBlock's mandatory evidence/
 * explanation. Deliberately its own trigger so the two stay visually and
 * conceptually distinct: EvidenceBlock answers "why is THIS the answer",
 * this card answers "how would I find that myself next time".
 *
 * 100% admin-authored via learning_aids (keywords/paraphrase/
 * options_reasoning) — renders nothing if none of the three are present, so
 * older exercises without this content simply don't show the trigger yet.
 */
import { useState } from "react";
import { Brain, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import type { LearningAidsItem } from "./types";

interface Props {
  aids: LearningAidsItem | null | undefined;
  triggerLabel?: string;
}

export function StrategyCard({ aids, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  if (!aids) return null;

  const keywords = aids.keywords ?? [];
  const paraphrase = aids.paraphrase ?? [];
  const options = aids.options_reasoning ?? [];
  const hasAnything = keywords.length > 0 || paraphrase.length > 0 || options.length > 0;
  if (!hasAnything) return null;

  const sortedOptions = [...options].sort((a, b) => Number(b.correct) - Number(a.correct));

  return (
    <div className="max-w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/5 px-2.5 py-1.5 text-[12px] font-bold text-sky-700 dark:text-sky-300 transition-colors hover:bg-sky-500/10"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span>Wie finde ich die Antwort?</span>
        {triggerLabel && <span className="font-normal opacity-60">· {triggerLabel}</span>}
        <ChevronDown className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-1.5 w-full max-w-md space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3.5 py-3">
          {keywords.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wide text-sky-600 dark:text-sky-400">Schlüsselwörter</p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k, i) => (
                  <span key={i} className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {paraphrase.length > 0 && (
            <div className={`space-y-1.5 ${keywords.length > 0 ? "border-t border-sky-500/10 pt-2.5" : ""}`}>
              <p className="text-[10px] font-black uppercase tracking-wide text-sky-600 dark:text-sky-400">Synonyme &amp; Umschreibungen im Text</p>
              <p className="text-[11px] text-muted-foreground">Der Text sagt oft dasselbe mit anderen Wörtern — vergleiche die Bedeutung, nicht nur die Wörter.</p>
              <div className="space-y-1">
                {paraphrase.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">{p.question}</span>
                    <span className="shrink-0 text-muted-foreground">→</span>
                    <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-700 dark:text-sky-300">{p.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedOptions.length > 0 && (
            <div className={`space-y-1.5 ${(keywords.length > 0 || paraphrase.length > 0) ? "border-t border-sky-500/10 pt-2.5" : ""}`}>
              <p className="text-[10px] font-black uppercase tracking-wide text-sky-600 dark:text-sky-400">Warum die anderen Antworten nicht passen</p>
              <div className="space-y-1.5">
                {sortedOptions.map((o, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    {o.correct
                      ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />}
                    <p dir="auto" className="flex-1 text-xs leading-relaxed text-foreground">
                      <span className={`font-black ${o.correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {o.key}{o.label ? ` — ${o.label}` : ""}:
                      </span>{" "}
                      {o.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

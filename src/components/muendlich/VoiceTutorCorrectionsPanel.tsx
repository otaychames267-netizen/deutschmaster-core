import { Sparkles, BookOpen, PenLine } from "lucide-react";

export interface VoiceTutorCorrection {
  original: string;
  correction: string;
  explanation: string;
  category: "Grammatik" | "Wortstellung" | "Kasus" | "Verbformen" | "Wortschatz" | "Redemittel";
}

export interface VoiceTutorCorrectionsData {
  error_correction_matrix: VoiceTutorCorrection[];
  better_formulations: { original: string; improved: string; why_better: string }[];
  vocabulary_enrichment: { weak_term: string; suggestions: string[]; context: string }[];
  summary: string;
}

const CATEGORY_COLOR: Record<VoiceTutorCorrection["category"], string> = {
  Grammatik: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Wortstellung: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Kasus: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Verbformen: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Wortschatz: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Redemittel: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

/** Post-session, deferred correction results — never shown during the live
 * conversation itself (see tutorGeminiLive.ts's "no live correction"
 * instruction). Corrections are grouped by category so the student sees at
 * a glance which grammar areas (Kasus, Wortstellung, Verbformen, ...) need
 * the most attention, rather than one flat undifferentiated list. */
export function VoiceTutorCorrectionsPanel({ data }: { data: VoiceTutorCorrectionsData }) {
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">{data.summary}</p>

      {data.error_correction_matrix.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><PenLine className="h-3.5 w-3.5" /> Korrekturen</h3>
          {data.error_correction_matrix.map((c, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-sm">
              <span className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLOR[c.category]}`}>{c.category}</span>
              <p className="text-muted-foreground line-through">{c.original}</p>
              <p className="font-semibold text-foreground">{c.correction}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.explanation}</p>
            </div>
          ))}
        </section>
      )}

      {data.better_formulations.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Bessere Formulierungen</h3>
          {data.better_formulations.map((b, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="text-muted-foreground">{b.original}</p>
              <p className="font-semibold text-foreground">{b.improved}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.why_better}</p>
            </div>
          ))}
        </section>
      )}

      {data.vocabulary_enrichment.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /> Wortschatz</h3>
          {data.vocabulary_enrichment.map((v, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold text-foreground">{v.weak_term} → {v.suggestions.join(", ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{v.context}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

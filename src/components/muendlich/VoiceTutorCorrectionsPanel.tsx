import { Sparkles, BookOpen, PenLine } from "lucide-react";

export interface VoiceTutorCorrection {
  original: string;
  correction: string;
  explanation: string;
  category: "Grammatik" | "Wortstellung" | "Kasus" | "Verbformen" | "Wortschatz" | "Redemittel";
}

export interface VoiceTutorScores {
  teil1_score: number;
  teil2_score: number;
  teil3_score: number;
  overall_score: number;
  max_score: number;
  pass_mark: number;
  passed: boolean;
  cefr_level: string;
}

export interface VoiceTutorCorrectionsData {
  error_correction_matrix: VoiceTutorCorrection[];
  better_formulations: { original: string; improved: string; why_better: string }[];
  vocabulary_enrichment: { weak_term: string; suggestions: string[]; context: string }[];
  summary: string;
  /** Reports written before 2026-10-11 have no scores — the card is simply not shown for them. */
  scores?: VoiceTutorScores;
}

/** The exam-style result: three 0-25 Teil scores, the total out of 75 and bestanden from 45. Always labelled as an AI ESTIMATE without pronunciation. */
function ScoreCard({ scores }: { scores: VoiceTutorScores }) {
  const rows = [
    { label: "Teil 1 · Präsentation", value: scores.teil1_score },
    { label: "Teil 2 · Gespräch", value: scores.teil2_score },
    { label: "Teil 3 · Planung", value: scores.teil3_score },
  ];
  const tone = scores.passed
    ? { box: "border-emerald-500/30 bg-emerald-500/5", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" }
    : { box: "border-rose-500/30 bg-rose-500/5", chip: "bg-rose-500/15 text-rose-700 dark:text-rose-400", bar: "bg-rose-500" };
  return (
    <section className={`rounded-2xl border p-4 ${tone.box}`} aria-label="Geschätzte Punktzahl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Geschätzte Punktzahl</p>
          <p className="mt-0.5 text-3xl font-black tabular-nums text-foreground">{scores.overall_score}<span className="text-base font-bold text-muted-foreground"> / {scores.max_score}</span></p>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${tone.chip}`}>{scores.passed ? "Bestanden" : "Nicht bestanden"}</span>
          <p className="mt-1 text-[11px] text-muted-foreground">ab {scores.pass_mark} Punkten · Niveau {scores.cefr_level}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 text-muted-foreground">{r.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${(r.value / 25) * 100}%` }} /></div>
            <span className="w-12 text-right font-bold tabular-nums text-foreground">{r.value} / 25</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        KI-Schätzung nach dem telc-Raster, ohne Aussprache — keine offizielle Bewertung und keine Garantie für das Prüfungsergebnis.
      </p>
      <p dir="rtl" lang="ar" className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        تقدير بالذكاء الاصطناعي حسب معايير TELC، بدون النطق — ليس تقييماً رسمياً ولا ضماناً لنتيجة الامتحان.
      </p>
    </section>
  );
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
      {data.scores && <ScoreCard scores={data.scores} />}
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

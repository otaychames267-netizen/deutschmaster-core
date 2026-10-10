import { CheckCircle2, XCircle } from "lucide-react";
import type { MuendlichEvaluationResult } from "@/lib/muendlich/evaluation";

/**
 * Post-exam scorecard, rendered inside ScoreRevealModal once the live exam
 * finishes. Numbers only — overall score, pass/fail, CEFR level and the three
 * Teil scores. The old verbose per-criterion report and its downloadable
 * PDF were removed together with the verbose evaluation (see
 * lib/muendlich/evaluation.ts for why).
 */
export function EvaluationReport({ evaluation }: { evaluation: MuendlichEvaluationResult }) {
  const passColor = evaluation.passed ? "text-emerald-500" : "text-destructive";
  const teile = [
    { teil: 1, score: evaluation.teil1_score },
    { teil: 2, score: evaluation.teil2_score },
    { teil: 3, score: evaluation.teil3_score },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${evaluation.passed ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
          {evaluation.passed ? <CheckCircle2 className={`h-8 w-8 ${passColor}`} /> : <XCircle className={`h-8 w-8 ${passColor}`} />}
        </div>
        <p className="text-3xl font-bold text-foreground">{evaluation.overall_score} / 75</p>
        <p className={`text-sm font-semibold ${passColor}`}>{evaluation.passed ? "Bestanden" : "Nicht bestanden"} · CEFR {evaluation.cefr_level}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {teile.map((t) => (
          <div key={t.teil} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground">Teil {t.teil}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{t.score} / 25</p>
          </div>
        ))}
      </div>
    </div>
  );
}

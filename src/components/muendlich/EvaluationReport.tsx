import { useState } from "react";
import { Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { MuendlichEvaluationResult } from "@/lib/grading/muendlich-evaluator";

/**
 * Post-exam scorecard + "Download Official telc-Simulation Report" button.
 * Rendered inside ScoreRevealModal once the live exam finishes. The detailed
 * per-criterion breakdown (Stärken/Schwächen, Fehlerkorrektur, etc.) lives
 * only in the downloadable PDF (evaluationPdf.ts) — this component stays a
 * compact scorecard by design, matching that split.
 */
export function EvaluationReport({
  evaluation,
  candidateName,
  roomCode,
  examDate,
}: {
  evaluation: MuendlichEvaluationResult;
  candidateName: string;
  roomCode: string;
  examDate: Date;
}) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      // Lazy import (perf audit finding): pdf-lib is a ~480KB dependency of
      // this module; statically importing it pulled ~300-400KB into the
      // live exam room's critical-path chunk even though it's only ever
      // needed after the exam ends, on this button click.
      const { generateEvaluationPdfBytes } = await import("@/lib/muendlich/evaluationPdf");
      const bytes = await generateEvaluationPdfBytes(evaluation, { candidateName, roomCode, examDate });
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `telc-B2-Muendlich-${roomCode}-${examDate.toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const passColor = evaluation.passed ? "text-emerald-500" : "text-destructive";

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
        {evaluation.feedback.teil_breakdown.map((t) => (
          <div key={t.teil} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground">Teil {t.teil}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{t.score} / 25</p>
          </div>
        ))}
      </div>

      <button
        onClick={download}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Offiziellen telc-Simulationsbericht herunterladen
      </button>
    </div>
  );
}

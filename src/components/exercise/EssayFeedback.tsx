import { CheckCircle2, XCircle, RotateCcw, Coins } from "lucide-react";

export interface EssayGradingResult {
  task_achievement_score: number;
  communicative_design_score: number;
  formal_accuracy_score: number;
  overall_score: number;
  passed: boolean;
  feedback: {
    task_achievement: string;
    communicative_design: string;
    formal_accuracy: string;
    summary: string;
  };
  remaining_balance: number;
}

const CRITERIA: { key: keyof EssayGradingResult["feedback"] & string; scoreKey: keyof EssayGradingResult; label: string }[] = [
  { key: "task_achievement", scoreKey: "task_achievement_score", label: "Bewältigung der Aufgabe" },
  { key: "communicative_design", scoreKey: "communicative_design_score", label: "Kommunikative Gestaltung" },
  { key: "formal_accuracy", scoreKey: "formal_accuracy_score", label: "Formale Richtigkeit" },
];

function ScoreBar({ score, max = 15 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EssayFeedback({
  result,
  onRetry,
  onClose,
}: {
  result: EssayGradingResult;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${result.passed ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
          {result.passed
            ? <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            : <XCircle className="h-8 w-8 text-destructive" />}
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground">{result.overall_score} / 45</p>
          <p className={`mt-1 text-sm font-medium ${result.passed ? "text-emerald-500" : "text-destructive"}`}>
            {result.passed ? "Bestanden" : "Noch nicht bestanden"} (mindestens 27 Punkte erforderlich)
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        {CRITERIA.map((c) => (
          <div key={c.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{c.label}</span>
              <span className="text-muted-foreground">{result[c.scoreKey] as number} / 15</span>
            </div>
            <ScoreBar score={result[c.scoreKey] as number} />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{result.feedback[c.key]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">Gesamtfeedback</p>
        <p className="text-sm leading-relaxed text-foreground">{result.feedback.summary}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Coins className="h-3.5 w-3.5" />
          {result.remaining_balance} {result.remaining_balance === 1 ? "credit" : "credits"} remaining
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Neue Aufgabe versuchen
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    </div>
  );
}

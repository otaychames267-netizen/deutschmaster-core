/**
 * Lesen Teil 2 — Lesetext + Fragen
 *
 * Security: `correct` is NEVER in the component's data.
 * After submission, answers are scored server-side via supabase.rpc("score_lesen_t2").
 * The server returns per-question correctness; correct letters are revealed only
 * when the student clicks "Lösung zeigen" — and only after submission.
 */
import { useState } from "react";
import { CheckCircle2, XCircle, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface T2Question {
  number: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
}

export interface T2ExerciseData {
  id: string;
  title: string;
  passage: string;
  questions: T2Question[];
}

interface ScoreResult {
  number: number;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
}

interface Props {
  exercise: T2ExerciseData;
  onComplete?: (score: number, total: number) => void;
}

type AnswerState = { selected: "a" | "b" | "c" | null; revealed: boolean };

function isRichtigFalsch(q: T2Question): boolean {
  const a = q.option_a.toLowerCase().trim();
  const b = q.option_b.toLowerCase().trim();
  return (a === "richtig" || a === "wahr" || a === "ja") && (b === "falsch" || b === "unwahr" || b === "nein");
}

export function Teil2Exercise({ exercise, onComplete }: Props) {
  const [answers, setAnswers]     = useState<Record<number, AnswerState>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring]     = useState(false);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreTotal, setScoreTotal]     = useState(0);
  const [scoreCount, setScoreCount]     = useState(0);

  const questions = [...exercise.questions].sort((a, b) => a.number - b.number);

  function select(num: number, choice: "a" | "b" | "c") {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [num]: { selected: choice, revealed: false } }));
  }

  function reveal(num: number) {
    setAnswers(prev => ({ ...prev, [num]: { ...prev[num], revealed: true } }));
  }

  async function handleSubmit() {
    setScoring(true);
    try {
      // Build answers payload { "1": "a", "2": "b", ... }
      const payload: Record<string, string> = {};
      for (const q of questions) {
        if (answers[q.number]?.selected) payload[String(q.number)] = answers[q.number].selected!;
      }

      const { data, error } = await (supabase as any).rpc("score_lesen_t2", {
        p_exercise_id: exercise.id,
        p_answers:     payload,
      });

      if (error) throw error;

      const res = data as unknown as { score: number; total: number; results: ScoreResult[] };
      setScoreResults(res.results);
      setScoreCount(res.score);
      setScoreTotal(res.total);
      setSubmitted(true);
      onComplete?.(res.score, res.total);
    } catch (e) {
      console.error("Scoring failed:", e);
      // Fallback: mark as submitted without detailed results
      setSubmitted(true);
    } finally {
      setScoring(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
  }

  const answeredCount = questions.filter(q => !!answers[q.number]?.selected).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-0.5">{exercise.title}</p>
        <p className="text-sm text-muted-foreground">Lesen Sie den Text und beantworten Sie die Aufgaben.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lesetext</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-foreground leading-[1.9] whitespace-pre-line">{exercise.passage}</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Aufgaben</p>
        {questions.map((q) => {
          const ans       = answers[q.number];
          const result    = scoreResults?.find(r => r.number === q.number);
          const isCorrect = submitted && !!result?.correct;
          const isWrong   = submitted && !!result && !result.correct;
          const rfMode    = isRichtigFalsch(q);

          return (
            <div key={q.number}
              className={`rounded-2xl border overflow-hidden transition-colors ${
                isCorrect ? "border-emerald-500/40" : isWrong ? "border-rose-500/40" : "border-border"
              } bg-card`}>

              <div className="flex items-start gap-3 px-5 py-4 border-b border-border bg-muted/10">
                <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">
                  {q.number}
                </span>
                <p className="text-sm font-semibold text-foreground leading-snug">{q.question}</p>
              </div>

              {rfMode ? (
                <div className="px-5 py-3 flex gap-3">
                  {(["a", "b"] as const).map((key) => {
                    const label       = key === "a" ? q.option_a : q.option_b;
                    const isSelected  = ans?.selected === key;
                    const showCorrect = submitted && result?.correct_answer === key;
                    const showWrong   = submitted && isSelected && result?.correct_answer !== key;
                    return (
                      <button key={key} onClick={() => select(q.number, key)} disabled={submitted}
                        className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                          showCorrect ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : showWrong  ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : isSelected && !submitted ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30 hover:bg-muted/30 text-foreground"
                        }`}>
                        <div className="flex items-center justify-center gap-2">
                          {submitted && showCorrect && <CheckCircle2 className="h-4 w-4" />}
                          {submitted && showWrong   && <XCircle      className="h-4 w-4" />}
                          {label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-3 space-y-2">
                  {(["a", "b", "c"] as const).map((key) => {
                    const label       = key === "a" ? q.option_a : key === "b" ? q.option_b : q.option_c;
                    const isSelected  = ans?.selected === key;
                    const showCorrect = submitted && result?.correct_answer === key;
                    const showWrong   = submitted && isSelected && result?.correct_answer !== key;
                    return (
                      <button key={key} onClick={() => select(q.number, key)} disabled={submitted}
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                          showCorrect ? "border-emerald-500/40 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                          : showWrong  ? "border-rose-500/40 bg-rose-500/8 text-rose-700 dark:text-rose-300"
                          : isSelected && !submitted ? "border-primary/40 bg-primary/8 text-foreground"
                          : "border-border hover:border-primary/30 hover:bg-muted/30 text-foreground"
                        }`}>
                        <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                          showCorrect ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : showWrong  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                          : isSelected ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                        }`}>{key}</span>
                        <span className="flex-1 leading-snug">{label}</span>
                        {submitted && showCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                        {submitted && showWrong   && <XCircle      className="h-4 w-4 shrink-0 text-rose-500"    />}
                      </button>
                    );
                  })}
                </div>
              )}

              {submitted && ans?.selected && result && (
                <div className={`flex items-center justify-between border-t border-border px-5 py-2 ${
                  isCorrect ? "bg-emerald-500/5" : "bg-rose-500/5"
                }`}>
                  <div className="flex items-center gap-1.5">
                    {isCorrect
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Richtig</span></>
                      : <><XCircle className="h-3.5 w-3.5 text-rose-500" /><span className="text-xs font-bold text-rose-600 dark:text-rose-400">Falsch</span></>
                    }
                  </div>
                  {isWrong && !ans.revealed && (
                    <button onClick={() => reveal(q.number)}
                      className="flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
                      <BookOpen className="h-3 w-3" /> Lösung zeigen
                    </button>
                  )}
                  {isWrong && ans.revealed && (
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Richtig: {rfMode
                        ? (result.correct_answer === "a" ? q.option_a : q.option_b)
                        : result.correct_answer.toUpperCase()
                      }
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{answeredCount} / {questions.length} beantwortet</p>
          <button onClick={handleSubmit} disabled={answeredCount < questions.length || scoring}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2">
            {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
            Auswertung
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-3xl font-black text-foreground">{scoreCount} / {scoreTotal}</p>
          <p className="text-sm text-muted-foreground">
            {scoreCount === scoreTotal ? "Ausgezeichnet! Alle Antworten korrekt."
            : scoreCount >= Math.ceil(scoreTotal * 0.8) ? "Sehr gut!"
            : scoreCount >= Math.ceil(scoreTotal * 0.6) ? "Gut gemacht."
            : "Weiter üben — du schaffst es!"}
          </p>
          <button onClick={reset}
            className="rounded-xl border border-border bg-muted px-5 py-2 text-sm font-medium hover:bg-muted/70 transition-colors">
            Nochmal versuchen
          </button>
        </div>
      )}
    </div>
  );
}

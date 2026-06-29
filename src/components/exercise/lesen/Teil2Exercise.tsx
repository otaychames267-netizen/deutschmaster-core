/**
 * Lesen Teil 2 — Lesetext + Fragen
 *
 * Security: `correct` is NEVER in the component's data.
 * After submission, answers are scored server-side via supabase.rpc("score_lesen_t2").
 * The server returns per-question correctness; correct letters are revealed only
 * when the student clicks "Lösung zeigen" — and only after submission.
 *
 * Layout (Engineering Spec §19): on desktop the reading passage sits on the LEFT
 * and stays visible (sticky) while the student answers the questions on the RIGHT;
 * on mobile the passage comes first, questions immediately below.
 *
 * Resilience (§23, §30): in-progress answers + graded results autosave to
 * localStorage and are restored after a refresh or a closed browser; scoring
 * failures surface a retryable error instead of silently "submitting".
 *
 * Accessibility (§24): each question's options form an ARIA radiogroup with
 * aria-checked state and a labelled group; the result is announced via aria-live.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, BookOpen, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { attemptKey, loadAttempt, saveAttempt, clearAttempt } from "@/lib/practice/attempt-storage";

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

type Choice = "a" | "b" | "c";
type AnswerState = { selected: Choice | null; revealed: boolean };

/** Shape persisted to localStorage for resume-after-refresh. */
interface PersistedAttempt {
  exerciseId: string;
  answers: Record<number, AnswerState>;
  submitted: boolean;
  scoreResults: ScoreResult[] | null;
  scoreCount: number;
  scoreTotal: number;
  updatedAt: number;
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

function isRichtigFalsch(q: T2Question): boolean {
  const a = q.option_a.toLowerCase().trim();
  const b = q.option_b.toLowerCase().trim();
  return (a === "richtig" || a === "wahr" || a === "ja") && (b === "falsch" || b === "unwahr" || b === "nein");
}

export function Teil2Exercise({ exercise, onComplete }: Props) {
  const { user, loading: authLoading } = useAuth();
  const groupBaseId = useId();

  const [answers, setAnswers]           = useState<Record<number, AnswerState>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [scoring, setScoring]           = useState(false);
  const [scoreError, setScoreError]     = useState<string | null>(null);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreTotal, setScoreTotal]     = useState(0);
  const [scoreCount, setScoreCount]     = useState(0);
  const [restored, setRestored]         = useState(false);

  const hydratedRef = useRef(false);

  const storageKey = useMemo(
    () => attemptKey(["lesen.t2", user?.id ?? "anon", exercise.id]),
    [user?.id, exercise.id],
  );

  const questions = useMemo(
    () => [...exercise.questions].sort((a, b) => a.number - b.number),
    [exercise.questions],
  );

  // ── Resume: hydrate saved attempt once auth has resolved (so the key is stable) ──
  useEffect(() => {
    if (hydratedRef.current || authLoading) return;
    const saved = loadAttempt<PersistedAttempt>(storageKey);
    if (saved && saved.exerciseId === exercise.id) {
      setAnswers(saved.answers ?? {});
      setSubmitted(!!saved.submitted);
      setScoreResults(saved.scoreResults ?? null);
      setScoreCount(saved.scoreCount ?? 0);
      setScoreTotal(saved.scoreTotal ?? 0);
      if (saved.submitted || Object.keys(saved.answers ?? {}).length > 0) setRestored(true);
    }
    hydratedRef.current = true;
  }, [authLoading, storageKey, exercise.id]);

  // ── Autosave: persist whenever meaningful state changes (after hydration) ──
  useEffect(() => {
    if (!hydratedRef.current) return;
    const hasProgress = submitted || Object.keys(answers).length > 0;
    if (!hasProgress) {
      clearAttempt(storageKey);
      return;
    }
    saveAttempt<PersistedAttempt>(storageKey, {
      exerciseId: exercise.id,
      answers,
      submitted,
      scoreResults,
      scoreCount,
      scoreTotal,
      updatedAt: Date.now(),
    });
  }, [answers, submitted, scoreResults, scoreCount, scoreTotal, storageKey, exercise.id]);

  function select(num: number, choice: Choice) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [num]: { selected: choice, revealed: false } }));
  }

  function reveal(num: number) {
    setAnswers(prev => ({ ...prev, [num]: { ...prev[num], revealed: true } }));
  }

  async function handleSubmit() {
    setScoring(true);
    setScoreError(null);
    try {
      // Build answers payload { "6": "a", "7": "b", ... } keyed by question number
      const payload: Record<string, string> = {};
      for (const q of questions) {
        if (answers[q.number]?.selected) payload[String(q.number)] = answers[q.number].selected!;
      }

      // Scores server-side from the official key AND records the attempt
      // (durable per-user history) in one atomic, non-forgeable call.
      const { data, error } = await (supabase as any).rpc("score_and_save_lesen_t2", {
        p_exercise_id: exercise.id,
        p_answers:     payload,
      });

      if (error) throw error;

      const res = data as unknown as { score: number; total: number; results: ScoreResult[]; attempt_id: string };
      setScoreResults(res.results);
      setScoreCount(res.score);
      setScoreTotal(res.total);
      setSubmitted(true);
      setRestored(false);
      onComplete?.(res.score, res.total);
    } catch (e) {
      // No silent failures: keep the student's answers and let them retry.
      console.error("Scoring failed:", e);
      setScoreError("Die Auswertung ist fehlgeschlagen. Deine Antworten sind gespeichert — bitte versuche es erneut.");
    } finally {
      setScoring(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setScoreError(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
    setRestored(false);
    clearAttempt(storageKey);
  }

  const answeredCount = questions.filter(q => !!answers[q.number]?.selected).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-0.5">{exercise.title}</p>
        <p className="text-sm text-muted-foreground">Lesen Sie den Text und beantworten Sie die Aufgaben.</p>
      </div>

      {restored && !submitted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="h-4 w-4 shrink-0 text-blue-500" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Dein Fortschritt wurde wiederhergestellt.
            </p>
          </div>
          <button onClick={reset}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${FOCUS_RING}`}>
            Neu beginnen
          </button>
        </div>
      )}

      {/* ── Two-pane: passage (sticky, left on desktop) · questions (right) ── */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">

        {/* Reading passage */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100dvh-6rem)] lg:flex lg:flex-col">
          <div className="border-b border-border bg-muted/30 px-5 py-3 shrink-0">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lesetext</p>
          </div>
          <div className="px-6 py-5 lg:overflow-y-auto">
            <p className="text-sm text-foreground leading-[1.9] whitespace-pre-line">{exercise.passage}</p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Aufgaben</p>
          {questions.map((q) => {
            const ans       = answers[q.number];
            const result    = scoreResults?.find(r => r.number === q.number);
            const isCorrect = submitted && !!result?.correct;
            const isWrong   = submitted && !!result && !result.correct;
            const rfMode    = isRichtigFalsch(q);
            const labelId   = `${groupBaseId}-q${q.number}`;
            const keys: Choice[] = rfMode ? ["a", "b"] : ["a", "b", "c"];

            return (
              <div key={q.number}
                className={`rounded-2xl border overflow-hidden transition-colors ${
                  isCorrect ? "border-emerald-500/40" : isWrong ? "border-rose-500/40" : "border-border"
                } bg-card`}>

                <div className="flex items-start gap-3 px-5 py-4 border-b border-border bg-muted/10">
                  <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">
                    {q.number}
                  </span>
                  <p id={labelId} className="text-sm font-semibold text-foreground leading-snug">{q.question}</p>
                </div>

                <div role="radiogroup" aria-labelledby={labelId}
                  className={rfMode ? "px-5 py-3 flex gap-3" : "px-5 py-3 space-y-2"}>
                  {keys.map((key) => {
                    const label       = key === "a" ? q.option_a : key === "b" ? q.option_b : q.option_c;
                    const isSelected  = ans?.selected === key;
                    const showCorrect = submitted && result?.correct_answer === key;
                    const showWrong   = submitted && isSelected && result?.correct_answer !== key;

                    if (rfMode) {
                      return (
                        <button key={key} role="radio" aria-checked={isSelected}
                          aria-label={`${label}`}
                          onClick={() => select(q.number, key)} disabled={submitted || scoring}
                          className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${FOCUS_RING} ${
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
                    }

                    return (
                      <button key={key} role="radio" aria-checked={isSelected}
                        aria-label={`${key.toUpperCase()}: ${label}`}
                        onClick={() => select(q.number, key)} disabled={submitted || scoring}
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${FOCUS_RING} ${
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
                        className={`flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors ${FOCUS_RING}`}>
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

          {scoreError && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm text-rose-700 dark:text-rose-300">{scoreError}</p>
                <button onClick={handleSubmit} disabled={scoring}
                  className={`inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-50 ${FOCUS_RING}`}>
                  {scoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Erneut auswerten
                </button>
              </div>
            </div>
          )}

          {!submitted ? (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
              <div className="flex flex-col">
                <p className="text-sm text-muted-foreground">{answeredCount} / {questions.length} beantwortet</p>
                <p className="text-[11px] text-muted-foreground/70">Fortschritt wird automatisch gespeichert</p>
              </div>
              <button onClick={handleSubmit} disabled={answeredCount < questions.length || scoring}
                className={`rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2 ${FOCUS_RING}`}>
                {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
                Auswertung
              </button>
            </div>
          ) : (
            <div aria-live="polite" className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <p className="text-3xl font-black text-foreground">{scoreCount} / {scoreTotal}</p>
              <p className="text-sm text-muted-foreground">
                {scoreCount === scoreTotal ? "Ausgezeichnet! Alle Antworten korrekt."
                : scoreCount >= Math.ceil(scoreTotal * 0.8) ? "Sehr gut!"
                : scoreCount >= Math.ceil(scoreTotal * 0.6) ? "Gut gemacht."
                : "Weiter üben — du schaffst es!"}
              </p>
              <button onClick={reset}
                className={`rounded-xl border border-border bg-muted px-5 py-2 text-sm font-medium hover:bg-muted/70 transition-colors ${FOCUS_RING}`}>
                Nochmal versuchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hören — one exercise card in the continuous Teil feed (Phase 1, no audio yet).
 *
 * Security: `correct_answer` is never in the component's initial data (loaded via
 * the `hoeren_statements_student` view). Grading happens server-side via
 * `score_and_save_hoeren`; "Lösung anzeigen" fetches the key via `reveal_hoeren`,
 * only ever after the student has answered, and never overwrites their picks.
 *
 * Audio: `exercise.audioUrl` is null until Phase 2 uploads MP3s — the placeholder
 * bar below just renders disabled in that case, no other code path changes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, Loader2, AlertCircle, RotateCcw, BookOpen, ArrowRight, BarChart3, Volume2, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { attemptKey, loadAttempt, saveAttempt, clearAttempt } from "@/lib/practice/attempt-storage";
import { parseVariant } from "@/lib/exercise-variant";
import { VariantBadge, NewBadge } from "@/components/VariantBadges";
import { ProtectedAudioPlayer } from "@/components/exercise/hoeren/ProtectedAudioPlayer";
import { useExerciseTranslation } from "@/components/learning/useExerciseTranslation";
import { TranslateButton } from "@/components/learning/TranslateButton";
import { EvidenceBlock } from "@/components/learning/EvidenceBlock";
import { HighlightedText, type HighlightItem } from "@/components/learning/HighlightedText";
import type { LearningAidsItem } from "@/components/learning/types";

export interface HoerenStatement {
  statement_number: number;
  statement_text: string;
}

export interface HoerenExerciseData {
  id: string;
  title: string;
  teil: number;
  position: number;
  instructions: string;
  imageUrl: string | null;
  /** Raw storage path (e.g. "teil1/insel-bali.m4a"), never a pre-signed URL —
   * ProtectedAudioPlayer signs it on demand with a short-lived URL only when
   * the user presses play. See ProtectedAudioPlayer.tsx for why. */
  audioPath: string | null;
  statements: HoerenStatement[];
}

interface ScoreResult {
  statement_number: number;
  correct: boolean;
  your_answer: boolean | null;
  correct_answer: boolean;
  learning_aids?: LearningAidsItem | null;
}

interface Props {
  exercise: HoerenExerciseData;
  index: number;
  onNext?: () => void;
  hasNext?: boolean;
  onComplete?: () => void;
}

type AnswerState = boolean | null;

interface PersistedAttempt {
  exerciseId: string;
  answers: Record<number, AnswerState>;
  submitted: boolean;
  scoreResults: ScoreResult[] | null;
  scoreCount: number;
  scoreTotal: number;
  revealed: Record<number, boolean>;
  showScore: boolean;
  updatedAt: number;
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export function HoerenExerciseCard({ exercise, index, onNext, hasNext, onComplete }: Props) {
  const { user, loading: authLoading } = useAuth();

  const [answers, setAnswers]           = useState<Record<number, AnswerState>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [scoring, setScoring]           = useState(false);
  const [scoreError, setScoreError]     = useState<string | null>(null);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreTotal, setScoreTotal]     = useState(0);
  const [scoreCount, setScoreCount]     = useState(0);
  const [restored, setRestored]         = useState(false);
  const [revealed, setRevealed]         = useState<Record<number, boolean>>({});
  const [revealing, setRevealing]       = useState(false);
  const [showScore, setShowScore]       = useState(false);
  const [mixed, setMixed]               = useState(false);
  const [shuffleSeed, setShuffleSeed]   = useState(1);
  const { data: translation, loading: translationLoading, ensureLoaded: loadTranslation } = useExerciseTranslation("hoeren", exercise.id);

  const hydratedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(
    () => attemptKey(["hoeren", exercise.teil, user?.id ?? "anon", exercise.id]),
    [user?.id, exercise.id, exercise.teil],
  );

  const statements = useMemo(
    () => [...exercise.statements].sort((a, b) => a.statement_number - b.statement_number),
    [exercise.statements],
  );

  // "Sätze mischen" (training mode only): a display-order-only shuffle. It
  // never touches `statements`, `answers`, or the payload/results keying —
  // every lookup below still keys strictly by the real statement_number, so
  // scoring and the official exam order are completely unaffected.
  const displayStatements = useMemo(() => {
    if (!mixed) return statements;
    const arr = [...statements];
    let seed = shuffleSeed;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [mixed, shuffleSeed, statements]);

  function toggleMixed() {
    setMixed((prev) => {
      if (!prev) setShuffleSeed(Date.now() & 0x7fffffff || 1);
      return !prev;
    });
  }

  useEffect(() => {
    if (hydratedRef.current || authLoading) return;
    const saved = loadAttempt<PersistedAttempt>(storageKey);
    if (saved && saved.exerciseId === exercise.id) {
      setAnswers(saved.answers ?? {});
      setSubmitted(!!saved.submitted);
      setScoreResults(saved.scoreResults ?? null);
      setScoreCount(saved.scoreCount ?? 0);
      setScoreTotal(saved.scoreTotal ?? 0);
      setRevealed(saved.revealed ?? {});
      setShowScore(!!saved.showScore);
      if (saved.submitted || Object.keys(saved.answers ?? {}).length > 0) setRestored(true);
    }
    hydratedRef.current = true;
  }, [authLoading, storageKey, exercise.id]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const hasProgress = submitted || Object.keys(answers).length > 0;
    if (!hasProgress) { clearAttempt(storageKey); return; }
    saveAttempt<PersistedAttempt>(storageKey, {
      exerciseId: exercise.id, answers, submitted, scoreResults, scoreCount, scoreTotal, revealed, showScore,
      updatedAt: Date.now(),
    });
  }, [answers, submitted, scoreResults, scoreCount, scoreTotal, revealed, showScore, storageKey, exercise.id]);

  function select(num: number, value: boolean) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [num]: value }));
  }

  async function handleSubmit() {
    setScoring(true);
    setScoreError(null);
    try {
      const payload: Record<string, boolean> = {};
      for (const s of statements) {
        if (answers[s.statement_number] !== undefined && answers[s.statement_number] !== null) {
          payload[String(s.statement_number)] = answers[s.statement_number] as boolean;
        }
      }
      const { data, error } = await (supabase as any).rpc("score_and_save_hoeren", {
        p_exercise_id: exercise.id,
        p_answers: payload,
      });
      if (error) throw error;
      const res = data as unknown as { score: number; total: number; results: ScoreResult[]; attempt_id: string };
      setScoreResults(res.results);
      setScoreCount(res.score);
      setScoreTotal(res.total);
      setSubmitted(true);
      setShowScore(true);
      setRestored(false);
      onComplete?.();
    } catch (e) {
      console.error("Scoring failed:", e);
      setScoreError("Die Auswertung ist fehlgeschlagen. Deine Antworten sind gespeichert — bitte versuche es erneut.");
    } finally {
      setScoring(false);
    }
  }

  async function handleReveal() {
    setRevealing(true);
    try {
      const { data, error } = await (supabase as any).rpc("reveal_hoeren", { p_exercise_id: exercise.id });
      if (error) throw error;
      const res = data as unknown as { results: { statement_number: number; correct_answer: boolean }[] };
      const asResults: ScoreResult[] = res.results.map((r) => {
        const your = answers[r.statement_number] ?? null;
        return {
          statement_number: r.statement_number,
          correct: your !== null && your === r.correct_answer,
          your_answer: your,
          correct_answer: r.correct_answer,
        };
      });
      setScoreResults(asResults);
      setScoreCount(asResults.filter((r) => r.correct).length);
      setScoreTotal(asResults.length);
      const allRevealed: Record<number, boolean> = {};
      for (const r of asResults) allRevealed[r.statement_number] = true;
      setRevealed(allRevealed);
      onComplete?.();
    } catch (e) {
      console.error("Reveal failed:", e);
      setScoreError("Die Lösung konnte nicht geladen werden. Bitte versuche es erneut.");
    } finally {
      setRevealing(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setScoreError(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
    setRevealed({});
    setShowScore(false);
    setRestored(false);
    clearAttempt(storageKey);
  }

  function goNext() {
    onNext?.();
  }

  const answeredCount = statements.filter((s) => answers[s.statement_number] !== undefined && answers[s.statement_number] !== null).length;
  const solutionShown = Object.keys(revealed).length > 0 && !submitted;
  const showState = submitted || solutionShown;

  return (
    <div ref={cardRef} id={`hoeren-ex-${exercise.id}`} className="rounded-2xl border border-border bg-card overflow-hidden scroll-mt-6">
      {/* ── Header: number + title + image + audio placeholder ── */}
      <div className="p-5 space-y-3 border-b border-border bg-muted/10">
        <div className="flex items-start gap-3">
          <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-black text-violet-600 dark:text-violet-400">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-foreground">{parseVariant(exercise.title).baseTitle}</p>
              {parseVariant(exercise.title).variant && <VariantBadge variant={parseVariant(exercise.title).variant!} />}
            </div>
            {exercise.instructions && (
              <p className="text-xs text-muted-foreground whitespace-pre-line mt-1 leading-relaxed">{exercise.instructions}</p>
            )}
          </div>
          {parseVariant(exercise.title).isNew && <NewBadge />}
        </div>

        {exercise.imageUrl && (
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={exercise.imageUrl} alt={exercise.title} loading="lazy" className="w-full max-h-64 object-cover" />
          </div>
        )}

        {/* Custom protected player — never a native <audio controls>, see ProtectedAudioPlayer.tsx */}
        {exercise.audioPath ? (
          <ProtectedAudioPlayer audioPath={exercise.audioPath} />
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-muted-foreground/60">
            <Volume2 className="h-4 w-4 shrink-0" />
            <span className="text-xs">Audio wird bald hinzugefügt</span>
          </div>
        )}
      </div>

      {restored && !submitted && (
        <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 bg-blue-500/5 px-5 py-2.5">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Fortschritt wiederhergestellt.</p>
          </div>
          <button onClick={reset} className={`rounded-lg px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${FOCUS_RING}`}>
            Neu beginnen
          </button>
        </div>
      )}

      {!submitted && statements.length > 1 && (
        <div className="flex items-center justify-end border-b border-border px-4 py-1.5">
          <button
            onClick={toggleMixed}
            type="button"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${FOCUS_RING} ${
              mixed ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300" : "border-border text-muted-foreground hover:border-violet-500/30 hover:text-violet-600"
            }`}
          >
            <Shuffle className="h-3 w-3" /> Sätze mischen
          </button>
        </div>
      )}

      {/* ── Statements: compact single-row layout ── */}
      <div className="divide-y divide-border">
        {displayStatements.map((s) => {
          const ans       = answers[s.statement_number];
          const result    = scoreResults?.find((r) => r.statement_number === s.statement_number);
          const isCorrect = showState && !!result?.correct;
          const isWrong   = showState && !!result && !result.correct && ans !== undefined && ans !== null;
          const highlightItems: HighlightItem[] = (isCorrect || isWrong) && result?.learning_aids?.evidence_text
            ? [{ itemKey: String(s.statement_number), label: String(s.statement_number), evidenceText: result.learning_aids.evidence_text, colorIndex: s.statement_number }]
            : [];

          return (
            <div key={s.statement_number}
              className={`px-4 py-3 transition-colors ${
                isCorrect ? "bg-emerald-500/8" : isWrong ? "bg-rose-500/8" : ""
              }`}>
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div role="radiogroup" className="flex items-center gap-2 shrink-0">
                  {([true, false] as const).map((value) => {
                    const label = value ? "Richtig" : "Falsch";
                    const isSelected = ans === value;
                    const showCorrect = showState && result?.correct_answer === value;
                    const showWrong = showState && isSelected && result?.correct_answer !== value;
                    return (
                      <button key={String(value)} role="radio" aria-checked={isSelected} aria-label={label}
                        onClick={() => select(s.statement_number, value)} disabled={submitted || scoring}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-all ${FOCUS_RING} ${
                          showCorrect ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : showWrong ? "border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : isSelected && !showState ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30 hover:bg-muted/50 text-muted-foreground"
                        }`}>
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? "border-current" : "border-current opacity-40"
                        }`}>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="shrink-0 text-[11px] font-black text-muted-foreground/50 tabular-nums">{s.statement_number}</span>
                <div className="text-sm text-foreground leading-snug flex-1 min-w-[50%]">
                  <HighlightedText text={s.statement_text} items={highlightItems} />
                </div>
              </div>
              {isWrong && result && (
                <p className="mt-1.5 pl-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Richtig wäre: {result.correct_answer ? "Richtig" : "Falsch"}
                </p>
              )}
              <div className="mt-1.5 pl-1">
                <TranslateButton translation={translation?.questions?.[String(s.statement_number)]} loading={translationLoading} onRequest={loadTranslation} />
              </div>
              {isWrong && result?.learning_aids && (
                <EvidenceBlock aids={result.learning_aids} variant="wrong" skill="hoeren" exerciseId={exercise.id} itemKey={String(s.statement_number)} saveCategory="wichtiger_ausdruck" showEvidenceQuote={false} triggerLabel={`Satz ${s.statement_number}`} />
              )}
              {isCorrect && (result?.learning_aids?.explanation_correct || result?.learning_aids?.evidence_text) && (
                <div className="mt-1.5 pl-1">
                  <EvidenceBlock aids={result!.learning_aids} variant="correct" skill="hoeren" exerciseId={exercise.id} itemKey={String(s.statement_number)} saveCategory="wichtiger_ausdruck" showEvidenceQuote={false} triggerLabel={`Satz ${s.statement_number}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {scoreError && (
        <div className="flex items-start gap-3 border-t border-border bg-rose-500/5 px-5 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs text-rose-700 dark:text-rose-300">{scoreError}</p>
            <button onClick={submitted ? handleSubmit : handleReveal} disabled={scoring || revealing}
              className={`inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-50 ${FOCUS_RING}`}>
              {(scoring || revealing) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Erneut versuchen
            </button>
          </div>
        </div>
      )}

      {showScore && submitted && (
        <div aria-live="polite" className="border-t border-border bg-muted/20 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-bold text-foreground">{scoreCount} / {scoreTotal} richtig</p>
          <p className="text-xs text-muted-foreground">
            {scoreCount === scoreTotal ? "Ausgezeichnet!" : scoreCount >= Math.ceil(scoreTotal * 0.8) ? "Sehr gut!" : scoreCount >= Math.ceil(scoreTotal * 0.6) ? "Gut gemacht." : "Weiter üben!"}
          </p>
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {submitted ? "Ausgewertet" : `${answeredCount} / ${statements.length} beantwortet`}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {!submitted && (
            <>
              <button onClick={reset} className={`rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70 transition-colors ${FOCUS_RING}`}>
                Zurücksetzen
              </button>
              <button onClick={handleReveal} disabled={revealing}
                className={`flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50 ${FOCUS_RING}`}>
                {revealing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <BookOpen className="h-3.5 w-3.5" /> Lösung anzeigen
              </button>
              <button onClick={handleSubmit} disabled={answeredCount < statements.length || scoring}
                className={`rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5 ${FOCUS_RING}`}>
                {scoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Antworten prüfen
              </button>
            </>
          )}
          {submitted && (
            <>
              <button onClick={() => setShowScore((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70 transition-colors ${FOCUS_RING}`}>
                <BarChart3 className="h-3.5 w-3.5" /> Auswertung anzeigen
              </button>
              <button onClick={reset} className={`rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/70 transition-colors ${FOCUS_RING}`}>
                Erneut versuchen
              </button>
              {hasNext && (
                <button onClick={goNext} className={`flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all ${FOCUS_RING}`}>
                  Nächste Übung <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Sprachbausteine Teil 2 — Lückentext mit gemeinsamer Wortliste
 *
 * TELC-authentic interaction (no radio buttons, no dropdowns, no typing):
 *   1. Click a gap  → it becomes the active (highlighted) gap.
 *   2. Click a word → it instantly fills the active gap and disappears
 *                     from the word list (each word can be used only once).
 *   3. Focus auto-advances to the next still-empty gap.
 *   4. Click a filled gap → its word returns to the list and the gap reopens.
 *
 * Security: correct answers are NEVER shipped in the student payload. Both
 * grading ("Auswertung") and the study reveal ("Lösung anzeigen") go through
 * the server-side RPC `score_sb_t2` — the reveal calls it with empty answers,
 * which returns every gap's correct_word without ever exposing them client-side.
 *
 * Responsive: on desktop/tablet the word list is a sticky sidebar beside the
 * text; on mobile it stacks below the text (text stays on top).
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, RotateCcw, BookOpen, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExerciseTranslation } from "@/components/learning/useExerciseTranslation";
import { TranslateButton } from "@/components/learning/TranslateButton";
import { EvidenceBlock } from "@/components/learning/EvidenceBlock";
import type { LearningAidsItem } from "@/components/learning/types";

export interface SBT2Word {
  word_number: number;
  word: string;
}

export interface SBT2ExerciseData {
  id: string;
  title: string;
  passage: string; // text with {{N}} gap markers (31–40)
  words: SBT2Word[];
}

interface ScoreResult {
  gap_number: number;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
  learning_aids?: LearningAidsItem | null;
}

interface Props {
  exercise: SBT2ExerciseData;
  onComplete?: (score: number, total: number) => void;
  /** Exam mode (Prüfungssimulation): no self-scoring RPC call, no "Lösung
   * anzeigen" reveal, no submit/reset buttons — the parent owns save/submit.
   * Answers seed from `initialAnswers` once on mount and stream out via
   * `onAnswersChange` on every change; the component is otherwise identical
   * to the practice version (same layout, same interaction) per an explicit
   * requirement to reuse this component rather than build a different UI. */
  examMode?: boolean;
  initialAnswers?: Record<number, string>;
  onAnswersChange?: (answers: Record<number, string>) => void;
}

// Split passage into an ordered list of literal strings and gap numbers.
function parsePassage(passage: string): Array<string | number> {
  return passage.split(/(\{\{\d+\}\})/).map((p) => {
    const m = p.match(/^\{\{(\d+)\}\}$/);
    return m ? parseInt(m[1], 10) : p;
  });
}

export function SBTeil2Exercise({ exercise, onComplete, examMode, initialAnswers, onAnswersChange }: Props) {
  const segments = useMemo(() => parsePassage(exercise.passage), [exercise.passage]);
  const gapNumbers = useMemo(
    () => segments.filter((s): s is number => typeof s === "number"),
    [segments],
  );

  // gap_number → chosen word
  const [answers, setAnswers] = useState<Map<number, string>>(
    () => new Map(Object.entries(initialAnswers ?? {}).map(([k, v]) => [Number(k), v])),
  );
  const [activeGap, setActiveGap] = useState<number | null>(null);

  useEffect(() => {
    if (examMode) onAnswersChange?.(Object.fromEntries([...answers].map(([k, v]) => [String(k), v])));
  }, [examMode, answers, onAnswersChange]);

  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);

  // Study reveal ("Lösung anzeigen"): gap_number → correct word, fetched securely.
  const [solution, setSolution] = useState<Map<number, string> | null>(null);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const [explainOpen, setExplainOpen] = useState<Record<number, boolean>>({});
  const { data: translation, loading: translationLoading, ensureLoaded: loadTranslation } = useExerciseTranslation("sprachbausteine", exercise.id);

  const revealed = solution !== null && !submitted;
  const locked = submitted || revealed;

  // word → gap it currently fills (for "used / disabled" state)
  const usedWords = useMemo(() => {
    const m = new Map<string, number>();
    for (const [gap, word] of answers) m.set(word, gap);
    return m;
  }, [answers]);

  const nextEmptyGap = useCallback(
    (filledGap: number, filled: Map<number, string>): number | null => {
      const after = gapNumbers.find((g) => g > filledGap && !filled.has(g));
      if (after !== undefined) return after;
      const anyEmpty = gapNumbers.find((g) => !filled.has(g));
      return anyEmpty ?? null;
    },
    [gapNumbers],
  );

  function handleGapClick(gapNum: number) {
    if (locked) return;
    setActiveGap((cur) => (cur === gapNum ? null : gapNum));
  }

  function handleClearGap(gapNum: number) {
    if (locked) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      next.delete(gapNum);
      return next;
    });
    setActiveGap(gapNum);
  }

  function handleWordClick(word: string) {
    if (locked || activeGap === null || usedWords.has(word)) return;
    // Compute the new answer map and next focus synchronously from current state —
    // NOT inside the setAnswers updater (that runs during reconciliation, so the
    // auto-advance target would still be stale when setActiveGap runs).
    const next = new Map(answers);
    for (const [g, w] of next) if (w === word) next.delete(g); // each word only once
    next.set(activeGap, word);
    const advanced = nextEmptyGap(activeGap, next);
    setAnswers(next);
    setActiveGap(advanced);
  }

  async function handleSubmit() {
    if (scoring || submitted || revealed) return;
    setScoring(true);
    setActiveGap(null);
    const payload: Record<string, string> = {};
    for (const [gap, word] of answers) payload[String(gap)] = word;
    try {
      const { data, error } = await (supabase as any).rpc("score_sb_t2", {
        p_exercise_id: exercise.id,
        p_answers: payload,
      });
      if (error) throw error;
      const res = data as { score: number; total: number; results: ScoreResult[] };
      setResults(res.results ?? []);
      setScore({ score: res.score, total: res.total });
      setSubmitted(true);
      onComplete?.(res.score, res.total);
    } catch (e) {
      console.error("Scoring error", e);
    } finally {
      setScoring(false);
    }
  }

  async function showSolution() {
    if (solution) {
      setSolution(null);
      return;
    }
    setLoadingSolution(true);
    setActiveGap(null);
    try {
      const { data, error } = await (supabase as any).rpc("score_sb_t2", {
        p_exercise_id: exercise.id,
        p_answers: {},
      });
      if (error) throw error;
      const res = data as { results: ScoreResult[] };
      const map = new Map<number, string>();
      for (const r of res.results) map.set(r.gap_number, r.correct_answer);
      setSolution(map);
    } catch (e) {
      console.error("Lösung konnte nicht geladen werden:", e);
    } finally {
      setLoadingSolution(false);
    }
  }

  function reset() {
    setAnswers(new Map());
    setActiveGap(null);
    setSubmitted(false);
    setResults([]);
    setScore(null);
    setSolution(null);
  }

  const resultMap = useMemo(
    () => new Map<number, ScoreResult>(results.map((r) => [r.gap_number, r])),
    [results],
  );

  const totalGaps = gapNumbers.length;
  const answeredCount = answers.size;
  const allAnswered = answeredCount === totalGaps && totalGaps > 0;

  // ── Inline gap rendering ──────────────────────────────────────────────────
  function renderGap(gapNum: number) {
    const filled = answers.get(gapNum);
    const isActive = activeGap === gapNum && !locked;

    // Graded view
    if (submitted) {
      const res = resultMap.get(gapNum);
      const ok = !!res?.correct;
      return (
        <span
          key={`gap-${gapNum}`}
          className={`inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium align-baseline transition-colors ${
            ok
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          {ok ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{res?.your_answer || "—"}</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              {res?.your_answer && (
                <span className="line-through opacity-60">{res.your_answer}</span>
              )}
              <span className="font-semibold">{res?.correct_answer}</span>
            </>
          )}
        </span>
      );
    }

    // Study reveal
    if (revealed) {
      const correctWord = solution!.get(gapNum);
      return (
        <span
          key={`gap-${gapNum}`}
          className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-medium align-baseline"
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{correctWord}</span>
        </span>
      );
    }

    // Solving view
    if (filled) {
      return (
        <button
          key={`gap-${gapNum}`}
          onClick={() => handleClearGap(gapNum)}
          title="Klicken, um das Wort zurückzulegen"
          className={`inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium align-baseline transition-all duration-150 ${
            isActive
              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
              : "border-primary/30 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10"
          }`}
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          <span>{filled}</span>
        </button>
      );
    }

    return (
      <button
        key={`gap-${gapNum}`}
        onClick={() => handleGapClick(gapNum)}
        className={`inline-flex items-center gap-1 mx-0.5 px-3 py-0.5 rounded-md border text-sm align-baseline transition-all duration-150 ${
          isActive
            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30 scale-105"
            : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
        }`}
      >
        <span className="text-[10px] font-black opacity-50">{gapNum}</span>
        <span className="italic opacity-50">＿＿＿</span>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-foreground mb-1">Aufgabe</p>
          {!examMode && <TranslateButton translation={translation?.text} loading={translationLoading} onRequest={loadTranslation} />}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lesen Sie den Text. Klicken Sie auf eine Lücke und wählen Sie das passende Wort
          aus der Wortliste. Jedes Wort passt nur in <strong>eine</strong> Lücke und kann
          nur <strong>einmal</strong> verwendet werden — es gibt mehr Wörter als Lücken.
        </p>
      </div>

      {/* Text (top) + word list (sidebar on desktop, below on mobile) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Passage ── */}
        <div className="w-full lg:flex-1 min-w-0 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">{exercise.title}</h2>
          <div className="text-sm text-foreground leading-[2.4] whitespace-pre-line select-text">
            {segments.map((seg, idx) =>
              typeof seg === "number" ? renderGap(seg) : <span key={`t-${idx}`}>{seg}</span>,
            )}
          </div>
        </div>

        {/* ── Word list ── */}
        <div className="w-full lg:w-64 lg:shrink-0">
          <div className="lg:sticky lg:top-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Wortliste
              </span>
              {!locked && (
                <span className="text-[11px] text-muted-foreground">
                  {answeredCount}/{totalGaps}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {exercise.words.map((w) => {
                const isUsed = usedWords.has(w.word);
                const selectable = !locked && activeGap !== null && !isUsed;
                return (
                  <button
                    key={w.word_number}
                    onClick={() => handleWordClick(w.word)}
                    disabled={!selectable}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      locked
                        ? "border-border bg-muted/40 text-muted-foreground/60 cursor-default"
                        : isUsed
                          ? "border-border bg-muted/40 text-muted-foreground/40 line-through cursor-not-allowed"
                          : activeGap !== null
                            ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer active:scale-95"
                            : "border-border bg-muted/40 text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {w.word}
                  </button>
                );
              })}
            </div>
            {!locked && (
              <p className="mt-3 text-[11px] text-muted-foreground text-center leading-snug">
                {activeGap === null
                  ? "Lücke anklicken, dann Wort wählen"
                  : `Wort für Lücke ${activeGap} wählen`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Correction table (after grading) */}
      {submitted && results.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Auswertung
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {results.map((r) => {
              const hasAids = r.learning_aids?.explanation_correct || r.learning_aids?.explanation_wrong || r.learning_aids?.grammar_structure || r.learning_aids?.evidence_text;
              return (
              <div key={r.gap_number}>
                <div
                  className={`flex items-center gap-3 px-5 py-2.5 ${r.correct ? "bg-emerald-500/3" : "bg-rose-500/3"}`}
                >
                  <span className="shrink-0 w-6 text-xs font-black text-muted-foreground text-center">
                    {r.gap_number}
                  </span>
                  {r.correct ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <span
                    className={`flex-1 text-sm ${r.correct ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-rose-700 dark:text-rose-300"}`}
                  >
                    {r.correct ? (
                      r.your_answer
                    ) : (
                      <>
                        <span className="line-through opacity-60">{r.your_answer || "—"}</span>{" "}
                        → <span className="font-semibold">{r.correct_answer}</span>
                      </>
                    )}
                  </span>
                </div>
                {!examMode && hasAids && (
                  explainOpen[r.gap_number] ? (
                    <div className="px-5 pb-2.5">
                      <EvidenceBlock aids={r.learning_aids} variant={r.correct ? "correct" : "wrong"} skill="sprachbausteine" exerciseId={exercise.id} itemKey={String(r.gap_number)} saveCategory="grammatikstruktur" />
                    </div>
                  ) : (
                    <div className="px-5 pb-2.5">
                      <button
                        onClick={() => setExplainOpen((p) => ({ ...p, [r.gap_number]: true }))}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <HelpCircle className="h-3 w-3" /> Warum?
                      </button>
                    </div>
                  )
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer controls — exam mode has no self-scoring/reveal/reset, the parent owns save/submit */}
      {examMode ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{answeredCount} / {totalGaps} eingesetzt</p>
        </div>
      ) : !submitted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {revealed ? "Lösung wird angezeigt" : `${answeredCount} / ${totalGaps} eingesetzt`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={showSolution}
              disabled={loadingSolution}
              className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/70 transition-colors flex items-center gap-2 disabled:opacity-40"
            >
              {loadingSolution ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              {solution ? "Lösung ausblenden" : "Lösung anzeigen"}
            </button>
            {(answeredCount > 0 || solution) && (
              <button
                onClick={reset}
                className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/70 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || scoring || !!solution}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2"
            >
              {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
              Auswertung
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-3xl font-black text-foreground">
            {score?.score} / {score?.total}
          </p>
          <p className="text-sm text-muted-foreground">
            {score && score.score === score.total
              ? "Perfekt! Alle Lücken korrekt ausgefüllt."
              : score && score.score >= 8
                ? "Sehr gut! Fast perfekt."
                : score && score.score >= 6
                  ? "Gut. Weiter üben!"
                  : "Noch etwas Übung nötig — nicht aufgeben!"}
          </p>
          <button
            onClick={reset}
            className="rounded-xl border border-border bg-muted px-5 py-2 text-sm font-medium hover:bg-muted/70 transition-colors flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Nochmal versuchen
          </button>
        </div>
      )}
    </div>
  );
}

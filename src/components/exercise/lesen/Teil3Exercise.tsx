/**
 * Lesen Teil 3 — Situationen + Anzeigen (A–L)
 *
 * Security: `correct_letter` and `no_match` are NEVER in the component's data.
 * Scoring runs server-side via score_and_save_lesen_t3 (records the attempt in
 * lesen_attempts) / score_lesen_t3 (non-saving preview variant).
 *
 * Solution reveal: mirrors Lesen Teil 1/2 — ONE "Lösung anzeigen" button for
 * the whole exercise (not one per situation). Clicking it fetches every
 * correct ad + evidence + Warum via the non-saving score_lesen_t3 RPC and
 * shows it for every situation at once; a second click hides it again. After
 * the student submits (Auswertung), the same full solution shows
 * automatically for every situation — no extra click needed.
 *
 * Resilience: in-progress answers autosave to localStorage and are restored
 * after a refresh or a closed browser, same as T1/T2.
 *
 * Security: the graded solution (correct_answer + learning_aids/Warum text)
 * is deliberately NEVER written to localStorage — only the student's own
 * answer choices and the numeric score are. If a previously-submitted
 * attempt is restored, the solution is re-fetched from score_lesen_t3 (the
 * same server RPC "Lösung anzeigen" uses), which re-checks the caller's
 * subscription on every call — see Teil2Exercise.tsx for the full rationale
 * (same pattern, same bug it closes).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, X, Loader2, AlertCircle, RotateCcw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { attemptKey, loadAttempt, saveAttempt, clearAttempt } from "@/lib/practice/attempt-storage";
import { useExerciseTranslation } from "@/components/learning/useExerciseTranslation";
import { TranslateButton } from "@/components/learning/TranslateButton";
import { EvidenceBlock } from "@/components/learning/EvidenceBlock";
import { StrategyCard } from "@/components/learning/StrategyCard";
import { HighlightedText, type HighlightItem } from "@/components/learning/HighlightedText";
import { SentenceTranslations } from "@/components/learning/SentenceTranslations";
import type { LearningAidsItem } from "@/components/learning/types";

export interface T3Situation {
  number: number;
  description: string;
}

export interface T3Text {
  letter: string;
  title: string;
  content: string;
}

export interface T3ExerciseData {
  id: string;
  situations: T3Situation[];
  texts: T3Text[];
}

interface ScoreResult {
  number: number;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
  learning_aids?: LearningAidsItem | null;
}

interface Props {
  exercise: T3ExerciseData;
  onComplete?: (score: number, total: number) => void;
}

/**
 * Shape persisted to localStorage for resume-after-refresh. Deliberately
 * holds ONLY the student's own answer choices + the numeric score — never
 * `scoreResults`. See the Security note in the file header.
 */
interface PersistedAttempt {
  exerciseId: string;
  answers: Record<number, string>;
  submitted: boolean;
  scoreCount: number;
  scoreTotal: number;
  updatedAt: number;
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

// ── Ad picker popup ───────────────────────────────────────────────────────────

interface AdPickerProps {
  texts: T3Text[];
  current: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  anchorEl: HTMLButtonElement | null;
}

function AdPicker({ texts, current, onSelect, onClose, anchorEl }: AdPickerProps) {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const sorted = [...texts].sort((a, b) => a.letter.localeCompare(b.letter));

  return (
    <div
      ref={popRef}
      role="listbox"
      className="absolute z-50 top-full left-0 mt-2 w-[320px] max-w-[90vw] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Anzeige wählen</p>
        <button onClick={onClose} className="rounded-lg p-0.5 hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
        {sorted.map((text) => {
          const isSelected = current === text.letter;
          return (
            <button
              key={text.letter}
              role="option"
              aria-selected={isSelected}
              onClick={() => { onSelect(text.letter); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                isSelected ? "bg-blue-500/8" : ""
              }`}
            >
              <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${
                isSelected
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-muted text-muted-foreground"
              }`}>
                {text.letter}
              </span>
              <span className={`text-sm leading-snug flex-1 ${isSelected ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-foreground"}`}>
                {text.title || `Anzeige ${text.letter}`}
              </span>
            </button>
          );
        })}

        <button
          role="option"
          aria-selected={current === "X"}
          onClick={() => { onSelect("X"); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${
            current === "X" ? "bg-amber-500/8" : ""
          }`}
        >
          <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${
            current === "X"
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
              : "bg-muted text-amber-600 dark:text-amber-400"
          }`}>
            X
          </span>
          <span className={`text-sm leading-snug ${current === "X" ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground"}`}>
            Keine passende Anzeige
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Teil3Exercise({ exercise, onComplete }: Props) {
  const { user, loading: authLoading } = useAuth();
  const groupBaseId = useId();

  const [answers, setAnswers]           = useState<Record<number, string>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [scoring, setScoring]           = useState(false);
  const [scoreError, setScoreError]     = useState<string | null>(null);
  const [openPopup, setOpenPopup]       = useState<number | null>(null);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreCount, setScoreCount]     = useState(0);
  const [scoreTotal, setScoreTotal]     = useState(0);
  const [restored, setRestored]         = useState(false);
  const [previewResults, setPreviewResults] = useState<ScoreResult[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const { data: translation, loading: translationLoading, ensureLoaded: loadTranslation } = useExerciseTranslation("lesen", exercise.id);

  const hydratedRef = useRef(false);

  const storageKey = useMemo(
    () => attemptKey(["lesen.t3", user?.id ?? "anon", exercise.id]),
    [user?.id, exercise.id],
  );

  const situations = useMemo(() => [...exercise.situations].sort((a, b) => a.number - b.number), [exercise.situations]);
  const texts      = useMemo(() => [...exercise.texts].sort((a, b) => a.letter.localeCompare(b.letter)), [exercise.texts]);

  // ── Resume: hydrate saved attempt once auth has resolved (so the key is stable) ──
  // Note: `scoreResults` (the real solution) is never in the saved blob — if
  // the restored attempt was already submitted, a separate effect below
  // re-fetches it from the server, which re-validates access on every call.
  useEffect(() => {
    if (hydratedRef.current || authLoading) return;
    const saved = loadAttempt<PersistedAttempt>(storageKey);
    if (saved && saved.exerciseId === exercise.id) {
      setAnswers(saved.answers ?? {});
      setSubmitted(!!saved.submitted);
      setScoreCount(saved.scoreCount ?? 0);
      setScoreTotal(saved.scoreTotal ?? 0);
      if (saved.submitted || Object.keys(saved.answers ?? {}).length > 0) setRestored(true);
    }
    hydratedRef.current = true;
  }, [authLoading, storageKey, exercise.id]);

  // ── Re-derive the solution for a restored, already-submitted attempt.
  // Deliberately a server round-trip (score_lesen_t3, the same non-saving
  // RPC "Lösung anzeigen" uses) rather than trusting anything cached — this
  // is what re-enforces the subscription check after a refresh, a
  // logout/login, or a subscription that expired since the student last
  // submitted. See the Security note in the file header. ──
  useEffect(() => {
    if (!hydratedRef.current || !submitted || scoreResults) return;
    let cancelled = false;
    (async () => {
      const payload: Record<string, string> = {};
      for (const s of situations) {
        if (answers[s.number]) {
          const v = answers[s.number];
          payload[String(s.number)] = v === "X" ? "0" : v;
        }
      }
      try {
        const { data, error } = await (supabase as any).rpc("score_lesen_t3", {
          p_exercise_id: exercise.id,
          p_answers: payload,
        });
        if (error) throw error;
        if (cancelled) return;
        const res = data as unknown as { score: number; total: number; results: ScoreResult[] };
        setScoreResults(res.results);
        setScoreCount(res.score);
        setScoreTotal(res.total);
      } catch (e) {
        // The subscription likely lapsed since this was submitted (or the
        // exercise was unpublished) — fall back to a plain "start over"
        // state rather than leaving a permanently-blank "submitted" screen.
        if (!cancelled) {
          console.error("Could not re-derive the stored solution:", e);
          setSubmitted(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [submitted, scoreResults, exercise.id, situations, answers]);

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
      scoreCount,
      scoreTotal,
      updatedAt: Date.now(),
    });
  }, [answers, submitted, scoreCount, scoreTotal, storageKey, exercise.id]);

  function selectAnswer(num: number, value: string) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [num]: value }));
  }

  // "Lösung anzeigen" — the ONE reveal button for the whole exercise, mirrors T1/T2.
  async function toggleSolutionPreview() {
    if (previewResults) { setPreviewResults(null); return; }
    setLoadingPreview(true);
    setOpenPopup(null);
    try {
      const { data, error } = await (supabase as any).rpc("score_lesen_t3", {
        p_exercise_id: exercise.id,
        p_answers:     {},
      });
      if (error) throw error;
      const res = data as unknown as { results: ScoreResult[] };
      setPreviewResults(res.results);
    } catch (e) {
      console.error("Lösung konnte nicht geladen werden:", e);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSubmit() {
    setScoring(true);
    setScoreError(null);
    setOpenPopup(null);
    try {
      const payload: Record<string, string> = {};
      for (const s of situations) {
        if (answers[s.number]) {
          const v = answers[s.number];
          payload[String(s.number)] = v === "X" ? "0" : v;
        }
      }

      const { data, error } = await (supabase as any).rpc("score_and_save_lesen_t3", {
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
      setPreviewResults(null);
      onComplete?.(res.score, res.total);
    } catch (e) {
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
    setOpenPopup(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
    setRestored(false);
    setPreviewResults(null);
    clearAttempt(storageKey);
  }

  function adTitle(letter: string): string {
    if (letter === "X" || letter === "0" || !letter) return "Keine passende Anzeige";
    return exercise.texts.find(t => t.letter === letter)?.title || `Anzeige ${letter}`;
  }

  function selectedLabel(selected: string): string {
    if (!selected || selected === "X") return "X";
    const title = exercise.texts.find(t => t.letter === selected)?.title;
    return title ? `${selected} — ${title}` : selected;
  }

  function correctDisplay(ca: string): string {
    if (ca === "0" || ca === "") return "X";
    return ca;
  }

  const answeredCount = situations.filter(s => !!answers[s.number]).length;

  // Revealed solution content = whatever's active right now: the real,
  // scored results after submitting, or the preview fetched by "Lösung
  // anzeigen" beforehand. Mirrors T1/T2's activeResults pattern exactly.
  const activeResults = scoreResults ?? previewResults;

  const solvedSituations = situations
    .map((sit) => {
      const result = activeResults?.find(r => r.number === sit.number);
      return result ? { sit, result } : null;
    })
    .filter((x): x is { sit: T3Situation; result: ScoreResult } => x !== null);

  // map correct ad letter -> which situation numbers it answers (for the "→ 12, 15" badge)
  const solutionLetterToNums: Record<string, number[]> = {};
  for (const { result } of solvedSituations) {
    const ca = result.correct_answer;
    if (ca && ca !== "0") (solutionLetterToNums[ca] ||= []).push(result.number);
  }

  // Evidence highlighting: grouped by the matching ad's letter, since each
  // situation's evidence lives inside a specific ad text, not a shared passage.
  const highlightsByLetter: Record<string, HighlightItem[]> = {};
  for (const { sit, result } of solvedSituations) {
    const letter = result.correct_answer;
    if (!letter || letter === "0" || !result.learning_aids?.evidence_text) continue;
    (highlightsByLetter[letter] ||= []).push({
      itemKey: String(sit.number),
      label: String(sit.number),
      evidenceText: result.learning_aids.evidence_text,
      evidenceTranslation: result.learning_aids.evidence_translation,
      unitLabel: "Situation",
    });
  }

  const translationItems = solvedSituations
    .filter(({ result }) => !!result.learning_aids?.evidence_text && !!result.learning_aids?.evidence_translation)
    .map(({ sit, result }) => ({
      itemKey: String(sit.number),
      label: String(sit.number),
      german: result.learning_aids!.evidence_text!,
      arabic: result.learning_aids!.evidence_translation!,
    }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-1">Aufgabe</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lesen Sie die Situationen und die Anzeigen. Für welche Situation ist welche Anzeige geeignet?
          Für manche Situationen gibt es keine passende Anzeige — wählen Sie dann <strong>X</strong>.
        </p>
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

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Situations */}
        <div className="space-y-2.5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Situationen</p>
          {situations.map((sit) => {
            const ans       = answers[sit.number];
            const result    = activeResults?.find(r => r.number === sit.number);
            const hasSolution = !!result;
            const isSubmittedCorrect = submitted && !!result?.correct;
            const isSubmittedWrong   = submitted && !!result && !result.correct;
            const isOpen    = openPopup === sit.number;
            const labelId   = `${groupBaseId}-s${sit.number}`;

            return (
              <div key={sit.number} className="relative">
                <div className={`rounded-2xl border overflow-hidden transition-colors ${
                  isSubmittedCorrect ? "border-emerald-500/40 bg-emerald-500/3"
                  : isSubmittedWrong  ? "border-rose-500/40 bg-rose-500/3"
                  : "border-border bg-card"
                }`}>
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                      {sit.number}
                    </span>
                    <p id={labelId} className="flex-1 text-sm text-foreground leading-snug">{sit.description}</p>

                    {!submitted ? (
                      <button
                        ref={(el) => { buttonRefs.current[sit.number] = el; }}
                        onClick={() => setOpenPopup(isOpen ? null : sit.number)}
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        aria-labelledby={labelId}
                        className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all max-w-[130px] ${FOCUS_RING} ${
                          ans
                            ? "border-primary/30 bg-primary/8 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">
                          {ans ? selectedLabel(ans) : "—"}
                        </span>
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    ) : (
                      <span className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-xl text-xs font-black ${
                        isSubmittedCorrect ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}>
                        {ans ?? "—"}
                      </span>
                    )}
                  </div>

                  <div className="px-4 pb-2">
                    <TranslateButton translation={translation?.questions?.[String(sit.number)]} loading={translationLoading} onRequest={loadTranslation} />
                  </div>

                  {submitted && ans && result && (
                    <div className={`flex items-center gap-1.5 border-t border-border/50 px-4 py-2 ${
                      isSubmittedCorrect ? "bg-emerald-500/5" : "bg-rose-500/5"
                    }`}>
                      {isSubmittedCorrect
                        ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Richtig</span></>
                        : <><XCircle className="h-3.5 w-3.5 text-rose-500" /><span className="text-xs font-bold text-rose-600 dark:text-rose-400">Falsch</span></>
                      }
                    </div>
                  )}

                  {/* Solution: correct ad — shown whenever a preview or a real
                      submission produced a result, unless already obvious
                      (submitted + correct: the situation badge already says it). */}
                  {hasSolution && !isSubmittedCorrect && (
                    <div className="mx-4 mb-2.5 mt-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Richtige Antwort</p>
                      <p className="flex items-start gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{correctDisplay(result!.correct_answer)} — {adTitle(result!.correct_answer)}</span>
                      </p>
                    </div>
                  )}
                  {hasSolution && (result!.learning_aids?.explanation_correct || result!.learning_aids?.explanation_wrong || result!.learning_aids?.evidence_text) && (
                    <div className="flex flex-wrap items-start gap-2 px-4 pb-3">
                      <EvidenceBlock aids={result!.learning_aids} variant={isSubmittedWrong ? "wrong" : "correct"} skill="lesen" exerciseId={exercise.id} itemKey={String(sit.number)} saveCategory="wichtiger_ausdruck" showEvidenceQuote={false} triggerLabel={`Situation ${sit.number}`} />
                      <StrategyCard aids={result!.learning_aids} triggerLabel={`Situation ${sit.number}`} />
                    </div>
                  )}
                </div>

                {isOpen && !submitted && (
                  <AdPicker
                    texts={texts}
                    current={ans ?? ""}
                    onSelect={(v) => selectAnswer(sit.number, v)}
                    onClose={() => setOpenPopup(null)}
                    anchorEl={buttonRefs.current[sit.number]}
                  />
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
        </div>

        {/* Advertisement texts A–L */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Anzeigen</p>
            <SentenceTranslations items={translationItems} />
          </div>
          {texts.map((text) => {
            const solNums = solutionLetterToNums[text.letter];
            const isSol = !!solNums?.length;
            return (
            <div key={text.letter} className={`rounded-2xl border bg-card overflow-hidden ${isSol ? "border-emerald-500/50 ring-1 ring-emerald-500/30" : "border-border"}`}>
              <div className="flex items-center gap-2.5 border-b border-border bg-muted/20 px-4 py-2.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black ${isSol ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                  {text.letter}
                </span>
                {text.title && (
                  <p className="text-xs font-bold text-foreground truncate flex-1">{text.title}</p>
                )}
                {isSol && (
                  <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                    → {solNums!.sort((a, b) => a - b).join(", ")}
                  </span>
                )}
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                  <HighlightedText text={text.content} items={highlightsByLetter[text.letter] ?? []} />
                </div>
                <TranslateButton translation={translation?.questions?.[text.letter]} loading={translationLoading} onRequest={loadTranslation} />
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {!submitted ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">{answeredCount} / {situations.length} beantwortet</p>
            <p className="text-[11px] text-muted-foreground/70">Fortschritt wird automatisch gespeichert</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleSolutionPreview} disabled={loadingPreview}
              className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-500/10 disabled:opacity-40 flex items-center gap-2 ${FOCUS_RING}`}>
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : previewResults ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewResults ? "Lösung ausblenden" : "Lösung anzeigen"}
            </button>
            <button onClick={handleSubmit} disabled={answeredCount < situations.length || scoring}
              className={`rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2 ${FOCUS_RING}`}>
              {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
              Auswertung
            </button>
          </div>
        </div>
      ) : (
        <div aria-live="polite" className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-3xl font-black text-foreground">{scoreCount} / {scoreTotal}</p>
          <p className="text-sm text-muted-foreground">
            {scoreCount === scoreTotal ? "Perfekt! Alle Situationen richtig zugeordnet."
            : scoreCount >= Math.ceil(scoreTotal * 0.8) ? "Sehr gut! Fast perfekt."
            : scoreCount >= Math.ceil(scoreTotal * 0.6) ? "Gut. Noch etwas üben."
            : "Weiter üben — die Anzeigen aufmerksam lesen hilft!"}
          </p>
          <button onClick={reset}
            className={`rounded-xl border border-border bg-muted px-5 py-2 text-sm font-medium hover:bg-muted/70 transition-colors ${FOCUS_RING}`}>
            Nochmal versuchen
          </button>
        </div>
      )}
    </div>
  );
}

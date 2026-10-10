/**
 * Sprachbausteine Teil 2 — Lückentext mit gemeinsamer Wortliste
 *
 * Interaction (mirrors Teil 1's gap popover, but with the shared word list):
 *   1. Click a gap  → a popover opens right at the gap with ALL words of the
 *                     list; words already used in another gap are struck
 *                     through and disabled (each word can be used only once).
 *   2. Click a word → it fills the gap and the popover closes. Focus moves to
 *                     the next still-empty gap (highlighted, popover closed).
 *   3. Click a filled gap → the popover reopens with its word marked; pick a
 *                     different word to swap, or "Wort zurücklegen" to empty it.
 *   The Wortliste beside/below the text still works as before (active gap +
 *   click a word), so both ways lead to the same state.
 *
 * Security: correct answers are NEVER shipped in the student payload. Both
 * grading ("Auswertung") and the study reveal ("Lösung anzeigen") go through
 * the server-side RPC `score_sb_t2` — the reveal calls it with empty answers,
 * which returns every gap's correct_word AND its Warum/translation
 * learning_aids without ever exposing them client-side ahead of time.
 *
 * Solution reveal: ONE "Lösung anzeigen" button for the whole exercise —
 * the full result set (correct word + Warum + translation) is shown for
 * every gap at once, exactly like after a real submission (mirrors T1 and
 * Lesen T1/T2/T3's previewResults/activeResults pattern).
 *
 * Responsive: on desktop/tablet the word list is a sticky sidebar beside the
 * text; on mobile it stacks below the text (text stays on top).
 */
import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Loader2, RotateCcw, Eye, EyeOff, HelpCircle, ChevronDown, Undo2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useExerciseTranslation } from "@/components/learning/useExerciseTranslation";
import { TranslateButton } from "@/components/learning/TranslateButton";
import { AnchoredEvidencePopover } from "@/components/learning/AnchoredEvidencePopover";
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

// ── Word popover ───────────────────────────────────────────────────────────────

interface WordPopoverProps {
  gapNum: number;
  words: SBT2Word[];
  current: string | undefined;
  /** word → gap it already fills (those are disabled: each word only once) */
  usedWords: Map<string, number>;
  onSelect: (word: string) => void;
  onClear: () => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

const WORD_POPOVER_MARGIN = 8;
const WORD_POPOVER_WIDTH = 300;

// Same placement approach as Teil 1's GapPopover: fixed + portal, clamped to the
// viewport (a gap sits in flowing paragraph text, so absolute positioning inside
// it would overlap the sentence); bottom sheet on phones.
function WordPopover({ gapNum, words, current, usedWords, onSelect, onClear, onClose, anchorEl }: WordPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [style, setStyle] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    if (isMobile || !anchorEl) return;
    function place() {
      const rect = anchorEl!.getBoundingClientRect();
      const width = Math.min(WORD_POPOVER_WIDTH, window.innerWidth - WORD_POPOVER_MARGIN * 2);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(left, WORD_POPOVER_MARGIN), window.innerWidth - width - WORD_POPOVER_MARGIN);
      const popHeight = popRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom - WORD_POPOVER_MARGIN;
      const spaceAbove = rect.top - WORD_POPOVER_MARGIN;
      const openUpward = popHeight > spaceBelow && spaceAbove > spaceBelow;
      const top = openUpward ? Math.max(rect.top - popHeight - 6, WORD_POPOVER_MARGIN) : rect.bottom + 6;
      setStyle({ top, left, maxHeight: Math.max(openUpward ? spaceAbove : spaceBelow, 200) });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorEl, isMobile]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorEl]);

  const freeCount = words.filter((w) => !usedWords.has(w.word)).length;
  const body = (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lücke {gapNum}</span>
        <span className="text-[11px] text-muted-foreground">{freeCount} von {words.length} Wörtern frei</span>
      </div>
      <div role="listbox" className={`grid gap-1.5 ${isMobile ? "grid-cols-3" : "grid-cols-2"}`}>
        {words.map((w) => {
          const usedIn = usedWords.get(w.word);
          const isCurrent = current === w.word;
          const disabled = usedIn !== undefined && !isCurrent;
          return (
            <button
              key={w.word_number}
              role="option"
              aria-selected={isCurrent}
              disabled={disabled}
              onClick={() => onSelect(w.word)}
              className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                  : disabled
                    ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/45"
                    : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <span className={disabled ? "line-through" : ""}>{w.word}</span>
              {disabled && <span className="shrink-0 text-[10px] font-black opacity-70">{usedIn}</span>}
            </button>
          );
        })}
      </div>
      {current && (
        <button
          onClick={onClear}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Undo2 className="h-3.5 w-3.5" /> Wort zurücklegen
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div
          ref={popRef}
          className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="flex justify-center pt-2"><div className="h-1 w-10 rounded-full bg-muted-foreground/25" /></div>
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={popRef}
      className="fixed z-50 overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
      style={style
        ? { top: style.top, left: style.left, width: WORD_POPOVER_WIDTH, maxHeight: style.maxHeight, maxWidth: `calc(100vw - ${WORD_POPOVER_MARGIN * 2}px)` }
        : { visibility: "hidden", top: 0, left: 0, width: WORD_POPOVER_WIDTH }}
    >
      {body}
    </div>,
    document.body,
  );
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
  // Gap whose word popover is open (separate from activeGap: after a pick the focus
  // moves to the next empty gap WITHOUT opening a popover far from the viewport).
  const [pickerGap, setPickerGap] = useState<number | null>(null);
  const gapButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (examMode) onAnswersChange?.(Object.fromEntries([...answers].map(([k, v]) => [String(k), v])));
  }, [examMode, answers, onAnswersChange]);

  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);

  // "Lösung anzeigen" — ONE button for the whole exercise. Fetches the full
  // result set (correct word + Warum + translation) securely, same shape as
  // a real submission — no separate "correct-word-only" map anymore.
  const [previewResults, setPreviewResults] = useState<ScoreResult[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [openResultGap, setOpenResultGap] = useState<number | null>(null);
  const resultButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const { data: translation, loading: translationLoading, ensureLoaded: loadTranslation } = useExerciseTranslation("sprachbausteine", exercise.id);

  const activeResults = scoreResults ?? previewResults;
  const revealed = !submitted && previewResults !== null;
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
    setActiveGap(gapNum);
    setPickerGap((cur) => (cur === gapNum ? null : gapNum));
  }

  function handleClearGap(gapNum: number) {
    if (locked) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      next.delete(gapNum);
      return next;
    });
    setActiveGap(gapNum);
    setPickerGap(null);
  }

  // Pick from the popover: fills (or swaps) exactly that gap; the word the gap held
  // before simply returns to the list.
  function handlePopoverPick(gapNum: number, word: string) {
    if (locked) return;
    const holder = usedWords.get(word);
    if (holder !== undefined && holder !== gapNum) return; // each word only once
    const next = new Map(answers);
    next.set(gapNum, word);
    setAnswers(next);
    setActiveGap(nextEmptyGap(gapNum, next));
    setPickerGap(null);
  }

  function handleWordClick(word: string) {
    if (locked || activeGap === null || usedWords.has(word)) return;
    setPickerGap(null);
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
    setPickerGap(null);
    const payload: Record<string, string> = {};
    for (const [gap, word] of answers) payload[String(gap)] = word;
    try {
      const { data, error } = await (supabase as any).rpc("score_sb_t2", {
        p_exercise_id: exercise.id,
        p_answers: payload,
      });
      if (error) throw error;
      const res = data as { score: number; total: number; results: ScoreResult[] };
      setScoreResults(res.results ?? []);
      setScore({ score: res.score, total: res.total });
      setSubmitted(true);
      setPreviewResults(null);
      onComplete?.(res.score, res.total);
    } catch (e) {
      console.error("Scoring error", e);
    } finally {
      setScoring(false);
    }
  }

  async function toggleSolutionPreview() {
    if (previewResults) { setPreviewResults(null); return; }
    setLoadingPreview(true);
    setActiveGap(null);
    setPickerGap(null);
    try {
      const { data, error } = await (supabase as any).rpc("score_sb_t2", {
        p_exercise_id: exercise.id,
        p_answers: {},
      });
      if (error) throw error;
      const res = data as { results: ScoreResult[] };
      setPreviewResults(res.results ?? []);
    } catch (e) {
      console.error("Lösung konnte nicht geladen werden:", e);
    } finally {
      setLoadingPreview(false);
    }
  }

  function reset() {
    setAnswers(new Map());
    setActiveGap(null);
    setPickerGap(null);
    setSubmitted(false);
    setScoreResults(null);
    setScore(null);
    setPreviewResults(null);
    setOpenResultGap(null);
  }

  const resultMap = useMemo(
    () => new Map<number, ScoreResult>((activeResults ?? []).map((r) => [r.gap_number, r])),
    [activeResults],
  );

  const totalGaps = gapNumbers.length;
  const answeredCount = answers.size;
  const allAnswered = answeredCount === totalGaps && totalGaps > 0;

  // ── Inline gap rendering ──────────────────────────────────────────────────
  function renderGap(gapNum: number) {
    const filled = answers.get(gapNum);
    const isActive = activeGap === gapNum && !locked;

    // Graded / revealed view — same rendering for both, driven by activeResults.
    if (locked) {
      const res = resultMap.get(gapNum);
      const ok = submitted ? !!res?.correct : true; // preview mode: always show as "correct" styling (no grading yet)
      const explanation = ok ? res?.learning_aids?.explanation_correct : res?.learning_aids?.explanation_wrong;
      const hasAids = !examMode && !!res?.learning_aids &&
        !!(explanation || res.learning_aids.evidence_text || res.learning_aids.grammar_structure || res.learning_aids.keyword);
      const isOpen = openResultGap === gapNum;
      const badgeClasses = `inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium align-baseline transition-colors ${
        ok
          ? `border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ${hasAids ? "cursor-pointer hover:bg-emerald-500/15" : ""}`
          : `border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 ${hasAids ? "cursor-pointer hover:bg-rose-500/15" : ""}`
      }`;
      const content = submitted ? (
        ok ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold">{res?.your_answer || "—"}</span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {res?.your_answer && (
              <span className="line-through opacity-60">{res.your_answer}</span>
            )}
            <span className="font-semibold">{res?.correct_answer}</span>
          </>
        )
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">{res?.correct_answer}</span>
        </>
      );

      if (!hasAids) {
        return (
          <span key={`gap-${gapNum}`} className={badgeClasses}>
            <span className="text-[10px] font-black opacity-50">{gapNum}</span>
            {content}
          </span>
        );
      }

      return (
        <span key={`gap-${gapNum}`} className="relative inline-block align-baseline">
          <button
            ref={(el) => { resultButtonRefs.current[gapNum] = el; }}
            onClick={() => setOpenResultGap((p) => (p === gapNum ? null : gapNum))}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className={badgeClasses}
          >
            <span className="text-[10px] font-black opacity-50">{gapNum}</span>
            {content}
            <span className="ml-0.5 flex items-center gap-0.5 rounded-full bg-violet-500/15 px-1 py-0.5 text-[9px] font-black text-violet-600 dark:text-violet-300">
              <HelpCircle className="h-2.5 w-2.5" /> Warum?
            </span>
          </button>
          {isOpen && (
            <AnchoredEvidencePopover
              aids={res!.learning_aids}
              variant={ok ? "correct" : "wrong"}
              skill="sprachbausteine"
              exerciseId={exercise.id}
              itemKey={String(gapNum)}
              saveCategory="grammatikstruktur"
              yourAnswerText={submitted ? res?.your_answer : null}
              correctAnswerText={res?.correct_answer}
              onClose={() => setOpenResultGap(null)}
              anchorEl={resultButtonRefs.current[gapNum]}
            />
          )}
        </span>
      );
    }

    // Solving view — filled and empty gaps both open the word popover
    const isOpen = pickerGap === gapNum;
    return (
      <span key={`gap-${gapNum}`} className="inline-block align-baseline">
        <button
          ref={(el) => { gapButtonRefs.current[gapNum] = el; }}
          onClick={() => handleGapClick(gapNum)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title={filled ? "Klicken, um das Wort zu ändern" : "Klicken, um ein Wort zu wählen"}
          className={`inline-flex items-center gap-1 mx-0.5 rounded-md border text-sm align-baseline transition-all duration-150 ${filled ? "px-2 py-0.5 font-medium" : "px-3 py-0.5"} ${
            isActive || isOpen
              ? `border-primary bg-primary/10 text-primary ring-2 ring-primary/30 ${filled ? "" : "scale-105"}`
              : filled
                ? "border-primary/30 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10"
                : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          {filled ? <span>{filled}</span> : <span className="italic opacity-50">＿＿＿</span>}
          <ChevronDown className={`h-2.5 w-2.5 opacity-40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <WordPopover
            gapNum={gapNum}
            words={exercise.words}
            current={filled}
            usedWords={usedWords}
            onSelect={(w) => handlePopoverPick(gapNum, w)}
            onClear={() => handleClearGap(gapNum)}
            onClose={() => setPickerGap(null)}
            anchorEl={gapButtonRefs.current[gapNum]}
          />
        )}
      </span>
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
          Lesen Sie den Text. Klicken Sie auf eine Lücke — alle Wörter der Liste erscheinen
          dort zur Auswahl. Jedes Wort passt nur in <strong>eine</strong> Lücke und kann
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
                  ? "Lücke anklicken — alle Wörter erscheinen"
                  : `Wort für Lücke ${activeGap} wählen`}
              </p>
            )}
          </div>
        </div>
      </div>

      {locked && !examMode && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Tippen Sie auf eine Lücke mit „Warum?", um die Erklärung zu sehen.
        </p>
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
              onClick={toggleSolutionPreview}
              disabled={loadingPreview}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-500/10 disabled:opacity-40 flex items-center gap-2"
            >
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : previewResults ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewResults ? "Lösung ausblenden" : "Lösung anzeigen"}
            </button>
            {(answeredCount > 0 || previewResults) && (
              <button
                onClick={reset}
                className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/70 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || scoring || !!previewResults}
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

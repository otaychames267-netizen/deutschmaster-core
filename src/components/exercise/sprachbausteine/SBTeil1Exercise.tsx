/**
 * Sprachbausteine Teil 1 — Lückentext mit A/B/C Optionen
 *
 * Security: correct answers are NEVER fetched. Scoring is done
 * server-side via supabase.rpc("score_sb_t1") only after submission.
 *
 * UX: gaps are inline clickable buttons. Clicking opens a small
 * popover directly under the gap showing options A, B, C. The
 * selected answer is shown inside the gap. Answers can be changed
 * before submission.
 *
 * Solution reveal: ONE "Lösung anzeigen" button for the whole exercise
 * (mirrors Lesen T1/T2/T3) — fetches every correct answer + Warum via the
 * non-saving score_sb_t1 RPC (empty answers) and shows the full solution
 * for every gap at once, exactly like after a real submission. A second
 * click hides it again.
 *
 * Two-part correlatives (e.g. "sowohl…als auch") occupy TWO gap buttons
 * that share the SAME gap_number. State keyed only by gap_number would
 * make both occurrences fight over one popover/ref — every piece of
 * per-occurrence UI state (open popover, DOM ref) is keyed by
 * `${gapNumber}:${occurrenceIndex}` instead, while the underlying answer
 * itself stays keyed by plain gap_number (it's genuinely one selection).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, ChevronDown, Loader2, RotateCcw, Eye, EyeOff, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExerciseTranslation } from "@/components/learning/useExerciseTranslation";
import { TranslateButton } from "@/components/learning/TranslateButton";
import { AnchoredEvidencePopover } from "@/components/learning/AnchoredEvidencePopover";
import type { LearningAidsItem } from "@/components/learning/types";

export interface SBT1Gap {
  gap_number: number;
  option_a: string;
  option_b: string;
  option_c: string;
}

export interface SBT1ExerciseData {
  id: string;
  title: string;
  passage: string; // text with gap markers like {{31}}, {{32}} … {{40}}
  gaps: SBT1Gap[];
}

interface ScoreResult {
  gap_number: number;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
  learning_aids?: LearningAidsItem | null;
}

interface Props {
  exercise: SBT1ExerciseData;
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

// ── Gap popover ────────────────────────────────────────────────────────────────

interface GapPopoverProps {
  gap: SBT1Gap;
  current: string;
  onSelect: (choice: "a" | "b" | "c") => void;
  onClose: () => void;
  anchorEl: HTMLButtonElement | null;
}

function GapPopover({ gap, current, onSelect, onClose, anchorEl }: GapPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);

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

  const options: Array<{ key: "a" | "b" | "c"; label: string; text: string }> = [
    { key: "a", label: "A", text: gap.option_a },
    { key: "b", label: "B", text: gap.option_b },
    { key: "c", label: "C", text: gap.option_c },
  ];

  return (
    <div
      ref={popRef}
      role="listbox"
      className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
    >
      {options.map(({ key, label, text }) => {
        const isSelected = current === key;
        return (
          <button
            key={key}
            role="option"
            aria-selected={isSelected}
            onClick={() => { onSelect(key); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
              isSelected ? "bg-primary/8" : ""
            }`}
          >
            <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${
              isSelected
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-muted text-muted-foreground"
            }`}>
              {label}
            </span>
            <span className={`leading-snug ${isSelected ? "font-semibold text-primary" : "text-foreground"}`}>
              {text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function gapOptionText(gap: SBT1Gap, choice: string | null | undefined): string {
  if (!choice) return "—";
  return (choice === "a" ? gap.option_a : choice === "b" ? gap.option_b : gap.option_c) ?? choice;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SBTeil1Exercise({ exercise, onComplete, examMode, initialAnswers, onAnswersChange }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>(() => initialAnswers ?? {});
  // Open popover/card, keyed by "<gapNumber>:<occurrenceIndex>" so two-part
  // correlatives (same gap_number, two DOM spots) never collide.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreCount, setScoreCount] = useState(0);
  const [scoreTotal, setScoreTotal] = useState(0);
  // "Lösung anzeigen" — ONE button for the whole exercise. Fetches every
  // correct answer + Warum/translation via the non-saving RPC and shows the
  // full solution for every gap at once, same shape as a real submission.
  const [previewResults, setPreviewResults] = useState<ScoreResult[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { data: translation, loading: translationLoading, ensureLoaded: loadTranslation } = useExerciseTranslation("sprachbausteine", exercise.id);

  useEffect(() => {
    if (examMode) onAnswersChange?.(answers);
  }, [examMode, answers, onAnswersChange]);

  const gaps = [...exercise.gaps].sort((a, b) => a.gap_number - b.gap_number);

  const selectAnswer = useCallback((gapNum: number, choice: "a" | "b" | "c") => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [gapNum]: choice }));
  }, [submitted]);

  function toggleKey(key: string) {
    setOpenKey(prev => prev === key ? null : key);
  }

  // Close popover on outside click
  useEffect(() => {
    if (openKey === null) return;
    function handler(e: MouseEvent) {
      const btn = buttonRefs.current[openKey!];
      if (btn && btn.contains(e.target as Node)) return;
      const popovers = document.querySelectorAll('[role="listbox"], [role="dialog"]');
      for (const pop of popovers) {
        if (pop.contains(e.target as Node)) return;
      }
      setOpenKey(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openKey]);

  // activeResults = whatever's live right now: the real scored results after
  // submitting, or the preview fetched by "Lösung anzeigen" beforehand. Both
  // share the same shape, so every gap shows its full solution (correct
  // answer, translation, Warum) the same way regardless of which path
  // produced it — mirrors the Lesen T1/T2/T3 pattern exactly.
  const activeResults = scoreResults ?? previewResults;
  const revealed = !submitted && previewResults !== null;

  // Split passage by gap markers for rendering with interactive gaps
  const gapMap = new Map(gaps.map(g => [g.gap_number, g]));
  const passageParts = exercise.passage.split(/(\{\{\d+\}\})/);

  // Two-part correlative options (e.g. "zwar… aber", "nicht nur… sondern") occupy
  // TWO blanks that share the same gap number. Track which occurrence a token is so
  // we can show the matching half in each slot while the popover keeps ONE full option.
  const occurrenceCount: Record<number, number> = {};
  const splitOption = (text: string | null, occ: number): string | null => {
    if (!text) return text;
    const parts = text.split(/\s*(?:\.\.\.|…|-{2,}|—)\s*/);
    // Only a genuine two-part option (both halves non-empty) splits; a dashes-only
    // placeholder option like "----" must render verbatim.
    if (parts.length < 2 || parts.some((p) => p.trim() === "")) return text;
    return parts[occ] ?? text;
  };

  const renderedPassage = passageParts.map((part, idx) => {
    const m = part.match(/^\{\{(\d+)\}\}$/);
    if (!m) return <span key={idx}>{part}</span>;
    const gapNum = parseInt(m[1]);
    const gap = gapMap.get(gapNum);
    if (!gap) return <span key={idx}>[{gapNum}]</span>;
    const occ = occurrenceCount[gapNum] ?? 0;
    occurrenceCount[gapNum] = occ + 1;
    const key = `${gapNum}:${occ}`;
    const chosen = answers[gapNum];
    const result = activeResults?.find(r => r.gap_number === gapNum);
    const isSubmittedCorrect = submitted && !!result?.correct;
    const isSubmittedWrong = submitted && !!result && !result.correct;
    const hasSolution = !!result;
    const correctChoice = result?.correct_answer;
    const correctText = correctChoice
      ? (correctChoice === "a" ? gap.option_a : correctChoice === "b" ? gap.option_b : gap.option_c)
      : null;
    const revealWrong = revealed && !!chosen && chosen !== correctChoice;
    const locked = submitted || revealed;
    const chosenFull = chosen
      ? (chosen === "a" ? gap.option_a : chosen === "b" ? gap.option_b : gap.option_c)
      : null;
    const chosenText = splitOption(chosenFull, occ);
    const optionText = (locked && correctText) ? splitOption(correctText, occ) : chosenText;
    const isOpen = openKey === key;
    // Same "does this item have anything to show" gate EvidenceBlock itself
    // uses, so the gap never opens onto an empty popover.
    const gapExplanation = result?.correct ? result?.learning_aids?.explanation_correct : result?.learning_aids?.explanation_wrong;
    const hasAids = !examMode && hasSolution && !!result?.learning_aids &&
      !!(gapExplanation || result.learning_aids.evidence_text || result.learning_aids.grammar_structure || result.learning_aids.keyword);
    const clickable = !locked || hasAids;

    return (
      <span key={idx} className="relative inline-block">
        <button
          ref={(el) => { buttonRefs.current[key] = el as HTMLButtonElement; }}
          onClick={() => toggleKey(key)}
          disabled={!clickable}
          aria-haspopup={locked ? "dialog" : "listbox"}
          aria-expanded={isOpen}
          className={`relative inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium transition-all leading-normal ${
            submitted
              ? isSubmittedCorrect
                ? `border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ${hasAids ? "cursor-pointer hover:bg-emerald-500/15" : "cursor-default"}`
                : isSubmittedWrong
                  ? `border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 ${hasAids ? "cursor-pointer hover:bg-rose-500/15" : "cursor-default"}`
                  : "border-border bg-muted/30 text-muted-foreground cursor-default"
              : revealed
                ? `border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ${hasAids ? "cursor-pointer hover:bg-emerald-500/15" : "cursor-default"}`
                : isOpen
                  ? "border-primary bg-primary/8 text-primary"
                  : chosen
                    ? "border-primary/30 bg-primary/5 text-primary hover:border-primary/60"
                    : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          {optionText
            ? <span className="max-w-[160px] truncate font-semibold">{optionText}</span>
            : <span className="italic opacity-50 w-12 text-center text-[13px]">___</span>
          }
          {revealWrong && chosenText && (
            <span className="text-[11px] text-rose-500 line-through opacity-70 max-w-[80px] truncate">{chosenText}</span>
          )}
          {!locked && <ChevronDown className={`h-2.5 w-2.5 opacity-40 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
          {((submitted && isSubmittedCorrect) || (revealed && correctText)) && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
          {submitted && isSubmittedWrong && <XCircle className="h-3 w-3 text-rose-500 shrink-0" />}
          {hasAids && (
            <span className="ml-0.5 flex items-center gap-0.5 rounded-full bg-violet-500/15 px-1 py-0.5 text-[9px] font-black text-violet-600 dark:text-violet-300">
              <HelpCircle className="h-2.5 w-2.5" /> Warum?
            </span>
          )}
        </button>
        {isOpen && !locked && (
          <GapPopover
            gap={gap}
            current={chosen ?? ""}
            onSelect={(k) => selectAnswer(gapNum, k)}
            onClose={() => setOpenKey(null)}
            anchorEl={buttonRefs.current[key]}
          />
        )}
        {isOpen && hasAids && result && (
          <AnchoredEvidencePopover
            aids={result.learning_aids}
            variant={result.correct ? "correct" : "wrong"}
            skill="sprachbausteine"
            exerciseId={exercise.id}
            itemKey={String(result.gap_number)}
            saveCategory="grammatikstruktur"
            yourAnswerText={submitted ? gapOptionText(gap, result.your_answer) : null}
            correctAnswerText={gapOptionText(gap, result.correct_answer)}
            onClose={() => setOpenKey(null)}
            anchorEl={buttonRefs.current[key]}
          />
        )}
      </span>
    );
  });

  async function handleSubmit() {
    setScoring(true);
    setOpenKey(null);
    try {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(answers)) payload[k] = v;

      const { data, error } = await (supabase as any).rpc("score_sb_t1", {
        p_exercise_id: exercise.id,
        p_answers: payload,
      });
      if (error) throw error;

      const res = data as unknown as { score: number; total: number; results: ScoreResult[] };
      setScoreResults(res.results);
      setScoreCount(res.score);
      setScoreTotal(res.total);
      setSubmitted(true);
      setPreviewResults(null);
      onComplete?.(res.score, res.total);
    } catch (e) {
      console.error("Scoring error:", e);
      setSubmitted(true);
    } finally {
      setScoring(false);
    }
  }

  async function toggleSolutionPreview() {
    if (previewResults) { setPreviewResults(null); return; }
    setLoadingPreview(true);
    setOpenKey(null);
    try {
      const { data, error } = await (supabase as any).rpc("score_sb_t1", {
        p_exercise_id: exercise.id,
        p_answers: {},
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

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setOpenKey(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
    setPreviewResults(null);
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === gaps.length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-foreground mb-1">Aufgabe</p>
          {!examMode && <TranslateButton translation={translation?.text} loading={translationLoading} onRequest={loadTranslation} />}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lesen Sie den Text. Klicken Sie auf eine Lücke und wählen Sie das richtige Wort (a, b oder c).
          Jede Lücke hat genau eine richtige Antwort.
        </p>
      </div>

      {/* Text with inline gaps — whitespace-pre-line preserves the PDF's paragraph
          and line breaks exactly (never merge/split paragraphs). */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-sm text-foreground leading-[2] select-text whitespace-pre-line">
          {renderedPassage}
        </div>
      </div>

      {(submitted || revealed) && !examMode && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Tippen Sie auf eine Lücke mit „Warum?", um die Erklärung zu sehen.
        </p>
      )}

      {/* Footer — exam mode has no self-scoring/reveal/reset, the parent owns save/submit */}
      {examMode ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{answeredCount} / {gaps.length} beantwortet</p>
        </div>
      ) : !submitted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {revealed ? "Lösung wird angezeigt" : `${answeredCount} / ${gaps.length} beantwortet`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSolutionPreview}
              disabled={loadingPreview}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-500/10 disabled:opacity-40 flex items-center gap-2"
            >
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : previewResults ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
          <p className="text-3xl font-black text-foreground">{scoreCount} / {scoreTotal}</p>
          <p className="text-sm text-muted-foreground">
            {scoreCount === scoreTotal ? "Perfekt! Alle Lücken korrekt ausgefüllt."
            : scoreCount >= 8 ? "Sehr gut! Fast perfekt."
            : scoreCount >= 6 ? "Gut. Weiter üben!"
            : "Noch etwas Übung nötig — nicht aufgeben!"}
          </p>
          <button onClick={reset}
            className="rounded-xl border border-border bg-muted px-5 py-2 text-sm font-medium hover:bg-muted/70 transition-colors flex items-center gap-2 mx-auto">
            <RotateCcw className="h-3.5 w-3.5" /> Nochmal versuchen
          </button>
        </div>
      )}
    </div>
  );
}

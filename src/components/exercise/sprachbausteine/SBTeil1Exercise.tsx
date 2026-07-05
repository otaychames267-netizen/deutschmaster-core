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
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, ChevronDown, Loader2, RotateCcw, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
}

interface Props {
  exercise: SBT1ExerciseData;
  onComplete?: (score: number, total: number) => void;
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

// ── Main component ─────────────────────────────────────────────────────────────

export function SBTeil1Exercise({ exercise, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [openGap, setOpenGap] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreCount, setScoreCount] = useState(0);
  const [scoreTotal, setScoreTotal] = useState(0);
  // "Lösung anzeigen" (practice/study mode): reveal correct answers without grading.
  // Correct answers are fetched securely via the scoring RPC with empty answers —
  // they are never present in the student data load.
  const [solution, setSolution] = useState<Record<number, string> | null>(null);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const gaps = [...exercise.gaps].sort((a, b) => a.gap_number - b.gap_number);

  const selectAnswer = useCallback((gapNum: number, choice: "a" | "b" | "c") => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [gapNum]: choice }));
  }, [submitted]);

  function toggleGap(gapNum: number) {
    setOpenGap(prev => prev === gapNum ? null : gapNum);
  }

  // Close popover on outside click
  useEffect(() => {
    if (openGap === null) return;
    function handler(e: MouseEvent) {
      const btn = buttonRefs.current[openGap!];
      if (btn && btn.contains(e.target as Node)) return;
      // Check if click is inside any popover
      const popovers = document.querySelectorAll('[role="listbox"]');
      for (const pop of popovers) {
        if (pop.contains(e.target as Node)) return;
      }
      setOpenGap(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openGap]);

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
    const chosen = answers[gapNum];
    const result = scoreResults?.find(r => r.gap_number === gapNum);
    const isCorrect = submitted && !!result?.correct;
    const isWrong = submitted && !!result && !result.correct;
    // Reveal mode ("Lösung anzeigen"): show the official correct answer without grading.
    const revealed = solution !== null && !submitted;
    const correctChoice = revealed ? solution![gapNum] : undefined;
    const correctText = correctChoice
      ? (correctChoice === "a" ? gap.option_a : correctChoice === "b" ? gap.option_b : gap.option_c)
      : null;
    const revealWrong = revealed && !!chosen && chosen !== correctChoice;
    const locked = submitted || revealed;
    const chosenFull = chosen
      ? (chosen === "a" ? gap.option_a : chosen === "b" ? gap.option_b : gap.option_c)
      : null;
    const chosenText = splitOption(chosenFull, occ);
    const optionText = revealed ? splitOption(correctText, occ) : chosenText;
    const isOpen = openGap === gapNum;

    return (
      <span key={idx} className="relative inline-block">
        <button
          ref={(el) => { buttonRefs.current[gapNum] = el as HTMLButtonElement; }}
          onClick={() => toggleGap(gapNum)}
          disabled={locked}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`relative inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium transition-all leading-normal ${
            submitted
              ? isCorrect
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-default"
                : isWrong
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 cursor-default"
                  : "border-border bg-muted/30 text-muted-foreground cursor-default"
              : revealed
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-default"
                : isOpen
                  ? "border-primary bg-primary/8 text-primary"
                  : chosen
                    ? "border-primary/30 bg-primary/5 text-primary hover:border-primary/60"
                    : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          {optionText
            ? <span className="max-w-[160px] truncate">{optionText}</span>
            : <span className="italic opacity-50 w-12 text-center text-[13px]">___</span>
          }
          {revealWrong && chosenText && (
            <span className="text-[11px] text-rose-500 line-through opacity-70 max-w-[80px] truncate">{chosenText}</span>
          )}
          {!locked && <ChevronDown className={`h-2.5 w-2.5 opacity-40 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
          {((submitted && isCorrect) || revealed) && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
          {submitted && isWrong && <XCircle className="h-3 w-3 text-rose-500 shrink-0" />}
        </button>
        {isOpen && !locked && (
          <GapPopover
            gap={gap}
            current={chosen ?? ""}
            onSelect={(k) => selectAnswer(gapNum, k)}
            onClose={() => setOpenGap(null)}
            anchorEl={buttonRefs.current[gapNum]}
          />
        )}
      </span>
    );
  });

  async function handleSubmit() {
    setScoring(true);
    setOpenGap(null);
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
      onComplete?.(res.score, res.total);
    } catch (e) {
      console.error("Scoring error:", e);
      setSubmitted(true);
    } finally {
      setScoring(false);
    }
  }

  async function showSolution() {
    if (solution) { setSolution(null); return; } // toggle off
    setLoadingSolution(true);
    setOpenGap(null);
    try {
      const { data, error } = await (supabase as any).rpc("score_sb_t1", {
        p_exercise_id: exercise.id,
        p_answers: {},
      });
      if (error) throw error;
      const res = data as unknown as { results: ScoreResult[] };
      const map: Record<number, string> = {};
      for (const r of res.results) map[r.gap_number] = r.correct_answer;
      setSolution(map);
    } catch (e) {
      console.error("Lösung konnte nicht geladen werden:", e);
    } finally {
      setLoadingSolution(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setOpenGap(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
    setSolution(null);
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === gaps.length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-1">Aufgabe</p>
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

      {/* Correction view */}
      {submitted && scoreResults && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Auswertung</p>
          </div>
          <div className="divide-y divide-border/50">
            {scoreResults.map(r => {
              const gap = gapMap.get(r.gap_number)!;
              const chosenText = r.your_answer
                ? (r.your_answer === "a" ? gap?.option_a : r.your_answer === "b" ? gap?.option_b : gap?.option_c) ?? r.your_answer
                : "—";
              const correctText = r.correct_answer
                ? (r.correct_answer === "a" ? gap?.option_a : r.correct_answer === "b" ? gap?.option_b : gap?.option_c) ?? r.correct_answer
                : "—";
              return (
                <div key={r.gap_number} className={`flex items-center gap-3 px-5 py-2.5 ${r.correct ? "bg-emerald-500/3" : "bg-rose-500/3"}`}>
                  <span className="shrink-0 w-6 text-xs font-black text-muted-foreground text-center">{r.gap_number}</span>
                  {r.correct
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  }
                  <span className={`flex-1 text-sm ${r.correct ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-rose-700 dark:text-rose-300"}`}>
                    {r.correct ? chosenText : (
                      <><span className="line-through opacity-60">{chosenText}</span> → <span className="font-semibold">{correctText}</span></>
                    )}
                  </span>
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                    r.correct ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  }`}>
                    {r.your_answer?.toUpperCase() || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {!submitted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {solution ? "Lösung wird angezeigt" : `${answeredCount} / ${gaps.length} beantwortet`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={showSolution}
              disabled={loadingSolution}
              className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/70 transition-colors flex items-center gap-2 disabled:opacity-40"
            >
              {loadingSolution ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
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

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
import { CheckCircle2, XCircle, ChevronDown, Loader2, RotateCcw } from "lucide-react";
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

// ── Render passage with interactive gap buttons ────────────────────────────────

interface PassageProps {
  passage: string;
  gaps: SBT1Gap[];
  answers: Record<number, string>;
  submitted: boolean;
  scoreResults: ScoreResult[] | null;
  openGap: number | null;
  buttonRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
  onToggle: (gapNumber: number) => void;
}

function PassageWithGaps({
  passage, gaps, answers, submitted, scoreResults, openGap, buttonRefs, onToggle
}: PassageProps) {
  const gapMap = new Map(gaps.map(g => [g.gap_number, g]));

  // Split passage by gap markers {{N}}
  const parts = passage.split(/(\{\{(\d+)\}\})/g);

  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    const match = part.match(/^\{\{(\d+)\}\}$/);
    if (match) {
      const gapNum = parseInt(match[1]);
      const gap = gapMap.get(gapNum);
      const chosen = answers[gapNum];
      const result = scoreResults?.find(r => r.gap_number === gapNum);
      const isCorrect = submitted && !!result?.correct;
      const isWrong = submitted && !!result && !result.correct;

      const optionText = gap && chosen
        ? (chosen === "a" ? gap.option_a : chosen === "b" ? gap.option_b : gap.option_c)
        : null;

      nodes.push(
        <span key={`gap-${gapNum}`} className="relative inline-block">
          <button
            ref={(el) => { buttonRefs.current[gapNum] = el; }}
            onClick={() => !submitted && onToggle(gapNum)}
            disabled={submitted}
            className={`relative inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium transition-all ${
              submitted
                ? isCorrect
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-default"
                  : isWrong
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 cursor-default"
                    : "border-border bg-muted/30 text-muted-foreground cursor-default"
                : chosen
                  ? openGap === gapNum
                    ? "border-primary bg-primary/8 text-primary"
                    : "border-primary/30 bg-primary/5 text-primary"
                  : openGap === gapNum
                    ? "border-primary bg-muted text-foreground"
                    : "border-dashed border-muted-foreground/40 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <span className="text-[10px] font-black text-muted-foreground mr-0.5">{gapNum}</span>
            {optionText
              ? <span>{optionText}</span>
              : <span className="italic opacity-60 min-w-[40px] text-center">___</span>
            }
            {!submitted && <ChevronDown className={`h-2.5 w-2.5 opacity-60 transition-transform ${openGap === gapNum ? "rotate-180" : ""}`} />}
            {submitted && isCorrect && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            {submitted && isWrong && <XCircle className="h-3 w-3 text-rose-500" />}
          </button>
          {openGap === gapNum && !submitted && gap && (
            <GapPopover
              gap={gap}
              current={chosen ?? ""}
              onSelect={() => {}}
              onClose={() => {}}
              anchorEl={buttonRefs.current[gapNum]}
            />
          )}
        </span>
      );
    } else if (part && !parts[i - 1]?.match(/^\{\{(\d+)\}\}$/)) {
      nodes.push(<span key={`text-${i}`}>{part}</span>);
    } else if (part && !match) {
      nodes.push(<span key={`text-${i}`}>{part}</span>);
    }
    i++;
  }

  return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{nodes}</p>;
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

  const renderedPassage = passageParts.map((part, idx) => {
    const m = part.match(/^\{\{(\d+)\}\}$/);
    if (!m) return <span key={idx}>{part}</span>;
    const gapNum = parseInt(m[1]);
    const gap = gapMap.get(gapNum);
    if (!gap) return <span key={idx}>[{gapNum}]</span>;
    const chosen = answers[gapNum];
    const result = scoreResults?.find(r => r.gap_number === gapNum);
    const isCorrect = submitted && !!result?.correct;
    const isWrong = submitted && !!result && !result.correct;
    const optionText = chosen
      ? (chosen === "a" ? gap.option_a : chosen === "b" ? gap.option_b : gap.option_c)
      : null;
    const isOpen = openGap === gapNum;

    return (
      <span key={idx} className="relative inline-block">
        <button
          ref={(el) => { buttonRefs.current[gapNum] = el as HTMLButtonElement; }}
          onClick={() => toggleGap(gapNum)}
          disabled={submitted}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`relative inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md border text-sm font-medium transition-all leading-normal ${
            submitted
              ? isCorrect
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 cursor-default"
                : isWrong
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 cursor-default"
                  : "border-border bg-muted/30 text-muted-foreground cursor-default"
              : isOpen
                ? "border-primary bg-primary/8 text-primary"
                : chosen
                  ? "border-primary/30 bg-primary/5 text-primary hover:border-primary/60"
                  : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          <span className="text-[10px] font-black opacity-50">{gapNum}</span>
          {optionText
            ? <span className="max-w-[120px] truncate">{optionText}</span>
            : <span className="italic opacity-50 w-12 text-center text-[13px]">___</span>
          }
          {!submitted && <ChevronDown className={`h-2.5 w-2.5 opacity-40 transition-transform ${isOpen ? "rotate-180" : ""}`} />}
          {submitted && isCorrect && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
          {submitted && isWrong && <XCircle className="h-3 w-3 text-rose-500 shrink-0" />}
        </button>
        {isOpen && !submitted && (
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

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setOpenGap(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
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

      {/* Text with inline gaps */}
      <div className="rounded-2xl border border-border bg-card p-6">
        {exercise.title && (
          <p className="text-base font-bold text-foreground mb-4">{exercise.title}</p>
        )}
        <div className="text-sm text-foreground leading-[2] select-text">
          {renderedPassage}
        </div>
      </div>

      {/* Options legend (visible while solving) */}
      {!submitted && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Auswahlmöglichkeiten</p>
          <div className="space-y-2">
            {gaps.map(gap => {
              const chosen = answers[gap.gap_number];
              return (
                <div key={gap.gap_number} className="flex items-start gap-3 text-xs">
                  <span className={`shrink-0 w-6 text-center font-bold ${chosen ? "text-primary" : "text-muted-foreground"}`}>
                    {gap.gap_number}
                  </span>
                  {(["a","b","c"] as const).map(k => {
                    const text = k === "a" ? gap.option_a : k === "b" ? gap.option_b : gap.option_c;
                    const isChosen = chosen === k;
                    return (
                      <button
                        key={k}
                        onClick={() => selectAnswer(gap.gap_number, k)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-all ${
                          isChosen
                            ? "border-primary/40 bg-primary/8 text-primary font-semibold"
                            : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <span className={`font-black text-[10px] ${isChosen ? "text-primary" : "text-muted-foreground"}`}>
                          {k.toUpperCase()}
                        </span>
                        <span>{text}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{answeredCount} / {gaps.length} beantwortet</p>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || scoring}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2"
          >
            {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
            Auswertung
          </button>
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

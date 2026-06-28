/**
 * Lesen Teil 3 — Situationen + Anzeigen (A–L)
 *
 * Security: `correct_letter` and `no_match` are NEVER in the component's data.
 * Scoring is done server-side via supabase.rpc("score_lesen_t3").
 * The correct answer is revealed only when the student clicks "Lösung zeigen"
 * — and only after submission.
 */
import { useState, useRef, useEffect } from "react";
import { CheckCircle2, XCircle, BookOpen, ChevronDown, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
}

interface Props {
  exercise: T3ExerciseData;
  onComplete?: (score: number, total: number) => void;
}

type AnswerState = { selected: string; revealed: boolean };

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
  const [answers, setAnswers]   = useState<Record<number, AnswerState>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring]   = useState(false);
  const [openPopup, setOpenPopup] = useState<number | null>(null);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreCount, setScoreCount]     = useState(0);
  const [scoreTotal, setScoreTotal]     = useState(0);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const situations = [...exercise.situations].sort((a, b) => a.number - b.number);
  const texts      = [...exercise.texts].sort((a, b) => a.letter.localeCompare(b.letter));

  function selectAnswer(num: number, value: string) {
    setAnswers(prev => ({ ...prev, [num]: { selected: value, revealed: false } }));
  }

  function reveal(num: number) {
    setAnswers(prev => ({ ...prev, [num]: { ...prev[num], revealed: true } }));
  }

  async function handleSubmit() {
    setScoring(true);
    setOpenPopup(null);
    try {
      const payload: Record<string, string> = {};
      for (const s of situations) {
        if (answers[s.number]?.selected) {
          const v = answers[s.number].selected;
          payload[String(s.number)] = v === "X" ? "0" : v;
        }
      }

      const { data, error } = await (supabase as any).rpc("score_lesen_t3", {
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
      setSubmitted(true);
    } finally {
      setScoring(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setOpenPopup(null);
    setScoreResults(null);
    setScoreCount(0);
    setScoreTotal(0);
  }

  function adTitle(letter: string): string {
    if (letter === "X" || letter === "0") return "Keine passende Anzeige";
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

  const answeredCount = situations.filter(s => !!answers[s.number]?.selected).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-1">Aufgabe</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lesen Sie die Situationen 11–20 und die Anzeigen A–L.
          Für welche Situation ist welche Anzeige geeignet? Für zwei Situationen gibt es keine passende Anzeige — wählen Sie dann <strong>X</strong>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Situations */}
        <div className="space-y-2.5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Situationen</p>
          {situations.map((sit) => {
            const ans       = answers[sit.number];
            const result    = scoreResults?.find(r => r.number === sit.number);
            const isCorrect = submitted && !!result?.correct;
            const isWrong   = submitted && !!result && !result.correct;
            const isOpen    = openPopup === sit.number;

            return (
              <div key={sit.number} className="relative">
                <div className={`rounded-2xl border overflow-hidden transition-colors ${
                  isCorrect ? "border-emerald-500/40 bg-emerald-500/3"
                  : isWrong  ? "border-rose-500/40 bg-rose-500/3"
                  : "border-border bg-card"
                }`}>
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                      {sit.number}
                    </span>
                    <p className="flex-1 text-sm text-foreground leading-snug">{sit.description}</p>

                    {!submitted ? (
                      <button
                        ref={(el) => { buttonRefs.current[sit.number] = el; }}
                        onClick={() => setOpenPopup(isOpen ? null : sit.number)}
                        aria-haspopup="listbox"
                        aria-expanded={isOpen}
                        className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all max-w-[130px] ${
                          ans?.selected
                            ? "border-primary/30 bg-primary/8 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate">
                          {ans?.selected ? selectedLabel(ans.selected) : "—"}
                        </span>
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    ) : (
                      <span className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-xl text-xs font-black ${
                        isCorrect ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}>
                        {ans?.selected ?? "—"}
                      </span>
                    )}
                  </div>

                  {submitted && ans?.selected && result && (
                    <div className={`flex items-center justify-between border-t border-border/50 px-4 py-2 ${
                      isCorrect ? "bg-emerald-500/5" : "bg-rose-500/5"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isCorrect
                          ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Richtig</span></>
                          : <><XCircle className="h-3.5 w-3.5 text-rose-500" /><span className="text-xs font-bold text-rose-600 dark:text-rose-400">Falsch</span></>
                        }
                      </div>
                      {isWrong && !ans.revealed && (
                        <button onClick={() => reveal(sit.number)}
                          className="flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
                          <BookOpen className="h-3 w-3" /> Lösung zeigen
                        </button>
                      )}
                      {isWrong && ans.revealed && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Richtig: {correctDisplay(result.correct_answer)} — {adTitle(result.correct_answer)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isOpen && !submitted && (
                  <AdPicker
                    texts={texts}
                    current={ans?.selected ?? ""}
                    onSelect={(v) => selectAnswer(sit.number, v)}
                    onClose={() => setOpenPopup(null)}
                    anchorEl={buttonRefs.current[sit.number]}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Advertisement texts A–L */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Anzeigen A–L</p>
          {texts.map((text) => (
            <div key={text.letter} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-border bg-muted/20 px-4 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">
                  {text.letter}
                </span>
                {text.title && (
                  <p className="text-xs font-bold text-foreground truncate">{text.title}</p>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-foreground leading-relaxed">{text.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!submitted ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{answeredCount} / {situations.length} beantwortet</p>
          <button onClick={handleSubmit} disabled={answeredCount < situations.length || scoring}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2">
            {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
            Auswertung
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-3xl font-black text-foreground">{scoreCount} / {scoreTotal}</p>
          <p className="text-sm text-muted-foreground">
            {scoreCount === scoreTotal ? "Perfekt! Alle Situationen richtig zugeordnet."
            : scoreCount >= 8 ? "Sehr gut! Fast perfekt."
            : scoreCount >= 6 ? "Gut. Noch etwas üben."
            : "Weiter üben — die Anzeigen aufmerksam lesen hilft!"}
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

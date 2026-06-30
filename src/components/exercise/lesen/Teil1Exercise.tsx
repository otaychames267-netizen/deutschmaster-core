/**
 * Lesen Teil 1 — Schlagzeilen zuordnen
 *
 * Security: `correct_headline` is NEVER in the component's data.
 * Scoring is done server-side via supabase.rpc("score_lesen_t1").
 * The correct headline is revealed only when the student clicks "Lösung zeigen"
 * — and only after submission.
 */
import { useState, useRef, useEffect } from "react";
import { CheckCircle2, XCircle, BookOpen, ChevronDown, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface T1Headline {
  letter: string;
  text: string;
  is_distractor: boolean;
}

export interface T1Text {
  position: number;
  title: string;
  content: string;
}

export interface T1ExerciseData {
  id: string;
  title: string;
  headlines: T1Headline[];
  texts: T1Text[];
}

interface ScoreResult {
  position: number;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
}

interface Props {
  exercise: T1ExerciseData;
  onComplete?: (score: number, total: number) => void;
}

type AnswerState = { selected: string; revealed: boolean };

// ── Headline picker popup ─────────────────────────────────────────────────────

interface HeadlinePickerProps {
  headlines: T1Headline[];
  current: string;
  /** Letters already chosen by OTHER texts — hidden here (each headline used once). */
  disabledLetters: Set<string>;
  onSelect: (letter: string) => void;
  onClose: () => void;
  anchorEl: HTMLButtonElement | null;
}

function HeadlinePicker({ headlines, current, disabledLetters, onSelect, onClose, anchorEl }: HeadlinePickerProps) {
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

  // Each headline may be used only once: hide letters chosen by other texts,
  // but always keep this text's own current selection visible.
  const sorted = [...headlines]
    .sort((a, b) => a.letter.localeCompare(b.letter))
    .filter((h) => h.letter === current || !disabledLetters.has(h.letter));

  return (
    <div
      ref={popRef}
      role="listbox"
      className="absolute z-50 top-full left-0 mt-2 w-[340px] max-w-[90vw] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Schlagzeile wählen</p>
        <button onClick={onClose} className="rounded-lg p-0.5 hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto divide-y divide-border/50">
        {sorted.map((h) => {
          const isSelected = current === h.letter;
          return (
            <button
              key={h.letter}
              role="option"
              aria-selected={isSelected}
              onClick={() => { onSelect(h.letter); onClose(); }}
              className={`w-full flex items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${
                isSelected ? "bg-blue-500/8" : ""
              }`}
            >
              <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${
                isSelected
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-muted text-muted-foreground"
              }`}>
                {h.letter}
              </span>
              <span className={`leading-snug ${isSelected ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-foreground"}`}>
                {h.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Teil1Exercise({ exercise, onComplete }: Props) {
  const [answers, setAnswers]   = useState<Record<number, AnswerState>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring]   = useState(false);
  const [openPopup, setOpenPopup] = useState<number | null>(null);
  const [scoreResults, setScoreResults] = useState<ScoreResult[] | null>(null);
  const [scoreCount, setScoreCount]     = useState(0);
  const [scoreTotal, setScoreTotal]     = useState(0);
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const texts     = [...exercise.texts].sort((a, b) => a.position - b.position);
  const headlines = [...exercise.headlines].sort((a, b) => a.letter.localeCompare(b.letter));

  function select(position: number, letter: string) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [position]: { selected: letter, revealed: false } }));
  }

  function reveal(position: number) {
    setAnswers(prev => ({ ...prev, [position]: { ...prev[position], revealed: true } }));
  }

  async function handleSubmit() {
    setScoring(true);
    setOpenPopup(null);
    try {
      const payload: Record<string, string> = {};
      for (const t of texts) {
        if (answers[t.position]?.selected) payload[String(t.position)] = answers[t.position].selected;
      }

      const { data, error } = await (supabase as any).rpc("score_lesen_t1", {
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

  function headlineText(letter: string) {
    return exercise.headlines.find(h => h.letter === letter)?.text ?? letter;
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-1">Aufgabe</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lesen Sie die Texte 1–5 und die Schlagzeilen A–J. Welche Schlagzeile passt zu welchem Text?
          Für jeden Text gibt es nur eine richtige Schlagzeile. Fünf Schlagzeilen bleiben übrig.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Schlagzeilen A–J</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-0">
          {headlines.map((h, i) => (
            <div key={h.letter}
              className={`flex items-start gap-3 px-5 py-3 ${
                i % 2 !== 0 ? "sm:border-l border-border" : ""
              } ${i >= 2 ? "border-t border-border" : ""}`}>
              <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">
                {h.letter}
              </span>
              <p className="text-sm text-foreground leading-snug">{h.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {texts.map((text) => {
          const ans       = answers[text.position];
          const result    = scoreResults?.find(r => r.position === text.position);
          const isCorrect = submitted && !!result?.correct;
          const isWrong   = submitted && !!result && !result.correct;
          const isOpen    = openPopup === text.position;

          return (
            <div key={text.position} className="relative">
              <div className={`rounded-2xl border overflow-hidden transition-colors ${
                isCorrect ? "border-emerald-500/40" : isWrong ? "border-rose-500/40" : "border-border"
              } bg-card`}>

                <div className="flex items-center gap-3 border-b border-border bg-muted/15 px-5 py-3">
                  <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                    {text.position}
                  </span>
                  {text.title
                    ? <span className="text-sm font-semibold text-foreground flex-1 truncate">{text.title}</span>
                    : <span className="flex-1" />
                  }

                  {!submitted ? (
                    <button
                      ref={(el) => { buttonRefs.current[text.position] = el; }}
                      onClick={() => setOpenPopup(isOpen ? null : text.position)}
                      aria-haspopup="listbox"
                      aria-expanded={isOpen}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all ${
                        ans?.selected
                          ? "border-primary/30 bg-primary/8 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {ans?.selected
                        ? <span className="font-black text-sm">{ans.selected}</span>
                        : "Schlagzeile wählen"
                      }
                      <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <span className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold ${
                      isCorrect
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}>
                      {ans?.selected ?? "—"}
                    </span>
                  )}
                </div>

                <div className="px-5 py-4">
                  <p className="text-sm text-foreground leading-relaxed">{text.content}</p>
                </div>

                {submitted && ans?.selected && result && (
                  <div className={`flex items-center justify-between border-t border-border px-5 py-2.5 ${
                    isCorrect ? "bg-emerald-500/5" : "bg-rose-500/5"
                  }`}>
                    <div className="flex items-center gap-2">
                      {isCorrect
                        ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Richtig</span></>
                        : <><XCircle className="h-4 w-4 text-rose-500" /><span className="text-xs font-bold text-rose-600 dark:text-rose-400">Falsch</span></>
                      }
                    </div>
                    <div className="flex items-center gap-3">
                      {isWrong && !ans.revealed && (
                        <button onClick={() => reveal(text.position)}
                          className="flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
                          <BookOpen className="h-3 w-3" /> Lösung zeigen
                        </button>
                      )}
                      {isWrong && ans.revealed && (
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Richtig: {result.correct_answer} — {headlineText(result.correct_answer)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isOpen && !submitted && (
                <HeadlinePicker
                  headlines={headlines}
                  current={ans?.selected ?? ""}
                  disabledLetters={new Set(
                    Object.entries(answers)
                      .filter(([pos]) => Number(pos) !== text.position)
                      .map(([, a]) => a.selected)
                      .filter(Boolean),
                  )}
                  onSelect={(letter) => select(text.position, letter)}
                  onClose={() => setOpenPopup(null)}
                  anchorEl={buttonRefs.current[text.position]}
                />
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">{answeredCount} / {texts.length} beantwortet</p>
          <button onClick={handleSubmit} disabled={answeredCount < texts.length || scoring}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2">
            {scoring && <Loader2 className="h-4 w-4 animate-spin" />}
            Auswertung
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-3xl font-black text-foreground">{scoreCount} / {scoreTotal}</p>
          <p className="text-sm text-muted-foreground">
            {scoreCount === scoreTotal ? "Perfekt! Alle Schlagzeilen korrekt zugeordnet."
            : scoreCount >= 4 ? "Sehr gut! Fast perfekt."
            : scoreCount >= 3 ? "Gut. Weiter üben!"
            : "Noch etwas Übung nötig — nicht aufgeben!"}
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

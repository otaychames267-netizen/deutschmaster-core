/**
 * Lesen Teil 1 — Schlagzeilen zuordnen (TELC-faithful UI).
 *
 * Each of the 5 texts has its own answer field ABOVE the text. Clicking it opens
 * a dropdown listing the 10 headlines as "Letter + full headline". After picking,
 * the field shows the chosen headline; each headline can be used only once (a
 * used letter is hidden from the other fields, released when changed).
 *
 * Security: correct_headline is NEVER in the client data. Scoring + saving runs
 * server-side via score_and_save_lesen_t1 (records the attempt in lesen_attempts
 * for History/Statistics). Progress autosaves and resumes after a refresh.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, X, Loader2, AlertCircle, RotateCcw, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { attemptKey, loadAttempt, saveAttempt, clearAttempt } from "@/lib/practice/attempt-storage";

export interface T1Headline { letter: string; text: string; is_distractor: boolean; }
export interface T1Text { position: number; title: string; content: string; }
export interface T1ExerciseData { id: string; title: string; headlines: T1Headline[]; texts: T1Text[]; }

interface ScoreResult { position: number; correct: boolean; your_answer: string; correct_answer: string; }
interface Props { exercise: T1ExerciseData; onComplete?: (score: number, total: number) => void; }
interface Persisted { exerciseId: string; answers: Record<number, string>; submitted: boolean; results: ScoreResult[] | null; score: number; total: number; }

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

// ── Dropdown: full headlines, used ones hidden ───────────────────────────────
function Picker({ headlines, current, disabled, onSelect, onClose, anchor }: {
  headlines: T1Headline[]; current: string; disabled: Set<string>;
  onSelect: (l: string) => void; onClose: () => void; anchor: HTMLButtonElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node) && anchor && !anchor.contains(e.target as Node)) onClose(); }
    function k(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [onClose, anchor]);
  const list = [...headlines].sort((a, b) => a.letter.localeCompare(b.letter)).filter((h) => h.letter === current || !disabled.has(h.letter));
  return (
    <div ref={ref} role="listbox"
      className="absolute z-50 top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Schlagzeile wählen</p>
        <button onClick={onClose} className={`rounded-lg p-0.5 hover:bg-muted ${FOCUS}`}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
      </div>
      <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
        {list.map((h) => {
          const sel = current === h.letter;
          return (
            <button key={h.letter} role="option" aria-selected={sel} onClick={() => { onSelect(h.letter); onClose(); }}
              className={`w-full flex items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${sel ? "bg-blue-500/8" : ""} ${FOCUS}`}>
              <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${sel ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30" : "bg-muted text-muted-foreground"}`}>{h.letter}</span>
              <span className={`leading-snug ${sel ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-foreground"}`}>{h.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Teil1Exercise({ exercise, onComplete }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [results, setResults] = useState<ScoreResult[] | null>(null);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [restored, setRestored] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const hydrated = useRef(false);

  const storageKey = useMemo(() => attemptKey(["lesen.t1", user?.id ?? "anon", exercise.id]), [user?.id, exercise.id]);
  const texts = useMemo(() => [...exercise.texts].sort((a, b) => a.position - b.position), [exercise.texts]);
  const headlineText = (l: string) => exercise.headlines.find((h) => h.letter === l)?.text ?? "";

  // resume + autosave
  useEffect(() => {
    if (hydrated.current || authLoading) return;
    const s = loadAttempt<Persisted>(storageKey);
    if (s && s.exerciseId === exercise.id) {
      setAnswers(s.answers ?? {}); setSubmitted(!!s.submitted); setResults(s.results ?? null);
      setScore(s.score ?? 0); setTotal(s.total ?? 0);
      if (s.submitted || Object.keys(s.answers ?? {}).length) setRestored(true);
    }
    hydrated.current = true;
  }, [authLoading, storageKey, exercise.id]);
  useEffect(() => {
    if (!hydrated.current) return;
    if (!submitted && Object.keys(answers).length === 0) { clearAttempt(storageKey); return; }
    saveAttempt<Persisted>(storageKey, { exerciseId: exercise.id, answers, submitted, results, score, total });
  }, [answers, submitted, results, score, total, storageKey, exercise.id]);

  function select(pos: number, letter: string) { if (!submitted) setAnswers((p) => ({ ...p, [pos]: letter })); }
  function reset() { setAnswers({}); setSubmitted(false); setResults(null); setScore(0); setTotal(0); setRevealed(false); setRestored(false); setOpen(null); clearAttempt(storageKey); }

  async function handleSubmit() {
    setScoring(true); setScoreError(null); setOpen(null);
    try {
      const payload: Record<string, string> = {};
      for (const t of texts) if (answers[t.position]) payload[String(t.position)] = answers[t.position];
      const { data, error } = await (supabase as any).rpc("score_and_save_lesen_t1", { p_exercise_id: exercise.id, p_answers: payload });
      if (error) throw error;
      const r = data as { score: number; total: number; results: ScoreResult[] };
      setResults(r.results); setScore(r.score); setTotal(r.total); setSubmitted(true); setRestored(false);
      onComplete?.(r.score, r.total);
    } catch (e) {
      console.error("T1 scoring failed:", e);
      setScoreError("Die Auswertung ist fehlgeschlagen. Deine Antworten sind gespeichert — bitte versuche es erneut.");
    } finally { setScoring(false); }
  }

  const answeredCount = texts.filter((t) => answers[t.position]).length;
  const usedByOthers = (pos: number) => new Set(Object.entries(answers).filter(([p]) => +p !== pos).map(([, l]) => l).filter(Boolean));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold text-foreground mb-0.5">Schlagzeilen zuordnen</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lesen Sie die Texte 1–5. Wählen Sie über jedem Text die passende Schlagzeile (A–J). Jede Schlagzeile passt nur zu einem Text — fünf bleiben übrig.
        </p>
      </div>

      {restored && !submitted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-3">
          <div className="flex items-center gap-2.5"><RotateCcw className="h-4 w-4 shrink-0 text-blue-500" /><p className="text-xs font-medium text-blue-700 dark:text-blue-300">Dein Fortschritt wurde wiederhergestellt.</p></div>
          <button onClick={reset} className={`rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted ${FOCUS}`}>Neu beginnen</button>
        </div>
      )}

      {texts.map((t) => {
        const ans = answers[t.position];
        const res = results?.find((r) => r.position === t.position);
        const isCorrect = submitted && !!res?.correct;
        const isWrong = submitted && !!res && !res.correct;
        const isOpen = open === t.position;
        const fieldTone = isCorrect ? "border-emerald-500/50 bg-emerald-500/5" : isWrong ? "border-rose-500/50 bg-rose-500/5" : ans ? "border-primary/40 bg-primary/5" : "border-input bg-background hover:border-primary/40";
        return (
          <div key={t.position} className="relative rounded-2xl border border-border bg-card overflow-visible">
            {/* answer field ABOVE the text */}
            <div className="flex items-center gap-3 px-4 pt-4">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-black text-muted-foreground">{t.position}</span>
              <div className="relative flex-1">
                <button ref={(el) => { btnRefs.current[t.position] = el; }}
                  onClick={() => setOpen(isOpen ? null : t.position)} disabled={submitted}
                  aria-haspopup="listbox" aria-expanded={isOpen}
                  className={`w-full flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all disabled:cursor-default ${fieldTone} ${FOCUS}`}>
                  {ans ? (
                    <>
                      <span className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${isCorrect ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : isWrong ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-primary/15 text-primary"}`}>{ans}</span>
                      <span className="flex-1 truncate text-foreground">{headlineText(ans)}</span>
                    </>
                  ) : (
                    <span className="flex-1 text-muted-foreground">Schlagzeile wählen…</span>
                  )}
                  {!submitted && <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />}
                  {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                  {isWrong && <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}
                </button>
                {isOpen && !submitted && (
                  <Picker headlines={exercise.headlines} current={ans ?? ""} disabled={usedByOthers(t.position)}
                    onSelect={(l) => select(t.position, l)} onClose={() => setOpen(null)} anchor={btnRefs.current[t.position]} />
                )}
              </div>
            </div>
            {/* correct answer reveal */}
            {submitted && isWrong && revealed && (
              <div className="mx-4 mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300"><span className="font-black">{res!.correct_answer}</span> — {headlineText(res!.correct_answer)}</p>
              </div>
            )}
            {/* text */}
            <div className="px-5 py-4">
              {t.title && <p className="text-sm font-bold text-foreground mb-1">{t.title}</p>}
              <p className="text-sm text-foreground leading-[1.8] whitespace-pre-line">{t.content}</p>
            </div>
          </div>
        );
      })}

      {scoreError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1 space-y-2"><p className="text-sm text-rose-700 dark:text-rose-300">{scoreError}</p>
            <button onClick={handleSubmit} disabled={scoring} className={`inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 ${FOCUS}`}>{scoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Erneut auswerten</button>
          </div>
        </div>
      )}

      {!submitted ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex flex-col"><p className="text-sm text-muted-foreground">{answeredCount} / {texts.length} zugeordnet</p><p className="text-[11px] text-muted-foreground/70">Fortschritt wird automatisch gespeichert</p></div>
          <button onClick={handleSubmit} disabled={answeredCount < texts.length || scoring}
            className={`rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2 ${FOCUS}`}>
            {scoring && <Loader2 className="h-4 w-4 animate-spin" />}Auswertung
          </button>
        </div>
      ) : (
        <div aria-live="polite" className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-3xl font-black text-foreground">{score} / {total}</p>
          <p className="text-sm text-muted-foreground">{score === total ? "Perfekt! Alle Schlagzeilen korrekt zugeordnet." : score >= 4 ? "Sehr gut! Fast perfekt." : score >= 3 ? "Gut gemacht." : "Weiter üben — du schaffst es!"}</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {!revealed && score < total && (
              <button onClick={() => setRevealed(true)} className={`inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 ${FOCUS}`}><Eye className="h-4 w-4" />Lösung anzeigen</button>
            )}
            <button onClick={reset} className={`rounded-xl border border-border bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/70 ${FOCUS}`}>Nochmal versuchen</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock3, Check, X } from "lucide-react";

export type ExerciseDTO = {
  id: string;
  kind: "multiple_choice" | "true_false" | "matching" | "cloze" | "open_text";
  title: string;
  prompt: string;
  passage?: string | null;
  audio_id?: string | null;
  options: unknown;
  explanation?: string | null;
  module?: string;
  teil?: number;
};

export type GradedResult = {
  score: number;
  isCorrect: boolean;
  needsReview: boolean;
  correct?: unknown;
  explanation?: string | null;
};

export function ExerciseRunner({
  exercise,
  audioUrl,
  onSubmit,
  hideFeedback = false,
  initialAnswer,
}: {
  exercise: ExerciseDTO;
  audioUrl?: string | null;
  onSubmit: (answer: unknown, durationSeconds: number) => Promise<GradedResult | void>;
  hideFeedback?: boolean;
  initialAnswer?: unknown;
}) {
  const [answer, setAnswer] = useState<unknown>(initialAnswer ?? defaultAnswer(exercise));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradedResult | null>(null);
  const [startedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    setAnswer(initialAnswer ?? defaultAnswer(exercise));
    setResult(null);
  }, [exercise.id]);

  const submit = async () => {
    setSubmitting(true);
    const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    try {
      const r = await onSubmit(answer, dur);
      if (r && !hideFeedback) setResult(r);
    } finally {
      setSubmitting(false);
    }
  };

  const opts = useMemo<string[]>(() => {
    const arr = Array.isArray(exercise.options) ? (exercise.options as unknown[]) : [];
    return arr.map((x) => String(x));
  }, [exercise.options]);

  const correctSet = useMemo(() => {
    if (!result || !Array.isArray(result.correct)) return new Set<string>();
    return new Set((result.correct as unknown[]).map((x) => String(x)));
  }, [result]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {exercise.module && <Badge variant="outline" className="capitalize">{exercise.module}</Badge>}
        {exercise.teil != null && <Badge variant="outline">Teil {exercise.teil}</Badge>}
      </div>
      <h2 className="text-lg font-semibold leading-snug">{exercise.title}</h2>
      {exercise.passage && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">{exercise.passage}</div>
      )}
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full" preload="metadata" />
      )}
      <p className="text-sm whitespace-pre-wrap">{exercise.prompt}</p>

      {/* Inputs */}
      {exercise.kind === "multiple_choice" && (
        <div className="space-y-2">
          {opts.map((o) => {
            const selected = answer === o;
            const isWrong = result && selected && !correctSet.has(o);
            const isRight = result && correctSet.has(o);
            return (
              <button
                key={o}
                type="button"
                disabled={!!result}
                onClick={() => setAnswer(o)}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                  selected ? "border-accent bg-accent/10" : "hover:bg-accent/5"
                } ${isRight ? "border-green-500 bg-green-500/10" : ""} ${isWrong ? "border-red-500 bg-red-500/10" : ""}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {exercise.kind === "true_false" && (
        <div className="flex gap-2">
          {(opts.length ? opts : ["Richtig", "Falsch"]).map((o) => {
            const selected = answer === o;
            const isRight = result && correctSet.has(o);
            const isWrong = result && selected && !correctSet.has(o);
            return (
              <Button
                key={o}
                type="button"
                variant={selected ? "default" : "outline"}
                disabled={!!result}
                onClick={() => setAnswer(o)}
                className={`${isRight ? "border-green-500 bg-green-500/10 text-foreground" : ""} ${isWrong ? "border-red-500 bg-red-500/10 text-foreground" : ""}`}
              >
                {o}
              </Button>
            );
          })}
        </div>
      )}

      {exercise.kind === "cloze" && (
        <ClozeInputs
          answer={Array.isArray(answer) ? (answer as string[]) : []}
          gapCount={countGaps(exercise.passage, opts)}
          options={opts}
          locked={!!result}
          correct={result && Array.isArray(result.correct) ? (result.correct as unknown[]).map((x) => String(x)) : null}
          onChange={(a) => setAnswer(a)}
        />
      )}

      {exercise.kind === "matching" && (
        <MatchingInputs
          pairs={opts}
          answer={(answer ?? {}) as Record<string, string>}
          locked={!!result}
          correct={result && Array.isArray(result.correct) ? (result.correct as unknown[]).map((x) => String(x)) : null}
          onChange={(a) => setAnswer(a)}
        />
      )}

      {exercise.kind === "open_text" && (
        <Textarea rows={8} disabled={!!result} value={String(answer ?? "")} onChange={(e) => setAnswer(e.target.value)} placeholder="Deine Antwort…" />
      )}

      {/* Action */}
      {!result ? (
        <Button onClick={submit} disabled={submitting || !hasAnswer(exercise.kind, answer)}>
          {submitting ? "Auswerten…" : "Antwort prüfen"}
        </Button>
      ) : (
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium">
            {result.needsReview ? (
              <><Clock3 className="size-4 text-amber-500" /> Antwort gespeichert — Lehrkraft prüft.</>
            ) : result.isCorrect ? (
              <><CheckCircle2 className="size-4 text-green-500" /> Richtig! ({result.score}%)</>
            ) : (
              <><XCircle className="size-4 text-red-500" /> Nicht ganz ({result.score}%)</>
            )}
          </div>
          {result.explanation && <p className="text-muted-foreground whitespace-pre-wrap">{result.explanation}</p>}
          <p className="text-xs text-muted-foreground">Die richtigen Antworten sind direkt bei jeder Frage markiert.</p>
        </div>
      )}
    </div>
  );
}

function defaultAnswer(ex: ExerciseDTO): unknown {
  switch (ex.kind) {
    case "cloze": return [];
    case "matching": return {};
    case "open_text": return "";
    default: return null;
  }
}

function hasAnswer(kind: ExerciseDTO["kind"], a: unknown): boolean {
  if (kind === "open_text") return String(a ?? "").trim().length > 0;
  if (kind === "cloze") return Array.isArray(a) && a.some((x) => String(x ?? "").trim().length > 0);
  if (kind === "matching") return !!(a && typeof a === "object" && Object.keys(a as object).length > 0);
  return a !== null && a !== undefined && a !== "";
}

function countGaps(passage: string | null | undefined, options: string[]): number {
  if (!passage) return Math.max(1, options.length);
  const m = passage.match(/_{2,}|\[\d+\]|\(\d+\)/g);
  if (m && m.length) return m.length;
  return Math.max(1, options.length);
}

function ClozeInputs({
  answer, gapCount, options, locked, correct, onChange,
}: { answer: string[]; gapCount: number; options: string[]; locked: boolean; correct: string[] | null; onChange: (a: string[]) => void }) {
  const setAt = (i: number, v: string) => {
    const next = [...answer];
    while (next.length < gapCount) next.push("");
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: gapCount }).map((_, i) => {
        const expected = correct?.[i];
        const given = String(answer[i] ?? "").trim();
        const ok = expected != null && given.toLowerCase() === String(expected).trim().toLowerCase();
        return (
          <div key={i} className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Frage {i + 1}</span>
              {locked && expected != null && (
                ok ? (
                  <span className="inline-flex items-center gap-1 text-green-600"><Check className="size-3" /> {expected}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600"><X className="size-3" /> → <span className="text-foreground font-medium">{expected}</span></span>
                )
              )}
            </label>
            {options.length > 0 ? (
              <select
                disabled={locked}
                value={answer[i] ?? ""}
                onChange={(e) => setAt(i, e.target.value)}
                className={`w-full rounded-md border bg-background px-2 py-1.5 text-sm ${locked && expected != null ? (ok ? "border-green-500" : "border-red-500") : ""}`}
              >
                <option value="">—</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <Input
                disabled={locked}
                value={answer[i] ?? ""}
                onChange={(e) => setAt(i, e.target.value)}
                className={locked && expected != null ? (ok ? "border-green-500" : "border-red-500") : ""}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchingInputs({
  pairs, answer, locked, correct, onChange,
}: { pairs: string[]; answer: Record<string, string>; locked: boolean; correct: string[] | null; onChange: (a: Record<string, string>) => void }) {
  // pairs are stored as "left|right"
  const lefts = pairs.map((p) => p.split("|")[0] ?? p);
  const rights = pairs.map((p) => p.split("|")[1] ?? "").filter(Boolean);
  // Build the expected map from correct pairs (also "left|right")
  const expectedMap = useMemo(() => {
    const m = new Map<string, string>();
    if (correct) {
      for (const c of correct) {
        const [l, r] = String(c).split("|");
        if (l) m.set(l, r ?? "");
      }
    }
    // fallback: assume the source `pairs` already encode the correct mapping
    if (m.size === 0) for (const p of pairs) {
      const [l, r] = p.split("|");
      if (l && r) m.set(l, r);
    }
    return m;
  }, [correct, pairs]);
  // Lesen Teil 3 interaction: student selects a question first, then taps the
  // matching title letter. No dropdowns, no need to click the text first.
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  useEffect(() => {
    if (locked) setActiveLeft(null);
  }, [locked]);
  return (
    <div className="space-y-4">
      {/* Questions */}
      <div className="space-y-2">
        {lefts.map((l) => {
          const expected = expectedMap.get(l);
          const given = String(answer[l] ?? "").trim();
          const ok = expected != null && given.toLowerCase() === String(expected).trim().toLowerCase();
          const isActive = activeLeft === l && !locked;
          const stateClass = locked && expected != null
            ? (ok ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5")
            : isActive
              ? "border-primary ring-2 ring-primary/30"
              : "border-border hover:border-primary/50";
          return (
            <button
              key={l}
              type="button"
              disabled={locked}
              onClick={() => setActiveLeft(activeLeft === l ? null : l)}
              className={`w-full flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors ${stateClass} ${locked ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className="font-medium">{l}</span>
              <span className="flex items-center gap-2">
                {given ? (
                  <span className={`inline-flex items-center justify-center min-w-7 h-7 rounded-md border font-semibold ${locked ? (ok ? "border-green-500 text-green-700" : "border-red-500 text-red-700") : "border-primary text-primary"}`}>
                    {given}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{locked ? "—" : "Antwort wählen ↓"}</span>
                )}
                {locked && expected != null && !ok && (
                  <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                    <X className="size-3" /> → <span className="text-foreground font-semibold">{expected}</span>
                  </span>
                )}
                {locked && expected != null && ok && (
                  <Check className="size-4 text-green-600" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Title picker — only visible while a question is selected */}
      {!locked && activeLeft && (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Wählen Sie den passenden Titel für <span className="font-semibold text-foreground">{activeLeft}</span>:
          </p>
          <div className="flex flex-wrap gap-2">
            {rights.map((r) => {
              const isPicked = String(answer[activeLeft] ?? "") === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onChange({ ...answer, [activeLeft]: r });
                    // Auto-advance to the next unanswered question.
                    const next = lefts.find((l) => l !== activeLeft && !answer[l]);
                    setActiveLeft(next ?? null);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${isPicked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-primary/5"}`}
                >
                  {r}
                </button>
              );
            })}
            {answer[activeLeft] && (
              <button
                type="button"
                onClick={() => {
                  const { [activeLeft]: _, ...rest } = answer;
                  onChange(rest);
                }}
                className="rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                Auswahl löschen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
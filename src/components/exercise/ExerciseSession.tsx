import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedExercises } from "@/lib/exercises/exercises.functions";
import { submitAttempt } from "@/lib/exercises/attempts.functions";
import { ExerciseRunner, type ExerciseDTO } from "./ExerciseRunner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Module = "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
type Mode = "practice" | "exam";

export function ExerciseSession({
  level,
  module,
  teil,
  mode = "practice",
  passageIndex,
}: {
  level: "b1" | "b2";
  module: Module;
  teil: number;
  mode?: Mode;
  /** When set, restrict the session to a single passage group (library item). */
  passageIndex?: number;
}) {
  const list = useServerFn(listPublishedExercises);
  const submit = useServerFn(submitAttempt);
  const listRef = useRef(list);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [groupIndex, setGroupIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  // Exam-mode local answer buffer; only submitted on Abgeben.
  const [examAnswers, setExamAnswers] = useState<Record<string, unknown>>({});
  const [examResults, setExamResults] = useState<Record<string, { isCorrect: boolean; correct: unknown; explanation: string | null }> | null>(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [retryIds, setRetryIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    listRef.current = list;
  }, [list]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    console.debug("[Lingovia diagnostics] ExerciseSession list fetch", { level, module, teil });
    listRef.current({ data: { level, module, teil } })
      .then((r) => {
        if (cancel) return;
        let all = r.exercises as ExerciseDTO[];
        if (typeof passageIndex === "number") {
          // Filter down to the single passage-group the library opened.
          const grp = groupByPassage(all)[passageIndex];
          all = grp ?? [];
        }
        setExercises(retryIds ? all.filter((e) => retryIds.has(e.id)) : all);
        setAudioUrls(r.audioUrls);
        setGroupIndex(0);
        setExamAnswers({});
        setExamResults(null);
        setDone(new Set());
      })
      .catch((e) => toast.error(e.message ?? "Konnte Übungen nicht laden"))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [level, module, teil, mode, retryIds, passageIndex]);

  // Group consecutive exercises that share the same passage into one screen
  // (real TELC layout: one Lesetext + its questions 1..n).
  const groups = useMemo(() => {
    return groupByPassage(exercises);
  }, [exercises]);

  const currentGroup = groups[groupIndex];
  const answeredCount = mode === "exam"
    ? Object.keys(examAnswers).length
    : done.size;
  const progress = exercises.length ? Math.round((answeredCount / exercises.length) * 100) : 0;

  if (loading) {
    return (
      <Card><CardContent className="py-12 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Übungen werden geladen…
      </CardContent></Card>
    );
  }
  if (exercises.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
        Noch keine Übungen für diesen Teil veröffentlicht.
      </CardContent></Card>
    );
  }
  if (!currentGroup) return null;

  // ---- Exam-mode review screen ----
  if (mode === "exam" && examResults) {
    const correctCount = Object.values(examResults).filter((r) => r.isCorrect).length;
    const wrongIds = exercises.filter((e) => !examResults[e.id]?.isCorrect).map((e) => e.id);
    return (
      <div className="space-y-4">
        <Card><CardContent className="py-6 text-center space-y-2">
          <h2 className="text-xl font-semibold">Ergebnis</h2>
          <p className="text-sm text-muted-foreground">
            {correctCount} von {exercises.length} richtig ({Math.round((correctCount / exercises.length) * 100)}%)
          </p>
          {wrongIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setRetryIds(new Set(wrongIds))}
            >
              <RotateCcw className="size-4 mr-1" /> Falsche Aufgaben wiederholen ({wrongIds.length})
            </Button>
          )}
        </CardContent></Card>
        {exercises.map((ex, i) => {
          const r = examResults[ex.id];
          const given = examAnswers[ex.id];
          // passage_mcq stores answers as { [n]: option } and `r.correct` as
          // { [n]: option }. Render each embedded question with its own
          // green/red pill so the student sees which item they missed.
          if (ex.kind === "passage_mcq") {
            const givenMap = (given ?? {}) as Record<string, string>;
            const correctMap = (r?.correct && typeof r.correct === "object" && !Array.isArray(r.correct))
              ? (r.correct as Record<string, string>)
              : {};
            const opts: any = (ex as any).options;
            const qs: Array<{ n: string; prompt: string }> = opts && Array.isArray(opts.questions)
              ? opts.questions.map((q: any) => ({ n: String(q.n ?? ""), prompt: String(q.prompt ?? "") }))
              : [];
            return (
              <Card key={ex.id}><CardContent className="pt-6 space-y-3">
                <div className="text-sm font-semibold">{ex.title}</div>
                {qs.map((q) => {
                  const got = givenMap[q.n];
                  const want = correctMap[q.n];
                  const ok = !!want && got === want;
                  return (
                    <div key={q.n} className="space-y-1 border-t pt-2 first:border-t-0 first:pt-0">
                      <div className="flex items-center gap-2 text-sm">
                        {ok ? <CheckCircle2 className="size-4 text-green-600" /> : <XCircle className="size-4 text-red-600" />}
                        <span className="text-muted-foreground">{q.n}.</span>
                        <span>{q.prompt}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-6 space-y-0.5">
                        <div>Deine Antwort: <span className="text-foreground">{got ?? "—"}</span></div>
                        {!ok && want && (
                          <div>Richtig: <span className="text-foreground font-medium">{want}</span></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent></Card>
            );
          }
          return (
            <Card key={ex.id}><CardContent className="pt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {r?.isCorrect ? (
                  <><CheckCircle2 className="size-4 text-green-600" /> Aufgabe {i + 1} — richtig</>
                ) : (
                  <><XCircle className="size-4 text-red-600" /> Aufgabe {i + 1} — falsch</>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{ex.prompt}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Deine Antwort: <span className="text-foreground">{String(given ?? "—")}</span></div>
                {!r?.isCorrect && Array.isArray(r?.correct) && (
                  <div>Richtig: <span className="text-foreground font-medium">{(r!.correct as unknown[]).map(String).join(", ")}</span></div>
                )}
                {r?.explanation && <div className="pt-1 text-foreground/80 whitespace-pre-wrap">{r.explanation}</div>}
              </div>
            </CardContent></Card>
          );
        })}
      </div>
    );
  }

  // ---- Submit the entire exam (deferred grading) ----
  const submitExam = async () => {
    setSubmittingExam(true);
    try {
      const results: Record<string, { isCorrect: boolean; correct: unknown; explanation: string | null }> = {};
      for (const ex of exercises) {
        const ans = examAnswers[ex.id];
        if (ans == null) {
          results[ex.id] = { isCorrect: false, correct: null, explanation: null };
          continue;
        }
        try {
          const r: any = await submit({ data: { exerciseId: ex.id, answer: ans, durationSeconds: 1 } });
          results[ex.id] = {
            isCorrect: !!r?.isCorrect,
            correct: (r?.correct as unknown) ?? null,
            explanation: (r?.explanation as string | null) ?? null,
          };
        } catch {
          results[ex.id] = { isCorrect: false, correct: null, explanation: null };
        }
      }
      setExamResults(results);
    } finally {
      setSubmittingExam(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{mode === "exam" ? "Prüfung" : "Übung"} · Block {groupIndex + 1} / {groups.length}</span>
            <span>{answeredCount} / {exercises.length} beantwortet</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Shared passage shown once at top of the group */}
      {currentGroup[0].passage && currentGroup.length > 1 && (
        <Card><CardContent className="pt-6">
          <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
            {currentGroup[0].passage}
          </div>
        </CardContent></Card>
      )}

      {currentGroup.map((ex) => {
        // When the group renders the shared passage above, hide it on each
        // individual question to avoid repeating the text 5×.
        const exForRunner: ExerciseDTO = currentGroup.length > 1
          ? { ...ex, passage: null }
          : ex;
        return (
          <Card key={ex.id}><CardContent className="pt-6">
            <ExerciseRunner
              key={ex.id}
              exercise={exForRunner}
              audioUrl={ex.audio_id ? audioUrls[ex.audio_id] : null}
              hideFeedback={mode === "exam"}
              initialAnswer={examAnswers[ex.id]}
              onSubmit={async (answer, durationSeconds) => {
                if (mode === "exam") {
                  // Defer grading; just buffer the answer locally.
                  setExamAnswers((a) => ({ ...a, [ex.id]: answer }));
                  return;
                }
                try {
                  const r: any = await submit({ data: { exerciseId: ex.id, answer, durationSeconds } });
                  setDone((s) => new Set(s).add(ex.id));
                  return {
                    score: Number(r?.score ?? 0),
                    isCorrect: !!r?.isCorrect,
                    needsReview: !!r?.needsReview,
                    correct: (r?.correct as unknown) ?? undefined,
                    explanation: (r?.explanation as string | null) ?? undefined,
                  };
                } catch (e: any) {
                  toast.error(e?.message ?? "Konnte nicht speichern");
                }
              }}
            />
          </CardContent></Card>
        );
      })}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => groupIndex > 0 ? setGroupIndex((i) => i - 1) : window.history.back()}>
          <ArrowLeft className="size-4 mr-1" /> Zurück
        </Button>
        {groupIndex < groups.length - 1 ? (
          <Button onClick={() => setGroupIndex((i) => i + 1)}>
            Weiter <ArrowRight className="size-4 ml-1" />
          </Button>
        ) : mode === "exam" ? (
          <Button onClick={submitExam} disabled={submittingExam}>
            {submittingExam ? "Wird ausgewertet…" : "Prüfung abgeben"}
          </Button>
        ) : (
          <Button disabled>Letzte Aufgabe</Button>
        )}
      </div>
    </div>
  );
}

export function groupByPassage(exercises: ExerciseDTO[]): ExerciseDTO[][] {
  const out: ExerciseDTO[][] = [];
  for (const ex of exercises) {
    if (ex.kind === "passage_mcq") {
      out.push([ex]);
      continue;
    }
    const last = out[out.length - 1];
    const sharedPassage = ex.passage && last && last[0].passage === ex.passage;
    if (sharedPassage) last.push(ex);
    else out.push([ex]);
  }
  return out;
}

/** Derive a unique student-facing title for each passage group. */
export function deriveGroupTitles(groups: ExerciseDTO[][]): string[] {
  const raw = groups.map((g) => {
    const ex = g[0];
    // Prefer the first non-empty, non-generic title from the group's exercises.
    const candidate = g
      .map((e) => (e.title ?? "").trim())
      .find((x) => x.length > 0 && !isGenericTitle(x));
    if (candidate) return cleanTitle(candidate);
    // Else: derive a topic from the passage (German heuristic).
    const topic = deriveTopic(ex.passage ?? ex.prompt ?? "");
    if (topic) return topic;
    // Last resort: short prompt extract — never "Text N".
    return cleanTitle((ex.prompt ?? "Aufgabe").slice(0, 60));
  });
  // Dedup: append " 1", " 2"… when the same base title appears more than once.
  const counts = new Map<string, number>();
  for (const t of raw) counts.set(t, (counts.get(t) ?? 0) + 1);
  const seen = new Map<string, number>();
  return raw.map((t) => {
    if ((counts.get(t) ?? 0) <= 1) return t;
    const n = (seen.get(t) ?? 0) + 1;
    seen.set(t, n);
    return `${t} ${n}`;
  });
}

function isGenericTitle(t: string): boolean {
  return /^(lesen|sprachbausteine|hören|hoeren|schreiben|mündlich|muendlich)\s+teil\b/i.test(t)
      || /^(text|passage|aufgabe)\s*\d+$/i.test(t);
}

function deriveTopic(text: string): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  const subj = raw.match(/Betreff\s*:\s*([^\n\r]{2,80})/i);
  if (subj) return cleanTitle(subj[1]);
  const firstLine = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  if (firstLine && firstLine.length <= 60 && !/[.!?:]$/.test(firstLine) && firstLine.split(/\s+/).length <= 8) {
    return cleanTitle(firstLine);
  }
  const stop = new Set([
    "Der","Die","Das","Den","Dem","Des","Ein","Eine","Einen","Einem","Einer","Eines",
    "Und","Aber","Oder","Denn","Sondern","Wenn","Weil","Dass","Ob","Als","Wie","Wo",
    "Ich","Du","Er","Sie","Es","Wir","Ihr","Mein","Dein","Sein","Unser","Euer","Ihre",
    "Hier","Dort","Heute","Morgen","Gestern","Jetzt","Auch","Nicht","Nur","Schon","Noch",
    "Mit","Ohne","Für","Gegen","Bei","Von","Zu","Aus","Nach","Vor","Über","Unter","Auf","An","In","Am","Im",
    "Liebe","Lieber","Hallo","Sehr","Geehrte","Geehrter","Herr","Frau","Beste","Viele","Grüße","Grüsse","Freundliche",
    "Was","Wer","Wann","Warum","Wieso","Welche","Welcher","Welches",
  ]);
  const freq = new Map<string, number>();
  const words = raw.match(/\b[A-ZÄÖÜ][a-zäöüß-]{3,}\b/g) ?? [];
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  if (freq.size > 0) {
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (top && top[1] >= 2) return top[0];
  }
  const sent = raw.split(/[.!?]\s+/)[0] ?? "";
  return cleanTitle(sent.split(/\s+/).slice(0, 6).join(" "));
}

function cleanTitle(s: string): string {
  return (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/^["„»«'`]+|["“”»«'`]+$/g, "")
    .replace(/[.,;:!?]+$/, "")
    .trim();
}
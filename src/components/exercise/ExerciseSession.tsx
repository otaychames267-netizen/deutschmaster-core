import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedExercises } from "@/lib/exercises/exercises.functions";
import { submitAttempt } from "@/lib/exercises/attempts.functions";
import { ExerciseRunner, type ExerciseDTO } from "./ExerciseRunner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { ExamTimer } from "./ExamTimer";
import { toast } from "sonner";

type Module = "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
type Mode = "practice" | "exam";

// Official TELC durations per module (minutes). Per-Teil split is approximate
// — the exam is scored per module, so we budget each Teil with its slice.
const EXAM_MINUTES: Record<Module, number> = {
  lesen: 30,            // Lesen total 90 min / ~3 Teile
  sprachbausteine: 15,
  hoeren: 10,
  schreiben: 30,
  muendlich: 15,
};

export function ExerciseSession({
  level,
  module,
  teil,
  mode = "practice",
}: {
  level: "b1" | "b2";
  module: Module;
  teil: number;
  mode?: Mode;
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
  const [examEndsAt, setExamEndsAt] = useState<string | null>(null);
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
        const all = r.exercises as ExerciseDTO[];
        setExercises(retryIds ? all.filter((e) => retryIds.has(e.id)) : all);
        setAudioUrls(r.audioUrls);
        setGroupIndex(0);
        setExamAnswers({});
        setExamResults(null);
        setDone(new Set());
        setExamEndsAt(
          mode === "exam"
            ? new Date(Date.now() + EXAM_MINUTES[module] * 60_000).toISOString()
            : null,
        );
      })
      .catch((e) => toast.error(e.message ?? "Konnte Übungen nicht laden"))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [level, module, teil, mode, retryIds]);

  // Group consecutive exercises that share the same passage into one screen
  // (real TELC layout: one Lesetext + its questions 1..n).
  const groups = useMemo(() => {
    const out: ExerciseDTO[][] = [];
    for (const ex of exercises) {
      const last = out[out.length - 1];
      const sharedPassage = ex.passage && last && last[0].passage === ex.passage;
      if (sharedPassage) last.push(ex);
      else out.push([ex]);
    }
    return out;
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
          const r = await submit({ data: { exerciseId: ex.id, answer: ans, durationSeconds: 1 } });
          results[ex.id] = {
            isCorrect: !!r?.isCorrect,
            correct: r?.correct ?? null,
            explanation: r?.explanation ?? null,
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
        {mode === "exam" && examEndsAt && (
          <ExamTimer endsAt={examEndsAt} onExpire={() => { if (!examResults && !submittingExam) submitExam(); }} />
        )}
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
                  const r = await submit({ data: { exerciseId: ex.id, answer, durationSeconds } });
                  setDone((s) => new Set(s).add(ex.id));
                  return r;
                } catch (e: any) {
                  toast.error(e?.message ?? "Konnte nicht speichern");
                }
              }}
            />
          </CardContent></Card>
        );
      })}

      <div className="flex justify-between">
        <Button variant="outline" disabled={groupIndex === 0} onClick={() => setGroupIndex((i) => i - 1)}>
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
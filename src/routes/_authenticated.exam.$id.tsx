import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getExamSession, finishExam } from "@/lib/exercises/exam.functions";
import { submitAttempt } from "@/lib/exercises/attempts.functions";
import { ExerciseRunner, type ExerciseDTO } from "@/components/exercise/ExerciseRunner";
import { ExamTimer } from "@/components/exercise/ExamTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exam/$id")({
  head: () => ({ meta: [{ title: "Prüfung — Lingovia" }] }),
  component: ExamRunner,
});

function ExamRunner() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const load = useServerFn(getExamSession);
  const submit = useServerFn(submitAttempt);
  const finish = useServerFn(finishExam);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [audio, setAudio] = useState<Record<string, string>>({});
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<{ total: number; breakdown: Record<string, { count: number; avg: number }>; needsReview: number } | null>(null);

  useEffect(() => {
    let cancel = false;
    load({ data: { sessionId: id } })
      .then((r) => {
        if (cancel) return;
        setSession(r.session);
        setExercises(r.exercises as ExerciseDTO[]);
        setAudio(r.audioUrls);
        setAnswered(new Set(r.attempts.map((a: any) => a.exercise_id)));
        if (r.session.status === "submitted") {
          setResult({ total: r.session.score_total ?? 0, breakdown: (r.session.score_breakdown ?? {}) as any, needsReview: 0 });
        }
      })
      .catch((e) => toast.error(e?.message ?? "Konnte Prüfung nicht laden"))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [id, load]);

  const doFinish = async () => {
    setFinishing(true);
    try {
      const r = await finish({ data: { sessionId: id } });
      setResult(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Konnte Prüfung nicht abschließen");
    } finally { setFinishing(false); }
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground"><Loader2 className="inline size-4 animate-spin mr-1" /> Lädt…</div>;
  if (!session) return null;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader><CardTitle>Prüfung beendet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold tabular-nums">{result.total}<span className="text-base text-muted-foreground"> / 100</span></div>
            <div className="space-y-2">
              {Object.entries(result.breakdown).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="capitalize">{k}</span><span>{v.avg}% ({v.count})</span></div>
                  <Progress value={v.avg} className="h-1.5" />
                </div>
              ))}
            </div>
            {result.needsReview > 0 && (
              <p className="text-xs text-muted-foreground">{result.needsReview} offene Antwort(en) werden vom Lehrteam korrigiert.</p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => nav({ to: "/dashboard" })}>Zum Dashboard</Button>
              <Button variant="outline" onClick={() => nav({ to: "/statistik" })}>Statistik</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const current = exercises[index];
  const total = exercises.length;
  const progress = total ? Math.round((answered.size / total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Aufgabe {index + 1} / {total}</div>
        <ExamTimer endsAt={session.ends_at} onExpire={doFinish} />
      </div>
      <Progress value={progress} className="h-1.5" />

      {current && (
        <Card><CardContent className="pt-6">
          <ExerciseRunner
            key={current.id}
            exercise={current}
            audioUrl={current.audio_id ? audio[current.audio_id] : null}
            hideFeedback
            onSubmit={async (answer, dur) => {
              try {
                await submit({ data: { exerciseId: current.id, answer, durationSeconds: dur, examSessionId: id } });
                setAnswered((s) => new Set(s).add(current.id));
                if (index < total - 1) setIndex(index + 1);
                else toast.success("Letzte Aufgabe gespeichert. Du kannst jetzt abgeben.");
              } catch (e: any) {
                toast.error(e?.message ?? "Konnte nicht speichern");
              }
            }}
          />
        </CardContent></Card>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Zurück</Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={index >= total - 1} onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>Überspringen</Button>
          <Button onClick={doFinish} disabled={finishing}>{finishing ? "Wird abgegeben…" : "Prüfung abgeben"}</Button>
        </div>
      </div>
    </div>
  );
}
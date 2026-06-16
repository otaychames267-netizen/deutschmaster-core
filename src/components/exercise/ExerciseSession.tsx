import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedExercises } from "@/lib/exercises/exercises.functions";
import { submitAttempt } from "@/lib/exercises/attempts.functions";
import { ExerciseRunner, type ExerciseDTO } from "./ExerciseRunner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Module = "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";

export function ExerciseSession({
  level,
  module,
  teil,
}: {
  level: "b1" | "b2";
  module: Module;
  teil: number;
}) {
  const list = useServerFn(listPublishedExercises);
  const submit = useServerFn(submitAttempt);
  const listRef = useRef(list);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());

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
        setExercises(r.exercises as ExerciseDTO[]);
        setAudioUrls(r.audioUrls);
      })
      .catch((e) => toast.error(e.message ?? "Konnte Übungen nicht laden"))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [level, module, teil]);

  const current = exercises[index];
  const progress = useMemo(() => exercises.length ? Math.round((done.size / exercises.length) * 100) : 0, [done, exercises]);

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
  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Aufgabe {index + 1} / {exercises.length}</span>
            <span>{done.size} erledigt</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>
      <Card><CardContent className="pt-6">
        <ExerciseRunner
          key={current.id}
          exercise={current}
          audioUrl={current.audio_id ? audioUrls[current.audio_id] : null}
          onSubmit={async (answer, durationSeconds) => {
            try {
              const r = await submit({ data: { exerciseId: current.id, answer, durationSeconds } });
              setDone((s) => new Set(s).add(current.id));
              return r;
            } catch (e: any) {
              toast.error(e?.message ?? "Konnte nicht speichern");
            }
          }}
        />
      </CardContent></Card>
      <div className="flex justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <ArrowLeft className="size-4 mr-1" /> Zurück
        </Button>
        <Button disabled={index === exercises.length - 1} onClick={() => setIndex((i) => i + 1)}>
          Weiter <ArrowRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
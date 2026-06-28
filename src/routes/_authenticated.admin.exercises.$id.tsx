import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseEditor, type ExerciseForm } from "@/components/admin/ExerciseEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exercises/$id")({
  head: () => ({ meta: [{ title: "Edit exercise — Admin" }] }),
  component: EditExercise,
});

function EditExercise() {
  const { id } = useParams({ from: "/_authenticated/admin/exercises/$id" });
  const nav = useNavigate();
  const [form, setForm] = useState<ExerciseForm | null>(null);
  const [audio, setAudio] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ex, error }, { data: au }] = await Promise.all([
        supabase.from("exercises").select("*").eq("id", id).single(),
        supabase.from("audio_assets").select("id,title").order("title"),
      ]);
      if (error || !ex) { toast.error(error?.message ?? "Not found"); nav({ to: "/admin/exercises" }); return; }
      setForm({
        id: ex.id,
        level: ex.level as "b1" | "b2",
        module: ex.module as "muendlich" | "lesen" | "hoeren" | "sprachbausteine" | "schreiben",
        teil: ex.teil, position: ex.position,
        title: ex.title, prompt: ex.prompt, passage: ex.passage ?? "", audio_id: ex.audio_id,
        kind: ex.kind as "passage_mcq" | "multiple_choice" | "true_false" | "matching" | "cloze" | "open_text",
        options: (ex.options as string[]) ?? [], correct: (ex.correct as string[]) ?? [],
        explanation: ex.explanation ?? "",
        status: ex.status as "draft" | "published" | "hidden",
        tags: ex.tags ?? [],
      });
      setAudio((au ?? []) as { id: string; title: string }[]);
    })();
  }, [id, nav]);

  if (!form) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Edit exercise</h1>
      <ExerciseEditor initial={form} audioOptions={audio} onSaved={() => nav({ to: "/admin/exercises" })} />
    </div>
  );
}
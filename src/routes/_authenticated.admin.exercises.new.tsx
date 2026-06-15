import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseEditor, blankExercise } from "@/components/admin/ExerciseEditor";

export const Route = createFileRoute("/_authenticated/admin/exercises/new")({
  head: () => ({ meta: [{ title: "New exercise — Admin" }] }),
  component: NewExercise,
});

function NewExercise() {
  const nav = useNavigate();
  const [audio, setAudio] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    supabase.from("audio_assets").select("id,title").order("title").then(({ data }) => setAudio((data ?? []) as { id: string; title: string }[]));
  }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">New exercise</h1>
      <ExerciseEditor initial={blankExercise()} audioOptions={audio} onSaved={(id) => nav({ to: "/admin/exercises/$id", params: { id } })} />
    </div>
  );
}
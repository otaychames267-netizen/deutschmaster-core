import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SBTeil2Exercise, type SBT2ExerciseData } from "@/components/exercise/sprachbausteine/SBTeil2Exercise";
import { Loader2 } from "lucide-react";

function SBTeil2Page() {
  const [exercises, setExercises] = useState<SBT2ExerciseData[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: exList, error: exErr } = await supabase
        .from("sb_exercises")
        .select("id, title")
        .eq("teil", 2)
        .order("created_at");

      if (exErr) { setError(exErr.message); setLoading(false); return; }
      if (!exList?.length) { setLoading(false); return; }

      const ex = exList[0];
      const [passageRes, wordsRes] = await Promise.all([
        supabase.from("sb_t2_passages").select("passage").eq("exercise_id", ex.id).single(),
        supabase.from("sb_t2_words").select("word_number, word").eq("exercise_id", ex.id).order("word_number"),
      ]);

      if (passageRes.error || wordsRes.error) {
        setError((passageRes.error ?? wordsRes.error)?.message ?? "Load failed");
        setLoading(false);
        return;
      }

      const built: SBT2ExerciseData[] = exList.map((e) => ({
        id: e.id,
        title: e.title,
        passage: "",
        words: [],
      }));
      built[0].passage = passageRes.data?.passage ?? "";
      built[0].words = wordsRes.data ?? [];

      setExercises(built);
      setLoading(false);
    }
    load();
  }, []);

  async function loadExercise(idx: number) {
    if (exercises[idx]?.passage) { setCurrent(idx); return; }
    const ex = exercises[idx];
    const [passageRes, wordsRes] = await Promise.all([
      supabase.from("sb_t2_passages").select("passage").eq("exercise_id", ex.id).single(),
      supabase.from("sb_t2_words").select("word_number, word").eq("exercise_id", ex.id).order("word_number"),
    ]);
    setExercises((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], passage: passageRes.data?.passage ?? "", words: wordsRes.data ?? [] };
      return next;
    });
    setCurrent(idx);
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-red-600">Fehler beim Laden: {error}</div>
  );

  if (!exercises.length) return (
    <div className="p-8 text-gray-500 text-center">
      <p className="text-lg font-medium mb-2">Keine Übungen verfügbar</p>
      <p className="text-sm">Sprachbausteine Teil 2 Übungen werden noch importiert.</p>
    </div>
  );

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sprachbausteine — Teil 2</h1>
          <p className="text-gray-500 mt-1 text-sm">Lückentext: das richtige Wort aus der Wortbox einsetzen (jedes Wort nur einmal)</p>
        </div>

        {exercises.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {exercises.map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => loadExercise(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  i === current
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Übung {i + 1}
              </button>
            ))}
          </div>
        )}

        <SBTeil2Exercise exercise={exercises[current]} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/sprachbausteine/teil-2")({
  component: SBTeil2Page,
});

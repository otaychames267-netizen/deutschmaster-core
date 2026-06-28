import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, BookOpen, AlertCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Teil2Exercise, type T2ExerciseData } from "@/components/exercise/lesen/Teil2Exercise";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-2")({
  component: LesenTeil2Page,
});

function LesenTeil2Page() {
  const [exercises, setExercises] = useState<T2ExerciseData[]>([]);
  const [selected, setSelected] = useState<T2ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: exList, error: exErr } = await supabase
          .from("lesen_exercises")
          .select("id, title")
          .eq("teil", 2)
          .order("created_at", { ascending: false });
        if (exErr) throw exErr;
        if (!exList || exList.length === 0) { setLoading(false); return; }

        const full: T2ExerciseData[] = [];
        for (const ex of exList) {
          const [{ data: passages }, { data: questions }] = await Promise.all([
            supabase.from("lesen_t2_passages").select("passage").eq("exercise_id", ex.id).single(),
            // Do NOT select `correct` — answers are checked server-side via score_lesen_t2()
            supabase.from("lesen_t2_questions").select("number, question, option_a, option_b, option_c").eq("exercise_id", ex.id).order("number"),
          ]);
          full.push({ id: ex.id, title: ex.title, passage: passages?.passage ?? "", questions: (questions ?? []) as T2ExerciseData["questions"] });
        }
        setExercises(full);
      } catch {
        setError("Exercises could not be loaded. Try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (selected) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <button onClick={() => setSelected(null)}
          className="mb-5 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </button>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">{selected.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lesen · Teil 2 — Längerer Text + Multiple Choice</p>
        </div>
        <Teil2Exercise exercise={selected} onComplete={(score, total) => console.log("T2 score", score, total)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/schriftlich" className="hover:text-foreground">Schriftlich</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/schriftlich/vorbereitung" className="hover:text-foreground">Vorbereitung</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold">Lesen Teil 2</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Lesen — Teil 2</h1>
        <p className="text-sm text-muted-foreground mt-1">Längerer Text mit Multiple-Choice · 1 Text · 5 Fragen (6–10)</p>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Strategie</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Lesen Sie zuerst die Fragen, dann den Text.</li>
              <li>Die Fragen folgen meistens der Reihenfolge des Textes.</li>
              <li>Suchen Sie nach Paraphrasen — nicht nach denselben Wörtern.</li>
              <li>Schließen Sie falsche Antworten systematisch aus.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}
        {!loading && !error && exercises.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-semibold text-foreground">Noch keine Übungen verfügbar</p>
              <p className="text-xs text-muted-foreground mt-0.5">Der Administrator muss zuerst Übungen importieren.</p>
            </div>
          </div>
        )}
        {exercises.map((ex) => (
          <button key={ex.id} onClick={() => setSelected(ex)}
            className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{ex.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ex.questions.length} Fragen · Multiple Choice (a/b/c)</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

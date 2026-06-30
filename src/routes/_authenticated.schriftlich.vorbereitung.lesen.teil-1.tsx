import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, BookOpen, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Teil1Exercise, type T1ExerciseData, type T1Headline, type T1Text } from "@/components/exercise/lesen/Teil1Exercise";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-1")({
  component: LesenTeil1Page,
});

const titleOf = (ex: T1ExerciseData, i: number) => (ex.title && ex.title.trim() ? ex.title : `Übung ${i + 1}`);

function LesenTeil1Page() {
  const [exercises, setExercises] = useState<T1ExerciseData[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: exList, error: exErr } = await supabase
          .from("lesen_exercises").select("id, title").eq("teil", 1)
          .order("created_at", { ascending: true }); // import order ≈ PDF order
        if (exErr) throw exErr;
        if (!exList || exList.length === 0) { setLoading(false); return; }

        const full: T1ExerciseData[] = [];
        for (const ex of exList) {
          const [{ data: headlines }, { data: texts }] = await Promise.all([
            supabase.from("lesen_t1_headlines").select("letter, text, is_distractor").eq("exercise_id", ex.id),
            supabase.from("lesen_t1_texts").select("position, title, content").eq("exercise_id", ex.id).order("position"),
          ]);
          full.push({
            id: ex.id, title: ex.title,
            headlines: (headlines ?? []) as T1Headline[],
            texts: ((texts ?? []) as T1Text[]).map((t) => ({ ...t, title: t.title ?? "" })),
          });
        }
        setExercises(full);
      } catch { setError("Übungen konnten nicht geladen werden."); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // ── Detail view with Previous/Next navigation ──
  if (idx !== null && exercises[idx]) {
    const ex = exercises[idx];
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button onClick={() => setIdx(null)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ArrowLeft className="h-4 w-4" /> Übersicht
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setIdx(idx - 1)} disabled={idx === 0}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{idx + 1} / {exercises.length}</span>
            <button onClick={() => setIdx(idx + 1)} disabled={idx === exercises.length - 1}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">{titleOf(ex, idx)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lesen · Teil 1 — Schlagzeilen zuordnen</p>
        </div>
        <Teil1Exercise key={ex.id} exercise={ex} onComplete={(s, t) => console.log("T1 score", s, t)} />
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
        <span className="text-foreground font-semibold">Lesen Teil 1</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Lesen — Teil 1</h1>
        <p className="text-sm text-muted-foreground mt-1">Überschriften den Texten zuordnen · 5 Texte · Schlagzeilen A–J</p>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Strategie</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Lesen Sie zuerst alle Überschriften, bevor Sie die Texte lesen.</li>
              <li>Suchen Sie nach Schlüsselwörtern in der Überschrift und im Text.</li>
              <li>Achtung: Es gibt mehr Überschriften als Texte — fünf bleiben übrig.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading && <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" /><p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}
        {!loading && !error && exercises.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <div><p className="text-sm font-semibold text-foreground">Noch keine Übungen verfügbar</p></div>
          </div>
        )}
        {!loading && !error && exercises.map((ex, i) => (
          <button key={ex.id} onClick={() => setIdx(i)}
            className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-600 dark:text-blue-400">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{titleOf(ex, i)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ex.texts.length} Texte · {ex.headlines.length} Schlagzeilen</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

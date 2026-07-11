import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, BookOpen, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, useLevelSegment, enforceLevel } from "@/lib/useActiveLevel";
import { SBTeil2Exercise, type SBT2ExerciseData } from "@/components/exercise/sprachbausteine/SBTeil2Exercise";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/sprachbausteine/teil-2")({
  component: SBTeil2Page,
});

// Overview list item (order = official PDF position).
interface ExMeta { id: string; title: string; level?: string | null }

const titleOf = (ex: ExMeta, i: number) => (ex.title && ex.title.trim() ? ex.title : `Übung ${i + 1}`);

function SBTeil2Page() {
  const level = useActiveLevel();
  const seg = useLevelSegment();
  const [list, setList] = useState<ExMeta[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lazy cache of fully-loaded exercises (passage + words) keyed by id.
  const [cache, setCache] = useState<Record<string, SBT2ExerciseData>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!level) return;
    const lvl = level;
    async function load() {
      const { data: exList, error: exErr } = await supabase
        .from("sb_exercises")
        .select("id, title, level")
        .eq("teil", 2)
        .eq("level", lvl)
        .order("position", { ascending: true }); // official PDF order
      if (exErr) { setError(exErr.message); setLoading(false); return; }
      setList(enforceLevel((exList ?? []) as ExMeta[], lvl));
      setLoading(false);
    }
    load();
  }, [level]);

  async function openExercise(i: number) {
    const meta = list[i];
    setIdx(i);
    if (cache[meta.id]) return;
    setDetailLoading(true);
    const [passageRes, wordsRes] = await Promise.all([
      supabase.from("sb_t2_passages").select("passage").eq("exercise_id", meta.id).single(),
      supabase.from("sb_t2_words").select("word_number, word").eq("exercise_id", meta.id).order("word_number"),
    ]);
    if (passageRes.error || wordsRes.error) {
      setError((passageRes.error ?? wordsRes.error)?.message ?? "Load failed");
      setDetailLoading(false);
      return;
    }
    setCache((prev) => ({
      ...prev,
      [meta.id]: { id: meta.id, title: meta.title, passage: passageRes.data?.passage ?? "", words: wordsRes.data ?? [] },
    }));
    setDetailLoading(false);
  }

  // ── Detail view with Previous/Next navigation ──
  if (idx !== null && list[idx]) {
    const meta = list[idx];
    const ex = cache[meta.id];
    return (
      <div className="mx-auto max-w-5xl pb-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button onClick={() => setIdx(null)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ArrowLeft className="h-4 w-4" /> Übersicht
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => openExercise(idx - 1)} disabled={idx === 0}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{idx + 1} / {list.length}</span>
            <button onClick={() => openExercise(idx + 1)} disabled={idx === list.length - 1}
              className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-foreground">{titleOf(meta, idx)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sprachbausteine · Teil 2 — Lückentext (gemeinsame Wortliste)</p>
        </div>
        {ex && !detailLoading
          ? <SBTeil2Exercise key={ex.id} exercise={ex} />
          : <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to={`/${seg}/schriftlich` as never} className="hover:text-foreground">Schriftlich</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/${seg}/schriftlich/vorbereitung` as never} className="hover:text-foreground">Vorbereitung</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold">Sprachbausteine Teil 2</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Sprachbausteine — Teil 2</h1>
        <p className="text-sm text-muted-foreground mt-1">Lückentext · das richtige Wort aus der Wortliste wählen · Aufgaben 31–40</p>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Strategie</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Lesen Sie zuerst den ganzen Text, um den Zusammenhang zu verstehen.</li>
              <li>Klicken Sie auf eine Lücke und wählen Sie das passende Wort aus der Wortliste.</li>
              <li>Jedes Wort passt nur in eine Lücke und kann nur einmal verwendet werden — es gibt mehr Wörter als Lücken.</li>
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
        {!loading && !error && list.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <div><p className="text-sm font-semibold text-foreground">Noch keine Übungen verfügbar</p></div>
          </div>
        )}
        {!loading && !error && list.map((ex, i) => (
          <button key={ex.id} onClick={() => openExercise(i)}
            className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-600 dark:text-blue-400">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{titleOf(ex, i)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Lückentext · Aufgaben 31–40</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

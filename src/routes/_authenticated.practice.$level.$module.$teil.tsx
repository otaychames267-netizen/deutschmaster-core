import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPublishedExercises } from "@/lib/exercises/exercises.functions";
import { ExerciseSession, groupByPassage, deriveGroupTitles } from "@/components/exercise/ExerciseSession";
import type { ExerciseDTO } from "@/components/exercise/ExerciseRunner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/practice/$level/$module/$teil")({
  head: () => ({ meta: [{ title: "Übung — Lingovia" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "exam" ? "exam" : "practice") as "practice" | "exam",
    text: typeof s.text === "number" ? s.text : (typeof s.text === "string" && s.text !== "" ? Number(s.text) : undefined),
  }),
  component: PracticePage,
});

function PracticePage() {
  const { level, module, teil } = Route.useParams();
  const { mode, text } = Route.useSearch();
  const lv = (level === "b1" ? "b1" : "b2") as "b1" | "b2";
  const mod = module as "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
  const t = Math.max(1, parseInt(teil, 10) || 1);
  const backTo = mod === "muendlich" ? "/muendlich/vorbereitung" : "/schriftlich/vorbereitung";
  const moduleLabel = ({
    lesen: "Lesen", sprachbausteine: "Sprachbausteine", hoeren: "Hören", schreiben: "Schreiben", muendlich: "Mündlich",
  } as const)[mod];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        {typeof text === "number" ? (
          <Button asChild variant="ghost" size="sm">
            <Link to="/practice/$level/$module/$teil" params={{ level, module, teil }} search={{ mode }}>
              <ArrowLeft className="size-4 mr-1" /> Bibliothek
            </Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link to={backTo}><ArrowLeft className="size-4 mr-1" /> Zurück</Link>
          </Button>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{lv.toUpperCase()} · {moduleLabel} · Teil {t}</span>
          <div className="flex rounded-md border overflow-hidden">
            <Link
              to="/practice/$level/$module/$teil"
              params={{ level, module, teil }}
              search={(prev: Record<string, unknown>) => ({ ...prev, mode: "practice" as const })}
              className={`px-2 py-1 text-xs ${mode === "practice" ? "bg-primary text-primary-foreground" : "hover:bg-accent/40"}`}
            >Übung</Link>
            <Link
              to="/practice/$level/$module/$teil"
              params={{ level, module, teil }}
              search={(prev: Record<string, unknown>) => ({ ...prev, mode: "exam" as const })}
              className={`px-2 py-1 text-xs ${mode === "exam" ? "bg-primary text-primary-foreground" : "hover:bg-accent/40"}`}
            >Prüfung</Link>
          </div>
        </div>
      </div>
      {typeof text === "number" ? (
        <ExerciseSession level={lv} module={mod} teil={t} mode={mode} passageIndex={text} />
      ) : (
        <ExerciseLibrary level={lv} module={mod} teil={t} moduleLabel={moduleLabel} />
      )}
    </div>
  );
}

function ExerciseLibrary({
  level, module, teil, moduleLabel,
}: { level: "b1" | "b2"; module: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich"; teil: number; moduleLabel: string }) {
  const list = useServerFn(listPublishedExercises);
  const listRef = useRef(list);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ExerciseDTO[][]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [collectionLabels, setCollectionLabels] = useState<(string | null)[]>([]);

  useEffect(() => { listRef.current = list; }, [list]);
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    listRef.current({ data: { level, module, teil } })
      .then((r) => {
        if (cancel) return;
        const exs = r.exercises as ExerciseDTO[];
        const cols = (r as any).collections as Record<string, { id: string; title: string }> | undefined;
        const g = groupByPassage(exs);
        setGroups(g);
        setTitles(deriveGroupTitles(g));
        // For each group, take the collection of its first exercise.
        const labels = g.map((grp) => {
          const cid = (grp[0] as any)?.collection_id as string | null | undefined;
          return cid && cols?.[cid]?.title ? cols[cid].title : null;
        });
        setCollectionLabels(labels);
      })
      .catch(() => {})
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [level, module, teil]);

  if (loading) {
    return (
      <Card><CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Bibliothek wird geladen…
      </CardContent></Card>
    );
  }
  if (groups.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
        Noch keine Texte für diesen Teil veröffentlicht.
      </CardContent></Card>
    );
  }

  // Group the groups by collection title for the rendered library.
  const byCollection = new Map<string, number[]>();
  groups.forEach((_, i) => {
    const key = collectionLabels[i] ?? "__ungrouped__";
    if (!byCollection.has(key)) byCollection.set(key, []);
    byCollection.get(key)!.push(i);
  });

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">{level.toUpperCase()} · {moduleLabel} · Teil {teil}</h1>
        <p className="text-sm text-muted-foreground">Wähle einen Text, um die zugehörigen Aufgaben zu öffnen.</p>
      </div>
      {Array.from(byCollection.entries()).map(([label, indices]) => (
        <div key={label} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mt-4">
            <span>📚</span>
            <span>{label === "__ungrouped__" ? "Ohne Sammlung" : label}</span>
            <span className="text-xs font-normal">({indices.length})</span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {indices.map((i) => {
              const g = groups[i];
              return (
                <Link
                  key={i}
                  to="/practice/$level/$module/$teil"
                  params={{ level, module: module as string, teil: String(teil) }}
                  search={(prev: Record<string, unknown>) => ({ mode: (prev?.mode ?? "practice") as "practice" | "exam", text: i })}
                  className="group rounded-md border bg-card p-4 text-left transition hover:border-primary hover:bg-accent/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md border bg-muted/40 p-2 group-hover:bg-primary/10">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-tight line-clamp-2">{titles[i] ?? `Text ${i + 1}`}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {g.length} Aufgabe{g.length === 1 ? "" : "n"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, BookOpen, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, useLevelSegment, enforceLevel } from "@/lib/useActiveLevel";
import { useHasPlanAccess, useExerciseCatalog } from "@/lib/useContentAccess";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PaywallModal } from "@/components/PaywallModal";
import { NoticeGroupBanner } from "@/components/NoticeGroupBanner";
import { orderWithNoticeGroup } from "@/lib/notice-group";
import { Teil3Exercise, type T3ExerciseData, type T3Situation, type T3Text } from "@/components/exercise/lesen/Teil3Exercise";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/lesen/teil-3")({
  component: LesenTeil3Page,
});

function LesenTeil3Page() {
  const level = useActiveLevel();
  const seg = useLevelSegment();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess();
  const catalog = useExerciseCatalog("lesen", level, 3);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"locked" | "sample-complete">("locked");
  const [exercises, setExercises] = useState<Array<{ meta: { id: string; title: string }; data: T3ExerciseData }>>([]);
  const [flaggedStartIndex, setFlaggedStartIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<T3ExerciseData | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!level) return;
    const lvl = level;
    async function load() {
      try {
        const { data: exListRaw, error: exErr } = await supabase
          .from("lesen_exercises")
          .select("id, title, level, import_notes")
          .eq("teil", 3)
          .eq("level", lvl)
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true });
        if (exErr) throw exErr;
        const enforced = enforceLevel(exListRaw, lvl);
        const { ordered: exList, flaggedStartIndex: fsi } = orderWithNoticeGroup(enforced);
        setFlaggedStartIndex(fsi);
        if (exList.length === 0) { setLoading(false); return; }

        const full = [];
        for (const ex of exList) {
          const [{ data: situations }, { data: texts }] = await Promise.all([
            // Do NOT select correct_letter / no_match — answers checked server-side via score_lesen_t3()
            supabase.from("lesen_t3_situations").select("number, description").eq("exercise_id", ex.id).order("number"),
            supabase.from("lesen_t3_texts").select("letter, title, content").eq("exercise_id", ex.id).order("letter"),
          ]);
          full.push({
            meta: ex,
            data: {
              id: ex.id,
              situations: (situations ?? []) as T3Situation[],
              texts: ((texts ?? []) as T3Text[]).map(t => ({ ...t, title: t.title ?? "" })),
            },
          });
        }
        setExercises(full);
      } catch {
        setError("Exercises could not be loaded. Try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [level]);

  if (accessLoading || (hasAccess === false && catalog.loading)) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  // Non-subscribers: the direct fetch above is RLS-scoped server-side, so
  // `exercises` naturally contains ONLY the flagged free-sample rows for a
  // non-subscriber (real, fully interactive). The rest is a locked row list.
  const lockedRemainder = hasAccess === false
    ? catalog.items.filter((c) => !exercises.some((e) => e.meta.id === c.id))
    : [];

  if (selected) {
    return (
      <div className="mx-auto max-w-5xl pb-10">
        <button onClick={() => setSelected(null)}
          className="mb-5 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </button>
        <div className="mb-6">
          {hasAccess === false && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" /> FREE SAMPLE
            </span>
          )}
          <h1 className="text-2xl font-black text-foreground">{selectedTitle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lesen · Teil 3 — Situationen + Anzeigen zuordnen</p>
        </div>
        <Teil3Exercise
          exercise={selected}
          onComplete={hasAccess === false ? () => { setPaywallReason("sample-complete"); setPaywallOpen(true); } : undefined}
        />
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} reason={paywallReason} />
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
        <span className="text-foreground font-semibold">Lesen Teil 3</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Lesen — Teil 3</h1>
        <p className="text-sm text-muted-foreground mt-1">Situationen + Anzeigen zuordnen · 10 Situationen · 12 Texte (A–L) · X = keine Übereinstimmung</p>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Strategie</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Lesen Sie zuerst die Situation, dann die Anzeigen.</li>
              <li>Suchen Sie nach thematischen Übereinstimmungen, nicht nach einzelnen Wörtern.</li>
              <li>Für zwei Situationen gibt es keine passende Anzeige — wählen Sie X.</li>
              <li>Jede Anzeige kann nur einmal zugeordnet werden.</li>
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
        {exercises.slice(0, flaggedStartIndex ?? exercises.length).map(({ meta, data }) => (
          <button key={meta.id} onClick={() => { setSelected(data); setSelectedTitle(meta.title); }}
            className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{meta.title}</p>
                {hasAccess === false && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" /> FREE
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{data.situations.length} Situationen · {data.texts.length} Anzeigen</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
        {flaggedStartIndex !== null && flaggedStartIndex < exercises.length && (
          <>
            <NoticeGroupBanner />
            {exercises.slice(flaggedStartIndex).map(({ meta, data }) => (
              <button key={meta.id} onClick={() => { setSelected(data); setSelectedTitle(meta.title); }}
                className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/3 group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{meta.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{data.situations.length} Situationen · {data.texts.length} Anzeigen</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </>
        )}
      </div>

      {lockedRemainder.length > 0 && (
        <LockedExerciseOverview heading="" items={lockedRemainder} compact />
      )}

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} reason={paywallReason} />
    </div>
  );
}

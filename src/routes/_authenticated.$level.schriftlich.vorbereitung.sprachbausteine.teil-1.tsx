import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, BookOpen, AlertCircle, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, useLevelSegment, enforceLevel } from "@/lib/useActiveLevel";
import { useHasPlanAccess, useExerciseCatalog } from "@/lib/useContentAccess";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PaywallModal } from "@/components/PaywallModal";
import { NoticeGroupBanner } from "@/components/NoticeGroupBanner";
import { orderWithNoticeGroup } from "@/lib/notice-group";
import { SBTeil1Exercise, type SBT1ExerciseData, type SBT1Gap } from "@/components/exercise/sprachbausteine/SBTeil1Exercise";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/sprachbausteine/teil-1")({
  component: SBTeil1Page,
});

// Overview list item (order = official PDF position).
interface ExMeta { id: string; title: string; level?: string | null; import_notes?: string | null }

// The student gaps view exposes nullable columns; coerce to the component's shape.
function toGaps(rows: { gap_number: number | null; option_a: string | null; option_b: string | null; option_c: string | null }[] | null): SBT1Gap[] {
  return (rows ?? []).map((g) => ({ gap_number: g.gap_number ?? 0, option_a: g.option_a ?? "", option_b: g.option_b ?? "", option_c: g.option_c ?? "" }));
}

const titleOf = (ex: ExMeta, i: number) => (ex.title && ex.title.trim() ? ex.title : `Übung ${i + 1}`);

function SBTeil1Page() {
  const level = useActiveLevel();
  const seg = useLevelSegment();
  const [list, setList] = useState<ExMeta[]>([]);
  const [flaggedStartIndex, setFlaggedStartIndex] = useState<number | null>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lazy cache of fully-loaded exercises (passage + gaps) keyed by id.
  const [cache, setCache] = useState<Record<string, SBT1ExerciseData>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!level) return;
    const lvl = level;
    async function load() {
      const { data: exList, error: exErr } = await supabase
        .from("sb_exercises")
        .select("id, title, level, import_notes")
        .eq("teil", 1)
        .eq("level", lvl)
        .order("position", { ascending: true }); // official PDF order
      if (exErr) { setError(exErr.message); setLoading(false); return; }
      const enforced = enforceLevel((exList ?? []) as ExMeta[], lvl);
      const { ordered, flaggedStartIndex: fsi } = orderWithNoticeGroup(enforced);
      setList(ordered);
      setFlaggedStartIndex(fsi);
      setLoading(false);
    }
    load();
  }, [level]);

  async function openExercise(i: number) {
    const meta = list[i];
    setIdx(i);
    if (cache[meta.id]) return;
    setDetailLoading(true);
    const [passageRes, gapsRes] = await Promise.all([
      supabase.from("sb_t1_passages").select("passage").eq("exercise_id", meta.id).single(),
      supabase.from("sb_t1_gaps_student").select("gap_number, option_a, option_b, option_c").eq("exercise_id", meta.id).order("gap_number"),
    ]);
    if (passageRes.error || gapsRes.error) {
      setError((passageRes.error ?? gapsRes.error)?.message ?? "Load failed");
      setDetailLoading(false);
      return;
    }
    setCache((prev) => ({
      ...prev,
      [meta.id]: { id: meta.id, title: meta.title, passage: passageRes.data?.passage ?? "", gaps: toGaps(gapsRes.data) },
    }));
    setDetailLoading(false);
  }

  // ── Detail view with Previous/Next navigation ──
  const { hasAccess, loading: accessLoading } = useHasPlanAccess();
  const catalog = useExerciseCatalog("sprachbausteine", level, 1);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"locked" | "sample-complete">("locked");
  if (accessLoading || (hasAccess === false && catalog.loading)) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  // Non-subscribers: the list fetch above is RLS-scoped server-side, so
  // `list` naturally contains ONLY the flagged free-sample rows for a
  // non-subscriber (real, fully interactive). Everything else is a locked row.
  const lockedRemainder = hasAccess === false
    ? catalog.items.filter((c) => !list.some((l) => l.id === c.id))
    : [];

  if (idx !== null && list[idx]) {
    const meta = list[idx];
    const ex = cache[meta.id];
    return (
      <div className="mx-auto max-w-4xl pb-10">
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
          {hasAccess === false && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" /> FREE SAMPLE
            </span>
          )}
          <h1 className="text-2xl font-black text-foreground">{titleOf(meta, idx)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sprachbausteine · Teil 1 — Lückentext (A, B oder C)</p>
        </div>
        {ex && !detailLoading
          ? (
            <SBTeil1Exercise
              key={ex.id}
              exercise={ex}
              onComplete={hasAccess === false ? () => { setPaywallReason("sample-complete"); setPaywallOpen(true); } : undefined}
            />
          )
          : <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}
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
        <span className="text-foreground font-semibold">Sprachbausteine Teil 1</span>
      </div>

      <div>
        <h1 className="text-2xl font-black text-foreground">Sprachbausteine — Teil 1</h1>
        <p className="text-sm text-muted-foreground mt-1">Lückentext · die richtige Option (A, B oder C) wählen · Aufgaben 21–30</p>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Strategie</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Lesen Sie zuerst den ganzen Text, um den Zusammenhang zu verstehen.</li>
              <li>Klicken Sie auf eine Lücke und wählen Sie A, B oder C.</li>
              <li>Mit „Lösung anzeigen" können Sie die richtigen Antworten überprüfen.</li>
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
        {!loading && !error && list.slice(0, flaggedStartIndex ?? list.length).map((ex, i) => (
          <button key={ex.id} onClick={() => openExercise(i)}
            className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-black text-blue-600 dark:text-blue-400">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground truncate">{titleOf(ex, i)}</p>
                {hasAccess === false && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" /> FREE
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Lückentext · Aufgaben 21–30</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
        {!loading && !error && flaggedStartIndex !== null && flaggedStartIndex < list.length && (
          <>
            <NoticeGroupBanner />
            {list.slice(flaggedStartIndex).map((ex, i) => (
              <button key={ex.id} onClick={() => openExercise(flaggedStartIndex + i)}
                className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-sm font-black text-amber-600 dark:text-amber-400">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{titleOf(ex, flaggedStartIndex + i)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lückentext · Aufgaben 21–30</p>
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

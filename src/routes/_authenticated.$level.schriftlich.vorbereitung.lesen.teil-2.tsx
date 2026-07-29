import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, BookOpen, AlertCircle, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, useLevelSegment, enforceLevel } from "@/lib/useActiveLevel";
import { useHasPlanAccess, useExerciseCatalog } from "@/lib/useContentAccess";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PaywallModal } from "@/components/PaywallModal";
import { NoticeGroupBanner } from "@/components/NoticeGroupBanner";
import { orderWithNoticeGroup } from "@/lib/notice-group";
import { Teil2Exercise, type T2ExerciseData } from "@/components/exercise/lesen/Teil2Exercise";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/lesen/teil-2")({
  component: LesenTeil2Page,
});

/** Lightweight list row — no passage/questions fetched until an exercise is opened. */
interface T2Summary {
  id: string;
  title: string;
  questionCount: number;
}

function LesenTeil2Page() {
  const level = useActiveLevel();
  const seg = useLevelSegment();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess();
  const catalog = useExerciseCatalog("lesen", level, 2);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"locked" | "sample-complete">("locked");
  const [summaries, setSummaries]     = useState<T2Summary[]>([]);
  const [flaggedStartIndex, setFlaggedStartIndex] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError]     = useState(false);

  const [selected, setSelected]       = useState<T2Summary | null>(null);
  const [detail, setDetail]           = useState<T2ExerciseData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  // ── Load the exercise list only (id + title + question count) ──────────────
  const loadList = useCallback(async () => {
    if (!level) return;
    setListLoading(true);
    setListError(false);
    try {
      const { data: exListRaw, error: exErr } = await supabase
        .from("lesen_exercises")
        .select("id, title, level, import_notes")
        .eq("teil", 2)
        .eq("level", level)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (exErr) throw exErr;
      const enforced = enforceLevel(exListRaw, level);
      const { ordered: exList, flaggedStartIndex: fsi } = orderWithNoticeGroup(enforced);
      setFlaggedStartIndex(fsi);

      const ids = (exList ?? []).map((e) => e.id);
      const counts = new Map<string, number>();
      if (ids.length > 0) {
        // Single query for all counts — avoids the previous N+1 per-exercise fetch.
        const { data: qrows, error: qErr } = await supabase
          .from("lesen_t2_questions")
          .select("exercise_id")
          .in("exercise_id", ids);
        if (qErr) throw qErr;
        for (const row of qrows ?? []) {
          counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
        }
      }

      setSummaries(
        (exList ?? []).map((e) => ({ id: e.id, title: e.title, questionCount: counts.get(e.id) ?? 0 })),
      );
    } catch {
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [level]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ── Load one exercise's full content on demand ─────────────────────────────
  const openExercise = useCallback(async (summary: T2Summary) => {
    setSelected(summary);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(true);
    try {
      const [{ data: passage, error: pErr }, { data: questions, error: qErr }] = await Promise.all([
        supabase.from("lesen_t2_passages").select("passage").eq("exercise_id", summary.id).single(),
        // Do NOT select `correct` — answers are checked server-side via score_lesen_t2()
        supabase
          .from("lesen_t2_questions")
          .select("number, question, option_a, option_b, option_c")
          .eq("exercise_id", summary.id)
          .order("number"),
      ]);
      if (pErr) throw pErr;
      if (qErr) throw qErr;
      setDetail({
        id: summary.id,
        title: summary.title,
        passage: passage?.passage ?? "",
        questions: (questions ?? []) as T2ExerciseData["questions"],
      });
    } catch {
      setDetailError(true);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function backToList() {
    setSelected(null);
    setDetail(null);
    setDetailError(false);
  }

  // Non-subscribers: the list fetch above is RLS-scoped server-side, so
  // `summaries` naturally contains ONLY the flagged free-sample rows for a
  // non-subscriber (real, fully interactive — openExercise() succeeds for
  // them too). Everything else the catalog knows about is a locked row.
  if (accessLoading || (hasAccess === false && catalog.loading)) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  const lockedRemainder = hasAccess === false
    ? catalog.items.filter((c) => !summaries.some((s) => s.id === c.id))
    : [];

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="mx-auto max-w-6xl pb-10">
        <button onClick={backToList}
          className="mb-5 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </button>
        <div className="mb-6">
          {hasAccess === false && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" /> FREE SAMPLE
            </span>
          )}
          <h1 className="text-2xl font-black text-foreground">{selected.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lesen · Teil 2 — Längerer Text + Multiple Choice</p>
        </div>

        {detailLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {detailError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-700 dark:text-rose-300">Die Übung konnte nicht geladen werden.</p>
            </div>
            <button onClick={() => openExercise(selected)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Erneut versuchen
            </button>
          </div>
        )}

        {detail && (
          <Teil2Exercise
            exercise={detail}
            onComplete={hasAccess === false ? () => { setPaywallReason("sample-complete"); setPaywallOpen(true); } : undefined}
          />
        )}
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} reason={paywallReason} />
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to={`/${seg}/schriftlich` as never} className="hover:text-foreground">Schriftlich</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/${seg}/schriftlich/vorbereitung` as never} className="hover:text-foreground">Vorbereitung</Link>
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
        {listLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {listError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
              <p className="text-sm text-rose-700 dark:text-rose-300">Übungen konnten nicht geladen werden.</p>
            </div>
            <button onClick={loadList}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Erneut versuchen
            </button>
          </div>
        )}

        {!listLoading && !listError && summaries.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-semibold text-foreground">Noch keine Übungen verfügbar</p>
              <p className="text-xs text-muted-foreground mt-0.5">Der Administrator muss zuerst Übungen importieren.</p>
            </div>
          </div>
        )}

        {!listLoading && !listError && summaries.slice(0, flaggedStartIndex ?? summaries.length).map((ex) => (
          <button key={ex.id} onClick={() => openExercise(ex)}
            className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{ex.title}</p>
                {hasAccess === false && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" /> FREE
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{ex.questionCount} Fragen · Multiple Choice (a/b/c)</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
        {!listLoading && !listError && flaggedStartIndex !== null && flaggedStartIndex < summaries.length && (
          <>
            <NoticeGroupBanner />
            {summaries.slice(flaggedStartIndex).map((ex) => (
              <button key={ex.id} onClick={() => openExercise(ex)}
                className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-blue-500/30 hover:bg-blue-500/3 group">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{ex.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ex.questionCount} Fragen · Multiple Choice (a/b/c)</p>
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

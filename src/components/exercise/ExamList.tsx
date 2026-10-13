import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import {
  BookOpen, Clock, ChevronRight, FileQuestion,
  CheckCircle2, Lock, Play, Sparkles,
} from "lucide-react";

interface Exam {
  id: string;
  title: string;
  display_order: number;
  metadata: Record<string, unknown>;
  status: string;
  level?: string | null;
  is_free_sample?: boolean;
}

interface ExamListProps {
  section: string;
  teil?: string;
  examType?: "vorbereitung" | "simulation";
  metadataCategory?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onSelect: (exam: Exam) => void;
  /** Access decision AND display flag: badges free-sample cards, and gates
   *  the click handler below — a non-subscriber can never open a non-free
   *  card from here, even if `exams` is briefly stale (see the fetch effect's
   *  `hasAccess` dependency). The real backstop is still RLS server-side. */
  hasAccess?: boolean | null;
  /** Called instead of `onSelect` when a card is locked for the current
   *  viewer (hasAccess === false and the exam isn't a free sample) — the
   *  caller should show the subscription paywall, never open the exercise. */
  onLockedAction?: () => void;
  /** Reports the fetched (RLS-scoped) exam list back to the parent, so it can
   *  compute the locked remainder from its own titles-only catalog. */
  onLoaded?: (exams: Exam[]) => void;
}

function estimateMinutes(metadata: Record<string, unknown>): number {
  return (metadata.estimated_minutes as number) ?? 15;
}

function difficultyLabel(metadata: Record<string, unknown>): string {
  return (metadata.difficulty as string) ?? "Standard";
}

export function ExamList({
  section,
  teil,
  examType = "vorbereitung",
  metadataCategory,
  emptyTitle = "No exercises available yet",
  emptyDescription = "Exercises for this section will appear here once the admin imports the content via the PDF Import system.",
  onSelect,
  hasAccess,
  onLockedAction,
  onLoaded,
}: ExamListProps) {
  const level = useActiveLevel();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempted, setAttempted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!level) return;
    const activeLevel = level;

    async function load() {
      setLoading(true);

      let q = supabase
        .from("exams")
        .select("id, title, display_order, metadata, status, level, is_free_sample")
        .eq("level", activeLevel)
        .eq("section", section as "muendlich" | "lesen" | "hoeren" | "sprachbausteine" | "schreiben")
        .eq("exam_type", examType as "vorbereitung" | "simulation")
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (teil) q = q.eq("teil", teil as "teil_1" | "teil_2" | "teil_3");
      if (metadataCategory) q = q.eq("metadata->>category", metadataCategory);

      const { data } = await q;
      // is_free_sample was added to `exams` after the last generated-types
      // refresh — cast through unknown, same as elsewhere in this codebase
      // for columns/RPCs ahead of the checked-in Supabase types.
      const safeExams = enforceLevel((data as unknown as Exam[]) ?? [], activeLevel);
      setExams(safeExams);
      onLoaded?.(safeExams);

      // Fetch which exams this user has already attempted
      if (safeExams.length > 0) {
        const ids = safeExams.map((e) => e.id);
        const { data: sessions } = await supabase
          .from("attempt_sessions")
          .select("exam_id")
          .in("exam_id", ids)
          .eq("status", "submitted");
        if (sessions) {
          setAttempted(new Set(sessions.map((s) => s.exam_id as string)));
        }
      }

      setLoading(false);
    }

    load();
    // `hasAccess` is intentionally a dependency, even though it's not read
    // inside `load()`: the query above is RLS-scoped server-side, so its
    // actual result set changes the instant the viewer's subscription state
    // changes (e.g. useHasPlanAccess's 20s poll detects a mid-session
    // expiry). Without re-running this effect, `exams` would keep showing
    // the stale, pre-expiry full list — the same class of bug already fixed
    // for the Lesen/Hören/Sprachbausteine catalog pages (see
    // feedback-verify-extraction-at-scale / entitlement-hardening memory).
  }, [level, section, teil, examType, hasAccess]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FileQuestion className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">{emptyTitle}</p>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => {
        const done = attempted.has(exam.id);
        // Defense in depth: RLS already scopes `exams` to only rows this
        // viewer may read, but a card can still be briefly stale between a
        // mid-session expiry and this effect's re-fetch (network latency,
        // the 20s access-poll interval). Never open the player for a locked
        // card on the client either — show the paywall instead.
        const locked = hasAccess === false && !exam.is_free_sample;
        return (
          <button
            key={exam.id}
            onClick={() => (locked ? onLockedAction?.() : onSelect(exam))}
            className={`group relative flex flex-col gap-4 rounded-2xl border p-5 text-left shadow-sm transition-all ${
              locked
                ? "border-border/60 bg-card/60 opacity-75 hover:border-amber-500/40"
                : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            }`}
          >
            {done && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Done
              </span>
            )}
            {!done && hasAccess === false && exam.is_free_sample && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3 w-3" /> FREE SAMPLE
              </span>
            )}
            {locked && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1">
              <p className="font-semibold text-foreground leading-snug">{exam.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{difficultyLabel(exam.metadata)}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                ~{estimateMinutes(exam.metadata)} min
              </span>
              <span className={`flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${locked ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>
                {locked ? <><Lock className="h-3.5 w-3.5" /> Unlock</> : <><Play className="h-3.5 w-3.5" /> Start</>}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

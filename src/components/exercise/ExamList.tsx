import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserLevel } from "@/lib/auth";
import {
  BookOpen, Clock, ChevronRight, FileQuestion,
  CheckCircle2, Lock, Play,
} from "lucide-react";

interface Exam {
  id: string;
  title: string;
  display_order: number;
  metadata: Record<string, unknown>;
  status: string;
}

interface ExamListProps {
  section: string;
  teil?: string;
  examType?: "vorbereitung" | "simulation";
  emptyTitle?: string;
  emptyDescription?: string;
  onSelect: (exam: Exam) => void;
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
  emptyTitle = "No exercises available yet",
  emptyDescription = "Exercises for this section will appear here once the admin imports the content via the PDF Import system.",
  onSelect,
}: ExamListProps) {
  const { level } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempted, setAttempted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!level) return;

    async function load() {
      setLoading(true);

      let q = supabase
        .from("exams")
        .select("id, title, display_order, metadata, status")
        .eq("level", level as UserLevel)
        .eq("section", section)
        .eq("exam_type", examType)
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (teil) q = q.eq("teil", teil);

      const { data } = await q;
      setExams((data as Exam[]) ?? []);

      // Fetch which exams this user has already attempted
      if (data && data.length > 0) {
        const ids = data.map((e) => e.id);
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
  }, [level, section, teil, examType]);

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
        return (
          <button
            key={exam.id}
            onClick={() => onSelect(exam)}
            className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            {done && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Done
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
              <span className="flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-3.5 w-3.5" /> Start
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { ArrowLeft, Clock, BookOpen, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ExamList } from "./ExamList";
import { ExercisePlayer } from "./ExercisePlayer";
import { useTrackLesson } from "@/lib/useLastLesson";

interface SelectedExam {
  id: string;
  title: string;
}

interface VorbereitungPageProps {
  title: string;
  subtitle: string;
  section: string;
  teil?: string;
  tips?: string[];
  backTo?: string;
  backLabel?: string;
  xpReward?: number;
  estimatedTime?: string;
}

const SECTION_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  lesen:           { color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  hoeren:          { color: "text-violet-500",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
  sprachbausteine: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  schreiben:       { color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
};

export function VorbereitungPage({
  title,
  subtitle,
  section,
  teil,
  tips,
  backTo = "/schriftlich/vorbereitung",
  backLabel = "Schriftlich Vorbereitung",
  xpReward = 50,
  estimatedTime = "15–25 min",
}: VorbereitungPageProps) {
  const [active, setActive] = useState<SelectedExam | null>(null);
  useTrackLesson();

  const sc = SECTION_COLORS[section] ?? { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };

  if (active) {
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <button
          onClick={() => setActive(null)}
          className="mb-5 flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to exercises
        </button>
        <ExercisePlayer
          examId={active.id}
          examTitle={active.title}
          onClose={() => setActive(null)}
        />
      </div>
    );
  }

  // Parse title parts for breadcrumb
  const [sectionLabel, teilLabel] = title.split(" — ");

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">

      {/* ── Breadcrumb navigation ─────────────────────────────── */}
      <div>
        <Link
          to={backTo as never}
          className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>

        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/schriftlich" className="hover:text-foreground transition-colors">Schriftlich</Link>
          <span>/</span>
          <Link to={backTo as never} className="hover:text-foreground transition-colors">Vorbereitung</Link>
          {sectionLabel && (
            <>
              <span>/</span>
              <span className="font-semibold text-foreground">{sectionLabel}</span>
            </>
          )}
          {teilLabel && (
            <>
              <span>/</span>
              <span className={`font-semibold ${sc.color}`}>{teilLabel}</span>
            </>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Meta pills */}
          <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0 mt-1">
            <span className={`flex items-center gap-1.5 rounded-xl ${sc.bg} ${sc.border} border px-3 py-1 text-xs font-bold ${sc.color}`}>
              <Clock className="h-3 w-3" /> {estimatedTime}
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Zap className="h-3 w-3" /> +{xpReward} XP
            </span>
          </div>
        </div>
      </div>

      {/* ── Tips ─────────────────────────────────────────────── */}
      {tips && tips.length > 0 && (
        <div className={`rounded-2xl border p-5 ${sc.border} bg-gradient-to-br from-${section === "lesen" ? "blue" : section === "hoeren" ? "violet" : section === "schreiben" ? "amber" : "emerald"}-500/5 to-transparent`}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className={`h-4 w-4 ${sc.color}`} />
            <p className={`text-xs font-bold uppercase tracking-widest ${sc.color}`}>Tipps für diese Aufgabe</p>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${sc.bg} text-[10px] font-black ${sc.color} mt-0.5`}>{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Exercise list ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-black text-foreground">Available exercises</p>
          <span className="text-xs text-muted-foreground">Select one to start</span>
        </div>
        <ExamList
          section={section}
          teil={teil}
          onSelect={(exam) => setActive({ id: exam.id, title: exam.title })}
        />
      </div>
    </div>
  );
}

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ExamList } from "./ExamList";
import { ExercisePlayer } from "./ExercisePlayer";

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
}

export function VorbereitungPage({ title, subtitle, section, teil, tips }: VorbereitungPageProps) {
  const [active, setActive] = useState<SelectedExam | null>(null);

  if (active) {
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <button
          onClick={() => setActive(null)}
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Tipps für diese Aufgabe</p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-1.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Exercise list */}
      <div>
        <p className="mb-4 text-sm font-semibold text-foreground">Available exercises</p>
        <ExamList
          section={section}
          teil={teil}
          onSelect={(exam) => setActive({ id: exam.id, title: exam.title })}
        />
      </div>
    </div>
  );
}

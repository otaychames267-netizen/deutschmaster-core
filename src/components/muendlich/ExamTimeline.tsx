import { motion } from "framer-motion";

export type TimelinePhase = "prep" | 1 | 2 | 3 | "done";

const PHASES: { key: TimelinePhase; label: string }[] = [
  { key: "prep", label: "Vorbereitung" },
  { key: 1, label: "Teil 1" },
  { key: 2, label: "Teil 2" },
  { key: 3, label: "Teil 3" },
];

function phaseIndex(p: TimelinePhase) {
  if (p === "done") return PHASES.length;
  return PHASES.findIndex((x) => x.key === p);
}

/** Color shifts from calm (plenty of time) to warm (running low) within the
 * active segment, purely a pacing cue — the countdown numbers remain the
 * authoritative timer, this is not it. */
function segmentColor(fractionRemaining: number) {
  if (fractionRemaining > 0.5) return "bg-emerald-500";
  if (fractionRemaining > 0.2) return "bg-amber-500";
  return "bg-rose-500";
}

export function ExamTimeline({ phase, fractionRemaining = 1 }: { phase: TimelinePhase; fractionRemaining?: number }) {
  const activeIdx = phaseIndex(phase);
  return (
    <div className="flex items-center gap-1.5">
      {PHASES.map((p, i) => {
        const isActive = i === activeIdx;
        const isDone = i < activeIdx;
        return (
          <div key={p.key} className="flex-1">
            <div className="mb-1 flex justify-center">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? "text-foreground" : "text-muted-foreground/50"}`}>{p.label}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              {isDone && <div className="h-full w-full rounded-full bg-emerald-500/70" />}
              {isActive && (
                <motion.div
                  className={`h-full rounded-full transition-colors duration-500 ${segmentColor(fractionRemaining)}`}
                  animate={{ width: `${Math.max(4, fractionRemaining * 100)}%` }}
                  transition={{ ease: "linear", duration: 0.9 }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

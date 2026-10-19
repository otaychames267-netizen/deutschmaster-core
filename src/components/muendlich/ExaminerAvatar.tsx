import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

export type ExaminerState = "connecting" | "listening" | "thinking" | "speaking";

const GLOW: Record<ExaminerState, string> = {
  connecting: "from-muted-foreground/20 to-muted-foreground/5",
  listening: "from-sky-400/30 to-sky-400/5",
  thinking: "from-amber-400/40 to-amber-400/5",
  speaking: "from-rose-500/50 to-rose-500/10",
};

const RING: Record<ExaminerState, string> = {
  connecting: "border-muted-foreground/30",
  listening: "border-sky-400/60",
  thinking: "border-amber-400/70",
  speaking: "border-rose-500/80",
};

/** Circular AI-examiner avatar with a soundwave that reflects the current
 * conversational state. "Thinking" has no dedicated signal from the Gemini
 * Live SDK (only "audio chunk arrived" = speaking) — it's a best-effort
 * client heuristic (see useRelayAudio's aiThinking), so treat it as a UX
 * cue, not an authoritative indicator. */
export function ExaminerAvatar({ state }: { state: ExaminerState }) {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      {/* ambient glow */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--tw-gradient-stops))] ${GLOW[state]} blur-xl`}
        animate={state === "listening" ? { opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] } : { opacity: 0.8, scale: 1.1 }}
        transition={state === "listening" ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
      />

      {/* thinking: rotating ring */}
      {state === "thinking" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/70"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 bg-card transition-colors ${RING[state]}`}>
        {state === "speaking" ? (
          <div className="flex items-end gap-0.5" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-rose-500"
                animate={{ height: [4, 16, 6, 20, 4] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.09 }}
              />
            ))}
          </div>
        ) : (
          <GraduationCap className={`h-7 w-7 ${state === "thinking" ? "text-amber-500" : state === "listening" ? "text-sky-500" : "text-muted-foreground"}`} />
        )}
      </div>
    </div>
  );
}

export const EXAMINER_STATE_LABEL: Record<ExaminerState, string> = {
  connecting: "verbindet…",
  listening: "hört zu",
  thinking: "überlegt…",
  speaking: "spricht…",
};

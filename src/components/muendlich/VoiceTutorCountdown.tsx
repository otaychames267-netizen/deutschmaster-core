import { Clock } from "lucide-react";

const DAILY_CAP_SECONDS = 2700; // 45 minutes — must match deduct_voice_tutor_seconds()'s hardcoded cap

/** Same 50%/20%-remaining color thresholds as ExamTimeline's segmentColor —
 * kept as its own tiny component rather than reusing ExamTimeline, since a
 * free-flowing 1:1 conversation has no Teil/phase concept for that
 * component's PHASES array to represent. The countdown here reflects the
 * server-authoritative `cap_status` message, not a client-side timer that
 * could drift from it. */
function textColor(fractionRemaining: number) {
  if (fractionRemaining > 0.5) return "text-emerald-500";
  if (fractionRemaining > 0.2) return "text-amber-500";
  return "text-rose-500";
}

export function VoiceTutorCountdown({ secondsRemaining }: { secondsRemaining: number | null }) {
  if (secondsRemaining === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /><span>--:--</span>
      </div>
    );
  }
  const clamped = Math.max(0, secondsRemaining);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  const fraction = clamped / DAILY_CAP_SECONDS;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold tabular-nums ${textColor(fraction)}`}>
      <Clock className="h-3.5 w-3.5" />
      <span>{mm}:{ss}</span>
    </div>
  );
}

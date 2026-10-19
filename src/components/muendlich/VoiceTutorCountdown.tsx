import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** A full run (Teil 1 -> 2 -> 3) is state-machine bound and measured at ~14-15 min. */
const EXPECTED_MINUTES = 15;
/** The server's daily cap (45 min, deduct_voice_tutor_seconds) is only a backstop, so it is shown only when it is nearly used up. */
const CAP_WARNING_SECONDS = 300;

/** Elapsed time of THIS session against the real exam length. The old display
 * showed the daily cap ("45:00") from the server's `cap_status`, which read
 * like a 45-minute exam; the cap now only surfaces as a warning when
 * `secondsRemaining` drops under 5 minutes. */
export function VoiceTutorCountdown({ secondsRemaining, running }: { secondsRemaining: number | null; running: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now() - elapsed * 1000;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `elapsed` only seeds the start time on (re)start
  }, [running]);

  if (secondsRemaining !== null && secondsRemaining < CAP_WARNING_SECONDS) {
    const clamped = Math.max(0, secondsRemaining);
    const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
    const ss = String(clamped % 60).padStart(2, "0");
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums text-rose-500" title="Tageskontingent fast aufgebraucht">
        <Clock className="h-3.5 w-3.5" />
        <span>{mm}:{ss}</span>
      </div>
    );
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-muted-foreground" title="Die gesamte Prüfung dauert etwa 15 Minuten">
      <Clock className="h-3.5 w-3.5" />
      <span>{mm}:{ss} · ca. {EXPECTED_MINUTES} Min</span>
    </div>
  );
}

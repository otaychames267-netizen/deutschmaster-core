import { useEffect, useRef, useState } from "react";
import { Mic, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { describeMicError } from "@/lib/muendlich/micError";

/** Pre-flight hardware check shown once before the live exam connection
 * opens (separate from Room 1's own ReadyCheck mic test — this one has a
 * live visual meter so the student can actually see their mic responding
 * right before the AI examiner connection starts). */
export function HardwareCheck({ onConfirm }: { onConfirm: () => void }) {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;

    (async () => {
      setStatus("checking");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(1, avg / 60));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
        setStatus("ok");
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(describeMicError(e));
        setStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [attempt]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl backdrop-blur-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
        <Mic className="h-7 w-7 text-rose-500" />
      </div>
      <div>
        <p className="font-black text-foreground">Hardware-Check</p>
        <p className="mt-1 text-sm text-muted-foreground">Sprechen Sie kurz — der Balken sollte sich bewegen.</p>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-75" style={{ width: `${level * 100}%` }} />
      </div>

      {status === "checking" && <p className="text-xs text-muted-foreground">Mikrofonzugriff wird angefragt…</p>}
      {status === "ok" && <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Mikrofon aktiv</p>}
      {status === "denied" && <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> {errorMessage}</p>}

      {/* Real dead-end found via a professional-experience audit (2026-09-30):
       * a denied/failed mic permission (e.g. the student fumbled the
       * browser's own permission popup) used to just disable "Weiter"
       * forever with zero way to retry after fixing the permission — the
       * only way out was leaving the room entirely. A student can grant the
       * permission after the fact (browser address-bar icon) and just needs
       * a way to ask this component to try again. */}
      {status === "denied" && (
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="flex items-center gap-2 rounded-xl border border-border px-5 py-2 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Erneut versuchen
        </button>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={status === "denied"}
        className="flex items-center gap-2 rounded-2xl bg-rose-500 px-6 py-3 text-sm font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Weiter zur Prüfung <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

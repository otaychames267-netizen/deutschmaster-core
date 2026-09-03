import { useEffect, useRef, useState } from "react";
import { Mic, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

/** Pre-flight hardware check shown once before the live exam connection
 * opens (separate from Room 1's own ReadyCheck mic test — this one has a
 * live visual meter so the student can actually see their mic responding
 * right before the AI examiner connection starts). */
export function HardwareCheck({ onConfirm }: { onConfirm: () => void }) {
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      } catch {
        setStatus("denied");
      }
    })();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, []);

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
      {status === "denied" && <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> Kein Mikrofonzugriff — bitte in den Browser-Einstellungen erlauben und neu laden.</p>}

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

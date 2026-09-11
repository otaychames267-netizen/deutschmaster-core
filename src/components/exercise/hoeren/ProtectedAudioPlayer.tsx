/**
 * Custom audio player for Hören exercises — deliberately not a native
 * `<audio controls>` element, for two reasons:
 *
 * 1. Native controls (Chrome/Edge especially) ship their own "⋮ Download"
 *    menu item — a one-click extraction path that no amount of app-level
 *    protection can suppress, because it's the browser's UI, not ours.
 * 2. The URL never sits in the DOM as a long-lived, directly-fetchable
 *    Supabase Storage link. It's fetched on demand (only when the user
 *    presses play, not prefetched for every card on page load), with a
 *    short-lived (90s) signed URL that's immediately consumed into a Blob
 *    — the `<audio>` element's actual src is a local `blob:` URL, and the
 *    signed URL itself is never written anywhere the DOM/React state can
 *    expose it after that first fetch.
 *
 * Honesty check (same standard as useContentProtection.ts): this raises the
 * bar a long way past "right-click → Save Audio As", but it is not DRM. A
 * determined technical user can still capture decoded audio from a browser
 * tab — that is true of every web-based audio player that exists, licensed
 * DRM included. The real security boundary is still server-side (RLS +
 * short-lived signed URLs); this component's job is to remove the *trivial*
 * extraction paths, not to make extraction theoretically impossible.
 */
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AUDIO_URL_TTL_SECONDS = 90;

async function fetchShortLivedAudioUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("hoeren-audio").createSignedUrl(path, AUDIO_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ProtectedAudioPlayer({ audioPath }: { audioPath: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  async function ensureLoaded(): Promise<boolean> {
    if (status === "ready" || status === "loading") return status === "ready";
    setStatus("loading");
    try {
      const signedUrl = await fetchShortLivedAudioUrl(audioPath);
      if (!signedUrl) throw new Error("no signed url");
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlRef.current = objectUrl;
      if (audioRef.current) audioRef.current.src = objectUrl;
      setStatus("ready");
      return true;
    } catch (e) {
      console.error("Audio load failed:", e);
      setStatus("error");
      return false;
    }
  }

  async function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      return;
    }
    const ok = status === "ready" || (await ensureLoaded());
    if (!ok || !audioRef.current) return;
    audioRef.current.play().catch((e) => console.error("Playback failed:", e));
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !duration || status !== "ready") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 select-none" data-protection-exempt="true">
      {/* Hidden real element — never exposed with `controls`, no native download affordance */}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onContextMenu={(e) => e.preventDefault()}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        disabled={status === "loading" || status === "error"}
        aria-label={isPlaying ? "Pause" : "Abspielen"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {status === "error" ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">Audio konnte nicht geladen werden. Bitte versuche es erneut.</p>
        ) : (
          <div
            onClick={handleSeek}
            className={`group relative h-2 w-full overflow-hidden rounded-full bg-border ${status === "ready" ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground w-[72px] text-right">
        {formatTime(currentTime)} / {duration ? formatTime(duration) : "--:--"}
      </span>

      <button
        type="button"
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          el.muted = !el.muted;
          setMuted(el.muted);
        }}
        aria-label={muted ? "Ton an" : "Stumm"}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * PdfViewer — professional in-app PDF viewer for Mündlich Vorbereitung.
 * Loads a private 'muendlich-pdfs' object via a signed URL and displays it in the
 * browser's native PDF engine (fast, zoom, page-nav, mobile) inside a responsive
 * modal with a fullscreen toggle. Study-only: no exercise/OCR/AI behavior.
 */
import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function PdfViewer({ storagePath, title, onClose }: { storagePath: string; title: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any).storage.from("muendlich-pdfs").createSignedUrl(storagePath, 3600);
      if (!active) return;
      if (error || !data?.signedUrl) setError(error?.message ?? "Could not load PDF");
      else setUrl(data.signedUrl);
    })();
    return () => { active = false; };
  }, [storagePath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function fullscreen() { wrapRef.current?.requestFullscreen?.(); }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm p-2 sm:p-6" onClick={onClose}>
      <div ref={wrapRef} className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="flex-1 truncate text-sm font-bold text-foreground">{title}</span>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Open in new tab"><ExternalLink className="h-4 w-4" /></a>}
          <button onClick={fullscreen} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Fullscreen"><Maximize2 className="h-4 w-4" /></button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Close (Esc)"><X className="h-4 w-4" /></button>
        </div>
        <div className="relative flex-1 bg-neutral-200 dark:bg-neutral-800">
          {error ? (
            <div className="flex h-full items-center justify-center gap-2 text-rose-600"><AlertCircle className="h-5 w-5" />{error}</div>
          ) : !url ? (
            <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin" /></div>
          ) : (
            <iframe title={title} src={`${url}#view=FitH`} className="h-full w-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}

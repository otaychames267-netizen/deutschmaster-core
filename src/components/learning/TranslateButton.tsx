/**
 * "Übersetzen" toggle — click reveals the Arabic translation, click again
 * hides it. The original German text is never touched or replaced. Fetching
 * is the caller's job (via useExerciseTranslation.ensureLoaded), so several
 * TranslateButtons on one page share a single RPC call.
 */
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";

interface Props {
  translation: string | null | undefined;
  loading: boolean;
  onRequest: () => void;
  emptyLabel?: string;
}

export function TranslateButton({ translation, loading, onRequest, emptyLabel }: Props) {
  const [open, setOpen] = useState(false);

  function toggle() {
    if (!open) onRequest();
    setOpen((o) => !o);
  }

  return (
    <div>
      <button
        onClick={toggle}
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/5 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition-colors hover:bg-indigo-500/10"
      >
        {loading && open ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
        {open ? "Übersetzung ausblenden" : "Übersetzen"}
      </button>
      {open && (
        <div className="mt-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5">
          {loading ? (
            <p className="text-xs text-muted-foreground">Wird geladen…</p>
          ) : translation ? (
            <p className="text-sm leading-relaxed text-foreground" dir="rtl">{translation}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{emptyLabel ?? "Für diesen Text ist noch keine Übersetzung verfügbar."}</p>
          )}
        </div>
      )}
    </div>
  );
}

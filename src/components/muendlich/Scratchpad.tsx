import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotebookPen, X } from "lucide-react";

/**
 * Digital scratchpad — a slide-out sidebar for prep/exam notes, mirroring the
 * real telc exam's paper scratch sheet. Persisted to localStorage (not
 * sessionStorage: it should survive a full tab close, not just a refresh)
 * keyed per room+slot so two participants in the same browser profile never
 * collide.
 */
export function Scratchpad({ storageKey }: { storageKey: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    setText(localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  function update(v: string) {
    setText(v);
    localStorage.setItem(storageKey, v);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Notizblock schließen" : "Notizblock öffnen"}
        className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-2xl border border-r-0 border-border bg-card px-2.5 py-3 text-xs font-bold text-muted-foreground shadow-lg hover:text-foreground"
        style={{ writingMode: "vertical-rl" }}
      >
        <NotebookPen className="h-4 w-4 rotate-90" /> Notizen
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/20"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <p className="flex items-center gap-2 font-bold text-foreground"><NotebookPen className="h-4 w-4 text-rose-500" /> Notizblock</p>
                <button type="button" aria-label="Schließen" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <textarea
                value={text}
                onChange={(e) => update(e.target.value)}
                placeholder="Wie auf dem Konzeptpapier in der echten Prüfung — Stichpunkte, Argumente, Ideen…"
                className="flex-1 resize-none bg-transparent p-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <p className="border-t border-border p-2.5 text-center text-[10px] text-muted-foreground">Wird automatisch lokal gespeichert.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

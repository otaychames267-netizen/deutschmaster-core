/**
 * Shared modal chrome for the Teil 2 / Teil 3 topic detail views — full-
 * screen on mobile, a large centered panel on desktop. Handles the overlay,
 * close affordance (click-outside, Escape, X button), header (title +
 * badges), and an optional tab bar; callers own the body content.
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface ModalTab<K extends string> { key: K; label: string; icon: React.ComponentType<{ className?: string }> }

export function TopicModalShell<K extends string>({
  title, badges, tabs, activeTab, onTabChange, onClose, children,
}: {
  title: string;
  badges: (string | null | undefined)[];
  tabs: ModalTab<K>[];
  activeTab: K;
  onTabChange: (k: K) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-card shadow-2xl sm:h-[85vh] sm:rounded-3xl sm:border sm:border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {badges.filter(Boolean).map((b, i) => (
                  <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{b}</span>
                ))}
              </div>
              <h2 className="text-lg font-black leading-snug text-foreground sm:text-xl">{title}</h2>
            </div>
            <button onClick={onClose} aria-label="Schließen" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 px-3 py-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

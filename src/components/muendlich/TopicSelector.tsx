import { useState } from "react";
import { ChevronDown, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TopicMaterial {
  id: string;
  title: string;
  body_text: string | null;
  key_arguments: string[] | null;
  difficulty_level: string | null;
  theme_category: string | null;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  B2: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  C1: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function Badges({ m }: { m: TopicMaterial }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {m.difficulty_level && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DIFFICULTY_STYLE[m.difficulty_level] ?? "bg-muted text-muted-foreground"}`}>
          {m.difficulty_level}
        </span>
      )}
      {m.theme_category && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{m.theme_category}</span>
      )}
    </div>
  );
}

/**
 * TopicSelector — the explicit topic-selection UI for Teil 1 (Präsentation),
 * Teil 2 (Diskussion), and Teil 3 (Planung). Teil 1 and Teil 2 lead with the
 * title (a "Text-Überschrift"/category list, per the product ask) with an
 * expandable preview of the guiding points / discussion text; Teil 3 has no
 * natural title of its own, so the full planning scenario is rendered
 * directly on the card. All variants pair every entry with an explicit
 * selection control (not just "click the whole row and hope") — a radio
 * circle that's the one and only way to lock a choice in, separate from
 * expanding/reading.
 */
export function TopicSelector({ teil, options, selected, onPick }: { teil: 1 | 2 | 3; options: TopicMaterial[]; selected?: string; onPick: (title: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (options.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Noch keine Themen hinterlegt.</p>;
  }

  return (
    <div className="space-y-2">
      {options.map((m) => {
        const isSelected = selected === m.title;
        const isOpen = teil === 3 || expanded === m.id;
        return (
          <motion.div
            key={m.id}
            layout
            className={`overflow-hidden rounded-2xl border transition-colors ${isSelected ? "border-rose-500 bg-rose-500/5" : "border-border bg-card"}`}
          >
            <div className="flex items-start gap-3 p-3">
              <button
                type="button"
                aria-label={isSelected ? `${m.title} ausgewählt` : `${m.title} auswählen`}
                onClick={() => onPick(m.title)}
                className="mt-0.5 shrink-0 text-rose-500 transition-transform hover:scale-110"
              >
                {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-bold ${isSelected ? "text-rose-600" : "text-foreground"}`}>{m.title}</p>
                  {teil !== 3 && m.body_text && (
                    <button
                      type="button"
                      aria-label={expanded === m.id ? "Text einklappen" : "Text anzeigen"}
                      onClick={() => setExpanded((e) => (e === m.id ? null : m.id))}
                      className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted"
                    >
                      <motion.span animate={{ rotate: expanded === m.id ? 180 : 0 }} className="block">
                        <ChevronDown className="h-4 w-4" />
                      </motion.span>
                    </button>
                  )}
                </div>
                <div className="mt-1"><Badges m={m} /></div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && m.body_text && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 pb-3"
                >
                  <div className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="whitespace-pre-line">{m.body_text}</p>
                    {teil === 2 && m.key_arguments && m.key_arguments.length > 0 && (
                      <div className="mt-3 border-t border-border/60 pt-2.5">
                        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-500/80">
                          <Sparkles className="h-3 w-3" /> Leitargumente
                        </p>
                        <ul className="space-y-1">
                          {m.key_arguments.map((a, i) => (
                            <li key={i} className="flex gap-1.5"><span className="text-rose-500">•</span><span>{a}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {!isSelected && (
                    <button
                      type="button"
                      onClick={() => onPick(m.title)}
                      className="mt-2 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600"
                    >
                      Dieses Thema wählen
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

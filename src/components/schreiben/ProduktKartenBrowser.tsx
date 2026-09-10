/**
 * ProduktKartenBrowser — browses the Schreiben "Produkt" writing cards: 70
 * standalone cards (one per card, no grouping/strategy layer), each grounded
 * in one of the 17 real Produkt exam themes. Navigation mirrors Mündlich
 * Teil 2/3: a flat Hero-Card grid, click -> a modal with 2 tabs
 * (Struktur / Beispiel), reusing the shared TopicModalShell chrome.
 *
 * The "Struktur" tab is a connected, step-by-step writing framework (owner
 * request 2026-09-10): a visual 13-step flow (Einstieg -> ... -> Schluss),
 * and per step a Zweck / Was-gehört-hinein / Vorlage / Konnektoren /
 * Übergang-zum-nächsten breakdown, so the student sees how the whole letter
 * is built and how each section connects to the next. Data comes from the
 * row's `structure` JSONB column; rows without it fall back to the older
 * flat `template_text` rendering.
 *
 * Fetches rows directly (RLS-scoped via schreiben_produkt_cards' plan-gated
 * policy) -- only ever mounted for an already entitled viewer (the route
 * shows LockedExerciseOverview otherwise), matching VorlagenBrowser.
 */
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, BookOpen, Bike, Headphones,
  Watch, Laptop, Sparkles, Milk, Flower2, Apple, Pill, Gift, Home, Loader2,
  FileText, ClipboardList, Target, ListChecks, Quote, Link2, CornerDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TopicModalShell, type ModalTab } from "@/components/muendlich/MuendlichTopicModalShell";

interface FlowStep { n: number; id: string; title: string; short: string }
interface ConnectorGroup { label: string; items: string[] }
interface Transition { toId: string; toTitle: string; phrases: string[]; note: string }
interface StructureSection {
  purpose: string;
  write: string[];
  template: string;
  connectors: ConnectorGroup[];
  transition: Transition | null;
}
interface StructureData {
  version: number;
  flow: FlowStep[];
  sections: Record<string, StructureSection>;
}

interface ProduktCard {
  id: string;
  card_title: string;
  theme_title: string;
  template_text: string;
  example_text: string;
  structure: StructureData | null;
  sort_order: number;
}

/** Small keyword-based icon/gradient pick so the grid doesn't feel monotone —
 * purely decorative, keyed off the real theme's product category. */
function getCardArt(themeTitle: string) {
  const t = themeTitle.toLowerCase();
  const base = { from: "#b45309", to: "#78350f" }; // amber, Schreiben's established accent
  if (t.includes("fahrrad") || t.includes("bike")) return { icon: Bike, ...base };
  if (t.includes("kopfhörer") || t.includes("freebeat")) return { icon: Headphones, ...base };
  if (t.includes("watch") || t.includes("uhr")) return { icon: Watch, ...base };
  if (t.includes("informatik") || t.includes("pc") || t.includes("computer")) return { icon: Laptop, ...base };
  if (t.includes("kosmetik") || t.includes("natur pur") || t.includes("beauty")) return { icon: Sparkles, ...base };
  if (t.includes("käse") || t.includes("kiste") || t.includes("obst")) return { icon: Apple, ...base };
  if (t.includes("blumen")) return { icon: Flower2, ...base };
  if (t.includes("apotheke")) return { icon: Pill, ...base };
  if (t.includes("geschenke")) return { icon: Gift, ...base };
  if (t.includes("appartement") || t.includes("haus")) return { icon: Home, ...base };
  if (t.includes("staubsaug") || t.includes("bett") || t.includes("schlaflos")) return { icon: Milk, ...base };
  return { icon: FileText, ...base };
}

function CardTile({ card, index, onOpen }: { card: ProduktCard; index: number; onOpen: () => void }) {
  const art = getCardArt(card.theme_title);
  const Icon = art.icon;
  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: (index % 6) * 0.04, ease: "easeOut" }}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-600/40 hover:shadow-xl"
    >
      <div
        className="relative flex h-28 shrink-0 items-center justify-center overflow-hidden sm:h-32"
        style={{ background: `linear-gradient(150deg, ${art.from}, ${art.to})` }}
      >
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-black/10 blur-xl" />
        <Icon className="h-12 w-12 text-white/90 drop-shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="mb-2 inline-block w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {card.theme_title}
        </span>
        <h3 className="mb-1.5 flex-1 text-sm font-black leading-snug text-foreground">{card.card_title}</h3>

        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-bold text-white transition-opacity group-hover:opacity-90">
          Karte öffnen <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

/** Renders a template string, turning [placeholder] tokens into amber pills. */
function renderTemplate(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span
        key={i}
        className="mx-0.5 rounded bg-amber-600/15 px-1.5 py-0.5 text-[0.95em] font-semibold text-amber-700 dark:text-amber-400"
      >
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function DetailBlock({
  icon: Icon, label, children,
}: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      {children}
    </div>
  );
}

/** The connected, two-view "Struktur" experience: a 13-step flow overview,
 * and a per-step detail (Zweck / Das gehört hinein / Vorlage / Konnektoren /
 * Übergang zum nächsten Schritt). */
function StructureFlow({ structure }: { structure: StructureData }) {
  const { flow, sections } = structure;
  const [active, setActive] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [active]);

  const idx = active ? flow.findIndex((f) => f.id === active) : -1;
  const step = idx >= 0 ? flow[idx] : null;
  const sec = active ? sections[active] : null;
  const prev = idx > 0 ? flow[idx - 1] : null;
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;

  return (
    <div ref={topRef} className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        {active === null || !step || !sec ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              13 Schritte — vom Einstieg bis zum professionellen Schluss. Jeder Schritt baut auf dem
              vorigen auf. Tippen Sie auf einen Schritt für Zweck, Vorlage, Konnektoren und den
              Übergang zum nächsten Abschnitt.
            </p>
            <ol className="relative">
              {flow.map((s, i) => (
                <li key={s.id} className="relative pb-3 pl-14 last:pb-0">
                  {i < flow.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[18px] top-9 h-[calc(100%-1.75rem)] w-px bg-gradient-to-b from-amber-600/50 to-amber-600/10"
                    />
                  )}
                  <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-black text-white shadow-sm">
                    {s.n}
                  </span>
                  <button
                    onClick={() => setActive(s.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-600/40 hover:shadow-md"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-foreground">{s.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.short}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600" />
                  </button>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : (
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                onClick={() => setActive(null)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Übersicht
              </button>
              <div className="flex items-center gap-1">
                <button
                  disabled={!prev}
                  onClick={() => prev && setActive(prev.id)}
                  aria-label="Vorheriger Schritt"
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  Schritt {step.n} / {flow.length}
                </span>
                <button
                  disabled={!next}
                  onClick={() => next && setActive(next.id)}
                  aria-label="Nächster Schritt"
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-base font-black text-white shadow-sm">
                {step.n}
              </span>
              <h3 className="text-lg font-black tracking-tight text-foreground">{step.title}</h3>
            </div>

            <div className="space-y-6">
              <DetailBlock icon={Target} label="Zweck dieses Abschnitts">
                <p className="text-sm leading-relaxed text-foreground">{sec.purpose}</p>
              </DetailBlock>

              <DetailBlock icon={ListChecks} label="Das gehört hinein">
                <ul className="space-y-1.5">
                  {sec.write.map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
                      <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </DetailBlock>

              <DetailBlock icon={Quote} label="Vorlage">
                <div className="whitespace-pre-line rounded-lg border-l-2 border-amber-600/50 bg-muted/40 px-4 py-3 text-sm leading-[1.7] text-foreground">
                  {renderTemplate(sec.template)}
                </div>
              </DetailBlock>

              <DetailBlock icon={Link2} label="Nützliche Konnektoren">
                <div className="space-y-2.5">
                  {sec.connectors.map((g, i) => (
                    <div key={i}>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((it, j) => (
                          <span
                            key={j}
                            className="rounded-md bg-amber-600/10 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300"
                          >
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DetailBlock>

              {sec.transition ? (
                <div className="rounded-xl border border-amber-600/25 bg-amber-600/[0.06] p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    <CornerDownRight className="h-3.5 w-3.5" /> Übergang zu Schritt {step.n + 1}: {sec.transition.toTitle}
                  </p>
                  <div className="space-y-1.5">
                    {sec.transition.phrases.map((p, i) => (
                      <p key={i} className="text-sm italic leading-relaxed text-foreground">„{p}“</p>
                    ))}
                  </div>
                  <p className="mt-2.5 border-t border-amber-600/20 pt-2.5 text-xs leading-relaxed text-muted-foreground">
                    {sec.transition.note}
                  </p>
                  <button
                    onClick={() => setActive(sec.transition!.toId)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700"
                  >
                    Weiter zu {sec.transition.toTitle} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-600/25 bg-emerald-600/[0.06] p-4 text-center">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Ende der Struktur — der Brief ist vollständig aufgebaut.
                  </p>
                  <button
                    onClick={() => setActive(null)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Zur Übersicht
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Fallback for rows still on the old flat "## Label\nContent" template_text. */
function StructureView({ text }: { text: string }) {
  const blocks = text
    .split(/\n##\s+/)
    .map((b) => b.replace(/^##\s+/, ""))
    .filter(Boolean)
    .map((b) => {
      const [label, ...rest] = b.split("\n");
      return { label: label.trim(), body: rest.join("\n").trim() };
    });

  return (
    <div className="space-y-5">
      {blocks.map((b, i) => (
        <div key={i}>
          <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">{b.label}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{b.body}</p>
        </div>
      ))}
    </div>
  );
}

const TABS: ModalTab<"struktur" | "beispiel">[] = [
  { key: "struktur", label: "Struktur", icon: ClipboardList },
  { key: "beispiel", label: "Beispiel", icon: BookOpen },
];

function CardModal({ card, onClose }: { card: ProduktCard; onClose: () => void }) {
  const [page, setPage] = useState<typeof TABS[number]["key"]>("struktur");
  return (
    <TopicModalShell
      title={card.card_title}
      badges={[card.theme_title, "B2"]}
      tabs={TABS}
      activeTab={page}
      onTabChange={setPage}
      onClose={onClose}
    >
      {page === "struktur" &&
        (card.structure
          ? <StructureFlow structure={card.structure} />
          : <StructureView text={card.template_text} />)}
      {page === "beispiel" && (
        <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
          <p className="whitespace-pre-line text-sm leading-[1.9] text-foreground">{card.example_text}</p>
        </div>
      )}
    </TopicModalShell>
  );
}

export function ProduktKartenBrowser({ level }: { level: string }) {
  const [cards, setCards] = useState<ProduktCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<ProduktCard | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("schreiben_produkt_cards" as any)
        .select("id, card_title, theme_title, template_text, example_text, structure, sort_order")
        .eq("level", level)
        .order("sort_order");
      setCards((data ?? []) as unknown as ProduktCard[]);
      setLoading(false);
    })();
  }, [level]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
        Noch keine Produkt-Karten veröffentlicht.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <CardTile key={c.id} card={c} index={i} onOpen={() => setOpenCard(c)} />
        ))}
      </div>

      {openCard && <CardModal card={openCard} onClose={() => setOpenCard(null)} />}
    </div>
  );
}

/**
 * ProduktKartenBrowser — browses the Schreiben "Produkt" writing cards: 70
 * standalone cards (one per card, no grouping/strategy layer), each grounded
 * in one of the 17 real Produkt exam themes. Navigation deliberately mirrors
 * Mündlich Teil 2/3 exactly (owner request 2026-09-09): a flat Hero-Card
 * grid, click -> a modal with 2 tabs (Struktur / Beispiel), reusing the same
 * shared TopicModalShell chrome.
 *
 * Fetches the real rows directly (RLS-scoped via schreiben_produkt_cards'
 * plan-gated policy) -- this component is only ever mounted for an already
 * entitled viewer (the route shows LockedExerciseOverview otherwise), so no
 * additional client-side access check is needed here, matching VorlagenBrowser.
 */
import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, Bike, Headphones, Watch, Laptop, Sparkles,
  Milk, Flower2, Apple, Pill, Gift, Home, Loader2, FileText, ClipboardList,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TopicModalShell, type ModalTab } from "@/components/muendlich/MuendlichTopicModalShell";

interface ProduktCard {
  id: string;
  card_title: string;
  theme_title: string;
  template_text: string;
  example_text: string;
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

/** Splits the "## Label\nContent" convention used by template_text into
 * labeled blocks, so Seite 1's structure renders as one continuous, clearly
 * sectioned page (not multiple tabs/cards) — each block a small caption over
 * its paragraph, matching the labeled-block style used across the app's
 * other learning content (e.g. Mündlich's Redemittel/Ideen blocks). */
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
      {page === "struktur" && <StructureView text={card.template_text} />}
      {page === "beispiel" && (
        <p className="whitespace-pre-line text-sm leading-[1.9] text-foreground">{card.example_text}</p>
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
        .select("id, card_title, theme_title, template_text, example_text, sort_order")
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

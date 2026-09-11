/**
 * ProduktKartenBrowser — browses the Schreiben "Produkt" writing cards: one
 * card per real Produkt exam theme. Navigation mirrors Mündlich Teil 2/3:
 * a flat Hero-Card grid, click -> a modal with 2 tabs (Struktur / Beispiel),
 * reusing the shared TopicModalShell chrome.
 *
 * Both tabs render ONE complete, connected complaint letter (owner spec
 * 2026-09-10): the Struktur tab is fixed professional German prose that
 * reads naturally from Betreff to Grußformel, with only the topic-dependent
 * information as [placeholders]; the Beispiel tab is the exact same letter
 * with every placeholder filled in for that theme. No stepped flow, no
 * section cards.
 *
 * Fetches rows directly (RLS-scoped via schreiben_produkt_cards' plan-gated
 * policy) -- only ever mounted for an already entitled viewer (the route
 * shows LockedExerciseOverview otherwise), matching VorlagenBrowser.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, Bike, Headphones, Watch, Laptop, Sparkles, Milk,
  Flower2, Apple, Pill, Gift, Home, Loader2, FileText, ClipboardList,
  Plane, Hotel, Truck, Wrench, GraduationCap, Waves, Ticket, ShieldCheck, KeyRound, Newspaper,
  ChevronDown, Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TopicModalShell, type ModalTab } from "@/components/muendlich/MuendlichTopicModalShell";
import { REDEMITTEL } from "@/components/schreiben/redemittel";

interface ProduktCard {
  id: string;
  card_title: string;
  theme_title: string;
  template_text: string;
  example_text: string;
  sort_order: number;
}

/** Small keyword-based icon/gradient pick so the grid doesn't feel monotone —
 * purely decorative, keyed off the real theme's product/service category. */
function getCardArt(themeTitle: string) {
  const t = themeTitle.toLowerCase();
  const base = { from: "#b45309", to: "#78350f" }; // amber, Schreiben's established accent
  // Produkt themes
  if (t.includes("fahrrad") || t.includes("bike")) return { icon: Bike, ...base };
  if (t.includes("kopfhörer") || t.includes("freebeat")) return { icon: Headphones, ...base };
  if (t.includes("watch") || t.includes("uhr")) return { icon: Watch, ...base };
  if (t.includes("informatik") || t.includes("pc") || t.includes("computer")) return { icon: Laptop, ...base };
  if (t.includes("kosmetik") || t.includes("natur pur") || t.includes("beauty")) return { icon: Sparkles, ...base };
  if (t.includes("käse") || t.includes("kiste") || t.includes("obst")) return { icon: Apple, ...base };
  if (t.includes("blumen")) return { icon: Flower2, ...base };
  if (t.includes("apotheke")) return { icon: Pill, ...base };
  if (t.includes("geschenke")) return { icon: Gift, ...base };
  if (t.includes("staubsaug") || t.includes("bett") || t.includes("schlaflos")) return { icon: Milk, ...base };
  // Dienstleistung themes
  if (t.includes("reise") || t.includes("pauschal") || t.includes("bahnreise") || t.includes("flug")) return { icon: Plane, ...base };
  if (t.includes("hotel") || t.includes("wohnen auf zeit") || t.includes("appartement") || t.includes("apartment")) return { icon: Hotel, ...base };
  if (t.includes("umzug")) return { icon: Truck, ...base };
  if (t.includes("renovier") || t.includes("bad") || t.includes("sanitär") || t.includes("handwerk")) return { icon: Wrench, ...base };
  if (t.includes("kurs") || t.includes("seminar") || t.includes("training") || t.includes("schule") || t.includes("akademie") || t.includes("deutsch")) return { icon: GraduationCap, ...base };
  if (t.includes("freizeitbad") || t.includes("schwimmbad") || t.includes("therme") || t.includes("wasser")) return { icon: Waves, ...base };
  if (t.includes("freizeitpark") || t.includes("märchenland") || t.includes("camp") || t.includes("musical") || t.includes("schatzsuche") || t.includes("tikki")) return { icon: Ticket, ...base };
  if (t.includes("versicherung") || t.includes("securvia")) return { icon: ShieldCheck, ...base };
  if (t.includes("schlüsseldienst") || t.includes("notservice")) return { icon: KeyRound, ...base };
  if (t.includes("zeitschrift") || t.includes("abonnenten") || t.includes("flatrate") || t.includes("vertrag") || t.includes("tele")) return { icon: Newspaper, ...base };
  if (t.includes("catering") || t.includes("partyservice") || t.includes("essen")) return { icon: Gift, ...base };
  if (t.includes("haus")) return { icon: Home, ...base };
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

/** Renders one paragraph, turning [placeholder] tokens into amber pills so the
 * fixed German text stays fully readable and only the fill-in parts stand out. */
function renderParagraph(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span
        key={i}
        className="mx-0.5 rounded bg-amber-600/15 px-1.5 py-0.5 text-[0.94em] font-semibold text-amber-700 dark:text-amber-400"
      >
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** The connected letter, rendered as a single letter-style card. `withPills`
 * highlights [placeholders] (Struktur); without it the text is plain (Beispiel). */
function LetterView({ text, withPills }: { text: string; withPills: boolean }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="mx-auto max-w-2xl">
      {withPills && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Eine vollständige Beschwerde von Anfang bis Ende. Der professionelle Text bleibt gleich —
          nur die <span className="rounded bg-amber-600/15 px-1 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">markierten Stellen</span> passen
          Sie an Ihr Thema an.
        </p>
      )}
      <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="space-y-4 text-sm leading-[1.85] text-foreground">
          {paras.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {withPills ? renderParagraph(p) : p}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Collapsed by default -- a reference of phrase alternatives for each beat
 * of the letter, kept strictly OUTSIDE the letter text itself (owner spec
 * 2026-09-11: don't overload the letter with bracketed alternatives; offer
 * synonyms as a separate learning aid instead). Shown only on the Struktur
 * tab, directly below the connected-letter card. */
function RedemittelPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto mt-5 max-w-2xl rounded-xl border border-border bg-muted/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          Nützliche Redemittel &amp; Synonyme
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-border px-5 py-4 sm:grid-cols-2">
          {REDEMITTEL.map((group) => (
            <div key={group.title}>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                {group.title}
              </h4>
              <ul className="space-y-1">
                {group.phrases.map((p) => (
                  <li key={p} className="text-[13px] leading-snug text-muted-foreground">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
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
      {page === "struktur" && (
        <>
          <LetterView text={card.template_text} withPills />
          <RedemittelPanel />
        </>
      )}
      {page === "beispiel" && <LetterView text={card.example_text} withPills={false} />}
    </TopicModalShell>
  );
}

export function ProduktKartenBrowser({
  level,
  category = "produkt",
}: {
  level: string;
  /** which exam family to show — 'produkt' (default) or 'dienstleistung' */
  category?: "produkt" | "dienstleistung";
}) {
  const [cards, setCards] = useState<ProduktCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState<ProduktCard | null>(null);
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("schreiben_produkt_cards" as any)
        .select("id, card_title, theme_title, template_text, example_text, sort_order")
        .eq("level", level)
        .eq("category", category)
        .order("sort_order");
      setCards((data ?? []) as unknown as ProduktCard[]);
      setLoading(false);
    })();
  }, [level, category]);

  const themes = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of cards) seen.set(c.theme_title, (seen.get(c.theme_title) ?? 0) + 1);
    return Array.from(seen.entries());
  }, [cards]);

  const shown = useMemo(
    () => (theme ? cards.filter((c) => c.theme_title === theme) : cards),
    [cards, theme],
  );

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
        {category === "dienstleistung"
          ? "Noch keine Dienstleistungs-Karten veröffentlicht."
          : "Noch keine Produkt-Karten veröffentlicht."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {themes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTheme(null)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              theme === null
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-border bg-card text-muted-foreground hover:border-amber-600/40 hover:text-foreground"
            }`}
          >
            Alle ({cards.length})
          </button>
          {themes.map(([t, n]) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                theme === t
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-amber-600/40 hover:text-foreground"
              }`}
            >
              {t} ({n})
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c, i) => (
          <CardTile key={c.id} card={c} index={i} onOpen={() => setOpenCard(c)} />
        ))}
      </div>

      {openCard && <CardModal card={openCard} onClose={() => setOpenCard(null)} />}
    </div>
  );
}

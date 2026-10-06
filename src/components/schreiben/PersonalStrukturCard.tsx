/**
 * PersonalStrukturCard — shows ONE subscriber's permanently-assigned
 * Produkt or Dienstleistung Beschwerde-Struktur (owner spec 2026-09-11:
 * replaces the old shared "Vorlagen" system and the old browse-all-150
 * ProduktKartenBrowser). Calls get_or_assign_my_struktur once on mount,
 * which both assigns (on first visit) and returns the caller's permanent
 * pair — this component renders only the half matching `category`.
 *
 * PersonalStrukturPairB1 is the B1 counterpart: a B1 subscriber owns one
 * informal-letter Struktur from each of two pools (A: Einladung/Planung,
 * B: Neuigkeiten/Rat/Bitte), both returned by one get_or_assign_my_struktur_b1 call.
 *
 * No modal, no grid, no theme picker: with exactly one card per pool, showing it
 * inline is simpler than a "click to open" catalog interaction.
 */
import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ClipboardList, Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REDEMITTEL } from "@/components/schreiben/redemittel";
import { REDEMITTEL_B1 } from "@/components/schreiben/redemittel-b1";
import type { RedemittelGroup } from "@/components/schreiben/redemittel";

interface StrukturRow {
  produkt_card_id: string;
  produkt_card_title: string;
  produkt_theme_title: string;
  produkt_template_text: string;
  produkt_example_text: string;
  dienstleistung_card_id: string;
  dienstleistung_card_title: string;
  dienstleistung_theme_title: string;
  dienstleistung_template_text: string;
  dienstleistung_example_text: string;
}

interface B1Row {
  pool: "A" | "B";
  card_id: string;
  card_title: string;
  theme_title: string;
  topic_group: string;
  template_text: string;
  example_text: string;
}

/** Turns [placeholder] tokens into amber pills so the fixed German text
 * stays fully readable and only the fill-in parts stand out. */
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
export function LetterView({ text, withPills, intro }: { text: string; withPills: boolean; intro: React.ReactNode }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="mx-auto max-w-2xl">
      {withPills && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{intro}</p>
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

/** Collapsed by default — a reference of phrase alternatives for each beat
 * of the letter, kept strictly outside the letter text itself. Shown only
 * on the Struktur tab, directly below the connected-letter card. */
function RedemittelPanel({ groups }: { groups: RedemittelGroup[] }) {
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
          {groups.map((group) => (
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

const TABS = [
  { key: "struktur" as const, label: "Struktur", icon: ClipboardList },
  { key: "beispiel" as const, label: "Beispiel", icon: BookOpen },
];

const Spinner = () => (
  <div className="flex justify-center py-16">
    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
  </div>
);

const NotReady = () => (
  <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
    Deine persönliche Struktur wird gerade vorbereitet. Bitte versuche es in Kürze erneut.
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded bg-amber-600/15 px-1 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">{children}</span>
);

/** One letter: header (topic + title), Struktur / Beispiel tabs, and the Redemittel reference. */
function StrukturView({
  theme,
  title,
  template,
  example,
  intro,
  groups,
}: {
  theme: string;
  title: string;
  template: string;
  example: string;
  intro: React.ReactNode;
  groups: RedemittelGroup[];
}) {
  const [page, setPage] = useState<(typeof TABS)[number]["key"]>("struktur");
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {theme}
          </span>
          <span className="text-sm font-black text-foreground">{title}</span>
        </div>
        <div className="flex gap-1 border-t border-border px-1.5 pt-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPage(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                page === t.key
                  ? "bg-amber-600 text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {page === "struktur" && (
        <>
          <LetterView text={template} withPills intro={intro} />
          <RedemittelPanel groups={groups} />
        </>
      )}
      {page === "beispiel" && <LetterView text={example} withPills={false} intro={null} />}
    </div>
  );
}

export function PersonalStrukturCard({
  level,
  category,
}: {
  level: string;
  category: "produkt" | "dienstleistung";
}) {
  const [row, setRow] = useState<StrukturRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: rpcError } = await (supabase as any).rpc("get_or_assign_my_struktur", {
        p_level: level,
      });
      if (rpcError) {
        setError(rpcError.message ?? "UNKNOWN_ERROR");
        setLoading(false);
        return;
      }
      setRow((data?.[0] ?? null) as StrukturRow | null);
      setLoading(false);
    })();
  }, [level, category]);

  if (loading) return <Spinner />;
  if (error?.includes("STRUKTUR_POOL_EXHAUSTED") || !row) return <NotReady />;

  const produkt = category === "produkt";
  return (
    <StrukturView
      theme={produkt ? row.produkt_theme_title : row.dienstleistung_theme_title}
      title={produkt ? row.produkt_card_title : row.dienstleistung_card_title}
      template={produkt ? row.produkt_template_text : row.dienstleistung_template_text}
      example={produkt ? row.produkt_example_text : row.dienstleistung_example_text}
      intro={
        <>
          Deine vollständige Beschwerde von Anfang bis Ende. Der professionelle Text bleibt gleich —
          nur die <Pill>markierten Stellen</Pill> passen
          Sie an Ihr Thema an.
        </>
      }
      groups={REDEMITTEL}
    />
  );
}

/** The two B1 pools. A B1 subscriber owns exactly one letter from each (see get_or_assign_my_struktur_b1). */
const B1_POOLS = [
  { key: "A", label: "Brief A", title: "Einladung, Vorschlag & Planung", hint: "Dein Freund oder deine Freundin schlägt etwas vor, lädt dich ein oder plant etwas mit dir." },
  { key: "B", label: "Brief B", title: "Neuigkeiten, Rat & Bitte", hint: "Er oder sie erzählt Neuigkeiten, hat ein Problem oder bittet dich um Hilfe oder einen Tipp." },
] as const;

export function PersonalStrukturPairB1() {
  const [rows, setRows] = useState<B1Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pool, setPool] = useState<"A" | "B">("A");

  useEffect(() => {
    (async () => {
      // one call assigns whatever is missing and returns both letters; staff without a subscription only get a preview
      const { data, error: rpcError } = await (supabase as any).rpc("get_or_assign_my_struktur_b1");
      if (rpcError) setError(rpcError.message ?? "UNKNOWN_ERROR");
      else setRows((data ?? []) as B1Row[]);
    })();
  }, []);

  if (!rows && !error) return <Spinner />;
  const current = rows?.find((r) => r.pool === pool);
  if (error?.includes("STRUKTUR_POOL_EXHAUSTED") || !rows?.length) return <NotReady />;

  const meta = B1_POOLS.find((p) => p.key === pool)!;
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Deine zwei Briefe">
        {B1_POOLS.map((p) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={pool === p.key}
            onClick={() => setPool(p.key)}
            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
              pool === p.key ? "border-amber-600 bg-amber-600/10" : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">{p.label}</span>
            <span className="block text-sm font-black text-foreground">{p.title}</span>
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{meta.hint}</p>

      {current ? (
        <StrukturView
          key={current.pool}
          theme={current.theme_title}
          title={current.card_title}
          template={current.template_text}
          example={current.example_text}
          intro={
            <>
              Dein vollständiger Antwortbrief von Anfang bis Ende. Der Text bleibt gleich — nur die <Pill>markierten Stellen</Pill>{" "}
              ergänzt du mit deinen eigenen Ideen und passt sie an die vier Punkte der Aufgabe an.
            </>
          }
          groups={REDEMITTEL_B1}
        />
      ) : (
        <NotReady />
      )}
    </div>
  );
}

/**
 * PersonalStrukturCard — shows ONE subscriber's permanently-assigned
 * Produkt or Dienstleistung Beschwerde-Struktur (owner spec 2026-09-11:
 * replaces the old shared "Vorlagen" system and the old browse-all-150
 * ProduktKartenBrowser). Calls get_or_assign_my_struktur once on mount,
 * which both assigns (on first visit) and returns the caller's permanent
 * pair — this component renders only the half matching `category`.
 *
 * No modal, no grid, no theme picker: with exactly one card, showing it
 * inline is simpler than a "click to open" catalog interaction.
 */
import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ClipboardList, Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REDEMITTEL } from "@/components/schreiben/redemittel";

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
function LetterView({ text, withPills }: { text: string; withPills: boolean }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="mx-auto max-w-2xl">
      {withPills && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Deine vollständige Beschwerde von Anfang bis Ende. Der professionelle Text bleibt gleich —
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

/** Collapsed by default — a reference of phrase alternatives for each beat
 * of the letter, kept strictly outside the letter text itself. Shown only
 * on the Struktur tab, directly below the connected-letter card. */
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

const TABS = [
  { key: "struktur" as const, label: "Struktur", icon: ClipboardList },
  { key: "beispiel" as const, label: "Beispiel", icon: BookOpen },
];

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
  const [page, setPage] = useState<(typeof TABS)[number]["key"]>("struktur");

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
  }, [level]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error?.includes("STRUKTUR_POOL_EXHAUSTED") || !row) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
        Deine persönliche Struktur wird gerade vorbereitet. Bitte versuche es in Kürze erneut.
      </div>
    );
  }

  const title = category === "produkt" ? row.produkt_card_title : row.dienstleistung_card_title;
  const theme = category === "produkt" ? row.produkt_theme_title : row.dienstleistung_theme_title;
  const template = category === "produkt" ? row.produkt_template_text : row.dienstleistung_template_text;
  const example = category === "produkt" ? row.produkt_example_text : row.dienstleistung_example_text;

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
          <LetterView text={template} withPills />
          <RedemittelPanel />
        </>
      )}
      {page === "beispiel" && <LetterView text={example} withPills={false} />}
    </div>
  );
}

/**
 * ProduktKartenBrowser — browses the 70 premium "Schreiben Produkt" writing
 * cards: 17 real exam themes, each with several rhetorical-strategy variants
 * (Vorlage + full worked Beispiel). Three-level drill-down, mirroring the
 * Mündlich topic-card browsing pattern: theme grid -> strategy list -> detail.
 *
 * Fetches the real rows directly (RLS-scoped via schreiben_produkt_cards'
 * plan-gated policy) -- this component is only ever mounted for an already
 * entitled viewer (the route shows LockedExerciseOverview otherwise), so no
 * additional client-side access check is needed here, matching VorlagenBrowser.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Layers, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProduktCard {
  id: string;
  theme_title: string;
  strategy_code: string;
  strategy_label: string;
  template_text: string;
  example_text: string;
  sort_order: number;
}

export function ProduktKartenBrowser({ level }: { level: string }) {
  const [cards, setCards] = useState<ProduktCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<string | null>(null);
  const [card, setCard] = useState<ProduktCard | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("schreiben_produkt_cards" as any)
        .select("id, theme_title, strategy_code, strategy_label, template_text, example_text, sort_order")
        .eq("level", level)
        .order("sort_order");
      setCards((data ?? []) as unknown as ProduktCard[]);
      setLoading(false);
    })();
  }, [level]);

  const themes = useMemo(() => {
    const map = new Map<string, ProduktCard[]>();
    for (const c of cards) {
      if (!map.has(c.theme_title)) map.set(c.theme_title, []);
      map.get(c.theme_title)!.push(c);
    }
    return Array.from(map.entries()); // [ [themeTitle, cards[]], ... ]
  }, [cards]);

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

  // ── Level 3: detail view for one card ──
  if (card) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setCard(null)}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück zu {theme}
        </button>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {card.strategy_code} · {card.strategy_label}
          </span>
          <h2 className="mt-2 text-xl font-black tracking-tight text-foreground">{card.theme_title}</h2>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seite 1 · Vorlage</p>
          </div>
          <div className="px-6 py-5 text-sm leading-relaxed text-foreground whitespace-pre-line border-l-4 border-amber-600/40 ml-5 my-4 pl-4 italic text-muted-foreground">
            {card.template_text}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Seite 2 · Vollständiges Beispiel</p>
          </div>
          <div className="px-6 py-5 text-sm leading-[1.9] text-foreground whitespace-pre-line">
            {card.example_text}
          </div>
        </div>
      </div>
    );
  }

  // ── Level 2: strategy list for one theme ──
  if (theme) {
    const themeCards = themes.find(([t]) => t === theme)?.[1] ?? [];
    return (
      <div className="space-y-4">
        <button
          onClick={() => setTheme(null)}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Alle Themen
        </button>
        <h2 className="text-xl font-black tracking-tight text-foreground">{theme}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {themeCards.map((c) => (
            <button
              key={c.id}
              onClick={() => setCard(c)}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-600/40 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600/10 text-xs font-black text-amber-700 dark:text-amber-400">
                {c.strategy_code}
              </span>
              <span className="flex-1 min-w-0 font-semibold text-foreground truncate">{c.strategy_label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Level 1: theme grid ──
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {themes.map(([t, tCards]) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className="group flex items-start gap-4 rounded-2xl border border-emerald-800/15 bg-gradient-to-br from-emerald-950/[0.03] to-card px-5 py-4 text-left shadow-sm transition-all hover:border-amber-600/40 hover:shadow-md dark:from-emerald-400/[0.04]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-900/10 text-emerald-800 ring-1 ring-emerald-800/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground leading-snug">{t}</p>
            <span className="mt-2 inline-block rounded-full bg-amber-600/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {tCards.length} {tCards.length === 1 ? "Strategie" : "Strategien"}
            </span>
          </div>
          <ArrowRight className="mt-2 h-4 w-4 shrink-0 self-center text-emerald-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-emerald-400" />
        </button>
      ))}
    </div>
  );
}

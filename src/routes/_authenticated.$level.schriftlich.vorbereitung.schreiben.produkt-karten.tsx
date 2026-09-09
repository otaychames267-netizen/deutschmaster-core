import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { ProduktKartenBrowser } from "@/components/schreiben/ProduktKartenBrowser";
import type { CatalogItem } from "@/lib/useContentAccess";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/produkt-karten")({
  component: ProduktKartenPage,
});

function ProduktKartenPage() {
  const level = useActiveLevel();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("schriftlich");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Titles-only locked preview, fetched only when needed (non-subscriber path) —
  // mirrors useExerciseCatalog's get_exercise_catalog pattern, but this bank
  // is small/static enough not to warrant its own shared hook.
  useEffect(() => {
    if (!level || hasAccess !== false) { setCatalogLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any).rpc("get_produkt_cards_catalog", { p_level: level });
      const items: CatalogItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        title: `${r.theme_title} — ${r.strategy_label}`,
      }));
      setCatalog(items);
      setCatalogLoading(false);
    })();
  }, [level, hasAccess]);

  if (accessLoading || !level || (hasAccess === false && catalogLoading)) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <LockedExerciseOverview
        heading="Schreiben — Produkt-Karten"
        subheading="70 professionelle Karten für Produkt-Beschwerden — je Thema mehrere Formulierungsstrategien, damit kein Brief wie auswendig gelernt wirkt."
        items={catalog}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Schreiben — Produkt-Karten</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Echte Produkt-Beschwerde-Themen, je Thema mehrere professionelle Vorlagen mit unterschiedlicher Strategie — Vorlage und vollständiges Beispiel auf einen Blick.
        </p>
      </div>
      <ProduktKartenBrowser level={level} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { ProduktKartenBrowser } from "@/components/schreiben/ProduktKartenBrowser";
import type { CatalogItem } from "@/lib/useContentAccess";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/service-karten")({
  component: ServiceKartenPage,
});

function ServiceKartenPage() {
  const level = useActiveLevel();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("schriftlich");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Titles-only locked preview (non-subscriber path) — same pattern as the
  // Produkt-Karten route, passing the 'dienstleistung' category to the RPC.
  useEffect(() => {
    if (!level || hasAccess !== false) { setCatalogLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any).rpc("get_produkt_cards_catalog", {
        p_level: level,
        p_category: "dienstleistung",
      });
      const items: CatalogItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        title: r.card_title,
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
        heading="Schreiben — Dienstleistungs-Karten"
        subheading="Professionelle Karten für Dienstleistungs-Beschwerden, gegründet auf echten Prüfungsthemen — jede Karte mit vollständiger Struktur und einem ausformulierten Beispiel."
        items={catalog}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Schreiben — Dienstleistungs-Karten</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Echte Dienstleistungs-Beschwerde-Themen — jede Karte zeigt eine vollständige Struktur und ein ausformuliertes Beispiel auf einen Blick.
        </p>
      </div>
      <ProduktKartenBrowser level={level} category="dienstleistung" />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { VorlagenBrowser } from "@/components/schreiben/VorlagenBrowser";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/vorlagen")({
  component: VorlagenPage,
});

// Static preview copy for the locked state — the Vorlagen catalog is a
// handful of category PDFs (not hundreds of exercises), so this is simpler
// than wiring a titles-only catalog RPC for a list this small.
const PREVIEW_ITEMS = [
  { id: "produkt", title: "Beschwerden — Produkt · 10 Situationen, 60 Vorlagen" },
  { id: "dienstleistung", title: "Beschwerden — Dienstleistung · 10 Situationen, 60 Vorlagen" },
];

function VorlagenPage() {
  const level = useActiveLevel();
  const { hasAccess, loading } = useHasPlanAccess("schriftlich");

  if (loading || !level) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <LockedExerciseOverview
        heading="Schreiben — Vorlagen"
        subheading="Ein komplettes Denksystem für TELC-B2-Beschwerdebriefe — keine Musterbriefe zum Auswendiglernen."
        items={PREVIEW_ITEMS}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Schreiben — Vorlagen</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Wiederkehrende Situationen, sechs universelle Schreibstrategien, Platzhalter-Werkstatt und vollständige Vorlagen-Einheiten — pro Kategorie ein PDF.
        </p>
      </div>
      <VorlagenBrowser level={level} />
    </div>
  );
}

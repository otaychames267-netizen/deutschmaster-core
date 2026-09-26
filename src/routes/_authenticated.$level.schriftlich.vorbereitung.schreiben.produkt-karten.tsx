import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PersonalStrukturNotice } from "@/components/schreiben/PersonalStrukturNotice";
import { PersonalStrukturCard } from "@/components/schreiben/PersonalStrukturCard";
import type { CatalogItem } from "@/lib/useContentAccess";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/produkt-karten")({
  component: ProduktKartenPage,
});

// A single locked teaser row — there is no catalog to browse in this
// personalized model (each subscriber gets exactly one, permanently
// assigned, exclusive structure), so a titles-only list no longer applies.
const LOCKED_PREVIEW: CatalogItem[] = [
  { id: "produkt-struktur", title: "Deine persönliche Produkt-Beschwerde-Struktur" },
];

function ProduktKartenPage() {
  const level = useActiveLevel();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("schriftlich");

  if (accessLoading || !level) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <LockedExerciseOverview
        heading="Schreiben — Meine Struktur (Produkt)"
        subheading="Eine exklusiv für dich zugewiesene Produkt-Beschwerde-Struktur — niemand sonst auf der Plattform sieht dieselbe."
        items={LOCKED_PREVIEW}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Schreiben — Meine Struktur (Produkt)</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Deine persönliche Produkt-Beschwerde-Struktur — vollständig ausformuliert, exklusiv für dich.
        </p>
      </div>
      <PersonalStrukturNotice />
      <PersonalStrukturCard level={level} category="produkt" />
    </div>
  );
}

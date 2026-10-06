import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PersonalStrukturNotice } from "@/components/schreiben/PersonalStrukturNotice";
import { PersonalStrukturPairB1 } from "@/components/schreiben/PersonalStrukturCard";
import type { CatalogItem } from "@/lib/useContentAccess";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/meine-struktur")({
  component: MeineStrukturPage,
});

// B1's only Schreiben format is the informal reply letter, so a B1 subscriber gets exactly TWO personal Strukturen — one complete,
// individually written reply letter from pool A (the friend proposes / invites / plans) and one from pool B (the friend shares news
// or a problem, or asks for help) — permanently assigned and never shown to anyone else. The B2 equivalents are the two Beschwerde
// routes (produkt-karten / service-karten).
const LOCKED_PREVIEW: CatalogItem[] = [
  { id: "informell-a", title: "Brief A — Einladung, Vorschlag & Planung" },
  { id: "informell-b", title: "Brief B — Neuigkeiten, Rat & Bitte" },
];

function MeineStrukturPage() {
  const level = useActiveLevel();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("schriftlich");

  if (accessLoading || !level) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (level !== "TELC_B1") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-muted/20 py-14 text-center text-sm text-muted-foreground">
        Die persönliche Struktur für den informellen Brief gibt es nur im B1-Kurs. Im B2-Kurs findest du deine Strukturen unter
        „Meine Struktur — Produkt-Beschwerde“ und „Meine Struktur — Service-Beschwerde“.
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <LockedExerciseOverview
        heading="Schreiben — Meine Struktur (Informeller Brief)"
        subheading="Zwei exklusiv für dich geschriebene Antwortbriefe als Struktur — niemand sonst auf der Plattform sieht dieselben."
        items={LOCKED_PREVIEW}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Schreiben — Meine Struktur (Informeller Brief)</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Deine zwei persönlichen Antwortbriefe für den B1-Brief an eine Freundin oder einen Freund — vollständig ausformuliert, exklusiv
          für dich: einer zu „Einladung, Vorschlag &amp; Planung“, einer zu „Neuigkeiten, Rat &amp; Bitte“.
        </p>
      </div>
      <PersonalStrukturNotice variant="pair" />
      <PersonalStrukturPairB1 />
    </div>
  );
}

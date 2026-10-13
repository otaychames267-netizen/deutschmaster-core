import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { PersonalStrukturNotice } from "@/components/schreiben/PersonalStrukturNotice";
import { PersonalStrukturCard } from "@/components/schreiben/PersonalStrukturCard";
import { AdminStrukturOverview } from "@/components/schreiben/StrukturCatalog";
import type { CatalogItem } from "@/lib/useContentAccess";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/service-karten")({
  component: ServiceKartenPage,
});

// A single locked teaser row — there is no catalog to browse in this
// personalized model (each subscriber gets exactly one, permanently
// assigned, exclusive structure), so a titles-only list no longer applies.
const LOCKED_PREVIEW: CatalogItem[] = [
  { id: "service-struktur", title: "Deine persönliche Service-Beschwerde-Struktur" },
];

function ServiceKartenPage() {
  const level = useActiveLevel();
  const { isAdmin } = useAuth();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("schriftlich");
  // an admin opens this page to see ALL Service Strukturen (and how many are left); the student view is one click away
  const [adminView, setAdminView] = useState<"all" | "mine">("all");

  if (accessLoading || !level) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin && adminView === "all") {
    return (
      <AdminStrukturOverview
        title="Schreiben — Alle Strukturen (Service, Admin)"
        description="Alle 150 Service-Strukturen, wie viele noch frei sind und wie viele schon an Abonnenten vergeben wurden. Eine vergebene Struktur ist rot markiert, geschlossen und nicht mehr abrufbar."
        descriptionAr="كل الـ 150 Struktur (Dienstleistung)، كم بقى وكم ذهب لمشتركين. الـ Struktur اللي تتعطى لمشترك تولّي حمراء ومغلقة."
        sets={["b2d"]}
        onStudentView={() => setAdminView("mine")}
      />
    );
  }

  if (hasAccess === false) {
    return (
      <LockedExerciseOverview
        heading="Schreiben — Meine Struktur (Service)"
        subheading="Eine exklusiv für dich zugewiesene Service-Beschwerde-Struktur — niemand sonst auf der Plattform sieht dieselbe."
        items={LOCKED_PREVIEW}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Schreiben — Meine Struktur (Service)</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Deine persönliche Service-Beschwerde-Struktur — vollständig ausformuliert, exklusiv für dich.
        </p>
      </div>
      {isAdmin && (
        <button
          onClick={() => setAdminView("all")}
          className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
        >
          Zurück zur Admin-Übersicht (alle 150 Service)
        </button>
      )}
      <PersonalStrukturNotice />
      <PersonalStrukturCard level={level} category="dienstleistung" />
    </div>
  );
}

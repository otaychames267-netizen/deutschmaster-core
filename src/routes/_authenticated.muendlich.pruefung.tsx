import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Speech, MessageSquare, Users } from "lucide-react";
import { SectionHeader, ModuleGroup, PartCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/muendlich/pruefung")({
  head: () => ({ meta: [{ title: "Mündlich — Prüfungssimulation" }] }),
  component: MuendlichPruefung,
});

function MuendlichPruefung() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SectionHeader
        icon={ClipboardList}
        title="Prüfungssimulation — Mündlich"
        subtitle="Alle drei Teile der mündlichen Prüfung als realistische Simulation."
        backTo="/muendlich"
        backLabel="Zurück zu Mündlich"
      />

      <ModuleGroup title="Simulation pro Teil">
        <PartCard icon={Speech} title="Teil 1 — Präsentation" desc="Simulation einer Kurzpräsentation mit Zeitlimit." />
        <PartCard icon={MessageSquare} title="Teil 2 — Diskussion" desc="Simulation eines Diskussionsdialogs mit Bewertung." />
        <PartCard icon={Users} title="Teil 3 — Gemeinsames Planen" desc="Simulation der Partneraufgabe — gemeinsam planen." />
      </ModuleGroup>
    </div>
  );
}
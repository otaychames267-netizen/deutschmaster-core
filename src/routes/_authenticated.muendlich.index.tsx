import { createFileRoute } from "@tanstack/react-router";
import { Mic, GraduationCap, ClipboardList } from "lucide-react";
import { SectionHeader, ChoiceCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/muendlich/")({
  head: () => ({ meta: [{ title: "Mündlich — DeutschMaster" }] }),
  component: MuendlichIndex,
});

function MuendlichIndex() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        icon={Mic}
        title="Mündlich"
        subtitle="Wähle, wie du heute sprechen möchtest."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <ChoiceCard
          to="/muendlich/vorbereitung"
          icon={GraduationCap}
          title="Vorbereitung"
          desc="Übe jeden mündlichen Teil einzeln: Präsentation, Diskussion und gemeinsames Planen."
        />
        <ChoiceCard
          to="/muendlich/pruefung"
          icon={ClipboardList}
          title="Prüfungssimulation"
          desc="Komplette mündliche Prüfung: alle drei Teile am Stück, wie im echten Termin."
          badge="Bald"
        />
      </div>
    </div>
  );
}
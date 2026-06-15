import { createFileRoute } from "@tanstack/react-router";
import { PenLine, GraduationCap, ClipboardList } from "lucide-react";
import { SectionHeader, ChoiceCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/schriftlich/")({
  head: () => ({ meta: [{ title: "Schriftlich — DeutschMaster" }] }),
  component: SchriftlichIndex,
});

function SchriftlichIndex() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        icon={PenLine}
        title="Schriftlich"
        subtitle="Wähle, wie du heute lernen möchtest."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <ChoiceCard
          to="/schriftlich/vorbereitung"
          icon={GraduationCap}
          title="Vorbereitung"
          desc="Übe jeden Prüfungsteil einzeln: Lesen, Sprachbausteine, Hören und Schreiben."
        />
        <ChoiceCard
          to="/schriftlich/pruefung"
          icon={ClipboardList}
          title="Prüfungssimulation"
          desc="Eine vollständige schriftliche TELC-Prüfung unter realen Bedingungen mit Timer."
          badge="Bald"
        />
      </div>
    </div>
  );
}
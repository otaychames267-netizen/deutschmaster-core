import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Puzzle, Headphones, Edit3 } from "lucide-react";
import { SectionHeader, ModuleGroup, PartCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung")({
  head: () => ({ meta: [{ title: "Schriftlich — Vorbereitung" }] }),
  component: SchriftlichVorbereitung,
});

function SchriftlichVorbereitung() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SectionHeader
        icon={GraduationCap}
        title="Vorbereitung — Schriftlich"
        subtitle="Übungen pro Prüfungsteil. Wähle einen Bereich."
        backTo="/schriftlich"
        backLabel="Zurück zu Schriftlich"
      />

      <ModuleGroup title="Lesen">
        <PartCard icon={BookOpen} title="Teil 1" desc="Globalverständnis — Überschriften zuordnen." />
        <PartCard icon={BookOpen} title="Teil 2" desc="Detailverständnis — Aussagen prüfen." />
        <PartCard icon={BookOpen} title="Teil 3" desc="Selektives Lesen — Anzeigen & Texte." />
      </ModuleGroup>

      <ModuleGroup title="Sprachbausteine">
        <PartCard icon={Puzzle} title="Teil 1" desc="Grammatik — Lückentext mit Auswahl." />
        <PartCard icon={Puzzle} title="Teil 2" desc="Wortschatz — Passende Wörter einsetzen." />
      </ModuleGroup>

      <ModuleGroup title="Hören">
        <PartCard icon={Headphones} title="Teil 1" desc="Globalverständnis — Kurze Ansagen." />
        <PartCard icon={Headphones} title="Teil 2" desc="Detailverständnis — Gespräche." />
        <PartCard icon={Headphones} title="Teil 3" desc="Selektives Hören — Interviews & Berichte." />
      </ModuleGroup>

      <ModuleGroup title="Schreiben">
        <PartCard icon={Edit3} title="Brief / E-Mail" desc="Formelles und halbformelles Schreiben." />
      </ModuleGroup>
    </div>
  );
}
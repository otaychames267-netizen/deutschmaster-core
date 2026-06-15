import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { GraduationCap, BookOpen, Puzzle, Headphones, Edit3 } from "lucide-react";
import { SectionHeader, ModuleGroupWithProgress, PartCard } from "@/components/section/SectionShell";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung")({
  head: () => ({ meta: [{ title: "Schriftlich — Vorbereitung" }] }),
  component: SchriftlichVorbereitung,
});

function SchriftlichVorbereitung() {
  useEffect(() => {
    try {
      localStorage.setItem(
        "dm-last-activity",
        JSON.stringify({ label: "Schriftlich → Vorbereitung", to: "/schriftlich/vorbereitung" })
      );
    } catch {}
  }, []);
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SectionHeader
        icon={GraduationCap}
        title="Vorbereitung — Schriftlich"
        subtitle="Übungen pro Prüfungsteil. Wähle einen Bereich."
        backTo="/schriftlich"
        backLabel="Zurück zu Schriftlich"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Schriftlich", to: "/schriftlich" },
          { label: "Vorbereitung" },
        ]}
      />

      <ModuleGroupWithProgress title="Lesen" progress={0}>
        <PartCard icon={BookOpen} title="Teil 1" desc="Globalverständnis — Überschriften zuordnen." />
        <PartCard icon={BookOpen} title="Teil 2" desc="Detailverständnis — Aussagen prüfen." />
        <PartCard icon={BookOpen} title="Teil 3" desc="Selektives Lesen — Anzeigen & Texte." locked />
      </ModuleGroupWithProgress>

      <ModuleGroupWithProgress title="Sprachbausteine" progress={0}>
        <PartCard icon={Puzzle} title="Teil 1" desc="Grammatik — Lückentext mit Auswahl." />
        <PartCard icon={Puzzle} title="Teil 2" desc="Wortschatz — Passende Wörter einsetzen." locked />
      </ModuleGroupWithProgress>

      <ModuleGroupWithProgress title="Hören" progress={0}>
        <PartCard icon={Headphones} title="Teil 1" desc="Globalverständnis — Kurze Ansagen." />
        <PartCard icon={Headphones} title="Teil 2" desc="Detailverständnis — Gespräche." locked />
        <PartCard icon={Headphones} title="Teil 3" desc="Selektives Hören — Interviews & Berichte." locked />
      </ModuleGroupWithProgress>

      <ModuleGroupWithProgress title="Schreiben" progress={0}>
        <PartCard icon={Edit3} title="Brief / E-Mail" desc="Formelles und halbformelles Schreiben." locked />
      </ModuleGroupWithProgress>
    </div>
  );
}
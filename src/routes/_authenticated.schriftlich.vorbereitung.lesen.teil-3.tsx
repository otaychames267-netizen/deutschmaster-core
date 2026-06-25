import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-3")({
  component: () => (
    <VorbereitungPage
      title="Lesen — Teil 3"
      subtitle="Übungsschrift: Situationen und Informationstexte zuordnen"
      section="lesen"
      teil="teil_3"
      tips={[
        "Lesen Sie jede Situation sorgfältig — achten Sie auf die genauen Anforderungen.",
        "Ein Text kann die Antwort für mehrere Situationen sein — prüfen Sie alle Möglichkeiten.",
        "'X' ist eine gültige Antwort — wenn kein Text zur Situation passt, wählen Sie X.",
        "Lesen Sie zuerst die Situationen, dann die Infotexte.",
      ]}
    />
  ),
});

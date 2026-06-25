import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-1")({
  component: () => (
    <VorbereitungPage
      title="Hören — Teil 1"
      subtitle="Übungsschrift: Radiobeiträge — kurze Informationen verstehen"
      section="hoeren"
      teil="teil_1"
      tips={[
        "Lesen Sie die Fragen, bevor das Audio beginnt.",
        "Beim ersten Hören: Hauptaussage erfassen. Beim zweiten Hören: Details notieren.",
        "Schlüsselwörter aus den Fragen helfen Ihnen, die richtigen Antworten zu finden.",
        "Die Antworten kommen in der Reihenfolge der Fragen.",
      ]}
    />
  ),
});

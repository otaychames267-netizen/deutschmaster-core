import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/sprachbausteine/teil-1")({
  component: () => (
    <VorbereitungPage
      title="Sprachbausteine — Teil 1"
      subtitle="Übungsschrift: Lückentext — das richtige Wort aus 4 Optionen wählen"
      section="sprachbausteine"
      teil="teil_1"
      tips={[
        "Lesen Sie den gesamten Text durch, bevor Sie beginnen — der Kontext hilft bei den Lücken.",
        "Achten Sie auf Grammatik: Kasus, Tempus, Kongruenz.",
        "Wenn Sie unsicher sind, lesen Sie den Satz mit jeder Option laut — welche klingt natürlich?",
        "Alle 4 Optionen können grammatisch sein — der Kontext bestimmt die Bedeutung.",
      ]}
    />
  ),
});

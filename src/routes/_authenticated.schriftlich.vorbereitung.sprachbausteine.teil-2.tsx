import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/sprachbausteine/teil-2")({
  component: () => (
    <VorbereitungPage
      title="Sprachbausteine — Teil 2"
      subtitle="Übungsschrift: Lückentext — freie Textvervollständigung"
      section="sprachbausteine"
      teil="teil_2"
      tips={[
        "In Teil 2 müssen Sie das Wort selbst einsetzen — keine Optionen gegeben.",
        "Achten Sie auf Wortform: Nomen → Artikel + Kasus, Verb → Konjugation, Adjektiv → Endung.",
        "Lesen Sie den Satz vor und nach der Lücke für den Kontext.",
        "Überprüfen Sie Rechtschreibung und Großschreibung bei Nomen.",
      ]}
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-1")({
  component: () => (
    <VorbereitungPage
      title="Lesen — Teil 1"
      subtitle="Übungsschrift: Überschriften den Texten zuordnen (Heading matching)"
      section="lesen"
      teil="teil_1"
      tips={[
        "Lesen Sie zuerst alle Überschriften, bevor Sie die Texte lesen.",
        "Suchen Sie nach Schlüsselwörtern, die in der Überschrift und im Text vorkommen.",
        "Schließen Sie die einfachsten Zuordnungen zuerst ab.",
        "Achtung: Es gibt mehr Überschriften als Texte — einige werden nicht verwendet.",
      ]}
    />
  ),
});

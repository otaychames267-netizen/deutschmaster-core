import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-2")({
  component: () => (
    <VorbereitungPage
      title="Lesen — Teil 2"
      subtitle="Übungsschrift: Textverständnis — Multiple-Choice-Aufgaben zum Lesebogen"
      section="lesen"
      teil="teil_2"
      tips={[
        "Lesen Sie zuerst die Fragen, dann den Text — so wissen Sie, worauf Sie achten müssen.",
        "Die Antworten stehen immer im Text, auch wenn sie anders formuliert sind.",
        "Eliminieren Sie falsche Antworten systematisch.",
        "Beachten Sie Wörter wie 'immer', 'nie', 'nur' — sie können eine Antwort falsch machen.",
      ]}
    />
  ),
});

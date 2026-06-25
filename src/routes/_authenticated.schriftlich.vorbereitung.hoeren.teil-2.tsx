import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-2")({
  component: () => (
    <VorbereitungPage
      title="Hören — Teil 2"
      subtitle="Übungsschrift: Gespräche — Meinungen und Argumente verstehen"
      section="hoeren"
      teil="teil_2"
      tips={[
        "Achten Sie auf Signalwörter wie 'aber', 'allerdings', 'trotzdem' — sie zeigen einen Meinungswechsel an.",
        "Notieren Sie sich die Namen der Sprecher und deren Hauptargumente.",
        "Verwirrende Antworten sind oft falsch — vertrauen Sie Ihrem ersten Eindruck.",
        "Achten Sie auf Tonfall und Intonation für zusätzliche Bedeutungshinweise.",
      ]}
    />
  ),
});

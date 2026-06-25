import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-3")({
  component: () => (
    <VorbereitungPage
      title="Hören — Teil 3"
      subtitle="Übungsschrift: Interview — detailliertes Hörverstehen"
      section="hoeren"
      teil="teil_3"
      tips={[
        "Lesen Sie alle Aussagen vor dem Hören — markieren Sie Schlüsselwörter.",
        "Das Interview wird einmal gespielt — konzentrieren Sie sich vollständig.",
        "Falsche Aussagen enthalten oft ähnliche Wörter wie der Text, aber mit falscher Bedeutung.",
        "Bei Unsicherheit: Schließen Sie falsche Optionen aus.",
      ]}
    />
  ),
});

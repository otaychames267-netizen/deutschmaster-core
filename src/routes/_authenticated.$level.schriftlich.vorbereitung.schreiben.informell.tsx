import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/schreiben/informell")({
  component: () => (
    <VorbereitungPage
      title="Schreiben — Informeller Brief"
      subtitle="Übungsschrift: Einen persönlichen Brief an eine Freundin/einen Freund schreiben (100–150 Wörter)"
      section="schreiben"
      metadataCategory="informell"
      tips={[
        "Beginnen Sie mit einer informellen Anrede: 'Liebe Anna,' / 'Lieber Tom,'.",
        "Schreiben Sie in der Du-Form — das ist hier richtig, nicht die Sie-Form.",
        "Gehen Sie auf alle in der Aufgabe genannten Punkte ein, in einer sinnvollen Reihenfolge.",
        "Schreiben Sie persönlich und natürlich, wie an eine echte Freundin/einen echten Freund.",
        "Schließen Sie informell ab: 'Viele/Herzliche Grüße,' + Vorname.",
        "Ziel: 100–150 Wörter.",
      ]}
    />
  ),
});

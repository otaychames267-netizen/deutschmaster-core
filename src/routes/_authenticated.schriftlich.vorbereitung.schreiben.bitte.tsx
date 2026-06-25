import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/schreiben/bitte")({
  component: () => (
    <VorbereitungPage
      title="Schreiben — Bitte um Informationen"
      subtitle="Übungsschrift: Einen formellen Brief zur Informationsanfrage schreiben (80–100 Wörter)"
      section="schreiben"
      tips={[
        "Beginnen Sie mit einer formellen Anrede: 'Sehr geehrte Damen und Herren,'",
        "Erklären Sie kurz Ihr Anliegen im ersten Satz.",
        "Stellen Sie 2–3 konkrete Fragen — nicht zu viele.",
        "Bedanken Sie sich für die zukünftige Antwort.",
        "Schließen Sie formell ab: 'Mit freundlichen Grüßen,' + Name.",
      ]}
    />
  ),
});

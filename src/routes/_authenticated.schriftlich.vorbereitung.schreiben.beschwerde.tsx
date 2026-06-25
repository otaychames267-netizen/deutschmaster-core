import { createFileRoute } from "@tanstack/react-router";
import { VorbereitungPage } from "@/components/exercise/VorbereitungPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/schreiben/beschwerde")({
  component: () => (
    <VorbereitungPage
      title="Schreiben — Beschwerde"
      subtitle="Übungsschrift: Einen formellen Beschwerdebrief schreiben (80–100 Wörter)"
      section="schreiben"
      tips={[
        "Beginnen Sie mit einer formellen Anrede: 'Sehr geehrte Damen und Herren,'",
        "Beschreiben Sie das Problem klar und sachlich — keine Emotionen.",
        "Formulieren Sie eine konkrete Forderung: Rückerstattung, Entschuldigung, Lösung.",
        "Schließen Sie formell ab: 'Mit freundlichen Grüßen,' + Name.",
        "Ziel: 80–100 Wörter. Qualität ist wichtiger als Quantität.",
      ]}
    />
  ),
});

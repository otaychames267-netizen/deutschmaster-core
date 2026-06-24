import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/pruefung")({
  component: () => (
    <ComingSoon
      title="Prüfungssimulation — Schriftlich"
      description="The full written exam simulation (Lesen + Hören + Sprachbausteine + Schreiben) with timer, auto-save, and scoring is being built in Phase 2."
    />
  ),
});

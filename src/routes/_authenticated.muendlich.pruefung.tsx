import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/muendlich/pruefung")({
  component: () => (
    <ComingSoon
      title="Prüfungssimulation — Mündlich"
      description="The full oral exam simulation (Präsentation + Gespräch + Gemeinsam planen) is being built in Phase 4."
    />
  ),
});

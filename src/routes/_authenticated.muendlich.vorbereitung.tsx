import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung")({
  component: () => (
    <ComingSoon
      title="Mündlich — Vorbereitung"
      description="Individual speaking task practice (Präsentation, Gespräch, Gemeinsam planen) is being built in Phase 4."
    />
  ),
});

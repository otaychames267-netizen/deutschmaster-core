import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/statistik")({
  component: () => (
    <ComingSoon
      title="Statistik"
      description="Your detailed learning statistics — scores by section, progress over time, streak history, and exam performance breakdown — coming in Phase 2."
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/sprachbausteine/teil-1")({
  component: () => <ComingSoon title="Sprachbausteine — Teil 1" description="Grammar gap-fill exercises Teil 1 coming in Phase 2." />,
});

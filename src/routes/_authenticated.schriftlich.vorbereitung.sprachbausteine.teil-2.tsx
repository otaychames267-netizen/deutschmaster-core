import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/sprachbausteine/teil-2")({
  component: () => <ComingSoon title="Sprachbausteine — Teil 2" description="Grammar gap-fill exercises Teil 2 coming in Phase 2." />,
});

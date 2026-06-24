import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-3")({
  component: () => <ComingSoon title="Hören — Teil 3" description="Listening exercises Teil 3 coming in Phase 2." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-2")({
  component: () => <ComingSoon title="Hören — Teil 2" description="Listening exercises Teil 2 coming in Phase 2." />,
});

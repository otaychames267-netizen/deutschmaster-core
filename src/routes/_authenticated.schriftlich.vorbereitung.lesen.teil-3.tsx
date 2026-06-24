import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-3")({
  component: () => <ComingSoon title="Lesen — Teil 3" description="Situation-to-text matching (with X as a valid answer) coming in Phase 2." />,
});

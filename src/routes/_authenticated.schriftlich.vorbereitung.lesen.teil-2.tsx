import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-2")({
  component: () => <ComingSoon title="Lesen — Teil 2" description="Reading comprehension with A/B/C multiple choice questions coming in Phase 2." />,
});

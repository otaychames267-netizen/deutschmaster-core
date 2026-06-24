import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-1")({
  component: () => <ComingSoon title="Hören — Teil 1" description="Listening exercises with audio, questions and answers coming in Phase 2." />,
});

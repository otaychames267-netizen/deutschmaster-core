import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/lesen/teil-1")({
  component: () => <ComingSoon title="Lesen — Teil 1" description="Heading matching exercises (TELC Lesen Teil 1) are being built in Phase 2. Each exam will have 10 headings, 5 texts, and distractor headings stored separately." />,
});

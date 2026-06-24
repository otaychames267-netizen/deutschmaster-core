import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/exam/$id")({
  component: () => <ComingSoon title="Exam" description="The exam player is being built in Phase 2." />,
});

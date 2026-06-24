import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/practice/$level/$module/$teil")({
  component: () => <ComingSoon title="Practice" description="The practice engine is being built in Phase 2." />,
});

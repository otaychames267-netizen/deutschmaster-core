import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/help")({
  component: () => <ComingSoon title="Help Center" description="Documentation and FAQ coming soon." />,
});

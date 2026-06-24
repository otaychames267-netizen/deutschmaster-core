import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: () => (
    <ComingSoon
      title="Notifications"
      description="System notifications and subscription alerts are being built in Phase 2."
    />
  ),
});

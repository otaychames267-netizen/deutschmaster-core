import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: () => <ComingSoon title="Admin — admin/subscriptions" />,
});

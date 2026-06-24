import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: () => <ComingSoon title="Admin — admin/backup" />,
});

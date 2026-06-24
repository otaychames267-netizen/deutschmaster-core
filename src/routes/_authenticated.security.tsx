import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/security")({
  component: () => (
    <ComingSoon
      title="Security Settings"
      description="Device management, login history, 2FA setup, and security alerts are being built in Phase 2."
    />
  ),
});

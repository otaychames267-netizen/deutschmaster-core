import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/pruefung")({
  component: () => <ComingSoon title="Prüfungssimulation" description="Full exam simulation is being built in Phase 2." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/schreiben/beschwerde")({
  component: () => <ComingSoon title="Schreiben — Beschwerde" description="Complaint letter writing practice with model answers and scoring criteria coming in Phase 2." />,
});

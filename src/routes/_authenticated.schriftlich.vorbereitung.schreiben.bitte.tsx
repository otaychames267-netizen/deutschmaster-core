import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/schreiben/bitte")({
  component: () => <ComingSoon title="Schreiben — Bitte um Informationen" description="Information request letter writing practice coming in Phase 2." />,
});

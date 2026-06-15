import { createFileRoute } from "@tanstack/react-router";
import { LearnSection } from "@/components/LearnSection";

export const Route = createFileRoute("/_authenticated/pruefung")({
  head: () => ({ meta: [{ title: "Prüfungssimulation — DeutschMaster" }] }),
  component: () => <LearnSection section="pruefung" />,
});
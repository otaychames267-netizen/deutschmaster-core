import { createFileRoute } from "@tanstack/react-router";
import { LearnSection } from "@/components/LearnSection";

export const Route = createFileRoute("/_authenticated/schriftlich")({
  head: () => ({ meta: [{ title: "Schriftlich — DeutschMaster" }] }),
  component: () => <LearnSection section="schriftlich" />,
});
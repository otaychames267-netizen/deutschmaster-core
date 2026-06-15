import { createFileRoute } from "@tanstack/react-router";
import { LearnSection } from "@/components/LearnSection";

export const Route = createFileRoute("/_authenticated/muendlich")({
  head: () => ({ meta: [{ title: "Mündlich — DeutschMaster" }] }),
  component: () => <LearnSection section="muendlich" />,
});
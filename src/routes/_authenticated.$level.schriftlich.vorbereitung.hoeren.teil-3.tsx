import { createFileRoute } from "@tanstack/react-router";
import { HoerenTeilPage } from "@/components/exercise/hoeren/HoerenTeilPage";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung/hoeren/teil-3")({
  component: () => <HoerenTeilPage teil={3} />,
});

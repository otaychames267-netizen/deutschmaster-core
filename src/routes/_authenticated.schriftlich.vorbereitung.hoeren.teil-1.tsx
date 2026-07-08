import { createFileRoute } from "@tanstack/react-router";
import { HoerenTeilPage } from "@/components/exercise/hoeren/HoerenTeilPage";

export const Route = createFileRoute("/_authenticated/schriftlich/vorbereitung/hoeren/teil-1")({
  component: () => <HoerenTeilPage teil={1} />,
});

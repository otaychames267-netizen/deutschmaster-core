import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/schriftlich")({
  head: () => ({ meta: [{ title: "Schriftlich — Lingovia" }] }),
  component: () => <Outlet />,
});
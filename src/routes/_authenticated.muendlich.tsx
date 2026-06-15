import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/muendlich")({
  head: () => ({ meta: [{ title: "Mündlich — Lingovia" }] }),
  component: () => <Outlet />,
});
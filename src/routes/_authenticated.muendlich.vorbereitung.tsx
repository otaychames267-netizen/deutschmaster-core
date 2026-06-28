import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/muendlich/vorbereitung")({
  beforeLoad: () => {
    throw redirect({ to: "/muendlich" });
  },
  component: () => null,
});

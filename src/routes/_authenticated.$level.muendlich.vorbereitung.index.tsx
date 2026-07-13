import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$level/muendlich/vorbereitung/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$level/muendlich", params: { level: params.level } });
  },
  component: () => null,
});

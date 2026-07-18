import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { MUENDLICH_ENABLED } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/$level/muendlich")({
  // Launch gate: the Mündlich module is hidden until it's finished. This
  // layout route wraps EVERY Mündlich sub-route (index, vorbereitung teil
  // 1/2/3, pruefung), so blocking here bounces any attempt to reach speaking
  // content directly by URL — not just the ones surfaced in navigation.
  // beforeLoad runs before any child loads, so no Mündlich page ever renders.
  beforeLoad: ({ params }) => {
    if (!MUENDLICH_ENABLED) {
      throw redirect({ to: "/$level/dashboard", params: { level: params.level } });
    }
  },
  component: () => <Outlet />,
});

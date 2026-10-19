import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedContentGate } from "@/components/content-protection/ProtectedContentGate";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/vorbereitung")({
  component: () => (
    <ProtectedContentGate>
      <Outlet />
    </ProtectedContentGate>
  ),
});

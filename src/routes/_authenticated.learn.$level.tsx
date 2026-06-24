import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn/$level")({
  component: () => <Navigate to="/dashboard" replace />,
});

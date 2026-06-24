import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn/")({
  component: () => <Navigate to="/dashboard" replace />,
});

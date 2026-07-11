import { createFileRoute, Outlet, Navigate, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$level")({
  component: LevelLayout,
});

/** Locks every route beneath it to exactly one level (b1 or b2) — the URL is the
 * single source of truth for which level's content is active, so there is no
 * in-app toggle that could leak B1 content into a B2 session or vice versa. */
function LevelLayout() {
  const { level } = useParams({ from: "/_authenticated/$level" });
  if (level !== "b1" && level !== "b2") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

import { createFileRoute, Outlet, Navigate, useParams } from "@tanstack/react-router";
import { useB1Visible } from "@/lib/useB1Visible";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/$level")({
  component: LevelLayout,
});

/** Locks every route beneath it to exactly one level (b1 or b2) — the URL is the
 * single source of truth for which level's content is active, so there is no
 * in-app toggle that could leak B1 content into a B2 session or vice versa.
 * Also the single choke point for the B1 launch gate: every /b1/** route,
 * reached by click or direct URL, passes through here first.
 *
 * Regular students are additionally locked to the URL segment matching their
 * own `profiles.level` — B1 and B2 are separate courses (see the "leave this
 * course" copy on the profile page), so a B2 account must not be able to
 * reach /b1/** (or vice versa) just by typing the URL, even though the
 * underlying subscription plan itself is level-agnostic. Admins are exempt,
 * since they legitimately need to work on both courses' content. */
function LevelLayout() {
  const { level: urlLevel } = useParams({ from: "/_authenticated/$level" });
  const b1Visible = useB1Visible();
  const { level: profileLevel, isAdmin, roleLoading } = useAuth();

  if (urlLevel !== "b1" && urlLevel !== "b2") {
    return <Navigate to="/dashboard" replace />;
  }
  if (urlLevel === "b1" && !b1Visible) {
    return <Navigate to="/dashboard" replace />;
  }
  if (roleLoading) return null;
  if (!isAdmin) {
    const ownSeg = profileLevel === "TELC_B1" ? "b1" : "b2";
    if (urlLevel !== ownSeg) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <Outlet />;
}

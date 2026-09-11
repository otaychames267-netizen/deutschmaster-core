import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, roleLoading } = useAuth();
  const nav = useNavigate();

  /* Wait for the async admin-role fetch to actually resolve before deciding
   * to redirect. `loading` only reflects the session check — on a fresh
   * mount (page reload, deep link) it flips false before the separate
   * isAdmin fetch completes, which used to bounce real admins to /dashboard
   * every time they reloaded or opened an admin URL directly. Same race
   * class already fixed for onboarding in _authenticated.tsx. */
  useEffect(() => {
    if (!loading && !roleLoading && !isAdmin) {
      nav({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, roleLoading, nav]);

  if (loading || roleLoading) return null;
  if (!isAdmin) return null;

  return <Outlet />;
}

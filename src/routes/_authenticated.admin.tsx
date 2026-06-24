import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      nav({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, nav]);

  if (loading) return null;
  if (!isAdmin) return null;

  return <Outlet />;
}

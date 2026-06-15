import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user && !isAdmin) nav({ to: "/dashboard" });
  }, [isAdmin, loading, user, nav]);
  if (loading || !isAdmin) return <p className="text-muted-foreground">Checking admin access...</p>;
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 text-sm border-b pb-2">
        <Link to="/admin" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent" activeOptions={{ exact: true }}>Overview</Link>
        <Link to="/admin/exercises" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Exercises</Link>
        <Link to="/admin/audio" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Audio</Link>
        <Link to="/admin/users" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Users</Link>
        <Link to="/admin/subscriptions" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Subscriptions</Link>
        <Link to="/admin/plans" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Plans</Link>
        <Link to="/admin/analytics" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Analytics</Link>
        <Link to="/admin/messages" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Messages</Link>
        <Link to="/admin/backup" className="px-3 py-1.5 rounded hover:bg-accent/10 [&.active]:bg-accent/15 [&.active]:text-accent">Backup</Link>
      </nav>
      <Outlet />
    </div>
  );
}
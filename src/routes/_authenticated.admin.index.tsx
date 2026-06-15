import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Lingovia" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const [stats, setStats] = useState<{ users: number; activeSubs: number; revenue: number; payments: number; exercises: number; published: number }>({ users: 0, activeSubs: 0, revenue: 0, payments: 0, exercises: 0, published: 0 });
  const [recent, setRecent] = useState<Array<{ id: string; created_at: string; amount: number; currency: string; status: string }>>([]);

  useEffect(() => {
    (async () => {
      const [u, s, p, rp, ex, exP] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]),
        supabase.from("payments").select("amount,status"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("exercises").select("id", { count: "exact", head: true }),
        supabase.from("exercises").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      const revenue = (p.data ?? []).filter((x) => x.status === "succeeded").reduce((a, x) => a + Number(x.amount), 0);
      setStats({ users: u.count ?? 0, activeSubs: s.count ?? 0, revenue, payments: (p.data ?? []).length, exercises: ex.count ?? 0, published: exP.count ?? 0 });
      setRecent((rp.data ?? []) as typeof recent);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card><CardHeader><CardTitle className="text-sm">Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.users}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Active Subs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.activeSubs}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Revenue (EUR)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">€{stats.revenue.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Payments</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.payments}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Exercises</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.exercises}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Published</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.published}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to="/admin/exercises/new"><Button>New exercise</Button></Link>
          <Link to="/admin/audio"><Button variant="outline">Upload audio</Button></Link>
          <Link to="/admin/exercises"><Button variant="outline">Question bank</Button></Link>
          <Link to="/admin/backup"><Button variant="outline">Backup / Restore</Button></Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> :
            <ul className="divide-y">{recent.map((r) => (
              <li key={r.id} className="py-2 flex justify-between text-sm">
                <span>{new Date(r.created_at).toLocaleString()}</span>
                <span>{r.amount} {r.currency}</span>
                <Badge variant="outline">{r.status}</Badge>
              </li>
            ))}</ul>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>System Status</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">All systems operational. Automated backups managed by Lovable Cloud.</p></CardContent>
      </Card>
    </div>
  );
}
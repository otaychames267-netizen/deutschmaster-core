import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — DeutschMaster" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const [stats, setStats] = useState<any>({ users: 0, activeSubs: 0, revenue: 0, payments: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [u, s, p, rp] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]),
        supabase.from("payments").select("amount,status"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      const revenue = (p.data ?? []).filter((x: any) => x.status === "succeeded").reduce((a: number, x: any) => a + Number(x.amount), 0);
      setStats({ users: u.count ?? 0, activeSubs: s.count ?? 0, revenue, payments: (p.data ?? []).length });
      setRecent(rp.data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.users}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Active Subs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.activeSubs}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Revenue (EUR)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">€{stats.revenue.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Payments</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.payments}</p></CardContent></Card>
      </div>
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
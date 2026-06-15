import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<Array<{ id: string; email: string | null; full_name: string | null; suspended: boolean | null; created_at: string; sub: { plan_code: string; status: string; is_trial: boolean; expires_at: string } | null }>>([]);
  const [q, setQ] = useState("");

  const reload = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
    const { data: subs } = await supabase.from("subscriptions").select("user_id,plan_code,status,is_trial,expires_at");
    const subMap = new Map<string, { plan_code: string; status: string; is_trial: boolean; expires_at: string }>();
    (subs ?? []).forEach((s) => subMap.set(s.user_id, { plan_code: s.plan_code, status: s.status, is_trial: s.is_trial, expires_at: s.expires_at }));
    setUsers((profiles ?? []).map((p) => ({ id: p.id, email: p.email, full_name: p.full_name, suspended: p.suspended, created_at: p.created_at, sub: subMap.get(p.id) ?? null })));
  };
  useEffect(() => { reload(); }, []);

  const toggleSuspend = async (id: string, suspended: boolean) => {
    const { error } = await supabase.from("profiles").update({ suspended }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(suspended ? "User suspended" : "User reactivated"); reload(); }
  };

  const filtered = users.filter(u => !q || u.email?.toLowerCase().includes(q.toLowerCase()) || u.full_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader><CardTitle>Users ({filtered.length})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search by email or name..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Plan</TableHead><TableHead>Sub status</TableHead><TableHead>Registered</TableHead><TableHead>Account</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.full_name || "—"}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell className="capitalize">{u.sub?.plan_code ?? "—"}</TableCell>
            <TableCell>
              {u.sub ? (
                <div className="flex flex-col gap-0.5">
                  <Badge variant={u.sub.status === "active" ? "default" : u.sub.status === "trial" ? "secondary" : "outline"}>{u.sub.is_trial ? "trial" : u.sub.status}</Badge>
                  <span className="text-xs text-muted-foreground">until {new Date(u.sub.expires_at).toLocaleDateString()}</span>
                </div>
              ) : <span className="text-muted-foreground">none</span>}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
            <TableCell>{u.suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge>Active</Badge>}</TableCell>
            <TableCell><Button size="sm" variant="outline" onClick={() => toggleSuspend(u.id, !u.suspended)}>{u.suspended ? "Reactivate" : "Suspend"}</Button></TableCell>
          </TableRow>))}</TableBody></Table>
        </div>
      </CardContent>
    </Card>
  );
}
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
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const reload = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    setUsers(data ?? []);
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
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.full_name || "—"}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.level || "—"}</TableCell>
            <TableCell>{u.suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge>Active</Badge>}</TableCell>
            <TableCell><Button size="sm" variant="outline" onClick={() => toggleSuspend(u.id, !u.suspended)}>{u.suspended ? "Reactivate" : "Suspend"}</Button></TableCell>
          </TableRow>))}</TableBody></Table>
      </CardContent>
    </Card>
  );
}
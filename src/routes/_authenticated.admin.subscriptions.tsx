import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addDays, format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Admin" }] }),
  component: AdminSubs,
});

function AdminSubs() {
  const [subs, setSubs] = useState<any[]>([]);
  const reload = async () => {
    const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(200);
    setSubs(data ?? []);
  };
  useEffect(() => { reload(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); reload(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Subscriptions ({subs.length})</CardTitle></CardHeader>
      <CardContent>
        <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{subs.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}</TableCell>
            <TableCell>{s.plan_code}</TableCell>
            <TableCell><Badge variant={s.status === "active" ? "default" : s.status === "trial" ? "secondary" : "destructive"}>{s.status}</Badge></TableCell>
            <TableCell>{format(new Date(s.expires_at), "PP")}</TableCell>
            <TableCell className="space-x-1">
              <Button size="sm" variant="outline" onClick={() => update(s.id, { status: "active", expires_at: addDays(new Date(), 30).toISOString() })}>Activate</Button>
              <Button size="sm" variant="outline" onClick={() => update(s.id, { expires_at: addDays(new Date(s.expires_at), 30).toISOString() })}>+30d</Button>
              <Button size="sm" variant="ghost" onClick={() => update(s.id, { status: "cancelled", cancelled_at: new Date().toISOString() })}>Cancel</Button>
            </TableCell>
          </TableRow>))}</TableBody></Table>
      </CardContent>
    </Card>
  );
}
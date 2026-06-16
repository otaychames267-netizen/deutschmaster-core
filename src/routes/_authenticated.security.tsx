import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security — Lingovia" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const { user } = useAuth();
  const [logins, setLogins] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  const reload = async () => {
    if (!user) return;
    const [lh, dv] = await Promise.all([
      supabase.from("login_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("devices").select("*").eq("user_id", user.id).order("last_seen", { ascending: false }),
    ]);
    setLogins(lh.data ?? []); setDevices(dv.data ?? []);
  };
  useEffect(() => { reload(); }, [user?.id]);

  const trust = async (id: string, trusted: boolean) => {
    const { error } = await supabase.from("devices").update({ trusted }).eq("id", id);
    if (error) toast.error(error.message); else reload();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) toast.error(error.message); else reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security</h1>
      <Card>
        <CardHeader><CardTitle>Trusted Devices</CardTitle></CardHeader>
        <CardContent>
          {devices.length === 0 ? <p className="text-sm text-muted-foreground">No devices recorded.</p> : (
            <Table><TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Last seen</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.device_name || d.device_fingerprint.slice(0, 12)}</TableCell>
                <TableCell>{format(new Date(d.last_seen), "PPp")}</TableCell>
                <TableCell>{d.trusted ? <Badge>Trusted</Badge> : <Badge variant="outline">Untrusted</Badge>}</TableCell>
                <TableCell className="space-x-2"><Button size="sm" variant="ghost" onClick={() => trust(d.id, !d.trusted)}>{d.trusted ? "Untrust" : "Trust"}</Button><Button size="sm" variant="ghost" onClick={() => remove(d.id)}>Remove</Button></TableCell>
              </TableRow>))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Login History</CardTitle></CardHeader>
        <CardContent>
          {logins.length === 0 ? <p className="text-sm text-muted-foreground">No login records.</p> : (
            <Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>IP</TableHead><TableHead>Agent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{logins.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{format(new Date(l.created_at), "PPp")}</TableCell>
                <TableCell>{l.ip_address || "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-xs">{l.user_agent}</TableCell>
                <TableCell>{l.success ? <Badge>OK</Badge> : <Badge variant="destructive">Failed</Badge>}</TableCell>
              </TableRow>))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
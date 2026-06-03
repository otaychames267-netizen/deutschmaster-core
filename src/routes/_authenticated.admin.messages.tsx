import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({ meta: [{ title: "Contact Messages — Admin" }] }),
  component: AdminMessages,
});

function AdminMessages() {
  const [msgs, setMsgs] = useState<any[]>([]);

  const load = async () => {
    const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMsgs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status updated"); load(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Contact Messages</CardTitle></CardHeader>
      <CardContent>
        {msgs.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>{msgs.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap text-xs">{format(new Date(m.created_at), "PP p")}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell><a href={`mailto:${m.email}`} className="text-accent">{m.email}</a></TableCell>
                <TableCell className="max-w-md whitespace-pre-wrap text-sm">{m.message}</TableCell>
                <TableCell><Badge variant={m.status === "new" ? "default" : m.status === "replied" ? "secondary" : "outline"}>{m.status}</Badge></TableCell>
                <TableCell className="space-x-1">
                  {m.status !== "read" && <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "read")}>Mark read</Button>}
                  {m.status !== "replied" && <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "replied")}>Replied</Button>}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
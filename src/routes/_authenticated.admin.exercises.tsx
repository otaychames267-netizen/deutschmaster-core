import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/exercises")({
  head: () => ({ meta: [{ title: "Exercises — Admin" }] }),
  component: AdminExercises,
});

type Row = {
  id: string; level: string; module: string; teil: number; position: number;
  title: string; status: string; updated_at: string;
};

function AdminExercises() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [mod, setMod] = useState("all");
  const [status, setStatus] = useState("all");

  const reload = async () => {
    let qry = supabase.from("exercises").select("id,level,module,teil,position,title,status,updated_at").order("updated_at", { ascending: false }).limit(500);
    if (level !== "all") qry = qry.eq("level", level);
    if (mod !== "all") qry = qry.eq("module", mod);
    if (status !== "all") qry = qry.eq("status", status);
    const { data, error } = await qry;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [level, mod, status]);

  const setStatusFor = async (id: string, next: "published" | "hidden" | "draft") => {
    const { error } = await supabase.from("exercises").update({ status: next }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Set to ${next}`); reload(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this exercise?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  const filtered = rows.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Question Bank ({filtered.length})</CardTitle>
        <Button onClick={() => nav({ to: "/admin/exercises/new" })}>New exercise</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <Input placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="b1">B1</SelectItem>
              <SelectItem value="b2">B2</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mod} onValueChange={setMod}>
            <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              <SelectItem value="lesen">Lesen</SelectItem>
              <SelectItem value="sprachbausteine">Sprachbausteine</SelectItem>
              <SelectItem value="hoeren">Hören</SelectItem>
              <SelectItem value="schreiben">Schreiben</SelectItem>
              <SelectItem value="muendlich">Mündlich</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Teil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No exercises yet. Click "New exercise" to add one.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link to="/admin/exercises/$id" params={{ id: r.id }} className="hover:underline">{r.title}</Link>
                  </TableCell>
                  <TableCell className="uppercase">{r.level}</TableCell>
                  <TableCell className="capitalize">{r.module}</TableCell>
                  <TableCell>{r.teil}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "published" ? "default" : r.status === "hidden" ? "destructive" : "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Link to="/admin/exercises/$id" params={{ id: r.id }}>
                      <Button size="icon" variant="ghost"><Pencil className="size-4" /></Button>
                    </Link>
                    {r.status === "published" ? (
                      <Button size="icon" variant="ghost" onClick={() => setStatusFor(r.id, "hidden")} title="Hide"><EyeOff className="size-4" /></Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => setStatusFor(r.id, "published")} title="Publish"><Eye className="size-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="Delete"><Trash2 className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
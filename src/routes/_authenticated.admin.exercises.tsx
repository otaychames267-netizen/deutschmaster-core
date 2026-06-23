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
import { Eye, EyeOff, Trash2, Pencil, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/exercises")({
  head: () => ({ meta: [{ title: "Exercises — Admin" }] }),
  component: AdminExercises,
  errorComponent: ({ error, reset }) => (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-destructive">Admin Exercises – render error</h2>
      <pre className="text-xs bg-muted rounded p-3 overflow-auto whitespace-pre-wrap">
        {(error as Error)?.message ?? String(error)}
        {"\n\n"}
        {(error as Error)?.stack ?? ""}
      </pre>
      <Button onClick={reset}>Try again</Button>
    </div>
  ),
});

type Row = {
  id: string;
  level: string | null;
  module: string | null;
  teil: number | null;
  position: number | null;
  title: string | null;
  status: string | null;
  updated_at: string | null;
  collection_id: string | null;
};

type Collection = {
  id: string;
  title: string;
  exerciseCount: number;
  level: string | null;
  module: string | null;
  teil: number | null;
};

function AdminExercises() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [mod, setMod] = useState("all");
  const [status, setStatus] = useState("all");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newColTitle, setNewColTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const reloadCollections = async () => {
    const { data, error } = await supabase
      .from("exercise_collections")
      .select("id,title,level,module,teil")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Sammlungen: " + error.message);
      return;
    }
    const ids = (data ?? []).map((c) => c.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: exRows } = await supabase.from("exercises").select("collection_id").in("collection_id", ids);
      for (const row of exRows ?? []) {
        const cid = row.collection_id as string;
        if (cid) counts[cid] = (counts[cid] ?? 0) + 1;
      }
    }
    setCollections(
      (data ?? []).map((c) => ({
        ...c,
        exerciseCount: counts[c.id] ?? 0,
      })) as Collection[],
    );
  };

  const onCreateCollection = async () => {
    const t = newColTitle.trim();
    if (!t) {
      toast.error("Titel erforderlich");
      return;
    }
    const { error } = await supabase.from("exercise_collections").insert({ title: t });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewColTitle("");
    toast.success("Sammlung erstellt");
    reloadCollections();
  };

  const onRename = async (id: string) => {
    const t = editTitle.trim();
    if (!t) return;
    const { error } = await supabase.from("exercise_collections").update({ title: t }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingId(null);
    toast.success("Umbenannt");
    reloadCollections();
  };

  const onDeleteCollection = async (id: string) => {
    if (!confirm('Sammlung löschen? Die Übungen bleiben erhalten und werden als „Ohne Sammlung" angezeigt.')) return;
    const { error } = await supabase.from("exercise_collections").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sammlung gelöscht");
    reloadCollections();
    reload();
  };

  const onMove = async (exerciseId: string, collectionId: string) => {
    const { error } = await supabase
      .from("exercises")
      .update({ collection_id: collectionId === "__none__" ? null : collectionId })
      .eq("id", exerciseId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verschoben");
    reload();
    reloadCollections();
  };

  const reload = async () => {
    setLoading(true);
    try {
      let qry = supabase
        .from("exercises")
        .select("id,level,module,teil,position,title,status,updated_at,collection_id")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (level !== "all") qry = qry.eq("level", level as any);
      if (mod !== "all") qry = qry.eq("module", mod as any);
      if (status !== "all") qry = qry.eq("status", status as any);
      const { data, error } = await qry;
      if (error) toast.error(error.message);
      setRows((data ?? []) as Row[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [level, mod, status]);
  useEffect(() => {
    reloadCollections();
  }, []);

  const setStatusFor = async (id: string, next: "published" | "hidden" | "draft") => {
    const { error } = await supabase.from("exercises").update({ status: next }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Set to ${next}`);
      reload();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this exercise?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      reload();
    }
  };

  const filtered = rows.filter((r) => (!q ? true : (r.title ?? "").toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>📚 Sammlungen ({collections.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Neuer Sammlungstitel (manuell)…"
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
            />
            <Button onClick={onCreateCollection} disabled={!newColTitle.trim()}>
              Erstellen
            </Button>
          </div>
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Sammlungen.</p>
          ) : (
            <div className="space-y-1">
              {collections.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded border p-2">
                  {editingId === c.id ? (
                    <>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="flex-1" />
                      <Button size="sm" onClick={() => onRename(c.id)}>
                        Speichern
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Abbrechen
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">📖 {c.title}</span>
                      <Badge variant="secondary">
                        {c.exerciseCount} Übung{c.exerciseCount === 1 ? "" : "en"}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditTitle(c.title);
                        }}
                        title="Umbenennen"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDeleteCollection(c.id)} title="Löschen">
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            Question Bank ({filtered.length}
            {loading && <RefreshCw className="inline ml-2 size-3 animate-spin" />})
          </CardTitle>
          <Button onClick={() => nav({ to: "/admin/exercises/new" })}>New exercise</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="b1">B1</SelectItem>
                <SelectItem value="b2">B2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mod} onValueChange={setMod}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      No exercises yet. Click "New exercise" to add one.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link to="/admin/exercises/$id" params={{ id: r.id }} className="hover:underline">
                        {r.title ?? <span className="italic text-muted-foreground">(no title)</span>}
                      </Link>
                    </TableCell>
                    <TableCell className="uppercase">{r.level ?? "—"}</TableCell>
                    <TableCell className="capitalize">{r.module ?? "—"}</TableCell>
                    <TableCell>{r.teil ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={r.collection_id ?? "__none__"} onValueChange={(v) => onMove(r.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="— Ohne —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Ohne Sammlung —</SelectItem>
                          {collections.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "published" ? "default" : r.status === "hidden" ? "destructive" : "secondary"
                        }
                      >
                        {r.status ?? "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Link to="/admin/exercises/$id" params={{ id: r.id }}>
                        <Button size="icon" variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      {r.status === "published" ? (
                        <Button size="icon" variant="ghost" onClick={() => setStatusFor(r.id, "hidden")} title="Hide">
                          <EyeOff className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setStatusFor(r.id, "published")}
                          title="Publish"
                        >
                          <Eye className="size-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="Delete">
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

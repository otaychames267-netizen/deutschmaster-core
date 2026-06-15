import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audio")({
  head: () => ({ meta: [{ title: "Audio — Admin" }] }),
  component: AdminAudio,
});

type AudioRow = { id: string; title: string; description: string | null; storage_path: string; duration_seconds: number | null; transcript: string | null; created_at: string };

function AdminAudio() {
  const [rows, setRows] = useState<AudioRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const reload = async () => {
    const { data, error } = await supabase.from("audio_assets").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as AudioRow[]);
  };
  useEffect(() => { reload(); }, []);

  const upload = async () => {
    if (!file || !title.trim()) { toast.error("Title and file are required"); return; }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}-${safe}`;
      const up = await supabase.storage.from("audio").upload(path, file, { contentType: file.type || "audio/mpeg" });
      if (up.error) throw up.error;
      let duration: number | null = null;
      try {
        const url = URL.createObjectURL(file);
        const audioEl = new window.Audio(url);
        await new Promise<void>((r) => { audioEl.onloadedmetadata = () => r(); audioEl.onerror = () => r(); });
        duration = isFinite(audioEl.duration) ? Math.round(audioEl.duration) : null;
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
      const ins = await supabase.from("audio_assets").insert({
        title: title.trim(), description: description.trim() || null, transcript: transcript.trim() || null,
        storage_path: path, duration_seconds: duration,
      });
      if (ins.error) throw ins.error;
      toast.success("Audio uploaded");
      setTitle(""); setDescription(""); setTranscript(""); setFile(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const play = async (row: AudioRow) => {
    if (signedUrls[row.id]) return;
    const { data, error } = await supabase.storage.from("audio").createSignedUrl(row.storage_path, 3600);
    if (error) { toast.error(error.message); return; }
    setSignedUrls((s) => ({ ...s, [row.id]: data.signedUrl }));
  };

  const remove = async (row: AudioRow) => {
    if (!confirm(`Delete "${row.title}"? This may break linked exercises.`)) return;
    await supabase.storage.from("audio").remove([row.storage_path]);
    const { error } = await supabase.from("audio_assets").delete().eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); reload(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Upload audio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hören Teil 1 — Ansagen" />
            </div>
            <div className="space-y-1.5">
              <Label>Audio file (.mp3, .m4a, .wav)</Label>
              <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Transcript (optional)</Label>
            <Textarea rows={4} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          </div>
          <Button onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Library ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Title</TableHead><TableHead>Duration</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No audio yet.</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{r.duration_seconds ? `${Math.floor(r.duration_seconds / 60)}:${String(r.duration_seconds % 60).padStart(2, "0")}` : "—"}</TableCell>
                    <TableCell>
                      {signedUrls[r.id] ? (
                        <audio controls src={signedUrls[r.id]} className="h-8" />
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => play(r)}>Load</Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="size-4" /></Button>
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
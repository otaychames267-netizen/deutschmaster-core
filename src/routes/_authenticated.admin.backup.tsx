import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  head: () => ({ meta: [{ title: "Backup — Admin" }] }),
  component: AdminBackup,
});

const TABLES = [
  "exercises",
  "audio_assets",
  "plans",
  "profiles",
  "subscriptions",
  "user_roles",
  "user_exercise_attempts",
] as const;

function AdminBackup() {
  const [busy, setBusy] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const exportAll = async () => {
    setBusy(true);
    try {
      const dump: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from(t as any) as any).select("*");
        if (error) throw new Error(`${t}: ${error.message}`);
        dump[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), tables: dump }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lingovia-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const importAll = async () => {
    if (!importFile) { toast.error("Pick a backup file first"); return; }
    if (!confirm("Importing will UPSERT rows into the database. Existing rows with the same id will be overwritten. Continue?")) return;
    setBusy(true);
    const log: string[] = [];
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const tables = parsed.tables ?? parsed;
      const order = ["plans", "audio_assets", "exercises", "profiles", "subscriptions", "user_roles", "user_exercise_attempts"];
      for (const t of order) {
        const rows = tables[t];
        if (!Array.isArray(rows) || rows.length === 0) { log.push(`${t}: skipped`); continue; }
        const conflict = t === "plans" ? "code" : "id";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from(t as any) as any).upsert(rows, { onConflict: conflict });
        if (error) { log.push(`${t}: ERROR ${error.message}`); }
        else { log.push(`${t}: ${rows.length} row(s) upserted`); }
      }
      setReport(log.join("\n"));
      toast.success("Import completed (see report)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Export full backup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Downloads a JSON file with all rows from the tables below.</p>
          <div className="flex flex-wrap gap-1">{TABLES.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
          <Button onClick={exportAll} disabled={busy}>{busy ? "Working…" : "Download backup"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Import backup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Restores rows from a JSON file produced above. Existing rows with the same id are overwritten.</p>
          <Input type="file" accept="application/json" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
          <Button onClick={importAll} disabled={busy || !importFile}>{busy ? "Importing…" : "Import"}</Button>
          {report && <pre className="text-xs bg-muted/30 rounded p-3 whitespace-pre-wrap">{report}</pre>}
        </CardContent>
      </Card>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createPdfImport, parsePdfImport, publishCandidate } from "@/lib/admin/pdf-import.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSearch, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pdf-import")({
  head: () => ({ meta: [{ title: "PDF Import — Admin" }] }),
  component: PdfImportPage,
});

type Candidate = { teil?: number; index?: number; question: string; options: string[]; answer?: string };

function PdfImportPage() {
  const create = useServerFn(createPdfImport);
  const parse = useServerFn(parsePdfImport);
  const publish = useServerFn(publishCandidate);

  const [importId, setImportId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);

  const [defaults, setDefaults] = useState({
    level: "b2" as "b1" | "b2",
    module: "lesen" as "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich",
    teil: 1,
  });

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error } = await supabase.storage.from("pdf-imports").upload(path, file);
      if (error) throw error;
      const r = await create({ data: { storagePath: path, originalName: file.name } });
      setImportId(r.id);
      toast.success("PDF gespeichert. Bitte Text einfügen und parsen.");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload fehlgeschlagen");
    } finally { setBusy(false); }
  };

  const doParse = async () => {
    if (!importId) { toast.error("Bitte zuerst PDF hochladen"); return; }
    if (text.trim().length < 20) { toast.error("Bitte den extrahierten Text einfügen"); return; }
    setBusy(true);
    try {
      const r = await parse({ data: { importId, text } });
      setCandidates(r.candidates);
      toast.success(`${r.count} Kandidaten gefunden`);
    } catch (e: any) {
      toast.error(e?.message ?? "Parsen fehlgeschlagen");
    } finally { setBusy(false); }
  };

  const discard = (i: number) => setCandidates((cs) => cs.filter((_, idx) => idx !== i));

  const sendToBank = async (c: Candidate, i: number) => {
    try {
      const kind = c.options.length >= 2 ? "multiple_choice" : "open_text";
      await publish({
        data: {
          level: defaults.level,
          module: defaults.module,
          teil: c.teil ?? defaults.teil,
          title: `${defaults.module.toUpperCase()} Teil ${c.teil ?? defaults.teil} — ${c.index ?? i + 1}`,
          prompt: c.question,
          passage: null,
          kind,
          options: c.options,
          correct: c.answer ? [c.answer] : [],
        },
      });
      toast.success("Als Entwurf gespeichert");
      discard(i);
    } catch (e: any) {
      toast.error(e?.message ?? "Konnte nicht speichern");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="size-4" /> PDF Import</CardTitle>
          <CardDescription>1) PDF hochladen · 2) Text einfügen (z. B. aus Acrobat copy-paste) · 3) Kandidaten prüfen und veröffentlichen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={defaults.level} onValueChange={(v) => setDefaults((d) => ({ ...d, level: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="b1">B1</SelectItem><SelectItem value="b2">B2</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select value={defaults.module} onValueChange={(v) => setDefaults((d) => ({ ...d, module: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesen">Lesen</SelectItem>
                  <SelectItem value="sprachbausteine">Sprachbausteine</SelectItem>
                  <SelectItem value="hoeren">Hören</SelectItem>
                  <SelectItem value="schreiben">Schreiben</SelectItem>
                  <SelectItem value="muendlich">Mündlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default Teil</Label>
              <Input type="number" min={1} max={5} value={defaults.teil} onChange={(e) => setDefaults((d) => ({ ...d, teil: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>PDF Datei</Label>
              <Input type="file" accept="application/pdf" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Extrahierter Text (aus PDF kopieren und hier einfügen)</Label>
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Teil 1&#10;1. Frage…&#10;A) Option A&#10;B) Option B" />
          </div>
          <Button onClick={doParse} disabled={busy || !importId}>
            <FileSearch className="size-4 mr-1" /> Text parsen
          </Button>
          {!importId && <p className="text-xs text-muted-foreground">Lade zuerst eine PDF-Datei hoch.</p>}
        </CardContent>
      </Card>

      {candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kandidaten ({candidates.length})</CardTitle>
            <CardDescription>Übernimm jeden Kandidaten in die Datenbank. Alles wird als Entwurf gespeichert.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidates.map((c, i) => (
              <div key={i} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {c.teil != null && <Badge variant="outline">Teil {c.teil}</Badge>}
                  {c.index != null && <Badge variant="outline">#{c.index}</Badge>}
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.question}</p>
                {c.options.length > 0 && (
                  <ul className="text-sm text-muted-foreground space-y-0.5 pl-3 list-disc">
                    {c.options.map((o, j) => <li key={j}>{o}</li>)}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => sendToBank(c, i)}><Check className="size-3.5 mr-1" /> Übernehmen</Button>
                  <Button size="sm" variant="ghost" onClick={() => discard(i)}><X className="size-3.5 mr-1" /> Verwerfen</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
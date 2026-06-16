import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createPdfImportV2,
  extractPdfVerbatim,
  getExtraction,
  listPdfImports,
  buildExercisesFromExtraction,
  publishExercise,
  checkSuperAdmin,
  runFidelityCheck,
  getLatestFidelityReport,
} from "@/lib/admin/pdf-pipeline.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSearch, Check, FileText, Key, Hammer, ShieldCheck, ScanSearch, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/pdf-import")({
  head: () => ({ meta: [{ title: "PDF Import — Lingovia Admin" }] }),
  component: PdfImportPage,
});

type PdfImportRow = {
  id: string;
  original_name: string | null;
  kind: "exam" | "answer_key";
  level: string | null;
  status: string;
  linked_import_id: string | null;
  created_at: string;
  ocr_used: boolean;
};

function PdfImportPage() {
  const createImport = useServerFn(createPdfImportV2);
  const extract = useServerFn(extractPdfVerbatim);
  const fetchExtraction = useServerFn(getExtraction);
  const fetchImports = useServerFn(listPdfImports);
  const buildExercises = useServerFn(buildExercisesFromExtraction);
  const publish = useServerFn(publishExercise);
  const checkRole = useServerFn(checkSuperAdmin);
  const fidelityRun = useServerFn(runFidelityCheck);
  const fidelityGet = useServerFn(getLatestFidelityReport);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState<PdfImportRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [extractionPreview, setExtractionPreview] = useState<any>(null);
  const [buildLevel, setBuildLevel] = useState<"b1" | "b2">("b2");
  const [buildModule, setBuildModule] = useState<"lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich">("lesen");

  const refresh = async () => {
    const r = await fetchImports();
    setImports(r.items as PdfImportRow[]);
  };

  useEffect(() => {
    checkRole().then(r => setIsSuperAdmin(r.isSuperAdmin)).catch(() => {});
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = async (file: File, kind: "exam" | "answer_key", level: "b1" | "b2") => {
    setBusy(true);
    try {
      const path = `${kind}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error } = await supabase.storage.from("pdf-imports").upload(path, file);
      if (error) throw error;
      await createImport({ data: { storagePath: path, originalName: file.name, kind, level } });
      toast.success(`${kind === "exam" ? "Prüfungs-PDF" : "Lösungsschlüssel"} hochgeladen`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload fehlgeschlagen");
    } finally { setBusy(false); }
  };

  const runExtract = async (id: string) => {
    if (!isSuperAdmin) { toast.error("Nur Super-Admin"); return; }
    setBusy(true);
    try {
      toast.info("Extrahiere mit Gemini Vision … das kann 30–60 s dauern.");
      const r = await extract({ data: { importId: id } });
      toast.success(`Extraktion fertig: ${r.blockCount} Blöcke`);
      await refresh();
      await preview(id);
    } catch (e: any) {
      toast.error(e?.message ?? "Extraktion fehlgeschlagen");
    } finally { setBusy(false); }
  };

  const preview = async (id: string) => {
    const r = await fetchExtraction({ data: { importId: id } });
    setExtractionPreview(r);
  };

  const build = async () => {
    if (!isSuperAdmin) { toast.error("Nur Super-Admin"); return; }
    if (!selectedExamId) { toast.error("Bitte Prüfungs-PDF auswählen"); return; }
    setBusy(true);
    try {
      const r = await buildExercises({
        data: {
          examImportId: selectedExamId,
          answerKeyImportId: selectedKeyId,
          level: buildLevel,
          moduleHint: buildModule,
        },
      });
      toast.success(`${r.exerciseCount} Übungen erstellt, ${r.keyCount} Lösungen verknüpft (Entwurf)`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Bauen fehlgeschlagen");
    } finally { setBusy(false); }
  };

  const examImports = imports.filter(i => i.kind === "exam");
  const keyImports = imports.filter(i => i.kind === "answer_key");

  return (
    <div className="space-y-4">
      {!isSuperAdmin && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm">
          Sie sind als Admin angemeldet. Hochladen ist erlaubt, aber <b>Extrahieren, Bauen, Veröffentlichen und Regrade</b> sind nur für den Super-Admin freigeschaltet.
        </div>
      )}

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload"><Upload className="size-3.5 mr-1" />Hochladen</TabsTrigger>
          <TabsTrigger value="extract"><FileSearch className="size-3.5 mr-1" />Extraktion</TabsTrigger>
          <TabsTrigger value="build"><Hammer className="size-3.5 mr-1" />Übungen bauen</TabsTrigger>
          <TabsTrigger value="fidelity"><ScanSearch className="size-3.5 mr-1" />Treuekontrolle</TabsTrigger>
          <TabsTrigger value="publish"><ShieldCheck className="size-3.5 mr-1" />Veröffentlichen</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="size-4" />Prüfungs-PDF hochladen</CardTitle>
              <CardDescription>Original-TELC-PDF. Inhalt bleibt unverändert (verbatim). Auch gescannte PDFs werden per OCR (Gemini Vision) verarbeitet.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadRow onUpload={(f, lvl) => upload(f, "exam", lvl)} busy={busy} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="size-4" />Lösungsschlüssel hochladen</CardTitle>
              <CardDescription>Antwortenheft / Lösungs-PDF. Wird im Hintergrund gespeichert und nur für Korrektur verwendet — Lernende sehen den Schlüssel <b>nie</b>.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadRow onUpload={(f, lvl) => upload(f, "answer_key", lvl)} busy={busy} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extract" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Importierte PDFs</CardTitle>
              <CardDescription>Klicken Sie auf „Extrahieren" um Inhalt verbatim mit Gemini Vision zu lesen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {imports.length === 0 && <p className="text-sm text-muted-foreground">Noch keine PDFs hochgeladen.</p>}
              {imports.map(i => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={i.kind === "exam" ? "default" : "secondary"}>{i.kind === "exam" ? "Prüfung" : "Schlüssel"}</Badge>
                      {i.level && <Badge variant="outline">{i.level.toUpperCase()}</Badge>}
                      <Badge variant="outline">{i.status}</Badge>
                    </div>
                    <p className="text-sm truncate mt-0.5">{i.original_name ?? i.id}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => preview(i.id)}>Vorschau</Button>
                    <Button size="sm" onClick={() => runExtract(i.id)} disabled={busy || !isSuperAdmin}>Extrahieren</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {extractionPreview?.extraction && (
            <Card>
              <CardHeader>
                <CardTitle>Vorschau: {extractionPreview.import?.original_name}</CardTitle>
                <CardDescription>{extractionPreview.extraction.blocks?.length ?? 0} Blöcke · {extractionPreview.extraction.page_count ?? "?"} Seiten</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[480px] overflow-auto text-xs bg-muted/40 rounded p-2 whitespace-pre-wrap">
                  {JSON.stringify(extractionPreview.extraction.blocks?.slice(0, 30) ?? [], null, 2)}
                </pre>
                {(extractionPreview.extraction.blocks?.length ?? 0) > 30 && (
                  <p className="text-xs text-muted-foreground mt-2">Zeige die ersten 30 Blöcke …</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="build" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Übungen aus Extraktion bauen</CardTitle>
              <CardDescription>Erzeugt Entwürfe in der Übungsbank. Original-Inhalt bleibt unverändert. Lösungen werden separat (verborgen) gespeichert.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Prüfungs-PDF</Label>
                <Select value={selectedExamId ?? ""} onValueChange={(v) => setSelectedExamId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    {examImports.map(i => <SelectItem key={i.id} value={i.id}>{i.original_name ?? i.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lösungsschlüssel (optional)</Label>
                <Select value={selectedKeyId ?? ""} onValueChange={(v) => setSelectedKeyId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="— keiner —" /></SelectTrigger>
                  <SelectContent>
                    {keyImports.map(i => <SelectItem key={i.id} value={i.id}>{i.original_name ?? i.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={buildLevel} onValueChange={(v) => setBuildLevel(v as "b1"|"b2")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="b1">B1</SelectItem><SelectItem value="b2">B2</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modul</Label>
                <Select value={buildModule} onValueChange={(v) => setBuildModule(v as any)}>
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
              <div className="sm:col-span-2">
                <Button onClick={build} disabled={busy || !isSuperAdmin || !selectedExamId}>
                  <Hammer className="size-4 mr-1" />Übungen erstellen (Entwurf)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publish">
          <PublishDraftListImpl publish={publish} isSuperAdmin={isSuperAdmin} fidelityGet={fidelityGet} />
        </TabsContent>

        <TabsContent value="fidelity">
          <FidelityPanel
            examImports={examImports}
            run={fidelityRun}
            get={fidelityGet}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UploadRow({ onUpload, busy }: { onUpload: (f: File, lvl: "b1" | "b2") => void; busy: boolean }) {
  const [level, setLevel] = useState<"b1" | "b2">("b2");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Level</Label>
        <Select value={level} onValueChange={(v) => setLevel(v as "b1"|"b2")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="b1">B1</SelectItem><SelectItem value="b2">B2</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>PDF</Label>
        <Input type="file" accept="application/pdf" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, level); }} />
      </div>
    </div>
  );
}

function PublishDraftListImpl({ publish, isSuperAdmin, fidelityGet }: { publish: any; isSuperAdmin: boolean; fidelityGet: any }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<Record<string, any>>({});
  const load = async () => {
    const { data } = await supabase
      .from("exercises")
      .select("id, title, level, module, teil, status, source_pdf_import_id, original_numbering")
      .eq("status", "draft")
      .not("source_pdf_import_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    setDrafts(data ?? []);
    // Fetch latest fidelity report per unique source_pdf_import_id
    const ids = Array.from(new Set((data ?? []).map((d: any) => d.source_pdf_import_id).filter(Boolean)));
    const next: Record<string, any> = {};
    for (const id of ids) {
      try { const r = await fidelityGet({ data: { examImportId: id } }); next[id] = r.report; } catch {}
    }
    setReports(next);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const onPublish = async (id: string) => {
    setBusy(true);
    try {
      await publish({ data: { exerciseId: id } });
      toast.success("Veröffentlicht");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Veröffentlichen fehlgeschlagen");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Check className="size-4" />Entwürfe veröffentlichen</CardTitle>
        <CardDescription>Nach der Veröffentlichung sind Übungen für Lernende sichtbar. Lösungen bleiben verborgen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {drafts.length === 0 && <p className="text-sm text-muted-foreground">Keine PDF-Entwürfe.</p>}
        {drafts.map(d => {
          const rep = d.source_pdf_import_id ? reports[d.source_pdf_import_id] : null;
          const passed = rep?.status === "pass";
          return (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                <p className="text-sm truncate">{d.title}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  <Badge variant="outline">{d.level?.toUpperCase()}</Badge>
                  <Badge variant="outline">{d.module}</Badge>
                  <Badge variant="outline">Teil {d.teil}</Badge>
                  {d.original_numbering && <Badge variant="secondary">#{d.original_numbering}</Badge>}
                  {rep ? (
                    <Badge variant={passed ? "default" : "destructive"}>
                      Treuekontrolle: {passed ? "bestanden" : "fehlgeschlagen"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Treuekontrolle fehlt</Badge>
                  )}
                </div>
              </div>
              <Button size="sm" disabled={busy || !isSuperAdmin || !passed} onClick={() => onPublish(d.id)}>
                <Check className="size-3.5 mr-1" />Veröffentlichen
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function FidelityPanel({
  examImports, run, get, isSuperAdmin,
}: { examImports: PdfImportRow[]; run: any; get: any; isSuperAdmin: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (!selected) { setReport(null); return; }
    get({ data: { examImportId: selected } }).then((r: any) => setReport(r.report)).catch(() => setReport(null));
  }, [selected, get]);

  const onRun = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await run({ data: { examImportId: selected } });
      toast[r.status === "pass" ? "success" : "error"](
        r.status === "pass" ? "Treuekontrolle bestanden — Veröffentlichen freigegeben." : "Treuekontrolle fehlgeschlagen — manuelle Prüfung erforderlich."
      );
      const latest = await get({ data: { examImportId: selected } });
      setReport(latest.report);
    } catch (e: any) {
      toast.error(e?.message ?? "Treuekontrolle fehlgeschlagen");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScanSearch className="size-4" />100 %-Treuekontrolle</CardTitle>
        <CardDescription>
          Vergleicht die Extraktion (Quelle der Wahrheit) Zeichen für Zeichen mit den erstellten Übungen.
          Erkennt hinzugefügten, entfernten oder geänderten Inhalt sowie Nummerierungs- und Abschnittsunterschiede.
          Veröffentlichung ist erst nach bestandener Kontrolle möglich.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Select value={selected ?? ""} onValueChange={(v) => setSelected(v || null)}>
            <SelectTrigger><SelectValue placeholder="Prüfungs-PDF wählen…" /></SelectTrigger>
            <SelectContent>
              {examImports.map(i => <SelectItem key={i.id} value={i.id}>{i.original_name ?? i.id}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={onRun} disabled={busy || !selected || !isSuperAdmin}>
            <ScanSearch className="size-4 mr-1" />Kontrolle ausführen
          </Button>
        </div>

        {report && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={report.status === "pass" ? "default" : "destructive"}>
                {report.status === "pass" ? "BESTANDEN" : "FEHLGESCHLAGEN"}
              </Badge>
              <Badge variant="outline">Hinzugefügt: {report.added_count}</Badge>
              <Badge variant="outline">Entfernt: {report.removed_count}</Badge>
              <Badge variant="outline">Geändert: {report.modified_count}</Badge>
              <Badge variant="outline">Nummerierung: {report.numbering_diff_count}</Badge>
              <Badge variant="outline">Abschnitte: {report.section_diff_count}</Badge>
            </div>
            {report.status !== "pass" && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-2 text-sm">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <p>Veröffentlichung gesperrt. Unterschiede manuell prüfen und Übungen erneut bauen, bis die Kontrolle besteht.</p>
              </div>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Detailbericht anzeigen</summary>
              <pre className="max-h-[480px] overflow-auto bg-muted/40 rounded p-2 whitespace-pre-wrap mt-2">
                {JSON.stringify(report.details, null, 2)}
              </pre>
            </details>
          </div>
        )}
        {!report && selected && (
          <p className="text-sm text-muted-foreground">Noch kein Bericht für diese PDF. Führen Sie die Kontrolle aus.</p>
        )}
      </CardContent>
    </Card>
  );
}
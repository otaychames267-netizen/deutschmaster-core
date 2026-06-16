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
  deletePdfImport,
} from "@/lib/admin/pdf-pipeline.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSearch, Check, FileText, Key, Hammer, ShieldCheck, ScanSearch, AlertTriangle, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/pdf-import")({
  head: () => ({ meta: [{ title: "PDF Import — Lingovia Admin" }] }),
  component: PdfImportPage,
});

type PdfImportRow = {
  id: string;
  original_name: string | null;
  kind: "exam" | "answer_key" | "combined";
  level: string | null;
  status: string;
  linked_import_id: string | null;
  created_at: string;
  ocr_used: boolean;
  error_message: string | null;
  storage_path?: string | null;
};

type UploadStep =
  | { ts: number; label: string; status: "info" | "ok" | "error"; detail?: string };

type SlotState = {
  fileName: string | null;
  fileSize: number | null;
  level: "b1" | "b2";
  phase: "idle" | "uploading" | "storing" | "saving" | "done" | "error";
  error: string | null;
  log: UploadStep[];
  importId: string | null;
  progress: number; // 0..100 during storage PUT
  lastFile: File | null; // for "Retry upload" without re-selecting
};

const initialSlot = (): SlotState => ({
  fileName: null, fileSize: null, level: "b2",
  phase: "idle", error: null, log: [], importId: null,
  progress: 0, lastFile: null,
});

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
  const deleteImport = useServerFn(deletePdfImport);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState<PdfImportRow[]>([]);
  const [examSlot, setExamSlot] = useState<SlotState>(initialSlot());
  const [keySlot, setKeySlot] = useState<SlotState>(initialSlot());
  const [combinedSlot, setCombinedSlot] = useState<SlotState>(initialSlot());
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [extractionPreview, setExtractionPreview] = useState<any>(null);
  const [buildLevel, setBuildLevel] = useState<"b1" | "b2">("b2");
  const [buildModule, setBuildModule] = useState<"lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich">("lesen");
  const [buildTeil, setBuildTeil] = useState<number>(1);
  const [writingCategory, setWritingCategory] = useState<string>("brief");
  const [muendlichPart, setMuendlichPart] = useState<1 | 2 | 3>(1);
  const [contentType, setContentType] = useState<"vorbereitung" | "pruefungssimulation">("pruefungssimulation");
  const [confirmMaterial, setConfirmMaterial] = useState(false);

  const refresh = async () => {
    try {
      const r = await fetchImports();
      setImports(r.items as PdfImportRow[]);
      console.info("[pdf-import] refresh ok", { count: r.items?.length ?? 0 });
      return r.items as PdfImportRow[];
    } catch (e: any) {
      console.error("[pdf-import] refresh failed", e);
      toast.error(`Liste laden fehlgeschlagen: ${e?.message ?? e}`);
      return [];
    }
  };

  useEffect(() => {
    checkRole().then(r => setIsSuperAdmin(r.isSuperAdmin)).catch(() => {});
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh while any import is in a transient state so the admin never
  // sees a "stuck" row without explanation.
  useEffect(() => {
    const transient = imports.some(i =>
      ["pending", "extracting", "building"].includes(i.status),
    );
    if (!transient) return;
    const t = setInterval(() => { refresh().catch(() => {}); }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imports]);

  const onDelete = async (row: PdfImportRow) => {
    const label = row.original_name ?? row.id;
    if (!window.confirm(
      `PDF endgültig löschen?\n\n"${label}"\n\nEntfernt: Storage-Datei, Extraktion, Treuekontroll-Berichte, Entwurf-Übungen und deren Lösungsschlüssel (inkl. aller Modelle). Veröffentlichte Übungen werden NICHT gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`,
    )) return;
    try {
      const r = await deleteImport({ data: { importId: row.id } });
      toast.success(
        `Gelöscht: ${r.removed.exercises} Übung(en), ${r.removed.answerKeys} Schlüssel, ` +
        `${r.removed.extraction} Extraktion, ${r.removed.fidelityReports} Bericht(e), ` +
        `Storage ${r.removed.storage ? "ok" : "—"}.`,
      );
      await refresh();
      if (selectedExamId === row.id) setSelectedExamId(null);
      if (selectedKeyId === row.id) setSelectedKeyId(null);
      if (extractionPreview?.import?.id === row.id) setExtractionPreview(null);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (/veröffentlichte/.test(msg) && window.confirm(`${msg}\n\nTrotzdem löschen (inkl. veröffentlichte Übungen)?`)) {
        try {
          await deleteImport({ data: { importId: row.id, force: true } });
          toast.success("Gelöscht (inkl. veröffentlichte Übungen).");
          await refresh();
        } catch (e2: any) {
          toast.error(e2?.message ?? "Löschen fehlgeschlagen");
        }
      } else {
        toast.error(msg);
      }
    }
  };

  const upload = async (file: File, kind: "exam" | "answer_key" | "combined", level: "b1" | "b2") => {
    const setSlot = kind === "exam" ? setExamSlot : kind === "answer_key" ? setKeySlot : setCombinedSlot;
    const pushLog = (entry: Omit<UploadStep, "ts">) =>
      setSlot((s) => ({ ...s, log: [...s.log, { ts: Date.now(), ...entry }] }));

    // Validation
    if (!file) {
      setSlot((s) => ({ ...s, phase: "error", error: "Keine Datei ausgewählt." }));
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setSlot((s) => ({
        ...s, phase: "error",
        error: `Datei ist kein PDF (Typ: ${file.type || "unbekannt"}).`,
        fileName: file.name, fileSize: file.size,
      }));
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setSlot((s) => ({
        ...s, phase: "error",
        error: `Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB, max. 200 MB).`,
        fileName: file.name, fileSize: file.size,
      }));
      return;
    }

    setSlot({
      fileName: file.name, fileSize: file.size, level,
      phase: "uploading", error: null, importId: null,
      progress: 0, lastFile: file,
      log: [{ ts: Date.now(), label: "Upload gestartet", status: "info",
              detail: `${file.name} · ${(file.size / 1024).toFixed(1)} KB · Slot: ${kind}` }],
    });
    console.info("[pdf-import] upload start", { kind, level, name: file.name, size: file.size });

    const path = `${kind}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    setSlot((s) => ({ ...s, phase: "storing" }));
    pushLog({ label: "Speichere in Storage", status: "info", detail: `Pfad: ${path}` });
    try {
      // Direct XHR PUT to Storage REST API. This gives us real progress
      // events (the Supabase JS SDK currently doesn't surface them) and a
      // generous 10-minute timeout so larger TELC PDFs on slow networks
      // do not silently fail.
      const t0 = performance.now();
      await uploadWithProgress({
        file, path,
        onProgress: (pct) => {
          setSlot((s) => ({ ...s, progress: pct }));
          // Coarse log: 10/25/50/75/90/100
          if ([10, 25, 50, 75, 90, 100].includes(pct)) {
            pushLog({ label: `Upload ${pct}%`, status: "info",
                      detail: `${((file.size * pct / 100) / 1024 / 1024).toFixed(1)} MB von ${(file.size / 1024 / 1024).toFixed(1)} MB` });
          }
        },
      });
      pushLog({ label: "Storage gespeichert", status: "ok",
                detail: `${path} · ${((performance.now() - t0) / 1000).toFixed(1)} s` });
      console.info("[pdf-import] storage ok", { path });

      setSlot((s) => ({ ...s, phase: "saving" }));
      pushLog({ label: "Datenbank-Eintrag wird erstellt", status: "info" });
      const res = await createImport({ data: { storagePath: path, originalName: file.name, kind, level } });
      pushLog({ label: "Datenbank-Eintrag erstellt", status: "ok", detail: `ID: ${res.id}` });
      console.info("[pdf-import] db ok", res);

      setSlot((s) => ({ ...s, phase: "done", importId: res.id }));
      toast.success(`${kind === "exam" ? "Prüfungs-PDF" : kind === "answer_key" ? "Lösungsschlüssel" : "Kombiniertes PDF"} hochgeladen`);
      pushLog({ label: "Aktualisiere Importliste", status: "info" });
      const rows = await refresh();
      const found = rows.find((r) => r.id === res.id);
      if (!found) {
        const msg = `Datenbank-Eintrag erstellt (ID ${res.id}), erscheint aber nicht in der Liste. Bitte „Aktualisieren" drücken oder Logs prüfen.`;
        pushLog({ label: "Liste inkonsistent", status: "error", detail: msg });
        setSlot((s) => ({ ...s, phase: "error", error: msg, importId: res.id }));
        toast.error(msg);
      } else {
        pushLog({ label: "Import bereit für Extraktion", status: "ok",
                  detail: `Status: ${found.status}` });
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[pdf-import] upload failed", e);
      pushLog({ label: "Fehler", status: "error", detail: msg });
      setSlot((s) => ({ ...s, phase: "error", error: msg }));
      toast.error(`Upload fehlgeschlagen: ${msg}`);
    }
  };

  const retryUpload = (kind: "exam" | "answer_key" | "combined") => {
    const slot = kind === "exam" ? examSlot : kind === "answer_key" ? keySlot : combinedSlot;
    if (!slot.lastFile) {
      toast.error("Keine Datei zum erneuten Hochladen vorhanden.");
      return;
    }
    upload(slot.lastFile, kind, slot.level);
  };

  const runExtract = async (id: string) => {
    if (!isSuperAdmin) { toast.error("Nur Super-Admin"); return; }
    setBusy(true);
    try {
      toast.info("Extrahiere mit Gemini Vision … das kann 30–60 s dauern.");
      console.info("[pdf-import] extraction start", { importId: id });
      const r = await extract({ data: { importId: id } });
      console.info("[pdf-import] extraction ok", r);
      toast.success(`Extraktion fertig: ${r.blockCount} Blöcke`);
      await refresh();
      await preview(id);
    } catch (e: any) {
      console.error("[pdf-import] extraction failed", e);
      toast.error(`Extraktion fehlgeschlagen: ${e?.message ?? e}`);
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
          teil: buildTeil,
          writingCategory: buildModule === "schreiben" ? writingCategory : null,
          muendlichPart: buildModule === "muendlich" ? muendlichPart : null,
          contentType: buildModule === "muendlich" ? contentType : null,
          confirmMaterialAsExercises: confirmMaterial,
        },
      });
      toast.success(`${r.exerciseCount} Übungen erstellt, ${r.keyCount} Lösungen verknüpft (Entwurf)`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Bauen fehlgeschlagen");
    } finally { setBusy(false); }
  };

  // Both pure exam PDFs and combined PDFs can be the "source" for building exercises
  const examImports = imports.filter(i => i.kind === "exam" || i.kind === "combined");
  const keyImports = imports.filter(i => i.kind === "answer_key");
  const selectedSource = imports.find(i => i.id === selectedExamId);
  const sourceIsCombined = selectedSource?.kind === "combined";

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
          <ImportsList imports={imports} onRefresh={() => refresh()} onDelete={onDelete} canDelete={isSuperAdmin} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="size-4" />Prüfungs-PDF hochladen (nur Aufgaben)</CardTitle>
              <CardDescription>Original-TELC-PDF ohne Lösungsteil. Inhalt bleibt unverändert (verbatim). Auch gescannte PDFs werden per OCR (Gemini Vision) verarbeitet.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadSlot slot={examSlot} onLevel={(lvl) => setExamSlot((s) => ({ ...s, level: lvl }))}
                onUpload={(f) => upload(f, "exam", examSlot.level)}
                onRetry={() => retryUpload("exam")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="size-4" />Lösungsschlüssel hochladen (separat)</CardTitle>
              <CardDescription>Antwortenheft / Lösungs-PDF. Wird im Hintergrund gespeichert und nur für Korrektur verwendet — Lernende sehen den Schlüssel <b>nie</b>.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadSlot slot={keySlot} onLevel={(lvl) => setKeySlot((s) => ({ ...s, level: lvl }))}
                onUpload={(f) => upload(f, "answer_key", keySlot.level)}
                onRetry={() => retryUpload("answer_key")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="size-4" />Kombiniertes PDF hochladen (Aufgaben + Lösungen)</CardTitle>
              <CardDescription>
                Eine einzige PDF mit Übungen, Texten, Antwortbögen, Modell&#x2011;Lösungen und ggf. mehreren Modellen (Modell 1 / 2 / 3).
                Beim Extrahieren werden Aufgaben <b>und</b> Lösungsschlüssel verbatim erkannt; Modelle werden getrennt erstellt.
                Lernende sehen den Lösungsteil <b>nie</b>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadSlot slot={combinedSlot} onLevel={(lvl) => setCombinedSlot((s) => ({ ...s, level: lvl }))}
                onUpload={(f) => upload(f, "combined", combinedSlot.level)}
                onRetry={() => retryUpload("combined")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extract" className="space-y-3">
          <ImportsList imports={imports} onRefresh={() => refresh()} onDelete={onDelete} canDelete={isSuperAdmin} />
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
                      <Badge variant={i.kind === "exam" ? "default" : i.kind === "combined" ? "default" : "secondary"}>
                        {i.kind === "exam" ? "Prüfung" : i.kind === "combined" ? "Kombiniert" : "Schlüssel"}
                      </Badge>
                      {i.level && <Badge variant="outline">{i.level.toUpperCase()}</Badge>}
                      <Badge variant="outline">{i.status}</Badge>
                    </div>
                    <p className="text-sm truncate mt-0.5">{i.original_name ?? i.id}</p>
                    {i.error_message && (
                      <p className="text-xs text-destructive mt-0.5 break-words">⚠ {i.error_message}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => preview(i.id)}>Vorschau</Button>
                    <Button size="sm" onClick={() => runExtract(i.id)} disabled={busy || !isSuperAdmin}>Extrahieren</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(i)} disabled={busy || !isSuperAdmin} title="Endgültig löschen">
                      <Trash2 className="size-3.5" />
                    </Button>
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
                <Label>Quelle (Prüfungs-PDF oder kombiniert)</Label>
                <Select value={selectedExamId ?? ""} onValueChange={(v) => setSelectedExamId(v || null)}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>
                    {examImports.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.kind === "combined" ? "[Kombiniert] " : ""}{i.original_name ?? i.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sourceIsCombined && (
                  <p className="text-xs text-muted-foreground">
                    Kombinierte PDF: Lösungsschlüssel wird automatisch aus derselben Datei gelesen — kein separater Schlüssel nötig.
                  </p>
                )}
                <ModelsDetectedPreview importId={selectedExamId} fetchExtraction={fetchExtraction} />
              </div>
              <div className="space-y-1.5">
                <Label>Lösungsschlüssel (optional, nicht für kombinierte PDF)</Label>
                <Select value={selectedKeyId ?? ""} onValueChange={(v) => setSelectedKeyId(v || null)} disabled={sourceIsCombined}>
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
                <Select value={buildModule} onValueChange={(v) => { setBuildModule(v as any); setBuildTeil(1); }}>
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

              {(buildModule === "lesen" || buildModule === "hoeren" || buildModule === "sprachbausteine") && (
                <div className="space-y-1.5">
                  <Label>Teil</Label>
                  <Select value={String(buildTeil)} onValueChange={(v) => setBuildTeil(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Teil 1</SelectItem>
                      <SelectItem value="2">Teil 2</SelectItem>
                      {buildModule !== "sprachbausteine" && <SelectItem value="3">Teil 3</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {buildModule === "schreiben" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Schreiben — Kategorie (manuell)</Label>
                  <Select value={writingCategory} onValueChange={setWritingCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beschwerde">Beschwerde</SelectItem>
                      <SelectItem value="brief">Brief</SelectItem>
                      <SelectItem value="email">E-Mail</SelectItem>
                      <SelectItem value="bitte_um_informationen">Bitte um Informationen</SelectItem>
                      <SelectItem value="anfrage">Anfrage</SelectItem>
                      <SelectItem value="stellungnahme">Stellungnahme</SelectItem>
                      <SelectItem value="sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {buildModule === "muendlich" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Mündlich — Teil</Label>
                    <Select value={String(muendlichPart)} onValueChange={(v) => setMuendlichPart(Number(v) as 1|2|3)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Teil 1 — Präsentation</SelectItem>
                        <SelectItem value="2">Teil 2 — Diskussion</SelectItem>
                        <SelectItem value="3">Teil 3 — Planen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Inhaltstyp (manuell)</Label>
                    <Select value={contentType} onValueChange={(v) => setContentType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vorbereitung">Vorbereitung</SelectItem>
                        <SelectItem value="pruefungssimulation">Prüfungssimulation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {contentType === "vorbereitung" && (
                    <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 text-sm">
                      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="mt-1" checked={confirmMaterial} onChange={(e) => setConfirmMaterial(e.target.checked)} />
                        <span>
                          <b>Vorbereitungs-Material</b> (Redemittel, Wortschatz, Strategien, Tipps, Beispiele) wird normalerweise nicht in Übungen umgewandelt. Aktivieren Sie dies nur, wenn Sie es <i>ausdrücklich</i> wünschen.
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}

              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Das System darf nichts automatisch klassifizieren. Sie entscheiden Level, Modul, Teil und Kategorie. Inhalt aus der PDF bleibt unverändert (verbatim).
                </p>
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

function UploadSlot({
  slot, onLevel, onUpload,
}: {
  slot: SlotState;
  onLevel: (lvl: "b1" | "b2") => void;
  onUpload: (f: File) => void;
}) {
  const inFlight = slot.phase === "uploading" || slot.phase === "storing" || slot.phase === "saving";
  const phaseLabel: Record<SlotState["phase"], string> = {
    idle: "Bereit", uploading: "Wird hochgeladen…", storing: "Speichere in Storage…",
    saving: "Speichere in Datenbank…", done: "Erfolgreich hochgeladen", error: "Fehler",
  };
  const phaseVariant: Record<SlotState["phase"], "default" | "secondary" | "destructive" | "outline"> = {
    idle: "outline", uploading: "secondary", storing: "secondary", saving: "secondary",
    done: "default", error: "destructive",
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Level</Label>
          <Select value={slot.level} onValueChange={(v) => onLevel(v as "b1" | "b2")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="b1">B1</SelectItem>
              <SelectItem value="b2">B2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>PDF</Label>
          <Input
            type="file"
            accept="application/pdf,.pdf"
            disabled={inFlight}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              // Reset the input value so re-selecting the same file re-triggers onChange after an error.
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {(slot.fileName || slot.phase !== "idle") && (
        <div className="rounded-md border p-2 text-sm space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{slot.fileName ?? "—"}</p>
              {slot.fileSize != null && (
                <p className="text-xs text-muted-foreground">
                  {(slot.fileSize / 1024).toFixed(1)} KB · Level {slot.level.toUpperCase()}
                </p>
              )}
            </div>
            <Badge variant={phaseVariant[slot.phase]}>{phaseLabel[slot.phase]}</Badge>
          </div>

          {slot.error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-2 text-xs">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Upload fehlgeschlagen</p>
                <p className="opacity-90 break-words">{slot.error}</p>
                <p className="opacity-70 mt-1">
                  Die Datei wurde <b>nicht</b> entfernt — bitte die Ursache prüfen und erneut hochladen.
                </p>
              </div>
            </div>
          )}

          {slot.log.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Upload-Protokoll ({slot.log.length} Schritte)
              </summary>
              <ul className="mt-1 space-y-0.5 text-xs">
                {slot.log.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground tabular-nums w-16 shrink-0">
                      {new Date(step.ts).toLocaleTimeString()}
                    </span>
                    <span className={
                      step.status === "error" ? "text-destructive"
                      : step.status === "ok" ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                    }>
                      {step.label}{step.detail ? ` — ${step.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
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
function ImportsList({
  imports, onRefresh, onDelete, canDelete,
}: {
  imports: PdfImportRow[];
  onRefresh: () => Promise<unknown>;
  onDelete?: (row: PdfImportRow) => void | Promise<void>;
  canDelete?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const handle = async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><FileSearch className="size-4" />Alle Importe</CardTitle>
          <CardDescription>Jeder hochgeladene PDF erscheint hier sofort. {imports.length} Eintrag(e).</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={handle} disabled={refreshing}>
          {refreshing ? "Aktualisiere…" : "Aktualisieren"}
        </Button>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Importe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Hochgeladen</th>
                  <th className="py-1 pr-2">Typ</th>
                  <th className="py-1 pr-2">Level</th>
                  <th className="py-1 pr-2">Datei</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 pr-2">Import-ID</th>
                  {onDelete && <th className="py-1 pr-2">Aktion</th>}
                </tr>
              </thead>
              <tbody>
                {imports.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="py-1 pr-2 whitespace-nowrap">{new Date(i.created_at).toLocaleString()}</td>
                    <td className="py-1 pr-2">
                      <Badge variant={i.kind === "answer_key" ? "secondary" : "default"}>
                        {i.kind === "exam" ? "Prüfung" : i.kind === "combined" ? "Kombiniert" : "Schlüssel"}
                      </Badge>
                    </td>
                    <td className="py-1 pr-2">{i.level?.toUpperCase() ?? "—"}</td>
                    <td className="py-1 pr-2 max-w-[280px]" title={i.original_name ?? ""}>
                      <p className="truncate">{i.original_name ?? "—"}</p>
                      {i.error_message && (
                        <p className="text-destructive text-[10px] break-words mt-0.5">⚠ {i.error_message}</p>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <Badge variant={i.status.endsWith("_failed") ? "destructive" : "outline"}>{i.status}</Badge>
                    </td>
                    <td className="py-1 pr-2 font-mono text-[10px] text-muted-foreground">{i.id}</td>
                    {onDelete && (
                      <td className="py-1 pr-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-destructive"
                          disabled={!canDelete}
                          onClick={() => onDelete(i)}
                          title={canDelete ? "Endgültig löschen" : "Nur Super-Admin"}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModelsDetectedPreview({
  importId, fetchExtraction,
}: { importId: string | null; fetchExtraction: any }) {
  const [models, setModels] = useState<string[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!importId) { setModels(null); setCounts({}); setHasKey(false); return; }
    fetchExtraction({ data: { importId } }).then((r: any) => {
      if (cancelled) return;
      const blocks: any[] = Array.isArray(r?.extraction?.blocks) ? r.extraction.blocks : [];
      const qCounts: Record<string, number> = {};
      const seen = new Set<string>();
      let keyEntries = 0;
      for (const b of blocks) {
        const m = b?.model == null || b.model === "" ? "single" : String(b.model);
        seen.add(m);
        if (b.type === "question") qCounts[m] = (qCounts[m] ?? 0) + 1;
        if (b.type === "answer_key_entry") keyEntries++;
      }
      setModels([...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
      setCounts(qCounts);
      setHasKey(keyEntries > 0);
    }).catch(() => { if (!cancelled) { setModels(null); setCounts({}); setHasKey(false); } });
    return () => { cancelled = true; };
  }, [importId, fetchExtraction]);

  if (!importId || !models || models.length === 0) return null;
  return (
    <div className="rounded-md border p-2 text-xs space-y-1">
      <p className="font-medium">Erkannte Inhalte</p>
      <div className="flex flex-wrap gap-1">
        {models.map(m => (
          <Badge key={m} variant="outline">
            {m === "single" ? "Ein Modell" : `Modell ${m}`} · {counts[m] ?? 0} Aufgabe(n)
          </Badge>
        ))}
        {hasKey && <Badge variant="default">Lösungsschlüssel enthalten</Badge>}
      </div>
      <p className="text-muted-foreground">
        Pro Modell wird ein eigener Übungssatz erstellt — Inhalte werden nicht zusammengeführt.
      </p>
    </div>
  );
}

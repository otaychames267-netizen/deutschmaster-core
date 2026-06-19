import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createPdfImportV2,
  startPdfExtraction,
  extractPdfChunk,
  finalizePdfExtraction,
  getExtraction,
  listPdfImports,
  buildExercisesFromExtraction,
  publishExercise,
  checkSuperAdmin,
  runFidelityCheck,
  getLatestFidelityReport,
  deletePdfImport,
  reapStuckExtractions,
  resolveExtractionReview,
  bulkDeletePdfImports,
  wipeAllPdfData,
  deleteExercisesByFilter,
  findDuplicateExercises,
  deleteDuplicateExercises,
} from "@/lib/admin/pdf-pipeline.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSearch, Check, FileText, Key, Hammer, ShieldCheck, ScanSearch, AlertTriangle, Trash2, Eraser } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/pdf-import")({
  head: () => ({ meta: [{ title: "PDF Import — Lingovia Admin" }] }),
  component: PdfImportPage,
});

/**
 * Upload a file to Supabase Storage via direct XHR PUT so we get real
 * progress events and can apply a generous 10-minute timeout. We grab the
 * caller's access token from the JS client's persisted session, which is
 * the same auth the SDK uses, so RLS on storage.objects applies normally.
 * Throws on non-2xx with the underlying server error message.
 */
async function uploadWithProgress(opts: {
  file: File;
  path: string;
  onProgress: (pct: number) => void;
}): Promise<void> {
  const { file, path, onProgress } = opts;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Nicht angemeldet (kein Access-Token).");
  const url = `${SUPABASE_URL}/storage/v1/object/pdf-imports/${path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = 10 * 60 * 1000; // 10 min
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(pct);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const j = JSON.parse(xhr.responseText);
          msg = j.message || j.error || xhr.responseText || msg;
        } catch { if (xhr.responseText) msg = xhr.responseText; }
        reject(new Error(`Storage-Upload abgelehnt: ${msg}`));
      }
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Storage-Upload (Verbindung unterbrochen)."));
    xhr.ontimeout = () => reject(new Error("Zeitüberschreitung beim Storage-Upload nach 10 Minuten. Bitte mit besserer Verbindung erneut versuchen."));
    xhr.onabort = () => reject(new Error("Upload abgebrochen."));
    xhr.send(file);
  });
}

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
  notes?: string | null;
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
  const extract = useServerFn(startPdfExtraction);
  const extractChunk = useServerFn(extractPdfChunk);
  const finalizeExtraction = useServerFn(finalizePdfExtraction);
  const reap = useServerFn(reapStuckExtractions);
  const fetchExtraction = useServerFn(getExtraction);
  const fetchImports = useServerFn(listPdfImports);
  const buildExercises = useServerFn(buildExercisesFromExtraction);
  const publish = useServerFn(publishExercise);
  const checkRole = useServerFn(checkSuperAdmin);
  const fidelityRun = useServerFn(runFidelityCheck);
  const fidelityGet = useServerFn(getLatestFidelityReport);
  const deleteImport = useServerFn(deletePdfImport);
  const resolveReview = useServerFn(resolveExtractionReview);

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
    const t = setInterval(() => {
      // Reap stuck jobs (>5 min) then refresh — this guarantees the UI never
      // shows a row stuck in "extracting" forever, even if the worker died.
      reap({ data: {} } as any).catch(() => {}).finally(() => refresh().catch(() => {}));
    }, 4000);
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

  const runExtract = async (id: string, opts?: { resume?: boolean; onlyChunk?: number }) => {
    if (!isSuperAdmin) { toast.error("Nur Super-Admin"); return; }
    setBusy(true);
    try {
      const resume = Boolean(opts?.resume);
      const onlyChunk = opts?.onlyChunk;
      toast.info(
        onlyChunk !== undefined
          ? `Test-Lauf: nur Chunk ${onlyChunk + 1} wird verarbeitet.`
          : resume
            ? "Extraktion wird fortgesetzt — abgeschlossene Chunks werden übersprungen."
            : "Extraktion gestartet — Chunks werden einzeln verarbeitet.",
      );
      console.info("[pdf-import] extraction start", { importId: id, resume, onlyChunk });
      const started = await extract({ data: { importId: id, resume } });
      console.info("[pdf-import] extraction initialized", started);
      const total = Number((started as any).chunkCount ?? 0);
      const alreadyDone: number[] = Array.isArray((started as any).completedChunks)
        ? (started as any).completedChunks
        : [];
      const doneSet = new Set<number>(alreadyDone);
      if (alreadyDone.length > 0) {
        toast.info(`${alreadyDone.length}/${total} Chunks bereits abgeschlossen — werden übersprungen.`);
      }
      let skipped = 0;
      const indices: number[] = onlyChunk !== undefined
        ? [onlyChunk]
        : Array.from({ length: total }, (_, i) => i).filter((i) => !doneSet.has(i));
      for (let n = 0; n < indices.length; n++) {
        const chunkIndex = indices[n];
        toast.info(`Extrahiere Chunk ${chunkIndex + 1}/${total} …`);
        const r: any = await extractChunk({ data: { importId: id, chunkIndex } });
        console.info("[pdf-import] chunk result", r);
        if (r?.ok === false && r?.hard) {
          const det = r.details ?? r.error ?? "Unbekannter Fehler";
          console.error("[pdf-import] hard failure at step", r.step, det);
          toast.error(
            `Chunk ${chunkIndex + 1}/${total} fehlgeschlagen [${r.step}]: ${r.error}. Erfolgreiche Chunks bleiben gespeichert — „Fortsetzen" startet nur die fehlgeschlagenen erneut.`,
            { duration: 14000 },
          );
          await refresh();
          return;
        }
        if (r?.skipped) {
          skipped++;
          toast.warning(`Chunk ${chunkIndex + 1}/${total} übersprungen — wird zur manuellen Prüfung markiert.`, { duration: 6000 });
        }
        await refresh();
        // Throttle between chunks so the gateway rate-limit window can reset
        // (gateway is ~per-second; 1.2s between calls keeps us well under).
        if (n < indices.length - 1) {
          await new Promise((res) => setTimeout(res, 1200));
        }
      }
      if (onlyChunk !== undefined) {
        toast.success(`Test-Lauf für Chunk ${onlyChunk + 1} abgeschlossen — Extraktion NICHT finalisiert.`);
        await refresh();
        return;
      }
      const done = await finalizeExtraction({ data: { importId: id } });
      console.info("[pdf-import] extraction finalized", done);
      if ((done as any)?.ok === false) {
        toast.error(`Extraktion fehlgeschlagen: ${(done as any).error}`, { duration: 12000 });
        await refresh();
        return;
      }
      const failedCount = Array.isArray((done as any).failedChunks) ? (done as any).failedChunks.length : skipped;
      if (failedCount > 0) {
        toast.warning(`Extraktion fertig mit Hinweisen: ${(done as any).blockCount} Blöcke, ${failedCount} Chunks übersprungen (manuelle Prüfung empfohlen).`, { duration: 12000 });
      } else {
        toast.success(`Extraktion fertig: ${(done as any).blockCount} Blöcke`);
      }
      await refresh();
      await preview(id);
    } catch (e: any) {
      console.error("[pdf-import] extraction failed", e);
      const msg = e?.message ?? String(e);
      toast.error(`Extraktion fehlgeschlagen: ${msg}. Klicken Sie auf „Logs" in der Importliste für Details.`, { duration: 12000 });
      await refresh();
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
          contentType,
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
          <TabsTrigger value="review"><AlertTriangle className="size-3.5 mr-1" />Review</TabsTrigger>
          <TabsTrigger value="build"><Hammer className="size-3.5 mr-1" />Übungen bauen</TabsTrigger>
          <TabsTrigger value="fidelity"><ScanSearch className="size-3.5 mr-1" />Treuekontrolle</TabsTrigger>
          <TabsTrigger value="publish"><ShieldCheck className="size-3.5 mr-1" />Veröffentlichen</TabsTrigger>
          <TabsTrigger value="cleanup"><Eraser className="size-3.5 mr-1" />Bereinigung</TabsTrigger>
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
                    <Button size="sm" variant="outline" onClick={() => runExtract(i.id, { onlyChunk: 0 })} disabled={busy || !isSuperAdmin} title="Nur Chunk 1 (Seiten 1–2) zum Test verarbeiten — kostet ~1 Anfrage">
                      Test (1 Chunk)
                    </Button>
                    <Button size="sm" onClick={() => runExtract(i.id)} disabled={busy || !isSuperAdmin}>Extrahieren</Button>
                    <Button size="sm" variant="secondary" onClick={() => runExtract(i.id, { resume: true })} disabled={busy || !isSuperAdmin} title="Bereits abgeschlossene Chunks überspringen, nur fehlende/fehlgeschlagene neu verarbeiten">
                      Fortsetzen
                    </Button>
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

        <TabsContent value="review">
          <ExtractionReviewPanel
            examImports={examImports}
            fetchExtraction={fetchExtraction}
            resolveReview={resolveReview}
            isSuperAdmin={isSuperAdmin}
            onResolved={refresh}
          />
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

        <TabsContent value="cleanup">
          <CleanupPanel imports={imports} isSuperAdmin={isSuperAdmin} onRefresh={() => refresh()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UploadSlot({
  slot, onLevel, onUpload, onRetry,
}: {
  slot: SlotState;
  onLevel: (lvl: "b1" | "b2") => void;
  onUpload: (f: File) => void;
  onRetry: () => void;
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

          {(slot.phase === "storing" || slot.phase === "uploading") && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width] duration-150"
                  style={{ width: `${slot.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {slot.progress}% hochgeladen
                {slot.fileSize ? ` · ${((slot.fileSize * slot.progress / 100) / 1024 / 1024).toFixed(1)} / ${(slot.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
              </p>
            </div>
          )}

          {slot.error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-2 text-xs">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Upload fehlgeschlagen</p>
                <p className="opacity-90 break-words">{slot.error}</p>
                <p className="opacity-70 mt-1">
                  Die Datei wurde <b>nicht</b> entfernt — bitte die Ursache prüfen und erneut hochladen.
                </p>
                {slot.lastFile && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
                    Erneut hochladen
                  </Button>
                )}
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

function ExtractionReviewPanel({
  examImports, fetchExtraction, resolveReview, isSuperAdmin, onResolved,
}: { examImports: PdfImportRow[]; fetchExtraction: any; resolveReview: any; isSuperAdmin: boolean; onResolved: () => Promise<unknown> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = async (id: string | null = selected) => {
    if (!id) { setData(null); return; }
    const r = await fetchExtraction({ data: { importId: id } });
    setData(r);
  };
  useEffect(() => { load().catch(() => setData(null)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected]);
  const review = data?.review ?? {};
  const blocking = Array.isArray(review.blockingLowConfidenceItems) ? review.blockingLowConfidenceItems : [];
  const ignored = Array.isArray(review.ignoredLowConfidenceItems) ? review.ignoredLowConfidenceItems : [];
  const failed = Array.isArray(review.failedChunks) ? review.failedChunks : [];
  const onResolve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await resolveReview({ data: { importId: selected, note: "Admin reviewed extraction low-confidence items in the PDF import workflow." } });
      toast.success("Review erledigt — Übungen können gebaut werden.");
      await load(selected);
      await onResolved();
    } catch (e: any) {
      toast.error(e?.message ?? "Review konnte nicht abgeschlossen werden");
    } finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4" />Extraktions-Review</CardTitle>
        <CardDescription>Zeigt alle gespeicherten Low-Confidence- und Chunk-Hinweise aus der Extraktion und gibt den Build nach Prüfung frei.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Select value={selected ?? ""} onValueChange={(v) => setSelected(v || null)}>
            <SelectTrigger><SelectValue placeholder="Prüfungs-PDF oder kombiniertes PDF wählen…" /></SelectTrigger>
            <SelectContent>{examImports.map(i => <SelectItem key={i.id} value={i.id}>{i.original_name ?? i.id}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => load()} disabled={!selected || busy}>Review laden</Button>
        </div>
        {data?.extraction && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={review.canBuild ? "default" : "destructive"}>{review.canBuild ? "Build freigegeben" : "Build blockiert"}</Badge>
              <Badge variant="outline">Blöcke: {data.extraction.blocks?.length ?? 0}</Badge>
              <Badge variant="outline">Low-Confidence: {(review.lowConfidenceItems ?? []).length}</Badge>
              <Badge variant={blocking.length ? "destructive" : "outline"}>Blockierend: {blocking.length}</Badge>
              <Badge variant="outline">Ignoriert: {ignored.length}</Badge>
              <Badge variant={failed.length ? "destructive" : "outline"}>Fehlgeschlagene Chunks: {failed.length}</Badge>
            </div>
            {failed.length > 0 && <ReviewList title="Fehlgeschlagene Chunks" items={failed} tone="error" />}
            {blocking.length > 0 && <ReviewList title="Blockierende Low-Confidence-Items" items={blocking} tone="error" />}
            {ignored.length > 0 && <ReviewList title="Nicht blockierend ignoriert (nicht-deutscher Zusatzinhalt)" items={ignored} />}
            {blocking.length === 0 && failed.length === 0 && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                Die gespeicherten Hinweise betreffen keinen deutschen TELC-Prüfungsinhalt oder sind bereits geprüft. Der Build ist nicht blockiert.
              </div>
            )}
            {blocking.length > 0 && (
              <Button onClick={onResolve} disabled={busy || !isSuperAdmin || failed.length > 0}>{busy ? "Speichere…" : "Review als geprüft freigeben"}</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewList({ title, items, tone }: { title: string; items: any[]; tone?: "error" }) {
  return (
    <div className={`rounded-md border p-3 ${tone === "error" ? "border-destructive/40" : ""}`}>
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="max-h-64 overflow-auto space-y-2 text-xs">
        {items.map((item, idx) => (
          <div key={idx} className="rounded bg-muted/40 p-2">
            <div className="flex flex-wrap gap-2 text-muted-foreground"><span>Seite: {item.page ?? item.pages ?? "—"}</span><span>Teil: {item.teil ?? "—"}</span></div>
            <p className="mt-1"><b>Grund:</b> {item.reason ?? item.error ?? "—"}</p>
            {item.snippet && <p className="mt-1 break-words"><b>Snippet:</b> {item.snippet}</p>}
          </div>
        ))}
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
function ImportsList({
  imports, onRefresh, onDelete, canDelete,
}: {
  imports: PdfImportRow[];
  onRefresh: () => Promise<unknown>;
  onDelete?: (row: PdfImportRow) => void | Promise<void>;
  canDelete?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [logRow, setLogRow] = useState<PdfImportRow | null>(null);
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
                        <p className="text-destructive text-[10px] break-words mt-0.5 line-clamp-3">⚠ {i.error_message}</p>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <Badge variant={i.status.endsWith("_failed") ? "destructive" : "outline"}>{i.status}</Badge>
                    </td>
                    <td className="py-1 pr-2 font-mono text-[10px] text-muted-foreground">{i.id}</td>
                    {onDelete && (
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => setLogRow(i)}
                            title="Logs / Fehlerdetails anzeigen"
                          >
                            <FileSearch className="size-3.5" />
                          </Button>
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
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {logRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLogRow(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold">Import-Logs</h3>
                <p className="text-xs text-muted-foreground font-mono break-all">{logRow.id}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setLogRow(null)}>Schließen</Button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
              <div><span className="text-muted-foreground">Datei:</span> {logRow.original_name ?? "—"}</div>
              <div><span className="text-muted-foreground">Typ:</span> {logRow.kind}</div>
              <div><span className="text-muted-foreground">Level:</span> {logRow.level ?? "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> {logRow.status}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Storage:</span> <span className="font-mono break-all">{logRow.storage_path ?? "—"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Erstellt:</span> {new Date(logRow.created_at).toLocaleString()}</div>
            </div>
            <h4 className="text-sm font-semibold mb-1">Fehler / Diagnose</h4>
            {logRow.error_message ? (
              <pre className="whitespace-pre-wrap break-words rounded bg-muted p-3 text-[11px] text-destructive font-mono">{logRow.error_message}</pre>
            ) : (
              <p className="text-xs text-muted-foreground">Keine Fehler gespeichert. Browser-Konsole und Server-Logs prüfen für Details.</p>
            )}
            <h4 className="text-sm font-semibold mb-1 mt-3">Pipeline-Logs</h4>
            {logRow.notes ? (
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-[11px] font-mono">{logRow.notes}</pre>
            ) : (
              <p className="text-xs text-muted-foreground">Noch keine Pipeline-Logs gespeichert.</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-3">
              Enthält pro Chunk: Request an Gemini, Request-Größe, PDF-Seitengrößen, Modell, Dauer, Response-Status, Raw-Response und Stacktrace bei Fehlern.
            </p>
          </div>
        </div>
      )}
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

// ============================================================================
// Cleanup Panel — bulk delete + reset tools
// ============================================================================
function CleanupPanel({
  imports, isSuperAdmin, onRefresh,
}: {
  imports: any[];
  isSuperAdmin: boolean;
  onRefresh: () => void;
}) {
  const bulkDelete = useServerFn(bulkDeletePdfImports);
  const wipeAll = useServerFn(wipeAllPdfData);
  const delByFilter = useServerFn(deleteExercisesByFilter);
  const findDupes = useServerFn(findDuplicateExercises);
  const delDupes = useServerFn(deleteDuplicateExercises);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [dupReport, setDupReport] = useState<{ totalDuplicateRows: number; groups: any[] } | null>(null);

  const [fLevel, setFLevel] = useState<"" | "b1" | "b2">("");
  const [fModule, setFModule] = useState<"" | "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich">("");
  const [fTeil, setFTeil] = useState<string>("");
  const [fStatus, setFStatus] = useState<"" | "draft" | "hidden" | "published">("");
  const [fSource, setFSource] = useState<"pdf" | "manual" | "all">("pdf");

  if (!isSuperAdmin) {
    return <div className="rounded-md border p-3 text-sm">Bereinigung ist nur für Super-Admins verfügbar.</div>;
  }

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(imports.map((i: any) => i.id)));
  const clearAll = () => setSelected(new Set());

  const runBulkDelete = async (force: boolean) => {
    if (selected.size === 0) { toast.error("Keine Importe ausgewählt."); return; }
    if (!confirm(`${selected.size} Import(e) wirklich löschen${force ? " (inkl. veröffentlichter Übungen)" : ""}?`)) return;
    setBusy("bulk");
    try {
      const r = await bulkDelete({ data: { importIds: [...selected], force } });
      toast.success(`Gelöscht: ${r.totals.imports} Import(e), ${r.totals.exercises} Übung(en), ${r.totals.answerKeys} Lösungseinträge, ${r.totals.fidelityReports} Berichte.`);
      clearAll();
      onRefresh();
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setBusy(null); }
  };

  const runWipeAll = async () => {
    setBusy("wipe");
    try {
      const r = await wipeAll({ data: { confirm: wipeConfirm } });
      toast.success(`Vollständig zurückgesetzt: ${r.totals.imports} Import(e), ${r.totals.exercises} Übung(en) (+${r.orphanExercisesRemoved} verwaiste).`);
      setWipeConfirm("");
      onRefresh();
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setBusy(null); }
  };

  const runFilterDelete = async () => {
    const hasFilter = !!(fLevel || fModule || fTeil || fStatus);
    if (!hasFilter && fSource === "all") { toast.error("Mindestens ein Filter erforderlich."); return; }
    if (!confirm(`Übungen mit den gewählten Filtern wirklich löschen?`)) return;
    setBusy("filter");
    try {
      const r = await delByFilter({ data: {
        level: fLevel || undefined,
        module: fModule || undefined,
        teil: fTeil ? Number(fTeil) : undefined,
        status: fStatus || undefined,
        source: fSource,
      } });
      toast.success(`${r.deleted} Übung(en) gelöscht.`);
      onRefresh();
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setBusy(null); }
  };

  const scanDupes = async () => {
    setBusy("scan");
    try {
      const r = await findDupes();
      setDupReport({ totalDuplicateRows: r.totalDuplicateRows, groups: r.groups });
      toast.success(`${r.groups.length} Duplikat-Gruppen mit ${r.totalDuplicateRows} überzähligen Zeilen.`);
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setBusy(null); }
  };

  const removeDupes = async () => {
    if (!confirm("Duplikate löschen (ältesten Eintrag behalten)?")) return;
    setBusy("dupes");
    try {
      const r = await delDupes({ data: { keep: "oldest" } });
      toast.success(`${r.deleted} Duplikat(e) entfernt.`);
      setDupReport(null);
      onRefresh();
    } catch (e: any) { toast.error(e?.message ?? String(e)); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trash2 className="size-4" />Importe in Bulk löschen</CardTitle>
          <CardDescription>
            Wählen Sie eine oder mehrere PDF-Importsitzungen aus. Alle abgeleiteten Daten (Übungen, Lösungen,
            Treuekontrollberichte, Extraktionen, Storage-Datei) werden mitgelöscht. Veröffentlichte Übungen
            erfordern „Inkl. Veröffentlichungen“.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2 text-xs">
            <Button size="sm" variant="outline" onClick={selectAll}>Alle</Button>
            <Button size="sm" variant="outline" onClick={clearAll}>Keine</Button>
            <span className="text-muted-foreground self-center">{selected.size} ausgewählt</span>
          </div>
          <div className="max-h-72 overflow-auto rounded-md border divide-y">
            {imports.length === 0 && <div className="p-3 text-sm text-muted-foreground">Keine Importe.</div>}
            {imports.map((i: any) => (
              <label key={i.id} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted/50">
                <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                <span className="font-mono text-xs text-muted-foreground">{String(i.id).slice(0, 8)}</span>
                <Badge variant="outline">{i.kind}</Badge>
                {i.level && <Badge variant="secondary">{String(i.level).toUpperCase()}</Badge>}
                <Badge>{i.status}</Badge>
                <span className="truncate">{i.original_name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" disabled={busy !== null || selected.size === 0} onClick={() => runBulkDelete(false)}>
              {busy === "bulk" ? "Lösche…" : "Löschen"}
            </Button>
            <Button variant="destructive" disabled={busy !== null || selected.size === 0} onClick={() => runBulkDelete(true)}>
              Löschen inkl. Veröffentlichungen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Trash2 className="size-4" />Übungen nach Filter löschen</CardTitle>
          <CardDescription>
            Schnelles Löschen z. B. „alle B2-Lesen-Teil-2-Entwürfe aus PDF-Importen“.
            Quelle „PDF“ schützt handgepflegte Übungen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-6">
          <div>
            <Label className="text-xs">Level</Label>
            <Select value={fLevel || "any"} onValueChange={(v) => setFLevel(v === "any" ? "" : v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Alle</SelectItem>
                <SelectItem value="b1">B1</SelectItem>
                <SelectItem value="b2">B2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Modul</Label>
            <Select value={fModule || "any"} onValueChange={(v) => setFModule(v === "any" ? "" : v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Alle</SelectItem>
                <SelectItem value="lesen">Lesen</SelectItem>
                <SelectItem value="sprachbausteine">Sprachbausteine</SelectItem>
                <SelectItem value="hoeren">Hören</SelectItem>
                <SelectItem value="schreiben">Schreiben</SelectItem>
                <SelectItem value="muendlich">Mündlich</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Teil</Label>
            <Input value={fTeil} onChange={(e) => setFTeil(e.target.value.replace(/\D/g, ""))} placeholder="1–3" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={fStatus || "any"} onValueChange={(v) => setFStatus(v === "any" ? "" : v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Alle</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="hidden">Versteckt</SelectItem>
                <SelectItem value="published">Veröffentlicht</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Quelle</Label>
            <Select value={fSource} onValueChange={(v) => setFSource(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">Nur PDF-Importe</SelectItem>
                <SelectItem value="manual">Nur manuell</SelectItem>
                <SelectItem value="all">Alle Quellen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="destructive" disabled={busy !== null} onClick={runFilterDelete}>
              {busy === "filter" ? "Lösche…" : "Löschen"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScanSearch className="size-4" />Duplikate erkennen & entfernen</CardTitle>
          <CardDescription>
            Duplikate werden über (Level, Modul, Teil, Originalnummer, normalisierter Aufgabentext) gruppiert.
            „Entfernen“ behält den ältesten Eintrag pro Gruppe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy !== null} onClick={scanDupes}>
              {busy === "scan" ? "Suche…" : "Duplikate suchen"}
            </Button>
            <Button variant="destructive" disabled={busy !== null || !dupReport || dupReport.totalDuplicateRows === 0} onClick={removeDupes}>
              {busy === "dupes" ? "Lösche…" : `Duplikate entfernen${dupReport ? ` (${dupReport.totalDuplicateRows})` : ""}`}
            </Button>
          </div>
          {dupReport && dupReport.groups.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-md border p-2 text-xs space-y-1">
              {dupReport.groups.slice(0, 50).map((g: any) => (
                <div key={g.key}><b>{g.count}×</b> <span className="text-muted-foreground">{g.key}</span></div>
              ))}
              {dupReport.groups.length > 50 && <div className="text-muted-foreground">… und {dupReport.groups.length - 50} weitere Gruppen</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-4" />Vollreset</CardTitle>
          <CardDescription>
            Löscht <b>alle</b> PDF-Importe, deren Übungen (inkl. veröffentlichter), Lösungsschlüssel,
            Treuekontrollberichte und Storage-Dateien. Handgepflegte Übungen ohne PDF-Quelle bleiben erhalten.
            Tippen Sie zur Bestätigung exakt <code>WIPE-ALL-PDF-DATA</code> ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input value={wipeConfirm} onChange={(e) => setWipeConfirm(e.target.value)} placeholder="WIPE-ALL-PDF-DATA" />
          <Button variant="destructive" disabled={busy !== null || wipeConfirm !== "WIPE-ALL-PDF-DATA"} onClick={runWipeAll}>
            {busy === "wipe" ? "Setze zurück…" : "Vollständig zurücksetzen"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

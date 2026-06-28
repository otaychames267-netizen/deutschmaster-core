import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { extractNormalizedDocumentWithMeta } from "@/lib/import/pdf-extractor";
import { parseLesenT3, type ParsedT3Exercise, type T3Situation, type T3Text } from "@/lib/import/lesen-t3-parser";
import { ocrPdfDocument } from "@/lib/import/ocr-extractor";
import { buildNormalizedDocument } from "@/lib/import/document-analyzer";
import { buildExtractionReport, mergeRichLines } from "@/lib/import/pdf-extractor";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  ChevronRight, RotateCcw, Save, Eye, EyeOff, ChevronLeft,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/import/lesen-3")({
  component: ImportLesenT3Page,
});

type Step = "upload" | "review" | "saving" | "done";
const TEXT_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","X"] as const;

// Editable copy of one parsed exercise
interface EditableExercise {
  parsed:     ParsedT3Exercise;
  situations: T3Situation[];
  texts:      T3Text[];
  include:    boolean;   // whether admin wants to import this exercise
}

function ImportLesenT3Page() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast.error("Please upload a PDF."); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("File must be under 500 MB."); return; }

    setExtracting(true);
    setProgress(5);
    setProgressLabel("Opening PDF…");

    try {
      // Stage 1 — extract or OCR
      const { doc: initialDoc, isScanned, pdfRaw } = await extractNormalizedDocumentWithMeta(file);
      setProgress(30);

      let doc = initialDoc;

      if (isScanned) {
        setProgressLabel("Scanned PDF detected — running OCR…");
        const ocrPages = await ocrPdfDocument(pdfRaw, (p, total, status) => {
          setProgressLabel(status);
          setProgress(30 + Math.round((p / total) * 55));
        });
        // Rebuild NormalizedDocument from OCR output
        const report   = buildExtractionReport(ocrPages);
        const allLines = mergeRichLines(ocrPages);
        doc = buildNormalizedDocument(allLines, report);
      }

      setProgress(90);
      setProgressLabel("Parsing exercises…");

      // Stage 2 — parse all exercises in the PDF
      const parsed = parseLesenT3(doc);

      if (parsed.length === 0) {
        toast.error("No Lesen Teil 3 exercises found in this PDF.");
        return;
      }

      const editable: EditableExercise[] = parsed.map(ex => ({
        parsed:     ex,
        situations: ex.situations.map(s => ({ ...s })),
        texts:      ex.texts.map(t => ({ ...t })),
        include:    true,
      }));

      setExercises(editable);
      setActiveIdx(0);
      setProgress(100);
      setStep("review");
      toast.success(`Found ${parsed.length} exercise${parsed.length > 1 ? "s" : ""} — review before importing.`);
    } catch (err) {
      toast.error("Failed to process PDF."); console.error(err);
    } finally {
      setExtracting(false); setProgress(0); setProgressLabel("");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // Mutations for the active exercise
  function updateSituation(idx: number, patch: Partial<T3Situation>) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== activeIdx ? ex : {
        ...ex,
        situations: ex.situations.map((s, si) => si === idx ? { ...s, ...patch } : s),
      }
    ));
  }
  function updateText(idx: number, patch: Partial<T3Text>) {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== activeIdx ? ex : {
        ...ex,
        texts: ex.texts.map((t, ti) => ti === idx ? { ...t, ...patch } : t),
      }
    ));
  }
  function toggleInclude(idx: number) {
    setExercises(prev => prev.map((ex, ei) => ei !== idx ? ex : { ...ex, include: !ex.include }));
  }

  async function handleSave() {
    if (!user) return;
    const toImport = exercises.filter(e => e.include);
    if (toImport.length === 0) { toast.error("No exercises selected for import."); return; }
    setStep("saving");

    let saved = 0;
    try {
      for (const ex of toImport) {
        const { data: row, error: exErr } = await supabase
          .from("lesen_exercises")
          .insert({ title: ex.parsed.title, teil: 3 as 3, created_by: user.id, source_pdf: "Lesen Teil 3" })
          .select("id").single();
        if (exErr || !row) throw exErr ?? new Error("Insert failed");

        const exerciseId = row.id;

        if (ex.situations.length > 0) {
          const { error: sitErr } = await supabase.from("lesen_t3_situations").insert(
            ex.situations.map(s => ({
              exercise_id:    exerciseId,
              number:         s.number as number,
              description:    s.description,
              correct_letter: s.no_match ? null : s.correct_letter,
              no_match:       s.no_match,
            }))
          );
          if (sitErr) throw sitErr;
        }

        if (ex.texts.length > 0) {
          const { error: txErr } = await supabase.from("lesen_t3_texts").insert(
            ex.texts.map(t => ({ exercise_id: exerciseId, letter: t.letter, title: t.title, content: t.content }))
          );
          if (txErr) throw txErr;
        }
        saved++;
      }
      setStep("done");
      toast.success(`${saved} exercise${saved > 1 ? "s" : ""} imported successfully.`);
    } catch (err) {
      console.error(err); toast.error("Save failed."); setStep("review");
    }
  }

  function reset() {
    setStep("upload"); setExercises([]); setActiveIdx(0); setShowRaw(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const active = exercises[activeIdx];
  const included = exercises.filter(e => e.include).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Import Lesen Teil 3</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Lesen Teil 3 — Importer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Situationen + Anzeigen (A–L) · 10 situations · 12 texts · X = no match
          </p>
        </div>
        {step !== "upload" && (
          <button onClick={reset} className="ml-auto flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(["upload","review","saving","done"] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <span className={`font-semibold capitalize ${step === s ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
          </span>
        ))}
      </div>

      {/* Upload */}
      {step === "upload" && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-16 text-center transition-all ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {extracting ? (
            <>
              {progressLabel.includes("OCR") ? (
                <ScanLine className="h-10 w-10 animate-pulse text-primary" />
              ) : (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              )}
              <p className="text-sm font-semibold text-foreground">{progressLabel || "Processing…"}</p>
              <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">Drop the Lesen Teil 3 PDF here</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse · max 500 MB · scanned PDFs are supported via OCR</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-lg bg-muted px-3 py-1">10 situations (11–20)</span>
                <span className="rounded-lg bg-muted px-3 py-1">12 texts (A–L)</span>
                <span className="rounded-lg bg-muted px-3 py-1">X = no match</span>
                <span className="rounded-lg bg-muted px-3 py-1">Multiple exercises per PDF</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Review */}
      {step === "review" && active && (
        <div className="space-y-5">
          {/* Exercise selector */}
          {exercises.length > 1 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-foreground">
                  {exercises.length} exercises found · {included} selected for import
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={activeIdx === 0}
                    onClick={() => setActiveIdx(i => i - 1)}
                    className="rounded-lg p-1.5 border border-border hover:bg-muted disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {activeIdx + 1} / {exercises.length}
                  </span>
                  <button disabled={activeIdx === exercises.length - 1}
                    onClick={() => setActiveIdx(i => i + 1)}
                    className="rounded-lg p-1.5 border border-border hover:bg-muted disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {exercises.map((ex, i) => (
                  <button key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                      i === activeIdx
                        ? "border-primary bg-primary/10 text-primary"
                        : ex.include
                        ? "border-border bg-card text-foreground hover:bg-muted"
                        : "border-border bg-muted/30 text-muted-foreground line-through"
                    }`}>
                    Ex {i + 1} · p.{ex.parsed.sourcePage ?? "?"} · {ex.situations.length} sit.
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active exercise confidence + controls */}
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${
            active.parsed.confidence === "high"   ? "border-emerald-500/30 bg-emerald-500/5"
            : active.parsed.confidence === "medium" ? "border-amber-500/30 bg-amber-500/5"
            : "border-rose-500/30 bg-rose-500/5"
          }`}>
            {active.parsed.confidence === "high"
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              : <AlertCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />}
            <div className="flex-1">
              <p className="font-bold text-foreground text-sm capitalize">
                Exercise {activeIdx + 1}
                {active.parsed.sourcePage ? ` · page ${active.parsed.sourcePage}` : ""}
                · {active.parsed.confidence} confidence
              </p>
              {active.parsed.warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">{w}</p>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowRaw(!showRaw)}
                className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline">
                {showRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showRaw ? "Hide" : "Show"} raw
              </button>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" checked={active.include}
                  onChange={() => toggleInclude(activeIdx)}
                  className="rounded border-border" />
                <span className={active.include ? "text-foreground" : "text-muted-foreground"}>
                  {active.include ? "Import" : "Skip"}
                </span>
              </label>
            </div>
          </div>

          {showRaw && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <pre className="text-xs text-foreground whitespace-pre-wrap">{active.parsed.rawAnswerKey || "(none)"}</pre>
            </div>
          )}

          {/* Situations */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-black text-foreground">
                Situations ({active.situations.length} detected, expected 10)
              </p>
              <p className="text-xs text-muted-foreground">
                Correct answers are stored securely — subscribers never see them until after submission.
              </p>
            </div>
            <div className="divide-y divide-border">
              {active.situations.map((s, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="shrink-0 mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                    {s.number}
                  </span>
                  <textarea value={s.description} rows={2}
                    onChange={(e) => updateSituation(i, { description: e.target.value })}
                    className="flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <select
                    value={s.no_match ? "X" : (s.correct_letter ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "X") updateSituation(i, { no_match: true, correct_letter: null });
                      else updateSituation(i, { no_match: false, correct_letter: v || null });
                    }}
                    className="w-20 shrink-0 rounded-xl border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">—</option>
                    {TEXT_LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              ))}
              {active.situations.length < 10 && (
                <div className="px-5 py-3">
                  <button onClick={() => {
                    const nextNum = active.situations.length > 0
                      ? Math.max(...active.situations.map(s => s.number)) + 1
                      : 11;
                    setExercises(prev => prev.map((ex, ei) =>
                      ei !== activeIdx ? ex : {
                        ...ex,
                        situations: [...ex.situations, { number: nextNum, description: "", correct_letter: null, no_match: false }],
                      }
                    ));
                  }} className="text-xs font-medium text-primary hover:underline">+ Add situation</button>
                </div>
              )}
            </div>
          </div>

          {/* Texts A–L */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-black text-foreground">
                Texts / Anzeigen ({active.texts.length} detected, expected 12)
              </p>
            </div>
            <div className="divide-y divide-border">
              {active.texts.map((t, i) => (
                <div key={i} className="space-y-2 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-500">
                      {t.letter}
                    </span>
                    <input value={t.title} placeholder="Title (optional)"
                      onChange={(e) => updateText(i, { title: e.target.value })}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <textarea value={t.content} rows={3}
                    onChange={(e) => updateText(i, { content: e.target.value })}
                    className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 ml-10" />
                </div>
              ))}
              {active.texts.length < 12 && (
                <div className="px-5 py-3">
                  <button onClick={() => {
                    const used = new Set(active.texts.map(t => t.letter));
                    const next = ["A","B","C","D","E","F","G","H","I","J","K","L"].find(l => !used.has(l));
                    if (next) setExercises(prev => prev.map((ex, ei) =>
                      ei !== activeIdx ? ex : {
                        ...ex,
                        texts: [...ex.texts, { letter: next, title: "", content: "" }],
                      }
                    ));
                  }} className="text-xs font-medium text-primary hover:underline">+ Add text</button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {included} of {exercises.length} exercise{exercises.length > 1 ? "s" : ""} will be imported.
              Correct answers are stored securely and hidden from subscribers.
            </p>
            <button onClick={handleSave}
              disabled={included === 0}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" /> Import {included} exercise{included > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {step === "saving" && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Saving to database…</p>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 py-16 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <div>
            <p className="text-xl font-black text-foreground">Import complete!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {included} Lesen Teil 3 exercise{included > 1 ? "s are" : " is"} now live.
              Answers are stored securely.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <FileText className="h-4 w-4" /> Import another
            </button>
            <Link to="/schriftlich/vorbereitung/lesen/teil-3"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              View exercises <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { extractNormalizedDocumentWithMeta, buildExtractionReport, mergeRichLines } from "@/lib/import/pdf-extractor";
import { buildNormalizedDocument } from "@/lib/import/document-analyzer";
import { ocrPdfDocument } from "@/lib/import/ocr-extractor";
import { parseLesenT1, type ParsedT1Exercise, type T1Headline, type T1Text } from "@/lib/import/lesen-t1-parser";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  ChevronRight, RotateCcw, Save, Eye, EyeOff, ScanLine,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/import/lesen-1")({
  component: ImportLesenT1Page,
});

type Step = "upload" | "review" | "saving" | "done";

function ImportLesenT1Page() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedT1Exercise | null>(null);
  const [headlines, setHeadlines] = useState<T1Headline[]>([]);
  const [texts, setTexts] = useState<T1Text[]>([]);
  const [title, setTitle] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isOcr, setIsOcr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file."); return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File must be under 500 MB."); return;
    }
    setExtracting(true);
    setProgress(5);
    setProgressLabel("Opening PDF…");
    setIsOcr(false);
    try {
      const { doc: initialDoc, isScanned, pdfRaw } = await extractNormalizedDocumentWithMeta(file);
      setProgress(30);

      let doc = initialDoc;

      if (isScanned) {
        setIsOcr(true);
        setProgressLabel("Scanned PDF detected — running OCR…");
        const ocrPages = await ocrPdfDocument(pdfRaw, (p, total, status) => {
          setProgressLabel(status);
          setProgress(30 + Math.round((p / total) * 55));
        });
        const report   = buildExtractionReport(ocrPages);
        const allLines = mergeRichLines(ocrPages);
        doc = buildNormalizedDocument(allLines, report);
      }

      setProgress(90);
      setProgressLabel("Parsing exercise…");

      const result = parseLesenT1(doc.lines);
      setProgress(100);
      setParsed(result);
      setTitle(result.title);
      setHeadlines(result.headlines);
      setTexts(result.texts);
      setStep("review");
    } catch (err) {
      toast.error("Failed to extract PDF. Try a different file.");
      console.error(err);
    } finally {
      setExtracting(false);
      setProgress(0);
      setProgressLabel("");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function handleSave() {
    if (!user || !parsed) return;
    setStep("saving");

    try {
      // 1. Insert exercise header
      const { data: ex, error: exErr } = await supabase
        .from("lesen_exercises")
        .insert({ title, teil: 1 as 1, created_by: user.id, source_pdf: parsed.title })
        .select("id")
        .single();

      if (exErr || !ex) throw exErr ?? new Error("Insert failed");
      const exerciseId = ex.id;

      // 2. Insert headlines
      if (headlines.length > 0) {
        const { error: hlErr } = await supabase.from("lesen_t1_headlines").insert(
          headlines.map((h) => ({ exercise_id: exerciseId, letter: h.letter, text: h.text, is_distractor: h.is_distractor }))
        );
        if (hlErr) throw hlErr;
      }

      // 3. Insert texts
      if (texts.length > 0) {
        const { error: txErr } = await supabase.from("lesen_t1_texts").insert(
          texts.map((t) => ({
            exercise_id: exerciseId,
            position: t.position as number,
            title: t.title,
            content: t.content,
            correct_headline: (t.correct_headline || "A") as string,
          }))
        );
        if (txErr) throw txErr;
      }

      setStep("done");
      toast.success(`"${title}" imported successfully.`);
    } catch (err) {
      console.error(err);
      toast.error("Save failed. Check console for details.");
      setStep("review");
    }
  }

  function reset() {
    setStep("upload"); setParsed(null); setHeadlines([]); setTexts([]);
    setTitle(""); setShowRaw(false); setIsOcr(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Import Lesen Teil 1</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Lesen Teil 1 — Importer</h1>
          <p className="text-sm text-muted-foreground mt-1">Überschriften zuordnen · 5 texts · 10 headlines (A–J)</p>
        </div>
        <div className="ml-auto flex gap-2">
          {step !== "upload" && (
            <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs">
        {(["upload","review","saving","done"] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <span className={`font-semibold capitalize ${step === s ? "text-primary" : "text-muted-foreground"}`}>
              {s}
            </span>
          </span>
        ))}
      </div>

      {/* ── Upload step ──────────────────────────────────────────────────── */}
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
              {isOcr
                ? <ScanLine className="h-10 w-10 animate-pulse text-amber-500" />
                : <Loader2 className="h-10 w-10 animate-spin text-primary" />}
              <p className="text-sm font-semibold text-foreground">
                {progressLabel || `Extracting… ${progress}%`}
              </p>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all duration-300 ${isOcr ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${progress}%` }} />
              </div>
              {isOcr && (
                <p className="text-xs text-amber-600 dark:text-amber-400">OCR in progress — this may take several minutes for large PDFs</p>
              )}
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">Drop the Lesen Teil 1 PDF here</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse · max 500 MB</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-lg bg-muted px-3 py-1">5 texts extracted</span>
                <span className="rounded-lg bg-muted px-3 py-1">10 headlines A–J</span>
                <span className="rounded-lg bg-muted px-3 py-1">Answer key detected</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Review step ──────────────────────────────────────────────────── */}
      {step === "review" && parsed && (
        <div className="space-y-5">
          {/* Confidence banner */}
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${
            parsed.confidence === "high" ? "border-emerald-500/30 bg-emerald-500/5"
            : parsed.confidence === "medium" ? "border-amber-500/30 bg-amber-500/5"
            : "border-rose-500/30 bg-rose-500/5"
          }`}>
            {parsed.confidence === "high"
              ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              : <AlertCircle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground text-sm capitalize">{parsed.confidence} confidence</p>
                {"detectionStrategy" in parsed && (parsed as { detectionStrategy: string }).detectionStrategy !== "none" && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {(parsed as { detectionStrategy: string }).detectionStrategy}
                  </span>
                )}
              </div>
              {parsed.warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground mt-0.5">{w}</p>
              ))}
            </div>
            <button onClick={() => setShowRaw(!showRaw)} className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline">
              {showRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showRaw ? "Hide" : "Show"} raw text
            </button>
          </div>

          {showRaw && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-bold text-muted-foreground mb-2">Raw answer key section:</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap">{parsed.rawAnswerKey || "(none detected)"}</pre>
            </div>
          )}

          {/* Title */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Exercise Title</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Headlines A–J */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-black text-foreground">Headlines A–J ({headlines.length} detected)</p>
              <p className="text-xs text-muted-foreground">Toggle "Distractor" for headlines that are NOT correct answers.</p>
            </div>
            <div className="divide-y divide-border">
              {headlines.length === 0 && (
                <p className="px-5 py-4 text-sm text-muted-foreground">No headlines detected. Please add manually.</p>
              )}
              {headlines.map((h, i) => (
                <div key={h.letter} className="flex items-start gap-3 px-5 py-3">
                  <span className="shrink-0 mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">
                    {h.letter}
                  </span>
                  <input value={h.text}
                    onChange={(e) => setHeadlines(prev => prev.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x))}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button
                    onClick={() => setHeadlines(prev => prev.map((x, xi) => xi === i ? { ...x, is_distractor: !x.is_distractor } : x))}
                    className={`shrink-0 mt-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      h.is_distractor
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                  >
                    {h.is_distractor ? "Distractor" : "Correct"}
                  </button>
                </div>
              ))}
              {headlines.length < 10 && (
                <div className="px-5 py-3">
                  <button onClick={() => {
                    const used = new Set(headlines.map(h => h.letter));
                    const next = ["A","B","C","D","E","F","G","H","I","J"].find(l => !used.has(l));
                    if (next) setHeadlines(prev => [...prev, { letter: next, text: "", is_distractor: true }]);
                  }} className="text-xs font-medium text-primary hover:underline">+ Add headline</button>
                </div>
              )}
            </div>
          </div>

          {/* Texts 1–5 */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-black text-foreground">Texts 1–5 ({texts.length} detected)</p>
              <p className="text-xs text-muted-foreground">Set the correct headline letter for each text.</p>
            </div>
            <div className="divide-y divide-border">
              {texts.length === 0 && (
                <p className="px-5 py-4 text-sm text-muted-foreground">No texts detected. Please add manually.</p>
              )}
              {texts.map((t, i) => (
                <div key={i} className="space-y-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                      {t.position}
                    </span>
                    <input value={t.title} placeholder="Title (optional)"
                      onChange={(e) => setTexts(prev => prev.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x))}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <select value={t.correct_headline}
                      onChange={(e) => setTexts(prev => prev.map((x, xi) => xi === i ? { ...x, correct_headline: e.target.value } : x))}
                      className="w-20 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">—</option>
                      {["A","B","C","D","E","F","G","H","I","J"].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <textarea value={t.content} rows={4}
                    onChange={(e) => setTexts(prev => prev.map((x, xi) => xi === i ? { ...x, content: e.target.value } : x))}
                    className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Review all data above, then confirm import.</p>
            <button onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              <Save className="h-4 w-4" /> Confirm import
            </button>
          </div>
        </div>
      )}

      {/* ── Saving ───────────────────────────────────────────────────────── */}
      {step === "saving" && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Saving to database…</p>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 py-16 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <div>
            <p className="text-xl font-black text-foreground">Import complete!</p>
            <p className="mt-1 text-sm text-muted-foreground">"{title}" is now available in Lesen Teil 1.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <FileText className="h-4 w-4" /> Import another
            </button>
            <Link to="/schriftlich/vorbereitung/lesen/teil-1"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              View exercises <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

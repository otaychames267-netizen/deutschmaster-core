import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  extractNormalizedDocumentWithMeta, buildExtractionReport, mergeRichLines,
  type PdfExtractionReport,
} from "@/lib/import/pdf-extractor";
import { buildNormalizedDocument } from "@/lib/import/document-analyzer";
import { ocrPdfDocument } from "@/lib/import/ocr-extractor";
import { parseLesenT2, type ParsedT2Result } from "@/lib/import/lesen-t2-parser";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  ChevronRight, RotateCcw, Save, ChevronDown, Sparkles, Copy, ScanLine,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/import/lesen-2")({
  component: ImportLesenT2Page,
});

type Step = "upload" | "review" | "saving" | "done";
type Correct = "a" | "b" | "c";

interface LocalQuestion {
  number: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct: Correct;
  answerSource: string | null;
}

function answerSourceLabel(src: string | null): { label: string; color: string } {
  switch (src) {
    case "green":         return { label: "green highlight", color: "text-emerald-600 dark:text-emerald-400" };
    case "bold":          return { label: "bold font",       color: "text-blue-600 dark:text-blue-400" };
    case "checkmark":     return { label: "checkmark",       color: "text-blue-600 dark:text-blue-400" };
    case "single-option": return { label: "only option",     color: "text-amber-600 dark:text-amber-400" };
    case "not-found":     return { label: "not detected",    color: "text-rose-600 dark:text-rose-400" };
    default:              return { label: "manual",          color: "text-muted-foreground" };
  }
}

function toLocalQuestions(qs: ParsedT2Result["exercise1"]["questions"]): LocalQuestion[] {
  return qs.map((q) => ({
    number:      q.number,
    question:    q.question,
    option_a:    q.options.a,
    option_b:    q.options.b,
    option_c:    q.options.c,
    correct:     q.correct ?? "a",
    answerSource: q.answerSource,
  }));
}

// ── Question editor block ─────────────────────────────────────────────────────

function QuestionEditor({
  questions,
  onChange,
  label,
}: {
  questions: LocalQuestion[];
  onChange: (qs: LocalQuestion[]) => void;
  label: string;
}) {
  function update(idx: number, patch: Partial<LocalQuestion>) {
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function add() {
    const nextNum = questions.length > 0 ? Math.max(...questions.map((q) => q.number)) + 1 : 6;
    onChange([...questions, { number: nextNum, question: "", option_a: "", option_b: "", option_c: "", correct: "a", answerSource: null }]);
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <p className="text-sm font-black text-foreground">{label} ({questions.length} detected, expected 5)</p>
        {questions.length === 0 && (
          <span className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">needs manual input</span>
        )}
      </div>
      <div className="divide-y divide-border">
        {questions.map((q, i) => {
          const src = answerSourceLabel(q.answerSource);
          const needsManual = q.answerSource === "not-found" || q.answerSource === null;
          return (
            <div key={i} className={`space-y-3 px-5 py-4 ${needsManual ? "bg-amber-500/3" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-500">
                  {q.number}
                </span>
                <input value={q.question} placeholder="Question text"
                  onChange={(e) => update(i, { question: e.target.value })}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex flex-col items-end gap-0.5">
                  <select value={q.correct}
                    onChange={(e) => update(i, { correct: e.target.value as Correct, answerSource: "manual" })}
                    className={`w-16 rounded-xl border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                      needsManual
                        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                        : "border-input bg-background"
                    }`}>
                    <option value="a">a ✓</option>
                    <option value="b">b ✓</option>
                    <option value="c">c ✓</option>
                  </select>
                  {q.answerSource && (
                    <span className={`text-[10px] font-mono ${src.color}`}>{src.label}</span>
                  )}
                </div>
              </div>
              {(["a", "b", "c"] as const).map((opt) => (
                <div key={opt} className="flex items-center gap-2 pl-8">
                  <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                    q.correct === opt
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>{opt}</span>
                  <input
                    value={q[`option_${opt}` as "option_a"|"option_b"|"option_c"]}
                    placeholder={`Option ${opt}`}
                    onChange={(e) => update(i, { [`option_${opt}`]: e.target.value })}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
          );
        })}
        <div className="px-5 py-3">
          <button onClick={add} className="text-xs font-medium text-primary hover:underline">+ Add question</button>
        </div>
      </div>
    </div>
  );
}

// ── Review gate (Spec §21/§25): block import of incomplete/unconfirmed data ──
// An answer is "unconfirmed" when extraction never detected it (answerSource
// "not-found"/null) and the admin has not yet explicitly picked one — we must
// never import an invented answer key.
function validateExercise(qs: LocalQuestion[]): string[] {
  const issues: string[] = [];
  if (qs.length !== 5) issues.push(`${qs.length} von 5 Fragen erkannt`);
  qs.forEach((q, i) => {
    const n = q.number || i + 1;
    if (!q.question.trim()) issues.push(`Frage ${n}: Fragetext fehlt`);
    if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim()) issues.push(`Frage ${n}: leere Option`);
    if (!["a", "b", "c"].includes(q.correct)) issues.push(`Frage ${n}: ungültige Lösung`);
    if (q.answerSource === "not-found" || q.answerSource === null) issues.push(`Frage ${n}: Lösung nicht erkannt — bitte manuell bestätigen`);
  });
  return issues;
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ImportLesenT2Page() {
  const { user } = useAuth();
  const [step,        setStep]        = useState<Step>("upload");
  const [parsed,      setParsed]      = useState<ParsedT2Result | null>(null);
  const [report,      setReport]      = useState<PdfExtractionReport | null>(null);
  const [title1,      setTitle1]      = useState("");
  const [title2,      setTitle2]      = useState("");
  const [passage,     setPassage]     = useState("");
  const [questions1,  setQuestions1]  = useState<LocalQuestion[]>([]);
  const [questions2,  setQuestions2]  = useState<LocalQuestion[]>([]);
  const [showDiag,    setShowDiag]    = useState(false);
  const [showReport,  setShowReport]  = useState(false);
  const [extracting,  setExtracting]  = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isOcr,       setIsOcr]       = useState(false);
  const [sourcePdf,   setSourcePdf]   = useState("");
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver]       = useState(false);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast.error("Please upload a PDF."); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("File must be under 500 MB."); return; }
    setExtracting(true); setProgress(5); setProgressLabel("Opening PDF…"); setIsOcr(false);
    try {
      // Stage 1: extract + analyse (or OCR for scanned PDFs)
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

      setProgress(88);
      setProgressLabel("Parsing exercise…");

      const rep = doc.extractionReport as PdfExtractionReport;
      setReport(rep);
      if (rep.totalTextItems === 0) setShowReport(true);

      // Stage 2: section-specific parsing
      const result = parseLesenT2(doc);
      setProgress(100);
      setParsed(result);

      // §17: titles must come from the printed PDF, never the filename. The
      // parser does not extract a printed title, so leave it empty for the
      // admin to enter; duplicates are auto-numbered server-side on import.
      setSourcePdf(file.name);
      setTitle1("");
      setTitle2("");
      setPassage(result.passage);
      setQuestions1(toLocalQuestions(result.exercise1.questions));
      setQuestions2(result.exercise2 ? toLocalQuestions(result.exercise2.questions) : []);

      if (result.confidence === "low") setShowDiag(true);
      setStep("review");
    } catch (err) {
      toast.error("Failed to extract PDF."); console.error(err);
    } finally {
      setExtracting(false); setProgress(0); setProgressLabel("");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function handleSave() {
    if (!user || !parsed) return;
    const isTwoExercises = parsed.blockRelation === "two-exercises";

    // Final client-side gate (the RPC re-validates server-side as well).
    const issues = [
      ...(passage.trim().length === 0 ? ["Lesetext fehlt"] : []),
      ...validateExercise(questions1),
      ...(isTwoExercises ? validateExercise(questions2) : []),
    ];
    if (issues.length > 0) {
      toast.error("Import blockiert — bitte fehlende Angaben ergänzen.");
      return;
    }

    setStep("saving");
    try {
      const toPayload = (qs: LocalQuestion[]) =>
        qs.map((q) => ({
          number: q.number, question: q.question,
          option_a: q.option_a, option_b: q.option_b, option_c: q.option_c,
          correct: q.correct,
        }));

      // Each exercise is inserted atomically (exercise + passage + questions)
      // by a single SECURITY DEFINER RPC — no orphaned rows on failure (§28).
      const savedTitles: string[] = [];

      const { data: r1, error: e1 } = await (supabase as any).rpc("import_lesen_t2_exercise", {
        p_title:      title1,
        p_passage:    passage,
        p_questions:  toPayload(questions1),
        p_source_pdf: sourcePdf || null,
      });
      if (e1) throw e1;
      savedTitles.push((r1?.title as string) || title1 || "(ohne Titel)");

      if (isTwoExercises && questions2.length > 0) {
        // Same printed title is fine — duplicates are auto-numbered server-side.
        const { data: r2, error: e2 } = await (supabase as any).rpc("import_lesen_t2_exercise", {
          p_title:      title2,
          p_passage:    passage,
          p_questions:  toPayload(questions2),
          p_source_pdf: sourcePdf || null,
        });
        if (e2) throw e2;
        savedTitles.push((r2?.title as string) || title2 || "(ohne Titel)");
      }

      setStep("done");
      toast.success(savedTitles.length > 1
        ? `2 Übungen importiert: ${savedTitles.map((t) => `"${t}"`).join(" und ")}.`
        : `"${savedTitles[0]}" erfolgreich importiert.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error(err);
      toast.error(`Import fehlgeschlagen: ${message}`);
      setStep("review");
    }
  }

  function reset() {
    setStep("upload"); setParsed(null); setReport(null);
    setTitle1(""); setTitle2(""); setPassage("");
    setQuestions1([]); setQuestions2([]);
    setShowDiag(false); setShowReport(false); setIsOcr(false); setSourcePdf("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const isTwoExercises = parsed?.blockRelation === "two-exercises";
  const unanswered1    = questions1.filter(q => q.answerSource === "not-found" || q.answerSource === null).length;

  // Review gate (§21/§25)
  const passageOk  = passage.trim().length > 0;
  const ex1Issues  = validateExercise(questions1);
  const ex2Issues  = isTwoExercises ? validateExercise(questions2) : [];
  const gateIssues = [...(passageOk ? [] : ["Lesetext fehlt"]), ...ex1Issues.map(s => isTwoExercises ? `Übung 1 — ${s}` : s), ...ex2Issues.map(s => `Übung 2 — ${s}`)];
  const canSave    = gateIssues.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Import Lesen Teil 2</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Lesen Teil 2 — Importer</h1>
          <p className="text-sm text-muted-foreground mt-1">Längerer Text + Multiple Choice · 1 passage · 5 questions (Q6–Q10)</p>
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

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
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
                <div className={`h-full rounded-full transition-all ${isOcr ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${progress}%` }} />
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
                <p className="text-lg font-black text-foreground">Drop the Lesen Teil 2 PDF here</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse · max 500 MB</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-lg bg-muted px-3 py-1">Passage extracted</span>
                <span className="rounded-lg bg-muted px-3 py-1">Q6–Q10 detected</span>
                <span className="rounded-lg bg-muted px-3 py-1">Duplicate blocks → 1 or 2 exercises</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Review ─────────────────────────────────────────────────────────── */}
      {step === "review" && parsed && (
        <div className="space-y-5">

          {/* Extraction report */}
          {report && (
            <div className={`rounded-2xl border overflow-hidden ${
              report.likelyScanned || report.totalTextItems === 0 ? "border-rose-500/40" : "border-border"
            }`}>
              <button onClick={() => setShowReport(p => !p)}
                className="w-full flex items-center justify-between bg-card px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  {report.totalTextItems === 0
                    ? <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                  <p className="text-sm font-black text-foreground">PDF Extraction Report</p>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{report.totalPages} pages</span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono ${report.totalTextItems === 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                    {report.totalTextItems} text items
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{report.totalLines} lines</span>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${showReport ? "rotate-180" : ""}`} />
              </button>

              {report.totalTextItems === 0 && (
                <div className="border-t border-rose-500/20 bg-rose-500/5 px-5 py-3">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">0 text items extracted.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.totalRawItems > 0
                      ? `pdfjs found ${report.totalRawItems} raw items with empty strings — likely custom font encoding with no Unicode mapping.`
                      : "pdfjs found 0 items. PDF may be image-based or encrypted. OCR required."}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1">You can still import by pasting text manually below.</p>
                </div>
              )}

              {showReport && (
                <div className="border-t border-border divide-y divide-border/40 font-mono text-[11px]">
                  {report.pages.map((pg) => (
                    <div key={pg.pageNum} className={`px-5 py-2.5 ${pg.isImageOnly ? "bg-rose-500/3" : ""}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-foreground w-16">Page {pg.pageNum}</span>
                        <span className={`rounded px-1.5 py-0.5 ${pg.rawItemCount === 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground"}`}>{pg.rawItemCount} raw</span>
                        <span className={`rounded px-1.5 py-0.5 ${pg.textItemCount === 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>{pg.textItemCount} text</span>
                        <span className="text-muted-foreground">{pg.lineCount} lines · {pg.extractionMode}</span>
                        {pg.isImageOnly && <span className="rounded px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400">image-only</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confidence / block-relation banner */}
          <div className={`rounded-2xl border p-4 ${
            parsed.confidence === "high"   ? "border-emerald-500/30 bg-emerald-500/5"
            : parsed.confidence === "medium" ? "border-amber-500/30 bg-amber-500/5"
            : "border-rose-500/30 bg-rose-500/5"
          }`}>
            <div className="flex items-start gap-3">
              {parsed.confidence === "high"
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                : <AlertCircle  className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground text-sm capitalize">{parsed.confidence} confidence</p>

                  {parsed.blockRelation === "answer-key" && (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="h-3 w-3" /> solved copy → answers extracted
                    </span>
                  )}
                  {parsed.blockRelation === "two-exercises" && (
                    <span className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                      <Copy className="h-3 w-3" /> {parsed.debug.differingOptionCount} options differ → 2 exercises detected
                    </span>
                  )}
                  {parsed.blockRelation === "single" && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">single block</span>
                  )}

                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Q-detect: {parsed.debug.questionDetectionMode}
                  </span>
                  {parsed.debug.secondQBlockStart >= 0 && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      block 2 @ line {parsed.debug.secondQBlockStart}
                    </span>
                  )}
                </div>

                {parsed.blockRelation === "two-exercises" && (
                  <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Both exercises share the same reading passage. Please verify and set correct answers manually.
                  </p>
                )}
                {parsed.blockRelation === "answer-key" && unanswered1 > 0 && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {unanswered1} question{unanswered1 > 1 ? "s" : ""} without a detected answer — please set manually below.
                  </p>
                )}
                {parsed.blockRelation === "single" && (
                  <p className="mt-1.5 text-xs text-muted-foreground">No duplicate block detected. Please set correct answers manually.</p>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button onClick={() => setShowDiag(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-black text-foreground">Parser Diagnostics</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{parsed.debug.totalLines} lines · {parsed.debug.columnCount}-col</span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono ${parsed.debug.firstQBlockStart >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                  {parsed.debug.firstQBlockStart >= 0 ? `block1@${parsed.debug.firstQBlockStart}` : "block1 not found"}
                </span>
                {parsed.debug.secondQBlockStart >= 0 && (
                  <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-mono">
                    block2@{parsed.debug.secondQBlockStart}
                  </span>
                )}
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">passage: {parsed.debug.passageLineCount} lines</span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${showDiag ? "rotate-180" : ""}`} />
            </button>

            {showDiag && (
              <div className="border-t border-border">
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    First 150 lines. &nbsp;
                    <span className="text-blue-500">[Q]</span> question &nbsp;
                    <span className="text-violet-500">[OPT]</span> option &nbsp;
                    <span className="text-emerald-500">[G]</span> green text &nbsp;
                    <span className="font-bold text-foreground">bold</span> = bold font
                  </p>
                </div>
                <div className="max-h-[420px] overflow-y-auto font-mono text-[11px] divide-y divide-border/30">
                  {parsed.debug.lines.map((l) => (
                    <div key={l.idx} className={`flex items-start gap-2 px-3 py-1 ${
                      l.isGreen ? "bg-emerald-500/5" : l.isQuestion ? "bg-blue-500/5" : l.isOption ? "bg-violet-500/5" : ""
                    }`}>
                      <span className="shrink-0 w-8 text-right text-muted-foreground/50">{l.idx}</span>
                      <span className="shrink-0 w-14">
                        {l.isGreen    && <span className="text-emerald-500 font-bold">[G]</span>}
                        {l.isQuestion && <span className="text-blue-500 font-bold">[Q]</span>}
                        {l.isOption && !l.isQuestion && <span className="text-violet-500 font-bold">[OPT]</span>}
                      </span>
                      <span className={`flex-1 break-all leading-snug ${
                        l.isGreen ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : l.bold   ? "font-bold text-foreground"
                        : "text-muted-foreground"
                      }`}>{l.text}</span>
                    </div>
                  ))}
                  {parsed.debug.totalLines > 150 && (
                    <div className="px-3 py-2 text-muted-foreground/50 text-center">… {parsed.debug.totalLines - 150} more lines</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shared passage */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-foreground">
                  Reading passage {isTwoExercises && <span className="text-xs font-normal text-muted-foreground ml-2">(shared by both exercises)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {passage.length > 0
                    ? `${passage.length} characters · ${passage.split(" ").length} words`
                    : "No passage detected — paste manually"}
                </p>
              </div>
              {passage.length < 100 && (
                <span className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">needs manual input</span>
              )}
            </div>
            <div className="p-5">
              <textarea value={passage} rows={12} onChange={(e) => setPassage(e.target.value)}
                placeholder="Paste the reading passage here…"
                className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Exercise 1 */}
          <div className="space-y-2">
            {isTwoExercises && (
              <div className="flex items-center gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-500">1</span>
                <input value={title1} onChange={(e) => setTitle1(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Exercise 1 title" />
              </div>
            )}
            {!isTwoExercises && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Exercise Title</label>
                <input value={title1} onChange={(e) => setTitle1(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            <QuestionEditor
              questions={questions1}
              onChange={setQuestions1}
              label={isTwoExercises ? "Exercise 1 — Questions" : "Questions"}
            />
          </div>

          {/* Exercise 2 (only in two-exercises mode) */}
          {isTwoExercises && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-black text-violet-500">2</span>
                <input value={title2} onChange={(e) => setTitle2(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Exercise 2 title" />
              </div>
              <QuestionEditor
                questions={questions2}
                onChange={setQuestions2}
                label="Exercise 2 — Questions"
              />
            </div>
          )}

          {/* Review gate */}
          <div className={`rounded-2xl border p-4 ${canSave ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
            <div className="flex items-start gap-3">
              {canSave
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                : <AlertCircle  className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {canSave ? "Bereit zum Import — alle Pflichtangaben vollständig." : "Import blockiert — bitte korrigieren:"}
                </p>
                {!canSave && (
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                    {gateIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                  </ul>
                )}
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Titel ist optional (kann leer bleiben und später im Admin-Panel gesetzt werden).
                  {isTwoExercises && " Beide Übungen teilen sich denselben Lesetext."}
                </p>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-end">
            <button onClick={handleSave} disabled={!canSave}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Save className="h-4 w-4" />
              {isTwoExercises ? "2 Übungen importieren" : "Import bestätigen"}
            </button>
          </div>
        </div>
      )}

      {/* Saving */}
      {step === "saving" && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Saving to database…</p>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 py-16 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <div>
            <p className="text-xl font-black text-foreground">Import complete!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTwoExercises ? `"${title1}" and "${title2}" imported.` : `"${title1}" imported successfully.`}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              <FileText className="h-4 w-4" /> Import another
            </button>
            <Link to="/schriftlich/vorbereitung/lesen/teil-2"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              View exercises <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

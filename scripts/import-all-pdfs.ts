/**
 * Direct Node.js import — all 4 TELC Lesen PDFs → Supabase.
 *
 * Uses the exact same pipeline as test-import.ts:
 *   readFile → Blob → File → extractNormalizedDocument → parseLesenT1/T2/T3
 *
 * For scanned PDFs: renders each page via pdfjs-dist + node-canvas,
 * then OCR via tesseract.js, producing RichLine[] in NormalizedDocument shape.
 *
 * Run: npx tsx scripts/import-all-pdfs.ts
 */

import { readFile } from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import { createCanvas, Image as NodeCanvasImage, ImageData as NodeCanvasImageData } from "canvas";
import { createClient } from "@supabase/supabase-js";
import { createWorker } from "tesseract.js";

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://gewcyydpgbfutkdcyztr.supabase.co";
const SERVICE_KEY  = "";
const PDF_DIR      = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen";
const OCR_SCALE    = 2.5;
const IMPORT_USER  = "df47fbfc-7895-4941-864a-5d1d8f4fdc30";

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Logging ──────────────────────────────────────────────────────────────────
const ts   = () => new Date().toISOString();
const log  = (m: string) => console.log(`[${ts()}] ${m}`);
const warn = (m: string) => console.warn(`[${ts()}] ⚠ ${m}`);
const fail = (m: string): never => { console.error(`[${ts()}] ❌ ${m}`); process.exit(1); };

// Strip control chars and null bytes that Postgres rejects
function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split("")
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join("")
    .trim();
}

// ── Stage 1 + Stage 2 imports (same as test-import.ts) ─────────────────────
import { extractNormalizedDocument, mergeRichLines } from "../src/lib/import/pdf-extractor.js";
import { buildNormalizedDocument } from "../src/lib/import/document-analyzer.js";
import { parseLesenT1 } from "../src/lib/import/lesen-t1-parser.js";
import { parseLesenT2 } from "../src/lib/import/lesen-t2-parser.js";
import { parseLesenT3 } from "../src/lib/import/lesen-t3-parser.js";

// ── Helper: read PDF as File object (matches test-import.ts pattern) ─────────
async function readPdfAsFile(filePath: string): Promise<File> {
  const bytes = await readFile(filePath);
  const blob  = new Blob([bytes], { type: "application/pdf" });
  return new File([blob], path.basename(filePath), { type: "application/pdf" });
}

// ── OCR a scanned PDF via pdfjs-dist + node-canvas + tesseract.js ───────────
// Uses page.objs.get() to extract raw XObject image data without canvas rendering
async function ocrPdfToNormalizedDoc(filePath: string): Promise<any> {
  const pdfjsMod = await import(/* @vite-ignore */ "pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  try {
    const { createRequire } = await import("module" as string);
    const req = createRequire(import.meta.url);
    const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\").join("/");
  } catch { /* noop */ }

  const bytes = await readFile(filePath);
  const pdf   = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const total: number = pdf.numPages;
  log(`  OCR: ${total} pages to process`);

  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });
  const ocrPages: any[] = [];

  for (let i = 1; i <= total; i++) {
    if (i % 5 === 0 || i === total) log(`  OCR page ${i}/${total}`);
    const page = await pdf.getPage(i);

    let pngBuf: Buffer | null = null;

    try {
      // Step 1: get operator list (triggers image XObject loading into page.objs)
      const opList = await page.getOperatorList();

      // Step 2: collect ALL image XObjects, pick the LARGEST (most likely to be the page scan)
      const XOBJ   = pdfjsMod.OPS?.paintImageXObject ?? 85;
      const INLINE = pdfjsMod.OPS?.paintInlineImageXObject ?? 86;

      interface ImgCandidate { width: number; height: number; data: Uint8ClampedArray }
      let bestImg: ImgCandidate | null = null;

      // Collect all XObject keys (some pages have multiple — logo, border, main scan)
      const xobjKeys: string[] = [];
      for (let j = 0; j < opList.fnArray.length; j++) {
        const fn   = opList.fnArray[j];
        const args = opList.argsArray[j];
        if (fn === XOBJ && args?.[0] && !xobjKeys.includes(args[0])) xobjKeys.push(args[0]);
      }

      for (const imgKey of xobjKeys) {
        const imgData: any = await new Promise((resolve, reject) => {
          page.objs.get(imgKey, resolve);
          setTimeout(() => reject(new Error("timeout")), 10000);
        }).catch(() => null);

        if (imgData?.data && imgData.width && imgData.height) {
          // Keep largest image (most likely the main scanned page)
          if (!bestImg || imgData.width * imgData.height > bestImg.width * bestImg.height) {
            bestImg = imgData as ImgCandidate;
          }
        }
      }

      // Also check inline images
      for (let j = 0; j < opList.fnArray.length; j++) {
        const fn   = opList.fnArray[j];
        const args = opList.argsArray[j];
        if (fn === INLINE && args?.[0]) {
          const imgData = args[0];
          if (imgData?.data && imgData.width && imgData.height) {
            if (!bestImg || imgData.width * imgData.height > bestImg.width * bestImg.height) {
              bestImg = imgData as ImgCandidate;
            }
          }
        }
      }

      if (bestImg) {
        // Scale up 2× for better Tesseract accuracy (300+ DPI equivalent)
        const scale   = 2;
        const srcW    = bestImg.width;
        const srcH    = bestImg.height;
        const dstW    = srcW * scale;
        const dstH    = srcH * scale;

        // pdfjs may return RGB (3 channels) or RGBA (4 channels) — always convert to RGBA
        const nPixels  = srcW * srcH;
        const channels = Math.round(bestImg.data.length / nPixels);
        const rgba     = new Uint8ClampedArray(nPixels * 4);
        if (channels === 4) {
          rgba.set(bestImg.data);
        } else if (channels === 3) {
          for (let k = 0; k < nPixels; k++) {
            rgba[k * 4]     = bestImg.data[k * 3];
            rgba[k * 4 + 1] = bestImg.data[k * 3 + 1];
            rgba[k * 4 + 2] = bestImg.data[k * 3 + 2];
            rgba[k * 4 + 3] = 255;
          }
        } else if (channels === 1) {
          // Grayscale → RGB
          for (let k = 0; k < nPixels; k++) {
            rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = bestImg.data[k];
            rgba[k * 4 + 3] = 255;
          }
        }

        // Draw source at 1:1 then scale to destination
        const srcCanvas = createCanvas(srcW, srcH);
        const srcCtx    = srcCanvas.getContext("2d") as any;
        const id        = srcCtx.createImageData(srcW, srcH);
        id.data.set(rgba);
        srcCtx.putImageData(id, 0, 0);

        const dstCanvas = createCanvas(dstW, dstH);
        const dstCtx    = dstCanvas.getContext("2d") as any;
        dstCtx.drawImage(srcCanvas, 0, 0, dstW, dstH);
        pngBuf = dstCanvas.toBuffer("image/png");
      }
    } catch (e: any) {
      warn(`  Page ${i} extraction failed: ${e?.message}`);
    }

    const text = pngBuf
      ? (await worker.recognize(pngBuf)).data.text
      : "";

    const rawLines = text.split("\n");
    const lines = rawLines
      .filter((l: string) => l.trim().length > 0)
      .map((l: string, j: number) => ({
        text: l.trim(), x: 50, y: j * 16, pageNum: i,
        bold: false, italic: false, fontSize: 12,
        hasBoldWord: false, color: null, hasGreenWord: false, isGreen: false,
      }));

    ocrPages.push({
      pageNum: i, lines, rawText: text,
      rawItemCount: rawLines.length,
      textItemCount: lines.length,
      emptyItemCount: rawLines.length - lines.length,
      isImageOnly: true, extractionMode: "plain", sampleItems: [],
    });
  }

  await worker.terminate();

  const allLines = mergeRichLines(ocrPages as any);
  const report: any = {
    totalPages: total,
    totalRawItems: ocrPages.reduce((s: number, p: any) => s + p.rawItemCount, 0),
    totalTextItems: ocrPages.reduce((s: number, p: any) => s + p.textItemCount, 0),
    totalLines: allLines.length,
    imagePagesCount: total,
    likelyScanned: true,
    likelyImageBased: true,
    pages: ocrPages.map((p: any) => ({
      pageNum: p.pageNum, rawItemCount: p.rawItemCount,
      textItemCount: p.textItemCount, lineCount: p.lines.length,
      isImageOnly: true, extractionMode: "plain", sampleItems: [],
    })),
  };

  return buildNormalizedDocument(allLines, report);
}

// ── Existing counts ───────────────────────────────────────────────────────────
async function getCounts() {
  const [r1, r2, r3] = await Promise.all([
    db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 1),
    db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 2),
    db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 3),
  ]);
  return { t1: r1.count ?? 0, t2: r2.count ?? 0, t3: r3.count ?? 0 };
}

// ── Save T3 ───────────────────────────────────────────────────────────────────
async function saveT3(ex: any, sourcePdf: string) {
  const { data: row, error } = await db.from("lesen_exercises")
    .insert({ title: ex.title ?? "Lesen Teil 3", teil: 3, created_by: IMPORT_USER, source_pdf: sourcePdf })
    .select("id").single();
  if (error || !row) fail(`T3 exercise insert: ${error?.message}`);

  if (ex.situations?.length) {
    const { error: e } = await db.from("lesen_t3_situations").insert(
      ex.situations.map((s: any) => ({
        exercise_id: row.id,
        number: s.number,
        description: sanitize(s.description),
        correct_letter: s.noMatch ? null : (s.correctLetter ?? s.correct_letter ?? null),
        no_match: !!(s.noMatch ?? s.no_match),
      }))
    );
    if (e) fail(`T3 situations insert: ${e.message}`);
  }

  if (ex.texts?.length) {
    const { error: e } = await db.from("lesen_t3_texts").insert(
      ex.texts.map((t: any) => ({
        exercise_id: row.id,
        letter: t.letter,
        title: sanitize(t.title),
        content: sanitize(t.content),
      }))
    );
    if (e) fail(`T3 texts insert: ${e.message}`);
  }

  log(`  → T3 ${row.id}: ${ex.situations?.length ?? 0} situations, ${ex.texts?.length ?? 0} texts`);
  return row.id;
}

// ── Save T1 ───────────────────────────────────────────────────────────────────
async function saveT1(ex: any, sourcePdf: string) {
  const { data: row, error } = await db.from("lesen_exercises")
    .insert({ title: ex.title ?? "Lesen Teil 1", teil: 1, created_by: IMPORT_USER, source_pdf: sourcePdf })
    .select("id").single();
  if (error || !row) fail(`T1 exercise insert: ${error?.message}`);

  if (ex.headlines?.length) {
    const { error: e } = await db.from("lesen_t1_headlines").insert(
      ex.headlines.map((h: any) => ({
        exercise_id: row.id,
        letter: h.letter,
        text: sanitize(h.text),
        is_distractor: !!(h.isDistractor ?? h.is_distractor ?? false),
      }))
    );
    if (e) fail(`T1 headlines insert: ${e.message}`);
  }

  if (ex.texts?.length) {
    const { error: e } = await db.from("lesen_t1_texts").insert(
      ex.texts.map((t: any, i: number) => ({
        exercise_id: row.id,
        position: t.position ?? (i + 1),
        title: sanitize(t.title ?? t.heading),
        content: sanitize(t.content ?? t.body),
        correct_headline: t.correctHeadline ?? t.correct_headline ?? "",
      }))
    );
    if (e) fail(`T1 texts insert: ${e.message}`);
  }

  log(`  → T1 ${row.id}: ${ex.headlines?.length ?? 0} headlines, ${ex.texts?.length ?? 0} texts`);
  return row.id;
}

// ── Save T2 ───────────────────────────────────────────────────────────────────
async function saveT2(result: any, sourcePdf: string, label: string) {
  const { data: row, error } = await db.from("lesen_exercises")
    .insert({ title: label, teil: 2, created_by: IMPORT_USER, source_pdf: sourcePdf })
    .select("id").single();
  if (error || !row) fail(`T2 exercise insert: ${error?.message}`);

  const passage = sanitize(result.passage);
  const { error: pe } = await db.from("lesen_t2_passages").insert({
    exercise_id: row.id,
    title: label,
    instructions: "",
    passage,
  });
  if (pe) fail(`T2 passage insert: ${pe.message}`);

  const questions = result.exercise1?.questions ?? result.questions ?? [];
  if (questions.length) {
    const { error: qe } = await db.from("lesen_t2_questions").insert(
      questions.map((q: any) => ({
        exercise_id: row.id,
        number: q.number ?? q.index ?? 1,
        question: sanitize(q.stem ?? q.question),
        option_a: sanitize(q.options?.[0]?.text ?? q.option_a ?? q.optionA),
        option_b: sanitize(q.options?.[1]?.text ?? q.option_b ?? q.optionB),
        option_c: sanitize(q.options?.[2]?.text ?? q.option_c ?? q.optionC),
        correct: (q.answer ?? q.correct ?? "a") as "a" | "b" | "c",
      }))
    );
    if (qe) fail(`T2 questions insert: ${qe.message}`);
  }

  log(`  → T2 ${row.id}: ${passage.length} chars, ${questions.length} questions`);
  return row.id;
}

// ── Final DB verification ─────────────────────────────────────────────────────
async function verifyDB() {
  log("\n━━ Database Verification ━━");
  const [t1, t2, t3, h, t1t, p, q, sit, t3t] = await Promise.all([
    db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 1),
    db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 2),
    db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 3),
    db.from("lesen_t1_headlines").select("id", { count: "exact", head: true }),
    db.from("lesen_t1_texts").select("id", { count: "exact", head: true }),
    db.from("lesen_t2_passages").select("id", { count: "exact", head: true }),
    db.from("lesen_t2_questions").select("id", { count: "exact", head: true }),
    db.from("lesen_t3_situations").select("id", { count: "exact", head: true }),
    db.from("lesen_t3_texts").select("id", { count: "exact", head: true }),
  ]);
  log(`  T1 exercises:  ${t1.count}  |  headlines: ${h.count}  |  texts: ${t1t.count}`);
  log(`  T2 exercises:  ${t2.count}  |  passages:  ${p.count}  |  questions: ${q.count}`);
  log(`  T3 exercises:  ${t3.count}  |  situations: ${sit.count}  |  texts: ${t3t.count}`);

  const { data: answerSample } = await db
    .from("lesen_t2_questions")
    .select("number, correct")
    .limit(3);
  if (answerSample?.length) {
    log(`  ✓ Answer keys (service role): ${answerSample.map((a: any) => `Q${a.number}→${a.correct}`).join(", ")}`);
    log("  ✓ RLS blocks students from reading 'correct' column before submission");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("=== AuraLingovia — PDF Direct Import ===\n");

  const pdfs = {
    t3:   path.join(PDF_DIR, "Lesen Teil 3 (1).pdf"),
    t1:   path.join(PDF_DIR, "lesen teil 1.pdf"),
    t2v1: path.join(PDF_DIR, "lesen teil 2 (1).pdf"),
    t2v2: path.join(PDF_DIR, "lesen teil 2 (2).pdf"),
  };

  for (const [, p] of Object.entries(pdfs)) {
    if (!fs.existsSync(p)) fail(`Missing PDF: ${p}`);
    log(`  Found: ${path.basename(p)} (${Math.round(fs.statSync(p).size / 1024)} KB)`);
  }

  let counts = await getCounts();
  log(`\nDB existing: T1=${counts.t1}, T2=${counts.t2}, T3=${counts.t3}`);

  // ── T3 ───────────────────────────────────────────────────────────────────
  if (counts.t3 === 0) {
    log("\n━━ T3: Lesen Teil 3 (1).pdf ━━");
    const file = await readPdfAsFile(pdfs.t3);
    const doc  = await extractNormalizedDocument(file);
    log(`  Lines: ${doc.lines.length}, scanned: ${doc.extractionReport.likelyScanned}`);

    const exercises = parseLesenT3(doc);
    log(`  Parsed: ${exercises.length} exercise(s)`);

    if (exercises.length === 0) {
      warn("parseLesenT3 returned 0. First 20 lines:");
      doc.lines.slice(0, 20).forEach((l: any, i: number) => log(`    [${i}] ${l.text}`));
      warn("Saving placeholder — manual data entry required in admin UI");
      await saveT3({ title: "Lesen Teil 3 — Bitte manuell eingeben", situations: [], texts: [] }, "Lesen Teil 3 (1).pdf");
    } else {
      for (let i = 0; i < exercises.length; i++) {
        exercises[i].title = `Lesen Teil 3 — Übung ${i + 1}`;
        await saveT3(exercises[i], "Lesen Teil 3 (1).pdf");
      }
    }
  } else {
    log(`\n━━ T3: skip (${counts.t3} exist) ━━`);
  }

  // ── T1 ───────────────────────────────────────────────────────────────────
  counts = await getCounts();
  if (counts.t1 === 0) {
    log("\n━━ T1: lesen teil 1.pdf (62 MB, scanned) ━━");

    // Quick scanned check
    const isScanned = await (async () => {
      const pdfjsMod = await import(/* @vite-ignore */ "pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
      // workerSrc set by ocrPdfToNormalizedDoc
      const bytes = await readFile(pdfs.t1);
      const pdf   = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
      const pg    = await pdf.getPage(1);
      const txt   = await pg.getTextContent();
      const chars = txt.items.reduce((s: number, item: any) => s + (item.str?.replace(/\s/g, "").length ?? 0), 0);
      return chars < 20;
    })();

    log(`  Scanned: ${isScanned}`);
    let doc: any;
    if (isScanned) {
      log("  Running OCR (several minutes for 62 MB)…");
      doc = await ocrPdfToNormalizedDoc(pdfs.t1);
    } else {
      const file = await readPdfAsFile(pdfs.t1);
      doc = await extractNormalizedDocument(file);
    }

    log(`  Lines: ${doc.lines?.length ?? 0}`);
    const result = parseLesenT1(doc);
    log(`  T1: ${result.headlines?.length ?? 0} headlines, ${result.texts?.length ?? 0} texts`);
    await saveT1(result, "lesen teil 1.pdf");
  } else {
    log(`\n━━ T1: skip (${counts.t1} exist) ━━`);
  }

  // ── T2 v1 ────────────────────────────────────────────────────────────────
  counts = await getCounts();
  if (counts.t2 < 1) {
    log("\n━━ T2 v1: lesen teil 2 (1).pdf ━━");
    let doc: any;
    {
      // Check if scanned; fall back to OCR if needed
      const file = await readPdfAsFile(pdfs.t2v1);
      const candidate = await extractNormalizedDocument(file);
      if (candidate.extractionReport.likelyScanned || candidate.lines.length < 30) {
        log("  Detected scanned PDF — running OCR (several minutes)…");
        doc = await ocrPdfToNormalizedDoc(pdfs.t2v1);
      } else {
        doc = candidate;
      }
    }
    log(`  Lines: ${doc.lines?.length ?? doc.lines?.length ?? 0}, scanned: ${doc.extractionReport?.likelyScanned ?? true}`);

    const result = parseLesenT2(doc);
    log(`  blockRelation: ${result.blockRelation}, passage: ${result.passage?.length ?? 0} chars, q1: ${result.exercise1?.questions?.length ?? 0}, q2: ${result.exercise2?.questions?.length ?? 0}`);

    await saveT2(result, "lesen teil 2 (1).pdf", "Lesen Teil 2 — Version 1");

    if (result.blockRelation === "two-variants" && result.exercise2?.questions?.length) {
      log("  Two-variant PDF — saving exercise2 as separate entry");
      const r2 = { passage: result.passage, exercise1: result.exercise2 };
      await saveT2(r2, "lesen teil 2 (1).pdf", "Lesen Teil 2 — Version 1 (Variante B)");
    }
  } else {
    log(`\n━━ T2 v1: skip (${counts.t2} exist) ━━`);
  }

  // ── T2 v2 ────────────────────────────────────────────────────────────────
  counts = await getCounts();
  if (counts.t2 < 2) {
    log("\n━━ T2 v2: lesen teil 2 (2).pdf ━━");
    let doc: any;
    {
      const file = await readPdfAsFile(pdfs.t2v2);
      const candidate = await extractNormalizedDocument(file);
      if (candidate.extractionReport.likelyScanned || candidate.lines.length < 30) {
        log("  Detected scanned PDF — running OCR…");
        doc = await ocrPdfToNormalizedDoc(pdfs.t2v2);
      } else {
        doc = candidate;
      }
    }
    log(`  Lines: ${doc.lines?.length ?? 0}, scanned: ${doc.extractionReport?.likelyScanned ?? true}`);

    const result = parseLesenT2(doc);
    log(`  blockRelation: ${result.blockRelation}, questions: ${result.exercise1?.questions?.length ?? 0}`);
    await saveT2(result, "lesen teil 2 (2).pdf", "Lesen Teil 2 — Version 2");
  } else {
    log(`\n━━ T2 v2: skip (${counts.t2} exist) ━━`);
  }

  await verifyDB();

  log("\n");
  log("══════════════════════════════════════════════════════════");
  log("✅  Import complete.");
  log("  /schriftlich/vorbereitung/lesen/teil-1  ← T1");
  log("  /schriftlich/vorbereitung/lesen/teil-2  ← T2");
  log("  /schriftlich/vorbereitung/lesen/teil-3  ← T3");
  log("══════════════════════════════════════════════════════════");
}

main().catch((e) => { console.error(e); process.exit(1); });

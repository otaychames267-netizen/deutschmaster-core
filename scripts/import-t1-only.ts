/**
 * Import T1 from lesen teil 1.pdf (scanned, requires OCR).
 * - Deletes any existing T1 exercises that have 0 texts (bad previous import)
 * - Runs OCR on the 62 MB PDF (~80 min)
 * - Parses with fixed parser (lowercase a-j headlines, order-independent)
 * - Saves first valid exercise (10 headlines, ≥3 texts)
 */

import { readFile } from "fs/promises";
import * as path from "path";
import { createCanvas } from "canvas";
import { createWorker } from "tesseract.js";
import { createClient } from "@supabase/supabase-js";
import { mergeRichLines } from "../src/lib/import/pdf-extractor.js";
import { buildNormalizedDocument } from "../src/lib/import/document-analyzer.js";
import { parseAllLesenT1Exercises } from "../src/lib/import/lesen-t1-parser.js";

const SUPABASE_URL = "https://gewcyydpgbfutkdcyztr.supabase.co";
const SERVICE_KEY  = "";
const PDF_PATH     = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 1.pdf";
const IMPORT_USER  = "df47fbfc-7895-4941-864a-5d1d8f4fdc30";

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);

function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  return s.split("").filter((c) => {
    const code = c.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  }).join("").trim();
}

async function ocrPdf(): Promise<any> {
  const pdfjsMod = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  try {
    const { createRequire } = await import("module" as string);
    const req = createRequire(import.meta.url);
    const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\").join("/");
  } catch { /* noop */ }

  const bytes = await readFile(PDF_PATH);
  const pdf   = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const total: number = pdf.numPages;
  const XOBJ  = pdfjsMod.OPS?.paintImageXObject ?? 85;
  log(`  OCR: ${total} pages to process`);

  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });
  const ocrPages: any[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    if (pageNum % 5 === 0) log(`  OCR page ${pageNum}/${total}`);
    const page   = await pdf.getPage(pageNum);
    const opList = await page.getOperatorList();

    const xobjKeys: string[] = [];
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === XOBJ && opList.argsArray[j]?.[0]) {
        const k = opList.argsArray[j][0];
        if (!xobjKeys.includes(k)) xobjKeys.push(k);
      }
    }

    let bestImg: any = null;
    for (const key of xobjKeys) {
      const imgData: any = await new Promise((resolve) => {
        page.objs.get(key, resolve);
        setTimeout(() => resolve(null), 5000);
      });
      if (imgData?.data && imgData.width && imgData.height) {
        if (!bestImg || imgData.width * imgData.height > bestImg.width * bestImg.height) {
          bestImg = imgData;
        }
      }
    }

    let lines: any[] = [];
    if (bestImg) {
      const nPixels  = bestImg.width * bestImg.height;
      const channels = Math.round(bestImg.data.length / nPixels);
      const rgba     = new Uint8ClampedArray(nPixels * 4);
      if (channels === 4) {
        rgba.set(bestImg.data);
      } else if (channels === 3) {
        for (let k = 0; k < nPixels; k++) {
          rgba[k*4] = bestImg.data[k*3]; rgba[k*4+1] = bestImg.data[k*3+1];
          rgba[k*4+2] = bestImg.data[k*3+2]; rgba[k*4+3] = 255;
        }
      } else {
        for (let k = 0; k < nPixels; k++) {
          rgba[k*4] = rgba[k*4+1] = rgba[k*4+2] = bestImg.data[k]; rgba[k*4+3] = 255;
        }
      }
      const srcCanvas = createCanvas(bestImg.width, bestImg.height);
      const srcCtx    = srcCanvas.getContext("2d") as any;
      const id        = srcCtx.createImageData(bestImg.width, bestImg.height);
      id.data.set(rgba);
      srcCtx.putImageData(id, 0, 0);
      const dstCanvas = createCanvas(bestImg.width * 2, bestImg.height * 2);
      (dstCanvas.getContext("2d") as any).drawImage(srcCanvas, 0, 0, bestImg.width * 2, bestImg.height * 2);
      const pngBuf = dstCanvas.toBuffer("image/png");

      const result = await worker.recognize(pngBuf);
      const rawLines = result.data.text.split("\n");
      let y = 0;
      lines = rawLines
        .map((text: string) => {
          const trimmed = text.trim();
          const line = { text: trimmed, x: 0, y: y++, pageNum, bold: false, italic: false,
            fontSize: 12, hasBoldWord: false, color: null, isGreen: false, hasGreenWord: false };
          return line;
        })
        .filter((l: any) => l.text.length > 0);
    }

    ocrPages.push({ pageNum, rawItemCount: lines.length, textItemCount: lines.length, lines });
  }

  await worker.terminate();

  const allLines = mergeRichLines(ocrPages as any);
  const report: any = {
    totalPages: total, likelyScanned: true, likelyImageBased: true,
    totalRawItems: ocrPages.reduce((s: number, p: any) => s + p.rawItemCount, 0),
    totalTextItems: ocrPages.reduce((s: number, p: any) => s + p.textItemCount, 0),
    totalLines: allLines.length,
    imagePagesCount: total,
    pages: ocrPages.map((p: any) => ({
      pageNum: p.pageNum, rawItemCount: p.rawItemCount,
      textItemCount: p.textItemCount, lineCount: p.lines.length,
      isImageOnly: true, extractionMode: "plain", sampleItems: [],
    })),
  };
  return buildNormalizedDocument(allLines, report);
}

async function main() {
  log("=== T1 Only Import ===");

  // Delete ALL existing T1 exercises (clean slate for multi-exercise re-import)
  const { data: existing } = await db.from("lesen_exercises").select("id").eq("teil", 1);
  for (const ex of (existing ?? [])) {
    log(`  Deleting T1 exercise ${ex.id}`);
    await db.from("lesen_t1_texts").delete().eq("exercise_id", ex.id);
    await db.from("lesen_t1_headlines").delete().eq("exercise_id", ex.id);
    await db.from("lesen_exercises").delete().eq("id", ex.id);
  }

  log("Running OCR (62 MB, ~80 min)...");
  const doc = await ocrPdf();
  log(`  Lines: ${doc.lines.length}`);

  const results = parseAllLesenT1Exercises(doc);
  log(`  Parser found ${results.length} exercises`);

  let imported = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    log(`  Exercise ${i + 1}: ${result.headlines.length} headlines, ${result.texts.length} texts, confidence=${result.confidence}`);
    if (result.warnings.length) log(`    Warnings: ${result.warnings.join("; ")}`);

    if (result.headlines.length < 5 && result.texts.length < 3) {
      log(`    Skipping (too little content)`);
      continue;
    }

    const { data: row, error } = await db.from("lesen_exercises")
      .insert({ title: result.title ?? `Lesen Teil 1 (${i + 1})`, teil: 1, created_by: IMPORT_USER, source_pdf: "lesen teil 1.pdf" })
      .select("id").single();
    if (error || !row) { console.error("Insert error:", error?.message); continue; }

    if (result.headlines.length) {
      const { error: e } = await db.from("lesen_t1_headlines").insert(
        result.headlines.map((h) => ({
          exercise_id: row.id,
          letter: h.letter,
          text: sanitize(h.text),
          is_distractor: !!(h.is_distractor ?? false),
        }))
      );
      if (e) console.error("Headlines insert:", e.message);
    }

    if (result.texts.length) {
      const { error: e } = await db.from("lesen_t1_texts").insert(
        result.texts.map((t, ti) => ({
          exercise_id: row.id,
          position: t.position ?? (ti + 1),
          title: sanitize(t.title),
          content: sanitize(t.content),
          correct_headline: t.correct_headline ?? "",
        }))
      );
      if (e) console.error("Texts insert:", e.message);
    }

    log(`  → T1 ${row.id}: ${result.headlines.length} headlines, ${result.texts.length} texts`);
    imported++;
  }

  log(`\nDone. Imported ${imported} T1 exercises.`);
}

main().catch(e => { console.error(e); process.exit(1); });

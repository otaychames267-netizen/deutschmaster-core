/**
 * extract-lesen-t2-hybrid.ts — OCR-first extraction with Gemini fallback.
 *
 * For each page:
 *   1. Try deterministic OCR (free). Accept only if it passes the strict quality gate.
 *   2. Otherwise fall back to Gemini vision (throttled, 429-retry, empty re-verify).
 * Results cached per page with their source, so no page is processed twice and
 * Gemini is used as sparingly as possible.
 *
 * READ-ONLY: writes only a local JSON artifact. No database access.
 *
 * Usage: tsx scripts/extract-lesen-t2-hybrid.ts "<pdf>" <outName> [maxPages]
 */
import "dotenv/config";
import { writeFile, readFile, mkdir } from "fs/promises";
import * as path from "path";
import { getPageCount, extractPageImagePng, classifyT2Page, type PageExtraction } from "../src/lib/import/gemini-vision.js";
import { ocrExtractPage, terminateOcr } from "../src/lib/import/ocr-extract.js";

const CACHE_DIR = "scripts/.extract-cache";
const DELAY_MS = parseInt(process.env.GEMINI_DELAY_MS ?? "4500");
const CONF = parseInt(process.env.OCR_CONF_THRESHOLD ?? "80");

async function loadCache(name: string): Promise<Record<number, any>> {
  try { return JSON.parse(await readFile(path.join(CACHE_DIR, `${name}.json`), "utf8")); } catch { return {}; }
}
async function saveCache(name: string, c: any) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, `${name}.json`), JSON.stringify(c, null, 2));
}

const hasContent = (e: any) =>
  e && !String(e.notes ?? "").startsWith("extract error") &&
  (e.article_text || e.questions?.length || e.answer_key?.length || (e.role && e.role !== "other") || e._verified);

async function main() {
  const pdfPath = process.argv[2];
  const outName = process.argv[3] ?? "t2_hybrid";
  const maxPages = process.argv[4] ? parseInt(process.argv[4]) : 0;
  if (!pdfPath) { console.error("usage: extract-lesen-t2-hybrid.ts <pdf> <outName> [maxPages]"); process.exit(1); }

  const total = maxPages || await getPageCount(pdfPath);
  console.log(`PDF: ${pdfPath}\nPages: ${total}\nOCR conf threshold: ${CONF}\nGemini model: ${process.env.GEMINI_MODEL ?? "gemini-2.5-flash"}\n`);

  const cache = await loadCache(outName);
  let ocrCount = 0, gemCount = 0, sinceGemini = 0;

  for (let p = 1; p <= total; p++) {
    if (hasContent(cache[p])) { console.log(`  page ${p}: cached (${cache[p]._source ?? "?"}/${cache[p].role})`); if (cache[p]._source === "ocr") ocrCount++; else gemCount++; continue; }

    // 1) OCR-first
    let result: any = null;
    try {
      const ocr = await ocrExtractPage(pdfPath, p, CONF);
      if (ocr.accepted) {
        result = { ...ocr.extraction, _source: "ocr", _confidence: Math.round(ocr.meanConfidence) };
        ocrCount++;
        console.log(`  page ${p}: OCR ✓ conf=${ocr.meanConfidence.toFixed(0)} role=${result.role} ${result.article_headline ? `"${result.article_headline}"` : ""} ${result.questions ? result.questions.length + "q" : ""}`.trimEnd());
      } else {
        console.log(`  page ${p}: OCR ✗ (${ocr.reasons.join(",")}) → Gemini`);
      }
    } catch (e) {
      console.log(`  page ${p}: OCR error (${String(e).slice(0, 80)}) → Gemini`);
    }

    // 2) Gemini fallback
    if (!result) {
      if (sinceGemini > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
      sinceGemini++;
      try {
        const png = await extractPageImagePng(pdfPath, p);
        let ext: any = await classifyT2Page(png.toString("base64"), p);
        const empty = (x: any) => x.role === "other" && !x.article_text && !(x.questions?.length) && !(x.answer_key?.length);
        if (empty(ext)) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
          const retry = await classifyT2Page(png.toString("base64"), p);
          if (!empty(retry)) ext = retry; else { ext._verified = true; ext.notes = (ext.notes ? ext.notes + "; " : "") + "empty after re-verify — flag for human review"; }
        }
        result = { ...ext, _source: "gemini" };
        gemCount++;
        console.log(`  page ${p}: Gemini role=${ext.role} ${ext.article_headline ? `"${ext.article_headline}"` : ""} ${ext.questions ? ext.questions.length + "q" : ""} ${ext.answer_key?.length ? "KEY" + ext.answer_key.length : ""}`.trimEnd());
      } catch (e) {
        console.error(`  page ${p}: GEMINI ERROR ${String(e).slice(0, 140)}`);
        result = { page: p, role: "other", article_headline: null, article_text: null, questions: null, answer_key: null, notes: `extract error: ${String(e).slice(0, 120)}`, _source: "error" };
      }
    }

    cache[p] = result;
    await saveCache(outName, cache);
  }

  await terminateOcr();
  await saveCache(outName, cache);

  const pct = (n: number) => ((n / total) * 100).toFixed(0);
  console.log(`\n── SOURCE SPLIT ──`);
  console.log(`  OCR:    ${ocrCount}/${total} (${pct(ocrCount)}%)`);
  console.log(`  Gemini: ${gemCount}/${total} (${pct(gemCount)}%)`);
  console.log(`\nArtifact: ${path.join(CACHE_DIR, `${outName}.json`)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

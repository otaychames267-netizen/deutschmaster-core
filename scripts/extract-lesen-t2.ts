/**
 * extract-lesen-t2.ts — STAGE 1 of the Lesen Teil 2 pipeline.
 *
 * Classifies every page of a scanned Teil 2 PDF via Gemini vision into
 * structured JSON, caching per-page results so re-runs are cheap.
 *
 * READ-ONLY: writes only a local JSON artifact. No database access.
 *
 * Usage: tsx scripts/extract-lesen-t2.ts "<pdf path>" [outName]
 */
import "dotenv/config";
import { writeFile, readFile, mkdir } from "fs/promises";
import * as path from "path";
import {
  extractPageImagePng, getPageCount, classifyT2Page, type PageExtraction,
} from "../src/lib/import/gemini-vision.js";

const CACHE_DIR = "scripts/.extract-cache";

async function loadCache(name: string): Promise<Record<number, PageExtraction>> {
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw);
  } catch { return {}; }
}

async function saveCache(name: string, cache: Record<number, PageExtraction>) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, `${name}.json`), JSON.stringify(cache, null, 2));
}

async function main() {
  const pdfPath = process.argv[2];
  const outName = process.argv[3] ?? path.basename(pdfPath).replace(/[^a-z0-9]+/gi, "_");
  if (!pdfPath) { console.error("usage: extract-lesen-t2.ts <pdf> [outName]"); process.exit(1); }

  const total = await getPageCount(pdfPath);
  console.log(`PDF: ${pdfPath}\nPages: ${total}\nModel: ${process.env.GEMINI_MODEL ?? "gemini-2.5-flash"}\n`);

  const DELAY_MS = parseInt(process.env.GEMINI_DELAY_MS ?? "4500"); // throttle to respect free-tier RPM
  const cache: Record<number, any> = await loadCache(outName);
  const pages: PageExtraction[] = [];

  // A cached entry is trustworthy only if it carried real content or was already
  // re-verified as genuinely empty. Error placeholders and unverified empty
  // "other" pages are re-extracted so nothing is silently dropped.
  const hasContent = (e: any) =>
    e && !String(e.notes ?? "").startsWith("extract error") &&
    (e.article_text || (e.questions && e.questions.length) || (e.answer_key && e.answer_key.length) ||
     (e.role && !["other"].includes(e.role)) || e._verified);

  let processed = 0;
  for (let p = 1; p <= total; p++) {
    if (hasContent(cache[p])) { pages.push(cache[p]); console.log(`  page ${p}: cached (${cache[p].role})`); continue; }

    if (processed > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    processed++;
    try {
      const png = await extractPageImagePng(pdfPath, p);
      let ext: any = await classifyT2Page(png.toString("base64"), p);

      // Verification re-pass: if it came back empty "other", try once more before trusting it.
      const empty = (x: any) => x.role === "other" && !x.article_text && !(x.questions?.length) && !(x.answer_key?.length);
      if (empty(ext)) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
        const retry = await classifyT2Page(png.toString("base64"), p);
        if (!empty(retry)) ext = retry;
        else { ext._verified = true; ext.notes = (ext.notes ? ext.notes + "; " : "") + "empty after re-verify — flag image for human review"; }
      }

      cache[p] = ext;
      pages.push(ext);
      const hl = ext.article_headline ? `"${ext.article_headline}"` : "—";
      const q = ext.questions ? `${ext.questions.length}q` : "";
      const k = ext.answer_key ? `KEY(${ext.answer_key.length})` : "";
      console.log(`  page ${p}: ${ext.role} ${hl} ${q} ${k}`.trimEnd());
      await saveCache(outName, cache);
    } catch (e) {
      console.error(`  page ${p}: ERROR ${String(e).slice(0, 160)}`);
      cache[p] = { page: p, role: "other", article_headline: null, article_text: null, questions: null, answer_key: null, notes: `extract error: ${String(e).slice(0,120)}` };
      pages.push(cache[p]);
      await saveCache(outName, cache);
    }
  }
  await saveCache(outName, cache);

  // Summary
  const roleCounts: Record<string, number> = {};
  const headlines = new Set<string>();
  let keyPages = 0;
  for (const pg of pages) {
    roleCounts[pg.role] = (roleCounts[pg.role] ?? 0) + 1;
    if (pg.article_headline) headlines.add(pg.article_headline);
    if (pg.answer_key?.length) keyPages++;
  }
  console.log(`\n── SUMMARY ──`);
  console.log(`Roles:`, roleCounts);
  console.log(`Distinct headlines (${headlines.size}):`);
  for (const h of headlines) console.log(`   • ${h}`);
  console.log(`Pages with an answer key: ${keyPages}`);

  const artifact = path.join(CACHE_DIR, `${outName}.json`);
  console.log(`\nArtifact: ${artifact}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

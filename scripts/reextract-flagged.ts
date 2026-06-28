/**
 * reextract-flagged.ts — second automated recovery pass for flagged articles.
 *
 * For each flagged draft (NEEDS_REPROCESS, or an explicit idx list), runs the
 * MULTI-STRATEGY best-of-N article OCR, and keeps the new text only if it
 * improves coherence. Updates both the extraction cache and the staging draft,
 * then re-validates the batch. Pure OCR — no Gemini. Manual review only if this
 * still can't reach acceptable confidence.
 *
 * Usage: tsx scripts/reextract-flagged.ts "<source_pdf>" "<pdf path>" <cacheName> [idx,idx,...]
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { adminClient } from "../src/lib/import/storage.js";
import { ocrArticleBest } from "../src/lib/import/ocr-extract.js";

import { checkCoherence } from "../src/lib/import/coherence.js";
import { validateBatch } from "../src/lib/import/run-validation.js";

const CACHE_DIR = "scripts/.extract-cache";
const ACCEPT = parseFloat(process.env.ACCEPT_COHERENCE ?? "0.8");

async function main() {
  const sourcePdf = process.argv[2];
  const pdfPath = process.argv[3];
  const cacheName = process.argv[4];
  const explicit = process.argv[5] ? process.argv[5].split(",").map(Number) : null;
  if (!sourcePdf || !pdfPath || !cacheName) { console.error('usage: reextract-flagged.ts "<source_pdf>" "<pdf path>" <cacheName> [idx,...]'); process.exit(1); }

  const db = adminClient();
  const exFile = path.join(CACHE_DIR, `${cacheName}.exercises.json`);
  const cache: Record<string, any> = JSON.parse(await readFile(exFile, "utf8"));

  const { data: batch } = await db.from("import_batches").select("id").eq("source_pdf", sourcePdf).maybeSingle();
  const { data: drafts } = await db.from("import_draft_exercises").select("*").eq("batch_id", (batch as any).id).order("idx");

  // which to re-extract: explicit list, or every draft flagged NEEDS_REPROCESS
  const flagged = explicit ?? (drafts ?? []).filter((d: any) => (d.flags ?? []).includes("NEEDS_REPROCESS")).map((d: any) => d.idx);
  console.log(`Re-extracting ${flagged.length} flagged article(s): ${flagged.join(",")}\n`);

  let recovered = 0, stillLow = 0;
  const targets = flagged.map((idx: number) => ({ idx, page: cache[idx]?._pages?.[0] })).filter((t: any) => t.page);
  // SERIAL single-worker (the worker pool is unreliable in this env and can hang).
  const results: any[] = [];
  for (const t of targets) {
    const before = checkCoherence(cache[t.idx].article).score;
    const best = await ocrArticleBest(pdfPath, t.page);
    results.push({ idx: t.idx, before, best });
    console.log(`  [serial] idx ${t.idx} coherence ${before.toFixed(2)}→${best.coherence.toFixed(2)}`);
  }

  for (const { idx, before, best } of results) {
    const e = cache[idx];
    const tag = best.coherence >= ACCEPT ? "RECOVERED" : best.coherence > before ? "IMPROVED" : "NO-GAIN";
    if (best.coherence >= ACCEPT) recovered++; else stillLow++;
    console.log(`  idx ${idx} "${e.title}": coherence ${before.toFixed(2)} → ${best.coherence.toFixed(2)} [${best.strategy}] ${tag}`);
    if (best.coherence > before) {
      cache[idx] = { ...e, article: best.text, _article_source: `ocr-best:${best.strategy}`, _article_coherence: best.coherence };
      const d: any = (drafts ?? []).find((x: any) => x.idx === idx);
      if (d) await db.from("import_draft_exercises").update({ article: best.text }).eq("id", d.id);
    }
  }
  await writeFile(exFile, JSON.stringify(cache, null, 2));

  console.log(`\nRecovered (≥${ACCEPT}): ${recovered}, still low: ${stillLow}. Re-validating batch…\n`);
  const sum = await validateBatch(db, sourcePdf);
  console.log(`Validation: ${sum.passed}/${sum.total} passed · ${sum.reprocess} reprocess (idx ${sum.reprocessIdx.join(",") || "—"}) · ${sum.status}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

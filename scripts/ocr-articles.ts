/**
 * ocr-articles.ts — replace Gemini article bodies with LITERAL OCR transcription
 * + conservative correction + coherence flagging. No paraphrase, no rewriting.
 *
 * Updates each exercise's `article` (OCR-sourced), records corrections made, and
 * sets `_article_review = true` when coherence is not clean (→ manual review).
 * READ-ONLY w.r.t. the database.
 *
 * Usage: tsx scripts/ocr-articles.ts <pdf> <outName> [idx,idx,...] [scale]
 */
import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import { ocrArticleText, terminateOcr } from "../src/lib/import/ocr-extract.js";
import { conservativeCorrect } from "../src/lib/import/german-correct.js";
import { checkCoherence } from "../src/lib/import/coherence.js";

const CACHE_DIR = "scripts/.extract-cache";

async function main() {
  const pdf = process.argv[2];
  const outName = process.argv[3];
  const exFile = path.join(CACHE_DIR, `${outName}.exercises.json`);
  const cache: Record<string, any> = JSON.parse(await readFile(exFile, "utf8"));
  const idxArg = process.argv[4];
  const scale = process.argv[5] ? parseFloat(process.argv[5]) : 3;
  const indices = idxArg && !idxArg.includes(".")
    ? idxArg.split(",").map((s) => parseInt(s.trim())).filter(Boolean)
    : Object.keys(cache).map(Number).sort((a, b) => a - b);

  let clean = 0, flagged = 0;
  for (const idx of indices) {
    const e = cache[idx];
    const articlePage: number | undefined = e?._pages?.[0];
    if (!articlePage) { console.log(`  ex ${idx}: no article page`); continue; }
    try {
      const ocr = await ocrArticleText(pdf, articlePage, scale);
      const { text, changes } = conservativeCorrect(ocr.text);
      const coh = checkCoherence(text);
      cache[idx] = {
        ...e,
        article: text,
        title: e.title ?? ocr.headline,
        _article_source: `ocr@${scale}x`,
        _article_confidence: Math.round(ocr.confidence),
        _article_corrections: changes.length,
        _article_review: !coh.ok,
        _article_issues: coh.issues,
      };
      await writeFile(exFile, JSON.stringify(cache, null, 2));
      if (coh.ok) clean++; else flagged++;
      console.log(`  ex ${idx} (p${articlePage}): conf=${ocr.confidence.toFixed(0)} len=${text.length} fixes=${changes.length} coherence=${coh.score.toFixed(2)} ${coh.ok ? "CLEAN" : "REVIEW: " + coh.issues.slice(0,3).join(",")}`);
    } catch (err) {
      console.error(`  ex ${idx}: ERROR ${String(err).slice(0, 120)}`);
    }
  }
  await terminateOcr();
  console.log(`\nArticles: ${clean} clean, ${flagged} flagged for manual review.`);
}
main().catch((e) => { console.error(e); process.exit(1); });

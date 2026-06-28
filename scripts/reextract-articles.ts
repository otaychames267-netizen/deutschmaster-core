/**
 * reextract-articles.ts — high-res, isolated, verbatim re-extraction of ARTICLE
 * bodies only. Keeps existing title/questions/options/answer-key intact.
 *
 * For each exercise index: take its article page, upscale (default 3x), call the
 * dedicated verbatim article extractor, run the coherence check, and update the
 * article field. Articles still failing coherence are marked _article_review.
 *
 * Usage: tsx scripts/reextract-articles.ts <pdf> <outName> <idx,idx,...> [scale]
 */
import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import sharp from "sharp";
import { extractPageImagePng, extractArticleVerbatim } from "../src/lib/import/gemini-vision.js";
import { checkCoherence } from "../src/lib/import/coherence.js";

const CACHE_DIR = "scripts/.extract-cache";
const DELAY_MS = parseInt(process.env.GEMINI_DELAY_MS ?? "8000");

async function upscale(buf: Buffer, factor: number): Promise<Buffer> {
  const m = await sharp(buf).metadata();
  return sharp(buf).resize({ width: Math.round((m.width ?? 1200) * factor) }).sharpen().png().toBuffer();
}

async function main() {
  const pdf = process.argv[2];
  const outName = process.argv[3];
  const indices = (process.argv[4] ?? "").split(",").map((s) => parseInt(s.trim())).filter(Boolean);
  const scale = process.argv[5] ? parseFloat(process.argv[5]) : 3;
  if (!pdf || !outName || !indices.length) { console.error("usage: reextract-articles.ts <pdf> <outName> <idx,...> [scale]"); process.exit(1); }

  const exFile = path.join(CACHE_DIR, `${outName}.exercises.json`);
  const cache: Record<string, any> = JSON.parse(await readFile(exFile, "utf8"));

  let i = 0;
  for (const idx of indices) {
    const e = cache[idx];
    const articlePage: number | undefined = e?._pages?.[0];
    if (!articlePage) { console.log(`  ex ${idx}: no article page in cache`); continue; }
    if (i++ > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    try {
      const img = await upscale(await extractPageImagePng(pdf, articlePage), scale);
      const art = await extractArticleVerbatim(img.toString("base64"));
      const coh = checkCoherence(art.article);
      const before = checkCoherence(e.article);
      cache[idx] = {
        ...e,
        article: art.article,
        title: e.title ?? art.title,
        _article_source: `verbatim@${scale}x`,
        _article_illegible: art.illegible_count,
        _article_review: !coh.ok,
        _article_issues: coh.issues,
      };
      await writeFile(exFile, JSON.stringify(cache, null, 2));
      console.log(`  ex ${idx} (p${articlePage}): len ${e.article?.length ?? 0}→${art.article.length}, coherence ${before.score.toFixed(2)}→${coh.score.toFixed(2)} ${coh.ok ? "OK" : "STILL-FLAG: " + coh.issues.join(",")}${art.illegible_count ? ` illegible=${art.illegible_count}` : ""}`);
    } catch (err) {
      console.error(`  ex ${idx}: ERROR ${String(err).slice(0, 140)}`);
    }
  }
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });

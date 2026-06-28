/**
 * reextract-t2.ts — targeted re-extraction of specific flagged exercises.
 *
 * Re-runs Gemini for the given exercise indices using UPSCALED page images and
 * the strengthened anti-glitch prompt, then updates the exercises cache in place.
 * Used after the review gate flags glitchy/empty/no-title exercises.
 *
 * Usage: tsx scripts/reextract-t2.ts <pdf> <outName> <idx1,idx2,...>
 */
import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import sharp from "sharp";
import { extractPageImagePng, extractT2Exercise } from "../src/lib/import/gemini-vision.js";

const CACHE_DIR = "scripts/.extract-cache";
const DELAY_MS = parseInt(process.env.GEMINI_DELAY_MS ?? "8000"); // gentler to respect limits

async function upscale(buf: Buffer, factor = 2): Promise<Buffer> {
  const m = await sharp(buf).metadata();
  return sharp(buf).resize({ width: Math.round((m.width ?? 1200) * factor) }).png().toBuffer();
}

async function main() {
  const pdf = process.argv[2];
  const outName = process.argv[3];
  const indices = (process.argv[4] ?? "").split(",").map((s) => parseInt(s.trim())).filter(Boolean);
  if (!pdf || !outName || !indices.length) { console.error("usage: reextract-t2.ts <pdf> <outName> <idx,idx,...>"); process.exit(1); }

  const exFile = path.join(CACHE_DIR, `${outName}.exercises.json`);
  const exCache: Record<string, any> = JSON.parse(await readFile(exFile, "utf8"));

  let i = 0;
  for (const idx of indices) {
    const ex = exCache[idx];
    const pages: number[] = ex?._pages ?? [];
    if (!pages.length) { console.log(`  ex ${idx}: no _pages in cache, skipping`); continue; }
    if (i++ > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    try {
      const imgs: string[] = [];
      for (const p of pages) imgs.push((await upscale(await extractPageImagePng(pdf, p))).toString("base64"));
      const re = await extractT2Exercise(imgs, "These images were upscaled for clarity. Produce clean, glitch-free verbatim text.");
      exCache[idx] = { ...re, _pages: pages, _reextracted: true };
      console.log(`  ex ${idx} (p${pages.join(",")}): title=${JSON.stringify(re.title)} ${re.questions?.length ?? 0}q KEY${re.answer_key?.length ?? 0}`);
      await writeFile(exFile, JSON.stringify(exCache, null, 2));
    } catch (e) {
      console.error(`  ex ${idx}: ERROR ${String(e).slice(0, 140)}`);
    }
  }
  console.log("Done re-extracting.");
}
main().catch((e) => { console.error(e); process.exit(1); });

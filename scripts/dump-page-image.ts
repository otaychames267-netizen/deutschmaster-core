/** Dump specific PDF pages to PNG files for visual inspection. Read-only. */
import "dotenv/config";
import { writeFile, mkdir } from "fs/promises";
import { extractPageImagePng } from "../src/lib/import/gemini-vision.js";

async function main() {
  const pdf = process.argv[2];
  const pages = (process.argv[3] ?? "1").split(",").map((n) => parseInt(n));
  await mkdir("scripts/.page-dumps", { recursive: true });
  for (const p of pages) {
    const png = await extractPageImagePng(pdf, p);
    const out = `scripts/.page-dumps/page_${p}.png`;
    await writeFile(out, png);
    console.log(`wrote ${out} (${png.length} bytes)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

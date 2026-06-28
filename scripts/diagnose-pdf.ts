/**
 * Diagnostic tool — dumps raw pdfjs extraction for a single PDF.
 * Usage: npx tsx scripts/diagnose-pdf.ts <path-to.pdf> [--pages 1-5]
 */

import { readFile } from "fs/promises";
import { basename } from "path";

const args = process.argv.slice(2);
const pdfPath = args[0];
const pagesArg = args[1] === "--pages" ? args[2] : null;

if (!pdfPath) {
  console.error("Usage: npx tsx scripts/diagnose-pdf.ts <path-to.pdf> [--pages 1-5]");
  process.exit(1);
}

// ── Load pdfjs legacy build ───────────────────────────────────────────────────
const legacyPath = "pdfjs-dist/legacy" + "/build/pdf.mjs";
const lib = await import(/* @vite-ignore */ legacyPath) as any;
try {
  const { createRequire } = await import("module" as string);
  const req = createRequire(import.meta.url);
  const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  lib.GlobalWorkerOptions.workerSrc = wp.startsWith("file://") ? wp : `file:///${wp.replace(/\\/g, "/")}`;
} catch { lib.GlobalWorkerOptions.workerSrc = ""; }

// ── Load PDF ──────────────────────────────────────────────────────────────────
const bytes = await readFile(pdfPath);
const uint8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const loadingTask = lib.getDocument({ data: uint8, verbosity: 0 });
const doc = await loadingTask.promise;

// ── Page range ────────────────────────────────────────────────────────────────
let fromPage = 1;
let toPage   = Math.min(doc.numPages, 10); // default: first 10 pages
if (pagesArg) {
  const [a, b] = pagesArg.split("-").map(Number);
  fromPage = a || 1;
  toPage   = b || a || fromPage;
}

console.log(`\nFile:  ${basename(pdfPath)}`);
console.log(`Pages: ${doc.numPages} total | Showing pages ${fromPage}–${toPage}`);
console.log("=".repeat(70));

let totalItemsInRange = 0;

for (let p = fromPage; p <= Math.min(toPage, doc.numPages); p++) {
  const page    = await doc.getPage(p);
  const vp      = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items   = content.items as any[];
  totalItemsInRange += items.length;

  console.log(`\n── PAGE ${p} (${items.length} items, ${Math.round(vp.width)}×${Math.round(vp.height)}) ──`);

  if (items.length === 0) {
    console.log("  [image-only — no text]");
    continue;
  }

  // Group into pseudo-lines by y-coordinate
  const byY = new Map<number, string[]>();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push(it.str);
  }

  const sortedY = [...byY.keys()].sort((a, b) => b - a); // top-to-bottom
  for (const y of sortedY) {
    const line = byY.get(y)!.join("").trim();
    if (line.length > 0) console.log(`  [y=${y}] ${line.slice(0, 120)}`);
  }
}

console.log(`\nTotal text items in shown pages: ${totalItemsInRange}`);
process.exit(0);

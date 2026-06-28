/**
 * Probe a PDF: does it have a real embedded text layer, or is it scanned images?
 * Read-only. No DB. Prints per-page text-item counts + a sample of extracted text.
 */
import { readFile } from "fs/promises";

async function probe(pdfPath: string, sampleN = 4) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  const bytes = await readFile(pdfPath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const total = pdf.numPages;
  const XOBJ = pdfjs.OPS?.paintImageXObject ?? 85;

  console.log(`\n══════════════════════════════════════════════`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Pages: ${total}`);

  let pagesWithText = 0, pagesWithImage = 0, totalTextItems = 0;

  for (let p = 1; p <= total; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items as any[];
    const textLen = items.reduce((s, it) => s + (it.str?.length ?? 0), 0);

    const opList = await page.getOperatorList();
    let imageCount = 0;
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === XOBJ) imageCount++;
    }

    if (items.length > 5) pagesWithText++;
    if (imageCount > 0) pagesWithImage++;
    totalTextItems += items.length;

    if (p <= sampleN) {
      const sample = items.map((it) => it.str).join(" ").replace(/\s+/g, " ").slice(0, 300);
      console.log(`\n  --- page ${p}: ${items.length} text items (${textLen} chars), ${imageCount} images ---`);
      console.log(`  "${sample}"`);
    }
  }

  console.log(`\n  SUMMARY: ${pagesWithText}/${total} pages have a text layer; ${pagesWithImage}/${total} pages have images.`);
  console.log(`  Total text items: ${totalTextItems}`);
  console.log(`  → VERDICT: ${pagesWithText >= total * 0.5 ? "HAS REAL TEXT LAYER (no OCR needed)" : "SCANNED / IMAGE-BASED (OCR required)"}`);
}

async function main() {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error("usage: probe-pdf-textlayer.ts <pdf> [pdf...]");
    process.exit(1);
  }
  for (const p of paths) await probe(p);
}

main().catch((e) => { console.error(e); process.exit(1); });

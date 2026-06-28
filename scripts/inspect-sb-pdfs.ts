/**
 * Inspect Sprachbausteine PDFs — determine if digital or scanned,
 * extract first 3 pages of text from each.
 */
import { readFile, writeFile } from "fs/promises";

const PDFS = [
  "C:\\Users\\asus\\Desktop\\Telc PDFS spachbausteine\\Sprach 1 mit antwort final 2025-2.pdf",
  "C:\\Users\\asus\\Desktop\\Telc PDFS spachbausteine\\sprachbausteine teil 2.pdf",
];

async function inspectPdf(pdfPath: string) {
  const pdfjsMod = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  try {
    const { createRequire } = await import("module" as string);
    const req = createRequire(import.meta.url);
    const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\").join("/");
  } catch { /* noop */ }

  const bytes = await readFile(pdfPath);
  const pdf = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const name = pdfPath.split("\\").pop()!;
  console.log(`\n=== ${name} ===`);
  console.log(`Pages: ${pdf.numPages}`);

  let totalTextChars = 0;
  let totalImageOps = 0;
  const XOBJ = pdfjsMod.OPS?.paintImageXObject ?? 85;

  for (let pageNum = 1; pageNum <= Math.min(5, pdf.numPages); pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Try digital text extraction
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((i: any) => i.str ?? "").join(" ").trim();
    totalTextChars += pageText.length;

    // Check for image ops
    const opList = await page.getOperatorList();
    const imageOps = opList.fnArray.filter((f: number) => f === XOBJ).length;
    totalImageOps += imageOps;

    if (pageNum <= 3) {
      console.log(`\n--- Page ${pageNum} --- (text chars: ${pageText.length}, imageOps: ${imageOps})`);
      console.log(pageText.slice(0, 500) || "(no text)");
    }
  }

  console.log(`\nSummary (first 5 pages): totalTextChars=${totalTextChars}, totalImageOps=${totalImageOps}`);
  const isDigital = totalTextChars > 200 && totalTextChars > totalImageOps * 10;
  console.log(`Likely: ${isDigital ? "DIGITAL (text-based)" : "SCANNED (image-based)"}`);
}

async function main() {
  for (const pdf of PDFS) {
    await inspectPdf(pdf);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

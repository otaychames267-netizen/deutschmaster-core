/**
 * Debug T1 parser — OCRs first 20 pages of T1 PDF, runs parser, dumps diagnostics.
 */
import { readFile, writeFile } from "fs/promises";
import { createCanvas } from "canvas";
import { createWorker } from "tesseract.js";
import { parseLesenT1 } from "../src/lib/import/lesen-t1-parser";

const PDF_PATH = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 1.pdf";
const MAX_PAGES = 20;

async function ocrPages(maxPages: number) {
  const pdfjsMod = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  try {
    const { createRequire } = await import("module" as string);
    const req = createRequire(import.meta.url);
    const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\").join("/");
  } catch { /* noop */ }

  const bytes = await readFile(PDF_PATH);
  const pdf   = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const XOBJ  = pdfjsMod.OPS?.paintImageXObject ?? 85;
  const pages  = Math.min(maxPages, pdf.numPages);

  console.log(`PDF has ${pdf.numPages} pages — OCRing first ${pages}`);
  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });

  const allLines: string[] = [];

  for (let i = 1; i <= pages; i++) {
    process.stdout.write(`  Page ${i}/${pages}...\r`);
    const page   = await pdf.getPage(i);
    const opList = await page.getOperatorList();

    const xobjKeys: string[] = [];
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === XOBJ && opList.argsArray[j]?.[0]) {
        const k = opList.argsArray[j][0];
        if (!xobjKeys.includes(k)) xobjKeys.push(k);
      }
    }

    let bestImg: any = null;
    for (const key of xobjKeys) {
      const imgData: any = await new Promise((resolve) => {
        page.objs.get(key, resolve);
        setTimeout(() => resolve(null), 5000);
      });
      if (imgData?.data && imgData.width && imgData.height) {
        if (!bestImg || imgData.width * imgData.height > bestImg.width * bestImg.height) {
          bestImg = imgData;
        }
      }
    }

    if (!bestImg) { allLines.push(`--- PAGE ${i} (no image) ---`); continue; }

    const nPixels  = bestImg.width * bestImg.height;
    const channels = Math.round(bestImg.data.length / nPixels);
    const rgba     = new Uint8ClampedArray(nPixels * 4);

    if (channels === 4) {
      rgba.set(bestImg.data);
    } else if (channels === 3) {
      for (let k = 0; k < nPixels; k++) {
        rgba[k*4] = bestImg.data[k*3]; rgba[k*4+1] = bestImg.data[k*3+1];
        rgba[k*4+2] = bestImg.data[k*3+2]; rgba[k*4+3] = 255;
      }
    } else {
      for (let k = 0; k < nPixels; k++) {
        rgba[k*4] = rgba[k*4+1] = rgba[k*4+2] = bestImg.data[k]; rgba[k*4+3] = 255;
      }
    }

    const srcCanvas = createCanvas(bestImg.width, bestImg.height);
    const srcCtx    = srcCanvas.getContext("2d") as any;
    const id        = srcCtx.createImageData(bestImg.width, bestImg.height);
    id.data.set(rgba);
    srcCtx.putImageData(id, 0, 0);
    const dstCanvas = createCanvas(bestImg.width * 2, bestImg.height * 2);
    (dstCanvas.getContext("2d") as any).drawImage(srcCanvas, 0, 0, bestImg.width * 2, bestImg.height * 2);
    const pngBuf = dstCanvas.toBuffer("image/png");

    const result = await worker.recognize(pngBuf);
    const lines  = result.data.text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    allLines.push(`--- PAGE ${i} ---`);
    allLines.push(...lines);
  }

  await worker.terminate();
  return allLines;
}

async function main() {
  console.log(`\nDebugging T1 parser — first ${MAX_PAGES} pages\n`);

  const lines = await ocrPages(MAX_PAGES);

  // Save raw OCR output
  await writeFile("scripts/t1-ocr-dump.txt", lines.join("\n"), "utf8");
  console.log(`\nSaved ${lines.length} OCR lines to scripts/t1-ocr-dump.txt`);

  // Run parser
  const result = parseLesenT1(lines);

  console.log(`\n=== Parser result ===`);
  console.log(`Headlines: ${result.headlines.length}`);
  result.headlines.forEach(h => console.log(`  [${h.letter}] ${h.text.slice(0, 80)}`));
  console.log(`\nTexts: ${result.texts.length}`);
  result.texts.forEach(t => console.log(`  [${t.position}] title="${t.title}" content_len=${t.content.length}`));
  console.log(`\nDetection strategy: ${result.detectionStrategy}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Warnings: ${result.warnings.join("; ")}`);

  // Show first 5 lines that START with a number (1-5) to understand text markers
  console.log(`\n=== Lines starting with 1-5 (first 20 matches) ===`);
  let count = 0;
  for (const l of lines) {
    if (/^[1-5][\s.):]/.test(l) && count < 20) {
      console.log(`  "${l.slice(0, 100)}"`);
      count++;
    }
  }

  // Show first 20 lines starting with a-j or A-J
  console.log(`\n=== Lines starting with a-j or A-J (first 20 matches) ===`);
  count = 0;
  for (const l of lines) {
    if (/^[a-jA-J][).\s]/.test(l) && count < 20) {
      console.log(`  "${l.slice(0, 100)}"`);
      count++;
    }
  }

  console.log("\nDone.");
}

main().catch(e => { console.error(e); process.exit(1); });

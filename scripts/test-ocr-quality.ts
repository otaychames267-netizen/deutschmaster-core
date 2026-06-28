/**
 * Quick OCR quality test — reads first 3 pages of lesen teil 1.pdf
 * and prints extracted text to verify OCR is working correctly.
 */
import { readFile } from "fs/promises";
import { createCanvas } from "canvas";
import { createWorker } from "tesseract.js";

const PDF_PATH = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 1.pdf";
const PAGES    = 3; // test first 3 pages only

async function main() {
  console.log("Testing OCR quality on first", PAGES, "pages of lesen teil 1.pdf...\n");

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

  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });

  for (let i = 1; i <= Math.min(PAGES, pdf.numPages); i++) {
    console.log(`\n=== Page ${i} ===`);
    const page   = await pdf.getPage(i);
    const opList = await page.getOperatorList();

    // Collect all XObjects
    const xobjKeys: string[] = [];
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === XOBJ && opList.argsArray[j]?.[0]) {
        const k = opList.argsArray[j][0];
        if (!xobjKeys.includes(k)) xobjKeys.push(k);
      }
    }

    console.log(`  Found ${xobjKeys.length} XObjects: ${xobjKeys.join(", ")}`);

    // Find largest image
    let bestImg: any = null;
    for (const key of xobjKeys) {
      const imgData: any = await new Promise((resolve) => {
        page.objs.get(key, resolve);
        setTimeout(() => resolve(null), 5000);
      });
      if (imgData?.data && imgData.width && imgData.height) {
        const pixels = imgData.width * imgData.height;
        const channels = Math.round(imgData.data.length / pixels);
        console.log(`  ${key}: ${imgData.width}×${imgData.height} px, ${channels}-channel, ${Math.round(imgData.data.length/1024)}KB`);
        if (!bestImg || pixels > bestImg.width * bestImg.height) bestImg = imgData;
      }
    }

    if (!bestImg) { console.log("  No image found — skipping"); continue; }

    const nPixels  = bestImg.width * bestImg.height;
    const channels = Math.round(bestImg.data.length / nPixels);
    const rgba     = new Uint8ClampedArray(nPixels * 4);

    if (channels === 4) {
      rgba.set(bestImg.data);
    } else if (channels === 3) {
      for (let k = 0; k < nPixels; k++) {
        rgba[k*4]   = bestImg.data[k*3];
        rgba[k*4+1] = bestImg.data[k*3+1];
        rgba[k*4+2] = bestImg.data[k*3+2];
        rgba[k*4+3] = 255;
      }
    } else {
      for (let k = 0; k < nPixels; k++) {
        rgba[k*4] = rgba[k*4+1] = rgba[k*4+2] = bestImg.data[k];
        rgba[k*4+3] = 255;
      }
    }

    // 2× scale
    const srcCanvas = createCanvas(bestImg.width, bestImg.height);
    const srcCtx    = srcCanvas.getContext("2d") as any;
    const id        = srcCtx.createImageData(bestImg.width, bestImg.height);
    id.data.set(rgba);
    srcCtx.putImageData(id, 0, 0);

    const dstCanvas = createCanvas(bestImg.width * 2, bestImg.height * 2);
    const dstCtx    = dstCanvas.getContext("2d") as any;
    dstCtx.drawImage(srcCanvas, 0, 0, bestImg.width * 2, bestImg.height * 2);
    const pngBuf    = dstCanvas.toBuffer("image/png");

    console.log(`  OCR input: ${Math.round(pngBuf.length/1024)}KB PNG`);
    const result = await worker.recognize(pngBuf);
    const lines  = result.data.text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 3);
    console.log(`  OCR output (${lines.length} lines):`);
    lines.slice(0, 10).forEach((l: string) => console.log(`    "${l}"`));
    if (lines.length > 10) console.log(`    ... ${lines.length - 10} more lines`);
  }

  await worker.terminate();
  console.log("\nDone.");
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * OCR pages 1-6 of each Sprachbausteine PDF to understand structure.
 */
import { readFile, writeFile } from "fs/promises";
import { createCanvas } from "canvas";
import { createWorker } from "tesseract.js";

const PDFS = [
  { path: "C:\\Users\\asus\\Desktop\\Telc PDFS spachbausteine\\Sprach 1 mit antwort final 2025-2.pdf", label: "t1" },
  { path: "C:\\Users\\asus\\Desktop\\Telc PDFS spachbausteine\\sprachbausteine teil 2.pdf", label: "t2" },
];
const PREVIEW_PAGES = 6;

async function ocrPages(pdfPath: string, maxPages: number): Promise<string> {
  const pdfjsMod = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  try {
    const { createRequire } = await import("module" as string);
    const req = createRequire(import.meta.url);
    const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\").join("/");
  } catch { /* noop */ }

  const bytes = await readFile(pdfPath);
  const pdf = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const total = Math.min(maxPages, pdf.numPages);
  const XOBJ = pdfjsMod.OPS?.paintImageXObject ?? 85;

  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });
  let out = "";

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum);
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
        if (!bestImg || imgData.width * imgData.height > bestImg.width * bestImg.height) bestImg = imgData;
      }
    }

    out += `\n--- PAGE ${pageNum} ---\n`;
    if (bestImg) {
      const nPixels = bestImg.width * bestImg.height;
      const channels = Math.round(bestImg.data.length / nPixels);
      const rgba = new Uint8ClampedArray(nPixels * 4);
      if (channels === 4) { rgba.set(bestImg.data); }
      else if (channels === 3) {
        for (let k = 0; k < nPixels; k++) {
          rgba[k*4] = bestImg.data[k*3]; rgba[k*4+1] = bestImg.data[k*3+1];
          rgba[k*4+2] = bestImg.data[k*3+2]; rgba[k*4+3] = 255;
        }
      } else {
        for (let k = 0; k < nPixels; k++) {
          rgba[k*4] = rgba[k*4+1] = rgba[k*4+2] = bestImg.data[k]; rgba[k*4+3] = 255;
        }
      }
      const src = createCanvas(bestImg.width, bestImg.height);
      const srcCtx = src.getContext("2d") as any;
      const id = srcCtx.createImageData(bestImg.width, bestImg.height);
      id.data.set(rgba); srcCtx.putImageData(id, 0, 0);
      const dst = createCanvas(bestImg.width * 2, bestImg.height * 2);
      (dst.getContext("2d") as any).drawImage(src, 0, 0, bestImg.width * 2, bestImg.height * 2);
      const result = await worker.recognize(dst.toBuffer("image/png"));
      out += result.data.text + "\n";
    } else {
      out += "(no image found on page)\n";
    }
  }

  await worker.terminate();
  return out;
}

async function main() {
  for (const { path, label } of PDFS) {
    console.log(`OCR-ing first ${PREVIEW_PAGES} pages of ${label}...`);
    const text = await ocrPages(path, PREVIEW_PAGES);
    const outPath = `scripts/sb-${label}-preview.txt`;
    await writeFile(outPath, text, "utf8");
    console.log(`Saved to ${outPath}`);
    console.log("=== First 2000 chars ===");
    console.log(text.slice(0, 2000));
    console.log("=== End preview ===\n");
  }
}

main().catch(e => { console.error(e); process.exit(1); });

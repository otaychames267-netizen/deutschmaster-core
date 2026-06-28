const fs = require('fs');
let c = fs.readFileSync('scripts/import-all-pdfs.ts', 'utf8');

// Find the OCR function
const start = c.indexOf('// ── OCR a scanned PDF via pdfjs-dist + node-canvas + tesseract.js ───────────');
const end = c.indexOf('\n\n// ── Existing counts', start);

console.log('start:', start, 'end:', end);

const newFn = `// ── OCR a scanned PDF via pdfjs-dist + node-canvas + tesseract.js ───────────
// Uses page.objs.get() to extract raw XObject image data without canvas rendering
async function ocrPdfToNormalizedDoc(filePath: string): Promise<any> {
  const pdfjsMod = await import(/* @vite-ignore */ "pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  try {
    const { createRequire } = await import("module" as string);
    const req = createRequire(import.meta.url);
    const wp: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\\\").join("/");
  } catch { /* noop */ }

  const bytes = await readFile(filePath);
  const pdf   = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const total: number = pdf.numPages;
  log(\`  OCR: \${total} pages to process\`);

  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });
  const ocrPages: any[] = [];

  for (let i = 1; i <= total; i++) {
    if (i % 5 === 0 || i === total) log(\`  OCR page \${i}/\${total}\`);
    const page = await pdf.getPage(i);

    let pngBuf: Buffer | null = null;

    try {
      // Step 1: get operator list (this triggers image XObject loading into page.objs)
      const opList = await page.getOperatorList();

      // Step 2: find the first paintImageXObject or paintInlineImageXObject operation
      const XOBJ = pdfjsMod.OPS?.paintImageXObject ?? 85;
      const INLINE = pdfjsMod.OPS?.paintInlineImageXObject ?? 86;

      for (let j = 0; j < opList.fnArray.length && !pngBuf; j++) {
        const fn   = opList.fnArray[j];
        const args = opList.argsArray[j];

        if (fn === XOBJ && args?.[0]) {
          // XObject: image data is in page.objs keyed by name
          const imgKey = args[0];
          const imgData: any = await new Promise((resolve, reject) => {
            page.objs.get(imgKey, resolve);
            setTimeout(() => reject(new Error("timeout")), 10000);
          });

          if (imgData?.data && imgData.width && imgData.height) {
            const c   = createCanvas(imgData.width, imgData.height);
            const ctx = c.getContext("2d") as any;
            const id  = ctx.createImageData(imgData.width, imgData.height);
            id.data.set(imgData.data);
            ctx.putImageData(id, 0, 0);
            pngBuf = c.toBuffer("image/png");
          }
        } else if (fn === INLINE && args?.[0]) {
          // Inline image: data is directly in args
          const imgData = args[0];
          if (imgData?.data && imgData.width && imgData.height) {
            const c   = createCanvas(imgData.width, imgData.height);
            const ctx = c.getContext("2d") as any;
            const id  = ctx.createImageData(imgData.width, imgData.height);
            id.data.set(imgData.data);
            ctx.putImageData(id, 0, 0);
            pngBuf = c.toBuffer("image/png");
          }
        }
      }
    } catch (e: any) {
      warn(\`  Page \${i} extraction failed: \${e?.message}\`);
    }

    const text = pngBuf
      ? (await worker.recognize(pngBuf)).data.text
      : "";

    const rawLines = text.split("\\n");
    const lines = rawLines
      .filter((l: string) => l.trim().length > 0)
      .map((l: string, j: number) => ({
        text: l.trim(), x: 50, y: j * 16, pageNum: i,
        bold: false, italic: false, fontSize: 12,
        hasBoldWord: false, color: null, hasGreenWord: false, isGreen: false,
      }));

    ocrPages.push({
      pageNum: i, lines, rawText: text,
      rawItemCount: rawLines.length,
      textItemCount: lines.length,
      emptyItemCount: rawLines.length - lines.length,
      isImageOnly: true, extractionMode: "plain", sampleItems: [],
    });
  }

  await worker.terminate();

  const allLines = mergeRichLines(ocrPages as any);
  const report: any = {
    totalPages: total,
    totalRawItems: ocrPages.reduce((s: number, p: any) => s + p.rawItemCount, 0),
    totalTextItems: ocrPages.reduce((s: number, p: any) => s + p.textItemCount, 0),
    totalLines: allLines.length,
    imagePagesCount: total,
    likelyScanned: true,
    likelyImageBased: true,
    pages: ocrPages.map((p: any) => ({
      pageNum: p.pageNum, rawItemCount: p.rawItemCount,
      textItemCount: p.textItemCount, lineCount: p.lines.length,
      isImageOnly: true, extractionMode: "plain", sampleItems: [],
    })),
  };

  return buildNormalizedDocument(allLines, report);
}`;

c = c.slice(0, start) + newFn + c.slice(end);
fs.writeFileSync('scripts/import-all-pdfs.ts', c, 'utf8');
console.log('Done, length:', c.length);

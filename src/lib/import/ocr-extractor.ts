/**
 * ocr-extractor.ts — Browser-side OCR pipeline for scanned PDFs.
 *
 * When Stage 1 detects a scanned PDF (all pages image-only), the normal
 * getTextContent() returns nothing.  This module renders each PDF page to
 * an HTML5 canvas at 3× scale and runs Tesseract.js OCR (German + English)
 * to produce RichLine[] that feeds into the existing section parsers.
 *
 * Result quality limitations vs. text-based extraction:
 *   • No bold/italic detection (all lines: bold=false)
 *   • No color/green detection (color=null, isGreen=false)
 *   • Positions are approximate (word-level bounding boxes from Tesseract)
 *   • OCR errors possible on low-quality scans
 *
 * These limitations mean answer detection for T2 (green checkmarks) will
 * not work automatically — the admin must set answers manually in the UI.
 *
 * This module is intentionally browser-only.  The Node.js test harness
 * reports scanned PDFs as "requires browser OCR" and skips them.
 */

import type { RichLine, PdfPage } from "./pdf-extractor";

// ── Progress callback ─────────────────────────────────────────────────────────

export type OcrProgressCallback = (page: number, total: number, status: string) => void;

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Extract text from a scanned PDF using OCR.
 *
 * Returns PdfPage[] with the same shape as extractPdfPages() so the rest
 * of the pipeline is unchanged.
 *
 * @param pdfDoc     - An already-opened pdfjs PDFDocumentProxy
 * @param onProgress - Optional progress callback (page, total, statusText)
 */
export async function ocrPdfDocument(
  pdfDoc: { numPages: number; getPage(n: number): Promise<unknown> },
  onProgress?: OcrProgressCallback,
): Promise<PdfPage[]> {
  // Lazy-import Tesseract to avoid bundling it when not needed
  const { createWorker } = await import("tesseract.js");

  // Create one worker with German + English (reuse across pages for speed)
  const worker = await createWorker(["deu", "eng"], 1, {
    logger: () => {},  // suppress verbose logging
  });

  const pages: PdfPage[] = [];

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    onProgress?.(p, pdfDoc.numPages, `OCR page ${p}/${pdfDoc.numPages}…`);

    try {
      const page    = await pdfDoc.getPage(p) as any;
      const canvas  = await renderPageToCanvas(page, 3);          // 3× scale for OCR quality
      const lines   = await ocrCanvasToLines(worker, canvas, p);

      pages.push({
        pageNum:       p,
        lines,
        rawText:       lines.map(l => l.text).join("\n"),
        rawItemCount:  lines.length,
        textItemCount: lines.length,
        emptyItemCount: 0,
        isImageOnly:   false,          // OCR produced text, so no longer "image-only"
        extractionMode: "plain" as const,
        sampleItems:   lines.slice(0, 5).map(l => ({
          str: l.text, fontName: "ocr", fontSize: l.fontSize,
        })),
      });
    } catch (err) {
      console.warn(`OCR failed on page ${p}:`, err);
      pages.push({
        pageNum: p,
        lines: [],
        rawText: "",
        rawItemCount: 0,
        textItemCount: 0,
        emptyItemCount: 0,
        isImageOnly: true,
        extractionMode: "none" as const,
        sampleItems: [],
      });
    }
  }

  await worker.terminate();
  return pages;
}

// ── Page rendering ────────────────────────────────────────────────────────────

async function renderPageToCanvas(pdfPage: any, scale: number): Promise<HTMLCanvasElement> {
  const viewport = pdfPage.getViewport({ scale });
  const canvas   = document.createElement("canvas");
  canvas.width   = Math.floor(viewport.width);
  canvas.height  = Math.floor(viewport.height);
  const ctx      = canvas.getContext("2d")!;

  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// ── OCR → RichLine[] ─────────────────────────────────────────────────────────

async function ocrCanvasToLines(
  worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>>,
  canvas: HTMLCanvasElement,
  pageNum: number,
): Promise<RichLine[]> {
  const { data } = await worker.recognize(canvas);

  // Tesseract returns word-level results with bounding boxes (pixel coords)
  // Group words into lines using their paragraph/line structure from Tesseract
  const richLines: RichLine[] = [];

  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        const lineText = line.words
          .map((w: any) => w.text)
          .join(" ")
          .trim();

        if (!lineText || lineText.length < 2) continue;

        // Bounding box in canvas pixels — convert back to approximate PDF points
        const scale   = 3;   // must match renderPageToCanvas scale
        const x       = (line.bbox?.x0 ?? 0) / scale;
        const y       = (line.bbox?.y0 ?? 0) / scale;
        const h       = ((line.bbox?.y1 ?? 0) - (line.bbox?.y0 ?? 0)) / scale;

        // Confidence < 40 → likely noise, skip
        const conf = line.confidence ?? 100;
        if (conf < 40) continue;

        richLines.push({
          text:        lineText,
          x,
          y,
          pageNum,
          bold:        false,
          italic:      false,
          fontSize:    Math.round(h * 0.9) || 10,
          hasBoldWord: false,
          color:       null,
          isGreen:     false,
          hasGreenWord: false,
        });
      }
    }
  }

  return richLines;
}

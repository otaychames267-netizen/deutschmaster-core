/**
 * PDF text extraction using pdfjs-dist.
 *
 * Returns pages of rich lines (text + style + color) so parsers can detect
 * bold, italic, font size, and — crucially — green-highlighted answers in
 * official TELC solved-exercise copies.
 *
 * Color extraction strategy
 * ─────────────────────────
 * getTextContent() never exposes color.  Instead we call getOperatorList()
 * which replays the full PDF rendering stream.  We track the "current fill
 * color" state as we process each operator, and every time we see a text-show
 * operator (Tj / TJ / ' / ") we record the active color at the current text
 * matrix position.  Those positions are then matched against the items from
 * getTextContent() using a small tolerance bucket.
 *
 * Key pdfjs operator codes (stable across pdfjs v3–v5):
 *   36  moveText          Td
 *   37  setLeadingMoveText TD
 *   38  setTextMatrix     Tm / Tlm
 *   45  showText          Tj
 *   46  showSpacedText    TJ
 *   47  nextLineShowText  '
 *   48  nextLineSetSpacingShowText "
 *   76  setFillColor      sc
 *   77  setFillColorN     scn
 *   80  setFillRGBColor   rg
 *   83  setFillGray       g
 *   87  setFillCMYK       k
 */

let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      if (typeof window !== "undefined") {
        // Browser: standard build + CDN worker
        const lib = await import("pdfjs-dist");
        lib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`;
        return lib;
      } else {
        // Node.js: legacy build includes DOMMatrix / canvas polyfills required in Node
        // String split prevents Vite from treating this as a static Node-only import.
        const legacyPath = "pdfjs-dist/legacy" + "/build/pdf.mjs";
        const lib = await import(/* @vite-ignore */ legacyPath) as unknown as typeof import("pdfjs-dist");
        try {
          const { createRequire } = await import(("module") as string);
          const req = createRequire(import.meta.url);
          const workerPath: string = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
          lib.GlobalWorkerOptions.workerSrc =
            workerPath.startsWith("file://")
              ? workerPath
              : `file:///${workerPath.replace(/\\/g, "/")}`;
        } catch {
          lib.GlobalWorkerOptions.workerSrc = "";
        }
        return lib;
      }
    })();
  }
  return pdfjsLibPromise!;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface RichItem {
  str: string;
  x: number;
  y: number;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  fontName: string;
  /** RGB 0-1, null when color extraction failed or text is black */
  color: { r: number; g: number; b: number } | null;
  /** True when this item's fill color is recognisably green */
  isGreen: boolean;
}

export interface RichLine {
  text: string;
  x: number;
  y: number;
  /** 1-based PDF page number this line was extracted from */
  pageNum: number;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  /** Any word on this line is bold */
  hasBoldWord: boolean;
  /** Line-level fill color (dominant item's color, null = black/unknown) */
  color: { r: number; g: number; b: number } | null;
  /** ANY item on this line is green — reliable answer-highlight indicator */
  hasGreenWord: boolean;
  /** The dominant item on this line is green */
  isGreen: boolean;
}

export interface PdfPage {
  pageNum: number;
  lines: RichLine[];
  rawText: string;
  rawItemCount: number;
  textItemCount: number;
  emptyItemCount: number;
  isImageOnly: boolean;
  extractionMode: "marked-content" | "plain" | "none";
  sampleItems: Array<{ str: string; fontName: string; fontSize: number }>;
}

export interface PdfExtractionReport {
  totalPages: number;
  totalRawItems: number;
  totalTextItems: number;
  totalLines: number;
  imagePagesCount: number;
  likelyScanned: boolean;
  likelyImageBased: boolean;
  pages: Array<{
    pageNum: number;
    rawItemCount: number;
    textItemCount: number;
    lineCount: number;
    isImageOnly: boolean;
    extractionMode: string;
    sampleItems: Array<{ str: string; fontName: string; fontSize: number }>;
  }>;
}

// Legacy compat
export type TextLine = RichLine;

// ── Color extraction helpers ──────────────────────────────────────────────────

function colorBucket(x: number, y: number): string {
  // 4px tolerance — handles floating-point jitter between the two APIs
  return `${Math.round(x / 4) * 4},${Math.round(y / 4) * 4}`;
}

function isGreenColor(r: number, g: number, b: number): boolean {
  // Green in TELC solved PDFs is typically (0, 0.5–0.8, 0) or similar.
  // Threshold: g is the dominant channel, r and b are both low.
  return g > 0.35 && r < g * 0.7 && b < g * 0.7;
}

/**
 * Build a map from position-bucket → fill color by replaying the page's
 * operator list.  Returns an empty map if getOperatorList() is unavailable
 * or throws (e.g., encrypted page, pdfjs version quirk).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildColorMap(
  page: any,
  pageHeight: number,
): Promise<Map<string, { r: number; g: number; b: number }>> {
  const map = new Map<string, { r: number; g: number; b: number }>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops = await (page as any).getOperatorList();
    const fn: number[]  = ops.fnArray;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any[][] = ops.argsArray;

    let fillR = 0, fillG = 0, fillB = 0;   // current fill color (default black)
    let textX = 0, textY = 0;               // current text position in PDF coords
    let lineX = 0, lineY = 0;               // line position tracking for Td/TD

    for (let i = 0; i < fn.length; i++) {
      const f = fn[i];
      const a = args[i] as number[];

      switch (f) {
        // ── Color operators ──────────────────────────────────────────────
        case 80: // setFillRGBColor — rg R G B
          if (a.length >= 3) { fillR = a[0]; fillG = a[1]; fillB = a[2]; }
          break;
        case 83: // setFillGray — g gray
          if (a.length >= 1) { fillR = fillG = fillB = a[0]; }
          break;
        case 87: // setFillCMYK — k C M Y K
          if (a.length >= 4) {
            const k = a[3];
            fillR = (1 - a[0]) * (1 - k);
            fillG = (1 - a[1]) * (1 - k);
            fillB = (1 - a[2]) * (1 - k);
          }
          break;
        case 76: // setFillColor — sc (for DeviceRGB space)
          if (a.length >= 3) { fillR = a[0]; fillG = a[1]; fillB = a[2]; }
          break;
        case 77: // setFillColorN — scn (for any color space)
          if (a.length >= 3 && typeof a[0] === "number") { fillR = a[0]; fillG = a[1]; fillB = a[2]; }
          break;

        // ── Text matrix operators ────────────────────────────────────────
        case 38: // setTextMatrix — Tm a b c d e f (absolute position)
          if (a.length >= 6) {
            textX = a[4]; textY = a[5];
            lineX = textX; lineY = textY;
          }
          break;
        case 36: // moveText — Td tx ty (relative to line)
          if (a.length >= 2) {
            lineX += a[0]; lineY += a[1];
            textX = lineX;  textY = lineY;
          }
          break;
        case 37: // setLeadingMoveText — TD tx ty
          if (a.length >= 2) {
            lineX += a[0]; lineY += a[1];
            textX = lineX;  textY = lineY;
          }
          break;

        // ── Text show operators ──────────────────────────────────────────
        // Only record when color is non-black (saves map size)
        case 45: // showText    Tj
        case 46: // showSpacedText TJ
        case 47: // nextLineShowText '
        case 48: // nextLineSetSpacingShowText "
          if (fillR > 0.02 || fillG > 0.02 || fillB > 0.02) {
            const screenY = pageHeight - textY;
            const key = colorBucket(textX, screenY);
            map.set(key, { r: fillR, g: fillG, b: fillB });
          }
          break;

        default:
          break;
      }
    }
  } catch {
    // Color extraction is best-effort; proceed without it.
  }
  return map;
}

// ── Main extraction ───────────────────────────────────────────────────────────

export async function extractPdfPages(file: File): Promise<PdfPage[]> {
  const pdfjs      = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf        = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPage[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page       = await pdf.getPage(p);
    const viewport   = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // ── Build color map from operator list ─────────────────────────────
    const colorMap = await buildColorMap(page, pageHeight);

    // ── Attempt 1: includeMarkedContent — handles Form XObjects + ActualText ──
    let rawContent = await page.getTextContent(
      { includeMarkedContent: true } as Parameters<typeof page.getTextContent>[0]
    );
    let rawItems = (rawContent.items as Array<Record<string, unknown>>).filter(
      (item) => "str" in item && "transform" in item
    );

    // ── Attempt 2: plain content stream ────────────────────────────────
    let extractionMode: PdfPage["extractionMode"] = "marked-content";
    if (rawItems.length === 0) {
      rawContent = await page.getTextContent(
        { includeMarkedContent: false } as Parameters<typeof page.getTextContent>[0]
      );
      rawItems = (rawContent.items as Array<Record<string, unknown>>).filter(
        (item) => "str" in item && "transform" in item
      );
      extractionMode = rawItems.length > 0 ? "plain" : "none";
    }

    const rawItemCount   = rawItems.length;
    const textItemCount  = rawItems.filter((i) => (i.str as string).trim().length > 0).length;
    const emptyItemCount = rawItemCount - textItemCount;
    const isImageOnly    = rawItemCount === 0;

    const sampleItems = rawItems.slice(0, 5).map((i) => ({
      str:      String(i.str ?? ""),
      fontName: String(i.fontName ?? ""),
      fontSize: Math.abs(Number((i.transform as number[])?.[3] ?? (i.height ?? 0))),
    }));

    // ── Build RichItems with color ──────────────────────────────────────
    const richItems: RichItem[] = rawItems
      .map((raw) => {
        const item     = raw as { str: string; transform: number[]; fontName?: string; height?: number };
        const fontName = item.fontName ?? "";
        const fontLow  = fontName.toLowerCase();
        const bold     = fontLow.includes("bold") || fontLow.includes("black") || fontLow.includes("heavy");
        const italic   = fontLow.includes("italic") || fontLow.includes("oblique");
        const fontSize = item.height ?? Math.abs(item.transform[3]) ?? 10;
        const screenY  = pageHeight - item.transform[5];

        // Look up color from operator map (try original and nearby buckets)
        const key   = colorBucket(item.transform[4], screenY);
        const color = colorMap.get(key) ?? null;
        const green = color !== null && isGreenColor(color.r, color.g, color.b);

        return { str: item.str, x: item.transform[4], y: screenY, bold, italic, fontSize, fontName, color, isGreen: green };
      })
      .filter((i) => i.str.trim().length > 0);

    // ── Group into lines (adaptive y threshold) ────────────────────────
    const fontSizes   = richItems.map((i) => i.fontSize).filter((s) => s > 0);
    const medianFs    = fontSizes.length > 0
      ? fontSizes.sort((a, b) => a - b)[Math.floor(fontSizes.length / 2)]
      : 10;
    const yThreshold  = Math.min(Math.max(medianFs * 0.4, 3), 8);

    richItems.sort((a, b) => (Math.abs(a.y - b.y) < yThreshold ? a.x - b.x : a.y - b.y));

    const lines: RichLine[] = [];
    let group: RichItem[] = [];
    let groupY = -Infinity;

    const flush = () => {
      if (!group.length) return;
      const text = group.map((i) => i.str).join(" ").trim();
      if (!text) return;
      const dominant    = group.reduce((a, b) => (b.fontSize > a.fontSize ? b : a), group[0]);
      const hasBoldWord  = group.some((i) => i.bold);
      const hasGreenWord = group.some((i) => i.isGreen);
      lines.push({
        text,
        x: group[0].x,
        y: group[0].y,
        pageNum: p,
        bold: dominant.bold,
        italic: dominant.italic,
        fontSize: dominant.fontSize,
        hasBoldWord,
        color: dominant.color,
        hasGreenWord,
        isGreen: dominant.isGreen,
      });
    };

    for (const item of richItems) {
      if (Math.abs(item.y - groupY) > yThreshold) {
        flush();
        group  = [item];
        groupY = item.y;
      } else {
        group.push(item);
      }
    }
    flush();

    const nonEmpty = lines.filter((l) => l.text.trim().length > 0);
    pages.push({
      pageNum: p,
      lines:   nonEmpty,
      rawText: nonEmpty.map((l) => l.text).join("\n"),
      rawItemCount,
      textItemCount,
      emptyItemCount,
      isImageOnly,
      extractionMode,
      sampleItems,
    });
  }

  return pages;
}

// ── Report builder ────────────────────────────────────────────────────────────

export function buildExtractionReport(pages: PdfPage[]): PdfExtractionReport {
  const totalRawItems   = pages.reduce((s, p) => s + p.rawItemCount, 0);
  const totalTextItems  = pages.reduce((s, p) => s + p.textItemCount, 0);
  const totalLines      = pages.reduce((s, p) => s + p.lines.length, 0);
  const imagePagesCount = pages.filter((p) => p.isImageOnly).length;

  return {
    totalPages: pages.length,
    totalRawItems,
    totalTextItems,
    totalLines,
    imagePagesCount,
    likelyScanned:    imagePagesCount === pages.length,
    likelyImageBased: imagePagesCount / Math.max(pages.length, 1) >= 0.7,
    pages: pages.map((p) => ({
      pageNum:        p.pageNum,
      rawItemCount:   p.rawItemCount,
      textItemCount:  p.textItemCount,
      lineCount:      p.lines.length,
      isImageOnly:    p.isImageOnly,
      extractionMode: p.extractionMode,
      sampleItems:    p.sampleItems,
    })),
  };
}

// ── Stage 1 primary entry point ───────────────────────────────────────────────
//
// This is the function all import routes and tests should call.
// It extracts the PDF, builds the extraction report, merges columns into
// reading order, and returns a NormalizedDocument ready for any section parser.

import {
  buildNormalizedDocument,
  type NormalizedDocument,
} from "./document-analyzer";

/**
 * Extract a PDF file and return a NormalizedDocument.
 *
 * This is the Stage 1 → Stage 2 handoff point.  The returned object contains
 * all structural analysis (font profile, column layout, duplicate block detection)
 * so that parsers never need to re-derive it.
 *
 * @param pageWidth - Optional page width hint (in PDF points) for column detection.
 *                   Defaults to the actual viewport width of the first page.
 */
export async function extractNormalizedDocument(file: File): Promise<NormalizedDocument> {
  const pages    = await extractPdfPages(file);
  const report   = buildExtractionReport(pages);
  const allLines = mergeRichLines(pages);
  return buildNormalizedDocument(allLines, report);
}

/**
 * Same as extractNormalizedDocument but also returns the raw pdfjs document
 * so callers can run OCR when the extraction report says the PDF is scanned.
 */
export async function extractNormalizedDocumentWithMeta(file: File): Promise<{
  doc: NormalizedDocument;
  isScanned: boolean;
  pdfRaw: { numPages: number; getPage(n: number): Promise<unknown> };
}> {
  const pdfjs = await getPdfJs();
  const buf   = await file.arrayBuffer();
  const pdfRaw = await pdfjs.getDocument({ data: buf }).promise;

  const pages    = await extractPdfPages(file);
  const report   = buildExtractionReport(pages);
  const allLines = mergeRichLines(pages);
  const doc      = buildNormalizedDocument(allLines, report);

  return { doc, isScanned: report.likelyScanned, pdfRaw };
}

// ── Legacy helpers ────────────────────────────────────────────────────────────

export function mergePages(pages: PdfPage[]): string[] {
  return pages.flatMap((p) => p.lines.map((l) => l.text));
}

export function mergeRichLines(pages: PdfPage[]): RichLine[] {
  return pages.flatMap((p) => p.lines);
}

export function cleanLines(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => {
      if (!l || l.length === 0) return false;
      if (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(l)) return false;
      if (/^(Seite\s*)?\d{1,3}$/.test(l)) return false;
      if (/https?:\/\/|www\./i.test(l)) return false;
      if (/©|telc gmbh|alle rechte|copyright|lizenz|isbn|^gmbh/i.test(l)) return false;
      if (l.length <= 2 && /\W/.test(l)) return false;
      if (/^[=\-_*•·]{3,}$/.test(l)) return false;
      if (l.length === 1 && /[|/\\]/.test(l)) return false;
      return true;
    });
}

export function cleanRichLines(lines: RichLine[]): RichLine[] {
  return lines.filter((l) => {
    const t = l.text.trim();
    if (!t || t.length === 0) return false;
    if (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(t)) return false;
    if (/^(Seite\s*)?\d{1,3}$/.test(t)) return false;
    if (/https?:\/\/|www\./i.test(t)) return false;
    if (/©|telc gmbh|alle rechte|copyright|lizenz|isbn|^gmbh/i.test(t)) return false;
    if (t.length <= 2 && /\W/.test(t)) return false;
    if (/^[=\-_*•·]{3,}$/.test(t)) return false;
    if (t.length === 1 && /[|/\\]/.test(t)) return false;
    return true;
  });
}

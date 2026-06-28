/**
 * document-analyzer.ts
 *
 * Shared analysis layer used by ALL three Lesen parsers.
 * Extracts structural information from a PDF's rich lines without making
 * assumptions about which exercise type is being parsed.
 *
 * Analysis products:
 *   • FontProfile   — body/heading/caption thresholds from actual font sizes
 *   • ColumnLayout  — detects 1- or 2-column page layout from x-position clusters
 *   • LineType      — per-line classification (heading / body / in which column / bold / markers)
 *
 * Design rule: NO knowledge of TELC exercise structure lives here.
 * Everything here is purely typographic / positional reasoning.
 */

import type { RichLine } from "./pdf-extractor";

// ── Font profile ──────────────────────────────────────────────────────────────

export interface FontProfile {
  /** Most common (mode) font size — treated as the body text size */
  bodySize: number;
  /** Font sizes at or above this are classified as "headings" */
  headingThreshold: number;
  /** Font sizes below this are classified as "captions" */
  captionThreshold: number;
  /** Sorted unique font sizes found in the document */
  allSizes: number[];
}

/**
 * Compute a font profile from a set of rich lines.
 * Rounds sizes to the nearest 0.5 pt for stability across PDF generators.
 */
export function computeFontProfile(lines: RichLine[]): FontProfile {
  const sizes = lines
    .map((l) => Math.round(l.fontSize * 2) / 2)
    .filter((s) => s > 0);

  if (sizes.length === 0) {
    return { bodySize: 10, headingThreshold: 12.5, captionThreshold: 8.5, allSizes: [10] };
  }

  // Count frequency of each size → mode = body size
  const freq = new Map<number, number>();
  for (const s of sizes) freq.set(s, (freq.get(s) ?? 0) + 1);

  let bodySize = sizes[0];
  let maxFreq = 0;
  for (const [s, f] of freq) {
    if (f > maxFreq || (f === maxFreq && s > bodySize)) {
      maxFreq = f;
      bodySize = s;
    }
  }

  return {
    bodySize,
    headingThreshold: bodySize * 1.2,   // 20% larger → heading
    captionThreshold: bodySize * 0.85,  // 15% smaller → caption
    allSizes: [...new Set(sizes)].sort((a, b) => a - b),
  };
}

// ── Column layout ─────────────────────────────────────────────────────────────

export interface ColumnLayout {
  columnCount: 1 | 2;
  /**
   * X coordinate that splits left / right columns.
   * null when columnCount === 1.
   */
  splitX: number | null;
  pageWidth: number;
}

/**
 * Detect whether the document has a 2-column layout by clustering x-positions.
 *
 * Algorithm:
 *   1. Round x-positions to a 20px grid (handles slight alignment noise).
 *   2. Find the two most-common x buckets.
 *   3. If their gap > 20% of page width, conclude 2-column.
 *
 * pageWidth defaults to 600 (typical A4 in pt at scale 1) when unknown.
 */
export function detectColumnLayout(lines: RichLine[], pageWidth = 600): ColumnLayout {
  // Exclude very short lines (single characters) that skew the distribution
  const xs = lines
    .filter((l) => l.text.trim().length > 3)
    .map((l) => Math.round(l.x / 20) * 20);

  if (xs.length === 0) return { columnCount: 1, splitX: null, pageWidth };

  const freq = new Map<number, number>();
  for (const x of xs) freq.set(x, (freq.get(x) ?? 0) + 1);

  // Top-2 x buckets by frequency
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (top.length < 2) return { columnCount: 1, splitX: null, pageWidth };

  const [x1, x2] = [top[0][0], top[1][0]].sort((a, b) => a - b);
  const gap = x2 - x1;

  if (gap < pageWidth * 0.20) {
    // Columns are too close together — single column
    return { columnCount: 1, splitX: null, pageWidth };
  }

  return {
    columnCount: 2,
    splitX: x1 + gap * 0.45, // slightly left of midpoint to handle right-flush left column
    pageWidth,
  };
}

// ── Per-line classification ───────────────────────────────────────────────────

export interface LineType {
  isHeading: boolean;
  isBody: boolean;
  isCaption: boolean;
  inLeftColumn: boolean;
  inRightColumn: boolean;
  /** Any bold word on this line */
  hasBold: boolean;
  /** Unicode checkmark / tick symbols */
  hasCheckmark: boolean;
  /** Unicode box / circle / bullet symbols (potential answer markers) */
  hasBoxOrCircle: boolean;
  /** Contains a visual correction marker of any kind */
  hasVisualMarker: boolean;
}

const RE_CHECKMARKS = /[✓✔☑✅]/;
const RE_BOX_CIRCLE = /[☐□▢▪▸►◆●○◉]/;
const RE_ANY_VISUAL  = /[✓✔☑✅☐□▢▪▸►◆●○◉✗✘]/;

export function classifyLine(
  line: RichLine,
  profile: FontProfile,
  columns: ColumnLayout,
): LineType {
  const hasCheckmark   = RE_CHECKMARKS.test(line.text);
  const hasBoxOrCircle = RE_BOX_CIRCLE.test(line.text);
  return {
    isHeading:     line.fontSize >= profile.headingThreshold,
    isBody:        line.fontSize >= profile.captionThreshold && line.fontSize < profile.headingThreshold,
    isCaption:     line.fontSize < profile.captionThreshold,
    inLeftColumn:  columns.splitX === null || line.x < columns.splitX,
    inRightColumn: columns.splitX !== null && line.x >= columns.splitX,
    hasBold:       line.hasBoldWord || line.bold,
    hasCheckmark,
    hasBoxOrCircle,
    hasVisualMarker: hasCheckmark || hasBoxOrCircle || RE_ANY_VISUAL.test(line.text),
  };
}

// ── Section boundary detection ─────────────────────────────────────────────────

/**
 * Search for a section that matches any of the given patterns.
 * Returns the index of the first matching line, or -1 if not found.
 *
 * `searchFrom` limits the scan to lines at or after that index.
 * `searchUntil` limits the scan to lines before that index.
 */
export function findSectionStart(
  lines: RichLine[],
  patterns: Array<RegExp | string>,
  searchFrom = 0,
  searchUntil = lines.length,
): number {
  for (let i = searchFrom; i < searchUntil; i++) {
    const text = lines[i].text;
    if (patterns.some((p) => (p instanceof RegExp ? p.test(text) : text.toLowerCase().includes(p)))) {
      return i;
    }
  }
  return -1;
}

/**
 * Find a numbered item with the given number at line start.
 * Handles formats: "11.", "11)", "11 ", "11-", "11:"
 */
export function findNumberedItem(lines: RichLine[], number: number, from = 0): number {
  const re = new RegExp(`^${number}\\s*[.)\\-:\\s]`);
  for (let i = from; i < lines.length; i++) {
    if (re.test(lines[i].text)) return i;
  }
  return -1;
}

/**
 * Find a lettered item (A–L) at line start.
 * Handles: "A.", "A)", "A ", "A–", standalone "A"
 */
export function findLetteredItem(lines: RichLine[], letter: string, from = 0): number {
  const re = new RegExp(`^${letter}(\\s*[.)\\-:\\s]|\\s*$)`);
  for (let i = from; i < lines.length; i++) {
    if (re.test(lines[i].text)) return i;
  }
  return -1;
}

// ── Right-column answer extraction ────────────────────────────────────────────

/**
 * In 2-column PDFs, the right column often contains the answer key.
 * This extracts all text from the right column as a single concatenated string
 * suitable for answer-pair parsing.
 */
export function extractRightColumnText(lines: RichLine[], columns: ColumnLayout): string {
  if (columns.columnCount !== 2 || columns.splitX === null) return "";
  return lines
    .filter((l) => l.x >= columns.splitX!)
    .map((l) => l.text)
    .join(" ");
}

// ── Document summary ──────────────────────────────────────────────────────────

export interface DocumentAnalysis {
  fontProfile: FontProfile;
  columns: ColumnLayout;
  lines: RichLine[];   // the cleaned lines (same reference passed in)
  /** Convenience: classify any line */
  classify(line: RichLine): LineType;
  /** Convenience: find section */
  findSection(patterns: Array<RegExp | string>, from?: number, until?: number): number;
}

/**
 * Run all structural analyses and return a unified analysis object.
 * Call this once per document, then pass it to the specific Teil parser.
 */
export function analyzeDocument(lines: RichLine[], pageWidth?: number): DocumentAnalysis {
  const fontProfile = computeFontProfile(lines);
  const columns     = detectColumnLayout(lines, pageWidth);
  return {
    fontProfile,
    columns,
    lines,
    classify: (line) => classifyLine(line, fontProfile, columns),
    findSection: (patterns, from, until) => findSectionStart(lines, patterns, from, until),
  };
}

// ── Duplicate block detection ─────────────────────────────────────────────────
//
// Many official TELC PDFs include the same exercise twice: once as the
// unsolved exercise, and once as the solved version (or a variant with
// different answer options).  This function detects such repetitions without
// any TELC-specific knowledge — it simply looks for numbered sequences that
// appear more than once in the document.

/**
 * A pair of line ranges that contain the same numbered sequence repeated.
 *
 * Callers (parsers) use this to:
 *   - Know exactly where each block starts without re-scanning
 *   - Decide whether to produce one exercise (answer-key mode) or two
 *     (distinct-exercises mode) based on `optionsDiffer`
 */
export interface DuplicateBlockPair {
  /** Line index where the first occurrence of the repeated block starts */
  firstBlockStart: number;
  /** Line index where the second occurrence starts */
  secondBlockStart: number;
  /**
   * Number of a/b/c option texts that differ between the two occurrences.
   * Zero → second block is an answer key (same options, one highlighted).
   * Non-zero → second block is a distinct exercise variant.
   */
  differingOptionCount: number;
  optionsDiffer: boolean;
}

// Matches lines that begin with a question number (1–20) followed by a
// standard delimiter or whitespace — without any TELC-specific knowledge.
const RE_Q_ANCHOR = /^(1[0-9]|[1-9])(\s*[.):\-]\s*|\s{2,})/;
// Matches option lines that start with a, b, or c.
const RE_OPT_ANCHOR = /^([abc])(\s*[.):\-]\s*|\s{2,})/i;

/** Normalise an option line to its content text only. */
function normaliseOption(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/^[abc]\s*[.):\-]\s*/i, "")
    .replace(/^[abc]\s{2,}/i, "")
    .replace(/\s+/g, " ");
}

/**
 * Count how many option lines differ between two line ranges.
 * Options are matched positionally (first option in block1 vs first in block2, etc.).
 */
function countDifferingOptions(
  lines: RichLine[],
  start1: number, end1: number,
  start2: number, end2: number,
): number {
  const getOpts = (s: number, e: number) =>
    lines.slice(s, Math.min(e, lines.length))
      .filter((l) => RE_OPT_ANCHOR.test(l.text))
      .map((l) => normaliseOption(l.text));

  const opts1 = getOpts(start1, end1);
  const opts2 = getOpts(start2, end2);
  const len   = Math.min(opts1.length, opts2.length);
  let diff    = Math.abs(opts1.length - opts2.length); // length mismatch = differ
  for (let i = 0; i < len; i++) {
    if (opts1[i] !== opts2[i]) diff++;
  }
  return diff;
}

/**
 * Detect repeated numbered sequences in a document.
 *
 * Returns at most one pair per document (the first detected repetition).
 * Most exam PDFs have exactly one such pair.
 */
export function detectDuplicateBlocks(lines: RichLine[]): DuplicateBlockPair[] {
  // Map: question number → list of line indices where it starts
  const numToIdxs = new Map<number, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(RE_Q_ANCHOR);
    if (m) {
      const n = parseInt(m[1], 10);
      const arr = numToIdxs.get(n) ?? [];
      arr.push(i);
      numToIdxs.set(n, arr);
    }
  }

  // Collect numbers that appear at least twice with a meaningful gap
  const MIN_GAP = 10;
  const repeats = [...numToIdxs.entries()]
    .filter(([, idxs]) => idxs.length >= 2 && idxs[1] - idxs[0] >= MIN_GAP)
    .sort((a, b) => a[1][0] - b[1][0]); // sort by first occurrence

  if (repeats.length === 0) return [];

  // The second block begins at the earliest repeat of any question number
  const firstBlockStart = repeats[0][1][0];
  let secondBlockStart  = repeats[0][1][1];
  for (const [, idxs] of repeats) {
    if (idxs[1] >= firstBlockStart + MIN_GAP && idxs[1] < secondBlockStart) {
      secondBlockStart = idxs[1];
    }
  }

  const differingOptionCount = countDifferingOptions(
    lines,
    firstBlockStart, secondBlockStart,
    secondBlockStart, lines.length,
  );

  return [{
    firstBlockStart,
    secondBlockStart,
    differingOptionCount,
    optionsDiffer: differingOptionCount > 0,
  }];
}

// ── Normalized document (Stage 1 output) ─────────────────────────────────────
//
// This is the stable contract between the extraction layer and all parsers.
// Nothing below this type should ever read raw PDF data.

export interface ExtractionPageReport {
  pageNum: number;
  rawItemCount: number;
  textItemCount: number;
  lineCount: number;
  isImageOnly: boolean;
  extractionMode: string;
  sampleItems: Array<{ str: string; fontName: string; fontSize: number }>;
}

export interface ExtractionReport {
  totalPages: number;
  totalRawItems: number;
  totalTextItems: number;
  totalLines: number;
  imagePagesCount: number;
  likelyScanned: boolean;
  likelyImageBased: boolean;
  pages: ExtractionPageReport[];
}

/**
 * NormalizedDocument is the sole output of Stage 1 (PDF extraction).
 *
 * Stage 2 (section parsers) receives only this type and never touches the PDF.
 *
 * Every improvement to the extraction layer (better color detection, smarter
 * line grouping, improved duplicate detection) automatically benefits all parsers.
 */
export interface NormalizedDocument {
  /**
   * All lines from all pages in reading order.
   * Columns have already been merged (left column first, then right column).
   * Parsers should treat this as a simple sequential line array.
   */
  lines: RichLine[];
  /** Typography analysis of this specific document */
  fontProfile: FontProfile;
  /** Page layout — how many columns and where the split is */
  columns: ColumnLayout;
  /**
   * Numbered sequences that appear more than once.
   * Empty when no repetition was detected.
   * The T2 parser uses this to locate the solved copy without re-scanning.
   */
  duplicateBlocks: DuplicateBlockPair[];
  /** Per-page and aggregate extraction statistics — shown in the admin review UI */
  extractionReport: ExtractionReport;
  /** Classify a line by its visual role in this document (heading / body / caption) */
  classify(line: RichLine): LineType;
  /**
   * Find the first line whose text matches any of the given patterns.
   * Returns -1 when not found.
   */
  findSection(
    patterns: Array<RegExp | string>,
    from?: number,
    until?: number,
  ): number;
}

/**
 * Build a NormalizedDocument from extracted lines and an extraction report.
 *
 * Call this from the extraction layer after pdfjs processing.
 * The resulting object is passed directly to the section parser.
 */
export function buildNormalizedDocument(
  lines: RichLine[],
  extractionReport: ExtractionReport,
  pageWidth?: number,
): NormalizedDocument {
  const fontProfile     = computeFontProfile(lines);
  const columns         = detectColumnLayout(lines, pageWidth);
  const duplicateBlocks = detectDuplicateBlocks(lines);

  return {
    lines,
    fontProfile,
    columns,
    duplicateBlocks,
    extractionReport,
    classify:     (line)                  => classifyLine(line, fontProfile, columns),
    findSection:  (patterns, from, until) => findSectionStart(lines, patterns, from, until),
  };
}

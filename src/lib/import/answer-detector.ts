/**
 * answer-detector.ts
 *
 * Dedicated module for extracting correct answers from solved TELC PDFs.
 * Supports ALL visual correction styles that TELC or practice-book publishers use:
 *
 *   • Explicit answer-key section  ("Lösung", "Schlüssel", etc.)
 *   • Bold typography              (the correct option has a bold font)
 *   • Underline                    (some fonts mark the correct word as Underl*)
 *   • Unicode checkmarks           (✓ ✔ ☑ ✅ next to the correct answer)
 *   • Inline parenthetical         ("(E)" or "→ G" at end of a text block)
 *   • Right-column annotation      (2-column PDF: answers in the right column)
 *   • Trailing key at document end (last N lines contain "1-E 2-G 3-B...")
 *   • Compact key                  ("1E 2G 3B" without separators)
 *
 * Each strategy is tried independently and returns typed results.
 * The caller (each Teil parser) chooses which strategies apply and combines them.
 *
 * Design rule: NO knowledge of the specific Lesen Teil lives here.
 * All functions work on generic RichLine arrays.
 */

import type { RichLine } from "./pdf-extractor";
import type { ColumnLayout } from "./document-analyzer";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Answer pairs: key = question number (as string), value = answer letter/option */
export type AnswerMap = Map<string, string>;

export interface DetectionResult {
  answers: AnswerMap;
  /** How the answers were found — for admin transparency */
  strategy: string;
  /** Raw text used for detection — shown in the review screen */
  rawText: string;
}

// ── Strategy 1: Explicit answer-key section ────────────────────────────────────

const ANSWER_SECTION_HEADERS = [
  /\b(lösung|lösungen|lösungsschlüssel)\b/i,
  /\b(answer\s*key|answers|correct\s*answers)\b/i,
  /\b(schlüssel|richtige?\s*antwort(en)?)\b/i,
  /\b(korrekte?\s*antwort(en)?)\b/i,
  /\blazaro\b|\bkorrektur\b/i,
];

/**
 * Look for an explicit answer-key section header, then parse the pairs following it.
 */
export function detectExplicitKeySection(lines: RichLine[]): DetectionResult | null {
  let sectionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (ANSWER_SECTION_HEADERS.some((re) => re.test(lines[i].text))) {
      sectionIdx = i;
      break;
    }
  }
  if (sectionIdx === -1) return null;

  const keyLines = lines.slice(sectionIdx, Math.min(sectionIdx + 20, lines.length));
  const rawText  = keyLines.map((l) => l.text).join(" ");
  const answers  = parseAnswerPairs(rawText);

  if (answers.size === 0) return null;
  return { answers, strategy: "explicit-key-section", rawText };
}

// ── Strategy 2: Trailing answer key (last N lines) ─────────────────────────────

/**
 * Scan the last 30 lines of the document for a compact answer key.
 * Works even without a labeled "Lösung" section.
 */
export function detectTrailingKey(lines: RichLine[], scanLines = 30): DetectionResult | null {
  const tail    = lines.slice(Math.max(0, lines.length - scanLines));
  const rawText = tail.map((l) => l.text).join(" ");
  const answers = parseAnswerPairs(rawText);

  if (answers.size < 3) return null; // need at least 3 pairs to be confident
  return { answers, strategy: "trailing-key", rawText };
}

// ── Strategy 3: Right-column annotation (2-column PDFs) ───────────────────────

/**
 * In 2-column TELC PDFs, the right column often contains answer annotations.
 * Extract all text from the right column and parse answer pairs.
 */
export function detectRightColumnAnswers(lines: RichLine[], columns: ColumnLayout): DetectionResult | null {
  if (columns.columnCount !== 2 || columns.splitX === null) return null;

  const rightLines = lines.filter((l) => l.x >= columns.splitX!);
  const rawText    = rightLines.map((l) => l.text).join(" ");
  const answers    = parseAnswerPairs(rawText);

  if (answers.size < 3) return null;
  return { answers, strategy: "right-column", rawText };
}

// ── Strategy 4: Bold typography in a multiple-choice question block ────────────

/**
 * Within a block of lines representing one question (stem + a/b/c),
 * find which option (a, b, or c) has bold formatting — that is the correct answer.
 *
 * Returns "a", "b", "c" or null.
 */
export function detectBoldOption(block: RichLine[]): "a" | "b" | "c" | null {
  const OPT_RE = /^([abc])\s*[.)]\s*/i;

  for (const line of block) {
    const m = line.text.match(OPT_RE);
    if (!m) continue;

    // Bold on the option-letter line → this option is the correct answer
    if (line.hasBoldWord || line.bold) {
      return m[1].toLowerCase() as "a" | "b" | "c";
    }

    // Bold on just the option LETTER (sometimes the letter itself is bold)
    // Detect via: the letter alone is a bold word — e.g. "**a)** option text"
    // We approximate: if the line contains a bold word within the first 3 chars
    const firstWord = line.text.slice(0, 3);
    if (/^[abc]/i.test(firstWord) && line.bold) {
      return m[1].toLowerCase() as "a" | "b" | "c";
    }
  }

  return null;
}

// ── Strategy 5: Unicode checkmark adjacent to an option/letter ────────────────

const RE_CHECKMARK = /[✓✔☑✅]/;
const RE_OPT_LETTER = /([abc])\s*[.)]/i;
const RE_UPPER_LETTER = /\b([A-L])\b/;

/**
 * Scan lines for a checkmark symbol (✓ ✔ ☑ ✅).
 * When found, look for a letter on the same line or immediately adjacent.
 *
 * Returns the letter (A–L for T1/T3, a–c for T2) or null.
 */
export function detectCheckmarkAnswer(lines: RichLine[]): string | null {
  for (const line of lines) {
    if (!RE_CHECKMARK.test(line.text)) continue;

    // Try to extract the associated answer letter
    const cleanText = line.text.replace(RE_CHECKMARK, "").trim();
    const optM      = cleanText.match(RE_OPT_LETTER);
    const upperM    = cleanText.match(RE_UPPER_LETTER);

    if (optM) return optM[1].toLowerCase();
    if (upperM) return upperM[1].toUpperCase();
  }
  return null;
}

/**
 * Scan a question block for a checkmark adjacent to an a/b/c option.
 * Returns the option letter or null.
 */
export function detectCheckmarkInBlock(block: RichLine[]): "a" | "b" | "c" | null {
  for (const line of block) {
    if (!RE_CHECKMARK.test(line.text)) continue;
    const m = line.text.replace(RE_CHECKMARK, "").match(RE_OPT_LETTER);
    if (m) return m[1].toLowerCase() as "a" | "b" | "c";
  }
  return null;
}

// ── Strategy 6: Inline answer at end of text block ────────────────────────────

/**
 * Detect "(E)", "→ G", "– L", "Antwort: K" or similar at the END of a text string.
 * Used for T1 and T3 where the correct match is sometimes appended inline.
 *
 * Returns the letter or null.
 */
export function detectInlineAnswer(text: string): string | null {
  const patterns = [
    /\(([A-LX])\)\s*$/,          // "(E)" at end
    /→\s*([A-LX])\s*$/,          // "→ G" at end
    /–\s*([A-LX])\s*$/,          // "– L" at end
    /antwort:\s*([A-LX])\s*$/i,  // "Antwort: K"
    /richtig:\s*([A-LX])\s*$/i,  // "Richtig: D"
    /korrekt:\s*([A-LX])\s*$/i,  // "Korrekt: A"
    /lösung:\s*([A-LX])\s*$/i,   // "Lösung: F"
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

// ── Strategy 7: Underline detection ───────────────────────────────────────────

/**
 * Some PDF generators mark correct answers with an underlined font.
 * pdfjs doesn't expose underline directly, but some font names contain
 * "Underl", "Ital" (italic used as emphasis), or similar markers.
 *
 * Returns true if the line appears to be marked as "emphasized/underlined".
 */
export function isUnderlineMarked(line: RichLine): boolean {
  const fontLow = (line as RichLine & { fontName?: string }).fontName
    ? ((line as unknown as { fontName: string }).fontName).toLowerCase()
    : "";
  return fontLow.includes("underl") || (line.italic && line.hasBoldWord);
}

// ── Combined detector ─────────────────────────────────────────────────────────

/**
 * Run all answer-extraction strategies on the given lines and return
 * the BEST result (most answers found, most specific strategy).
 *
 * Priority order (highest confidence first):
 *   1. Explicit key section
 *   2. Right-column annotation
 *   3. Trailing key
 */
export function detectAnswers(lines: RichLine[], columns: ColumnLayout): DetectionResult | null {
  const candidates: DetectionResult[] = [];

  const explicit = detectExplicitKeySection(lines);
  if (explicit)  candidates.push(explicit);

  const rightCol = detectRightColumnAnswers(lines, columns);
  if (rightCol)  candidates.push(rightCol);

  const trailing = detectTrailingKey(lines);
  if (trailing)  candidates.push(trailing);

  if (candidates.length === 0) return null;

  // Pick the result with the most answers found
  return candidates.reduce((best, c) => c.answers.size > best.answers.size ? c : best);
}

// ── Generic answer-pair parser ─────────────────────────────────────────────────

/**
 * Parse "number → letter" pairs from raw text.
 * Handles all common formats:
 *
 *   "1-E"  "1: E"  "1. E"  "1) E"  "1 E"   (with various separators)
 *   "1E"                                      (compact, no separator)
 *   "E-1"  "E: 1"                            (reversed order)
 *   "11-A" "11: X"                           (two-digit numbers for T3)
 *
 * Keys are always stored as strings (the number as-is).
 * Values are always stored uppercase.
 */
export function parseAnswerPairs(text: string): AnswerMap {
  const map: AnswerMap = new Map();
  let m: RegExpExecArray | null;

  // Primary: "N[-.:)] L" or "N L" (letter is A–L or X, or a–c)
  const re1 = /(1[0-9]|[1-9])\s*[-.:)]\s*([A-La-cX])\b/g;
  while ((m = re1.exec(text)) !== null) {
    map.set(m[1], m[2].toUpperCase());
  }

  // Compact: "NL" (digit immediately followed by letter, no separator)
  if (map.size === 0) {
    const re2 = /\b(1[0-9]|[1-9])([A-La-cX])\b/g;
    while ((m = re2.exec(text)) !== null) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 20) map.set(m[1], m[2].toUpperCase());
    }
  }

  // Reversed: "L[-.:)] N"
  if (map.size === 0) {
    const re3 = /\b([A-La-cX])\s*[-.:)]\s*(1[0-9]|[1-9])\b/g;
    while ((m = re3.exec(text)) !== null) {
      map.set(m[2], m[1].toUpperCase());
    }
  }

  return map;
}

/**
 * Parse "number → a/b/c" pairs specifically for multiple-choice (T2).
 */
export function parseOptionPairs(text: string): Map<number, "a" | "b" | "c"> {
  const map = new Map<number, "a" | "b" | "c">();
  let m: RegExpExecArray | null;

  const re1 = /\b(1[0-9]|[1-9])\s*[-.:)]\s*([abc])\b/gi;
  while ((m = re1.exec(text)) !== null) {
    map.set(parseInt(m[1]), m[2].toLowerCase() as "a" | "b" | "c");
  }

  if (map.size === 0) {
    const re2 = /\b(1[0-9]|[1-9])([abc])\b/gi;
    while ((m = re2.exec(text)) !== null) {
      const n = parseInt(m[1]);
      if (n >= 1 && n <= 10) map.set(n, m[2].toLowerCase() as "a" | "b" | "c");
    }
  }

  return map;
}

/**
 * lesen-t1-parser.ts  —  TELC B2 Lesen Teil 1
 *
 * Structure:
 *   • 10 headlines  A–J  (5 match a text, 5 are distractors)
 *   • 5 numbered texts   (positions 1–5)
 *   • Answer key linking each text position to its correct headline letter
 *
 * Parser contract:
 *   - Accepts RichLine[] (from mergeRichLines) OR string[] (for tests/legacy)
 *   - All structural assumptions are derived from the document itself (font sizes,
 *     numbering patterns, section headers) — never from fixed line numbers
 *   - Uses the shared document-analyzer and answer-detector layers
 *   - Each strategy degrades gracefully: if one approach fails, the next is tried
 */

import { cleanRichLines, type RichLine } from "./pdf-extractor";
import { analyzeDocument, findSectionStart, type NormalizedDocument } from "./document-analyzer";
import {
  detectAnswers,
  detectInlineAnswer,
  parseAnswerPairs,
  type DetectionResult,
} from "./answer-detector";

// ── Public types ──────────────────────────────────────────────────────────────

export interface T1Headline {
  letter: string;
  text: string;
  is_distractor: boolean;
}

export interface T1Text {
  position: number;
  title: string;
  content: string;
  correct_headline: string;
}

export interface ParsedT1Exercise {
  title: string;
  instructions: string;
  headlines: T1Headline[];
  texts: T1Text[];
  rawAnswerKey: string;
  detectionStrategy: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HEADLINE_LETTERS = ["A","B","C","D","E","F","G","H","I","J"] as const;
type HeadlineLetter = typeof HEADLINE_LETTERS[number];

/** Marks the start of a new exercise block in multi-exercise PDFs. */
const EXERCISE_BOUNDARY_PATTERNS: RegExp[] = [
  /\blesen\s+sie\s+zuerst\s+die\s+zehn\s+überschriften\b/i,
  /\bleseverstehen[,\s]+teil\s*1\b/i,
];

/** Section headers that introduce the headline list */
const HEADLINE_SECTION_PATTERNS: Array<RegExp | string> = [
  /\büberschrift(en)?\b/i,
  /\bschlagzeile(n)?\b/i,
  /a\s*[–\-]\s*j\b/i,       // "A–J" or "A-J"
  /zehn\s*überschriften/i,
];

/**
 * Text section patterns.
 * We look for the FIRST occurrence of "Text 1" / "1." at the beginning of
 * a line; positions 2–5 are then derived by similar patterns.
 */
const TEXT_SECTION_PATTERNS: Array<RegExp | string> = [
  /^text\s*1\b/i,
  /^1\s*[.)]\s+[A-ZÄÖÜ]/,  // numbered paragraph starting with capital
];

/** Answer key section markers — must be distinct from student instructions ("Lösungen eintragen"). */
const KEY_SECTION_PATTERNS: Array<RegExp | string> = [
  /\blösungsschlüssel\b/i,          // "Lösungsschlüssel" header
  /\banswer\s*key\b/i,              // "Answer Key"
  /\blösungen?\s*:?\s*\d/i,         // "Lösung: 1" or "Lösungen 1" — numbered answers
];

// ── Parser overloads ──────────────────────────────────────────────────────────

export function parseLesenT1(input: NormalizedDocument): ParsedT1Exercise;
export function parseLesenT1(input: RichLine[]): ParsedT1Exercise;
export function parseLesenT1(input: string[]): ParsedT1Exercise;
export function parseLesenT1(input: NormalizedDocument | RichLine[] | string[]): ParsedT1Exercise {
  // Normalise to RichLine[]
  let richLines: RichLine[];
  if ("lines" in input && "fontProfile" in input) {
    // NormalizedDocument — use its pre-cleaned, column-merged lines
    richLines = (input as NormalizedDocument).lines;
  } else if (typeof (input as unknown[])[0] === "string") {
    richLines = (input as string[]).map((t, i) => ({
      text: t, x: 0, y: i * 12, pageNum: 0, bold: false, italic: false, fontSize: 10, hasBoldWord: false,
      color: null, isGreen: false, hasGreenWord: false,
    }));
  } else {
    richLines = input as RichLine[];
  }

  richLines = cleanRichLines(richLines);
  const warnings: string[] = [];

  // ── Document analysis ────────────────────────────────────────────────────
  const doc     = analyzeDocument(richLines);
  const lines   = richLines; // alias (same reference)
  const texts_s = richLines.map((l) => l.text);

  // ── Locate major section boundaries ──────────────────────────────────────

  const headlineSectionIdx = findSectionStart(lines, HEADLINE_SECTION_PATTERNS);
  const textSectionIdx     = findSectionStart(lines, TEXT_SECTION_PATTERNS);
  const keySectionIdx      = findSectionStart(lines, KEY_SECTION_PATTERNS);

  // ── 1. Extract headlines A–J ─────────────────────────────────────────────
  // Search entire document — headlines may come before OR after texts in scanned PDFs.

  const headlines = extractHeadlines(lines, headlineSectionIdx, keySectionIdx, doc.columns.splitX);

  if (headlines.length < 5) {
    warnings.push(`Only ${headlines.length} of 10 headlines detected. Please verify in the review screen.`);
  }

  // ── 2. Extract texts 1–5 ─────────────────────────────────────────────────
  // Exclude headline-dense pages from text search to avoid headline content being used as article text.
  const headlineDensePages = getHeadlineDensePages(lines);

  const texts = extractTexts(lines, textSectionIdx, keySectionIdx, headlineDensePages);

  if (texts.length < 4) {
    warnings.push(`Only ${texts.length} of 5 texts detected. Check the PDF layout.`);
  }

  // ── 3. Detect answers ─────────────────────────────────────────────────────

  let detectionResult: DetectionResult | null = null;

  // Strategy A: dedicated answer-detector (explicit section, right-column, trailing key)
  detectionResult = detectAnswers(lines, doc.columns);

  // Strategy B: inline answers at end of each text's content
  if (!detectionResult || detectionResult.answers.size === 0) {
    const inlineMap: ReturnType<typeof parseAnswerPairs> = new Map();
    for (const text of texts) {
      const ans = detectInlineAnswer(text.content);
      if (ans && HEADLINE_LETTERS.includes(ans as HeadlineLetter)) {
        inlineMap.set(String(text.position), ans);
        text.content = text.content.replace(/\s*\([A-J]\)\s*$|\s*→\s*[A-J]\s*$|\s*–\s*[A-J]\s*$/, "").trim();
      }
    }
    if (inlineMap.size >= 3) {
      detectionResult = { answers: inlineMap, strategy: "inline-in-text", rawText: "" };
    }
  }

  // Strategy C: scan entire document for any answer-pair pattern
  if (!detectionResult || detectionResult.answers.size === 0) {
    const allText = texts_s.join(" ");
    const pairs   = parseAnswerPairs(allText);
    // Only use if 3+ pairs found AND letters are all valid headline letters
    const valid   = [...pairs.entries()].filter(([, v]) => HEADLINE_LETTERS.includes(v as HeadlineLetter));
    if (valid.length >= 3) {
      const validMap: ReturnType<typeof parseAnswerPairs> = new Map(valid);
      detectionResult = { answers: validMap, strategy: "document-scan", rawText: allText.slice(-200) };
    }
  }

  // Apply answers to texts
  const answerMap = detectionResult?.answers ?? new Map();
  for (const text of texts) {
    const ans = answerMap.get(String(text.position));
    if (ans && HEADLINE_LETTERS.includes(ans as HeadlineLetter)) {
      text.correct_headline = ans;
    }
  }

  // Mark distractors
  const usedLetters = new Set([...answerMap.values()]);
  for (const h of headlines) {
    h.is_distractor = !usedLetters.has(h.letter);
  }

  // ── 4. Extract title and instructions ────────────────────────────────────

  const preHeadlineLines = lines.slice(0, Math.max(0, Math.min(headlineSectionIdx, textSectionIdx, 10)));
  const instructions     = preHeadlineLines.map((l) => l.text).join(" ").trim().slice(0, 500);
  const title            = preHeadlineLines.find((l) => l.text.length > 5 && l.text.length < 120)?.text
                           ?? "Lesen Teil 1";

  // ── 5. Confidence ────────────────────────────────────────────────────────

  const hasAnswers   = answerMap.size >= 3;
  const confidence: "high" | "medium" | "low" =
    hasAnswers && texts.length >= 4 && headlines.length >= 8 ? "high"
    : texts.length >= 3 || headlines.length >= 6             ? "medium"
    : "low";

  if (!hasAnswers) {
    warnings.push("No answer key detected. Set correct headlines manually in the review screen.");
  }

  return {
    title,
    instructions,
    headlines,
    texts,
    rawAnswerKey: detectionResult?.rawText ?? "",
    detectionStrategy: detectionResult?.strategy ?? "none",
    confidence,
    warnings,
  };
}

// ── Section extractors ────────────────────────────────────────────────────────

/** Returns the set of pageNums that are dense with a-j headline markers (≥5 matches). */
function getHeadlineDensePages(lines: RichLine[]): Set<number> {
  const RE_HL = /^[A-Ja-j][.)]\s{1,6}.{4,}/;
  const counts = new Map<number, number>();
  for (const l of lines) {
    const pn = l.pageNum ?? 0;
    if (RE_HL.test(l.text.trim())) counts.set(pn, (counts.get(pn) ?? 0) + 1);
  }
  const result = new Set<number>();
  for (const [pn, cnt] of counts) { if (cnt >= 5) result.add(pn); }
  return result;
}

/**
 * Extract headlines A–J from the headline section of the document.
 *
 * Handles:
 *   • "A  Headline text"     (double-space separation)
 *   • "A) Headline text"     (parenthesis)
 *   • "A. Headline text"     (period)
 *   • "A – Headline text"    (em-dash)
 *   • Multi-line headlines   (continuation on next line)
 *   • 2-column headline layouts (left column A-E, right column F-J)
 */
function extractHeadlines(
  lines: RichLine[],
  headlineStart: number,
  keyStart: number,
  columnSplitX: number | null,
): T1Headline[] {
  // Require separator ) or . to avoid false matches from two-column OCR artifacts like "E aus dem..."
  const RE = /^([A-Ja-j])[.)]\s{1,6}(.{4,})/;
  const map = new Map<string, { text: string; hasBold: boolean }>();

  // Search up to keyStart (answer key) or entire document — order-independent.
  const searchEnd = keyStart > 0 ? keyStart : lines.length;
  const searchFrom = headlineStart >= 0 ? headlineStart : 0;

  for (let i = searchFrom; i < searchEnd; i++) {
    const m = lines[i].text.match(RE);
    if (!m) continue;

    const letter  = m[1].toUpperCase();
    let headText  = m[2].trim();
    const hasBold = lines[i].hasBoldWord || lines[i].bold;

    // Absorb continuation lines (no new headline letter, not too short)
    let j = i + 1;
    while (j < searchEnd && j < i + 4) {
      const next = lines[j].text;
      if (RE.test(next)) break;                    // new headline
      if (next.length < 4) break;                  // blank / separator
      if (/^text\s*\d/i.test(next)) break;         // entering text section
      headText += " " + next.trim();
      i = j;
      j++;
    }

    if (!map.has(letter)) {
      map.set(letter, { text: headText, hasBold });
    }
  }

  // If we found < 5 headlines with the section-based approach, try a document-wide scan
  if (map.size < 5) {
    for (let i = 0; i < searchEnd; i++) {
      const m = lines[i].text.match(RE);
      if (m && !map.has(m[1])) {
        map.set(m[1], { text: m[2].trim(), hasBold: lines[i].hasBoldWord });
      }
    }
  }

  return [...map.entries()].map(([letter, { text, hasBold }]) => ({
    letter,
    text,
    is_distractor: !hasBold, // refined later when answer map is applied
  }));
}

/**
 * Extract texts 1–5.
 *
 * Handles:
 *   • "Text 1 – Optional Title"  standard TELC format
 *   • "Text 1:"                  colon variant
 *   • "1. Title"                 practice-book variant (number + period)
 *   • Texts with no explicit title (next line is paragraph content)
 *   • Multi-page texts (content continues until "Text 2" marker found)
 */
function extractTexts(
  lines: RichLine[],
  textStart: number,
  keyStart: number,
  headlineDensePages: Set<number> = new Set(),
): T1Text[] {
  // Require "text" prefix to avoid matching column-layout numbers ("2 b) headline...")
  const TEXT_MARKER = /^text\s+([1-5])\b\s*(.*)/i;
  const markers: Array<{ idx: number; pos: number; titleHint: string }> = [];

  // For scanned PDFs: if we detected headline pages, textSectionIdx is unreliable — search all.
  const searchFrom = (headlineDensePages.size > 0 || textStart < 0) ? 0 : textStart;
  const searchEnd  = keyStart > 0 ? keyStart : lines.length;

  for (let i = searchFrom; i < searchEnd; i++) {
    // Skip lines on headline-dense pages (they contain a-j items, not numbered texts)
    if (headlineDensePages.has(lines[i].pageNum ?? 0)) continue;

    const m = lines[i].text.match(TEXT_MARKER);
    if (!m) continue;

    const pos = parseInt(m[1]);
    if (pos < 1 || pos > 5) continue;
    if (markers.find((x) => x.pos === pos)) continue; // deduplicate

    markers.push({ idx: i, pos, titleHint: m[2]?.trim() ?? "" });
  }

  markers.sort((a, b) => a.pos - b.pos);

  const results: T1Text[] = [];

  for (let ti = 0; ti < markers.length; ti++) {
    const { idx: start, pos, titleHint } = markers[ti];
    const end = ti + 1 < markers.length ? markers[ti + 1].idx : searchEnd;

    let title       = titleHint;
    let contentFrom = start + 1;

    // If the marker line has no title hint, check the next line
    if (!title && contentFrom < end) {
      const next = lines[contentFrom].text;
      // Title: short, starts with uppercase or number, not a lowercase continuation
      if (next.length > 2 && next.length < 120 && !/^[a-zäöü]/.test(next)) {
        title = next.trim();
        contentFrom++;
      }
    }

    const contentLines = lines
      .slice(contentFrom, end)
      .filter((l) => l.text.length > 5);
    const content = contentLines.map((l) => l.text).join(" ").trim();

    if (content.length > 20) {
      results.push({ position: pos, title, content, correct_headline: "" });
    }
  }

  // Fallback: if < 3 texts found and we have a clear text section, try paragraph splitting
  if (results.length < 3 && searchFrom < searchEnd) {
    const sectionLines = lines
      .slice(searchFrom, searchEnd)
      .filter(l => !headlineDensePages.has(l.pageNum ?? 0));
    let block: string[] = [];
    let pos = 1;

    for (const l of sectionLines) {
      if (l.text.length < 3 && block.length > 4) {
        if (pos <= 5 && !results.find((r) => r.position === pos)) {
          results.push({ position: pos++, title: "", content: block.join(" ").trim(), correct_headline: "" });
        }
        block = [];
      } else {
        block.push(l.text);
      }
    }
    if (block.length > 4 && pos <= 5 && !results.find((r) => r.position === pos)) {
      results.push({ position: pos, title: "", content: block.join(" ").trim(), correct_headline: "" });
    }

    if (results.length > (markers.length > 0 ? markers.length : 0)) {
      // Paragraph-split produced more results — keep them
    }
  }

  // Fallback 2: page-content-based extraction for scanned PDFs.
  // For headline-dense pages (two-column layout): extract non-headline lines as article text.
  // For regular pages: use all content.
  if (results.length < 3) {
    const RE_HL_STRICT = /^[A-Ja-j][.)]\s{1,6}.{4,}/;
    const RE_INSTRUCTION = /^(?:lesen sie|leseverstehen|ceic|telc|bei den aufgaben|am besten)/i;

    const pageGroups = new Map<number, RichLine[]>();
    for (const l of lines.slice(searchFrom, searchEnd)) {
      const pn = l.pageNum ?? 0;
      if (!pageGroups.has(pn)) pageGroups.set(pn, []);
      pageGroups.get(pn)!.push(l);
    }

    let pos = results.length + 1;
    for (const [pn, pageLines] of [...pageGroups.entries()].sort((a, b) => a[0] - b[0])) {
      if (pos > 5) break;
      if (results.find((r) => r.position === pos)) { pos++; continue; }

      let contentLines: RichLine[];
      if (headlineDensePages.has(pn)) {
        // Two-column page: exclude headline lines and instruction lines to get article text
        contentLines = pageLines.filter(
          (l) => !RE_HL_STRICT.test(l.text.trim()) && !RE_INSTRUCTION.test(l.text.trim()) && l.text.length > 10
        );
      } else {
        contentLines = pageLines.filter((l) => l.text.length > 10);
      }

      const content = contentLines.map((l) => l.text).join(" ").trim();
      if (content.length > 150) {
        results.push({ position: pos++, title: "", content, correct_headline: "" });
      }
    }
  }

  return results.sort((a, b) => a.position - b.position);
}

// ── Multi-exercise entry point ────────────────────────────────────────────────

/**
 * Parse a multi-exercise PDF (e.g. 105-page T1 practice book) into separate exercises.
 *
 * Each exercise begins with the TELC instruction text:
 *   "Lesen Sie zuerst die zehn Überschriften..."
 *
 * Returns one ParsedT1Exercise per detected exercise boundary.
 * Falls back to single-exercise parsing if no boundaries are found.
 */
export function parseAllLesenT1Exercises(
  input: NormalizedDocument | RichLine[] | string[],
): ParsedT1Exercise[] {
  let richLines: RichLine[];
  if ("lines" in input && "fontProfile" in input) {
    richLines = (input as NormalizedDocument).lines;
  } else if (typeof (input as unknown[])[0] === "string") {
    richLines = (input as string[]).map((t, i) => ({
      text: t, x: 0, y: i * 12, pageNum: 0, bold: false, italic: false, fontSize: 10,
      hasBoldWord: false, color: null, isGreen: false, hasGreenWord: false,
    }));
  } else {
    richLines = input as RichLine[];
  }

  richLines = cleanRichLines(richLines);

  // Find all exercise boundary positions
  const boundaryIndices: number[] = [];
  for (let i = 0; i < richLines.length; i++) {
    const text = richLines[i].text;
    if (EXERCISE_BOUNDARY_PATTERNS.some((re) => re.test(text))) {
      // Avoid duplicate boundaries within 5 lines of each other
      const last = boundaryIndices[boundaryIndices.length - 1] ?? -100;
      if (i - last > 5) {
        // Walk back up to 3 lines to include any exercise header above the instruction
        const boundaryStart = Math.max(0, i - 3);
        boundaryIndices.push(boundaryStart);
      }
    }
  }

  if (boundaryIndices.length < 2) {
    // Single exercise or no boundary detected — fall back to single parse
    return [parseLesenT1(richLines)];
  }

  const exercises: ParsedT1Exercise[] = [];
  for (let b = 0; b < boundaryIndices.length; b++) {
    const segStart = boundaryIndices[b];
    const segEnd   = b + 1 < boundaryIndices.length ? boundaryIndices[b + 1] : richLines.length;
    const segment  = richLines.slice(segStart, segEnd);
    if (segment.length < 20) continue; // too short to be a real exercise
    exercises.push(parseLesenT1(segment));
  }

  return exercises;
}

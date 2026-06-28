/**
 * lesen-t3-parser.ts  —  TELC B2 Lesen Teil 3
 *
 * Structure of every exercise:
 *   • 10 situation descriptions   (numbered __11) through __20) in the PDF)
 *   • 12 advertisement texts      (lowercase letters a–l, often title + letter on same line)
 *   • Answer key page             ("11: A", "12: L", …, "20: X") — max ~11 items per page
 *   • 2 situations may have no match → correct_letter = null, no_match = true
 *
 * A single PDF often contains MANY exercises back-to-back.
 * This parser returns ParsedT3Exercise[] — one entry per exercise found.
 *
 * Algorithm (page-grouped):
 *   1. Group RichLines by pageNum
 *   2. Classify each page: "situation" | "ad-text" | "answer-key" | "mixed" | "other"
 *   3. A clean answer-key page (≥ 8 lines matching "NN: X", > 50% of page content) marks
 *      the END of an exercise block
 *   4. Build one ParsedT3Exercise per situation-page in each block
 *
 * Patterns observed in real TELC PDFs:
 *   Situation:  "__11) Eine Bekannte…"
 *   Ad text:    "Norwegen: Kirkenes-Bergen a."  (title + letter on same merged line)
 *               OR "a." alone then title below
 *   Answer key: "11: A"  "12: L"  "19: X"
 */

import type { RichLine } from "./pdf-extractor";
import type { NormalizedDocument } from "./document-analyzer";

// ── Public types ──────────────────────────────────────────────────────────────

export interface T3Situation {
  number: number;
  description: string;
  correct_letter: string | null;
  no_match: boolean;
}

export interface T3Text {
  letter: string;
  title: string;
  content: string;
}

export interface ParsedT3Exercise {
  title: string;
  instructions: string;
  situations: T3Situation[];
  texts: T3Text[];
  rawAnswerKey: string;
  detectionStrategy: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  /** Source page number of this exercise's situation block */
  sourcePage?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AD_LETTERS_LOWER = "abcdefghijkl";
const RE_SIT      = /^_{0,3}(20|1[0-9]|[1-9])\)\s+(.+)/;
// Matches "11: A", "WG 18: J", "20: X", and also "13:??" / "14:?.?" where
// pdfjs can't decode the font glyph (treated as no_match=true).
const RE_ANS_LINE = /^(?:[A-Z]{1,4}\s+)?(20|1[0-9]|[1-9]):\s*([A-LXa-lx?])(?:[?.]*)?$/;
const RE_HEADER   = /^(leseverstehen|lesen\s+sie\s+zuerst|welcher\s+info|markieren\s+sie|manchmal\s+gibt)/i;

// ── Overloads (backward-compatible) ──────────────────────────────────────────

export function parseLesenT3(input: NormalizedDocument): ParsedT3Exercise[];
export function parseLesenT3(input: RichLine[]): ParsedT3Exercise[];
export function parseLesenT3(input: string[]): ParsedT3Exercise[];
export function parseLesenT3(input: NormalizedDocument | RichLine[] | string[]): ParsedT3Exercise[] {
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

  return parseAllExercises(richLines);
}

// ── Core parser ───────────────────────────────────────────────────────────────

function parseAllExercises(lines: RichLine[]): ParsedT3Exercise[] {
  // 1. Group lines by page
  const pageMap = new Map<number, RichLine[]>();
  for (const line of lines) {
    const pn = line.pageNum ?? 0;
    if (!pageMap.has(pn)) pageMap.set(pn, []);
    pageMap.get(pn)!.push(line);
  }

  const sortedPageNums = [...pageMap.keys()].sort((a, b) => a - b);

  type PageRole = "situation" | "ad-text" | "answer-key" | "mixed" | "other";
  interface PageInfo {
    pageNum: number;
    lines: RichLine[];
    role: PageRole;
  }

  // 2. Classify each page
  const classified: PageInfo[] = sortedPageNums.map((pn) => {
    const pLines  = pageMap.get(pn)!;
    const cleaned = pLines.filter(l => l.text.trim().length > 1);

    const ansCount = cleaned.filter(l => RE_ANS_LINE.test(l.text.trim())).length;
    const sitCount = cleaned.filter(l => RE_SIT.test(l.text.trim())).length;
    const hasAd    = cleaned.some(l => detectAdStart(l.text.trim()) !== null);

    let role: PageRole = "other";
    if (ansCount >= 8 && cleaned.length > 0 && ansCount / cleaned.length > 0.5) {
      role = "answer-key";
    } else if (sitCount >= 5) {
      role = hasAd ? "mixed" : "situation";
    } else if (hasAd) {
      role = "ad-text";
    }

    return { pageNum: pn, lines: pLines, role };
  });

  // 3. Group into exercise blocks — each block ends at a clean answer-key page
  interface ExerciseBlock {
    sitPages: PageInfo[];
    adPages:  PageInfo[];
    keyPage:  PageInfo | null;
  }

  const blocks: ExerciseBlock[] = [];
  let current: ExerciseBlock = { sitPages: [], adPages: [], keyPage: null };

  for (const page of classified) {
    switch (page.role) {
      case "situation":
        current.sitPages.push(page);
        break;
      case "mixed":
        current.sitPages.push(page);
        current.adPages.push(page);
        break;
      case "ad-text":
        current.adPages.push(page);
        break;
      case "answer-key":
        current.keyPage = page;
        blocks.push(current);
        current = { sitPages: [], adPages: [], keyPage: null };
        break;
      default:
        break;
    }
  }
  if (current.sitPages.length > 0) blocks.push(current);

  // 4. Build exercises from blocks
  const exercises: ParsedT3Exercise[] = [];

  for (const block of blocks) {
    const adTexts = extractAdTexts(block.adPages);
    const answers = block.keyPage
      ? extractAnswers(block.keyPage.lines)
      : new Map<string, string>();
    const rawKey  = block.keyPage
      ? block.keyPage.lines.map(l => l.text).join("\n")
      : "";

    for (const sitPage of block.sitPages) {
      const situations = extractSituations(sitPage.lines);
      if (situations.length < 3) continue;

      for (const sit of situations) {
        const ans = answers.get(String(sit.number));
        if (ans) {
          // "?" = pdfjs failed to decode glyph — TELC uses exactly 2 no-match per exercise,
          // so undecodable answers are treated as X (no match).
          if (ans === "X" || ans === "?") { sit.no_match = true; sit.correct_letter = null; }
          else { sit.correct_letter = ans.toUpperCase(); sit.no_match = false; }
        }
      }

      const warnings: string[] = [];
      if (situations.length < 8) warnings.push(`Only ${situations.length}/10 situations detected`);
      if (adTexts.length < 8)    warnings.push(`Only ${adTexts.length}/12 ad texts detected`);
      if (!block.keyPage)        warnings.push("No answer key found — set answers manually in review");

      const answeredCount = situations.filter(s => s.correct_letter || s.no_match).length;
      const confidence: "high" | "medium" | "low" =
        situations.length >= 9 && adTexts.length >= 10 && answeredCount >= 8 ? "high"
        : situations.length >= 6 || adTexts.length >= 8                       ? "medium"
        : "low";

      exercises.push({
        title: "Lesen Teil 3",
        instructions: extractInstructions(sitPage.lines),
        situations,
        texts: adTexts,
        rawAnswerKey: rawKey,
        detectionStrategy: "page-grouped",
        confidence,
        warnings,
        sourcePage: sitPage.pageNum,
      });
    }
  }

  return exercises;
}

// ── Extraction helpers ────────────────────────────────────────────────────────

function extractSituations(lines: RichLine[]): T3Situation[] {
  const situations: T3Situation[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.trim().match(RE_SIT);
    if (!m) continue;

    const rawNum = parseInt(m[1]);
    if (seen.has(rawNum)) continue;
    seen.add(rawNum);

    let desc = m[2].trim();

    // Collect continuation lines (multi-line descriptions)
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].text.trim();
      if (RE_SIT.test(next)) break;
      if (RE_HEADER.test(next)) break;
      if (next.length < 3) continue;
      if (detectAdStart(next)) break;
      if (/^-{3,}$/.test(next)) break;
      desc += " " + next;
      if (desc.length > 600) break;
    }

    const num = rawNum <= 10 ? rawNum + 10 : rawNum;
    situations.push({ number: num, description: desc.trim(), correct_letter: null, no_match: false });
  }

  return situations.sort((a, b) => a.number - b.number);
}

function extractAdTexts(pages: Array<{ lines: RichLine[] }>): T3Text[] {
  const allLines = pages.flatMap(p => p.lines);
  const texts: T3Text[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < allLines.length; i++) {
    const lineText = allLines[i].text.trim();
    const adStart  = detectAdStart(lineText);
    if (!adStart) continue;

    const letter = adStart.letter.toLowerCase();
    if (seen.has(letter)) continue;
    seen.add(letter);

    let title = adStart.title;
    let j = i + 1;

    // No title on detection line → look at next line
    if (!title && j < allLines.length) {
      const candidate = allLines[j].text.trim();
      if (
        candidate.length > 3 &&
        candidate.length < 140 &&
        !detectAdStart(candidate) &&
        !RE_SIT.test(candidate)
      ) {
        title = candidate;
        j++;
      }
    }

    const contentParts: string[] = [];
    for (; j < allLines.length; j++) {
      const next = allLines[j].text.trim();
      if (detectAdStart(next)) break;
      if (RE_SIT.test(next)) break;
      if (RE_ANS_LINE.test(next)) break;
      if (next.length < 3) continue;
      contentParts.push(next);
      if (contentParts.join(" ").length > 800) break;
    }

    const content = contentParts.join(" ").trim();
    if (title || content) {
      texts.push({ letter: letter.toUpperCase(), title: title.trim(), content });
    }
  }

  return texts.sort((a, b) => a.letter.charCodeAt(0) - b.letter.charCodeAt(0));
}

/**
 * Detect the start of an advertisement text.
 *
 * Patterns in real PDFs (after pdfjs merges nearby items into one RichLine):
 *   "Norwegen: Kirkenes-Bergen a."  — title then lowercase letter with period
 *   "a. Norwegen: …"               — letter then title
 *   "a."                           — standalone letter, title on next line
 */
function detectAdStart(line: string): { letter: string; title: string } | null {
  // Pattern 1: "Title text a." — title before letter+period at end
  const m1 = line.match(/^(.{3,}?)\s+([a-l])\.\s*$/i);
  if (m1 && AD_LETTERS_LOWER.includes(m1[2].toLowerCase())) {
    return { letter: m1[2].toLowerCase(), title: m1[1].trim() };
  }

  // Pattern 2: "a. Title text" — letter+period then title
  const m2 = line.match(/^([a-l])\.\s+(.+)/i);
  if (m2 && AD_LETTERS_LOWER.includes(m2[1].toLowerCase())) {
    return { letter: m2[1].toLowerCase(), title: m2[2].trim() };
  }

  // Pattern 3: "a." — standalone letter only
  const m3 = line.match(/^([a-l])\.\s*$/i);
  if (m3 && AD_LETTERS_LOWER.includes(m3[1].toLowerCase())) {
    return { letter: m3[1].toLowerCase(), title: "" };
  }

  return null;
}

function extractAnswers(lines: RichLine[]): Map<string, string> {
  const answers = new Map<string, string>();
  for (const line of lines) {
    const m = line.text.trim().match(RE_ANS_LINE);
    if (m && !answers.has(m[1])) {
      // Normalize: ? → X (undecodable glyph = no match)
      const letter = m[2] === "?" ? "X" : m[2].toUpperCase();
      answers.set(m[1], letter);
    }
  }
  return answers;
}

function extractInstructions(lines: RichLine[]): string {
  return lines
    .filter(l => RE_HEADER.test(l.text.trim()))
    .map(l => l.text.trim())
    .slice(0, 3)
    .join(" ")
    .slice(0, 400);
}

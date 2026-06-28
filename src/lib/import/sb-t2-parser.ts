/**
 * sb-t2-parser.ts — Sprachbausteine Teil 2
 *
 * Each PDF page is one exercise: a text with gaps __(N)__ and an answer key
 * table at the bottom.
 *
 * The word bank has 15 words labeled [A]–[O]. The answer key maps each
 * gap number to its word letter: e.g. "4[A] SONDERN" means gap 4 → word A.
 *
 * Words without a gap number are distractors (still included in word bank).
 */

import type { RichLine } from "./pdf-extractor";

export interface SBT2ParsedWord {
  word_number: number;  // 1-based display order (a=1, b=2, ...)
  word: string;
  letter: string;       // A-O
  is_distractor: boolean;
}

export interface SBT2ParsedGap {
  gap_number: number;
  correct_word: string;
  correct_letter: string; // A-O
}

export interface ParsedSBT2Exercise {
  title: string;
  passage: string;         // {{N}} placeholders
  words: SBT2ParsedWord[]; // 15 words (sorted by letter)
  gaps: SBT2ParsedGap[];
  warnings: string[];
}

// Word bank key pattern: optional gap_number + [LETTER] + word
// e.g. "4[A] SONDERN", "[A] SONDERN", "4 [A] SONDERN"
const WORD_KEY_RE = /^(\d{1,2})?\s*[\[|]\s*([A-Oa-o€])\s*[\]|]\s*(.+)/;

const LETTER_ORDER = "ABCDEFGHIJKLMNO";

function parseLetterKey(ocr: string): string | null {
  const m = ocr.match(/[\[|]\s*([A-Oa-o])\s*[\]|]/);
  if (!m) return null;
  return m[1].toUpperCase();
}

function normalizePassage(raw: string): string {
  return raw.replace(/[_(\[{]{0,3}\s*(\d{1,2})\s*[)_\]}{]{0,3}/g, (_, n) => `{{${parseInt(n)}}}`);
}

function parsePageExercise(lines: RichLine[]): ParsedSBT2Exercise | null {
  const warnings: string[] = [];

  // Find instruction line
  const instrIdx = lines.findIndex((l) =>
    /welches wort aus dem kasten/i.test(l.text) ||
    /lesen sie den folgenden text/i.test(l.text)
  );
  if (instrIdx < 0) return null;

  // Find end of instructions (Markieren Sie...)
  const instrEnd = lines.findIndex((l, i) =>
    i > instrIdx && /markieren sie/i.test(l.text)
  );
  const contentStart = (instrEnd >= 0 ? instrEnd : instrIdx) + 1;

  // Find answer key section — starts with lines containing [A]-[O] letter markers
  // Usually the last 5-10 lines of the page
  let keyStart = -1;
  for (let i = lines.length - 1; i >= contentStart + 3; i--) {
    if (WORD_KEY_RE.test(lines[i].text.trim())) {
      keyStart = i;
      // Walk upward to find first key line
      while (keyStart > contentStart + 3 && WORD_KEY_RE.test(lines[keyStart - 1].text.trim())) {
        keyStart--;
      }
      break;
    }
  }
  if (keyStart < 0) keyStart = Math.max(contentStart + 5, lines.length - 8);

  // Extract passage
  const passLines = lines.slice(contentStart, keyStart);
  const rawPassage = passLines.map((l) => l.text).join(" ");
  const passage = normalizePassage(rawPassage);

  // Title: first non-trivial content line
  const titleLine = passLines.find((l) => l.text.trim().length > 5 && l.text.trim().length < 100);
  const title = titleLine?.text.trim() ?? "Sprachbausteine Teil 2";

  // Parse answer key
  const keyLines = lines.slice(keyStart).map((l) => l.text);

  // Each line may have multiple entries: "4[A] word  6[H] word  10[M] word"
  const wordMap = new Map<string, { word: string; gapNum: number | null }>();

  for (const line of keyLines) {
    // Split on 2+ spaces or tabs
    const parts = line.split(/\s{2,}|\t/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const m = trimmed.match(/^(\d{1,2})?\s*[\[|]\s*([A-Oa-o])\s*[\]|]\s*(.+)/);
      if (!m) continue;
      const gapNum = m[1] ? parseInt(m[1]) : null;
      const letter = m[2].toUpperCase();
      const word = m[3].trim().toUpperCase();
      if (!wordMap.has(letter)) {
        wordMap.set(letter, { word, gapNum });
      }
    }
  }

  // Also try: lines with bare "[A] WORD" (no gap num — distractors)
  for (const line of keyLines) {
    const m = line.trim().match(/^[\[|]\s*([A-Oa-o])\s*[\]|]\s*(.+)/);
    if (!m) continue;
    const letter = m[1].toUpperCase();
    if (!wordMap.has(letter)) {
      wordMap.set(letter, { word: m[2].trim().toUpperCase(), gapNum: null });
    }
  }

  if (wordMap.size === 0) {
    warnings.push("No word bank parsed — exercise needs manual review.");
    return null;
  }

  // Build words array (sorted by letter A-O)
  const words: SBT2ParsedWord[] = [];
  const gaps: SBT2ParsedGap[] = [];

  for (let li = 0; li < LETTER_ORDER.length; li++) {
    const letter = LETTER_ORDER[li];
    const entry = wordMap.get(letter);
    if (!entry) continue;
    words.push({
      word_number: li + 1,
      word: entry.word,
      letter,
      is_distractor: entry.gapNum === null,
    });
    if (entry.gapNum !== null) {
      gaps.push({
        gap_number: entry.gapNum,
        correct_word: entry.word,
        correct_letter: letter,
      });
    }
  }

  // For words whose letter couldn't be determined but gapNum is known
  // (already handled above)

  if (gaps.length === 0) {
    warnings.push("No gap-to-word mapping found. Please set answers manually.");
  }

  if (words.some((w) => w.is_distractor) === false && words.length === gaps.length) {
    warnings.push("All words appear to be used — expected 5 distractors for 15-word bank.");
  }

  return { title, passage, words, gaps, warnings };
}

export function parseAllSBT2Exercises(lines: RichLine[]): ParsedSBT2Exercise[] {
  const pages = new Map<number, RichLine[]>();
  for (const l of lines) {
    const pn = l.pageNum ?? 0;
    if (!pages.has(pn)) pages.set(pn, []);
    pages.get(pn)!.push(l);
  }

  const results: ParsedSBT2Exercise[] = [];
  for (const [, pageLines] of [...pages.entries()].sort((a, b) => a[0] - b[0])) {
    const ex = parsePageExercise(pageLines);
    if (ex) results.push(ex);
  }

  return results;
}

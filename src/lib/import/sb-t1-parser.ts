/**
 * sb-t1-parser.ts — Sprachbausteine Teil 1
 *
 * Each PDF page is one exercise: a text with gaps __(N)__ and an answer
 * key table at the bottom listing A/B/C options per gap.
 *
 * Returns one ParsedSBT1Exercise per page (undefined pages are skipped).
 */

import type { RichLine } from "./pdf-extractor";

export interface SBT1ParsedGap {
  gap_number: number;
  option_a: string;
  option_b: string;
  option_c: string;
  correct: "a" | "b" | "c";
  correct_certain: boolean; // false if we guessed
}

export interface ParsedSBT1Exercise {
  title: string;
  passage: string;      // {{N}} placeholders
  gaps: SBT1ParsedGap[];
  warnings: string[];
}

// Gap marker patterns in passage text
const GAP_RE = /[_(\[{]{1,3}\s*(\d{1,2})\s*[)_\]}{]{1,3}/g;

// Answer key line patterns (bottom of page)
// Matches: "21 her"  or  "21 [a] her"  or  "[a] her"  or  "21 | A| her"
const KEY_LINE_RE = /^(\d{2})\s*((?:\[[a-cA-C€]\]|\|\s*[a-cA-C€]\s*\|)\s*)(.+)/;
const KEY_NO_NUM_RE = /^((?:\[[a-cA-C€]\]|\|\s*[a-cA-C€]\s*\|)\s*)(.+)/;

// Correct-answer bracket: [a], [A], | A|, |A|, [€] (OCR for c)
const CORRECT_RE = /\[([a-cA-C€])\]|\|\s*([a-cA-C€])\s*\|/;

function normalizeCorrect(raw: string): "a" | "b" | "c" | null {
  const m = raw.match(/[a-cA-C€]/);
  if (!m) return null;
  const ch = m[0].toLowerCase();
  if (ch === "€") return "c";
  if (ch === "a") return "a";
  if (ch === "b") return "b";
  if (ch === "c") return "c";
  return null;
}

function normalizePassage(raw: string): string {
  // Replace __(21)__, _(21)_, (21), __21__, etc. with {{21}}
  return raw.replace(/[_(\[{]{0,3}\s*(\d{1,2})\s*[)_\]}{]{0,3}/g, (_, n) => `{{${parseInt(n)}}}`);
}

function stripGapMarkers(text: string): string {
  return text.replace(/[_(\[{]{0,3}\s*\d{1,2}\s*[)_\]}{]{0,3}/g, "").trim();
}

/**
 * Parse one exercise from a single page's lines.
 * Returns null if the page doesn't look like a T1 exercise.
 */
function parsePageExercise(lines: RichLine[]): ParsedSBT1Exercise | null {
  const warnings: string[] = [];

  // Find instruction line
  const instrIdx = lines.findIndex((l) =>
    /lesen sie den folgenden text/i.test(l.text) ||
    /entscheiden sie.*welches wort/i.test(l.text)
  );
  if (instrIdx < 0) return null;

  // Find answer key section: look for lines matching gap numbers (21-30) or option markers
  // Answer key usually at bottom 10-20 lines
  let keyStart = -1;
  for (let i = lines.length - 1; i >= instrIdx + 5; i--) {
    const t = lines[i].text;
    // Match pattern like "21 her" or "[a] werde" or "21 [a] werde"
    if (/^\d{2}\s+\S/.test(t) || /^\[[a-cA-C€]\]/.test(t) || /^\|\s*[a-cA-C€]\s*\|/.test(t)) {
      // Walk upward to find the first key line
      for (let j = i; j >= instrIdx + 5; j--) {
        const prev = lines[j - 1]?.text ?? "";
        const isKey = /^\d{2}\s+\S/.test(lines[j].text) ||
                      /^\[[a-cA-C€]\]/.test(lines[j].text) ||
                      /^\|\s*[a-cA-C€]\s*\|/.test(lines[j].text);
        const prevIsKey = /^\d{2}\s+\S/.test(prev) ||
                          /^\[[a-cA-C€]\]/.test(prev) ||
                          /^\|\s*[a-cA-C€]\s*\|/.test(prev);
        if (!isKey && !prevIsKey && j < i) {
          keyStart = j;
          break;
        }
        if (j === instrIdx + 5) keyStart = j;
      }
      if (keyStart < 0) keyStart = i;
      break;
    }
  }

  // Heuristic: answer key is last ~12 lines
  if (keyStart < 0) keyStart = Math.max(instrIdx + 10, lines.length - 15);

  // Extract passage (between instruction end and key start)
  const instrEnd = lines.findIndex((l, i) =>
    i > instrIdx && /Markieren Sie Ihre Lösungen/i.test(l.text)
  );
  const passStart = (instrEnd >= 0 ? instrEnd : instrIdx) + 1;
  const passLines = lines.slice(passStart, keyStart);
  const rawPassage = passLines.map((l) => l.text).join(" ");
  const passage = normalizePassage(rawPassage);

  // Extract title (first content line after instructions)
  const titleLine = passLines.find((l) => l.text.trim().length > 3 && l.text.trim().length < 80);
  const title = titleLine?.text.trim() ?? "Sprachbausteine Teil 1";

  // Parse answer key: each "row" in the OCR contains 4 gap entries side by side
  // Each gap has 3 options (a, b, c) spread across 3 rows
  // We collect all option texts per gap number
  const keyLines = lines.slice(keyStart).map((l) => l.text);

  // Strategy: scan for lines that look like answer table rows
  // Format: "21 [a] her  24 nicht nur...  27 darüber  30 weshalb"
  // Or multi-column on one line separated by spacing

  // First, find all (gap_number, option_text, correct?) tuples from the key section
  type KeyEntry = { gapNum: number; optionText: string; isCorrect: boolean };
  const entries: KeyEntry[] = [];

  for (const line of keyLines) {
    // Try to parse multiple gap entries from one line (space-separated columns)
    // Pattern: "21 [a] text  24 text  27 text  30 text"
    const parts = line.split(/\s{3,}|\t/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Pattern: "21 [a] text" or "21 text"
      const m1 = trimmed.match(/^(\d{2})\s*((?:\[[a-cA-C€€]\]|\|\s*[a-cA-C€]\s*\|)\s*)?(.+)/);
      if (m1) {
        const gapNum = parseInt(m1[1]);
        const correctMark = m1[2] ?? "";
        const optionText = m1[3].trim();
        if (gapNum >= 1 && gapNum <= 50 && optionText.length > 0) {
          entries.push({
            gapNum,
            optionText,
            isCorrect: CORRECT_RE.test(correctMark),
          });
          continue;
        }
      }

      // Pattern: "[a] text" (continuation without gap number)
      const m2 = trimmed.match(/^((?:\[[a-cA-C€]\]|\|\s*[a-cA-C€]\s*\|)\s*)(.+)/);
      if (m2) {
        const optionText = m2[2].trim();
        if (optionText.length > 0 && entries.length > 0) {
          // Belongs to most recent gap
          const lastGap = entries[entries.length - 1].gapNum;
          entries.push({
            gapNum: lastGap,
            optionText,
            isCorrect: CORRECT_RE.test(m2[1]),
          });
        }
      }
    }
  }

  // Group entries by gap number — in order: first = a, second = b, third = c
  const gapMap = new Map<number, { options: string[]; correctIdx: number }>();
  for (const entry of entries) {
    if (!gapMap.has(entry.gapNum)) {
      gapMap.set(entry.gapNum, { options: [], correctIdx: -1 });
    }
    const g = gapMap.get(entry.gapNum)!;
    const idx = g.options.length;
    g.options.push(entry.optionText);
    if (entry.isCorrect && g.correctIdx < 0) {
      g.correctIdx = idx; // 0=a, 1=b, 2=c
    }
  }

  // Build SBT1ParsedGap[]
  const gaps: SBT1ParsedGap[] = [];
  for (const [gapNum, { options, correctIdx }] of [...gapMap.entries()].sort((a, b) => a[0] - b[0])) {
    if (options.length < 1) continue;
    const correct = correctIdx >= 0
      ? (["a", "b", "c"][correctIdx] as "a" | "b" | "c")
      : "a"; // default — admin must verify
    gaps.push({
      gap_number: gapNum,
      option_a: options[0] ?? "",
      option_b: options[1] ?? "",
      option_c: options[2] ?? "",
      correct,
      correct_certain: correctIdx >= 0,
    });
  }

  if (gaps.length === 0) {
    warnings.push("No answer key parsed — gaps will need manual review.");
  } else if (gaps.some((g) => !g.correct_certain)) {
    warnings.push("Some correct answers could not be auto-detected. Please verify in admin.");
  }

  return { title, passage, gaps, warnings };
}

/**
 * Parse all exercises from a multi-page RichLine array.
 * Each page is treated as a separate exercise.
 */
export function parseAllSBT1Exercises(lines: RichLine[]): ParsedSBT1Exercise[] {
  // Group by page
  const pages = new Map<number, RichLine[]>();
  for (const l of lines) {
    const pn = l.pageNum ?? 0;
    if (!pages.has(pn)) pages.set(pn, []);
    pages.get(pn)!.push(l);
  }

  const results: ParsedSBT1Exercise[] = [];
  for (const [, pageLines] of [...pages.entries()].sort((a, b) => a[0] - b[0])) {
    const ex = parsePageExercise(pageLines);
    if (ex && ex.gaps.length > 0) results.push(ex);
  }

  return results;
}

/**
 * Lesen Teil 2 — Stage 2 parser.
 *
 * Accepts a NormalizedDocument (produced by Stage 1 / pdf-extractor.ts) and
 * returns a ParsedT2Result containing the reading passage and one or two
 * exercise blocks.
 *
 * This parser never reads from the PDF directly.  All structural information
 * it needs (column layout, font profile, duplicate block locations) is already
 * present in the NormalizedDocument.
 *
 * Two-block semantics
 * ───────────────────
 * Official TELC B2 PDFs often contain the questions twice:
 *   Block 1 — the unsolved exercise (what the student works on)
 *   Block 2 — either:
 *     A) Answer key   — same options, one highlighted green/bold → ONE exercise
 *     B) New variant  — options differ from block 1             → TWO exercises
 *
 * The Stage 1 duplicate-block detector already computed `differingOptionCount`
 * and `optionsDiffer`.  This parser simply reads those values and decides.
 */

import type { NormalizedDocument } from "./document-analyzer";
import type { RichLine } from "./pdf-extractor";

// ── Public types ──────────────────────────────────────────────────────────────

export interface ParsedT2Question {
  number: number;
  question: string;
  options: { a: string; b: string; c: string };
  correct: "a" | "b" | "c" | null;
  answerSource: "green" | "bold" | "checkmark" | "single-option" | "not-found" | null;
}

export interface ParsedT2Block {
  questions: ParsedT2Question[];
}

export type T2Confidence = "high" | "medium" | "low";

export type T2BlockRelation =
  | "single"         // only one block found
  | "answer-key"     // second block identical options → answers extracted
  | "two-exercises"; // second block differs → two distinct exercises

export interface ParsedT2Result {
  /** Shared reading passage (stored once in DB even when two exercises) */
  passage: string;
  exercise1: ParsedT2Block;
  /** Null when blockRelation is "single" or "answer-key" */
  exercise2: ParsedT2Block | null;
  blockRelation: T2BlockRelation;
  confidence: T2Confidence;
  debug: T2Debug;
}

export interface T2Debug {
  totalLines: number;
  columnCount: 1 | 2;
  splitX: number | null;
  firstQBlockStart: number;
  secondQBlockStart: number;
  passageLineCount: number;
  questionDetectionMode: "strict" | "lenient" | "bold" | "none";
  differingOptionCount: number;
  lines: Array<{
    idx: number;
    text: string;
    bold: boolean;
    isGreen: boolean;
    hasGreenWord: boolean;
    isQuestion: boolean;
    isOption: boolean;
  }>;
}

// ── Question / option patterns ────────────────────────────────────────────────

const RE_Q_STRICT      = /^(1[0-9]|[1-9])\s*[.)]\s+\S/;
const RE_Q_LENIENT     = /^(6|7|8|9|10)\s{2,}\S/;
const RE_Q_LENIENT_LOW = /^([1-5])\s{2,}\S/;
const RE_OPT_STRICT    = /^([abc])\s*[.)]\s*(.*)/i;
const RE_OPT_LENIENT   = /^([abc])\s{2,}(.*)/i;
const RE_CHECKMARK     = /[✓✔☑✅◉●]/;

function isQuestionLine(line: RichLine, mode: "strict" | "lenient" | "both"): boolean {
  if (mode === "strict" || mode === "both") if (RE_Q_STRICT.test(line.text)) return true;
  if (mode === "lenient" || mode === "both") {
    if (RE_Q_LENIENT.test(line.text))     return true;
    if (RE_Q_LENIENT_LOW.test(line.text)) return true;
  }
  return false;
}

function isOptionLine(text: string): { key: "a" | "b" | "c"; text: string } | null {
  const ms = text.match(RE_OPT_STRICT);
  if (ms) return { key: ms[1].toLowerCase() as "a"|"b"|"c", text: ms[2].trim() };
  const ml = text.match(RE_OPT_LENIENT);
  if (ml) return { key: ml[1].toLowerCase() as "a"|"b"|"c", text: ml[2].trim() };
  return null;
}

function qNum(text: string): number | null {
  const m = text.match(/^(1[0-9]|[1-9])/);
  return m ? parseInt(m[1], 10) : null;
}

// ── Detection mode ────────────────────────────────────────────────────────────

function detectQMode(lines: RichLine[]): "strict" | "lenient" | "bold" | "none" {
  if (lines.filter((l) => RE_Q_STRICT.test(l.text)).length >= 3)  return "strict";
  if (lines.filter((l) => RE_Q_LENIENT.test(l.text) || RE_Q_LENIENT_LOW.test(l.text)).length >= 3)
    return "lenient";
  if (lines.filter((l) => l.bold && /^(1[0-9]|[1-9])\s/.test(l.text)).length >= 3)
    return "bold";
  return "none";
}

// ── Answer highlight detection (used only for answer-key blocks) ──────────────

function detectMarkedOption(
  optionLines: Array<{ key: "a" | "b" | "c"; line: RichLine }>,
): { answer: "a" | "b" | "c" | null; source: ParsedT2Question["answerSource"] } {
  if (!optionLines.length) return { answer: null, source: "not-found" };
  const green = optionLines.find((o) => o.line.isGreen || o.line.hasGreenWord);
  if (green) return { answer: green.key, source: "green" };
  const check = optionLines.find((o) => RE_CHECKMARK.test(o.line.text));
  if (check) return { answer: check.key, source: "checkmark" };
  const bold  = optionLines.find((o) => o.line.bold || o.line.hasBoldWord);
  if (bold)  return { answer: bold.key,  source: "bold" };
  if (optionLines.length === 1) return { answer: optionLines[0].key, source: "single-option" };
  return { answer: null, source: "not-found" };
}

// ── Block parser ──────────────────────────────────────────────────────────────

interface RawQuestion {
  number: number;
  stem: string;
  options: Array<{ key: "a" | "b" | "c"; text: string; line: RichLine }>;
}

function parseBlock(
  lines: RichLine[],
  start: number,
  end: number,
  mode: "strict" | "lenient" | "bold",
): RawQuestion[] {
  const questions: RawQuestion[] = [];
  let current: RawQuestion | null = null;

  for (let i = start; i < Math.min(end, lines.length); i++) {
    const l = lines[i];
    const t = l.text.trim();

    const isQ = mode === "bold"
      ? l.bold && /^(1[0-9]|[1-9])\s/.test(t)
      : isQuestionLine(l, mode === "strict" ? "strict" : "lenient");

    if (isQ) {
      if (current) questions.push(current);
      const stem = t
        .replace(/^(1[0-9]|[1-9])\s*[.)]\s*/, "")
        .replace(/^(1[0-9]|[1-9])\s+/, "")
        .trim();
      current = { number: qNum(t) ?? questions.length + 1, stem, options: [] };
      continue;
    }

    if (current) {
      const opt = isOptionLine(t);
      if (opt) {
        current.options.push({ key: opt.key, text: opt.text, line: l });
      } else if (t && current.options.length === 0 && current.stem.length < 200) {
        current.stem += " " + t;
      }
    }
  }
  if (current) questions.push(current);
  return questions;
}

function toBlock(raw: RawQuestion[], extractAnswers: boolean): ParsedT2Block {
  return {
    questions: raw.map((q) => {
      let correct: "a" | "b" | "c" | null     = null;
      let answerSource: ParsedT2Question["answerSource"] = null;
      if (extractAnswers) {
        const r = detectMarkedOption(q.options.map((o) => ({ key: o.key, line: o.line })));
        correct      = r.answer;
        answerSource = r.source;
      }
      return {
        number:      q.number,
        question:    q.stem,
        options:     {
          a: q.options.find((o) => o.key === "a")?.text ?? "",
          b: q.options.find((o) => o.key === "b")?.text ?? "",
          c: q.options.find((o) => o.key === "c")?.text ?? "",
        },
        correct,
        answerSource,
      };
    }),
  };
}

// ── Apply answer map from solved block to exercise block ──────────────────────

function applyAnswerKey(
  exercise: ParsedT2Block,
  solvedRaw: RawQuestion[],
): ParsedT2Block {
  const answerMap = new Map<
    number,
    { answer: "a" | "b" | "c" | null; source: ParsedT2Question["answerSource"] }
  >();
  for (const sq of solvedRaw) {
    const r = detectMarkedOption(sq.options.map((o) => ({ key: o.key, line: o.line })));
    answerMap.set(sq.number, r);
  }

  return {
    questions: exercise.questions.map((q) => {
      const mapped = answerMap.get(q.number);
      return mapped?.answer
        ? { ...q, correct: mapped.answer, answerSource: mapped.source }
        : q;
    }),
  };
}

// ── Confidence ────────────────────────────────────────────────────────────────

function scoreConfidence(block: ParsedT2Block, hasSolvedBlock: boolean): T2Confidence {
  const total    = block.questions.length;
  const answered = block.questions.filter((q) => q.correct !== null).length;
  const green    = block.questions.filter((q) => q.answerSource === "green").length;
  const missing  = total - answered;

  if (!hasSolvedBlock)              return "low";
  if (total < 3)                    return "low";
  if (missing > 0)                  return "medium";
  if (answered === total && green > 0) return "high";
  return "medium";
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function parseLesenT2(doc: NormalizedDocument): ParsedT2Result {
  const { lines, columns, duplicateBlocks } = doc;

  const mode = detectQMode(lines);

  const debugLines = lines.slice(0, 150).map((l, idx) => ({
    idx,
    text:         l.text,
    bold:         l.bold,
    isGreen:      l.isGreen,
    hasGreenWord: l.hasGreenWord,
    isQuestion:   mode !== "none" && isQuestionLine(l, mode === "strict" ? "strict" : "lenient"),
    isOption:     !!isOptionLine(l.text),
  }));

  const noResult = (): ParsedT2Result => ({
    passage:       lines.slice(0, 30).map((l) => l.text).join("\n"),
    exercise1:     { questions: [] },
    exercise2:     null,
    blockRelation: "single",
    confidence:    "low",
    debug: {
      totalLines: lines.length, columnCount: columns.columnCount, splitX: columns.splitX,
      firstQBlockStart: -1, secondQBlockStart: -1,
      passageLineCount: 0, questionDetectionMode: mode, differingOptionCount: 0, lines: debugLines,
    },
  });

  if (mode === "none") return noResult();

  // ── Use Stage 1 duplicate detection result ────────────────────────────────
  const dupPair = duplicateBlocks[0] ?? null;

  // Find the first question line to know where the passage ends
  let firstQBlockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const l   = lines[i];
    const isQ = mode === "bold"
      ? l.bold && /^(1[0-9]|[1-9])\s/.test(l.text)
      : isQuestionLine(l, mode === "strict" ? "strict" : "lenient");
    if (isQ) { firstQBlockStart = i; break; }
  }

  if (firstQBlockStart < 0) return noResult();

  const secondQBlockStart = dupPair?.secondBlockStart ?? -1;

  // ── Passage ───────────────────────────────────────────────────────────────
  const passageLines = lines.slice(0, firstQBlockStart).filter((l) => l.text.trim().length > 1);
  const passage      = passageLines.map((l) => l.text).join("\n");

  // ── Parse block 1 ─────────────────────────────────────────────────────────
  const block1End = secondQBlockStart > 0 ? secondQBlockStart : lines.length;
  const raw1      = parseBlock(lines, firstQBlockStart, block1End, mode);

  if (!dupPair) {
    // Single block — no solved copy found
    const ex1  = toBlock(raw1, false);
    return {
      passage, exercise1: ex1, exercise2: null,
      blockRelation: "single",
      confidence: scoreConfidence(ex1, false),
      debug: {
        totalLines: lines.length, columnCount: columns.columnCount, splitX: columns.splitX,
        firstQBlockStart, secondQBlockStart: -1,
        passageLineCount: passageLines.length,
        questionDetectionMode: mode, differingOptionCount: 0, lines: debugLines,
      },
    };
  }

  // ── Parse block 2 ─────────────────────────────────────────────────────────
  const raw2 = parseBlock(lines, secondQBlockStart, lines.length, mode);

  if (dupPair.optionsDiffer) {
    // Options differ → two distinct exercises sharing the same passage
    return {
      passage,
      exercise1:     toBlock(raw1, false),
      exercise2:     toBlock(raw2, false),
      blockRelation: "two-exercises",
      confidence:    raw1.length >= 3 && raw2.length >= 3 ? "medium" : "low",
      debug: {
        totalLines: lines.length, columnCount: columns.columnCount, splitX: columns.splitX,
        firstQBlockStart, secondQBlockStart,
        passageLineCount: passageLines.length,
        questionDetectionMode: mode,
        differingOptionCount: dupPair.differingOptionCount,
        lines: debugLines,
      },
    };
  } else {
    // Options identical → second block is the answer key
    const ex1Bare = toBlock(raw1, false);
    const ex1     = applyAnswerKey(ex1Bare, raw2);
    return {
      passage, exercise1: ex1, exercise2: null,
      blockRelation: "answer-key",
      confidence:    scoreConfidence(ex1, true),
      debug: {
        totalLines: lines.length, columnCount: columns.columnCount, splitX: columns.splitX,
        firstQBlockStart, secondQBlockStart,
        passageLineCount: passageLines.length,
        questionDetectionMode: mode, differingOptionCount: 0, lines: debugLines,
      },
    };
  }
}

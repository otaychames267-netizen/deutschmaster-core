/**
 * ocr-extract.ts — deterministic OCR-first extraction (primary method).
 *
 * Runs Tesseract on a page image and attempts to parse it into the SAME
 * PageExtraction schema the Gemini path produces. Returns a confidence/quality
 * verdict so the orchestrator can decide whether to ACCEPT the OCR result or
 * fall back to Gemini. The validation gate is strict: only clean, complete,
 * high-confidence pages are accepted from OCR.
 */
import { createWorker, type Worker } from "tesseract.js";
import { extractPageImagePng } from "./gemini-vision";
import { createCanvas, loadImage } from "canvas";
import sharp from "sharp";
import type { PageExtraction, PageQuestion, PageAnswer } from "./gemini-vision";
import { conservativeCorrect } from "./german-correct";
import { checkCoherence } from "./coherence";
import { withWatchdog, StallError } from "./progress";

export interface OcrResult {
  extraction: PageExtraction;
  meanConfidence: number;     // 0..100 from Tesseract
  accepted: boolean;          // passed the quality gate
  reasons: string[];          // why not accepted (if rejected)
  rawText: string;
}

let _worker: Worker | null = null;
async function getWorker(): Promise<Worker> {
  if (_worker) return _worker;
  // Budget worker init (the historical hang point). On stall, the next call retries.
  _worker = await withWatchdog("ocr worker init", 70000, () =>
    createWorker(["deu", "eng"], 1, { langPath: process.cwd(), cachePath: process.cwd(), gzip: false, logger: () => {} }));
  return _worker;
}
export async function terminateOcr() { if (_worker) { try { await _worker.terminate(); } catch { /* noop */ } _worker = null; } }

// Recognize with an execution budget; on stall, terminate the (stuck) worker so
// the next call rebuilds it, and rethrow so the caller can skip/retry the page.
async function recognizeBudgeted(buf: Buffer, psm: string, label: string, ms = 45000) {
  try {
    return await withWatchdog(label, ms, async () => {
      const w = await getWorker();
      return recognizeWith(w, buf, psm);
    });
  } catch (e) {
    if (e instanceof StallError) { await terminateOcr(); }
    throw e;
  }
}

// Upscale image 2× to improve OCR on scanned text.
async function upscale2x(png: Buffer): Promise<Buffer> {
  const img = await loadImage(png);
  const c = createCanvas(img.width * 2, img.height * 2);
  (c.getContext("2d") as any).drawImage(img, 0, 0, img.width * 2, img.height * 2);
  return c.toBuffer("image/png");
}

// ── Preprocessing ladder (sharp) ────────────────────────────────────────────
// Each variant is a different cleanup strategy; we OCR several and keep the best.

export interface PreprocVariant { name: string; buf: Buffer; }

async function preprocessVariants(png: Buffer): Promise<PreprocVariant[]> {
  const base = sharp(png).rotate(); // auto-orient from EXIF if any
  const meta = await base.metadata();
  const targetW = Math.min((meta.width ?? 1000) * 2, 3000);
  const variants: PreprocVariant[] = [];

  // 1) Grayscale + contrast-normalize + sharpen + upscale
  variants.push({ name: "gray+norm+sharp", buf: await sharp(png).grayscale().normalize().sharpen().resize({ width: targetW }).png().toBuffer() });
  // 2) Denoise (median) + contrast + upscale
  variants.push({ name: "median+linear", buf: await sharp(png).grayscale().median(3).linear(1.2, -15).resize({ width: targetW }).png().toBuffer() });
  // 3) Binarize (threshold) — good for clean black text
  variants.push({ name: "threshold", buf: await sharp(png).grayscale().normalize().threshold(140).resize({ width: targetW }).png().toBuffer() });
  // 4) Plain 2× upscale (canvas) — sometimes the least-altered image wins
  variants.push({ name: "upscale2x", buf: await upscale2x(png) });

  return variants;
}

// Tesseract page-segmentation modes worth trying for these layouts.
const PSM_MODES = ["3", "4", "6"]; // auto, single-column, single-block

async function recognizeWith(worker: Worker, buf: Buffer, psm: string) {
  await (worker as any).setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: "1" });
  const { data } = await worker.recognize(buf);
  return data;
}

// ── Heuristic parse of OCR text into structured page ────────────────────────

const QUESTION_RE = /^\s*(\d{1,2})\s*[.)]\s*(.+)/;
const OPTION_RE = /^\s*([abc])\s*[).\]]\s*(.+)/i;

function parseOcrText(text: string, pageNum: number): { ext: PageExtraction; structuralOk: boolean; reasons: string[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const reasons: string[] = [];

  // Detect question blocks (numbers 6-10 typically) with a/b/c options.
  const questions: PageQuestion[] = [];
  for (let i = 0; i < lines.length; i++) {
    const qm = lines[i].match(QUESTION_RE);
    if (!qm) continue;
    const num = parseInt(qm[1]);
    if (num < 1 || num > 20) continue;
    const opts: Record<string, string> = {};
    let j = i + 1;
    let qtext = qm[2].trim();
    while (j < lines.length && Object.keys(opts).length < 3) {
      const om = lines[j].match(OPTION_RE);
      if (om) { opts[om[1].toLowerCase()] = om[2].trim(); j++; }
      else if (!lines[j].match(QUESTION_RE)) { if (Object.keys(opts).length === 0) qtext += " " + lines[j]; j++; }
      else break;
    }
    if (opts.a && opts.b && opts.c) {
      questions.push({ number: num, text: qtext, option_a: opts.a, option_b: opts.b, option_c: opts.c });
    }
  }

  // Detect answer key lines like "6 b 7 a 8 c" or "6=b"
  const answer_key: PageAnswer[] = [];
  const keyJoined = lines.join(" ");
  const keyRe = /\b(\d{1,2})\s*[=:.\)]?\s*([abc])\b/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<number>();
  while ((m = keyRe.exec(keyJoined))) {
    const n = parseInt(m[1]);
    if (n >= 1 && n <= 20 && !seen.has(n)) { seen.add(n); answer_key.push({ number: n, answer: m[2].toLowerCase() }); }
  }

  // Article body: the longest run of prose (lines with many words, few digits).
  const proseLines = lines.filter((l) => l.split(" ").length >= 6 && !QUESTION_RE.test(l) && !OPTION_RE.test(l));
  const article_text = proseLines.join("\n").trim();

  // Headline guess: a short line near the top, title-case, not the section label.
  const headlineCand = lines.slice(0, 8).find((l) =>
    l.length >= 4 && l.length <= 80 &&
    !/leseverstehen|teil\s*2|lesen sie|markieren/i.test(l) &&
    /[A-ZÄÖÜ]/.test(l[0] ?? ""));

  let role: PageExtraction["role"] = "other";
  if (questions.length >= 3) role = "questions";
  else if (article_text.length > 300) role = "article";

  const ext: PageExtraction = {
    page: pageNum,
    role,
    article_headline: role === "article" ? (headlineCand ?? null) : null,
    article_text: role === "article" ? article_text : null,
    questions: questions.length ? questions : null,
    answer_key: answer_key.length ? answer_key : null,
    notes: "source: ocr",
  };

  // Structural sanity (not full validation — that's the assembler's job)
  let structuralOk = false;
  if (role === "article" && article_text.length > 300 && ext.article_headline) structuralOk = true;
  if (role === "questions" && questions.length === 5) structuralOk = true;
  if (!structuralOk) reasons.push(`weak_structure(role=${role},q=${questions.length},art=${article_text.length})`);

  return { ext, structuralOk, reasons };
}

// ── Literal article-body OCR (high-res, no paraphrase) ──────────────────────

const INSTR_RE = /leseverstehen|teil\s*2|lesen sie zuerst|kreuzen sie|markieren sie|aufgaben\s*\d/i;
const OPTION_LINE = /(?:^|\s)[ABCabc][).]\s+\S/;

/**
 * OCR the article body from a page at high resolution, returning the literal
 * text (prose lines only — headline/instruction/option/icon lines removed).
 * No correction or paraphrase here; that is applied by the caller.
 */
export async function ocrArticleText(pdfPath: string, pageNum: number, scale = 3): Promise<{ text: string; confidence: number; headline: string | null }> {
  return ocrArticleTextWith(pdfPath, pageNum, await getWorker(), scale);
}

/** Same as ocrArticleText but uses a caller-supplied worker (for the parallel pool). */
export async function ocrArticleTextWith(pdfPath: string, pageNum: number, worker: Worker, scale = 3): Promise<{ text: string; confidence: number; headline: string | null }> {
  const png = await extractPageImagePng(pdfPath, pageNum);
  const meta = await sharp(png).metadata();
  const big = await sharp(png).grayscale().normalize().sharpen()
    .resize({ width: Math.round((meta.width ?? 1200) * scale) }).png().toBuffer();
  const data = await recognizeWith(worker, big, "4"); // single-column
  const { text, headline } = proseFromOcr(data.text);
  return { text, confidence: data.confidence ?? 0, headline };
}

/** Extract article prose + headline from raw OCR text (shared by all strategies). */
function proseFromOcr(raw: string): { text: string; headline: string | null } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const headline = lines.find((l) => l.length >= 4 && l.length <= 90 && !INSTR_RE.test(l) && /[A-ZÄÖÜ]/.test(l[0] ?? "")) ?? null;
  const prose = lines.filter((l) => l.split(/\s+/).length >= 6 && !INSTR_RE.test(l) && !OPTION_LINE.test(l));
  return { text: prose.join("\n").trim(), headline };
}

/**
 * MULTI-STRATEGY article OCR: tries every preprocessing variant × PSM mode,
 * applies conservative correction, and returns the result with the HIGHEST
 * coherence score (the metric that was failing) — not merely highest confidence.
 * All OCR (no Gemini). This is the automated recovery pass for flagged articles.
 */
export async function ocrArticleBest(pdfPath: string, pageNum: number) {
  return ocrArticleBestWith(pdfPath, pageNum, await getWorker());
}

/** Multi-strategy best-of-N using a caller-supplied worker (for parallel pool). */
export async function ocrArticleBestWith(pdfPath: string, pageNum: number, worker: Worker): Promise<{ text: string; coherence: number; confidence: number; strategy: string; headline: string | null }> {
  const png = await extractPageImagePng(pdfPath, pageNum);
  const meta = await sharp(png).metadata();
  const w = meta.width ?? 1200;
  // Two highest-yield preprocessing variants at 2.5× (balance of quality vs speed).
  const variants: { name: string; buf: Buffer }[] = [
    { name: "gray+norm+sharp@2.5x", buf: await sharp(png).grayscale().normalize().sharpen().resize({ width: Math.round(w * 2.5) }).png().toBuffer() },
    { name: "median+linear@2.5x", buf: await sharp(png).grayscale().median(3).linear(1.2, -12).resize({ width: Math.round(w * 2.5) }).png().toBuffer() },
  ];
  let best = { text: "", coherence: -1, confidence: 0, strategy: "", headline: null as string | null };
  for (const v of variants) {
    for (const psm of ["4", "6"]) {
      const data = await recognizeWith(worker, v.buf, psm);
      const { text, headline } = proseFromOcr(data.text);
      const corrected = conservativeCorrect(text).text;
      const coh = checkCoherence(corrected).score;
      if (coh > best.coherence || (coh === best.coherence && (data.confidence ?? 0) > best.confidence)) {
        best = { text: corrected, coherence: coh, confidence: data.confidence ?? 0, strategy: `${v.name}/psm${psm}`, headline };
      }
      if (coh >= 1) return best; // perfect — stop early
    }
  }
  return best;
}

// ── Cheap, reliable page-role classification (no Gemini) ────────────────────

export type RoleGuess = "article" | "questions" | "other";

export interface PageRoleInfo {
  page: number;
  role: RoleGuess;
  confidence: number;        // OCR mean confidence
  questionNumbers: number[]; // detected question numbers if a questions page
  signals: string[];
}

/**
 * Classify a page as article vs questions vs other using structural OCR signals
 * (not content fidelity). Question pages reliably contain the "Lösen Sie die
 * Aufgaben N-M" instruction and several "A)/B)/C)" option lines; article pages
 * are long prose without those markers.
 */
export async function classifyPageRole(pdfPath: string, pageNum: number): Promise<PageRoleInfo> {
  const png = await withWatchdog(`classify p${pageNum} image`, 25000, () => extractPageImagePng(pdfPath, pageNum));
  const big = await upscale2x(png);
  const data = await recognizeBudgeted(big, "3", `classify p${pageNum} ocr`, 45000);
  const text = data.text;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const signals: string[] = [];

  const hasAufgabenInstr = /lösen sie die aufgaben\s*\d+\s*[-–]\s*\d+/i.test(text) ||
                           /welche lösung\s*\(a,?\s*b\s*oder/i.test(text);
  // Option lines: a)/b)/c) or A)/B)/C), optionally bracketed ([a], [6]) or with
  // checkbox noise — both cases, with ) . or ] separators.
  const optionLineCount = lines.filter((l) => /(?:^|\s)\[?[abcABC][\]).]/.test(l)).length;
  // Numbered question stems 1-20 at line start.
  const qNums = new Set<number>();
  for (const l of lines) {
    const m = l.match(/^\s*(?:DO|OD|\[?[0J]?\]?\s*)?(\d{1,2})\s+[A-ZÄÖÜ]/);
    if (m) { const n = parseInt(m[1]); if (n >= 1 && n <= 20) qNums.add(n); }
  }
  const proseChars = lines.filter((l) => l.split(" ").length >= 8).join(" ").length;

  if (hasAufgabenInstr) signals.push("aufgaben-instr");
  if (optionLineCount >= 6) signals.push(`options:${optionLineCount}`);
  if (qNums.size >= 3) signals.push(`qnums:${qNums.size}`);
  if (proseChars > 600) signals.push(`prose:${proseChars}`);

  let role: RoleGuess = "other";
  // The "Lösen Sie die Aufgaben…" instruction appears ONLY on question pages, so
  // it is a definitive marker (even when the page also has prose). This prevents
  // a question page from being mis-read as an article and splitting an exercise.
  if (hasAufgabenInstr) role = "questions";
  else if (qNums.size >= 4) role = "questions";
  else if (qNums.size >= 3 && optionLineCount >= 4) role = "questions";
  else if (proseChars > 800 && optionLineCount < 4 && qNums.size < 4) role = "article";

  return {
    page: pageNum,
    role,
    confidence: data.confidence ?? 0,
    questionNumbers: [...qNums].sort((a, b) => a - b),
    signals,
  };
}

// ── Public: OCR a single page with a quality gate ───────────────────────────

export async function ocrExtractPage(
  pdfPath: string,
  pageNum: number,
  confThreshold = 80,
): Promise<OcrResult> {
  const png = await extractPageImagePng(pdfPath, pageNum);
  const worker = await getWorker();
  const variants = await preprocessVariants(png);

  type Attempt = { ext: PageExtraction; conf: number; structuralOk: boolean; reasons: string[]; rawText: string; label: string };
  const attempts: Attempt[] = [];

  // Try preprocessing variants × PSM modes; stop early once one passes the gate.
  outer:
  for (const v of variants) {
    for (const psm of PSM_MODES) {
      const data = await recognizeWith(worker, v.buf, psm);
      const conf = data.confidence ?? 0;
      const { ext, structuralOk, reasons } = parseOcrText(data.text, pageNum);
      attempts.push({ ext, conf, structuralOk, reasons, rawText: data.text, label: `${v.name}/psm${psm}` });
      if (structuralOk && conf >= confThreshold) break outer; // good enough — stop the ladder
    }
  }

  // Pick the best: prefer structurally-valid, then highest confidence.
  attempts.sort((a, b) => (Number(b.structuralOk) - Number(a.structuralOk)) || (b.conf - a.conf));
  const best = attempts[0];

  const r = [...best.reasons, `best=${best.label}`];
  if (best.conf < confThreshold) r.push(`low_confidence(${best.conf.toFixed(0)}<${confThreshold})`);
  const accepted = best.structuralOk && best.conf >= confThreshold;

  return { extraction: best.ext, meanConfidence: best.conf, accepted, reasons: r, rawText: best.rawText };
}

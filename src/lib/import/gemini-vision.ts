/**
 * gemini-vision.ts — reusable vision extraction core for the whole platform.
 *
 * Responsibilities (single, shared implementation):
 *   1. Extract the full-page scanned image from a PDF page.
 *   2. Send it to Gemini and get back STRICT structured JSON for that page.
 *
 * It NEVER invents content: the prompt forbids guessing and requires
 * "not present" / null for anything not actually printed. Assembly,
 * validation, and DB writes happen in higher layers — this module only reads.
 */
import { readFile } from "fs/promises";
import { createCanvas } from "canvas";
import { getVisionProvider } from "./vision-provider";

// Vision calls now go through the provider abstraction (vision-provider.ts),
// which handles the HTTP request, abort timeout, thinking-budget, and 429.

export type PageRole =
  | "article" | "questions" | "article_with_questions"
  | "answer_key" | "cover" | "toc" | "other";

export interface PageQuestion {
  number: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
}

export interface PageAnswer {
  number: number;
  answer: string; // "a" | "b" | "c"
}

export interface PageExtraction {
  page: number;
  role: PageRole;
  article_headline: string | null;
  article_text: string | null;
  questions: PageQuestion[] | null;
  answer_key: PageAnswer[] | null;
  notes: string | null;
}

// ── PDF page → PNG (full-page scanned image) ────────────────────────────────

// Cache the loaded PDF document per path so a multi-page run parses it once.
const _pdfCache = new Map<string, Promise<any>>();
async function loadPdf(pdfPath: string): Promise<any> {
  if (!_pdfCache.has(pdfPath)) {
    _pdfCache.set(pdfPath, (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
      const bytes = await readFile(pdfPath);
      return pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
    })());
  }
  return _pdfCache.get(pdfPath)!;
}

export async function extractPageImagePng(pdfPath: string, pageNum: number): Promise<Buffer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  const pdf = await loadPdf(pdfPath);
  const page = await pdf.getPage(pageNum);
  const XOBJ = pdfjs.OPS?.paintImageXObject ?? 85;
  const opList = await page.getOperatorList();

  const keys: string[] = [];
  for (let j = 0; j < opList.fnArray.length; j++) {
    if (opList.fnArray[j] === XOBJ && opList.argsArray[j]?.[0]) {
      const k = opList.argsArray[j][0];
      if (!keys.includes(k)) keys.push(k);
    }
  }

  let best: any = null;
  for (const key of keys) {
    const img: any = await new Promise((resolve) => {
      page.objs.get(key, resolve);
      setTimeout(() => resolve(null), 8000);
    });
    if (img?.data && img.width && img.height) {
      if (!best || img.width * img.height > best.width * best.height) best = img;
    }
  }
  if (!best) throw new Error(`No image found on page ${pageNum}`);

  const nPixels = best.width * best.height;
  const channels = Math.round(best.data.length / nPixels);
  const rgba = new Uint8ClampedArray(nPixels * 4);
  if (channels === 4) {
    rgba.set(best.data);
  } else if (channels === 3) {
    for (let k = 0; k < nPixels; k++) {
      rgba[k * 4] = best.data[k * 3]; rgba[k * 4 + 1] = best.data[k * 3 + 1];
      rgba[k * 4 + 2] = best.data[k * 3 + 2]; rgba[k * 4 + 3] = 255;
    }
  } else {
    for (let k = 0; k < nPixels; k++) {
      rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = best.data[k]; rgba[k * 4 + 3] = 255;
    }
  }
  const canvas = createCanvas(best.width, best.height);
  const ctx = canvas.getContext("2d") as any;
  const id = ctx.createImageData(best.width, best.height);
  id.data.set(rgba);
  ctx.putImageData(id, 0, 0);
  return canvas.toBuffer("image/png");
}

export async function getPageCount(pdfPath: string): Promise<number> {
  const pdf = await loadPdf(pdfPath);
  return pdf.numPages;
}

// ── Gemini structured page extraction ───────────────────────────────────────

const T2_PAGE_PROMPT = `You are extracting one page of a scanned TELC B2 German "Leseverstehen, Teil 2" study booklet into STRICT JSON.

RULES — follow exactly:
- Extract ONLY what is actually printed. Never invent, translate, rewrite, summarize, complete, or "improve" anything.
- The repeated label "Telc Leseverstehen, Teil 2", any Arabic text, QR codes, page numbers, and watermarks (e.g. "Fließend Deutsch B2") are NOT content — ignore them.
- The exercise TITLE is the German ARTICLE HEADLINE (the bold/large title directly above the article body). If you cannot clearly read a distinct headline, set article_headline to null. Do NOT guess.
- Transcribe German text verbatim including umlauts (ä ö ü ß).

Return ONLY this JSON object (no markdown fences):
{
  "role": "article" | "questions" | "article_with_questions" | "answer_key" | "cover" | "toc" | "other",
  "article_headline": string | null,   // the printed article title, or null if not clearly present
  "article_text": string | null,        // full verbatim article text if this page contains article body, else null
  "questions": [ { "number": int, "text": string, "option_a": string, "option_b": string, "option_c": string } ] | null,
  "answer_key": [ { "number": int, "answer": "a"|"b"|"c" } ] | null,
  "notes": string | null                 // anything ambiguous or unreadable worth a human reviewing
}`;

// ── Per-exercise extraction (one Gemini call per exercise) ──────────────────

export interface ExerciseExtraction {
  title: string | null;          // verbatim printed article headline
  article: string | null;        // full verbatim article text
  questions: PageQuestion[];      // expected 5
  answer_key: PageAnswer[];       // expected 5, read from the marked checkboxes
  notes: string | null;
}

const T2_EXERCISE_PROMPT = `You are extracting ONE complete TELC B2 German "Leseverstehen, Teil 2" exercise from the attached page image(s) into STRICT JSON.
The images belong to a SINGLE exercise: one article followed by its 5 multiple-choice questions (numbered 6-10).

RULES — follow exactly:
- Extract ONLY what is actually printed. Never invent, translate, rewrite, summarize, complete, or "improve" anything.
- Ignore the section label "Telc Leseverstehen, Teil 2", Arabic text, QR codes, page numbers, checkboxes, and watermarks.
- TITLE = the German ARTICLE HEADLINE (the bold/large title above the article body). If you cannot clearly read it, set "title": null. Never guess.
- Transcribe all German text verbatim, including umlauts ä ö ü ß. Do NOT confuse ü with "ii".
- Transcribe exactly ONE version of every sentence. NEVER add an alternate reading, NEVER write "oder (...)" or parenthetical alternatives, and NEVER duplicate a word or phrase. Each option and the article must read as clean, complete, natural German with no repeated or dangling fragments.
- If a word or sentence is genuinely unreadable, transcribe your single best reading of what is printed — do not offer two options.
- ANSWER KEY: the correct option for each question is marked on the page (a filled/checked box, tick, or highlight next to one option). Report which option (a/b/c) is marked for each question. If no mark is visible for a question, omit it.

Return ONLY this JSON (no markdown fences):
{
  "title": string | null,
  "article": string | null,
  "questions": [ { "number": int, "text": string, "option_a": string, "option_b": string, "option_c": string } ],
  "answer_key": [ { "number": int, "answer": "a"|"b"|"c" } ],
  "notes": string | null
}`;

export async function extractT2Exercise(pngB64List: string[], extraInstruction?: string, signal?: AbortSignal): Promise<ExerciseExtraction> {
  const prompt = extraInstruction ? `${T2_EXERCISE_PROMPT}\n\nADDITIONAL: ${extraInstruction}` : T2_EXERCISE_PROMPT;
  const parsed = await getVisionProvider().generateJSON(prompt, pngB64List, signal);
  return {
    title: parsed.title ?? null,
    article: parsed.article ?? null,
    questions: parsed.questions ?? [],
    answer_key: parsed.answer_key ?? [],
    notes: parsed.notes ?? null,
  };
}

// ── Lesen Teil 1 exercise extraction (headlines + texts + matching key) ─────

export interface T1Headline { letter: string; text: string; }
export interface T1Text { number: number; title: string | null; body: string; }
export interface T1Answer { text_number: number; headline_letter: string; }
export interface T1Extraction { headlines: T1Headline[]; texts: T1Text[]; answer_key: T1Answer[]; notes: string | null; }

const T1_PROMPT = `You are extracting ONE complete TELC B2 German "Leseverstehen, Teil 1" exercise from the attached page image(s) into STRICT JSON.
Structure of this exercise: TEN headlines labelled a–j, FIVE numbered texts (1–5), and an answer key that matches each text to one headline.

RULES:
- Extract ONLY what is printed. Never invent, translate, rewrite, summarize, or complete anything. German verbatim with umlauts (ä ö ü ß).
- Ignore the section label "Leseverstehen, Teil 1", Arabic text, QR codes, page numbers, watermarks.
- HEADLINES: all ten, letters a–j, each with its exact printed text.
- TEXTS: the five numbered articles (1–5), each with optional printed title and the full body text.
- ANSWER KEY: each text (1–5) matches exactly one headline. The match is usually shown as a small number printed next to a headline (that number = the text it belongs to). Report as {text_number, headline_letter}. If you cannot read a match, omit it (do NOT guess).

Return ONLY this JSON (no fences):
{
  "headlines": [ { "letter": "a", "text": string }, … ten ],
  "texts": [ { "number": 1, "title": string|null, "body": string }, … five ],
  "answer_key": [ { "text_number": 1, "headline_letter": "e" }, … up to five ],
  "notes": string | null
}`;

export async function extractT1Exercise(pngB64List: string[], signal?: AbortSignal): Promise<T1Extraction> {
  const p = await getVisionProvider().generateJSON(T1_PROMPT, pngB64List, signal);
  return { headlines: p.headlines ?? [], texts: p.texts ?? [], answer_key: p.answer_key ?? [], notes: p.notes ?? null };
}

// ── Dedicated verbatim article extraction (one article page per call) ───────

const ARTICLE_PROMPT = `You are transcribing the ARTICLE BODY from one page of a scanned TELC B2 German "Leseverstehen, Teil 2" booklet into STRICT JSON.

ABSOLUTE RULES:
- Transcribe the German article text EXACTLY as printed — word for word, character for character.
- NO paraphrasing. NO correcting grammar or spelling. NO summarizing. NO interpreting. NO completing missing words. NO reordering.
- Preserve every umlaut (ä ö ü ß), every punctuation mark, and paragraph breaks. Never write "ii" for "ü".
- Ignore the section label "Telc Leseverstehen, Teil 2", Arabic text, QR codes, page numbers, and watermarks.
- Include the article HEADLINE/title as "title".
- If a word is genuinely illegible, write it as [unleserlich] rather than guessing — do NOT invent a word and do NOT skip it silently.
- Do NOT include the multiple-choice questions (numbered 6-10) — only the article body and its title/subtitle.

Return ONLY this JSON (no markdown fences):
{ "title": string | null, "article": string, "illegible_count": number, "notes": string | null }`;

export interface ArticleExtraction { title: string | null; article: string; illegible_count: number; notes: string | null; }

export async function extractArticleVerbatim(pngB64: string, signal?: AbortSignal): Promise<ArticleExtraction> {
  const parsed = await getVisionProvider().generateJSON(ARTICLE_PROMPT, [pngB64], signal);
  return { title: parsed.title ?? null, article: parsed.article ?? "", illegible_count: parsed.illegible_count ?? 0, notes: parsed.notes ?? null };
}

export async function classifyT2Page(pngB64: string, pageNum: number, signal?: AbortSignal): Promise<PageExtraction> {
  const parsed = await getVisionProvider().generateJSON(T2_PAGE_PROMPT, [pngB64], signal);
  return {
    page: pageNum,
    role: parsed.role ?? "other",
    article_headline: parsed.article_headline ?? null,
    article_text: parsed.article_text ?? null,
    questions: parsed.questions ?? null,
    answer_key: parsed.answer_key ?? null,
    notes: parsed.notes ?? null,
  };
}

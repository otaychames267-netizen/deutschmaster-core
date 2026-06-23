import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PDFDocument } from "pdf-lib";
import { LIMITS } from "@/lib/rate-limiter.server";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", ctx.userId).in("role", ["admin", "super_admin"]).limit(1);
  if (!data || data.length === 0) throw new Error("Forbidden: admin only");
}
async function assertSuperAdmin(ctx: Ctx) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "super_admin").limit(1);
  if (!data || data.length === 0) throw new Error("Forbidden: super_admin only");
}

/**
 * Create a PDF import row (exam or answer key).
 */
export const createPdfImportV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    storagePath: string;
    originalName: string;
    kind: "exam" | "answer_key" | "combined";
    level?: "b1" | "b2" | null;
    linkedImportId?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("pdf_imports")
      .insert({
        uploaded_by: context.userId,
        storage_path: data.storagePath,
        original_name: data.originalName,
        kind: data.kind,
        level: data.level ?? null,
        linked_import_id: data.linkedImportId ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create import");
    return { id: row.id as string };
  });

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Cost-optimised extraction stack:
// - flash-lite is the cheapest Gemini that still accepts PDF/image input and
//   handles verbatim OCR for TELC scans well.
// - flash (not pro) is the fallback. Pro is ~10× the price and rarely
//   needed for verbatim extraction; we'd rather mark a chunk for manual
//   review than burn credits on Pro.
// - 4 pages per chunk halves the number of API calls (and base64 re-uploads)
//   compared to the old 2-page chunks, with no measurable accuracy loss.
const EXTRACTION_MODEL = "google/gemini-2.5-flash-lite";
const EXTRACTION_FALLBACK_MODEL = "google/gemini-2.5-flash";
// 6 pages per chunk → ~33% fewer AI calls vs 4. flash-lite handles 6-page
// TELC scans without quality loss.
const CHUNK_PAGES = 6;
const GEMINI_TIMEOUT_MS = 85_000;

// Direct Google Generative Language API fallback. Used automatically when the
// Lovable AI Gateway returns 402 (credits exhausted) or 429 (rate limit) and
// the operator has provisioned a personal GEMINI_API_KEY.
const GEMINI_DIRECT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
function toDirectGeminiModel(model: string): string {
  // gateway form "google/gemini-2.5-flash" → direct form "gemini-2.5-flash"
  return model.replace(/^google\//, "");
}

type ExtractionMeta = {
  needs_manual_review?: boolean;
  manual_review_resolved?: boolean;
  manual_review_resolved_at?: string;
  manual_review_resolved_by?: string;
  low_confidence_items?: any[];
  models_detected?: string[];
  chunks_total?: number;
  chunks_completed?: number[];
  chunks_failed?: { chunk: number; pages: string; reason: string; model?: string }[];
  chunk_size?: number;
  diagnostics?: any[];
};

const ARABIC_TEXT_RX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const READABLE_TEXT_RX = /[A-Za-zÄÖÜäöüß0-9]/;
const DOMAIN_OR_EMAIL_RX = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/\S*)?\b|\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i;
const UNUSABLE_REASON_RX = /\b(unreadable|unlesbar|corrupt|corrupted|beschädigt|empty|missing|blank|no text|kein text|truncated|abgeschnitten|failed|failure|timeout)\b/i;
const HARD_FAILURE_REASON_RX = /\b(corrupt|corrupted|beschädigt|empty|missing|blank|no text|kein text|failed|failure|timeout)\b/i;

function isTrulyUnusableLowConfidenceItem(item: any) {
  const snippet = String(item?.snippet ?? "").trim();
  const reason = String(item?.reason ?? "");
  if (!snippet) return true;
  if (/\[\?\]|�|□|■|▯|◻/.test(snippet)) return true;
  const compact = snippet.replace(/\s/g, "");
  const meaningfulSnippet = snippet.replace(/\b(page|seite|chunk|teil)\b|\d+/gi, "").trim();
  if (HARD_FAILURE_REASON_RX.test(reason) && !/[A-Za-zÄÖÜäöüß]{4,}/.test(meaningfulSnippet)) return true;
  if (!READABLE_TEXT_RX.test(compact) && /[?]{2,}|[_-]{4,}|\.{4,}/.test(compact)) return true;
  if (UNUSABLE_REASON_RX.test(reason) && compact.length < 4) return true;
  return false;
}

function isNonExamLowConfidenceItem(item: any) {
  const snippet = String(item?.snippet ?? "").trim();
  const reason = String(item?.reason ?? "");
  if (isTrulyUnusableLowConfidenceItem(item)) return false;
  const hasArabicSignal = ARABIC_TEXT_RX.test(snippet) || /arabic|arabisch|arabischen|arabische|arabischer/i.test(reason);
  const hasGermanLatinText = /[A-Za-zÄÖÜäöüß]/.test(snippet);
  const onlyUnclearMarks = /^[?\s.,;:!()\[\]{}\-–—_"'`´]*$/.test(snippet);
  if (hasArabicSignal && (!hasGermanLatinText || onlyUnclearMarks)) return true;
  // Readable German/Latin text, umlauts, ß, domains, proper nouns, brand names,
  // and normal OCR confidence scores are informational. They must not block a
  // TELC import when all chunks/pages completed and the content is usable.
  if (READABLE_TEXT_RX.test(snippet) || DOMAIN_OR_EMAIL_RX.test(snippet)) return true;
  if (/ocr|confidence|low[-\s]?confidence|unsicher|wahrscheinlichkeit/i.test(reason)) return true;
  return true;
}

function getExtractionReviewState(meta: ExtractionMeta) {
  const lowConfidenceItems = Array.isArray(meta.low_confidence_items) ? meta.low_confidence_items : [];
  const blockingLowConfidenceItems = lowConfidenceItems.filter((item) => !isNonExamLowConfidenceItem(item));
  const ignoredLowConfidenceItems = lowConfidenceItems.filter((item) => isNonExamLowConfidenceItem(item));
  const failedChunks = Array.isArray(meta.chunks_failed) ? meta.chunks_failed : [];
  const completedChunks = Array.isArray(meta.chunks_completed) ? meta.chunks_completed : [];
  const chunksTotal = Number(meta.chunks_total ?? 0);
  const incomplete = chunksTotal > 0 && completedChunks.length < chunksTotal;
  const manualReviewResolved = Boolean(meta.manual_review_resolved);
  return {
    needsManualReview: Boolean(meta.needs_manual_review),
    manualReviewResolved,
    lowConfidenceItems,
    blockingLowConfidenceItems,
    ignoredLowConfidenceItems,
    failedChunks,
    completedChunks,
    chunksTotal,
    incomplete,
    canBuild: failedChunks.length === 0 && !incomplete && (manualReviewResolved || blockingLowConfidenceItems.length === 0),
  };
}

function normalizeItemNumber(value: any) {
  return String(value ?? "").trim().replace(/\.$/, "");
}

type SourcePassage = { title: string | null; text: string; page: number };
type SourceQuestion = {
  number: string;
  text: string;
  options: string[];
  correctAnswer: string | null;
  model: string | null;
  teil: number;
  page: number;
};
type SourceExerciseUnit = {
  sourceIndex: number;
  model: string | null;
  teil: number;
  questionPage: number;
  passagePages: number[];
  title: string | null;
  passageText: string | null;
  instruction: string;
  passageKey: string;
  questions: SourceQuestion[];
};

function normalizeModel(value: any): string | null {
  return value == null || value === "" ? null : String(value);
}

function questionOptionTexts(b: any): string[] {
  return Array.isArray(b?.options)
    ? b.options.map((o: any) => (o?.label ? `${String(o.label)}) ${String(o?.text ?? "")}` : String(o?.text ?? "")))
    : [];
}

function sourceBlockTeil(b: any, fallbackTeil: number): number {
  const n = Number(b?.teil);
  return Number.isFinite(n) && n > 0 ? n : fallbackTeil;
}

function sourcePassageText(passages: SourcePassage[]): string | null {
  const text = passages
    .map((p) => [p.title, p.text].filter(Boolean).join("\n"))
    .filter((t) => t.trim().length > 0)
    .join("\n\n")
    .trim();
  return text || null;
}

function buildSourceExerciseUnits(blocks: any[], moduleVal: string, teil: number): SourceExerciseUnit[] {
  const units: SourceExerciseUnit[] = [];
  let currentInstruction = "";
  let pendingPassages: SourcePassage[] = [];
  let activePassages: SourcePassage[] = [];
  let currentUnit: SourceExerciseUnit | null = null;

  for (const b of blocks) {
    const blockTeil = sourceBlockTeil(b, teil);
    if (blockTeil !== teil) continue;

    if (b?.type === "instruction") {
      currentInstruction = String(b.text ?? "");
      continue;
    }

    if (b?.type === "passage") {
      const text = String(b.text ?? "").trim();
      if (!text) continue;
      pendingPassages.push({ title: b.title ?? null, text, page: Number(b.page) || 0 });
      currentUnit = null;
      continue;
    }

    if (b?.type !== "question") continue;
    const blockModule = String(b?.module ?? "").toLowerCase();
    if (blockModule && blockModule !== moduleVal) continue;

    const page = Number(b.page) || 0;
    const passages = pendingPassages.length > 0 ? [...pendingPassages] : [...activePassages];
    const passageKey = passages.map((p) => `${p.page}:${p.title ?? ""}:${p.text}`).join("\n---\n");
    const question: SourceQuestion = {
      number: normalizeItemNumber(b.number ?? ""),
      text: String(b.text ?? ""),
      options: questionOptionTexts(b),
      correctAnswer: normalizeAnswerLetter(b.correct_answer),
      model: normalizeModel(b.model),
      teil,
      page,
    };

    // Only start a new unit when the reading passage changes.
    // Do NOT split on page: TELC exams routinely place the first 3 questions
    // on one page and the last 2 on the next, all referencing the same text.
    // Splitting by page would create two exercises sharing one passage — wrong.
    const shouldStartNewUnit =
      !currentUnit ||
      currentUnit.passageKey !== passageKey;

    if (shouldStartNewUnit) {
      const passageText = sourcePassageText(passages);
      currentUnit = {
        sourceIndex: units.length + 1,
        model: question.model,
        teil,
        questionPage: page,
        passagePages: [...new Set(passages.map((p) => p.page).filter(Boolean))],
        title: passages.find((p) => (p.title ?? "").trim())?.title ?? null,
        passageText,
        instruction: currentInstruction,
        passageKey,
        questions: [],
      };
      units.push(currentUnit);
    }

    if (!currentUnit) continue;
    currentUnit.questions.push(question);
    if (pendingPassages.length > 0) {
      activePassages = [...pendingPassages];
      pendingPassages = [];
    }
  }

  return units.filter((unit) => unit.questions.length > 0);
}

function normalizeAnswerLetter(value: any): string | null {
  // Include X/x: TELC Lesen Teil 3 uses "X" to mean "no matching text".
  const letter = String(value ?? "").trim().match(/[A-Ea-eXx]/)?.[0];
  return letter ? letter.toUpperCase() : null;
}

function unitQuestionRange(unit: SourceExerciseUnit) {
  const firstNum = unit.questions[0]?.number ?? String(unit.sourceIndex);
  const lastNum = unit.questions[unit.questions.length - 1]?.number ?? firstNum;
  return unit.questions.length > 1 ? `${firstNum}–${lastNum}` : firstNum;
}

function unitOriginalNumbering(unit: SourceExerciseUnit) {
  return `S.${unit.questionPage} ${unitQuestionRange(unit)}`;
}

function unitDiagnostic(unit: SourceExerciseUnit, reason: string) {
  return {
    sourceIndex: unit.sourceIndex,
    reason,
    page: unit.questionPage,
    passagePages: unit.passagePages,
    itemRange: unitQuestionRange(unit),
    questionCount: unit.questions.length,
    title: unit.title ?? `S.${unit.questionPage}`,
    textPreview: (unit.passageText ?? unit.questions[0]?.text ?? "").slice(0, 220),
  };
}

function buildUnbuiltPassageDiagnostics(blocks: any[], sourceUnits: SourceExerciseUnit[], teil: number) {
  const linkedPassagePages = new Set(sourceUnits.flatMap((unit) => unit.passagePages));
  return blocks
    .filter((b) => b?.type === "passage" && sourceBlockTeil(b, teil) === teil)
    .filter((b) => !linkedPassagePages.has(Number(b.page) || 0))
    .map((b, idx) => ({
      sourceIndex: sourceUnits.length + idx + 1,
      reason: "passage_detected_without_built_exercise_questions",
      page: Number(b.page) || 0,
      passagePages: [Number(b.page) || 0].filter(Boolean),
      itemRange: "",
      questionCount: 0,
      title: b.title ?? `S.${Number(b.page) || "?"}`,
      textPreview: String(b.text ?? "").slice(0, 220),
    }));
}

function buildAnswerLookup(blocks: any[], fallbackTeil = 0) {
  const exact = new Map<string, string>();
  const exactByPage = new Map<string, string>();
  const unmodelled = new Map<string, string>();
  const unmodelledByPage = new Map<string, string>();
  const conflicts: { key: string; answers: string[] }[] = [];
  const seenExact = new Map<string, Set<string>>();
  const seenExactByPage = new Map<string, Set<string>>();
  const seenUnmodelled = new Map<string, Set<string>>();
  const seenUnmodelledByPage = new Map<string, Set<string>>();
  for (const b of blocks) {
    if (b?.type !== "answer_key_entry") continue;
    const teil = sourceBlockTeil(b, fallbackTeil);
    const number = normalizeItemNumber(b.number);
    const answer = normalizeAnswerLetter(b.answer) ?? String(b.answer ?? "").trim().toUpperCase();
    // Do NOT skip when teil === 0: untagged answer entries are still valid.
    // They are stored with key "0::number" and matched via wildcard fallback.
    if (!number || !answer) continue;
    const page = Number(b.page) || 0;
    const model = normalizeModel(b.model);
    if (model) {
      const k = `${model}::${teil}::${number}`;
      const pk = `${k}::p${page}`;
      const set = seenExact.get(k) ?? new Set<string>();
      set.add(answer);
      seenExact.set(k, set);
      if (set.size === 1) exact.set(k, answer);
      const pset = seenExactByPage.get(pk) ?? new Set<string>();
      pset.add(answer);
      seenExactByPage.set(pk, pset);
      if (pset.size === 1) exactByPage.set(pk, answer);
    } else {
      const k = `${teil}::${number}`;
      const pk = `${k}::p${page}`;
      const set = seenUnmodelled.get(k) ?? new Set<string>();
      set.add(answer);
      seenUnmodelled.set(k, set);
      if (set.size === 1) unmodelled.set(k, answer);
      const pset = seenUnmodelledByPage.get(pk) ?? new Set<string>();
      pset.add(answer);
      seenUnmodelledByPage.set(pk, pset);
      if (pset.size === 1) unmodelledByPage.set(pk, answer);
    }
  }
  for (const [k, set] of seenExact) if (set.size > 1) exact.delete(k);
  for (const [k, set] of seenUnmodelled) if (set.size > 1) unmodelled.delete(k);
  for (const [k, set] of seenExactByPage) if (set.size > 1) { exactByPage.delete(k); conflicts.push({ key: k, answers: [...set] }); }
  for (const [k, set] of seenUnmodelledByPage) if (set.size > 1) { unmodelledByPage.delete(k); conflicts.push({ key: k, answers: [...set] }); }
  return {
    keyFor(q: SourceQuestion) {
      return q.model ? `${q.model}::${q.teil}::${q.number}` : `${q.teil}::${q.number}`;
    },
    getAnswer(q: SourceQuestion, usageCounts?: Map<string, number>) {
      if (q.correctAnswer) return q.correctAnswer;
      const exactKey = q.model ? `${q.model}::${q.teil}::${q.number}` : "";
      const nearbyPages = [q.page, q.page + 1, q.page - 1].filter((p) => Number.isFinite(p) && p > 0);
      const unmodelledKey = `${q.teil}::${q.number}`;
      const exactWildKey = q.model ? `${q.model}::0::${q.number}` : "";
      const unmodelledWildKey = `0::${q.number}`;
      for (const page of nearbyPages) {
        const exactPageKey = exactKey ? `${exactKey}::p${page}` : "";
        const unmodelledPageKey = `${unmodelledKey}::p${page}`;
        if (exactPageKey && exactByPage.has(exactPageKey)) return exactByPage.get(exactPageKey) ?? "";
        if (unmodelledByPage.has(unmodelledPageKey)) return unmodelledByPage.get(unmodelledPageKey) ?? "";
        const exactWildPageKey = exactWildKey ? `${exactWildKey}::p${page}` : "";
        if (exactWildPageKey && exactByPage.has(exactWildPageKey)) return exactByPage.get(exactWildPageKey) ?? "";
        if (unmodelledByPage.has(`${unmodelledWildKey}::p${page}`)) return unmodelledByPage.get(`${unmodelledWildKey}::p${page}`) ?? "";
      }
      if (exactKey && usageCounts && (usageCounts.get(exactKey) ?? 0) !== 1) return "";
      if (!exactKey && usageCounts && (usageCounts.get(unmodelledKey) ?? 0) !== 1) return "";
      return (exactKey ? exact.get(exactKey) : undefined)
        ?? unmodelled.get(unmodelledKey)
        ?? (exactWildKey ? exact.get(exactWildKey) : undefined)
        ?? unmodelled.get(unmodelledWildKey)
        ?? "";
    },
    count: exactByPage.size + unmodelledByPage.size,
    conflicts,
  };
}

function buildAnswerUsageCounts(units: SourceExerciseUnit[], lookup: ReturnType<typeof buildAnswerLookup>) {
  const counts = new Map<string, number>();
  for (const unit of units) for (const q of unit.questions) {
    const key = lookup.keyFor(q);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

const extractionSystemPrompt = `You are a verbatim TELC exam extractor. Your job is to TRANSCRIBE the PDF exactly as it appears.
Rules — never violate:
- Do NOT translate, paraphrase, summarize, simplify, improve, or invent content.
- Preserve original German text character-by-character including punctuation, capitalization, numbering, and item labels (A/B/C, 1./2./3., a)/b), etc.).
- Preserve section headers like "Teil 1", "Teil 2", "Lesen", "Hören", "Schreiben", "Sprachbausteine", "Mündlicher Ausdruck".
- If the PDF is scanned, OCR it. Preserve diacritics (ä ö ü ß).
- If you cannot read a character because it is genuinely unreadable/corrupted, transcribe as [?].
 - Add "low_confidence_items" ONLY for truly unreadable, corrupted, empty, or missing exam content. Do NOT add low-confidence entries merely for OCR confidence scores, German umlauts (ä ö ü ß), valid German vocabulary, proper nouns, brand names, or website/domain names.
 - You are FORBIDDEN from: translating, paraphrasing, summarizing, simplifying, "fixing" typos, normalizing punctuation, reordering items, renumbering, or generating any text that is not literally present in the PDF.
 - If the PDF contains MULTIPLE MODELS (e.g. "Modell 1", "Modell 2", "Modell 3", "Übungstest 1", "Test 2"), tag EVERY block with its "model" identifier ("1", "2", "3", …). If only one model is present, set "model" to null on every block.
- If the PDF is a COMBINED exam + answer key (Lösungsschlüssel / Lösungen / Antworten inside the same PDF), still emit "question" blocks for exercises AND "answer_key_entry" blocks for the solution table. Each answer_key_entry MUST carry the same "model" tag as its matching questions. NEVER copy a solution into a question or passage block — solutions stay in answer_key_entry blocks only.
- VISUAL ANSWER MARKERS (CRITICAL): Many TELC practice PDFs do NOT print a separate Lösungsschlüssel — instead the correct answer for each question is marked directly on the question itself by a small RED RECTANGLE / RED BOX / RED FRAME / RED CIRCLE / RED OVAL drawn around the correct option letter (a, b or c), or by red ink / red highlight / red underline / red tick on that letter. You MUST visually inspect each question and detect these red markings. For every question where you can see such a red marker around exactly one option letter:
    1. Set "correct_answer" on the "question" block to that UPPERCASE letter (e.g. "A", "B", "C").
    2. ALSO emit a matching "answer_key_entry" block with the same model/teil/number and answer = that letter.
  Treat any colored box/frame/circle that is clearly NOT black-text-on-white as a correct-answer marker (red is most common, but accept any non-black highlight). Do NOT include the red marker as part of the option text. If you cannot tell which letter is marked, leave correct_answer null and do NOT guess.
- RED-BOX ANSWER PAGES (CRITICAL): Some scanned PDFs show answer keys as answer sheets/tables where the correct letter (a/b/c) is surrounded by a small red box. These are OFFICIAL SOLUTIONS even if the page is not titled "Lösungsschlüssel". For every visible red-boxed/outlined letter on these pages, emit an "answer_key_entry" with the printed item number, answer letter, absolute page number, teil, and model when visible. Do NOT mark the page as missing or decorative just because it contains only answers.
- NUMBER REUSE SAFETY: If item numbers repeat across pages/models (e.g. several pages each contain 6–10), keep the absolute page number on every question and answer_key_entry so the builder can match answers page-by-page. Do not collapse repeated numbers into one global key.
- If the SAME reading text / passage is reused across several models (e.g. one text serves Modell 1, Modell 2 and Modell 3), emit ONE passage block per model — duplicate the passage verbatim and tag each copy with its respective "model". Do NOT merge models. Questions and answer_key_entry blocks for each model must remain isolated.
 - PRESERVE SOURCE EXACTLY: every printed exercise/question-page is a separate source unit. If a topic, title, passage, question number, wording, answer option, or correct answer repeats or looks 99% similar, still extract it separately. Similarity is NEVER duplication.
 - GERMAN-ONLY OUTPUT: The output must contain ONLY the original German exam content. If the PDF contains Arabic text, Arabic translations, bilingual annotations, translator notes, glossaries, or any non-German explanation alongside the exam material, IGNORE them completely and do not include them in any block. Do not translate Arabic back to German — only extract the German that already exists in the PDF. Other foreign quotations that are part of the exam text itself (e.g. an English word inside a German reading passage) are kept verbatim.
 - IGNORE INDEX / OVERVIEW PAGES: Many TELC PDFs start with a "Themenliste", table of contents, or topic-overview page that lists only titles (e.g. "Parking", "Traumfrau", "Verpackungen", "Ernährung", "Kreditkarten", "Karneval", "Kellner"), sometimes with Arabic translations next to each title. These pages are NOT exercises. Do NOT emit passage, instruction, question or answer_key_entry blocks for them. You may emit a single "section" block named "Themenliste" if useful, but never invent questions from a topic list.
 - IGNORE OWNER / DISTRIBUTION METADATA: Do NOT emit blocks containing WhatsApp group names, Telegram/Facebook groups, channel names, owner names, translator credits, file names, watermarks, copyright notes, page footers, or non-exam headers (e.g. "Fließend Deutsch B2 Telc – Inssaf", "Gruppe WhatsApp", phone numbers, social handles, URLs that are not part of the printed exam text). Strip these silently — never include them in passage / instruction / question / option text.
 - A "real exercise" requires at least one of: (a) an instruction + a passage with associated questions, (b) a question with answer choices, or (c) a matching/cloze task. A bare list of topic titles is NOT a real exercise and must be skipped.
- TELC MATCHING EXERCISES — X IS A VALID ANSWER (CRITICAL):
  * TELC Lesen Teil 2 (Zuordnung): 5 reading texts (A–E) + 10 statements. For each statement, the answer is the letter of the matching text (A, B, C, D, or E) OR "X" if no text matches. Exactly 5 of the 10 statements intentionally have no matching text — their official answer is "X". X is NOT a missing answer; X is the CORRECT official answer.
  * TELC Lesen Teil 3 (Zuordnung): multiple texts + questions 11–20. Same rule: answer = A/B/C/D/E or X.
  * In every answer_key_entry for matching exercises where the answer is "X" (kein passender Text / keine passende Überschrift), set "answer": "X". NEVER drop, replace, or leave blank an X answer.
  * Do NOT force a match: if the official answer is X, emit "answer": "X" — never guess a letter.
  * The 5 reading texts themselves (A–E) must be emitted as separate "passage" blocks, each with its letter as the title (e.g. "title": "A", or the actual text heading). Never merge the texts into one block.
- TELC LESEN TEIL 1 (Mehrfachwahl): One main text + 5–10 questions, each with options a, b, c. Extract as "question" blocks with options array. The correct answer is a, b, or c.
- TELC SPRACHBAUSTEINE: Cloze/gap-fill text with numbered blanks. Each blank is a "question" block. Options are the multiple-choice answers for that blank.
- TELC HÖREN: Questions about audio clips. Questions + options extracted verbatim. No audio transcription — emit "audio_ref" blocks for audio references.
- TELC SCHREIBEN / MÜNDLICH: Task descriptions and prompts. Extract the full task text as a "passage" or "instruction" block. No invented answers.
 - STRICT JSON: Return ONLY valid JSON. Use double quotes for all strings. Escape every double quote inside a string as \\". Escape newlines inside strings as \\n. Do not emit trailing commas, comments, single quotes around keys, or markdown code fences. Keep each "text" value as a single JSON string with newlines escaped. Prefer shorter passage chunks over emitting unescaped control characters.

Return STRICT JSON with this shape (no markdown fences):
{
  "kind": "exam" | "answer_key" | "combined",
  "level": "b1" | "b2" | null,
  "page_count": number,
  "needs_manual_review": boolean,
  "models_detected": [string],
  "low_confidence_items": [{ "page": number, "teil": number|null, "reason": string, "snippet": string }],
  "blocks": [
    { "type": "section",     "model": string|null, "teil": number|null, "module": string|null, "text": string, "page": number },
    { "type": "instruction", "model": string|null, "teil": number|null, "text": string, "page": number },
    { "type": "passage",     "model": string|null, "teil": number|null, "title": string|null, "text": string, "page": number },
    { "type": "question",    "model": string|null, "teil": number|null, "number": string, "text": string, "options": [{"label":"a","text":"..."}], "correct_answer": string|null, "page": number },
    { "type": "answer_key_entry", "model": string|null, "teil": number|null, "number": string, "answer": string, "page": number },
    { "type": "image_ref",   "model": string|null, "teil": number|null, "description": string, "page": number },
    { "type": "audio_ref",   "model": string|null, "teil": number|null, "description": string, "page": number }
  ]
}
Include answer_key_entry blocks if this is an answer-key (Lösungsschlüssel) OR a combined PDF.`;

function userInstructionFor(kind: string) {
  const xRule = "IMPORTANT: For matching exercises (Lesen Teil 2/3 Zuordnung), the answer X means 'kein passender Text' — no matching text. X is an OFFICIAL correct answer. Always emit answer_key_entry blocks with \"answer\": \"X\" when the official solution is X. Never drop, replace, or leave X answers blank.";
  if (kind === "answer_key") return `This is a TELC answer key (Lösungsschlüssel). Extract every item number with its correct answer verbatim. Correct answers may be visually marked by small red boxes/frames around a, b, c, or x; treat those red-boxed letters as official answer_key_entry blocks. ${xRule}`;
  if (kind === "combined") return `This is a COMBINED TELC PDF that contains both exam content (texts, questions, options) AND the answer key (Lösungsschlüssel / Lösungen). Extract everything verbatim. If multiple Modelle/Übungstests are present, tag every block with its model number. Emit answer_key_entry blocks for the solution table(s) using the same model tag. Correct answers may be marked by small red boxes around a/b/c/x on answer pages or directly on question pages; visually inspect them and emit answer_key_entry blocks with absolute page numbers. ${xRule}`;
  return `This is a TELC exam paper. Extract every instruction, text, question, and option verbatim. If correct answers are visibly marked by red boxes/frames around option letters (including X for matching exercises), also emit answer_key_entry blocks for those marked letters. ${xRule}`;
}

function safeJson(value: unknown) {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function utf8Bytes(text: string) {
  return new TextEncoder().encode(text).byteLength;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.slice(i, i + step));
  }
  return btoa(binary);
}

async function appendImportLog(supabase: any, importId: string, entry: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  const { data } = await supabase.from("pdf_imports").select("notes").eq("id", importId).maybeSingle();
  const next = `${data?.notes ? `${data.notes}\n` : ""}${line}`.slice(-120_000);
  await supabase.from("pdf_imports").update({ notes: next, extraction_started_at: new Date().toISOString() }).eq("id", importId);
  try { console.log("[extractPdfVerbatim]", line); } catch {}
}

function flattenBlocks(blocks: any[], startPage: number, endPage: number): any[] {
  const out: any[] = [];
  // Patterns for owner/distribution noise that must never appear in exam content.
  const NOISE_RX = /(whats\s*app|telegram|facebook|instagram|tiktok|youtube|gruppe\s+whatsapp|fließend\s+deutsch.*telc|inssaf|t\.me\/|wa\.me\/|https?:\/\/|©|copyright|all rights reserved)/i;
  const ARABIC_RX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const stripArabic = (s: string) => s.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, "").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([.,;:!?])/g, "$1").trim();
  const isNoiseText = (s: string) => {
    const t = (s ?? "").trim();
    if (!t) return true;
    if (NOISE_RX.test(t)) return true;
    return false;
  };
  // A "themenliste" / index passage is mostly short title-lines and no real sentences.
  const isIndexPassage = (text: string) => {
    const t = (text ?? "").trim();
    if (!t) return false;
    const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Require ≥6 lines: real exam passages are always longer than a topic list,
    // so a low line count means it is almost certainly NOT an index page.
    // The 75% threshold stays but acts on a higher baseline so short reading
    // passages (3-5 lines) are never incorrectly classified as Themenliste.
    if (lines.length < 6) return false;
    const titleLike = lines.filter((l) => l.length <= 40 && !/[.!?]$/.test(l)).length;
    return titleLike / lines.length >= 0.75;
  };
  const visit = (b: any) => {
    if (!b || typeof b !== "object") return;
    if (Array.isArray(b.blocks)) for (const child of b.blocks) visit(child);
    const rawType = String(b.type ?? "").toLowerCase();
    const type = ["section", "instruction", "passage", "question", "answer_key_entry", "image_ref", "audio_ref"].includes(rawType) ? rawType : null;
    if (!type) return;
    const p = Number(b.page);
    const page = Number.isFinite(p) && p > 0 && p <= (endPage - startPage + 1)
      ? startPage + p - 1
      : Number.isFinite(p) && p >= startPage && p <= endPage ? p : startPage;
    const model = ["multiple_choice", "true_false", "cloze", "matching", "open_text"].includes(String(b.model ?? "")) ? null : (b.model ?? null);
    const teil = b.teil == null || b.teil === "" ? null : Number(b.teil);
    const base: any = { ...b, type, model, teil: Number.isFinite(teil) ? teil : null, page };
    if (type === "question") {
      base.number = String(b.number ?? b.question_number ?? b.id ?? "");
      base.text = stripArabic(String(b.text ?? b.question ?? ""));
      const markerRx = /[✅☑✓✔]/;
      base.options = Array.isArray(b.options)
        ? b.options.map((o: any) => {
          const rawLabel = String(o.label ?? o.id ?? "");
          const rawText = String(o.text ?? "");
          const checked = Boolean(o.correct ?? o.is_correct ?? o.checked) || markerRx.test(rawLabel) || markerRx.test(rawText);
          const label = rawLabel.replace(/[✅☑✓✔⬜□☐]/g, "").trim();
          const text = stripArabic(rawText.replace(/[✅☑✓✔⬜□☐]/g, ""));
          if (checked && !base.correct_answer) base.correct_answer = label.match(/[A-EXa-ex]/)?.[0]?.toUpperCase() ?? null;
          return { label, text };
        })
        : [];
      if (!base.correct_answer && b.correct_answer) base.correct_answer = String(b.correct_answer).trim().toUpperCase();
      if (isNoiseText(base.text) && base.options.length === 0) return;
    } else if (type === "instruction") {
      base.text = stripArabic(String(b.text ?? ""));
      if (isNoiseText(base.text)) return;
    } else if (type === "passage") {
      base.text = stripArabic(String(b.text ?? ""));
      if (isNoiseText(base.text)) return;
      if (isIndexPassage(base.text)) return; // skip Themenliste / index pages
      // Title may keep Arabic per spec (helps identify topics), but strip noise tokens.
      if (b.title) base.title = String(b.title);
    } else if (type === "answer_key_entry") {
      base.answer = stripArabic(String(b.answer ?? ""));
      if (!base.answer) return;
    }
    out.push(base);
  };
  for (const b of blocks) visit(b);
  return out;
}

async function downloadPdf(supabase: any, storagePath: string) {
  const { data: file, error } = await supabase.storage.from("pdf-imports").download(storagePath);
  if (error || !file) throw new Error(`Storage download failed: ${error?.message ?? "no file"} (path=${storagePath})`);
  const buf = new Uint8Array(await (file as Blob).arrayBuffer());
  if (buf.byteLength === 0) throw new Error(`Downloaded PDF is empty (0 bytes, path=${storagePath})`);
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  return { buf, doc, totalPages: doc.getPageCount() };
}

async function upsertExtraction(supabase: any, importId: string, blocks: any[], pageCount: number, meta: ExtractionMeta) {
  const { data: existing } = await supabase.from("pdf_extractions").select("id").eq("import_id", importId).maybeSingle();
  const row = { blocks, page_count: pageCount, raw_text: JSON.stringify(meta) };
  const q = existing?.id
    ? supabase.from("pdf_extractions").update(row).eq("id", existing.id)
    : supabase.from("pdf_extractions").insert({ import_id: importId, ...row });
  const { error } = await q;
  if (error) throw new Error(error.message);
}

function detectTruncated(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  let braces = 0, brackets = 0, inStr = false, esc = false;
  for (const c of t) {
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") braces++;
    else if (c === "}") braces--;
    else if (c === "[") brackets++;
    else if (c === "]") brackets--;
  }
  return inStr || braces !== 0 || brackets !== 0;
}

/** Robust JSON extraction: strip code fences, slice to JSON span, sanitize control chars,
 * drop trailing commas, close any unbalanced quotes/brackets/braces. Used as a fallback
 * after a strict JSON.parse fails so a single malformed chunk does not kill the import. */
function repairAndParseJson(raw: string): { parsed: any; repaired: boolean; note?: string } {
  if (raw == null) throw new Error("empty response");
  let s = String(raw).trim();
  // strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // strict parse first
  try { return { parsed: JSON.parse(s), repaired: false }; } catch {}

  // slice to outermost JSON span
  const start = s.search(/[\{\[]/);
  if (start === -1) throw new Error("no JSON object found");
  const opener = s[start];
  const closer = opener === "{" ? "}" : "]";
  const lastClose = s.lastIndexOf(closer);
  let body = lastClose > start ? s.slice(start, lastClose + 1) : s.slice(start);

  // remove raw control characters that frequently appear inside string values
  // when Gemini emits a literal newline instead of \n
  body = body.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // collapse trailing commas before } or ]
  body = body.replace(/,(\s*[}\]])/g, "$1");

  try { return { parsed: JSON.parse(body), repaired: true, note: "sliced+sanitized" }; } catch {}

  // walk the string and balance quotes/brackets so we can salvage a truncated tail
  let inStr = false, esc = false;
  let braces = 0, brackets = 0;
  let lastSafe = -1;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") braces++;
    else if (c === "}") { braces--; if (braces >= 0 && brackets >= 0) lastSafe = i; }
    else if (c === "[") brackets++;
    else if (c === "]") { brackets--; if (braces >= 0 && brackets >= 0) lastSafe = i; }
  }

  // truncate to the last balanced position
  let cand = lastSafe > 0 ? body.slice(0, lastSafe + 1) : body;
  // close anything still open (best effort)
  inStr = false; esc = false; braces = 0; brackets = 0;
  for (const c of cand) {
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") braces++; else if (c === "}") braces--;
    else if (c === "[") brackets++; else if (c === "]") brackets--;
  }
  if (inStr) cand += '"';
  while (brackets-- > 0) cand += "]";
  while (braces-- > 0) cand += "}";
  cand = cand.replace(/,(\s*[}\]])/g, "$1");

  try { return { parsed: JSON.parse(cand), repaired: true, note: "rebalanced" }; }
  catch (e: any) { throw new Error(`JSON repair failed: ${e?.message ?? e}`); }
}

async function callGeminiChunkOnce(args: {
  apiKey: string; importId: string; supabase: any; kind: string; chunkIndex: number; totalChunks: number;
  startPage: number; endPage: number; totalPages: number; pdfBytes: Uint8Array; dimensions: any[];
  model: string; attempt: number;
}) {
  // If no Lovable API key is configured but a personal Gemini key is, skip
  // the gateway entirely and call Google directly.
  if (!args.apiKey && process.env.GEMINI_API_KEY) {
    return await callGeminiDirectOnce({ ...args });
  }
  const b64 = bytesToBase64(args.pdfBytes);
  const chunkInstruction = `${userInstructionFor(args.kind)}\n\nThis is chunk ${args.chunkIndex + 1} of ${args.totalChunks}. It contains PDF pages ${args.startPage}–${args.endPage} of a ${args.totalPages}-page document. In every block, set "page" to the ABSOLUTE page number in the full document (pages in this chunk are ${args.startPage}–${args.endPage}). Extract every block on these pages verbatim. Do not skip pages. If the PDF contains Arabic text or bilingual annotations, IGNORE the Arabic completely and extract only the German content. Return STRICT JSON only — no markdown, no comments, no trailing commas. Escape every double quote and newline inside string values.`;
  const body = {
    model: args.model,
    messages: [
      { role: "system", content: extractionSystemPrompt },
      { role: "user", content: [
        { type: "text", text: chunkInstruction },
        { type: "file", file: { filename: `exam-chunk-${args.chunkIndex + 1}.pdf`, file_data: `data:application/pdf;base64,${b64}` } },
      ] },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    // 32000 tokens accommodates the densest 6-page TELC chunks (long reading
    // passages + 5 questions × 3 options + answer key table) without truncation.
    // 16000 was the previous value and caused tail questions to be silently cut.
    max_tokens: 32000,
  };
  const payload = JSON.stringify(body);
  await appendImportLog(args.supabase, args.importId, {
    event: "gemini_request_sent", model: args.model, attempt: args.attempt, chunk: `${args.chunkIndex + 1}/${args.totalChunks}`,
    pages: `${args.startPage}-${args.endPage}`, requestBytes: utf8Bytes(payload), pdfChunkBytes: args.pdfBytes.byteLength,
    fileParts: 1, imageParts: 0, imageDimensions: "n/a: PDF is sent directly; no PDF-to-image conversion is performed", pdfPageDimensions: args.dimensions,
  });
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const resp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": args.apiKey, "X-Lovable-AIG-SDK": "raw-pdf-extraction" },
      body: payload,
    });
    const rawBody = await resp.text();
    const durationMs = Date.now() - started;
    await appendImportLog(args.supabase, args.importId, {
      event: "gemini_response_received", model: args.model, attempt: args.attempt, chunk: `${args.chunkIndex + 1}/${args.totalChunks}`,
      status: resp.status, ok: resp.ok, durationMs, responseBytes: utf8Bytes(rawBody), rawBody: rawBody.slice(0, 12_000),
    });
    if (!resp.ok) {
      // If Lovable AI Gateway is out of credits or rate-limited, try the
      // operator-provided GEMINI_API_KEY against Google's direct API.
      if ((resp.status === 402 || resp.status === 429) && process.env.GEMINI_API_KEY) {
        await appendImportLog(args.supabase, args.importId, {
          event: "gemini_direct_fallback_triggered", model: args.model, attempt: args.attempt,
          chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, gatewayStatus: resp.status,
        });
        const direct = await callGeminiDirectOnce({ ...args });
        return direct;
      }
      if (resp.status === 429) throw new Error(`AI rate limit on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${rawBody}`);
      if (resp.status === 402) throw new Error(`AI credits exhausted on chunk ${args.chunkIndex + 1}/${args.totalChunks} (set GEMINI_API_KEY to enable direct Gemini fallback): ${rawBody}`);
      throw new Error(`Gemini extraction failed on chunk ${args.chunkIndex + 1}/${args.totalChunks} (HTTP ${resp.status}, pages ${args.startPage}-${args.endPage}): ${rawBody.slice(0, 1200) || "<empty body>"}`);
    }
    let gatewayJson: any;
    try { gatewayJson = JSON.parse(rawBody); }
    catch (e: any) { throw new Error(`Gemini gateway response was not JSON on chunk ${args.chunkIndex + 1}: ${e?.message ?? e}. Raw: ${rawBody.slice(0, 1200)}`); }
    const content = gatewayJson?.choices?.[0]?.message?.content ?? "{}";
    const finishReason = gatewayJson?.choices?.[0]?.finish_reason ?? gatewayJson?.choices?.[0]?.finishReason ?? null;
    if (typeof content === "string" && content.trim().length < 5) throw new Error(`Gemini returned empty content on chunk ${args.chunkIndex + 1}/${args.totalChunks} (finish_reason=${finishReason ?? "?"}).`);
    let parsed: any;
    let repaired = false;
    let repairNote: string | undefined;
    if (typeof content !== "string") {
      parsed = content;
    } else {
      try { parsed = JSON.parse(content); }
      catch (firstErr: any) {
        try {
          const r = repairAndParseJson(content);
          parsed = r.parsed; repaired = true; repairNote = r.note;
          await appendImportLog(args.supabase, args.importId, {
            event: "gemini_json_repaired", chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, model: args.model,
            attempt: args.attempt, repairNote, finishReason, firstError: String(firstErr?.message ?? firstErr).slice(0, 500),
            truncatedHeuristic: detectTruncated(content), contentBytes: utf8Bytes(content),
            contentTail: content.slice(-800),
          });
        } catch (repairErr: any) {
          await appendImportLog(args.supabase, args.importId, {
            event: "gemini_json_unrecoverable", chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, model: args.model,
            attempt: args.attempt, finishReason, firstError: String(firstErr?.message ?? firstErr).slice(0, 500),
            repairError: String(repairErr?.message ?? repairErr).slice(0, 500),
            contentBytes: utf8Bytes(content), contentHead: content.slice(0, 2000), contentTail: content.slice(-2000),
          });
          throw new Error(`Could not parse Gemini JSON on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${firstErr?.message ?? firstErr} | repair: ${repairErr?.message ?? repairErr}`);
        }
      }
    }
    return { parsed, finishReason, usage: gatewayJson?.usage, durationMs, repaired, repairNote };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const msg = err?.name === "AbortError"
      ? `Gemini request timed out locally after ${GEMINI_TIMEOUT_MS}ms before a response arrived.`
      : String(err?.message ?? err);
    await appendImportLog(args.supabase, args.importId, { event: "gemini_request_failed", model: args.model, attempt: args.attempt, chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, durationMs, error: msg, stack: String(err?.stack ?? "").slice(0, 4000) });
    throw new Error(msg);
  } finally {
    clearTimeout(timeout);
  }
}

/** Call Gemini for a single chunk with automatic retry + model fallback.
 * Order: flash attempt 1 → flash attempt 2 → pro attempt 1. Returns the last
 * successful parsed payload or throws after the final attempt. */
type CallChunkArgs = Omit<Parameters<typeof callGeminiChunkOnce>[0], "model" | "attempt">;
async function callGeminiChunk(args: CallChunkArgs) {
  // 4 attempts with exponential backoff so transient 429s on the gateway
  // (single biggest cause of "extraction_failed" so far) don't poison an
  // otherwise-good chunk. Each attempt that returns 429/timeout waits longer.
  const attempts: { model: string; backoffMs: number }[] = [
    { model: EXTRACTION_MODEL, backoffMs: 0 },
    { model: EXTRACTION_MODEL, backoffMs: 4_000 },
    { model: EXTRACTION_MODEL, backoffMs: 12_000 },
    { model: EXTRACTION_FALLBACK_MODEL, backoffMs: 8_000 },
  ];
  let lastErr: any;
  for (let i = 0; i < attempts.length; i++) {
    try {
      if (attempts[i].backoffMs > 0) {
        await new Promise((r) => setTimeout(r, attempts[i].backoffMs));
      }
      return await callGeminiChunkOnce({ ...args, model: attempts[i].model, attempt: i + 1 });
    } catch (e: any) {
      lastErr = e;
      // do not retry on credit exhaustion
      if (/credits exhausted/i.test(String(e?.message ?? ""))) throw e;
      await appendImportLog(args.supabase, args.importId, {
        event: "chunk_attempt_failed", chunk: `${args.chunkIndex + 1}/${args.totalChunks}`,
        attempt: i + 1, model: attempts[i].model, error: String(e?.message ?? e).slice(0, 1200),
      });
    }
  }
  throw lastErr ?? new Error("Gemini chunk failed after all retries");
}

/** Direct Google Generative Language API call. Used when the Lovable AI
 *  Gateway returns 402/429 and a personal GEMINI_API_KEY is configured.
 *  Returns the same shape as callGeminiChunkOnce. */
async function callGeminiDirectOnce(args: {
  importId: string; supabase: any; kind: string; chunkIndex: number; totalChunks: number;
  startPage: number; endPage: number; totalPages: number; pdfBytes: Uint8Array; dimensions: any[];
  model: string; attempt: number;
}) {
  const directKey = process.env.GEMINI_API_KEY;
  if (!directKey) throw new Error("GEMINI_API_KEY missing; cannot use direct Gemini fallback");
  const directModel = toDirectGeminiModel(args.model);
  const b64 = bytesToBase64(args.pdfBytes);
  const chunkInstruction = `${userInstructionFor(args.kind)}\n\nThis is chunk ${args.chunkIndex + 1} of ${args.totalChunks}. It contains PDF pages ${args.startPage}–${args.endPage} of a ${args.totalPages}-page document. In every block, set "page" to the ABSOLUTE page number in the full document (pages in this chunk are ${args.startPage}–${args.endPage}). Extract every block on these pages verbatim. Do not skip pages. If the PDF contains Arabic text or bilingual annotations, IGNORE the Arabic completely and extract only the German content. Return STRICT JSON only — no markdown, no comments, no trailing commas. Escape every double quote and newline inside string values.`;
  const body = {
    systemInstruction: { role: "system", parts: [{ text: extractionSystemPrompt }] },
    contents: [{
      role: "user",
      parts: [
        { text: chunkInstruction },
        { inlineData: { mimeType: "application/pdf", data: b64 } },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 16000, responseMimeType: "application/json" },
  };
  const payload = JSON.stringify(body);
  await appendImportLog(args.supabase, args.importId, {
    event: "gemini_direct_request_sent", model: directModel, attempt: args.attempt,
    chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, pages: `${args.startPage}-${args.endPage}`,
    requestBytes: utf8Bytes(payload), pdfChunkBytes: args.pdfBytes.byteLength,
  });
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const url = `${GEMINI_DIRECT_BASE}/${directModel}:generateContent?key=${encodeURIComponent(directKey)}`;
    const resp = await fetch(url, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: payload,
    });
    const rawBody = await resp.text();
    const durationMs = Date.now() - started;
    await appendImportLog(args.supabase, args.importId, {
      event: "gemini_direct_response_received", model: directModel, attempt: args.attempt,
      chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, status: resp.status, ok: resp.ok,
      durationMs, responseBytes: utf8Bytes(rawBody), rawBody: rawBody.slice(0, 12_000),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw new Error(`Direct Gemini rate limit on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${rawBody.slice(0, 800)}`);
      throw new Error(`Direct Gemini failed on chunk ${args.chunkIndex + 1}/${args.totalChunks} (HTTP ${resp.status}): ${rawBody.slice(0, 1200) || "<empty body>"}`);
    }
    let apiJson: any;
    try { apiJson = JSON.parse(rawBody); }
    catch (e: any) { throw new Error(`Direct Gemini response was not JSON on chunk ${args.chunkIndex + 1}: ${e?.message ?? e}`); }
    const parts = apiJson?.candidates?.[0]?.content?.parts ?? [];
    const content = parts.map((p: any) => typeof p?.text === "string" ? p.text : "").join("");
    const finishReason = apiJson?.candidates?.[0]?.finishReason ?? null;
    if (typeof content !== "string" || content.trim().length < 5) {
      throw new Error(`Direct Gemini returned empty content on chunk ${args.chunkIndex + 1}/${args.totalChunks} (finish_reason=${finishReason ?? "?"}).`);
    }
    let parsed: any;
    let repaired = false;
    let repairNote: string | undefined;
    try { parsed = JSON.parse(content); }
    catch (firstErr: any) {
      try {
        const r = repairAndParseJson(content);
        parsed = r.parsed; repaired = true; repairNote = r.note;
        await appendImportLog(args.supabase, args.importId, {
          event: "gemini_direct_json_repaired", chunk: `${args.chunkIndex + 1}/${args.totalChunks}`,
          model: directModel, attempt: args.attempt, repairNote, finishReason,
          firstError: String(firstErr?.message ?? firstErr).slice(0, 500),
        });
      } catch (repairErr: any) {
        throw new Error(`Could not parse direct Gemini JSON on chunk ${args.chunkIndex + 1}/${args.totalChunks}: ${firstErr?.message ?? firstErr} | repair: ${repairErr?.message ?? repairErr}`);
      }
    }
    return { parsed, finishReason, usage: apiJson?.usageMetadata, durationMs, repaired, repairNote };
  } catch (err: any) {
    const durationMs = Date.now() - started;
    const msg = err?.name === "AbortError"
      ? `Direct Gemini request timed out locally after ${GEMINI_TIMEOUT_MS}ms before a response arrived.`
      : String(err?.message ?? err);
    await appendImportLog(args.supabase, args.importId, {
      event: "gemini_direct_request_failed", model: directModel, attempt: args.attempt,
      chunk: `${args.chunkIndex + 1}/${args.totalChunks}`, durationMs, error: msg,
      stack: String(err?.stack ?? "").slice(0, 4000),
    });
    throw new Error(msg);
  } finally {
    clearTimeout(timeout);
  }
}

export const startPdfExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string; resume?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY ?? "";
    if (!apiKey && !process.env.GEMINI_API_KEY) throw new Error("Neither LOVABLE_API_KEY nor GEMINI_API_KEY is set in the server environment");
    const { data: imp, error: impErr } = await context.supabase.from("pdf_imports").select("id, storage_path, kind, level").eq("id", data.importId).single();
    if (impErr || !imp) throw new Error(impErr?.message ?? "Import not found");
    const { buf, doc, totalPages } = await downloadPdf(context.supabase, imp.storage_path);
    const pageDimensions = Array.from({ length: totalPages }, (_, i) => {
      const p = doc.getPage(i); return { page: i + 1, width: p.getWidth(), height: p.getHeight() };
    });
    const chunkCount = Math.ceil(totalPages / CHUNK_PAGES);

    // Content-hash cache: if the exact same PDF bytes were already extracted
    // for another import, copy its blocks instead of re-billing the AI.
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const contentHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    await context.supabase.from("pdf_imports").update({ content_hash: contentHash }).eq("id", data.importId);
    if (!data.resume) {
      const { data: twin } = await context.supabase
        .from("pdf_imports")
        .select("id, status")
        .eq("content_hash", contentHash)
        .neq("id", data.importId)
        .eq("status", "extracted")
        .limit(1)
        .maybeSingle();
      if (twin?.id) {
        const { data: src } = await context.supabase
          .from("pdf_extractions").select("blocks, raw_text, page_count").eq("import_id", twin.id).maybeSingle();
        if (src?.blocks) {
          let srcMeta: ExtractionMeta = {};
          try { srcMeta = src.raw_text ? JSON.parse(src.raw_text) : {}; } catch {}
          const srcBlocks = Array.isArray(src.blocks) ? (src.blocks as any[]) : [];
          await upsertExtraction(context.supabase, data.importId, srcBlocks, src.page_count ?? totalPages, { ...srcMeta, diagnostics: [{ event: "cache_hit", source_import_id: twin.id }] });
          await context.supabase.from("pdf_imports").update({ status: "extracted", error_message: null, extraction_started_at: new Date().toISOString() }).eq("id", data.importId);
          await appendImportLog(context.supabase, data.importId, { event: "extraction_cache_hit", source_import_id: twin.id, contentHash, totalPages, blocks: srcBlocks.length });
          return { ok: true, cached: true, sourceImportId: twin.id, model: EXTRACTION_MODEL, totalPages, chunkSize: CHUNK_PAGES, chunkCount, fileBytes: buf.byteLength, completedChunks: Array.from({ length: chunkCount }, (_, i) => i), resumed: false };
        }
      }
    }

    // Resumable extraction: when the admin re-runs an extraction, preserve
    // already-extracted blocks + chunks_completed so we never re-bill chunks
    // that already succeeded. Only chunks_failed is cleared so failed chunks
    // get a fresh attempt.
    const { data: existing } = await context.supabase
      .from("pdf_extractions").select("blocks, raw_text").eq("import_id", data.importId).maybeSingle();
    let prevMeta: ExtractionMeta = {};
    try { prevMeta = existing?.raw_text ? JSON.parse(existing.raw_text) : {}; } catch { prevMeta = {}; }
    const prevCompleted = Array.isArray(prevMeta.chunks_completed) ? prevMeta.chunks_completed.filter((n) => Number.isInteger(n) && n >= 0 && n < chunkCount) : [];
    const resume = Boolean(data.resume) && prevCompleted.length > 0;
    const keptBlocks = resume && Array.isArray(existing?.blocks) ? existing!.blocks : [];
    const meta: ExtractionMeta = {
      needs_manual_review: false,
      manual_review_resolved: resume ? Boolean(prevMeta.manual_review_resolved) : false,
      manual_review_resolved_at: resume ? prevMeta.manual_review_resolved_at : undefined,
      manual_review_resolved_by: resume ? prevMeta.manual_review_resolved_by : undefined,
      low_confidence_items: resume && Array.isArray(prevMeta.low_confidence_items) ? prevMeta.low_confidence_items : [],
      models_detected: resume && Array.isArray(prevMeta.models_detected) ? prevMeta.models_detected : [],
      chunks_total: chunkCount,
      chunks_completed: resume ? prevCompleted : [],
      chunks_failed: [], // always reset — re-run gives failures a fresh attempt
      chunk_size: CHUNK_PAGES,
      diagnostics: [],
    };
    await context.supabase.from("pdf_imports").update({
      status: "extracting",
      error_message: null,
      notes: resume ? null : null,
      extraction_started_at: new Date().toISOString(),
    }).eq("id", data.importId);
    await upsertExtraction(context.supabase, data.importId, keptBlocks, totalPages, meta);
    await appendImportLog(context.supabase, data.importId, {
      event: resume ? "extraction_resumed" : "extraction_started",
      model: EXTRACTION_MODEL, fileBytes: buf.byteLength, totalPages, chunkSize: CHUNK_PAGES,
      chunkCount, completedChunks: meta.chunks_completed, pageDimensions,
    });
    return {
      ok: true, model: EXTRACTION_MODEL, totalPages, chunkSize: CHUNK_PAGES, chunkCount,
      fileBytes: buf.byteLength, completedChunks: meta.chunks_completed ?? [], resumed: resume,
    };
  });

export const extractPdfChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string; chunkIndex: number }) => d)
  .handler(async ({ data, context }) => {
    // Rate-limit PDF extraction to protect AI credit budget: 20 chunks/hour/user.
    if (!LIMITS.pdfExtract(context.userId)) {
      throw new Error("PDF extraction rate limit reached. Please wait before processing more chunks.");
    }
    await assertSuperAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY ?? "";
    if (!apiKey && !process.env.GEMINI_API_KEY) throw new Error("Neither LOVABLE_API_KEY nor GEMINI_API_KEY is set in the server environment");
    let step = "load_import_row";
    let failurePages = "?";
    try {
      const { data: imp, error: impErr } = await context.supabase.from("pdf_imports").select("id, storage_path, kind, level").eq("id", data.importId).single();
      if (impErr || !imp) throw new Error(impErr?.message ?? "Import not found");
      step = "storage_download_pdf_parse";
      const { doc, totalPages } = await downloadPdf(context.supabase, imp.storage_path);
      const totalChunks = Math.ceil(totalPages / CHUNK_PAGES);
      if (data.chunkIndex < 0 || data.chunkIndex >= totalChunks) throw new Error(`Invalid chunkIndex ${data.chunkIndex}; expected 0..${totalChunks - 1}`);
      const startIdx = data.chunkIndex * CHUNK_PAGES;
      const endIdxExclusive = Math.min(startIdx + CHUNK_PAGES, totalPages);
      failurePages = `${startIdx + 1}-${endIdxExclusive}`;
      const pageIndices = Array.from({ length: endIdxExclusive - startIdx }, (_, i) => startIdx + i);
      step = "chunk_build";
      const chunkDoc = await PDFDocument.create();
      const copied = await chunkDoc.copyPages(doc, pageIndices);
      for (const page of copied) chunkDoc.addPage(page);
      const bytes = await chunkDoc.save();
      const dimensions = copied.map((p, i) => ({ page: startIdx + i + 1, width: p.getWidth(), height: p.getHeight() }));
      step = `gemini_request_chunk_${data.chunkIndex + 1}`;
      const result = await callGeminiChunk({ apiKey, supabase: context.supabase, importId: data.importId, kind: imp.kind, chunkIndex: data.chunkIndex, totalChunks, startPage: startIdx + 1, endPage: endIdxExclusive, totalPages, pdfBytes: bytes, dimensions });
      const chunkBlocks = flattenBlocks(Array.isArray(result.parsed?.blocks) ? result.parsed.blocks : [], startIdx + 1, endIdxExclusive);
      step = "persist_chunk";
      const { data: existing } = await context.supabase.from("pdf_extractions").select("blocks, raw_text").eq("import_id", data.importId).maybeSingle();
      const existingBlocks = Array.isArray(existing?.blocks) ? existing.blocks : [];
      const keptBlocks = existingBlocks.filter((b: any) => Number(b?.page) < startIdx + 1 || Number(b?.page) > endIdxExclusive);
      let meta: ExtractionMeta = {};
      try { meta = existing?.raw_text ? JSON.parse(existing.raw_text) : {}; } catch { meta = {}; }
      const completed = new Set<number>(Array.isArray(meta.chunks_completed) ? meta.chunks_completed : []);
      completed.add(data.chunkIndex);
      const models = new Set<string>(Array.isArray(meta.models_detected) ? meta.models_detected : []);
      if (Array.isArray(result.parsed?.models_detected)) for (const m of result.parsed.models_detected) if (m != null) models.add(String(m));
      const lowConfidence = [...(Array.isArray(meta.low_confidence_items) ? meta.low_confidence_items : []), ...(Array.isArray(result.parsed?.low_confidence_items) ? result.parsed.low_confidence_items : [])];
      const nextMeta: ExtractionMeta = { ...meta, chunks_total: totalChunks, chunks_completed: [...completed].sort((a, b) => a - b), chunk_size: CHUNK_PAGES, needs_manual_review: Boolean(meta.needs_manual_review || result.parsed?.needs_manual_review), manual_review_resolved: false, manual_review_resolved_at: undefined, manual_review_resolved_by: undefined, low_confidence_items: lowConfidence, models_detected: [...models] };
      const blocks = [...keptBlocks, ...chunkBlocks].sort((a, b) => Number(a?.page ?? 0) - Number(b?.page ?? 0));
      await upsertExtraction(context.supabase, data.importId, blocks, totalPages, nextMeta);
      await context.supabase.from("pdf_imports").update({ status: "extracting", ocr_used: true, level: result.parsed?.level === "b1" || result.parsed?.level === "b2" ? result.parsed.level : imp.level, error_message: null, extraction_started_at: new Date().toISOString() }).eq("id", data.importId);
      await appendImportLog(context.supabase, data.importId, { event: "chunk_persisted", chunk: `${data.chunkIndex + 1}/${totalChunks}`, blocksInChunk: chunkBlocks.length, totalBlocks: blocks.length, finishReason: result.finishReason, usage: result.usage });
      return { ok: true, chunkIndex: data.chunkIndex, totalChunks, pages: `${startIdx + 1}-${endIdxExclusive}`, blocksInChunk: chunkBlocks.length, totalBlocks: blocks.length, completedChunks: nextMeta.chunks_completed?.length ?? 0 };
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      const stack = String(err?.stack ?? "").slice(0, 6000);
      const full = `[step=${step}] ${msg}${stack ? `\n\nStack:\n${stack}` : ""}`;

      // No silent skipping: every failed chunk is persisted with its page range,
      // then the import is marked failed so admins see the real blocker instead
      // of an "extracted" import with missing TELC content.
      try {
        const { data: existing } = await context.supabase.from("pdf_extractions").select("blocks, raw_text").eq("import_id", data.importId).maybeSingle();
        let meta: ExtractionMeta = {};
        try { meta = existing?.raw_text ? JSON.parse(existing.raw_text) : {}; } catch { meta = {}; }
        const failed = Array.isArray(meta.chunks_failed) ? meta.chunks_failed : [];
        failed.push({ chunk: data.chunkIndex, pages: failurePages, reason: msg.slice(0, 1200), model: "gemini" });
        const nextMeta: ExtractionMeta = { ...meta, chunks_failed: failed, needs_manual_review: true };
        const blocks = Array.isArray(existing?.blocks) ? existing.blocks : [];
        await upsertExtraction(context.supabase, data.importId, blocks, Number((existing as any)?.page_count ?? 0) || 0, nextMeta);
      } catch {}
      await context.supabase.from("pdf_imports").update({ status: "extraction_failed", error_message: full }).eq("id", data.importId);
      await appendImportLog(context.supabase, data.importId, { event: "chunk_failed", step, chunkIndex: data.chunkIndex, pages: failurePages, error: msg, stack });
      return { ok: false as const, chunkIndex: data.chunkIndex, pages: failurePages, step, error: msg, stack, details: full, hard: true };
    }
  });

export const finalizePdfExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: ext } = await context.supabase.from("pdf_extractions").select("blocks, raw_text, page_count").eq("import_id", data.importId).maybeSingle();
    if (!ext) throw new Error("No extraction row found");
    let meta: ExtractionMeta = {};
    try { meta = ext.raw_text ? JSON.parse(ext.raw_text) : {}; } catch { meta = {}; }
    const completed = new Set(Array.isArray(meta.chunks_completed) ? meta.chunks_completed : []);
    const failedChunks = Array.isArray(meta.chunks_failed) ? meta.chunks_failed : [];
    const total = Number(meta.chunks_total ?? 0);
    if (total > 0 && completed.size < total) throw new Error(`Extraction incomplete: ${completed.size}/${total} chunks completed.`);
    const hasFailedChunks = failedChunks.length > 0;
    co
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PDFDocument } from "pdf-lib";

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

    const shouldStartNewUnit =
      !currentUnit ||
      currentUnit.questionPage !== page ||
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
  // X is an official TELC answer for matching exercises (Lesen Teil 2/3):
  // "kein passender Text" — no matching text exists for this statement.
  // Dropping X would mark every such question as "missing solution."
  const letter = String(value ?? "").trim().match(/[A-EXa-ex]/)?.[0];
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
    // Do NOT skip when teil === 0 — untagged answer entries are still valid;
    // they are stored with key "0::number" and matched as wildcard fallback.
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
    get(q: SourceQuestion, usageCounts?: Map<string, number>) {
      if (q.correctAnswer) return q.correctAnswer;
      const exactKey = q.model ? `${q.model}::${q.teil}::${q.number}` : "";
      const nearbyPages = [q.page, q.page + 1, q.page - 1].filter((p) => Number.isFinite(p) && p > 0);
      const unmodelledKey = `${q.teil}::${q.number}`;
      // Wildcard keys for untagged answer entries (teil stored as 0 when block had no teil).
      const exactWildKey = q.model ? `${q.model}::0::${q.number}` : "";
      const unmodelledWildKey = `0::${q.number}`;
      for (const page of nearbyPages) {
        const exactPageKey = exactKey ? `${exactKey}::p${page}` : "";
        const unmodelledPageKey = `${unmodelledKey}::p${page}`;
        if (exactPageKey && exactByPage.has(exactPageKey)) return exactByPage.get(exactPageKey) ?? "";
        if (unmodelledByPage.has(unmodelledPageKey)) return unmodelledByPage.get(unmodelledPageKey) ?? "";
        // Fallback: try untagged (teil=0) entries stored as wildcard.
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

const extractionSystemPrompt = `You are a verbatim TELC exam extractor. Your job is to TRANSCRIBE the PDF exactly as it appears — zero content loss, zero invention.
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
- PRESERVE SOURCE EXACTLY: every printed exercise/question-page is a separate source unit. If a topic, title, passage, question number, wording, answer option, or correct answer repeats or looks 99% similar, still extract it separately. Similarity is NEVER duplication. Two passages with the same title must both be emitted as separate passage blocks.
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
    if (lines.length < 3) return false;
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
    max_tokens: 16000,
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
    const finalStatus = hasFailedChunks ? "extraction_failed" : "extracted";
    const errMessage = hasFailedChunks
      ? `${failedChunks.length}/${total} chunks failed. Extraction is incomplete; no exercises will be built until every chunk succeeds.`
      : null;
    await context.supabase.from("pdf_imports").update({ status: finalStatus, ocr_used: true, error_message: errMessage }).eq("id", data.importId);
    const review = getExtractionReviewState(meta);
    await appendImportLog(context.supabase, data.importId, { event: "extraction_finalized", chunksCompleted: completed.size, chunksFailed: failedChunks.length, blockCount: Array.isArray(ext.blocks) ? ext.blocks.length : 0, pageCount: ext.page_count, modelsDetected: meta.models_detected ?? [], blockingLowConfidenceItems: review.blockingLowConfidenceItems.length, ignoredLowConfidenceItems: review.ignoredLowConfidenceItems.length });
    return { ok: !hasFailedChunks, blockCount: Array.isArray(ext.blocks) ? ext.blocks.length : 0, pageCount: ext.page_count, needsManualReview: review.needsManualReview, manualReviewResolved: review.manualReviewResolved, canBuild: review.canBuild, lowConfidenceItems: review.lowConfidenceItems, blockingLowConfidenceItems: review.blockingLowConfidenceItems, ignoredLowConfidenceItems: review.ignoredLowConfidenceItems, modelsDetected: meta.models_detected ?? [], failedChunks };
  });

export const extractPdfVerbatim = startPdfExtraction;

/**
 * Watchdog: mark any extraction/build job whose start timestamp is older than
 * 5 minutes as failed. Called from the admin page poller so orphaned rows
 * (e.g. killed worker, network drop, redeploy) never stay "extracting" forever.
 */
export const reapStuckExtractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const cutoffISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    // Extracting jobs older than 5 min
    const { data: stuckExtract } = await context.supabase
      .from("pdf_imports")
      .select("id, status")
      .in("status", ["extracting", "pending"])
      .lt("extraction_started_at", cutoffISO);
    let reaped = 0;
    for (const row of stuckExtract ?? []) {
      await context.supabase
        .from("pdf_imports")
        .update({
          status: "extraction_failed",
          error_message: "[watchdog] Job stuck in '" + row.status + "' for more than 5 minutes — auto-failed. Re-run extraction or delete and re-upload.",
        })
        .eq("id", row.id);
      reaped++;
    }
    // Building jobs older than 5 min
    const { data: stuckBuild } = await context.supabase
      .from("pdf_imports")
      .select("id")
      .eq("status", "building")
      .lt("extraction_started_at", cutoffISO);
    for (const row of stuckBuild ?? []) {
      await context.supabase
        .from("pdf_imports")
        .update({
          status: "build_failed",
          error_message: "[watchdog] Build stuck for more than 5 minutes — auto-failed.",
        })
        .eq("id", row.id);
      reaped++;
    }
    // Also stamp pending rows that never got an extraction_started_at, using created_at as fallback.
    const { data: stalePending } = await context.supabase
      .from("pdf_imports")
      .select("id, created_at")
      .eq("status", "pending")
      .is("extraction_started_at", null)
      .lt("created_at", cutoffISO);
    for (const row of stalePending ?? []) {
      await context.supabase
        .from("pdf_imports")
        .update({
          status: "extraction_failed",
          error_message: "[watchdog] Import remained in 'pending' for more than 5 minutes without ever starting extraction.",
        })
        .eq("id", row.id);
      reaped++;
    }
    return { reaped };
  });

/**
 * Read extraction blocks for preview (admin only).
 */
export const getExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: imp } = await context.supabase
      .from("pdf_imports")
      .select("id, original_name, kind, level, status, linked_import_id, created_at, error_message, notes")
      .eq("id", data.importId)
      .single();
    const { data: ext } = await context.supabase
      .from("pdf_extractions")
      .select("blocks, page_count, raw_text, updated_at")
      .eq("import_id", data.importId)
      .maybeSingle();
    let meta: ExtractionMeta = {};
    try { meta = ext?.raw_text ? JSON.parse(ext.raw_text) : {}; } catch { meta = {}; }
    return { import: imp, extraction: ext, review: getExtractionReviewState(meta) };
  });

export const resolveExtractionReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string; note?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: ext } = await context.supabase
      .from("pdf_extractions")
      .select("blocks, raw_text, page_count")
      .eq("import_id", data.importId)
      .maybeSingle();
    if (!ext) throw new Error("No extraction row found");
    let meta: ExtractionMeta = {};
    try { meta = ext.raw_text ? JSON.parse(ext.raw_text) : {}; } catch { meta = {}; }
    const review = getExtractionReviewState(meta);
    if (review.failedChunks.length > 0 || review.incomplete) {
      throw new Error("Extraction is incomplete or has failed chunks — re-run/continue extraction before review can be resolved.");
    }
    const nextMeta: ExtractionMeta = {
      ...meta,
      needs_manual_review: false,
      manual_review_resolved: true,
      manual_review_resolved_at: new Date().toISOString(),
      manual_review_resolved_by: context.userId,
      diagnostics: [
        ...(Array.isArray(meta.diagnostics) ? meta.diagnostics : []),
        { event: "manual_review_resolved", by: context.userId, at: new Date().toISOString(), note: data.note ?? null, blockingLowConfidenceItems: review.blockingLowConfidenceItems.length, ignoredLowConfidenceItems: review.ignoredLowConfidenceItems.length },
      ],
    };
    await upsertExtraction(context.supabase, data.importId, Array.isArray(ext.blocks) ? ext.blocks : [], Number(ext.page_count ?? 0), nextMeta);
    await context.supabase.from("pdf_imports").update({ status: "extracted", error_message: null }).eq("id", data.importId);
    await appendImportLog(context.supabase, data.importId, { event: "manual_review_resolved", blockingLowConfidenceItems: review.blockingLowConfidenceItems.length, ignoredLowConfidenceItems: review.ignoredLowConfidenceItems.length, note: data.note ?? null });
    return { ok: true, review: getExtractionReviewState(nextMeta) };
  });

/**
 * List PDF imports (admin).
 */
export const listPdfImports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pdf_imports")
      .select("id, original_name, kind, level, status, linked_import_id, created_at, ocr_used, error_message, storage_path, notes")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

/**
 * Build draft exercises from an exam extraction, preserving original numbering.
 * Optionally links an answer key import — its answer_key_entry blocks become
 * rows in exercise_answer_keys (NEVER exposed to students).
 */
export const buildExercisesFromExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    examImportId: string;
    answerKeyImportId?: string | null;
    level: "b1" | "b2";
    moduleHint?: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich" | null;
    teil: number;
    writingCategory?: string | null;
    muendlichPart?: 1 | 2 | 3 | null;
    contentType?: "vorbereitung" | "pruefungssimulation" | null;
    confirmMaterialAsExercises?: boolean | null;
    forceBuild?: boolean | null;
    collectionId?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // ---- Admin classification gate (manual, never automatic) ----
    if (!data.level) throw new Error("Level (B1/B2) ist erforderlich.");
    if (!data.moduleHint) throw new Error("Modul ist erforderlich.");
    const module = data.moduleHint;
    const adminTeil = Number(data.teil);
    if (!Number.isInteger(adminTeil) || adminTeil < 1 || adminTeil > 3) {
      throw new Error("Teil ist erforderlich (1–3).");
    }
    if (module === "sprachbausteine" && adminTeil > 2) {
      throw new Error("Sprachbausteine hat nur Teil 1 und Teil 2.");
    }
    if (module === "schreiben") {
      const allowed = ["beschwerde","brief","email","bitte_um_informationen","anfrage","stellungnahme","sonstiges"];
      if (!data.writingCategory || !allowed.includes(data.writingCategory)) {
        throw new Error("Schreiben: Bitte Kategorie manuell wählen.");
      }
    }
    if (module === "muendlich") {
      if (![1,2,3].includes(Number(data.muendlichPart))) {
        throw new Error("Mündlich: Bitte Teil (1 Präsentation / 2 Diskussion / 3 Planen) wählen.");
      }
    }

    // Content type is REQUIRED for EVERY module (Vorbereitung vs. Prüfungssimulation).
    if (!data.contentType || !["vorbereitung","pruefungssimulation"].includes(data.contentType)) {
      throw new Error("Bitte Inhaltstyp wählen: 'Vorbereitung' oder 'Prüfungssimulation'.");
    }
    if (data.contentType === "vorbereitung" && !data.confirmMaterialAsExercises) {
      throw new Error("Vorbereitungs-Material wird nicht automatisch in Übungen umgewandelt. Setzen Sie das Bestätigungs-Häkchen, wenn das gewünscht ist.");
    }

    // Mark the import as currently building exercises.
    await context.supabase
      .from("pdf_imports")
      .update({
        status: "building",
        error_message: null,
        extraction_started_at: new Date().toISOString(),
      })
      .eq("id", data.examImportId);

    try {
    const { data: ext, error: extErr } = await context.supabase
      .from("pdf_extractions").select("blocks, raw_text").eq("import_id", data.examImportId).maybeSingle();
    if (extErr) throw new Error(`Could not read extraction for import ${data.examImportId}: ${extErr.message}`);
    if (!ext) throw new Error("Run extraction on the exam PDF first");
    let meta: ExtractionMeta = {};
    try { meta = ext.raw_text ? JSON.parse(ext.raw_text) : {}; } catch { meta = {}; }
    const review = getExtractionReviewState(meta);
    if (review.failedChunks.length > 0 || review.incomplete) {
      throw new Error("Extraction incomplete — finish all chunks before building exercises.");
    }
    if (review.blockingLowConfidenceItems.length > 0 && !review.manualReviewResolved && !data.forceBuild) {
      throw new Error(`Extraction has ${review.blockingLowConfidenceItems.length} low-confidence item(s). Open the Review tab and approve or re-extract before building exercises.`);
    }
    if (data.forceBuild && review.blockingLowConfidenceItems.length > 0 && !review.manualReviewResolved) {
      await appendImportLog(context.supabase, data.examImportId, { event: "force_build_with_low_confidence_items", count: review.blockingLowConfidenceItems.length, by: context.userId });
    }

    const blocks: any[] = Array.isArray(ext.blocks) ? ext.blocks : [];
    const moduleVal = module;
    const teil = adminTeil;

    // Detect the source kind (combined PDFs carry their own answer key)
    const { data: examImp } = await context.supabase
      .from("pdf_imports").select("kind").eq("id", data.examImportId).maybeSingle();
    const sourceKind: string = examImp?.kind ?? "exam";

    const answerBlocks: any[] = blocks.filter((b) => b?.type === "answer_key_entry");

    // External answer-key PDF (optional, ignored when source is combined)
    if (data.answerKeyImportId && sourceKind !== "combined") {
      const { data: keyExt, error: keyExtErr } = await context.supabase
        .from("pdf_extractions").select("blocks").eq("import_id", data.answerKeyImportId).maybeSingle();
      if (keyExtErr) throw new Error(`Could not read answer-key extraction for import ${data.answerKeyImportId}: ${keyExtErr.message}`);
      const kblocks: any[] = Array.isArray(keyExt?.blocks) ? keyExt.blocks : [];
      answerBlocks.push(...kblocks.filter((b) => b?.type === "answer_key_entry"));
      await context.supabase.from("pdf_imports")
        .update({ linked_import_id: data.examImportId })
        .eq("id", data.answerKeyImportId);
    }

    const sourceUnits = buildSourceExerciseUnits(blocks, moduleVal, teil);
    const answerLookup = buildAnswerLookup(answerBlocks, teil);
    const answerUsageCounts = buildAnswerUsageCounts(sourceUnits, answerLookup);

    // Pre-scan passage titles so duplicate titles get numbered suffixes.
    // "Sport ist gesund" appearing twice becomes (1) and (2) to avoid identical
    // student-facing titles that can't be distinguished in the exercise library.
    const rawTitleCounts = new Map<string, number>();
    for (const unit of sourceUnits) {
      const passageTitle = (unit.title ?? "").trim();
      const derived = deriveTopicTitle(unit.passageText ?? unit.instruction ?? "");
      const raw = passageTitle || derived || "";
      if (raw) rawTitleCounts.set(raw, (rawTitleCounts.get(raw) ?? 0) + 1);
    }
    const rawTitleIdx = new Map<string, number>();

    const createdExerciseIds: string[] = [];
    let keyCount = 0;
    const buildWarnings: { kind: string; detail: string; itemRange?: string; page?: number; sourceIndex?: number }[] = [];
    const skippedUnits: Array<ReturnType<typeof unitDiagnostic>> = [];
    const sourceUnitDiagnostics = [
      ...sourceUnits.map((unit) => unitDiagnostic(unit, "source_exercise_unit_detected")),
      ...buildUnbuiltPassageDiagnostics(blocks, sourceUnits, teil),
    ];
    if (answerLookup.conflicts && answerLookup.conflicts.length > 0) {
      for (const c of answerLookup.conflicts) {
        buildWarnings.push({ kind: "answer_key_conflict", detail: `Conflicting answers for ${c.key}: ${c.answers.join(", ")} — entry skipped, please verify manually.` });
      }
    }

    const { data: existingDrafts } = await context.supabase
      .from("exercises")
      .select("id")
      .eq("source_pdf_import_id", data.examImportId);
    const existingDraftIds = (existingDrafts ?? []).map((row: any) => row.id);
    if (existingDraftIds.length > 0) {
      await context.supabase.from("exercise_answer_keys").delete().in("exercise_id", existingDraftIds);
      await context.supabase.from("exercises").delete().in("id", existingDraftIds);
      await appendImportLog(context.supabase, data.examImportId, { event: "source_exercises_removed_before_preserve_rebuild", count: existingDraftIds.length });
    }
    await context.supabase.from("pdf_fidelity_reports").delete().eq("exam_import_id", data.examImportId);

    let position = 1;
    for (const unit of sourceUnits) {
      try {
      const variantSuffix = unit.model ? ` — Modell ${unit.model}` : "";
      // Skip non-exam noise that may have leaked into a question block
      // (WhatsApp/Telegram/Facebook/group/translator/watermark references).
      const noiseRe = /\b(whatsapp|telegram|facebook|insta(?:gram)?|gruppe\s*:|translator|übersetz(?:er|t von)|watermark|themenliste)\b/i;
      const cleanQuestions = unit.questions.filter((q) => !noiseRe.test(q.text));
      if (cleanQuestions.length === 0) {
        skippedUnits.push(unitDiagnostic(unit, "no_clean_questions"));
        continue;
      }
      // Validation: drop questions with empty prompts so a single bad row
      // does not abort the whole build.
      const validQuestions = cleanQuestions.filter((q) => {
        const ok = (q.text ?? "").trim().length > 0 && q.number;
        if (!ok) buildWarnings.push({ kind: "invalid_question_dropped", detail: `Empty prompt or number at p.${unit.questionPage}`, page: unit.questionPage, sourceIndex: unit.sourceIndex });
        return ok;
      });
      if (validQuestions.length === 0) {
        skippedUnits.push(unitDiagnostic(unit, "all_questions_invalid"));
        continue;
      }

        // Build the embedded questions[] payload — exact letter prefixes preserved.
        const questionsPayload = validQuestions.map((q) => {
          const optionTexts = q.options;
          const rawAns = answerLookup.get(q, answerUsageCounts).trim();
          let correct: string | null = null;
          if (optionTexts.length >= 2 && rawAns) {
            const letter = rawAns.toUpperCase().match(/[A-E]/)?.[0];
            const idx = letter ? letter.charCodeAt(0) - 65 : -1;
            if (idx >= 0 && idx < optionTexts.length) correct = optionTexts[idx];
          } else if (rawAns) {
            correct = rawAns;
          }
          return {
            n: q.number,
            prompt: q.text,
            options: optionTexts,
            correct,
            rawAnswer: rawAns || null,
          };
        });

        const allMcq = questionsPayload.every((q) => q.options.length >= 2);
        const anyMcq = questionsPayload.some((q) => q.options.length >= 2);
        // passage_mcq covers the new "one passage, many MCQs" structure.
        // sprachbausteine still uses 'cloze' so legacy renderers keep working.
        // Single open-question buckets (Schreiben/Mündlich tasks) stay 'open_text'.
        const kind: "passage_mcq" | "cloze" | "multiple_choice" | "open_text" =
          moduleVal === "sprachbausteine" && anyMcq ? "cloze"
          : allMcq && questionsPayload.length > 1 ? "passage_mcq"
          : allMcq && questionsPayload.length === 1 ? "multiple_choice"
          : "open_text";

        const passageTitle = (unit.title ?? "").trim();
        const derivedTitle = deriveTopicTitle(unit.passageText ?? unit.instruction ?? "");
        const rangeLabel = unitQuestionRange(unit);
        const rawTitle = passageTitle || derivedTitle || "";
        // Deduplicate: if the same title appears more than once in this import,
        // append a sequential number so students can tell exercises apart.
        let studentTitle: string;
        if (rawTitle && (rawTitleCounts.get(rawTitle) ?? 0) > 1) {
          const idx = (rawTitleIdx.get(rawTitle) ?? 0) + 1;
          rawTitleIdx.set(rawTitle, idx);
          studentTitle = `${rawTitle} (${idx})`;
        } else {
          studentTitle = rawTitle || `Aufgabe ${rangeLabel}${variantSuffix}`;
        }

        // Aggregate `correct` so the legacy grader still works for single-question
        // rows (multiple_choice / open_text). For passage_mcq the canonical
        // answers live inside options.questions[].correct.
        const aggregatedCorrect: string[] = questionsPayload
          .map((q) => q.correct)
          .filter((v): v is string => typeof v === "string" && v.length > 0);

        // For passage_mcq the simple `options: string[]` shape no longer fits.
        // We store an object `{ questions: [...] }` in the JSONB column. For
        // legacy single-question kinds we keep the flat string[] shape so the
        // existing UI keeps rendering them unchanged.
        const optionsField: any =
          kind === "passage_mcq" || (kind === "cloze" && questionsPayload.length > 1)
            ? { questions: questionsPayload }
            : (questionsPayload[0]?.options ?? []);

        const promptText =
          kind === "passage_mcq" || (kind === "cloze" && questionsPayload.length > 1)
            ? (unit.instruction || `Beantworten Sie die Fragen ${rangeLabel}.`)
            : (questionsPayload[0]?.prompt ?? unit.instruction ?? "");

        const { data: ex, error: exErr } = await context.supabase
          .from("exercises")
          .insert({
            level: data.level,
            module: moduleVal,
            teil,
            position: position++,
            title: studentTitle,
            prompt: promptText,
            passage: unit.passageText ?? (unit.instruction || null),
            kind,
            options: optionsField,
            correct: aggregatedCorrect,
            status: "draft",
            created_by: context.userId,
            source_pdf_import_id: data.examImportId,
            original_numbering: unitOriginalNumbering(unit),
            model_variant: unit.model,
            writing_category: moduleVal === "schreiben" ? (data.writingCategory ?? null) : null,
            muendlich_part: moduleVal === "muendlich" ? (data.muendlichPart ?? null) : null,
            content_type: data.contentType ?? null,
            collection_id: data.collectionId ?? null,
          })
          .select("id")
          .single();
        if (exErr || !ex) {
          throw new Error(`Exercise insert failed for items ${rangeLabel}: ${exErr?.message ?? "no exercise row returned"}`);
        }
        createdExerciseIds.push(ex.id);

        // One answer_keys row per embedded source question for the audit trail.
        // Preserve-source mode does not merge or collapse similar questions.
        for (const q of questionsPayload) {
          if (!q.rawAnswer) continue;
          const { error: keyErr } = await context.supabase.from("exercise_answer_keys").insert({
            exercise_id: ex.id,
            item_number: q.n,
            correct_answer: q.rawAnswer,
            source: "pdf",
            key_version: 1,
            pdf_import_id: sourceKind === "combined" ? data.examImportId : (data.answerKeyImportId ?? null),
          });
          if (keyErr) {
            buildWarnings.push({ kind: "answer_key_insert_failed", detail: `Item ${q.n}: ${keyErr.message}` });
          } else {
            keyCount++;
          }
        }
      } catch (unitErr: any) {
        // Per-unit isolation: one bad unit must not abort the whole build.
        buildWarnings.push({
          kind: "unit_build_failed",
          detail: String(unitErr?.message ?? unitErr),
          page: unit.questionPage,
          sourceIndex: unit.sourceIndex,
          itemRange: unit.questions.map((q) => q.number).join(","),
        });
        skippedUnits.push(unitDiagnostic(unit, "exception"));
      }
    }

    if (createdExerciseIds.length === 0) {
      const questionCount = sourceUnits.reduce((sum, unit) => sum + unit.questions.length, 0);
      throw new Error(`Build produced 0 exercises from ${questionCount} extracted question block(s). Warnings: ${JSON.stringify(buildWarnings).slice(0, 500)}`);
    }

    const missingAnswerKeys = sourceUnits.flatMap((unit) =>
      unit.questions
        .filter((q) => !answerLookup.get(q, answerUsageCounts))
        .map((q) => ({
          sourceIndex: unit.sourceIndex,
          page: q.page,
          passagePages: unit.passagePages,
          itemRange: unitQuestionRange(unit),
          item: q.number,
          title: unit.title ?? "",
          reason: "no_source_answer_key_entry",
          note: "No extracted answer_key_entry matched this question. If the PDF has a red-boxed letter here, re-run extraction/vision for this page or enter the answer manually.",
        })),
    );

    const hasIssues = missingAnswerKeys.length > 0 || buildWarnings.length > 0 || skippedUnits.length > 0;
    await context.supabase.from("pdf_imports")
      .update({
        status: hasIssues ? "built_needs_review" : "built",
        error_message: hasIssues
          ? `${missingAnswerKeys.length} missing answer key(s), ${buildWarnings.length} warning(s), ${skippedUnits.length} skipped unit(s).`
          : null,
      })
      .eq("id", data.examImportId);

    await appendImportLog(context.supabase, data.examImportId, {
      event: "preserve_source_build_completed",
        passagesDetected: blocks.filter((b) => b?.type === "passage" && sourceBlockTeil(b, teil) === teil).length,
        unbuiltPassages: sourceUnitDiagnostics.filter((u) => u.reason === "passage_detected_without_built_exercise_questions"),
      sourceExerciseUnits: sourceUnits.length,
      exercisesCreated: createdExerciseIds.length,
      questionsDetected: sourceUnits.reduce((sum, unit) => sum + unit.questions.length, 0),
      answerKeysExtracted: answerLookup.count,
      missingAnswerKeys,
      answerKeyConflicts: answerLookup.conflicts ?? [],
      warnings: buildWarnings,
      skippedUnits,
      sourceUnitDiagnostics,
      skipped: 0,
      merged: 0,
      ignored: 0,
    });

    return {
      exerciseCount: createdExerciseIds.length,
      keyCount,
      passagesDetected: blocks.filter((b) => b?.type === "passage" && sourceBlockTeil(b, teil) === teil).length,
      sourceExerciseUnits: sourceUnits.length,
      questionsDetected: sourceUnits.reduce((sum, unit) => sum + unit.questions.length, 0),
      answerKeysExtracted: answerLookup.count,
      missingAnswerKeys,
      answerKeyConflicts: answerLookup.conflicts ?? [],
      warnings: buildWarnings,
      skippedUnits,
      sourceUnitDiagnostics,
      unbuiltPassages: sourceUnitDiagnostics.filter((u) => u.reason === "passage_detected_without_built_exercise_questions"),
      skipped: 0,
      merged: 0,
      ignored: 0,
      modelsBuilt: [...new Set(sourceUnits.map((unit) => unit.model ?? "single"))],
    };
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      await context.supabase.from("pdf_imports")
        .update({ status: "build_failed", error_message: msg })
        .eq("id", data.examImportId);
      throw err;
    }
  });

/**
 * Publish a draft exercise (super_admin only — enforced by DB trigger + RLS).
 */
export const publishExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase
      .from("exercises")
      .update({ status: "published" })
      .eq("id", data.exerciseId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Regrade every attempt for an exercise against the latest answer key.
 */
export const regradeExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    // Use admin client for cross-user attempt updates
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: keys } = await supabaseAdmin
      .from("exercise_answer_keys")
      .select("item_number, correct_answer, key_version")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false });
    if (!keys || keys.length === 0) throw new Error("No answer key found for this exercise");
    const latestVersion = keys[0].key_version;
    const latest = keys.filter(k => k.key_version === latestVersion);
    const correctMap = new Map(latest.map(k => [String(k.item_number), k.correct_answer]));

    // Update exercise.correct (used by client grading) from key
    const correctValues = [...correctMap.values()].map(v =>
      typeof v === "string" ? v : JSON.stringify(v),
    );
    await supabaseAdmin.from("exercises").update({ correct: correctValues }).eq("id", data.exerciseId);

    // Re-grade attempts
    const { data: attempts } = await supabaseAdmin
      .from("user_exercise_attempts")
      .select("id, answer, is_correct, score")
      .eq("exercise_id", data.exerciseId);

    let affected = 0;
    for (const a of attempts ?? []) {
      let nextCorrect = a.is_correct;
      // Simple equality match — answer stored as string or jsonb
      const ans = typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer);
      const allOk = [...correctMap.values()].some(v => {
        const target = typeof v === "string" ? v : JSON.stringify(v);
        return target === ans;
      });
      nextCorrect = allOk;
      const nextScore = allOk ? 100 : 0;
      if (a.is_correct !== nextCorrect || a.score !== nextScore) {
        await supabaseAdmin.from("user_exercise_attempts").update({
          is_correct: nextCorrect,
          score: nextScore,
          regraded_at: new Date().toISOString(),
          key_version: latestVersion,
        }).eq("id", a.id);
        affected++;
      }
    }

    await supabaseAdmin.from("regrade_audits").insert({
      exercise_id: data.exerciseId,
      performed_by: context.userId,
      key_version: latestVersion,
      items_changed: correctMap.size,
      attempts_affected: affected,
    });

    return { attemptsAffected: affected, itemsChanged: correctMap.size, keyVersion: latestVersion };
  });

/**
 * Replace/update an answer key entry (super_admin only).
 */
export const replaceAnswerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string; itemNumber: string; correctAnswer: string; referenceAnswer?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // Bump key_version
    const { data: existing } = await context.supabase
      .from("exercise_answer_keys")
      .select("key_version")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (existing?.key_version ?? 0) + 1;
    const { error } = await context.supabase.from("exercise_answer_keys").insert({
      exercise_id: data.exerciseId,
      item_number: data.itemNumber,
      correct_answer: data.correctAnswer,
      reference_answer: data.referenceAnswer ?? null,
      source: "manual",
      key_version: nextVersion,
    });
    if (error) throw new Error(error.message);
    return { ok: true, keyVersion: nextVersion };
  });

/**
 * Check whether the current signed-in user is super_admin.
 */
export const checkSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "super_admin").limit(1);
    return { isSuperAdmin: Boolean(data && data.length > 0) };
  });

/**
 * Grade a student's answer for a PDF-imported exercise WITHOUT revealing the answer.
 * Looks up exercise_answer_keys server-side and returns only is_correct + reference (if any).
 * Also persists the attempt with the latest key_version.
 */
export const gradeImportedAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exerciseId: string; answer: string; durationSeconds?: number | null }) => d)
  .handler(async ({ data, context }) => {
    // No role check — any signed-in student may grade their own attempt
    const { data: keys } = await context.supabase
      .from("exercise_answer_keys")
      .select("correct_answer, key_version, reference_answer")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false })
      .limit(1);
    // RLS hides exercise_answer_keys from students — so use admin client here, server-only:
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: adminKeys } = await supabaseAdmin
      .from("exercise_answer_keys")
      .select("correct_answer, key_version")
      .eq("exercise_id", data.exerciseId)
      .order("key_version", { ascending: false })
      .limit(1);
    const key = (adminKeys && adminKeys[0]) || (keys && keys[0]);
    if (!key) return { graded: false, isCorrect: null, message: "No answer key available" };

    const target = typeof key.correct_answer === "string"
      ? key.correct_answer
      : JSON.stringify(key.correct_answer);
    const isCorrect = String(data.answer).trim().toLowerCase() === String(target).trim().toLowerCase();

    await supabaseAdmin.from("user_exercise_attempts").insert({
      user_id: context.userId,
      exercise_id: data.exerciseId,
      answer: data.answer,
      is_correct: isCorrect,
      score: isCorrect ? 100 : 0,
      duration_seconds: data.durationSeconds ?? null,
      key_version: key.key_version,
    });

    // The student has just submitted their own answer — returning the correct answer
    // for THIS item enables the inline correction view ("Correct answer: …"). The
    // answer-key table as a whole remains hidden (RLS); only the single item the
    // student just attempted is revealed.
    return {
      graded: true,
      isCorrect,
      keyVersion: key.key_version,
      correctAnswer: target,
    };
  });

/**
 * Run a 100% fidelity check between the original PDF extraction (source of truth)
 * and the exercises built from it. Detects added / removed / modified content,
 * numbering differences and section differences.
 *
 * Persists one row in pdf_fidelity_reports. Publishing is blocked unless a
 * passing report exists (enforced by the guard_exercise_publish trigger).
 */
export const runFidelityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examImportId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const { data: ext, error: extErr } = await context.supabase
      .from("pdf_extractions")
      .select("blocks, raw_text, page_count")
      .eq("import_id", data.examImportId)
      .maybeSingle();
    if (extErr) throw new Error(`Could not read extraction for fidelity check ${data.examImportId}: ${extErr.message}`);
    if (!ext) throw new Error("Extraktion fehlt — bitte zuerst extrahieren.");

    let extractionMeta: any = null;
    try { extractionMeta = ext.raw_text ? JSON.parse(ext.raw_text) : null; } catch {}
    const review = getExtractionReviewState(extractionMeta ?? {});
    if (review.failedChunks.length > 0 || review.incomplete || (review.blockingLowConfidenceItems.length > 0 && !review.manualReviewResolved)) {
      // Hard fail — record and stop
      const { data: fail } = await context.supabase
        .from("pdf_fidelity_reports")
        .insert({
          exam_import_id: data.examImportId,
          status: "fail",
          added_count: 0,
          removed_count: 0,
          modified_count: 0,
          numbering_diff_count: 0,
          section_diff_count: 0,
          details: { reason: "extraction_review_not_resolved", lowConfidenceItems: review.lowConfidenceItems, blockingLowConfidenceItems: review.blockingLowConfidenceItems, ignoredLowConfidenceItems: review.ignoredLowConfidenceItems, failedChunks: review.failedChunks, incomplete: review.incomplete },
          created_by: context.userId,
        })
        .select("id")
        .single();
      return { status: "fail" as const, reportId: fail?.id, reason: "extraction_review_not_resolved" };
    }

    const blocks: any[] = Array.isArray(ext.blocks) ? ext.blocks : [];
    const pageCount = Number(ext.page_count ?? extractionMeta?.page_count ?? 0);
    const { data: exercises, error: exercisesErr } = await context.supabase
      .from("exercises")
      .select("id, module, teil, position, title, prompt, passage, options, correct, original_numbering, status, model_variant")
      .eq("source_pdf_import_id", data.examImportId);
    if (exercisesErr) throw new Error(`Could not read built exercises for fidelity check ${data.examImportId}: ${exercisesErr.message}`);

    const orderedExercises = [...(exercises ?? [])].sort((a: any, b: any) => Number(a.position ?? 0) - Number(b.position ?? 0));
    const builtModule = String(orderedExercises.find((ex: any) => ex.module)?.module ?? "").toLowerCase();
    const builtTeil = Number(orderedExercises.find((ex: any) => Number(ex.teil))?.teil ?? 0)
      || Number(blocks.find((b) => b?.type === "question" && Number(b?.teil))?.teil ?? 0);
    const sourceUnits = builtTeil ? buildSourceExerciseUnits(blocks, builtModule, builtTeil) : [];
    const answerLookup = buildAnswerLookup(blocks, builtTeil);
    const answerUsageCounts = buildAnswerUsageCounts(sourceUnits, answerLookup);
    const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim();

    const modified: Array<{ key: string; sourceIndex: number; page: number; field: string; original: string; built: string }> = [];
    const numberingDiffs: Array<{ exerciseId: string; sourceIndex: number; page: number; expected: string; got: string }> = [];
    const answerMismatches: Array<{ exerciseId: string; sourceIndex: number; item: string; sourceAnswer: string; storedAnswer: string }> = [];
    const hasOriginalNumbering = orderedExercises.some((ex: any) => String(ex.original_numbering ?? "").trim());
    const exerciseByOriginalNumbering = new Map<string, any>();
    for (const ex of orderedExercises) exerciseByOriginalNumbering.set(norm(ex.original_numbering), ex);
    const matchedPairs = sourceUnits.map((src, idx) => ({
      src,
      ex: hasOriginalNumbering ? exerciseByOriginalNumbering.get(norm(unitOriginalNumbering(src))) : orderedExercises[idx],
    }));
    const matchedExerciseIds = new Set(matchedPairs.map((pair) => pair.ex?.id).filter(Boolean));
    const removed = matchedPairs.filter((pair) => !pair.ex).map(({ src }) => ({
      key: `source:${src.sourceIndex}`,
      kind: "exercise" as const,
      ...unitDiagnostic(src, "source_exercise_missing_in_built_output"),
    }));
    const added = orderedExercises.filter((ex: any) => !matchedExerciseIds.has(ex.id)).map((ex: any) => ({
      key: `exercise:${ex.id}`,
      kind: "exercise" as const,
      exerciseId: ex.id,
      title: ex.title,
      reason: "built_exercise_without_source_unit_at_same_position",
    }));

    for (const { src, ex } of matchedPairs) {
      if (!ex) continue;
      const key = `source:${src.sourceIndex}:exercise:${ex.id}`;
      const addModified = (field: string, original: string, built: string) => modified.push({ key, sourceIndex: src.sourceIndex, page: src.questionPage, field, original, built });
      if (norm(src.passageText) !== norm(ex.passage)) addModified("passage", src.passageText ?? "", String(ex.passage ?? ""));
      const expectedPrompt = src.questions.length > 1 ? (src.instruction || `Beantworten Sie die Fragen ${src.questions[0]?.number ?? ""}–${src.questions[src.questions.length - 1]?.number ?? ""}.`) : (src.questions[0]?.text ?? src.instruction);
      if (norm(expectedPrompt) !== norm(ex.prompt)) addModified("prompt/instruction", expectedPrompt, String(ex.prompt ?? ""));
      const embedded = ex.options && typeof ex.options === "object" && !Array.isArray(ex.options) && Array.isArray(ex.options.questions) ? ex.options.questions : [];
      if (embedded.length !== src.questions.length) addModified("questions.count", String(src.questions.length), String(embedded.length));
      for (let qn = 0; qn < Math.min(src.questions.length, embedded.length); qn++) {
        const sq = src.questions[qn];
        const bq = embedded[qn];
        if (normalizeItemNumber(sq.number) !== normalizeItemNumber(bq?.n)) numberingDiffs.push({ exerciseId: ex.id, sourceIndex: src.sourceIndex, page: src.questionPage, expected: sq.number, got: String(bq?.n ?? "") });
        if (norm(sq.text) !== norm(bq?.prompt)) addModified(`questions[${qn}].prompt`, sq.text, String(bq?.prompt ?? ""));
        const builtOptions = Array.isArray(bq?.options) ? bq.options.map((o: any) => String(o ?? "")) : [];
        if (sq.options.length !== builtOptions.length) addModified(`questions[${qn}].options.count`, String(sq.options.length), String(builtOptions.length));
        for (let oi = 0; oi < Math.min(sq.options.length, builtOptions.length); oi++) {
          if (norm(sq.options[oi]) !== norm(builtOptions[oi])) addModified(`questions[${qn}].options[${oi}]`, sq.options[oi], builtOptions[oi]);
        }
        const sourceAnswer = answerLookup.get(sq, answerUsageCounts);
        const storedAnswer = String(bq?.rawAnswer ?? "").trim();
        if (sourceAnswer && sourceAnswer !== storedAnswer) answerMismatches.push({ exerciseId: ex.id, sourceIndex: src.sourceIndex, item: sq.number, sourceAnswer, storedAnswer });
      }
    }

    const sampleIndexes = [...new Set([0, Math.floor(sourceUnits.length / 4), Math.floor(sourceUnits.length / 2), Math.floor((sourceUnits.length * 3) / 4), sourceUnits.length - 1])]
      .filter((idx) => idx >= 0 && idx < sourceUnits.length && Boolean(matchedPairs[idx]?.ex));
    const sampleComparisons = sampleIndexes.map((idx) => ({
      sourceIndex: sourceUnits[idx].sourceIndex,
      page: sourceUnits[idx].questionPage,
      exerciseId: matchedPairs[idx].ex?.id ?? "",
      title: matchedPairs[idx].ex?.title ?? "",
      textMatches: norm(sourceUnits[idx].passageText) === norm(matchedPairs[idx].ex?.passage),
      questionCountMatches: sourceUnits[idx].questions.length === ((matchedPairs[idx].ex?.options as any)?.questions?.length ?? 0),
    }));

    const sectionDiffs: Array<{ teil: number; in: "source" | "built" }> = [];
    if (builtTeil && sourceUnits.length === 0) sectionDiffs.push({ teil: builtTeil, in: "built" });
    const sourcePages = new Set(sourceUnits.flatMap((unit) => [unit.questionPage, ...unit.passagePages]).filter(Boolean));
    const unbuiltPassages = buildUnbuiltPassageDiagnostics(blocks, sourceUnits, builtTeil);
    const answerPages = new Set(blocks.filter((b) => b?.type === "answer_key_entry").map((b) => Number(b.page)).filter(Boolean));
    const sourceBlockPages = new Set(blocks.filter((b) => ["passage", "question", "answer_key_entry"].includes(String(b?.type))).map((b) => Number(b.page)).filter(Boolean));
    const skippedPages = Array.from({ length: pageCount }, (_, i) => i + 1)
      .filter((page) => !sourcePages.has(page))
      .filter((page) => !answerPages.has(page))
      .filter((page) => sourceBlockPages.has(page))
      .map((page) => ({ page, title: "", reason: "source_blocks_on_page_not_linked_to_built_exercise" }));
    const missingAnswers = sourceUnits.flatMap((unit, unitIndex) =>
      unit.questions
        .filter((q) => !answerLookup.get(q, answerUsageCounts))
        .map((q) => ({
          sourceIndex: unitIndex + 1,
          page: q.page,
          passagePages: unit.passagePages,
          itemRange: unitQuestionRange(unit),
          item: q.number,
          title: unit.title ?? "",
          reason: "no_source_answer_key_entry",
          note: "The extracted blocks do not contain a matching answer_key_entry. If the PDF visibly has a red-boxed answer here, re-run extraction/vision for this page or complete the answer manually.",
        })),
    );
    const badExerciseIds = new Set<string>();
    for (const d of added) if (d.exerciseId) badExerciseIds.add(d.exerciseId);
    for (const d of modified) {
      const match = matchedPairs.find((pair) => pair.src.sourceIndex === d.sourceIndex);
      if (match?.ex?.id) badExerciseIds.add(match.ex.id);
    }
    for (const d of numberingDiffs) if (d.exerciseId) badExerciseIds.add(d.exerciseId);
    for (const d of answerMismatches) if (d.exerciseId) badExerciseIds.add(d.exerciseId);
    const removedSourceIndexes = new Set(removed.map((d) => d.sourceIndex));
    for (const d of missingAnswers) {
      const match = matchedPairs.find((pair) => pair.src.sourceIndex === d.sourceIndex);
      if (match?.ex?.id) badExerciseIds.add(match.ex.id);
    }
    const publishableExerciseIds = matchedPairs
      .filter((pair) => pair.ex?.id && !badExerciseIds.has(pair.ex.id) && !removedSourceIndexes.has(pair.src.sourceIndex))
      .map((pair) => pair.ex.id as string);
    const hasIssues = added.length > 0 || removed.length > 0 || unbuiltPassages.length > 0 || modified.length > 0 || numberingDiffs.length > 0 || sectionDiffs.length > 0 || answerMismatches.length > 0 || missingAnswers.length > 0;
    const partialPass = publishableExerciseIds.length > 0 && hasIssues;
    const status: "pass" | "fail" = !hasIssues ? "pass" : "fail";

    const { data: report, error: repErr } = await context.supabase
      .from("pdf_fidelity_reports")
      .insert({
        exam_import_id: data.examImportId,
        status,
        added_count: added.length,
        removed_count: removed.length,
        modified_count: modified.length,
        numbering_diff_count: numberingDiffs.length,
        section_diff_count: sectionDiffs.length,
        details: {
          reconciliation: {
            pdfPassagesFound: blocks.filter((b) => b?.type === "passage" && (!builtTeil || sourceBlockTeil(b, builtTeil) === builtTeil)).length,
            pdfExerciseUnitsFound: sourceUnits.length,
            exercisesCreated: orderedExercises.length,
            questionsExtracted: sourceUnits.reduce((sum, unit) => sum + unit.questions.length, 0),
            answerKeysExtracted: answerLookup.count,
            unbuiltPassages,
            publishableExercises: publishableExerciseIds.length,
            blockedExercises: badExerciseIds.size,
            skippedPages,
            mergedPages: [],
            ignoredPages: [],
            mergedPassages: [],
          },
          publishMode: partialPass ? "partial" : status === "pass" ? "all" : "blocked",
          publishableExerciseIds,
          blockedExerciseIds: [...badExerciseIds],
          failedSourceUnits: removed,
          answerMismatches,
          missingAnswers,
          sampleComparisons,
          added,
          removed,
          modified,
          numberingDiffs,
          sectionDiffs,
        },
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (repErr) throw new Error(repErr.message);

    return {
      status,
      reportId: report?.id,
      summary: {
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        numberingDiffs: numberingDiffs.length,
        sectionDiffs: sectionDiffs.length,
      },
      details: { added, removed, modified, numberingDiffs, sectionDiffs, answerMismatches, missingAnswers, sampleComparisons },
    };
  });

/**
 * Get the latest fidelity report for an import (admin).
 */
export const getLatestFidelityReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { examImportId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: report } = await context.supabase
      .from("pdf_fidelity_reports")
      .select("*")
      .eq("exam_import_id", data.examImportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { report };
  });

/**
 * Permanently delete a PDF import and EVERYTHING derived from it:
 * the storage file, the extraction, fidelity reports, draft exercises
 * created from it, and their answer keys (including all model variants).
 * Published exercises are NOT deleted — they must be unpublished manually.
 */
export const deletePdfImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importId: string; force?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const { data: imp, error: impErr } = await context.supabase
      .from("pdf_imports")
      .select("id, storage_path, kind")
      .eq("id", data.importId)
      .maybeSingle();
    if (impErr) throw new Error(impErr.message);
    if (!imp) throw new Error("Import nicht gefunden.");

    const removed = {
      storage: false,
      extraction: 0,
      fidelityReports: 0,
      exercises: 0,
      answerKeys: 0,
      linkedKeyImports: 0,
    };

    // Draft exercises built from this import
    const { data: exs } = await context.supabase
      .from("exercises")
      .select("id, status")
      .eq("source_pdf_import_id", data.importId);
    const exerciseIds = (exs ?? []).map((e: any) => e.id);
    const published = (exs ?? []).filter((e: any) => e.status === "published");
    if (published.length > 0 && !data.force) {
      throw new Error(
        `Es gibt ${published.length} bereits veröffentlichte Übung(en) aus diesem Import. ` +
        `Bitte zuerst zurückziehen oder Löschung mit "force" bestätigen.`,
      );
    }

    if (exerciseIds.length > 0) {
      const { count: akCount } = await context.supabase
        .from("exercise_answer_keys")
        .delete({ count: "exact" })
        .in("exercise_id", exerciseIds);
      removed.answerKeys = akCount ?? 0;

      const { count: exCount } = await context.supabase
        .from("exercises")
        .delete({ count: "exact" })
        .in("id", exerciseIds);
      removed.exercises = exCount ?? 0;
    }

    // Answer keys that reference this import directly (no exercise yet)
    await context.supabase
      .from("exercise_answer_keys")
      .delete()
      .eq("pdf_import_id", data.importId);

    // Fidelity reports for this exam import
    const { count: frCount } = await context.supabase
      .from("pdf_fidelity_reports")
      .delete({ count: "exact" })
      .eq("exam_import_id", data.importId);
    removed.fidelityReports = frCount ?? 0;

    // Extraction rows for this import
    const { count: extCount } = await context.supabase
      .from("pdf_extractions")
      .delete({ count: "exact" })
      .eq("import_id", data.importId);
    removed.extraction = extCount ?? 0;

    // Detach any answer-key imports that pointed at this exam
    const { count: linkedCount } = await context.supabase
      .from("pdf_imports")
      .update({ linked_import_id: null }, { count: "exact" })
      .eq("linked_import_id", data.importId);
    removed.linkedKeyImports = linkedCount ?? 0;

    // Remove the file from storage (best-effort; do not fail the whole delete)
    if (imp.storage_path) {
      const { error: storageErr } = await context.supabase.storage
        .from("pdf-imports")
        .remove([imp.storage_path]);
      if (!storageErr) removed.storage = true;
    }

    const { error: delErr } = await context.supabase
      .from("pdf_imports")
      .delete()
      .eq("id", data.importId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true, removed };
  });
// ----------------------------------------------------------------------------
// Topic-title extraction: derive a short, student-friendly title from a German
// passage. Picks the most frequent capitalised content noun (German nouns are
// capitalised), which is almost always the topic the passage is about.
// Returns "" if no good candidate exists; callers fall back to the question
// number. Never returns generic placeholders like "Text 1".
// ----------------------------------------------------------------------------
function deriveTopicTitle(text: string): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";

  // 1. Email/letter "Betreff:" line wins outright.
  const subj = raw.match(/Betreff\s*:\s*([^\n\r]{2,80})/i);
  if (subj) return cleanT(subj[1]);

  // 2. A short, title-like first line (no terminal punctuation, ≤ 60 chars).
  const firstLine = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  if (firstLine && firstLine.length <= 60 && !/[.!?:]$/.test(firstLine) && firstLine.split(/\s+/).length <= 8) {
    return cleanT(firstLine);
  }

  // 3. Most frequent capitalised noun, excluding sentence-start function words.
  const stop = new Set([
    "Der","Die","Das","Den","Dem","Des","Ein","Eine","Einen","Einem","Einer","Eines",
    "Und","Aber","Oder","Denn","Sondern","Wenn","Weil","Dass","Ob","Als","Wie","Wo",
    "Ich","Du","Er","Sie","Es","Wir","Ihr","Mein","Dein","Sein","Unser","Euer","Ihre",
    "Hier","Dort","Heute","Morgen","Gestern","Jetzt","Auch","Nicht","Nur","Schon","Noch",
    "Mit","Ohne","Für","Gegen","Bei","Von","Zu","Aus","Nach","Vor","Über","Unter","Auf","An","In","Am","Im",
    "Liebe","Lieber","Hallo","Sehr","Geehrte","Geehrter","Herr","Frau","Beste","Viele","Grüße","Grüsse","Mit","Freundliche",
    "Was","Wer","Wann","Warum","Wieso","Welche","Welcher","Welches",
  ]);
  const freq = new Map<string, number>();
  const words = raw.match(/\b[A-ZÄÖÜ][a-zäöüß-]{3,}\b/g) ?? [];
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  if (freq.size === 0) return cleanT(firstLine.slice(0, 60));
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (top && top[1] >= 2) return top[0];

  // 4. Last resort: trimmed first sentence (max ~6 words).
  const sent = raw.split(/[.!?]\s+/)[0] ?? "";
  return cleanT(sent.split(/\s+/).slice(0, 6).join(" "));
}

function cleanT(s: string): string {
  return (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/^["„»«'`]+|["“”»«'`]+$/g, "")
    .replace(/[.,;:!?]+$/, "")
    .trim();
}

// ============================================================================
// BULK CLEANUP / RESET TOOLS
// ----------------------------------------------------------------------------
// These exist so we can reset the platform between importer iterations
// without leaving stale exercises, attempts, fidelity reports, or storage
// objects behind. Every function is super_admin only and returns counts of
// what it touched so the admin UI can show an audit trail.
// ============================================================================

/** Delete multiple PDF imports in one call. Reuses the single-import delete
 *  semantics (cascades to exercises, answer keys, fidelity, extractions,
 *  storage) but allows `force` to also wipe published exercises. */
export const bulkDeletePdfImports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { importIds: string[]; force?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const results: Array<{ importId: string; ok: boolean; error?: string; removed?: any }> = [];
    const totals = { imports: 0, exercises: 0, answerKeys: 0, fidelityReports: 0, extractions: 0 };
    for (const importId of data.importIds) {
      try {
        const r = await deleteOneImport(context, importId, !!data.force);
        results.push({ importId, ok: true, removed: r });
        totals.imports += 1;
        totals.exercises += r.exercises ?? 0;
        totals.answerKeys += r.answerKeys ?? 0;
        totals.fidelityReports += r.fidelityReports ?? 0;
        totals.extractions += r.extraction ?? 0;
      } catch (e: any) {
        results.push({ importId, ok: false, error: e?.message ?? String(e) });
      }
    }
    return { ok: true, totals, results };
  });

/** Wipe ALL PDF-sourced data: imports, extractions, fidelity reports,
 *  exercises (including published), answer keys, and storage objects.
 *  Hard guard via a confirmation phrase to avoid accidental clicks. */
export const wipeAllPdfData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.confirm !== "WIPE-ALL-PDF-DATA") {
      throw new Error('Bestätigung fehlt. Bitte exakt "WIPE-ALL-PDF-DATA" eingeben.');
    }
    const { data: imports } = await context.supabase
      .from("pdf_imports")
      .select("id");
    const ids = (imports ?? []).map((r: any) => r.id);
    const totals = { imports: 0, exercises: 0, answerKeys: 0, fidelityReports: 0, extractions: 0 };
    for (const importId of ids) {
      try {
        const r = await deleteOneImport(context, importId, true);
        totals.imports += 1;
        totals.exercises += r.exercises ?? 0;
        totals.answerKeys += r.answerKeys ?? 0;
        totals.fidelityReports += r.fidelityReports ?? 0;
        totals.extractions += r.extraction ?? 0;
      } catch {
        // continue; we want a best-effort wipe
      }
    }
    // Orphan PDF-sourced exercises (import already gone) — also remove.
    const { count: orphanCount } = await context.supabase
      .from("exercises")
      .delete({ count: "exact" })
      .not("source_pdf_import_id", "is", null);
    return { ok: true, totals, orphanExercisesRemoved: orphanCount ?? 0 };
  });

/** Delete exercises by filter. `source: "pdf"` is the default to avoid
 *  nuking hand-authored content. Returns counts. */
export const deleteExercisesByFilter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    level?: "b1" | "b2";
    module?: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
    teil?: number;
    status?: "draft" | "hidden" | "published";
    source?: "pdf" | "manual" | "all";
    importId?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    let q = context.supabase.from("exercises").delete({ count: "exact" });
    if (data.level) q = q.eq("level", data.level);
    if (data.module) q = q.eq("module", data.module);
    if (typeof data.teil === "number") q = q.eq("teil", data.teil);
    if (data.status) q = q.eq("status", data.status);
    if (data.importId) q = q.eq("source_pdf_import_id", data.importId);
    const source = data.source ?? "pdf";
    if (source === "pdf") q = q.not("source_pdf_import_id", "is", null);
    if (source === "manual") q = q.is("source_pdf_import_id", null);
    // Need at least ONE narrowing filter so we never accidentally wipe the
    // entire table from a misclick.
    const hasFilter = !!(data.level || data.module || typeof data.teil === "number" || data.status || data.importId);
    if (!hasFilter && source === "all") {
      throw new Error("Mindestens ein Filter erforderlich (Level, Modul, Teil, Status oder Import).");
    }
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, deleted: count ?? 0 };
  });

/** Find duplicate exercises grouped by (level, module, teil, original_numbering,
 *  normalized prompt). Returns groups with >1 row so the admin can review. */
export const findDuplicateExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await context.supabase
      .from("exercises")
      .select("id, level, module, teil, original_numbering, prompt, title, status, created_at, source_pdf_import_id")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 200);
    const groups = new Map<string, any[]>();
    for (const row of data ?? []) {
      const key = [row.level, row.module, row.teil, row.original_numbering ?? "", norm(row.prompt)].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    const dupes = [...groups.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([key, rows]) => ({ key, count: rows.length, rows }));
    return { ok: true, groups: dupes, totalDuplicateRows: dupes.reduce((s, g) => s + (g.count - 1), 0) };
  });

/** Delete duplicate exercises, keeping one per group. */
export const deleteDuplicateExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { keep?: "oldest" | "newest" }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("exercises")
      .select("id, level, module, teil, original_numbering, prompt, created_at, status")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 200);
    const groups = new Map<string, any[]>();
    for (const row of rows ?? []) {
      const key = [row.level, row.module, row.teil, row.original_numbering ?? "", norm(row.prompt)].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    const toDelete: string[] = [];
    const keepNewest = data.keep === "newest";
    for (const [, rs] of groups) {
      if (rs.length < 2) continue;
      const sorted = [...rs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const keeper = keepNewest ? sorted[sorted.length - 1] : sorted[0];
      for (const r of sorted) if (r.id !== keeper.id) toDelete.push(r.id);
    }
    if (toDelete.length === 0) return { ok: true, deleted: 0 };
    const { count, error: delErr } = await context.supabase
      .from("exercises")
      .delete({ count: "exact" })
      .in("id", toDelete);
    if (delErr) throw new Error(delErr.message);
    return { ok: true, deleted: count ?? 0 };
  });

/** Internal: delete one PDF import + everything tied to it. Mirrors the
 *  logic in `deletePdfImport`. Kept as a plain function so the bulk endpoints
 *  can call it without going back through RPC. */
async function deleteOneImport(context: Ctx, importId: string, force: boolean) {
  const { data: imp, error: impErr } = await context.supabase
    .from("pdf_imports").select("id, storage_path").eq("id", importId).maybeSingle();
  if (impErr) throw new Error(impErr.message);
  if (!imp) throw new Error("Import nicht gefunden.");

  const removed = { storage: false, extraction: 0, fidelityReports: 0, exercises: 0, answerKeys: 0, linkedKeyImports: 0 };

  const { data: exs } = await context.supabase
    .from("exercises").select("id, status").eq("source_pdf_import_id", importId);
  const exerciseIds = (exs ?? []).map((e: any) => e.id);
  const published = (exs ?? []).filter((e: any) => e.status === "published");
  if (published.length > 0 && !force) {
    throw new Error(`${published.length} veröffentlichte Übung(en) — bitte mit "force" bestätigen.`);
  }
  if (exerciseIds.length > 0) {
    const { count: akCount } = await context.supabase
      .from("exercise_answer_keys").delete({ count: "exact" }).in("exercise_id", exerciseIds);
    removed.answerKeys = akCount ?? 0;
    const { count: exCount } = await context.supabase
      .from("exercises").delete({ count: "exact" }).in("id", exerciseIds);
    removed.exercises = exCount ?? 0;
  }
  await context.supabase.from("exercise_answer_keys").delete().eq("pdf_import_id", importId);
  const { count: frCount } = await context.supabase
    .from("pdf_fidelity_reports").delete({ count: "exact" }).eq("exam_import_id", importId);
  removed.fidelityReports = frCount ?? 0;
  const { count: extCount } = await context.supabase
    .from("pdf_extractions").delete({ count: "exact" }).eq("import_id", importId);
  removed.extraction = extCount ?? 0;
  const { count: linkedCount } = await context.supabase
    .from("pdf_imports").update({ linked_import_id: null }, { count: "exact" }).eq("linked_import_id", importId);
  removed.linkedKeyImports = linkedCount ?? 0;
  if (imp.storage_path) {
    const { error: storageErr } = await context.supabase.storage.from("pdf-imports").remove([imp.storage_path]);
    if (!storageErr) removed.storage = true;
  }
  const { error: delErr } = await context.supabase.from("pdf_imports").delete().eq("id", importId);
  if (delErr) throw new Error(delErr.message);
  return removed;
}

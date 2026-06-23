import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PDFDocument } from "pdf-lib";
import { LIMITS } from "@/lib/rate-limiter.server";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .in("role", ["admin", "super_admin"])
    .limit(1);
  if (!data || data.length === 0) throw new Error("Forbidden: admin only");
}
async function assertSuperAdmin(ctx: Ctx) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "super_admin")
    .limit(1);
  if (!data || data.length === 0) throw new Error("Forbidden: super_admin only");
}

/**
 * Create a PDF import row (exam or answer key).
 */
export const createPdfImportV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      storagePath: string;
      originalName: string;
      kind: "exam" | "answer_key" | "combined";
      level?: "b1" | "b2" | null;
      linkedImportId?: string | null;
    }) => d,
  )
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
const EXTRACTION_MODEL = "google/gemini-2.5-flash-lite";
const EXTRACTION_FALLBACK_MODEL = "google/gemini-2.5-flash";
const CHUNK_PAGES = 6;
const GEMINI_TIMEOUT_MS = 85_000;

const GEMINI_DIRECT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
function toDirectGeminiModel(model: string): string {
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
const DOMAIN_OR_EMAIL_RX =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/\S*)?\b|\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i;
const UNUSABLE_REASON_RX =
  /\b(unreadable|unlesbar|corrupt|corrupted|beschädigt|empty|missing|blank|no text|kein text|truncated|abgeschnitten|failed|failure|timeout)\b/i;
const HARD_FAILURE_REASON_RX =
  /\b(corrupt|corrupted|beschädigt|empty|missing|blank|no text|kein text|failed|failure|timeout)\b/i;

function isTrulyUnusableLowConfidenceItem(item: any) {
  const snippet = String(item?.snippet ?? "").trim();
  const reason = String(item?.reason ?? "");
  if (!snippet) return true;
  if (/\[\?\]|<22>|□|■|▯|◻/.test(snippet)) return true;
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
  const hasArabicSignal =
    ARABIC_TEXT_RX.test(snippet) || /arabic|arabisch|arabischen|arabische|arabischer/i.test(reason);
  const hasGermanLatinText = /[A-Za-zÄÖÜäöüß]/.test(snippet);
  const onlyUnclearMarks = /^[?\s.,;:!()\[\]{}\-–—_"'`´]*$/.test(snippet);
  if (hasArabicSignal && (!hasGermanLatinText || onlyUnclearMarks)) return true;
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
    canBuild:
      failedChunks.length === 0 && !incomplete && (manualReviewResolved || blockingLowConfidenceItems.length === 0),
  };
}

function normalizeItemNumber(value: any) {
  return String(value ?? "")
    .trim()
    .replace(/\.$/, "");
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

    const shouldStartNewUnit = !currentUnit || currentUnit.passageKey !== passageKey;

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
  const letter = String(value ?? "")
    .trim()
    .match(/[A-Ea-eXx]/)?.[0];
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
    const answer =
      normalizeAnswerLetter(b.answer) ??
      String(b.answer ?? "")
        .trim()
        .toUpperCase();
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
  for (const [k, set] of seenExactByPage)
    if (set.size > 1) {
      exactByPage.delete(k);
      conflicts.push({ key: k, answers: [...set] });
    }
  for (const [k, set] of seenUnmodelledByPage)
    if (set.size > 1) {
      unmodelledByPage.delete(k);
      conflicts.push({ key: k, answers: [...set] });
    }
  return {
    keyFor(q: SourceQuestion) {
      return q.model ? `${q.model}::${q.teil}::${q.number}` : `${q.teil}::${q.number}`;
    },
    get(q: SourceQuestion, usageCounts?: Map<string, number>) {
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
        if (unmodelledByPage.has(`${unmodelledWildKey}::p${page}`))
          return unmodelledByPage.get(`${unmodelledWildKey}::p${page}`) ?? "";
      }
      if (exactKey && usageCounts && (usageCounts.get(exactKey) ?? 0) !== 1) return "";
      if (!exactKey && usageCounts && (usageCounts.get(unmodelledKey) ?? 0) !== 1) return "";
      return (
        (exactKey ? exact.get(exactKey) : undefined) ??
        unmodelled.get(unmodelledKey) ??
        (exactWildKey ? exact.get(exactWildKey) : undefined) ??
        unmodelled.get(unmodelledWildKey) ??
        ""
      );
    },
    count: exactByPage.size + unmodelledByPage.size,
    conflicts,
  };
}

function buildAnswerUsageCounts(units: SourceExerciseUnit[], lookup: ReturnType<typeof buildAnswerLookup>) {
  const counts = new Map<string, number>();
  for (const unit of units)
    for (const q of unit.questions) {
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
  const xRule =
    'IMPORTANT: For matching exercises (Lesen Teil 2/3 Zuordnung), the answer X means \'kein passender Text\' — no matching text. X is an OFFICIAL correct answer. Always emit answer_key_entry blocks with "answer": "X" when the official solution is X. Never drop, replace, or leave X answers blank.';
  if (kind === "answer_key")
    return `This is a TELC answer key (Lösungsschlüssel). Extract every item number with its correct answer verbatim. Correct answers may be visually marked by small red boxes/frames around a, b, c, or x; treat those red-boxed letters as official answer_key_entry blocks. ${xRule}`;
  if (kind === "combined")
    return `This is a COMBINED TELC PDF that contains both exam content (texts, questions, options) AND the answer key (Lösungsschlüssel / Lösungen). Extract everything verbatim. If multiple Modelle/Übungstests are present, tag every block with its model number. Emit answer_key_entry blocks for the solution table(s) using the same model tag. Correct answers may be marked by small red boxes around a/b/c/x on answer pages or directly on question pages; visually inspect them and emit answer_key_entry blocks with absolute page numbers. ${xRule}`;
  return `This is a TELC exam paper. Extract every instruction, text, question, and option verbatim. If correct answers are visibly marked by red boxes/frames around option letters (including X for matching exercises), also emit answer_key_entry blocks for those marked letters. ${xRule}`;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
  await supabase
    .from("pdf_imports")
    .update({ notes: next, extraction_started_at: new Date().toISOString() })
    .eq("id", importId);
  try {
    console.log("[extractPdfVerbatim]", line);
  } catch {}
}

function flattenBlocks(blocks: any[], startPage: number, endPage: number): any[] {
  const out: any[] = [];
  const NOISE_RX =
    /(whats\s*app|telegram|facebook|instagram|tiktok|youtube|gruppe\s+whatsapp|fließend\s+deutsch.*telc|inssaf|t\.me\/|wa\.me\/|https?:\/\/|©|copyright|all rights reserved)/i;
  const ARABIC_RX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const stripArabic = (s: string) =>
    s
      .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+([.,;:!?])/g, "$1")
      .trim();
  const isNoiseText = (s: string) => {
    const t = (s ?? "").trim();
    if (!t) return true;
    if (NOISE_RX.test(t)) return true;
    return false;
  };
  const isIndexPassage = (text: string) => {
    const t = (text ?? "").trim();
    if (!t) return false;
    const lines = t
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 6) return false;
    const titleLike = lines.filter((l) => l.length <= 40 && !/[.!?]$/.test(l)).length;
    return titleLike / lines.length >= 0.75;
  };
  const visit = (b: any) => {
    if (!b || typeof b !== "object") return;
    if (Array.isArray(b.blocks)) for (const child of b.blocks) visit(child);
    const rawType = String(b.type ?? "").toLowerCase();
    const type = [
      "section",
      "instruction",
      "passage",
      "question",
      "answer_key_entry",
      "image_ref",
      "audio_ref",
    ].includes(rawType)
      ? rawType
      : null;
    if (!type) return;
    const p = Number(b.page);
    const page =
      Number.isFinite(p) && p > 0 && p <= endPage - startPage + 1
        ? startPage + p - 1
        : Number.isFinite(p) && p >= startPage && p <= endPage
          ? p
          : startPage;
    const model = ["multiple_choice", "true_false", "cloze", "matching", "open_text"].includes(String(b.model ?? ""))
      ? null
      : (b.model ?? null);
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
            const checked =
              Boolean(o.correct ?? o.is_correct ?? o.checked) || markerRx.test(rawLabel) || markerRx.test(rawText);
            const label = rawLabel.replace(/[✅☑✓✔⬜□☐]/g, "").trim();
            const text = stripArabic(rawText.replace(/[✅☑✓✔⬜□☐]/g, ""));
            if (checked && !base.correct_answer)
              base.correct_answer = label.match(/[A-EXa-ex]/)?.[0]?.toUpperCase() ?? null;
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
      if (isIndexPassage(base.text)) return;
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

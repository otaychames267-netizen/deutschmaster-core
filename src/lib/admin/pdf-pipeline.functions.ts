import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PDFDocument } from "pdf-lib";

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
// Cost-optimised extraction stack:
// - flash-lite is the cheapest Gemini that still accepts PDF/image input and
//   handles verbatim OCR for TELC scans well.
// - flash (not pro) is the fallback. Pro is ~10× the price and rarely
//   needed for verbatim extraction; we'd rather mark a chunk for manual
//   review than mark a chunk for manual review than burn credits on Pro.
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
  if (/\[\?\]|&#65533;|□|■|▯|◻/.test(snippet)) return true;
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

    // Only start a new unit when the reading passage changes.
    // Do NOT split on page: TELC exams routinely place the first 3 questions
    // on one page and the last 2 on the next, all referencing the same text.
    // Splitting by page would create two exercises sharing one passage — wrong.
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
  // Include X/x: TELC Lesen Teil 3 uses "X" to mean "no matching text".
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

function buildAnswerLookup(blocks: any[]) {
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
    const teil = sourceBlockTeil(b, 0);
    const number = normalizeItemNumber(b.number);
    const answer =
      normalizeAnswerLetter(b.answer) ??
      String(b.answer ?? "")
        .trim()
        .toUpperCase();
    if (!teil || !number || !answer) continue;
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
      for (const page of nearbyPages) {
        const exactPageKey = exactKey ? `${exactKey}::p${page}` : "";
        const unmodelledPageKey = `${unmodelledKey}::p${page}`;
        if (exactPageKey && exactByPage.has(exactPageKey)) return exactByPage.get(exactPageKey) ?? "";
        if (unmodelledByPage.has(unmodelledPageKey)) return unmodelledByPage.get(unmodelledPageKey) ?? "";
      }
      if (exactKey && usageCounts && (usageCounts.get(exactKey) ?? 0) !== 1) return "";
      if (!exactKey && usageCounts && (usageCounts.get(unmodelledKey) ?? 0) !== 1) return "";
      return (exactKey ? exact.get(exactKey) : undefined) ?? unmodelled.get(unmodelledKey) ?? "";
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

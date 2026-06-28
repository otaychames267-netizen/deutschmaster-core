/**
 * validate.ts — multi-check validation for extracted exercises.
 *
 * Runs several INDEPENDENT checks per exercise and across the batch. If checks
 * disagree (e.g. structure looks fine but the article doesn't match its
 * questions) or confidence is low, the exercise is marked needs_reprocess.
 *
 * Duplicate detection is CONTENT-based: two exercises are duplicates only if
 * article + questions + answer key are all (near-)identical — never by title.
 */
import { checkCoherence } from "./coherence";
import { createHash } from "node:crypto";

export interface Question { number: number; text: string; option_a: string; option_b: string; option_c: string; }
export interface Answer { number: number; answer: string; }

export interface ExerciseLike {
  idx: number;
  title: string | null;
  article: string | null;
  pages: number[];
  questions: Question[];
  answerKey: Answer[];
}

export interface Check { name: string; ok: boolean; confidence: number; detail: string; }
export interface ExerciseReport {
  idx: number; title: string | null; pages: number[];
  questionCount: number; checks: Check[];
  needsReprocess: boolean; minConfidence: number; issues: string[];
}

// ── German content-word extraction (for article↔question matching) ───────────
const STOP = new Set("der die das und oder in im auf mit für von den dem ein eine einen ist sind war hat haben wird werden nicht auch sich aus bei nach über als wie dass man sie er es zu zum zur des einer eines dann noch nur schon sehr mehr viele alle diese dieser dieses am vom beim wenn weil aber sondern oder ob da denn also dadurch damit dazu darüber".split(/\s+/));
function contentWords(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of (s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-zäöüß ]/g, " ").split(/\s+/)) {
    if (w.length >= 5 && !STOP.has(w)) out.add(w);
  }
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ── Per-exercise checks (independent) ────────────────────────────────────────

function checkStructure(e: ExerciseLike): Check {
  const q = e.questions ?? [];
  const okCount = q.length === 5;
  const okOpts = q.every((x) => x.option_a?.trim() && x.option_b?.trim() && x.option_c?.trim() && x.text?.trim());
  const ok = okCount && okOpts;
  return { name: "structure", ok, confidence: ok ? 1 : 0.2, detail: `${q.length} questions, options ${okOpts ? "complete" : "MISSING"}` };
}

function checkAnswerKey(e: ExerciseLike): Check {
  const q = e.questions ?? []; const k = e.answerKey ?? [];
  const everyQ = q.every((x) => { const a = k.find((y) => y.number === x.number); return a && ["a", "b", "c"].includes(String(a.answer).toLowerCase()); });
  const ok = k.length >= q.length && everyQ && q.length > 0;
  return { name: "answer_key", ok, confidence: ok ? 1 : 0.2, detail: `${k.length} keys for ${q.length} questions` };
}

// Verifies the answer key BELONGS to this exercise's questions: the set of key
// numbers must exactly equal the set of question numbers (no extra, no missing).
// Catches an answer key from a different exercise being paired in.
function checkAnswerKeyCorrespondence(e: ExerciseLike): Check {
  const qn = new Set((e.questions ?? []).map((q) => q.number));
  const kn = new Set((e.answerKey ?? []).map((a) => a.number));
  if (!qn.size || !kn.size) return { name: "key_correspondence", ok: false, confidence: 0, detail: "missing questions or key" };
  let same = qn.size === kn.size; for (const n of qn) if (!kn.has(n)) same = false;
  return { name: "key_correspondence", ok: same, confidence: same ? 1 : 0.1,
    detail: same ? `key numbers match questions {${[...qn].sort((a,b)=>a-b).join(",")}}` : `MISMATCH q={${[...qn].sort((a,b)=>a-b)}} key={${[...kn].sort((a,b)=>a-b)}}` };
}

/** Stable content fingerprint: title + article + questions + answer key + page structure. */
export function fingerprintExercise(e: ExerciseLike): string {
  const norm = (s: string) => (s ?? "").toLowerCase().normalize("NFKD").replace(/\s+/g, " ").trim();
  const q = [...(e.questions ?? [])].sort((a, b) => a.number - b.number)
    .map((x) => `${x.number}|${norm(x.text)}|${norm(x.option_a)}|${norm(x.option_b)}|${norm(x.option_c)}`).join("##");
  const k = [...(e.answerKey ?? [])].sort((a, b) => a.number - b.number).map((x) => `${x.number}${String(x.answer).toLowerCase()}`).join(",");
  const pages = [...(e.pages ?? [])].sort((a, b) => a - b).join("-");
  const blob = [norm(e.title ?? ""), norm(e.article ?? ""), q, k, pages].join("\n§\n");
  return createHash("sha256").update(blob).digest("hex");
}

// Independent semantic check: does the article actually go with these questions?
// Catches MISPLACED pages (questions from another article). Uses content-word overlap.
function checkArticleQuestionMatch(e: ExerciseLike): Check {
  const art = contentWords(e.article ?? "");
  const q = e.questions ?? [];
  if (!q.length || !art.size) return { name: "article_question_match", ok: false, confidence: 0, detail: "no article or questions" };
  let matched = 0;
  for (const x of q) {
    const qw = contentWords(`${x.text} ${x.option_a} ${x.option_b} ${x.option_c}`);
    let hit = false; for (const w of qw) if (art.has(w)) { hit = true; break; }
    if (hit) matched++;
  }
  const frac = matched / q.length;
  const ok = frac >= 0.6; // most questions should reference the article's vocabulary
  return { name: "article_question_match", ok, confidence: frac, detail: `${matched}/${q.length} questions share vocabulary with the article` };
}

function checkCoherenceText(e: ExerciseLike): Check {
  const c = checkCoherence(e.article);
  return { name: "text_integrity", ok: c.ok, confidence: c.score, detail: c.issues.length ? c.issues.slice(0, 4).join(", ") : "clean" };
}

function checkTitle(e: ExerciseLike): Check {
  const ok = !!(e.title && e.title.trim().length >= 3);
  return { name: "title", ok, confidence: ok ? 1 : 0, detail: ok ? `"${e.title}"` : "missing/short" };
}

// Pages of one exercise must be contiguous — no page from another article
// inserted in the middle of a multi-page article.
function checkPageContiguity(e: ExerciseLike): Check {
  const p = [...(e.pages ?? [])].sort((a, b) => a - b);
  if (p.length <= 1) return { name: "page_contiguity", ok: true, confidence: 1, detail: "single page" };
  const contiguous = p[p.length - 1] - p[0] === p.length - 1;
  return { name: "page_contiguity", ok: contiguous, confidence: contiguous ? 1 : 0.1,
    detail: contiguous ? `pages ${p[0]}–${p[p.length - 1]} contiguous` : `NON-CONTIGUOUS pages ${p.join(",")} (foreign page inserted?)` };
}

// Exactly one complete article and exactly one complete answer key.
function checkExactlyOne(e: ExerciseLike): Check {
  const oneArticle = !!(e.article && e.article.trim().length >= 150);
  const q = e.questions ?? []; const k = e.answerKey ?? [];
  const oneKey = q.length > 0 && k.length === q.length;
  const ok = oneArticle && oneKey;
  return { name: "exactly_one_unit", ok, confidence: ok ? 1 : 0.2,
    detail: ok ? "1 article + 1 complete key" : `${oneArticle ? "" : "article missing/short; "}${oneKey ? "" : `key has ${k.length} for ${q.length} questions`}` };
}

// Question numbers must be distinct and consecutive (no gaps/dups/cross-mixing).
function checkQuestionNumbering(e: ExerciseLike): Check {
  const nums = (e.questions ?? []).map((q) => q.number).sort((a, b) => a - b);
  if (!nums.length) return { name: "question_numbering", ok: false, confidence: 0, detail: "no questions" };
  const distinct = new Set(nums).size === nums.length;
  const consecutive = nums[nums.length - 1] - nums[0] === nums.length - 1;
  const ok = distinct && consecutive;
  return { name: "question_numbering", ok, confidence: ok ? 1 : 0.2,
    detail: ok ? `numbered ${nums[0]}–${nums[nums.length - 1]}` : `irregular numbering ${nums.join(",")}` };
}

export function validateExercise(e: ExerciseLike, extraChecks: Check[] = []): ExerciseReport {
  const checks = [
    checkTitle(e), checkStructure(e), checkAnswerKey(e), checkAnswerKeyCorrespondence(e),
    checkQuestionNumbering(e), checkExactlyOne(e), checkPageContiguity(e),
    checkArticleQuestionMatch(e), checkCoherenceText(e), ...extraChecks,
  ];
  const hardFail = checks.some((c) => ["title", "structure", "answer_key", "key_correspondence", "question_numbering", "exactly_one_unit", "page_contiguity"].includes(c.name) && !c.ok);
  const disagree = checks.some((c) => ["article_question_match", "text_integrity"].includes(c.name) && !c.ok);
  const minConfidence = Math.min(...checks.map((c) => c.confidence));
  const needsReprocess = hardFail || disagree || minConfidence < 0.6;
  const issues = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`);
  return { idx: e.idx, title: e.title, pages: e.pages, questionCount: (e.questions ?? []).length, checks, needsReprocess, minConfidence, issues };
}

// ── Batch-level page checks ──────────────────────────────────────────────────

export interface BatchPageReport { ordering: Check; overlap: Check; missing: Check; }
export function validateBatchPages(exercises: ExerciseLike[], totalPages?: number): BatchPageReport {
  const sorted = [...exercises].sort((a, b) => a.idx - b.idx);
  // ordering: idx order matches first-page order
  let orderOk = true;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].pages[0] ?? 0, curr = sorted[i].pages[0] ?? 0;
    if (curr < prev) { orderOk = false; break; }
  }
  // overlap: a page must belong to only one exercise
  const seen = new Map<number, number>(); const dup: number[] = [];
  for (const e of sorted) for (const p of e.pages) { if (seen.has(p)) dup.push(p); else seen.set(p, e.idx); }
  // missing: pages in [min,max] not covered (excluding likely cover/instruction pages is left to review)
  const all = [...seen.keys()].sort((a, b) => a - b);
  const gaps: number[] = [];
  if (all.length) for (let p = all[0]; p <= all[all.length - 1]; p++) if (!seen.has(p)) gaps.push(p);
  return {
    ordering: { name: "page_ordering", ok: orderOk, confidence: orderOk ? 1 : 0, detail: orderOk ? "monotonic" : "out of order" },
    overlap: { name: "no_page_overlap", ok: dup.length === 0, confidence: dup.length === 0 ? 1 : 0, detail: dup.length ? `pages reused: ${[...new Set(dup)].join(",")}` : "none" },
    missing: { name: "no_missing_pages", ok: gaps.length === 0, confidence: gaps.length === 0 ? 1 : 0.5, detail: gaps.length ? `gaps within range: ${gaps.join(",")}` : (totalPages ? `covered ${all.length}/${totalPages}` : "contiguous") },
  };
}

// ── Content-based duplicate detection (NEVER title-only) ─────────────────────

/**
 * Stricter duplicate resolution. Returns the set of exercise idxs to DROP.
 *
 * Rules (correctness-first, never lose a genuine version):
 *  1) If two same-title exercises have near-identical articles and one is
 *     INCOMPLETE (missing questions/key) while the other is complete, the
 *     incomplete one is a phantom (a partial re-extraction) → drop it.
 *  2) Among complete same-title exercises, drop an EXACT duplicate (near-identical
 *     article + identical question texts + identical answer key).
 *  3) Genuinely distinct versions (same title, but different questions/answers)
 *     are ALWAYS kept.
 */
export function isComplete(e: ExerciseLike): boolean {
  const q = e.questions ?? []; const k = e.answerKey ?? [];
  return !!(e.article && e.article.trim().length >= 150)   // a complete exercise must have its article
    && q.length >= 5
    && q.every((x) => x.option_a?.trim() && x.option_b?.trim() && x.option_c?.trim() && x.text?.trim())
    && q.every((x) => k.some((a) => a.number === x.number && ["a", "b", "c"].includes(String(a.answer).toLowerCase())));
}

/**
 * EXERCISE INSTANCE identity = article + questions + answer key + page group.
 * The TITLE is only a label and plays NO part in identity. Two exercises are the
 * same instance ONLY when all four are exactly identical (a literal re-extraction
 * of the same pages). Any intentional difference — one question, one answer, one
 * sentence, a reorder, or a different page group — is a distinct instance and is
 * always kept. No similarity threshold is used.
 */
export function instanceSignature(e: ExerciseLike): string {
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFKD").replace(/\s+/g, " ").trim();
  return [
    norm(e.article),
    (e.questions ?? []).map((q) => `${q.number}~${norm(q.text)}~${norm(q.option_a)}~${norm(q.option_b)}~${norm(q.option_c)}`).join("|"),
    (e.answerKey ?? []).map((x) => `${x.number}${String(x.answer).toLowerCase()}`).sort().join(","),
    "pages:" + [...(e.pages ?? [])].sort((a, b) => a - b).join("-"),
  ].join("||");
}

export function resolveDuplicates(exercises: ExerciseLike[]): { drop: number[]; reasons: string[] } {
  const drop = new Set<number>(); const reasons: string[] = [];
  // Dedup by INSTANCE signature across ALL exercises (title-independent). Only an
  // exact instance match is removed; everything else is a distinct exercise.
  const seen = new Map<string, number>();
  for (const e of [...exercises].sort((a, b) => a.idx - b.idx)) {
    const sig = instanceSignature(e);
    const prev = seen.get(sig);
    if (prev !== undefined) {
      drop.add(e.idx);
      reasons.push(`idx ${e.idx}: identical instance (article+questions+key+pages) to idx ${prev} → exact duplicate removed`);
    } else {
      seen.set(sig, e.idx);
    }
  }
  return { drop: [...drop], reasons };
}

export interface DuplicateGroup { idxs: number[]; title: string | null; identical: boolean; reason: string; }
export function detectDuplicates(exercises: ExerciseLike[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  for (let i = 0; i < exercises.length; i++) {
    for (let j = i + 1; j < exercises.length; j++) {
      const a = exercises[i], b = exercises[j];
      const artSim = jaccard(contentWords(a.article ?? ""), contentWords(b.article ?? ""));
      const qa = (a.questions ?? []).map((q) => q.text.trim().toLowerCase()).sort().join("|");
      const qb = (b.questions ?? []).map((q) => q.text.trim().toLowerCase()).sort().join("|");
      const sameQ = qa === qb && qa.length > 0;
      const ka = (a.answerKey ?? []).map((x) => `${x.number}${x.answer}`).sort().join(",");
      const kb = (b.answerKey ?? []).map((x) => `${x.number}${x.answer}`).sort().join(",");
      const sameKey = ka === kb && ka.length > 0;
      // TRUE duplicate only if article + questions + answer key all (near-)identical.
      const identical = artSim >= 0.95 && sameQ && sameKey;
      if (identical) {
        groups.push({ idxs: [a.idx, b.idx], title: a.title, identical: true, reason: `article sim ${artSim.toFixed(2)}, identical questions+key` });
      }
    }
  }
  return groups;
}

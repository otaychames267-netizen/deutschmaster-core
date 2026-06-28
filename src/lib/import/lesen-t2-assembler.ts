/**
 * lesen-t2-assembler.ts — STAGE 2 of the Lesen Teil 2 pipeline.
 *
 * Turns per-page Gemini extractions into validated exercises, enforcing the
 * rules: PDF is truth, never merge/split wrongly, never invent titles, reject
 * (flag) anything incomplete instead of importing it.
 *
 * Pure function: no network, no DB. Deterministic given the page array.
 */
import type { PageExtraction, PageQuestion, PageAnswer } from "./gemini-vision";

export interface AssembledExercise {
  title: string;                 // real printed headline (may get (2)/(3) suffix for genuine duplicates)
  rawTitle: string;              // headline exactly as printed, before de-duplication
  pageStart: number;
  pageEnd: number;
  article: string;
  questions: PageQuestion[];
  answerKey: PageAnswer[];
  valid: boolean;
  flags: string[];               // reasons it failed validation (empty if valid)
}

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Group consecutive pages that belong to the same exercise.
 * A new exercise starts when a new, different article_headline appears on an
 * article page. Question/answer pages attach to the current exercise.
 */
export function assembleT2(pages: PageExtraction[]): AssembledExercise[] {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const groups: PageExtraction[][] = [];
  let current: PageExtraction[] = [];

  // A new exercise begins at every page that carries an ARTICLE BODY — even if the
  // printed title repeats. Same title + different questions/answers = different
  // versions, all kept (numbered later). Question/key/blank pages attach to the
  // current exercise. We never merge two article bodies into one exercise.
  const startsExercise = (pg: PageExtraction) =>
    (pg.role === "article" || pg.role === "article_with_questions") &&
    !!pg.article_text && pg.article_text.trim().length > 80;

  for (const pg of sorted) {
    if (pg.role === "cover" || pg.role === "toc") continue;

    if (startsExercise(pg)) {
      if (current.length) groups.push(current);
      current = [pg];
    } else {
      if (!current.length) {
        // orphan question/key page with no preceding article body — keep it so it
        // isn't lost; it will be flagged (no article) during validation.
        current = [pg];
      } else {
        current.push(pg);
      }
    }
  }
  if (current.length) groups.push(current);

  // Build + validate each group.
  const built: AssembledExercise[] = groups.map((grp) => {
    const pageStart = grp[0].page;
    const pageEnd = grp[grp.length - 1].page;

    const rawTitle = (grp.find((p) => p.article_headline)?.article_headline ?? "").trim();
    const article = grp
      .filter((p) => p.article_text && p.article_text.trim())
      .map((p) => p.article_text!.trim())
      .join("\n\n")
      .trim();

    // Collect questions (dedupe by number, prefer first occurrence)
    const qMap = new Map<number, PageQuestion>();
    for (const p of grp) for (const q of p.questions ?? []) if (!qMap.has(q.number)) qMap.set(q.number, q);
    const questions = [...qMap.values()].sort((a, b) => a.number - b.number);

    // Collect answer key (dedupe by number)
    const aMap = new Map<number, PageAnswer>();
    for (const p of grp) for (const a of p.answer_key ?? []) if (!aMap.has(a.number)) aMap.set(a.number, a);
    const answerKey = [...aMap.values()].sort((a, b) => a.number - b.number);

    const flags: string[] = [];
    if (!rawTitle) flags.push("no_title");
    if (!article || article.length < 100) flags.push("article_missing_or_short");
    if (questions.length !== 5) flags.push(`expected_5_questions_got_${questions.length}`);
    for (const q of questions) {
      if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim()) {
        flags.push(`question_${q.number}_missing_option`);
      }
    }
    if (answerKey.length === 0) flags.push("no_answer_key");
    else {
      // every question must have a key entry, and answers must be a/b/c
      for (const q of questions) {
        const ans = answerKey.find((a) => a.number === q.number);
        if (!ans) flags.push(`answer_key_missing_for_q${q.number}`);
        else if (!["a", "b", "c"].includes(String(ans.answer).toLowerCase())) flags.push(`answer_key_q${q.number}_invalid`);
      }
    }

    return {
      title: rawTitle,
      rawTitle,
      pageStart, pageEnd,
      article, questions, answerKey,
      valid: flags.length === 0,
      flags,
    };
  });

  // Number versions of the same printed title sequentially: "Parkuhren 1",
  // "Parkuhren 2", … — keeping EVERY version as its own exercise. A title that
  // occurs only once stays plain ("Frau Sebo"). Numbering distinguishes versions;
  // it never merges or drops any.
  const counts = new Map<string, number>();
  for (const ex of built) if (ex.rawTitle) counts.set(norm(ex.rawTitle), (counts.get(norm(ex.rawTitle)) ?? 0) + 1);
  const running = new Map<string, number>();
  for (const ex of built) {
    if (!ex.rawTitle) continue;
    const k = norm(ex.rawTitle);
    if ((counts.get(k) ?? 0) > 1) {
      const n = (running.get(k) ?? 0) + 1;
      running.set(k, n);
      ex.title = `${ex.rawTitle} ${n}`;
    }
  }

  return built;
}

/** Flag titles that look like possible mis-reads (for the review screen). */
export function titleOddity(title: string): string | null {
  if (!title) return "empty";
  if (title.length < 4) return "very_short";
  if (title === title.toUpperCase() && /[A-Z]/.test(title)) return "all_caps";
  if (!/[äöüßa-z]/.test(title)) return "no_lowercase_german";
  return null;
}

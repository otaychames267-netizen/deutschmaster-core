import type { ObservationSheet } from "./features";
import type { Scores } from "./rules";

/**
 * Owner policy for Schreiben grading (2026-10-17: "make it strict — nobody gets more than 35/45, spelling and grammar mistakes must cost points, and a text under 150 words
 * gets less than 10/45"). Pure functions — applied to EVERY grading tier (Claude, the strict free grader, the generic backup) by essay-grader.ts, so the rules hold no matter which
 * model graded.
 *
 *  0. Vocabulary below the exam level (B2: A2/B1 vocabulary) → total ≤ 19/45 (owner 2026-10-17: "less than 20/45 if the Wortschatz is below B2").
 *  1. Word minimum: B2 < 150 words → total ≤ 9/45 (B1 informal letters: < 80 words). Scores are scaled down proportionally.
 *  2. Ceiling: each criterion ≤ 12/15 and the total ≤ 35/45.
 *  3. Only when an observation sheet exists (strict free grader): error density caps Formale Richtigkeit (verified errors, major = 1, minor = 0.5, per 100 words), and
 *     sloppy form caps Kommunikative Gestaltung (no Anrede / no Schlussformel / wrong register / stilted text).
 *     Caps are ≈ 1.5-2 points BELOW what Claude Sonnet 5 gave on average at the same error density (271 essays), i.e. deliberately stricter than the reference.
 */
export const POLICY = { maxTotal: 35, maxPerCriterion: 12, shortTotalCap: 9, weakVocabularyTotalCap: 19, minWordsB2: 150, minWordsB1: 80 } as const;

export function minWordsFor(level: "B1" | "B2"): number {
  return level === "B1" ? POLICY.minWordsB1 : POLICY.minWordsB2;
}

/** Cap on Formale Richtigkeit from the weighted verified-error density (errors per 100 words). */
export function formalAccuracyCap(weightedErrorsPer100: number): number {
  const d = weightedErrorsPer100;
  if (d < 0.3) return 12;
  if (d < 0.7) return 10;
  if (d < 1.2) return 8;
  if (d < 2) return 6;
  if (d < 3) return 4;
  if (d < 5) return 3;
  if (d < 8) return 2;
  return 1;
}

/** Weighted verified errors per 100 words: a major error or ANY spelling / capitalisation error counts 1, every other minor error 0.5 (spelling is checked without mercy). */
export function weightedErrorDensity(errors: { severity: string; category: string }[], words: number): number {
  const w = errors.reduce((sum, e) => sum + (e.severity === "major" || e.category === "spelling_caps" ? 1 : 0.5), 0);
  return (w * 100) / Math.max(1, words);
}

export function taskAchievementCap(obs: ObservationSheet): number {
  const pts = obs.points ?? [];
  const missing = pts.filter((p) => p.status === "missing").length;
  const partial = pts.filter((p) => p.status === "partial").length;
  // owner 2026-10-17: "check whether the answers cover the whole content" — every missing or only superficially treated Inhaltspunkt costs a lot
  if (missing >= 2) return 4;
  if (missing === 1) return 6;
  if (partial >= 2) return 7;
  if (partial === 1) return 9;
  return 12;
}

export function communicativeDesignCap(obs: ObservationSheet, category?: string | null): number {
  let cap = 12;
  if ((obs.connectors_used ?? 0) < 3) cap = Math.min(cap, 9);
  if ((obs.subordinate_clauses ?? 0) < 2) cap = Math.min(cap, 9);
  if (obs.anrede === false) cap = Math.min(cap, 7);
  if (obs.schlussformel === false) cap = Math.min(cap, 8);
  const expected = category === "informell" ? "informal" : "formal_consistent";
  if (obs.register === "mixed") cap = Math.min(cap, 8);
  else if (obs.register && obs.register !== expected) cap = Math.min(cap, 5);
  if (obs.naturalness === "stilted_or_translated") cap = Math.min(cap, 8);
  if ((obs.paragraphs ?? 1) <= 1) cap = Math.min(cap, 9);
  return cap;
}

export interface PolicyResult { scores: Scores; reasons: ("short_text" | "weak_vocabulary" | "ceiling" | "errors_cap_fa" | "error_penalty_fa" | "form_cap_cd" | "content_cap_ta")[]; total: number }

const total = (s: Scores) => s.ta + s.cd + s.fa;

export function applyGradingPolicy(
  input: Scores,
  ctx: { words: number; level: "B1" | "B2"; category?: string | null; obs?: ObservationSheet; weightedErrorsPer100?: number; weakVocabulary?: boolean; /** points to take off Formale Richtigkeit, one per error (zero tolerance) */ faPenalty?: number },
): PolicyResult {
  const reasons: PolicyResult["reasons"] = [];
  let s: Scores = { ...input };

  if (ctx.obs && typeof ctx.weightedErrorsPer100 === "number") {
    const faCap = formalAccuracyCap(ctx.weightedErrorsPer100);
    if (s.fa > faCap) { s = { ...s, fa: faCap }; reasons.push("errors_cap_fa"); }
    const taCap = taskAchievementCap(ctx.obs);
    if (s.ta > taCap) { s = { ...s, ta: taCap }; reasons.push("content_cap_ta"); }
    const cdCap = communicativeDesignCap(ctx.obs, ctx.category);
    if (s.cd > cdCap) { s = { ...s, cd: cdCap }; reasons.push("form_cap_cd"); }
  }

  // zero tolerance: every single error (a one-letter typo included) takes at least a point off Formale Richtigkeit — on every grading tier
  if (ctx.faPenalty && ctx.faPenalty > 0) {
    const faMax = Math.max(0, POLICY.maxPerCriterion - Math.ceil(ctx.faPenalty));
    if (s.fa > faMax) { s = { ...s, fa: faMax }; reasons.push("error_penalty_fa"); }
  }

  const m = POLICY.maxPerCriterion;
  if (s.ta > m || s.cd > m || s.fa > m) { s = { ta: Math.min(s.ta, m), cd: Math.min(s.cd, m), fa: Math.min(s.fa, m) }; if (!reasons.includes("ceiling")) reasons.push("ceiling"); }
  while (total(s) > POLICY.maxTotal) {
    const k = (["ta", "cd", "fa"] as const).reduce((a, b) => (s[b] > s[a] ? b : a), "ta" as "ta" | "cd" | "fa");
    s = { ...s, [k]: s[k] - 1 };
    if (!reasons.includes("ceiling")) reasons.push("ceiling");
  }

  // vocabulary below the exam level (B2 exam: A2 / B1 vocabulary; B1 exam: A2 or lower) → total < 20, whatever the rest of the text earns
  if (ctx.weakVocabulary && total(s) > POLICY.weakVocabularyTotalCap) {
    s = capTotalProportionally(s, POLICY.weakVocabularyTotalCap);
    reasons.push("weak_vocabulary");
  }

  if (ctx.words < minWordsFor(ctx.level) && total(s) > POLICY.shortTotalCap) {
    s = capTotalProportionally(s, POLICY.shortTotalCap);
    reasons.push("short_text");
  }
  return { scores: s, reasons, total: total(s) };
}

/** Scales the three criteria down proportionally so that the total equals `cap` (largest-remainder rounding, never above the cap). */
function capTotalProportionally(s: Scores, cap: number): Scores {
  const t = total(s);
  if (t <= cap) return s;
  let scaled: Scores = { ta: Math.floor((s.ta * cap) / t), cd: Math.floor((s.cd * cap) / t), fa: Math.floor((s.fa * cap) / t) };
  let left = cap - total(scaled);
  const rema = (["ta", "cd", "fa"] as const).map((k) => ({ k, r: (s[k] * cap) / t - scaled[k] })).sort((a, b) => b.r - a.r);
  for (const { k } of rema) { if (left <= 0) break; scaled = { ...scaled, [k]: scaled[k] + 1 }; left--; }
  return scaled;
}

/** German + Arabic sentences appended to the summary so the student understands WHY a criterion is low. Factual examiner remarks only — owner 2026-10-17: the feedback must never mention
 * caps, ceilings, "strict" rules or a replacement system (those are internal mechanics), just say what is wrong with the text. The individual spelling errors are shown as correction cards. */
export function policyNote(reasons: PolicyResult["reasons"], ctx: { words: number; level: "B1" | "B2"; spelling?: { word: string; fix: string | null }[] }): { de: string; ar: string } | null {
  const parts: { de: string; ar: string }[] = [];
  if (reasons.includes("short_text")) {
    const min = minWordsFor(ctx.level);
    parts.push({
      de: `Der Text hat nur ${ctx.words} Wörter, verlangt sind mindestens ${min}. Ein zu kurzer Text kann die Aufgabe nicht vollständig erfüllen.`,
      ar: `النص يحتوي على ${ctx.words} كلمة فقط، والمطلوب ${min} كلمة على الأقل؛ النص القصير لا يمكنه تغطية المطلوب بالكامل.`,
    });
  }
  if (reasons.includes("weak_vocabulary")) {
    parts.push({
      de: `Der Wortschatz liegt unter dem Niveau ${ctx.level}: zu einfach und zu wenig variiert.`,
      ar: `مفردات النص أدنى من مستوى ${ctx.level}: بسيطة جداً وقليلة التنوّع.`,
    });
  }
  if (reasons.includes("content_cap_ta")) {
    parts.push({
      de: "Nicht alle geforderten Inhaltspunkte sind vollständig und konkret behandelt; jeder fehlende oder nur oberflächlich erwähnte Punkt senkt die Bewältigung der Aufgabe deutlich.",
      ar: "ليست كل النقاط المطلوبة في المهمة معالَجة بشكل كامل ومحدّد؛ كل نقطة ناقصة أو مذكورة بسطحية تُخفِّض درجة «إنجاز المهمة» بوضوح.",
    });
  }
  if (reasons.includes("errors_cap_fa") || reasons.includes("error_penalty_fa")) {
    const n = ctx.spelling?.length ?? 0;
    parts.push({
      de: n ? `Rechtschreib- und Grammatikfehler mindern die Formale Richtigkeit deutlich; schon ein falscher Buchstabe zählt als Fehler (Rechtschreibfehler: ${n}, siehe Korrekturen).` : "Rechtschreib- und Grammatikfehler mindern die Formale Richtigkeit deutlich (siehe Korrekturen).",
      ar: n ? `الأخطاء الإملائية والنحوية تُخفِّض درجة «الصحة الشكلية» بوضوح؛ حتى حرف واحد خاطئ يُحسب خطأً (عدد الأخطاء الإملائية: ${n}، انظر التصحيحات).` : "الأخطاء الإملائية والنحوية تُخفِّض درجة «الصحة الشكلية» بوضوح (انظر التصحيحات).",
    });
  }
  if (!parts.length) return null;
  return { de: parts.map((p) => p.de).join(" "), ar: parts.map((p) => p.ar).join(" ") };
}

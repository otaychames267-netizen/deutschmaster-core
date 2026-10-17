/**
 * features.ts — turns an "examiner's observation sheet" (filled by a FREE LLM) plus the raw essay text into the numeric features the calibrated scorer uses.
 *
 * Why this exists (owner 2026-10-17: "a strict grading system for Schreiben that costs nothing"): a free model asked to SCORE an essay is far too generous (measured on 45 real essays
 * against Claude Sonnet 5: total MAE 6.5/45, bias +5.3). The same free model asked only to OBSERVE (count, label, quote) is accurate; the score is then computed by a ridge-regression
 * calibrator fitted on the 271 essays Claude Sonnet 5 had graded (see scripts/strict-grader/). Cross-validated (also on tasks never seen in training): total MAE ≈ 2.5/45, bias ≈ 0,
 * pass/fail (27/45) agreement ≈ 94 %.
 *
 * Pure functions, no I/O — the same code runs in the offline calibration scripts and on the server.
 */

export type ErrorCategory =
  | "case" | "article_gender" | "preposition" | "verb_form_tense" | "word_order" | "spelling_caps" | "punctuation" | "word_choice" | "agreement" | "register" | "other";

export interface ObservedError { quote: string; fix: string; category: ErrorCategory | string; severity: "minor" | "major" | string }

export interface ObservationSheet {
  points?: { point: string; status: "covered" | "partial" | "missing" | string }[];
  on_topic?: "yes" | "partly" | "no" | string;
  task_misread?: boolean;
  anrede?: boolean;
  schlussformel?: boolean;
  betreff_or_opening_line?: boolean;
  paragraphs?: number;
  register?: "formal_consistent" | "mixed" | "informal" | string;
  connectors_used?: number;
  subordinate_clauses?: number;
  advanced_structures?: number;
  naturalness?: "natural" | "mostly_natural" | "stilted_or_translated" | string;
  vocabulary?: "poor" | "adequate" | "rich" | string;
  errors?: ObservedError[];
}

export interface VerifiedError extends ObservedError { q: string }

const norm = (s: string) => String(s).toLowerCase().replace(/[„“”"'’`´]/g, "").replace(/\s+/g, " ").trim();

/** Keeps only errors whose quote REALLY occurs in the essay and whose "fix" actually differs — a model cannot invent mistakes that then lower a student's score. */
export function verifyErrors(essay: string, errors: ObservedError[] | undefined): VerifiedError[] {
  const text = norm(essay);
  const seen = new Set<string>();
  const out: VerifiedError[] = [];
  for (const e of errors ?? []) {
    const q = norm(e?.quote ?? "");
    const f = norm(e?.fix ?? "");
    if (!q || q === f || q.length < 3 || !text.includes(q) || seen.has(q)) continue;
    seen.add(q);
    out.push({ ...e, q });
  }
  return out;
}

const ord = (v: string | undefined, order: string[]) => Math.max(0, order.indexOf(String(v))) / (order.length - 1);

/** The feature vector (names are part of the calibration file contract — keep in sync with scripts/strict-grader/calib.mjs). */
export function buildFeatures(essay: string, obs: ObservationSheet, wordCount: number, category?: string | null): { f: Record<string, number>; errors: VerifiedError[]; words: number } {
  const words = Math.max(1, wordCount || essay.split(/\s+/).filter(Boolean).length);
  const errs = verifyErrors(essay, obs.errors);
  const major = errs.filter((e) => e.severity === "major").length;
  const minor = errs.length - major;
  const per100 = (n: number) => (n * 100) / words;
  const cat = (...c: string[]) => errs.filter((e) => c.includes(String(e.category))).length;
  const pts = obs.points ?? [];
  const covered = pts.filter((p) => p.status === "covered").length;
  const partial = pts.filter((p) => p.status === "partial").length;
  const pointRatio = pts.length ? (covered + 0.5 * partial) / pts.length : 0.5;
  const sentences = Math.max(1, (essay.match(/[.!?]+(\s|$)/g) ?? []).length);
  const toks = essay.toLowerCase().match(/[a-zäöüß]+/g) ?? [];
  const ttr = new Set(toks).size / Math.max(1, toks.length);
  const f: Record<string, number> = {
    words_log: Math.log(words), words_short: words < 100 ? 1 : 0, words_ok: words >= 150 ? 1 : 0,
    sent_len: words / sentences, ttr, long_words: toks.filter((t) => t.length >= 8).length / Math.max(1, toks.length),
    commas_100: ((essay.match(/,/g) ?? []).length * 100) / words,
    point_ratio: pointRatio, points_missing: pts.filter((p) => p.status === "missing").length,
    on_topic: ord(obs.on_topic, ["no", "partly", "yes"]), misread: obs.task_misread ? 1 : 0,
    anrede: obs.anrede ? 1 : 0, schluss: obs.schlussformel ? 1 : 0, betreff: obs.betreff_or_opening_line ? 1 : 0, paragraphs: Math.min(6, Number(obs.paragraphs ?? 1) || 1),
    // an informal personal letter (telc B1) is CORRECT in the informal register; for formal letters the order is the other way round
    register: category === "informell"
      ? ({ informal: 1, mixed: 0.5, formal_consistent: 0.25 } as Record<string, number>)[String(obs.register)] ?? 0.5
      : ord(obs.register, ["informal", "mixed", "formal_consistent"]),
    connectors: Math.min(10, Number(obs.connectors_used ?? 0) || 0), subs_100: per100(Number(obs.subordinate_clauses ?? 0) || 0), adv_100: per100(Number(obs.advanced_structures ?? 0) || 0),
    natural: ord(obs.naturalness, ["stilted_or_translated", "mostly_natural", "natural"]), vocab: ord(obs.vocabulary, ["poor", "adequate", "rich"]),
    err_major_100: per100(major), err_minor_100: per100(minor), err_total_log: Math.log1p(errs.length), err_major_log: Math.log1p(major),
    case_100: per100(cat("case", "article_gender", "agreement")), verb_100: per100(cat("verb_form_tense")), order_100: per100(cat("word_order")),
    spell_100: per100(cat("spelling_caps", "punctuation")), prep_100: per100(cat("preposition")), wc_100: per100(cat("word_choice", "register")),
  };
  return { f, errors: errs, words };
}

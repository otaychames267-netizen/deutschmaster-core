/**
 * essay-grader-gemini.ts — strict telc B2 Schreiben essay grading via Gemini.
 *
 * Replaces essay-grader.ts (Claude) as the live grader — same rubric, same
 * GradingResult shape, same validate() logic, only the transport changes
 * (Anthropic Messages API -> Gemini generateContent, copying the REST/retry
 * pattern already proven in muendlich-evaluator.ts). Student-submitted text
 * is wrapped via wrapUntrustedText before being embedded in the prompt —
 * essay-grader.ts had zero prompt-injection defense; this fixes that.
 *
 * Contract: gradeEssay() returns a validated GradingResult or throws — callers
 * (the grade-essay server route) MUST refund the student's credit on any throw.
 */
import { wrapUntrustedText } from "./sanitize-input";

const GRADING_MODEL = process.env.GRADING_MODEL_GEMINI ?? "gemini-2.5-flash";

/** Student's exam level, e.g. profiles.level ("TELC_B1"/"TELC_B2") normalized to "B1"/"B2". */
export type CefrLevel = "B1" | "B2";

export function normalizeCefrLevel(raw: string | null | undefined): CefrLevel {
  return raw?.toUpperCase().includes("B1") ? "B1" : "B2";
}

function systemPrompt(level: CefrLevel): string {
  return `Du bist ein erfahrener telc-Prüfer für die Prüfung Deutsch ${level}, Prüfungsteil Schreiben.
Bewerte den folgenden Beschwerdebrief eines Kandidaten nach genau vier Kriterien, jeweils 0-25 Punkte:
1. Aufgabenerfüllung (task_fulfillment) — wurden alle in der Aufgabe geforderten Punkte behandelt?
2. Grammatik (grammar) — Korrektheit von Satzbau, Verbformen, Kasus, Wortstellung
3. Aufbau (structure) — Briefform (Anrede, Einleitung, Absätze, Schluss), Textkohärenz, Konnektoren
4. Wortschatz (vocabulary) — Angemessenheit und Vielfalt des Ausdrucks für das ${level}-Niveau

Sei streng und konsistent, wie ein echter telc-Prüfer für das Niveau ${level}. Gib NUR valides JSON zurück, keine Erklärungen außerhalb des JSON, keine Markdown-Codeblöcke:
{
  "task_fulfillment_score": <ganze Zahl 0-25>,
  "grammar_score": <ganze Zahl 0-25>,
  "structure_score": <ganze Zahl 0-25>,
  "vocabulary_score": <ganze Zahl 0-25>,
  "feedback": {
    "task_fulfillment": "<2-3 Sätze auf Deutsch>",
    "grammar": "<2-3 Sätze, wenn möglich mit konkreten Beispielen aus dem Text>",
    "structure": "<2-3 Sätze>",
    "vocabulary": "<2-3 Sätze>",
    "summary": "<3-4 Sätze Gesamtfeedback und konkrete Verbesserungsvorschläge>"
  }
}`;
}

export interface GradingResult {
  task_fulfillment_score: number;
  grammar_score: number;
  structure_score: number;
  vocabulary_score: number;
  overall_score: number;
  passed: boolean;
  feedback: {
    task_fulfillment: string;
    grammar: string;
    structure: string;
    vocabulary: string;
    summary: string;
  };
  model: string;
}

async function fetchT(url: string, opts: any, ms = 45000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const SCORE_KEYS = ["task_fulfillment_score", "grammar_score", "structure_score", "vocabulary_score"] as const;
const FEEDBACK_KEYS = ["task_fulfillment", "grammar", "structure", "vocabulary", "summary"] as const;

function validate(raw: any): Omit<GradingResult, "overall_score" | "passed" | "model"> {
  for (const k of SCORE_KEYS) {
    const v = raw?.[k];
    if (!Number.isInteger(v) || v < 0 || v > 25) {
      throw new Error(`grading response invalid: ${k}=${JSON.stringify(v)} (expected integer 0-25)`);
    }
  }
  const fb = raw?.feedback;
  if (!fb || typeof fb !== "object") throw new Error("grading response invalid: missing feedback object");
  for (const k of FEEDBACK_KEYS) {
    if (!fb[k] || typeof fb[k] !== "string" || !fb[k].trim()) {
      throw new Error(`grading response invalid: feedback.${k} missing or empty`);
    }
  }
  return {
    task_fulfillment_score: raw.task_fulfillment_score,
    grammar_score: raw.grammar_score,
    structure_score: raw.structure_score,
    vocabulary_score: raw.vocabulary_score,
    feedback: {
      task_fulfillment: fb.task_fulfillment,
      grammar: fb.grammar,
      structure: fb.structure,
      vocabulary: fb.vocabulary,
      summary: fb.summary,
    },
  };
}

/** Global daily Gemini spend cap (see api_usage_ledger). Checked by the
 * grade-essay route BEFORE deducting a credit — this module also checks it
 * as defense-in-depth in case a future caller skips that pre-check. */
export async function isBudgetExceeded(supabase: any): Promise<boolean> {
  const cap = Number(process.env.GEMINI_DAILY_TOKEN_CAP ?? Infinity);
  if (!Number.isFinite(cap)) return false;
  const { data } = await supabase.rpc("get_today_api_usage");
  return typeof data === "number" && data >= cap;
}

async function recordUsage(supabase: any, tokens: number): Promise<void> {
  if (!tokens) return;
  await supabase.rpc("record_api_usage", { p_tokens: tokens });
}

export async function gradeEssay(taskPrompt: string, essayText: string, supabase: any, level: CefrLevel = "B2"): Promise<GradingResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  if (await isBudgetExceeded(supabase)) {
    throw new Error("BUDGET_EXCEEDED");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GRADING_MODEL}:generateContent?key=${key}`;
  const userMessage = `AUFGABE:\n${taskPrompt}\n\n---\n\n${wrapUntrustedText("ANTWORT DES KANDIDATEN", essayText)}`;
  const body = {
    contents: [{ parts: [{ text: systemPrompt(level) + "\n\n" + userMessage }] }],
    generationConfig: { temperature: 0, response_mime_type: "application/json" },
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchT(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json: any = await res.json();
      if (res.status === 429) throw new Error("QUOTA_429");
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);

      let text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      text = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      const raw = JSON.parse(text);
      const validated = validate(raw);
      const overall_score =
        validated.task_fulfillment_score + validated.grammar_score + validated.structure_score + validated.vocabulary_score;

      const totalTokens = Number(json.usageMetadata?.totalTokenCount ?? 0);
      await recordUsage(supabase, totalTokens);

      return { ...validated, overall_score, passed: overall_score >= 60, model: GRADING_MODEL };
    } catch (e) {
      lastErr = e;
      // Don't retry on our own validation errors (malformed JSON/scores) — retrying
      // the exact same deterministic (temperature 0) prompt won't fix a schema issue.
      if (String(e).includes("grading response invalid")) throw e;
      if (String(e).includes("QUOTA_429")) throw e;
      if (String(e).includes("BUDGET_EXCEEDED")) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`essay grading failed: ${String(lastErr)}`);
}

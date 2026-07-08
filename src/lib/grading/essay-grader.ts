/**
 * essay-grader.ts — strict telc B2 Schreiben essay grading via Claude.
 *
 * Text-only (no images), so this is a sibling to src/lib/import/vision-provider.ts
 * rather than a reuse of it — different prompt shape, different response schema.
 * Retry/backoff/JSON-parsing style mirrors ClaudeProvider there.
 *
 * Contract: gradeEssay() returns a validated GradingResult or throws — callers
 * (the grade-essay server route) MUST refund the student's credit on any throw.
 */

const GRADING_MODEL = process.env.GRADING_MODEL ?? "claude-sonnet-5";

const SYSTEM_PROMPT = `Du bist ein erfahrener telc-Prüfer für die Prüfung Deutsch B2, Prüfungsteil Schreiben.
Bewerte den folgenden Beschwerdebrief eines Kandidaten nach genau vier Kriterien, jeweils 0-25 Punkte:
1. Aufgabenerfüllung (task_fulfillment) — wurden alle in der Aufgabe geforderten Punkte behandelt?
2. Grammatik (grammar) — Korrektheit von Satzbau, Verbformen, Kasus, Wortstellung
3. Aufbau (structure) — Briefform (Anrede, Einleitung, Absätze, Schluss), Textkohärenz, Konnektoren
4. Wortschatz (vocabulary) — Angemessenheit und Vielfalt des Ausdrucks für das B2-Niveau

Sei streng und konsistent, wie ein echter telc-Prüfer. Gib NUR valides JSON zurück, keine Erklärungen außerhalb des JSON, keine Markdown-Codeblöcke:
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

export async function gradeEssay(taskPrompt: string, essayText: string): Promise<GradingResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const url = `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`;
  const userMessage = `AUFGABE:\n${taskPrompt}\n\n---\n\nANTWORT DES KANDIDATEN:\n${essayText}`;
  const body = {
    // `temperature` is deprecated/rejected (400) on claude-sonnet-5 — omit it
    // rather than pin 0; grading is already constrained by max_tokens + a
    // strict JSON-only system prompt.
    model: GRADING_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchT(url, {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: any = await res.json();
      const msg = String(json?.error?.message ?? "");
      if (res.status === 429 || res.status === 529 || /credit balance is too low|insufficient|quota/i.test(msg)) {
        throw new Error("QUOTA_429");
      }
      if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);

      let text = json.content?.[0]?.text ?? "{}";
      text = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      const raw = JSON.parse(text);
      const validated = validate(raw);
      const overall_score =
        validated.task_fulfillment_score + validated.grammar_score + validated.structure_score + validated.vocabulary_score;

      return { ...validated, overall_score, passed: overall_score >= 60, model: GRADING_MODEL };
    } catch (e) {
      lastErr = e;
      // Don't retry on our own validation errors (malformed JSON/scores) — retrying
      // the exact same deterministic (temperature 0) prompt won't fix a schema issue.
      if (String(e).includes("grading response invalid")) throw e;
      if (String(e).includes("QUOTA_429")) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`essay grading failed: ${String(lastErr)}`);
}

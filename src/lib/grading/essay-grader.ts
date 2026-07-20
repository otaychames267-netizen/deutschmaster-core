/**
 * essay-grader.ts — strict telc Schreiben essay grading via Claude Sonnet 5.
 *
 * This is the live grader (imported by the grade-essay server route). It
 * replaces the interim Gemini implementation this module previously had —
 * same rubric, same GradingResult shape, same protections (daily budget cap,
 * CEFR-level-aware prompt, prompt-injection wrapping via wrapUntrustedText),
 * now on the shared Claude tool-forced-JSON pipeline (claude.server.ts) for
 * a stronger structured-output guarantee than free-text JSON parsing gives.
 *
 * Contract: gradeEssay() returns a validated GradingResult or throws —
 * callers (the grade-essay server route) MUST refund the student's credit
 * on any throw.
 */
import { callClaudeTool, ClaudeQuotaError } from "@/lib/ai/claude.server";
import { isBudgetExceeded, recordUsage } from "@/lib/ai/usage-budget.server";
import { wrapUntrustedText } from "./sanitize-input";

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

Sei streng und konsistent, wie ein echter telc-Prüfer für das Niveau ${level}. Rufe ausschließlich das Tool "submit_grading" mit deiner Bewertung auf — keine Erklärungen außerhalb des Tool-Aufrufs.`;
}

const GRADING_TOOL_SCHEMA = {
  type: "object",
  properties: {
    task_fulfillment_score: { type: "integer", minimum: 0, maximum: 25 },
    grammar_score: { type: "integer", minimum: 0, maximum: 25 },
    structure_score: { type: "integer", minimum: 0, maximum: 25 },
    vocabulary_score: { type: "integer", minimum: 0, maximum: 25 },
    feedback: {
      type: "object",
      properties: {
        task_fulfillment: { type: "string", description: "2-3 Sätze auf Deutsch" },
        grammar: { type: "string", description: "2-3 Sätze, wenn möglich mit konkreten Beispielen aus dem Text" },
        structure: { type: "string", description: "2-3 Sätze" },
        vocabulary: { type: "string", description: "2-3 Sätze" },
        summary: { type: "string", description: "3-4 Sätze Gesamtfeedback und konkrete Verbesserungsvorschläge" },
      },
      required: ["task_fulfillment", "grammar", "structure", "vocabulary", "summary"],
    },
  },
  required: ["task_fulfillment_score", "grammar_score", "structure_score", "vocabulary_score", "feedback"],
} as const;

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

const SCORE_KEYS = ["task_fulfillment_score", "grammar_score", "structure_score", "vocabulary_score"] as const;
const FEEDBACK_KEYS = ["task_fulfillment", "grammar", "structure", "vocabulary", "summary"] as const;

/** Schema-forced tool output is already well-shaped, but the model can still
 * violate declared bounds/required-ness in principle — this is the same
 * defense-in-depth post-hoc check the Gemini implementation had, kept as-is. */
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

export { isBudgetExceeded };

export async function gradeEssay(taskPrompt: string, essayText: string, supabase: any, level: CefrLevel = "B2"): Promise<GradingResult> {
  if (await isBudgetExceeded(supabase)) {
    throw new Error("BUDGET_EXCEEDED");
  }

  const userMessage = `AUFGABE:\n${taskPrompt}\n\n---\n\n${wrapUntrustedText("ANTWORT DES KANDIDATEN", essayText)}`;

  try {
    const { data, model, inputTokens, outputTokens } = await callClaudeTool<any>({
      system: systemPrompt(level),
      userMessage,
      toolName: "submit_grading",
      toolDescription: "Submit the four-criteria telc Schreiben grading for the candidate's essay.",
      inputSchema: GRADING_TOOL_SCHEMA,
      maxTokens: 1500,
    });

    const validated = validate(data);
    const overall_score =
      validated.task_fulfillment_score + validated.grammar_score + validated.structure_score + validated.vocabulary_score;

    await recordUsage(supabase, inputTokens + outputTokens);

    return { ...validated, overall_score, passed: overall_score >= 60, model };
  } catch (e) {
    if (e instanceof ClaudeQuotaError) throw new Error("QUOTA_429");
    throw e;
  }
}

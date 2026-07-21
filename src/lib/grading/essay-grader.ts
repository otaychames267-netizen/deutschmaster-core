/**
 * essay-grader.ts — strict telc Schreiben essay grading via Claude Sonnet 5.
 *
 * Rubric v2: the three official telc B2 Schreiben macro-categories
 * (Bewältigung der Aufgabe, Kommunikative Gestaltung, Formale Richtigkeit),
 * 0-15 points each, 45 total — replacing the earlier generic 4-criteria/
 * 25pt-each (100 total) scheme. This is the ONE rubric used both by
 * standalone Schreiben practice grading (this module, called from the
 * grade-essay server route) AND by the Prüfungssimulation's Schreiben
 * section (called directly, bypassing the credit system — see
 * api.schreiben.submit-simulation.ts) — deliberately not two parallel
 * rubrics. Pass threshold is 60% (27/45), same percentage as the old 60/100.
 *
 * Contract: gradeEssay() returns a validated GradingResult or throws —
 * callers that spend a credit (the grade-essay server route) MUST refund it
 * on any throw; the simulation submit flow does not spend a credit at all.
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
  return `Du bist ein erfahrener, sehr strenger telc-Prüfer für die Prüfung Deutsch ${level}, Prüfungsteil Schreiben. Du bewertest exakt nach den offiziellen telc-Bewertungskriterien und bist bewusst konservativ: Ein Text, der die Aufgabe nur oberflächlich erfüllt oder mit häufigen, sinnentstellenden Fehlern durchsetzt ist, gehört in die untere Hälfte der jeweiligen Skala — Mühe und Länge allein rechtfertigen keine gute Bewertung. Vergib niemals automatisch hohe Punktzahlen; ein tatsächlich exzellenter Text auf ${level}-Niveau ist selten. Runde im Zweifel eher ab als auf.

Bewerte den folgenden Beschwerdebrief nach genau drei offiziellen telc-Hauptkriterien, jeweils 0-15 Punkte:

1. Bewältigung der Aufgabe (task_achievement) — 0-15 Punkte
   Berücksichtige: Aufgabenerfüllung (wurden alle in der Aufgabe geforderten Punkte inhaltlich vollständig und nicht nur angedeutet behandelt?) und Inhalt (ist die Darstellung stimmig, relevant und nachvollziehbar, nicht nur oberflächlich?).

2. Kommunikative Gestaltung (communicative_design) — 0-15 Punkte
   Berücksichtige: Register (durchgehend formell und situationsangemessen, kein Wechsel zu informeller Sprache?), Textaufbau (klare Briefform: Anrede, Einleitung, sinnvoll gegliederte Absätze, Schluss), Kohärenz (logischer, nachvollziehbarer Zusammenhang zwischen den Sätzen und Absätzen, passende Konnektoren, kein abrupter Themenwechsel).

3. Formale Richtigkeit (formal_accuracy) — 0-15 Punkte
   Berücksichtige: Grammatik (Satzbau, Verbformen, Kasus, Wortstellung), Wortschatz (Angemessenheit und Präzision für das ${level}-Niveau), Genauigkeit (wie störend sind die vorhandenen Fehler für das Verständnis — vereinzelte Fehler vs. sinnentstellende Häufung?), sprachliche Bandbreite (Vielfalt der verwendeten Satzstrukturen, nicht nur einfache Hauptsätze), Rechtschreibung (inklusive Groß-/Kleinschreibung von Substantiven).

Sei streng und konsistent, wie ein echter telc-Prüfer für das Niveau ${level}. Rufe ausschließlich das Tool "submit_grading" mit deiner Bewertung auf — keine Erklärungen außerhalb des Tool-Aufrufs.`;
}

const GRADING_TOOL_SCHEMA = {
  type: "object",
  properties: {
    task_achievement_score: { type: "integer", minimum: 0, maximum: 15 },
    communicative_design_score: { type: "integer", minimum: 0, maximum: 15 },
    formal_accuracy_score: { type: "integer", minimum: 0, maximum: 15 },
    feedback: {
      type: "object",
      properties: {
        task_achievement: { type: "string", description: "3-4 Sätze auf Deutsch — geht explizit auf Aufgabenerfüllung UND Inhalt ein" },
        communicative_design: { type: "string", description: "3-4 Sätze — geht explizit auf Register, Textaufbau UND Kohärenz ein" },
        formal_accuracy: { type: "string", description: "3-4 Sätze, wenn möglich mit konkreten Beispielen aus dem Text — geht explizit auf Grammatik, Wortschatz, Genauigkeit, Bandbreite UND Rechtschreibung ein" },
        summary: { type: "string", description: "3-4 Sätze Gesamtfeedback und konkrete, priorisierte Verbesserungsvorschläge" },
      },
      required: ["task_achievement", "communicative_design", "formal_accuracy", "summary"],
    },
  },
  required: ["task_achievement_score", "communicative_design_score", "formal_accuracy_score", "feedback"],
} as const;

export interface GradingResult {
  task_achievement_score: number;
  communicative_design_score: number;
  formal_accuracy_score: number;
  overall_score: number;
  passed: boolean;
  feedback: {
    task_achievement: string;
    communicative_design: string;
    formal_accuracy: string;
    summary: string;
  };
  model: string;
}

const SCORE_KEYS = ["task_achievement_score", "communicative_design_score", "formal_accuracy_score"] as const;
const FEEDBACK_KEYS = ["task_achievement", "communicative_design", "formal_accuracy", "summary"] as const;

/** Schema-forced tool output is already well-shaped, but the model can still
 * violate declared bounds/required-ness in principle — this is the same
 * defense-in-depth post-hoc check the Gemini implementation had, kept as-is. */
function validate(raw: any): Omit<GradingResult, "overall_score" | "passed" | "model"> {
  for (const k of SCORE_KEYS) {
    const v = raw?.[k];
    if (!Number.isInteger(v) || v < 0 || v > 15) {
      throw new Error(`grading response invalid: ${k}=${JSON.stringify(v)} (expected integer 0-15)`);
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
    task_achievement_score: raw.task_achievement_score,
    communicative_design_score: raw.communicative_design_score,
    formal_accuracy_score: raw.formal_accuracy_score,
    feedback: {
      task_achievement: fb.task_achievement,
      communicative_design: fb.communicative_design,
      formal_accuracy: fb.formal_accuracy,
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
      toolDescription: "Submit the three-criteria telc Schreiben grading for the candidate's essay.",
      inputSchema: GRADING_TOOL_SCHEMA,
      maxTokens: 1500,
    });

    const validated = validate(data);
    const overall_score =
      validated.task_achievement_score + validated.communicative_design_score + validated.formal_accuracy_score;

    await recordUsage(supabase, inputTokens + outputTokens);

    return { ...validated, overall_score, passed: overall_score >= 27, model };
  } catch (e) {
    if (e instanceof ClaudeQuotaError) throw new Error("QUOTA_429");
    throw e;
  }
}

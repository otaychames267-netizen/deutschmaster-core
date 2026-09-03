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
  return `Du bist ein erfahrener telc-Prüfer für die Prüfung Deutsch ${level}, Prüfungsteil Schreiben, im STRENGSTEN EXAMENSMODUS — kein Lehrer, kein Motivationscoach, kein wohlwollender Muttersprachler, der einfach "versteht, was gemeint ist". Du bist ein Prüfer, der eine echte, folgenreiche Note vergibt. KEINE NACHSICHT. KEINE GROSSZÜGIGE BEWERTUNG. KEIN "reicht schon aus". Ein schwacher Text bekommt eine schwache Note — Punkt.

STRIKTE PRÜFUNGSGRUNDSÄTZE (bindend, ohne Ausnahme):
- Bewerte niemals aus Höflichkeit, Mitgefühl oder um zu motivieren. Textlänge, sichtbare Mühe oder ein sympathischer Ton rechtfertigen keine bessere Note.
- Ignoriere KEINEN Fehler. Jeder Fehler, der die Note beeinflusst, muss erfasst werden — auch ein scheinbar kleiner. Häufen sich viele kleine Fehler, muss sich das in der Punktzahl spürbar niederschlagen, nicht nur in einer beiläufigen Erwähnung.
- Verständlich ist nicht dasselbe wie richtig: Du gibst NIEMALS Punkte nur dafür, dass der allgemeine Sinn erkennbar ist. Ein Satz, der inhaltlich verständlich, aber grammatisch falsch, unnatürlich oder kein authentisches Deutsch ist, bleibt ein Fehler und muss als solcher gewertet werden.
- Lobe nicht anstelle einer Korrektur. Formulierungen wie "insgesamt gut gelungen" oder "gute Bemühung" sind nur zulässig, wenn der Text das nach den unten genannten Kriterien tatsächlich verdient — nicht als Trost.
- Wurde die Aufgabenstellung nicht vollständig erfüllt (fehlende Punkte, zu kurz, am Thema vorbei), MUSS das task_achievement spürbar und nicht nur symbolisch senken — nicht mit ein paar Punkten Abzug "abfedern".
- Die obere Hälfte jeder Skala (ab 8/15) ist einem Text vorbehalten, der auf ${level}-Niveau tatsächlich überzeugt — das ist der seltene Ausnahmefall, nicht der Normalfall. Die volle Punktzahl (15/15) verlangt einen nahezu fehlerfreien, überzeugenden Text.
- Runde im Zweifel immer ab, nie auf.
- Erfinde KEINE zusätzlichen Bewertungskriterien oder telc-Regeln, die es nicht gibt. Bewerte ausschließlich nach den drei unten definierten Kategorien (das ist das tatsächlich für diese Plattform konfigurierte Bewertungsraster) — wende sie aber ohne jede Nachsicht an.

Bewerte den folgenden Text nach genau drei offiziellen telc-Hauptkriterien, jeweils 0-15 Punkte. Prüfe dabei explizit JEDEN der folgenden Aspekte — nicht nur einen allgemeinen Gesamteindruck:

1. Bewältigung der Aufgabe (task_achievement) — 0-15 Punkte
   - Erfüllung der Aufgabenstellung: Wurden ALLE in der Aufgabe geforderten Punkte inhaltlich vollständig behandelt — nicht nur angedeutet oder oberflächlich erwähnt? Jeder fehlende oder nur oberflächlich behandelte Punkt senkt die Note spürbar.
   - Inhalt: Ist die Darstellung stimmig, relevant, nachvollziehbar und tatsächlich auf das Thema bezogen?
   - Verständlichkeit für den Leser: Kann ein echter Empfänger (z. B. die adressierte Firma/Behörde) den Text ohne Rückfragen verstehen, oder bleiben Passagen unklar?
   - Sprachniveau: Bleibt der Text erkennbar unter dem für ${level} geforderten Niveau (Wortschatz, Satzkomplexität, Ausdrucksvermögen), darf das hier nicht großzügig übergangen werden.

2. Kommunikative Gestaltung (communicative_design) — 0-15 Punkte
   - Register: durchgehend formell und situationsangemessen — jeder Wechsel zu informeller Sprache ist ein Fehler.
   - Textaufbau: klare, erkennbare Form (Absender/Anschrift/Datum sofern gefordert, Anrede, Einleitung, sinnvoll gegliederte Absätze, Schluss/Schlussformel).
   - Kohärenz und Konnektoren: logischer, nachvollziehbarer Zusammenhang zwischen Sätzen und Absätzen, korrekt und passend verwendete Konnektoren, kein abrupter Themenwechsel.
   - Ausdruck und Natürlichkeit: Liest sich der Text wie natürliches, authentisches Deutsch — oder wirkt er übersetzt, holprig oder unidiomatisch?

3. Formale Richtigkeit (formal_accuracy) — 0-15 Punkte — prüfe JEDEN der folgenden Punkte einzeln, ohne einen davon auszulassen:
   - Grammatik allgemein und Satzbau
   - Artikel (bestimmt/unbestimmt, korrektes Genus)
   - Kasus (Nominativ/Akkusativ/Dativ/Genitiv — auch nach Präpositionen und Verben)
   - Präpositionen (richtige Präposition, richtiger Kasus danach)
   - Verbformen (Konjugation, Zeiten/Tempus, Modalverben, trennbare Verben, korrekte Wahl von Perfekt/Präteritum)
   - Wortstellung (Verbzweitstellung, Verbendstellung in Nebensätzen, Stellung von Objekten und Adverbien)
   - Wortschatz (Angemessenheit, Präzision, unnötige Wiederholungen, falsche Wortwahl)
   - Rechtschreibung (inklusive Groß-/Kleinschreibung von Substantiven)
   - Zeichensetzung (insbesondere Kommasetzung bei Nebensätzen und Aufzählungen)
   - Genauigkeit insgesamt: vereinzelte, kaum störende Fehler vs. häufige, sinnentstellende Fehler
   - sprachliche Bandbreite: nur einfache Hauptsätze oder auch Nebensätze und komplexere Strukturen?

Für formal_accuracy: zitiere im Feedback, wo immer Fehler vorhanden sind, mindestens 2-3 konkrete Beispiele direkt aus dem Text (Originalstelle + kurze Korrektur) — keine rein allgemeine Einschätzung ohne Belege.

Sei so streng und kompromisslos genau, wie es ein echter telc-Prüfer für das Niveau ${level} sein muss — nicht strenger als das Raster, aber auch keinen einzigen Punkt großzügiger. Rufe ausschließlich das Tool "submit_grading" mit deiner Bewertung auf — keine Erklärungen außerhalb des Tool-Aufrufs.`;
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
        communicative_design: { type: "string", description: "3-4 Sätze — geht explizit auf Register, Textaufbau, Kohärenz/Konnektoren UND Ausdruck/Natürlichkeit ein" },
        formal_accuracy: { type: "string", description: "Mindestens 4-5 Sätze. MUSS, sofern Fehler im Text vorhanden sind, mindestens 2-3 konkrete Fehlbeispiele direkt aus dem Text zitieren (Originalstelle + Korrektur) — keine rein allgemeine Einschätzung. Geht explizit auf Grammatik/Satzbau, Artikel, Kasus, Präpositionen, Verbformen, Wortstellung, Wortschatz, Rechtschreibung, Zeichensetzung UND sprachliche Bandbreite ein" },
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

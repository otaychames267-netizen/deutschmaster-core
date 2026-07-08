/**
 * muendlich-evaluator.ts — duplicated from src/lib/grading/muendlich-evaluator.ts
 * in the main app (same reasoning as geminiLive.ts: separate deployable
 * package, not worth monorepo tooling for two small files — keep both in sync
 * by hand). Called here at the moment Teil 3 ends, with the real completed
 * transcript, to generate each candidate's private evaluation server-side.
 *
 * Contract: generateEvaluation() returns a validated result or throws.
 */

// The product owner's default is "1.5 Flash", but this repo's existing Gemini
// integration (vision-provider.ts) already defaults to gemini-2.5-flash for
// new work, and 1.5 Flash is the older generation. Defaulting to the current
// model here too, overridable via env — flagging this deliberately rather
// than silently picking one, same as the Sonnet-5-vs-3.5 note earlier.
const EVAL_MODEL = process.env.MUENDLICH_EVAL_MODEL ?? "gemini-2.5-flash";

// Fixed verbatim — NEVER passed to the model to generate or paraphrase. The
// exact wording matters, so it's appended in code after the model responds,
// guaranteeing byte-for-byte identical output on every single report.
export const MUENDLICH_CLOSING_STATEMENT =
  "Das Ganze ist vollkommen unter Kontrolle. Sie sind nicht schlecht; Sie müssen sich nur noch mehr auf das Training und die Bereicherung Ihres Wortschatzes konzentrieren. Es gibt absolut nichts, was unmöglich oder zu schwer ist, wenn man auf Allah vertraut (mit Gottes Hilfe) und unermüdlich sein Bestes gibt. Wir sind jederzeit hier für Sie da, um Sie zu unterstützen, wann immer Sie Hilfe benötigen.";

const SYSTEM_PROMPT = `Du bist ein erfahrener, akademisch strenger telc-Prüfer für die mündliche Prüfung Deutsch B2 (Teil 1: Präsentation, Teil 2: Gespräch über ein Thema, Teil 3: Etwas gemeinsam planen).

Bewerte NUR die Beiträge des angegebenen Kandidaten (nicht des Prüfungspartners oder der KI-Prüferin) im folgenden Transkript. Vergib für jeden der drei Prüfungsteile 0-25 Punkte (insgesamt max. 75 Punkte), basierend auf einer strengen Bewertung von: Aussprache, Wortschatz, grammatische Korrektheit und Flüssigkeit.

Antworte AUSSCHLIESSLICH auf Deutsch (100%), in gültigem JSON, ohne Markdown-Codeblöcke, ohne Erklärungen außerhalb des JSON:
{
  "teil_breakdown": [
    { "teil": 1, "score": <0-25>, "pronunciation": "<2-3 Sätze>", "vocabulary": "<2-3 Sätze>", "grammar": "<2-3 Sätze>", "fluency": "<2-3 Sätze>" },
    { "teil": 2, "score": <0-25>, "pronunciation": "...", "vocabulary": "...", "grammar": "...", "fluency": "..." },
    { "teil": 3, "score": <0-25>, "pronunciation": "...", "vocabulary": "...", "grammar": "...", "fluency": "..." }
  ],
  "error_correction_matrix": [
    { "original": "<exaktes Zitat aus dem Transkript>", "correction": "<korrigierte Version>", "explanation": "<kurze Begründung>" }
  ],
  "vocabulary_enrichment": [
    { "weak_term": "<schwaches/wiederholtes Wort>", "suggestions": ["<Alternative 1>", "<Alternative 2>"], "context": "<Satz, in dem es verwendet wurde>" }
  ],
  "pacing_tips": "<konkrete, umsetzbare Tipps zu Sprechtempo, Struktur und Redefluss>",
  "summary": "<3-4 Sätze Gesamtfeedback>",
  "cefr_level": "<A1|A2|B1|B2|C1>"
}

Wichtig: error_correction_matrix MUSS exakte, wörtliche Zitate aus dem Transkript enthalten (keine erfundenen Beispiele) — das macht die Bewertung glaubwürdig und nachvollziehbar. Wenn der Kandidat kaum Fehler gemacht hat, darf die Liste kurz sein oder auch leer bleiben, aber erfinde niemals Fehler, die nicht im Transkript vorkommen.`;

export interface MuendlichEvaluationResult {
  teil1_score: number;
  teil2_score: number;
  teil3_score: number;
  overall_score: number;
  passed: boolean;
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1";
  feedback: {
    teil_breakdown: { teil: 1 | 2 | 3; score: number; pronunciation: string; vocabulary: string; grammar: string; fluency: string }[];
    error_correction_matrix: { original: string; correction: string; explanation: string }[];
    vocabulary_enrichment: { weak_term: string; suggestions: string[]; context: string }[];
    pacing_tips: string;
    summary: string;
    closing_statement: string;
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

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

function validate(raw: any): Omit<MuendlichEvaluationResult, "overall_score" | "passed" | "model" | "feedback"> & { feedback: Omit<MuendlichEvaluationResult["feedback"], "closing_statement"> } {
  const breakdown = raw?.teil_breakdown;
  if (!Array.isArray(breakdown) || breakdown.length !== 3) throw new Error("evaluation invalid: teil_breakdown must have exactly 3 entries");
  const byTeil: Record<number, any> = {};
  for (const t of breakdown) {
    if (![1, 2, 3].includes(t?.teil)) throw new Error(`evaluation invalid: bad teil number ${JSON.stringify(t?.teil)}`);
    if (!Number.isInteger(t?.score) || t.score < 0 || t.score > 25) throw new Error(`evaluation invalid: teil ${t?.teil} score out of range`);
    for (const k of ["pronunciation", "vocabulary", "grammar", "fluency"]) {
      if (!t[k] || typeof t[k] !== "string" || !t[k].trim()) throw new Error(`evaluation invalid: teil ${t.teil}.${k} missing`);
    }
    byTeil[t.teil] = t;
  }
  if (!byTeil[1] || !byTeil[2] || !byTeil[3]) throw new Error("evaluation invalid: teil_breakdown must cover teil 1, 2, and 3 exactly once");

  if (!Array.isArray(raw.error_correction_matrix)) throw new Error("evaluation invalid: error_correction_matrix must be an array (can be empty)");
  for (const e of raw.error_correction_matrix) {
    if (!e?.original || !e?.correction) throw new Error("evaluation invalid: error_correction_matrix entry missing original/correction");
  }
  if (!Array.isArray(raw.vocabulary_enrichment)) throw new Error("evaluation invalid: vocabulary_enrichment must be an array (can be empty)");
  if (!raw.pacing_tips || typeof raw.pacing_tips !== "string") throw new Error("evaluation invalid: pacing_tips missing");
  if (!raw.summary || typeof raw.summary !== "string") throw new Error("evaluation invalid: summary missing");
  if (!CEFR_LEVELS.includes(raw.cefr_level)) throw new Error(`evaluation invalid: bad cefr_level ${JSON.stringify(raw.cefr_level)}`);

  return {
    teil1_score: byTeil[1].score,
    teil2_score: byTeil[2].score,
    teil3_score: byTeil[3].score,
    cefr_level: raw.cefr_level,
    feedback: {
      teil_breakdown: [byTeil[1], byTeil[2], byTeil[3]],
      error_correction_matrix: raw.error_correction_matrix,
      vocabulary_enrichment: raw.vocabulary_enrichment,
      pacing_tips: raw.pacing_tips,
      summary: raw.summary,
    },
  };
}

/**
 * @param transcriptText Plain-text transcript, speaker-labeled (e.g. "Person A: ...").
 * @param candidateLabel Which speaker to grade — "Person A" or "Person B". The
 *   AI examiner's own lines and the partner's lines are context only.
 */
export async function generateMuendlichEvaluation(transcriptText: string, candidateLabel: string): Promise<MuendlichEvaluationResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EVAL_MODEL}:generateContent?key=${key}`;
  const userPrompt = `Zu bewertender Kandidat: ${candidateLabel}\n\nTRANSKRIPT:\n${transcriptText}`;
  const body = {
    contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
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
      const overall_score = validated.teil1_score + validated.teil2_score + validated.teil3_score;

      return {
        ...validated,
        overall_score,
        passed: overall_score >= 45, // telc pass threshold, ~60% of 75
        model: EVAL_MODEL,
        feedback: { ...validated.feedback, closing_statement: MUENDLICH_CLOSING_STATEMENT },
      };
    } catch (e) {
      lastErr = e;
      if (String(e).includes("evaluation invalid")) throw e; // deterministic prompt, retrying won't fix a schema mismatch
      if (String(e).includes("QUOTA_429")) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`muendlich evaluation failed: ${String(lastErr)}`);
}

// Stage 1 of the strict free grader: a free LLM fills an EXAMINER'S OBSERVATION SHEET (counts / labels / quoted errors) — it never invents the score.
// usage: node extract.mjs <model> <from> <to> [concurrency]   ->  obs/<model>/<id>.json   (resume-safe; free-tier rate limits respected per model)
import fs from "node:fs";
const env = {};
for (const f of ["C:/Users/asus/AuraLingovia/.env", "C:/Users/asus/AuraLingovia/muendlich-relay/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const [model, from = "0", to = "999", conc = "3"] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync("claude-gradings.json", "utf8")).slice(Number(from), Number(to));
const outDir = `obs/${model.replace(/[^a-z0-9.-]/gi, "_")}`; fs.mkdirSync(outDir, { recursive: true });
const RPM = { "gemma-4-31b-it": 24, "gemma-4-26b-a4b-it": 24, "gemini-3.1-flash-lite": 13, "gemini-3.8-flash": 4, "gemini-3.5-flash-lite": 12 }[model] ?? 6;
let nextSlot = 0; const gap = 60000 / RPM; const slot = async () => { const now = Date.now(); const at = Math.max(now, nextSlot); nextSlot = at + gap; if (at > now) await new Promise((r) => setTimeout(r, at - now)); };

export const SHEET_PROMPT = (task, essay, level) => `Du bist ein sehr strenger telc-Prüfer (Deutsch ${level}, Schreiben). Du bewertest NICHT mit einer Note — du füllst einen objektiven BEOBACHTUNGSBOGEN aus. Zähle und belege sachlich; sei dabei gründlich und streng: übersieh keinen Fehler, erfinde aber auch keinen. Verständlich ist nicht dasselbe wie richtig.

AUFGABE:
${task}

TEXT DES KANDIDATEN:
<<<
${essay}
>>>

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Text davor oder danach, keine Markdown-Zeichen) mit genau diesen Feldern:
{
 "points": [ {"point": "<geforderter Inhaltspunkt aus der Aufgabe, kurz>", "status": "covered" | "partial" | "missing"} ],
 "on_topic": "yes" | "partly" | "no",
 "task_misread": true | false,
 "anrede": true | false, "schlussformel": true | false, "betreff_or_opening_line": true | false,
 "paragraphs": <Zahl der erkennbaren Absätze>,
 "register": "formal_consistent" | "mixed" | "informal",
 "connectors_used": <Zahl verschiedener korrekt verwendeter Konnektoren (weil, deshalb, obwohl, außerdem, trotzdem, falls, damit ...)>,
 "subordinate_clauses": <Zahl der Nebensätze>,
 "advanced_structures": <Zahl von Konjunktiv II, Passiv, Partizipialkonstruktionen, Relativsätzen, Infinitiv mit zu>,
 "naturalness": "natural" | "mostly_natural" | "stilted_or_translated",
 "vocabulary": "poor" | "adequate" | "rich",
 "errors": [ {"quote": "<WÖRTLICH aus dem Text, höchstens 10 Wörter>", "fix": "<korrigierte Fassung>", "category": "case" | "article_gender" | "preposition" | "verb_form_tense" | "word_order" | "spelling_caps" | "punctuation" | "word_choice" | "agreement" | "register" | "other", "severity": "minor" | "major"} ]
}
Regeln: "errors" enthält JEDEN erkennbaren Fehler (höchstens 30), "major" = stört das Verständnis oder ist ein grober Grundfehler (falscher Kasus/Artikel nach Präposition, Verbendstellung im Nebensatz falsch, falsche Verbform, nicht existierendes Wort). Zitiere nur Textstellen, die wirklich so im Text stehen.`;

function parse(txt) { const t = String(txt).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim(); const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < 0) throw new Error("no json"); return JSON.parse(t.slice(a, b + 1)); }

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    await slot();
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 6000 } }), signal: AbortSignal.timeout(120_000) }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
    const t = await r.text();
    if (r.ok) { const j = JSON.parse(t); const parts = j.candidates?.[0]?.content?.parts ?? []; const out = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join(""); if (out.trim()) return { out, usage: j.usageMetadata }; throw new Error("empty output: " + (j.candidates?.[0]?.finishReason ?? "?")); }
    if (r.status === 429 || r.status === 500 || r.status === 503 || r.status === 0) { await new Promise((x) => setTimeout(x, 4000 * attempt)); continue; }
    throw new Error(`HTTP ${r.status}: ${t.slice(0, 160)}`);
  }
  throw new Error("gave up after retries");
}

let done = 0, failed = 0; const q = rows.map((r, i) => ({ r, i }));
await Promise.all(Array.from({ length: Number(conc) }, async () => {
  while (q.length) {
    const { r } = q.shift(); const f = `${outDir}/${r.id}.json`; if (fs.existsSync(f)) { done++; continue; }
    try {
      const task = String(r.content?.task ?? "").slice(0, 2500);
      const { out, usage } = await callGemini(SHEET_PROMPT(task, r.essay_text, r.level === "TELC_B1" ? "B1" : "B2"));
      fs.writeFileSync(f, JSON.stringify({ id: r.id, obs: parse(out), usage }));
      done++; if (done % 10 === 0) console.log(`${model}: ${done} done, ${failed} failed`);
    } catch (e) { failed++; console.log("FAIL", r.id.slice(0, 8), String(e.message).slice(0, 120)); }
  }
}));
console.log(`${model}: finished ${done} ok, ${failed} failed`);
process.exit(0);

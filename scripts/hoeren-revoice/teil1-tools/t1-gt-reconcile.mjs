// usage (cwd = work dir): node t1-gt-reconcile.mjs <slug> <whisper.gt.json> <other.gt.json> [--gender male|female]
// FREE last resort for a very noisy recording where every single ASR is partly wrong (Die Fluggesellschaft, 2026-10-21): two independent transcripts
// (Groq Whisper + Gemini-lite) plus the exercise's own statements go to a free LLM (Groq llama-3.3-70b) which returns the news items as ONE consistent
// German text, choosing between the two versions word by word and inventing nothing. The result is written to <slug>.gt.json (one block per item) and
// must be READ by a person before it is voiced — print + review, then t1-run.mjs, completeness.mjs and listening.
import fs from "node:fs";
const args = process.argv.slice(2), [slug, fa, fb] = args;
const gender = args.includes("--gender") ? args[args.indexOf("--gender") + 1] : "male";
if (!slug || !fa || !fb) { console.log("usage: node t1-gt-reconcile.mjs <slug> <a.gt.json> <b.gt.json> [--gender male|female]"); process.exit(1); }
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const SH = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY };
const meta = JSON.parse(fs.readFileSync(`${slug}.meta.json`, "utf8"));
const st = await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_statements?select=statement_text,correct_answer&exercise_id=eq.${meta.exercises[0].id}&order=statement_number`, { headers: SH })).json();
const text = (f) => JSON.parse(fs.readFileSync(f, "utf8")).segments.map((s) => s.text).filter((t) => !/Hörverstehen-Aufnahme|Transkribiere/.test(t)).join("\n");

const prompt = `Du bekommst ZWEI fehlerhafte automatische Transkripte derselben deutschen Radio-Nachrichtensendung (Version A: Whisper, Version B: Gemini) und die Aussagen, die zu dieser Sendung gehören (sie zeigen Namen und Inhalt).
Aufgabe: Schreibe den Text der Nachrichtensendung so, wie ihn ein Sprecher wirklich gesprochen hat — korrektes, flüssiges Nachrichtendeutsch. Wähle bei jeder Stelle die Version, die Sinn ergibt (A und B haben an verschiedenen Stellen Hörfehler), und korrigiere offensichtliche Hörfehler nur dann, wenn beide Versionen ähnlich falsch sind und die Aussagen oder der Zusammenhang die richtige Lösung eindeutig zeigen. ERFINDE NICHTS: keine Fakten, Zahlen oder Namen, die in keiner der beiden Versionen vorkommen. Lass nichts Sinnvolles weg. Zahlen als Ziffern.
Gliedere in die einzelnen Meldungen (jede Meldung = ein Eintrag). Antworte NUR mit einem JSON-Array von Strings.

AUSSAGEN ZUR SENDUNG (nur als Hilfe für Namen/Inhalt, NICHT vorlesen):
${st.map((s, i) => `${i + 1}. ${s.statement_text}`).join("\n")}

VERSION A (Whisper):
${text(fa)}

VERSION B (Gemini):
${text(fb)}`;

let items = null;
for (const model of ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]) {
  for (let a = 1; a <= 3 && !items; a++) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(120000) });
    if (!r.ok) { console.log(model, r.status, (await r.text()).slice(0, 140)); await new Promise((x) => setTimeout(x, 6000 * a)); continue; }
    const c = (await r.json()).choices?.[0]?.message?.content ?? "";
    try { const i0 = c.indexOf("["), i1 = c.lastIndexOf("]"); const o = JSON.parse(c.slice(i0, i1 + 1)); items = Array.isArray(o) ? o : null; } catch { console.log(model, "unparseable answer:", c.slice(0, 120)); }
  }
  if (items?.length) break;
}
if (!items?.length) { console.log("no result"); process.exit(1); }
let t = 0;
const segments = items.map((x) => String(x).trim()).filter(Boolean).map((x) => { const s = { gender, start: t, end: t + 20, text: x }; t += 21; return s; });
fs.writeFileSync(`${slug}.gt.json`, JSON.stringify({ model: "reconciled(whisper+gemini-lite) by groq", segments }, null, 1));
console.log(`${slug}: ${segments.length} item(s), ${segments.reduce((n, s) => n + s.text.length, 0)} chars`);
for (const s of segments) console.log("  -", s.text);

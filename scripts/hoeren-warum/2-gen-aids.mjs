// 2-gen-aids — part of the Hören audio-grounded "Warum?" pipeline (2026-10-13). Order: 1) transcribe  2) gen-aids  3) apply-aids  (then verify-evidence-substrings.mjs).
// Work files (transcripts, generated explanations, backups) live in scripts/hoeren-warum/work/ (git-ignored) — override with HOEREN_WORK_DIR.
// Claude writes the explanations from the transcripts: blind verdict (no key) + explanation (with key); a statement is publishable only if both agree with the key, the quote is verbatim in the transcript and has no recognition errors.
import { fileURLToPath } from "node:url";
const WORK = (process.env.HOEREN_WORK_DIR ?? fileURLToPath(new URL("./work/", import.meta.url))).split(String.fromCharCode(92)).join("/").replace(/[/]*$/, "/");
// Generates audio-grounded "Warum?" explanations for Hören exercises from their Whisper transcripts.
// usage: node hoeren-gen-aids.mjs [--only <id,id,...>] [--limit N]      (resume-safe: skips ids that already have hoeren-aids/<id>.json)
// Per exercise: (A) BLIND verdicts (transcript + statements, NO answer key) -> (B) explanations WITH the key. A statement is publishable only when
//   blind verdict == official key, the model says the transcript supports the key, and the quote is a verbatim substring of the transcript.
import fs from "node:fs";
const SP = WORK;
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/.env", "C:/Users/asus/AuraLingovia/muendlich-relay/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const MODEL = process.env.AIDS_MODEL ?? "claude-sonnet-5-5";
const args = process.argv.slice(2); const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null; const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
fs.mkdirSync(SP + "hoeren-aids", { recursive: true });
const sql = async (query) => (await (await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) })).json());

let usage = { in: 0, out: 0, calls: 0 };
async function claude(system, user, tool) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: user }], tools: [tool] }) });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
    const j = await res.json(); if (!res.ok) throw new Error(`anthropic ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
    usage.in += j.usage?.input_tokens ?? 0; usage.out += j.usage?.output_tokens ?? 0; usage.calls++;
    const block = j.content.find((b) => b.type === "tool_use"); if (!block) { if (attempt < 4) continue; throw new Error("no tool_use: " + JSON.stringify(j.content).slice(0, 160)); } return block.input;
  }
  throw new Error("anthropic retries exhausted");
}

// ---- tolerant substring matching (quotes, dashes, whitespace, case) and time lookup
const norm = (s) => s.normalize("NFC").replace(/[„“”"»«‚‘’'`´]/g, "'").replace(/[–—−]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
function locate(quote, segments) {
  // build a normalized joined text with char ranges per segment
  let joined = "", ranges = [];
  for (const s of segments) { const t = norm(s.text); const from = joined.length + (joined ? 1 : 0); joined += (joined ? " " : "") + t; ranges.push({ from, to: joined.length, s }); }
  const q = norm(quote).replace(/\*\*/g, ""); if (!q) return null;
  const at = joined.indexOf(q); if (at < 0) return null;
  const end = at + q.length; const hit = ranges.filter((r) => r.to > at && r.from < end);
  if (!hit.length) return null;
  return { start: hit[0].s.start, end: hit[hit.length - 1].s.end };
}

const SYS_BLIND = `Du bist TELC-B2-Prüfer für Hörverstehen. Du bekommst das Transkript eines Hörtextes (maschinell erstellt, kleine Erkennungsfehler und Störphrasen wie "Untertitelung des ZDF" sind möglich — ignoriere sie) und nummerierte Aussagen. Entscheide für jede Aussage NUR anhand des Transkripts, ob sie "richtig" oder "falsch" ist. Regeln wie in der echten TELC-Prüfung: richtig = der Hörtext sagt es (auch umschrieben); falsch = der Hörtext widerspricht oder erwähnt es nicht so. Bei Teil 3 (fünf kurze Texte) gehört Aussage N zu dem Text nach der Ansage "Nummer N". Wenn das Transkript für eine Entscheidung nicht reicht, antworte "unklar". Antworte ausschließlich über das Tool.`;
const TOOL_BLIND = { name: "submit_verdicts", description: "Verdict per statement", input_schema: { type: "object", properties: { verdicts: { type: "array", items: { type: "object", properties: { n: { type: "integer" }, verdict: { type: "string", enum: ["richtig", "falsch", "unklar"] }, reason: { type: "string" } }, required: ["n", "verdict", "reason"] } } }, required: ["verdicts"] } };

const SYS_EXPLAIN = `Du schreibst "Warum?"-Erklärungen für arabischsprachige (tunesische) Lernende, die sich auf TELC B2 Hörverstehen vorbereiten. Grundlage ist das Transkript des Hörtextes (maschinell erstellt: kleine Erkennungsfehler und Störphrasen wie "Untertitelung des ZDF" sind möglich — niemals daraus zitieren) und der offizielle Lösungsschlüssel (richtig/falsch). Bei Teil 3 (fünf kurze Texte) gehört Aussage N zu dem Text nach der Ansage "Nummer N"; bei Teil 1/2 ist es ein längerer Text/Interview.
Für JEDE Aussage liefere:
- supports_key: "yes", wenn das Transkript den Lösungsschlüssel eindeutig stützt; "no", wenn es ihm widerspricht; "unclear" sonst. Erfinde nichts, um den Schlüssel zu stützen.
- evidence_quote: ein WÖRTLICHER, zusammenhängender Ausschnitt aus dem Transkript (1–2 Sätze, höchstens ca. 230 Zeichen), der die Aussage entscheidet. Zeichen für Zeichen aus dem Transkript kopieren: keine Auslassungen ("..."), keine Korrekturen, keine Zusammenfassung. Bei "falsch" der Satz, der widerspricht; wenn die Aussage etwas behauptet, das der Hörtext gar nicht sagt, der nächstliegende Satz.
- key_phrase: die 1–5 entscheidenden Wörter INNERHALB des evidence_quote (exakt so geschrieben wie dort).
- quote_translation_ar: genaue Übersetzung des Zitats ins moderne Hocharabisch.
- explanation_correct_ar: 1–2 kurze Sätze auf einfachem Hocharabisch: WARUM die richtige Antwort (richtig/falsch) stimmt, mit Bezug auf das Zitat. Deutsche Wörter in "doppelten Anführungszeichen" zitieren. Kein Grammatikvortrag.
- explanation_wrong_ar: 1–2 kurze Sätze: warum die GEGENTEILIGE Wahl falsch wäre / welche Falle in der Aussage steckt (Paraphrase, Zahl, Ort, Verneinung, "alle/nur/ausschließlich" ...).
- merke_de: kurzes Merkpaar auf Deutsch, höchstens 70 Zeichen, z. B. "ausschließlich persönlich ↔ keine Online-Anmeldung".
- quote_clean: false, wenn das Zitat sichtbare Erkennungsfehler enthält (Wortsalat, falsche Wörter), sonst true.
Schreibe knapp und präzise, ohne Floskeln. Antworte ausschließlich über das Tool.`;
const TOOL_EXPLAIN = { name: "submit_explanations", description: "Explanation per statement", input_schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: {
  n: { type: "integer" }, supports_key: { type: "string", enum: ["yes", "no", "unclear"] }, evidence_quote: { type: "string" }, key_phrase: { type: "string" }, quote_translation_ar: { type: "string" },
  explanation_correct_ar: { type: "string" }, explanation_wrong_ar: { type: "string" }, merke_de: { type: "string" }, quote_clean: { type: "boolean" } },
  required: ["n", "supports_key", "evidence_quote", "key_phrase", "quote_translation_ar", "explanation_correct_ar", "explanation_wrong_ar", "merke_de", "quote_clean"] } } }, required: ["items"] } };

const transcripts = fs.readdirSync(SP + "hoeren-t").filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(SP + "hoeren-t/" + f, "utf8")));
let todo = transcripts.filter((t) => !only || only.includes(t.id)).filter((t) => !fs.existsSync(SP + "hoeren-aids/" + t.id + ".json")).slice(0, limit);
console.log("transcripts:", transcripts.length, "to process:", todo.length, "model:", MODEL);

async function processOne(t) {
  const st = await sql(`select statement_number n, statement_text text, correct_answer ans from public.hoeren_statements where exercise_id='${t.id}' order by statement_number`);
  if (!Array.isArray(st) || !st.length) return { id: t.id, title: t.title, error: "no statements" };
  const stmtList = st.map((s) => `${s.n}. ${s.text}`).join("\n");
  const transcriptBlock = `TRANSKRIPT (Teil ${t.teil}, Titel "${t.title}"):\n${t.segments.map((s) => s.text).join("\n")}`;
  const blind = await claude(SYS_BLIND, `${transcriptBlock}\n\nAUSSAGEN:\n${stmtList}`, TOOL_BLIND);
  const keyList = st.map((s) => `${s.n}. [${s.ans ? "RICHTIG" : "FALSCH"}] ${s.text}`).join("\n");
  let expl = await claude(SYS_EXPLAIN, `${transcriptBlock}\n\nAUSSAGEN MIT LÖSUNGSSCHLÜSSEL:\n${keyList}`, TOOL_EXPLAIN);
  const out = { id: t.id, title: t.title, level: t.level, teil: t.teil, items: {}, flags: [] };
  const retryNs = [];
  const check = (e) => (locate(e.evidence_quote, t.segments) ? null : "quote not found verbatim");
  for (const e of expl.items) { if (check(e)) retryNs.push(e.n); }
  if (retryNs.length) {
    const again = await claude(SYS_EXPLAIN, `${transcriptBlock}\n\nAUSSAGEN MIT LÖSUNGSSCHLÜSSEL:\n${keyList}\n\nWICHTIG: Bei den Aussagen ${retryNs.join(", ")} war das evidence_quote kein wörtlicher Ausschnitt des Transkripts. Kopiere es diesmal exakt (Zeichen für Zeichen) aus dem Transkript. Liefere alle Aussagen erneut.`, TOOL_EXPLAIN);
    const byN = Object.fromEntries(again.items.map((e) => [e.n, e])); expl = { items: expl.items.map((e) => (retryNs.includes(e.n) && byN[e.n] ? byN[e.n] : e)) };
  }
  for (const s of st) {
    const e = expl.items.find((x) => x.n === s.n); const b = blind.verdicts.find((x) => x.n === s.n); const key = s.ans ? "richtig" : "falsch";
    const flags = [];
    if (!e) flags.push("no explanation returned");
    if (!b) flags.push("no blind verdict"); else if (b.verdict !== key) flags.push(`blind verdict "${b.verdict}" differs from key "${key}" (${b.reason?.slice(0, 160)})`);
    if (e) {
      if (e.supports_key !== "yes") flags.push(`model says transcript ${e.supports_key === "no" ? "contradicts" : "does not clearly support"} the key`);
      const loc = locate(e.evidence_quote, t.segments); if (!loc) flags.push("quote not verbatim in transcript");
      if (e.quote_clean === false) flags.push("quote has recognition errors");
      if (!e.explanation_correct_ar?.trim() || !e.explanation_wrong_ar?.trim() || !e.quote_translation_ar?.trim()) flags.push("empty Arabic field");
      if (e.key_phrase && !norm(e.evidence_quote).includes(norm(e.key_phrase))) flags.push("key_phrase not inside the quote");
      out.items[s.n] = { n: s.n, statement: s.text, key, blind: b?.verdict ?? null, ...e, start: loc?.start ?? null, end: loc?.end ?? null, flags, publishable: flags.length === 0 };
    } else out.items[s.n] = { n: s.n, statement: s.text, key, flags, publishable: false };
    if (flags.length) out.flags.push({ n: s.n, flags });
  }
  return out;
}

const queue = [...todo]; let n = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const t = queue.shift();
    try { const r = await processOne(t); fs.writeFileSync(SP + "hoeren-aids/" + t.id + ".json", JSON.stringify(r, null, 1)); n++; console.log(`[${n}/${todo.length}] ${t.level} T${t.teil} ${t.title}: ${Object.values(r.items ?? {}).filter((i) => i.publishable).length}/${Object.keys(r.items ?? {}).length} publishable${r.flags?.length ? " — flagged " + r.flags.map((f) => f.n).join(",") : ""}`); }
    catch (e) { console.log("FAILED", t.title, String(e.message ?? e).slice(0, 160)); }
  }
}));
console.log("tokens in/out:", usage.in, usage.out, "calls:", usage.calls);

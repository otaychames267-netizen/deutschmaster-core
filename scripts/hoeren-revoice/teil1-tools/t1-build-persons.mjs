// usage (cwd = a work dir): node t1-build-persons.mjs <audio_path fragment>
// Teil 1 files of the "five short statements" type ("… Wir haben fünf Personen gefragt … Hören Sie nun fünf kurze Aussagen. Nummer 1 … Nummer 2 …"): announcer intro + five persons.
// Same steps as t1-build.mjs (Gemini transcript segments, teacher-tag sentences dropped, everything after "Ende Teil 1" dropped) but every person is its OWN block with its OWN voice:
// gender = Gemini's label cross-checked with the pitch of the ORIGINAL audio in that time range (autocorrelation F0; clear male < 135 Hz / clear female > 185 Hz overrides the model),
// voices rotate through a male and a female pool so the five persons sound different. The "Nummer N." label is spoken by the person's voice (one request per person, free tier = ~10/day/model).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const frag = process.argv[2];
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const SH = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY };
const get = async (p) => (await fetch(`${env.SUPABASE_URL}/rest/v1/${p}`, { headers: SH, signal: AbortSignal.timeout(60000) })).json();
const exs = await get(`hoeren_exercises?select=id,title,audio_path&teil=eq.1&audio_path=like.*${encodeURIComponent(frag)}`);
if (!exs.length) throw new Error("no exercise for " + frag);
const slug = exs[0].audio_path.split("/").pop().replace(/\.m4a$/, "").replace(/[^a-z0-9-]/gi, "_");
fs.mkdirSync("src", { recursive: true });
const srcFile = `src/${slug}.m4a`;
if (!fs.existsSync(srcFile)) { const a = await fetch(`${env.SUPABASE_URL}/storage/v1/object/hoeren-audio/${exs[0].audio_path}`, { headers: SH, signal: AbortSignal.timeout(120000) }); if (!a.ok) throw new Error("download " + a.status); fs.writeFileSync(srcFile, Buffer.from(await a.arrayBuffer())); }
const st = await get(`hoeren_statements?select=statement_number,statement_text&exercise_id=eq.${exs[0].id}&order=statement_number`);

const gtFile = `${slug}.gt.json`;
async function geminiSegments() {
  const prompt = `Das ist eine Hörverstehen-Aufnahme (telc B2, Teil 1): eine Ansage, dann fünf kurze Aussagen von fünf verschiedenen Personen ("Nummer 1", "Nummer 2" …). Transkribiere sie vollständig und wörtlich auf Deutsch. Antworte NUR mit einem JSON-Array von Segmenten:
[{"gender":"male"|"female","start":<Sekunden ungefähr>,"end":<Sekunden ungefähr>,"text":"<wörtlicher Text>"}]
Regeln: Ein Segment = ein zusammenhängender Sprechabschnitt EINER Person bzw. der Ansage. Die Ansage vor "Nummer 1" ist ein Segment. Jede Person ist ein eigenes Segment; die Ansage "Nummer 2" usw. gehört zum Anfang des Segments der folgenden Person. "gender" = Geschlecht der sprechenden Stimme. Nichts weglassen, nichts erfinden, keine Zusammenfassung, nichts doppelt. Auch Sätze mit einem Lehrer- oder Kanalnamen (z. B. "Deutschlehrer Orhan Yigit") wörtlich mitschreiben. Musik und Pausen NICHT transkribieren. Zahlen so schreiben, wie sie gesprochen werden.
Hilfe für Namen und Schreibweisen (NICHT vorlesen oder ergänzen): ${st.map((s) => s.statement_text).join(" / ").slice(0, 900)}`;
  const data = fs.readFileSync(srcFile).toString("base64");
  for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"]) for (let a = 1; a <= 2; a++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" }, signal: AbortSignal.timeout(170000),
        body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "audio/mp4", data } }, { text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 16000, responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { gender: { type: "STRING", enum: ["male", "female"] }, start: { type: "NUMBER" }, end: { type: "NUMBER" }, text: { type: "STRING" } }, required: ["gender", "start", "end", "text"] } } } }) });
      if (r.ok) { const j = await r.json(); const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""); const o = JSON.parse(t); const segs = Array.isArray(o) ? o : o.segments; if (Array.isArray(segs) && segs.length) return { model, segments: segs }; console.log("  transcript", model, "unexpected shape"); }
      else console.log("  transcript", model, r.status);
    } catch (e) { console.log("  transcript", model, String(e.message ?? e).slice(0, 80)); }
    await new Promise((x) => setTimeout(x, 4000));
  }
  throw new Error("Gemini transcript failed");
}
const gt = fs.existsSync(gtFile) ? JSON.parse(fs.readFileSync(gtFile, "utf8")) : await geminiSegments();
fs.writeFileSync(gtFile, JSON.stringify(gt, null, 1));

// ---- pitch of the original in [from, to] seconds: median F0 (Hz) by autocorrelation, voiced frames only; 0 = not measurable
function f0median(from, to) {
  if (!(to > from)) return 0;
  const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", String(Math.max(0, from)), "-to", String(to), "-i", srcFile, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const x = new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)); const W = 640, HOP = 320, LMIN = 40, LMAX = 228; const f0s = [];
  for (let o = 0; o + W + LMAX < x.length; o += HOP) {
    let e = 0; for (let i = 0; i < W; i++) e += x[o + i] * x[o + i]; if (e / W < 4e5) continue;
    let best = 0, bl = 0; for (let l = LMIN; l <= LMAX; l++) { let s = 0, a = 0, b = 0; for (let i = 0; i < W; i++) { s += x[o + i] * x[o + i + l]; a += x[o + i] ** 2; b += x[o + i + l] ** 2; } const c = s / Math.sqrt(a * b + 1); if (c > best) { best = c; bl = l; } }
    if (best > 0.5 && bl) f0s.push(16000 / bl);
  }
  if (f0s.length < 8) return 0; f0s.sort((a, b) => a - b); return Math.round(f0s[f0s.length >> 1]);
}

// ---- classification (in code)
const TAG_RE = /orhan|yigit|jigit|yeet|\bjied\b|\byed\b|deutschlehrer|vorbereitet (vom|von)|mit den beitr|youtube|kanal\b|abonnier/i;
const LABEL_RE = /^nummer\s+(\d|eins|zwei|drei|vier|fünf)\b[.,:]?\s*/i;
const sentences = (t) => String(t ?? "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["“”„]?|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
const blocks = []; const dropped = []; let ended = false;
for (const s of gt.segments) {
  for (const sent of sentences(s.text)) {
    if (ended) { dropped.push("(after Ende Teil 1) " + sent); continue; }
    if (TAG_RE.test(sent)) { dropped.push(sent); continue; }
    if (/^ende teil 1\b/i.test(sent)) { ended = true; blocks.push({ kind: "announcer", seg: s, start: s.start, end: s.end, text: sent }); continue; }
    const isLabel = LABEL_RE.test(sent);
    const last = blocks[blocks.length - 1];
    if (isLabel) { blocks.push({ kind: "person", seg: s, start: s.start, end: s.end, text: sent, genders: { male: 0, female: 0 } }); blocks[blocks.length - 1].genders[s.gender === "female" ? "female" : "male"] += sent.length; continue; }
    if (!last || last.kind === "announcer" && last.text.startsWith("Ende")) { blocks.push({ kind: "announcer", seg: s, start: s.start, end: s.end, text: sent }); continue; }
    last.text += " " + sent; last.end = Math.max(last.end ?? 0, s.end ?? 0);
    if (last.kind === "person") last.genders[s.gender === "female" ? "female" : "male"] += sent.length;
  }
}
// everything before the first "Nummer" label is the announcer intro: blocks created before the first person block are announcer blocks (kind set above); merge them into one
const firstPerson = blocks.findIndex((b) => b.kind === "person");
if (firstPerson < 0) throw new Error("no 'Nummer N' labels found — not a persons file; use t1-build.mjs");
const intro = blocks.slice(0, firstPerson).map((b) => b.text).join(" ");
const persons = blocks.filter((b, i) => i >= firstPerson && b.kind === "person");
const outro = blocks.filter((b, i) => i >= firstPerson && b.kind === "announcer");

const MALE = ["Charon", "Orus", "Iapetus", "Alnilam", "Rasalgethi"], FEMALE = ["Erinome", "Aoede", "Leda", "Autonoe", "Sulafat"];
const used = { male: 0, female: 0 }; const voices = { announcer: "Kore" }; const items = []; const report = [];
if (intro) items.push({ type: "tts", voice: "announcer", gapAfter: 1.5, kind: "announcer", text: intro });
for (const [i, p] of persons.entries()) {
  const modelG = p.genders.female > p.genders.male ? "female" : "male";
  const hz = f0median(p.start, p.end);
  const g = hz && hz < 135 ? "male" : hz > 185 ? "female" : modelG;
  const name = (g === "male" ? MALE : FEMALE)[used[g]++ % 5]; const key = `p${i + 1}`; voices[key] = name;
  report.push(`person ${i + 1}: model=${modelG} F0=${hz || "n/a"}Hz -> ${g} ${name}${g !== modelG ? "  (pitch overrode the model)" : ""}`);
  items.push({ type: "tts", voice: key, gapAfter: 1.8, kind: "person", text: p.text });
}
for (const o of outro) items.push({ type: "tts", voice: "announcer", gapAfter: 1.0, kind: "announcer", text: o.text });
const tempo = Object.fromEntries(Object.keys(voices).map((k) => [k, 0.94]));
const script = { name: slug, provider: "gemini", voices, models: ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"], maxChars: 1000, concurrency: 1, tempo, items };
fs.writeFileSync(`${slug}.script.json`, JSON.stringify(script, null, 1));
fs.writeFileSync(`${slug}.meta.json`, JSON.stringify({ slug, audio_path: exs[0].audio_path, exercises: exs.map((e) => ({ id: e.id, title: e.title })) }, null, 1));
console.log(`${slug}: ${exs.map((e) => e.title).join(" + ")} | transcript by ${gt.model ?? "?"} | ${gt.segments.length} segments -> ${items.length} items (${persons.length} persons), ${items.reduce((n, i) => n + i.text.length, 0)} chars | requests needed ~${items.reduce((n, i) => n + Math.ceil(i.text.length / 1000), 0)}`);
for (const r of report) console.log("  " + r);
for (const d of dropped) console.log(`  DROPPED: ${d}`);
for (const i of items) console.log(`  [${i.voice} gap ${i.gapAfter}s] ${i.text.slice(0, 110)}${i.text.length > 110 ? " … (" + i.text.length + " chars)" : ""}`);

// usage (cwd = a work dir): node t1-build.mjs <audio_path fragment, e.g. teil1/erdbeben.m4a>
// 1) downloads the exercise audio from the hoeren-audio bucket, 2) Gemini audio understanding -> verbatim transcript segments (text, speaker gender, rough start/end seconds),
// 3) CLASSIFIES in code (not by the model — it mislabelled the exam announcement as a "teacher tag"): teacher-tag sentences (Orhan Yigit …) are dropped, exam-announcement sentences become
//    one announcer block, everything else is news read by the voice of the segment's gender. Writes <slug>.gt.json (transcript) and <slug>.script.json (Gemini-TTS script for revoice.mjs).
import fs from "node:fs";
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
  const prompt = `Das ist eine Hörverstehen-Aufnahme (telc B2, Teil 1). Transkribiere sie vollständig und wörtlich auf Deutsch. Antworte NUR mit einem JSON-Array von Segmenten:
[{"gender":"male"|"female","start":<Sekunden ungefähr>,"end":<Sekunden ungefähr>,"text":"<wörtlicher Text>"}]
Regeln: Ein Segment = ein zusammenhängender Sprechabschnitt EINER Stimme (die Prüfungsansage am Anfang ist ein Segment; jede Nachricht / Meldung / Person ist ein eigenes Segment). "gender" = Geschlecht der sprechenden Stimme. Nichts weglassen, nichts erfinden, keine Zusammenfassung, nichts doppelt. Auch Sätze mit einem Lehrer- oder Kanalnamen (z. B. "Deutschlehrer Orhan Yigit") wörtlich mitschreiben. Musik, Jingles und Pausen NICHT transkribieren (nur über die Zeiten start/end sichtbar). Zahlen so schreiben, wie sie gesprochen werden (z. B. "achtzehn", "zweiundfünfzig Komma acht Prozent").
Hilfe für Namen und Schreibweisen (NICHT vorlesen oder ergänzen): ${st.map((s) => s.statement_text).join(" / ").slice(0, 900)}`;
  const data = fs.readFileSync(srcFile).toString("base64");
  // GT_MODELS="gemini-3.5-flash,..." forces stronger models first: the *-lite ones garble poor recordings (2026-10-21: "Sprachknitzer", "finazierstärkste")
  for (const model of (process.env.GT_MODELS ?? "gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.5-flash").split(",")) for (let a = 1; a <= 2; a++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" }, signal: AbortSignal.timeout(170000),
        body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "audio/mp4", data } }, { text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 16000, responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { gender: { type: "STRING", enum: ["male", "female"] }, start: { type: "NUMBER" }, end: { type: "NUMBER" }, text: { type: "STRING" } }, required: ["gender", "start", "end", "text"] } } } }) });
      if (r.ok) { const j = await r.json(); const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""); const o = JSON.parse(t); const segs = Array.isArray(o) ? o : o.segments; if (Array.isArray(segs) && segs.length) {
          // 2026-10-21: for two files (Vögel, Die Fluggesellschaft) the model echoed OUR PROMPT as the first segment — never accept that
          if (/Transkribiere sie vollständig|JSON-Array von Segmenten|Hilfe für Namen und Schreibweisen/i.test(segs.map((s) => s.text ?? "").join(" "))) { console.log("  transcript", model, "echoed the prompt — rejected"); continue; }
          return { model, segments: segs };
        }
        console.log("  transcript", model, "unexpected shape"); }
      else console.log("  transcript", model, r.status);
    } catch (e) { console.log("  transcript", model, String(e.message ?? e).slice(0, 80)); }
    await new Promise((x) => setTimeout(x, 4000));
  }
  throw new Error("Gemini transcript failed");
}
const gt = fs.existsSync(gtFile) ? JSON.parse(fs.readFileSync(gtFile, "utf8")) : await geminiSegments();
fs.writeFileSync(gtFile, JSON.stringify(gt, null, 1));

// ---- classification (in code)
const TAG_RE = /orhan|yigit|jigit|yeet|\bjied\b|\byed\b|deutschlehrer|vorbereitet (vom|von)|mit den beitr|youtube|kanal\b|abonnier/i;
const INSTR_RE = /^(hörverstehen\b|sie hören\b|dazu sollen|entscheiden sie|markieren sie|lesen sie|sie haben dazu|ende (teil|der)\b|das war (die|der|das)\b)/i;
const sentences = (t) => String(t ?? "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["“”„]?|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
const blocks = []; // { kind: "instruction" | "news", gender, start, end, text }
const dropped = [];
let ended = false; // compilation files continue with the NEXT part's announcement ("Ende Teil 1. Hörverstehen Teil 2. …") — everything after "Ende Teil 1" is dropped
for (const s of gt.segments) {
  for (const sent of sentences(s.text)) {
    if (ended) { dropped.push("(after Ende Teil 1) " + sent); continue; }
    if (TAG_RE.test(sent)) { dropped.push(sent); continue; }
    if (/^ende teil 1\b/i.test(sent)) ended = true;
    const kind = INSTR_RE.test(sent) ? "instruction" : "news";
    const last = blocks[blocks.length - 1];
    // the same segment (or an instruction run) keeps appending to the open block of the same kind
    if (last && last.kind === kind && (kind === "instruction" || last.seg === s)) { last.text += " " + sent; last.end = s.end; }
    else blocks.push({ kind, seg: s, gender: s.gender === "female" ? "female" : "male", start: s.start, end: s.end, text: sent });
  }
}
// the model splits one news item into several segments → merge adjacent news blocks that are < 2.5 s apart (same item) while they fit one TTS request (free tier = ~10 requests/day/model)
const merged = [];
for (const b of blocks) {
  const last = merged[merged.length - 1];
  // 2026-10-19: pack as many news items as fit ONE request (< 1900 chars ≈ 2 min of audio) — the free TTS tier is 10 requests/day/model; items further apart than 2.5 s are separated by a paragraph break
  if (last && last.kind === "news" && b.kind === "news" && last.text.length + b.text.length < 1900) { const apart = typeof b.start === "number" && typeof last.end === "number" && b.start - last.end >= 2.5; last.text += (apart ? "\n\n" : " ") + b.text; last.end = b.end; last.chars += b.text.length; }
  else merged.push({ ...b, chars: b.text.length });
}
// ONE news voice per exercise: the gender with most characters (the model's per-segment gender labels flip between runs)
const gChars = { male: 0, female: 0 }; for (const b of merged) if (b.kind === "news") gChars[b.gender] += b.chars;
const newsVoice = gChars.female > gChars.male ? "female" : "male";
// ---- script: announcer (exam instructions) female "Kore"; news male "Charon" (owner-approved pilot) or female "Erinome"
const VOICES = { announcer: "Kore", male: "Charon", female: "Erinome" };
const items = merged.flatMap((b, i) => {
  const next = merged[i + 1];
  const orig = next && typeof next.start === "number" && typeof b.end === "number" ? +(next.start - b.end).toFixed(1) : null;
  // pause after the announcement keeps the original length (1-62 s, the reading time); between news items 1.2-3 s
  const gap = orig == null ? 1.0 : b.kind === "instruction" ? Math.min(62, Math.max(1, orig)) : Math.min(3, Math.max(1.2, orig));
  const item = { type: "tts", voice: b.kind === "instruction" ? "announcer" : newsVoice, gapAfter: gap, kind: b.kind, text: b.text };
  // Gemini Live reads the long announcer text but drops its LAST sentence ("Lesen Sie jetzt die Aufgaben 41-45.") — seen in
  // every file of the 2026-10-21 batch. A sentence of its own is never skipped; the reading pause stays after it.
  const m = b.kind === "instruction" ? b.text.match(/^(.*?[.!?])\s+(Lesen Sie jetzt die Aufgaben[^.!?]*[.!?]?)\s*$/s) : null;
  return m ? [{ ...item, gapAfter: 0.5, text: m[1] }, { ...item, text: m[2] }] : [item];
}).filter((it) => !(it.kind === "news" && it.text.trim().length < 8)); // a transcript stub such as "Mit" (cut-off speech): the voice returns 0 s of audio for it
const script = { name: slug, provider: "gemini", voices: VOICES, models: ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"], maxChars: 2000, concurrency: 1, tempo: { announcer: 0.94, male: 0.94, female: 0.94 }, items };
fs.writeFileSync(`${slug}.script.json`, JSON.stringify(script, null, 1));
fs.writeFileSync(`${slug}.meta.json`, JSON.stringify({ slug, audio_path: exs[0].audio_path, exercises: exs.map((e) => ({ id: e.id, title: e.title })) }, null, 1));
console.log(`${slug}: ${exs.map((e) => e.title).join(" + ")} | transcript by ${gt.model ?? "?"} | ${gt.segments.length} segments -> ${items.length} items (${items.filter((i) => i.kind === "instruction").length} announcer), ${items.reduce((n, i) => n + i.text.length, 0)} chars | requests needed ~${items.reduce((n, i) => n + Math.ceil(i.text.length / 1000), 0)}`);
for (const d of dropped) console.log(`  DROPPED (teacher tag): ${d}`);
for (const i of items) console.log(`  [${i.voice} gap ${i.gapAfter}s] ${i.text.slice(0, 120)}${i.text.length > 120 ? " … (" + i.text.length + " chars)" : ""}`);

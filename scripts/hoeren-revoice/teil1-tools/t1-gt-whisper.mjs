// usage (cwd = work dir): node t1-gt-whisper.mjs <slug> [--gender-from <old.gt.json>]
// FREE fallback for the ground-truth transcript when the strong Gemini models are overloaded (503/429): Groq whisper-large-v3 (free tier) on the
// source audio, with the exercise's statements as the prompt (names), written as <slug>.gt.json in the format t1-build.mjs expects. Speaker gender
// comes from an earlier transcript of the same file (time overlap) because Whisper has none; without it everything is "male".
// Whisper loops ("Vielen Dank." on silence), music tags and low-confidence segments are dropped. Afterwards run t1-run.mjs as usual (it reuses
// an existing gt.json) and completeness.mjs — an independent check is what tells whether the transcript is right.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2), slug = args[0];
const gfrom = args.includes("--gender-from") ? args[args.indexOf("--gender-from") + 1] : null;
if (!slug) { console.log("usage: node t1-gt-whisper.mjs <slug> [--gender-from old.gt.json]"); process.exit(1); }
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const SH = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY };
const meta = JSON.parse(fs.readFileSync(`${slug}.meta.json`, "utf8"));
const st = await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_statements?select=statement_text&exercise_id=eq.${meta.exercises[0].id}&order=statement_number`, { headers: SH })).json();
const prompt = ("Nachrichtensendung. " + st.map((s) => s.statement_text).join(" ")).slice(0, 700);

const mp3 = `gtw-${slug}.mp3`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `src/${slug}.m4a`, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", mp3]);
let j = null;
for (let a = 1; a <= 4 && !j; a++) {
  const form = new FormData(); form.append("file", new Blob([fs.readFileSync(mp3)], { type: "audio/mpeg" }), "a.mp3");
  form.append("model", "whisper-large-v3"); form.append("language", "de"); form.append("temperature", "0"); form.append("response_format", "verbose_json"); form.append("prompt", prompt);
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(300000) });
  if (r.ok) j = await r.json(); else { console.log("groq", r.status, (await r.text()).slice(0, 160)); await new Promise((x) => setTimeout(x, 8000 * a)); }
}
fs.unlinkSync(mp3);
if (!j) { console.log("Groq transcription failed"); process.exit(1); }

const oldSegs = gfrom && fs.existsSync(gfrom) ? JSON.parse(fs.readFileSync(gfrom, "utf8")).segments : [];
const genderAt = (t) => (oldSegs.find((s) => t >= s.start - 1 && t <= s.end + 1) ?? oldSegs.reduce((b, s) => (b && Math.abs((b.start + b.end) / 2 - t) < Math.abs((s.start + s.end) / 2 - t) ? b : s), null))?.gender ?? "male";
const JUNK = /^(vielen dank|musik|untertitel|copyright|danke fürs zuschauen)/i;
const kept = (j.segments ?? []).filter((s) => s.text.trim().length >= 4 && !JUNK.test(s.text.trim()) && (s.no_speech_prob ?? 0) < 0.6 && (s.avg_logprob ?? 0) > -1.3);
const blocks = [];
for (const s of kept) {
  const g = genderAt((s.start + s.end) / 2), last = blocks[blocks.length - 1];
  if (last && last.gender === g && s.start - last.end < 2.0) { last.text += " " + s.text.trim(); last.end = s.end; }
  else blocks.push({ gender: g, start: +s.start.toFixed(2), end: +s.end.toFixed(2), text: s.text.trim() });
}
fs.writeFileSync(`${slug}.gt.json`, JSON.stringify({ model: "groq-whisper-large-v3", segments: blocks }, null, 1));
console.log(`${slug}: ${j.segments?.length ?? 0} Whisper segments, ${kept.length} kept, ${blocks.length} blocks, ${blocks.reduce((n, b) => n + b.text.length, 0)} chars`);
for (const b of blocks) console.log(`  [${b.gender} ${b.start}-${b.end}] ${b.text.slice(0, 140)}${b.text.length > 140 ? "…" : ""}`);

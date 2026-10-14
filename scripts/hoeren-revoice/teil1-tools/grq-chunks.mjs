// usage: node grq-chunks.mjs <name> <original-audio>  -> Groq whisper-large-v3 on consecutive 40 s windows (long single requests make Groq drop umlauts/punctuation); writes <name>.gc.json with absolute segment times
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [name, src] = process.argv.slice(2);
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).toString());
const WIN = 40; const all = [];
for (let a = 0; a < dur; a += WIN) {
  const mp3 = `${name}.w.mp3`; execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(a), "-t", String(WIN), "-i", src, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", mp3]);
  let j = null;
  for (let t = 1; t <= 4 && !j; t++) { const form = new FormData(); form.append("file", new Blob([fs.readFileSync(mp3)], { type: "audio/mpeg" }), "w.mp3"); form.append("model", "whisper-large-v3"); form.append("language", "de"); form.append("response_format", "verbose_json"); form.append("temperature", "0");
    try { const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(120_000) }); if (r.ok) j = await r.json(); else await new Promise((x) => setTimeout(x, 4000 * t)); } catch { await new Promise((x) => setTimeout(x, 3000 * t)); } }
  if (!j) { console.log(name, "window", a, "FAILED"); continue; }
  for (const s of j.segments ?? []) { const text = String(s.text).replace(/\s+/g, " ").trim(); if (text) all.push({ start: Math.round((a + s.start) * 10) / 10, end: Math.round((a + s.end) * 10) / 10, text }); }
}
fs.writeFileSync(`${name}.gc.json`, JSON.stringify({ segments: all })); console.log(name, "ok", all.length, "segments", dur.toFixed(0), "s");
process.exit(0);

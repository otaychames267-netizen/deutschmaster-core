// usage: node gclip.mjs <audio> <start> <end>  -> Groq whisper (v3 + turbo) on a clip, 4 variants each (plain / tempo 0.85 / tempo 1.15 / loudnorm); prints all lines (compare to resolve doubtful words)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [src, a, b] = process.argv.slice(2);
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const variants = [["plain", ""], ["slow", "rubberband=tempo=0.85"], ["fast", "rubberband=tempo=1.15"], ["loud", "highpass=f=80,loudnorm=I=-14"]];
const jobs = []; for (const [label, af] of variants) for (const model of ["whisper-large-v3", "whisper-large-v3-turbo"]) jobs.push([label, af, model]);
const f = `gc-${process.pid}.mp3`;
for (const [label, af, model] of jobs) {
  const args = ["-y", "-loglevel", "error", "-ss", a, "-to", b, "-i", src]; if (af) args.push("-af", af); args.push("-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", f); execFileSync("ffmpeg", args);
  const form = new FormData(); form.append("file", new Blob([fs.readFileSync(f)], { type: "audio/mpeg" }), "g.mp3"); form.append("model", model); form.append("language", "de"); form.append("temperature", "0"); form.append("response_format", "text");
  try { const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form }); console.log(`[${label}/${model.endsWith("turbo") ? "turbo" : "v3"}] ${(await r.text()).replace(/\s+/g, " ").trim().slice(0, 300)}`); } catch (e) { console.log(label, "err"); }
}
fs.unlinkSync(f); process.exit(0);

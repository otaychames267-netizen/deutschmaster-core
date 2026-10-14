// usage: node multi-asr.mjs <name> <start> <end>  -> same clip through several ASR models on DeepInfra (independent opinions on a doubtful word)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [name, a, b] = process.argv.slice(2);
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const mp3 = `ma-${name}-${a}.mp3`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", a, "-to", b, "-i", `../hoeren/orig/teil2/${name}.m4a`, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", mp3]);
for (const model of ["mistralai/Voxtral-Small-24B-2507", "mistralai/Voxtral-Mini-3B-2507", "Qwen/Qwen3-ASR-1.7B", "Qwen/Qwen3-ASR-0.6B", "nvidia/Nemotron-3.5-ASR-Streaming-Multilingual-0.6b", "openai/whisper-large-v3-turbo"]) {
  const form = new FormData(); form.append("file", new Blob([fs.readFileSync(mp3)], { type: "audio/mpeg" }), "a.mp3"); form.append("model", model); form.append("language", "de"); form.append("temperature", "0");
  try { const r = await fetch("https://api.deepinfra.com/v1/openai/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.DEEPINFRA_API_KEY}` }, body: form, signal: AbortSignal.timeout(120_000) }); const t = await r.text(); let out = t.slice(0, 260); try { out = JSON.parse(t).text ?? out; } catch {} console.log(`[${model.split("/")[1]}] ${r.status}: ${out}`); } catch (e) { console.log(`[${model}] err ${e.message}`); }
}
fs.unlinkSync(mp3); process.exit(0);

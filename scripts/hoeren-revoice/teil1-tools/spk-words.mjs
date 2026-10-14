// usage: node spk-words.mjs <name> <original-audio> <clean-audio>
// Groq whisper-large-v3 with WORD timestamps (40 s windows) + per-word pitch mode (male ~100-150 Hz / female ~190-260 Hz, from the denoised copy) -> prints the transcript as runs "[F|M] text" with start times
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [name, orig, clean] = process.argv.slice(2);
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", orig]).toString());
let words = fs.existsSync(`${name}.words.json`) ? JSON.parse(fs.readFileSync(`${name}.words.json`, "utf8")) : null;
if (!words) { words = [];
  for (let a = 0; a < dur; a += 40) {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(a), "-t", "40", "-i", orig, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", `${name}.ww.mp3`]);
    let j = null; for (let t = 1; t <= 4 && !j; t++) { const form = new FormData(); form.append("file", new Blob([fs.readFileSync(`${name}.ww.mp3`)], { type: "audio/mpeg" }), "w.mp3"); form.append("model", "whisper-large-v3"); form.append("language", "de"); form.append("response_format", "verbose_json"); form.append("temperature", "0"); form.append("timestamp_granularities[]", "word");
      try { const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(120_000) }); if (r.ok) j = await r.json(); else await new Promise((x) => setTimeout(x, 4000 * t)); } catch { await new Promise((x) => setTimeout(x, 3000 * t)); } }
    for (const w of j?.words ?? []) words.push({ w: w.word, s: Math.round((a + w.start) * 100) / 100, e: Math.round((a + w.end) * 100) / 100 });
  }
  fs.writeFileSync(`${name}.words.json`, JSON.stringify(words));
}
// pitch frames on the clean copy
const pcmRaw = execFileSync("ffmpeg", ["-v", "error", "-i", clean, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 29 }); const x = new Int16Array(pcmRaw.buffer.slice(pcmRaw.byteOffset, pcmRaw.byteOffset + pcmRaw.length)); const SR = 16000;
const Wn = 640, TMAX = 230, TMIN = 53; const d = new Float64Array(TMAX + 1), cm = new Float64Array(TMAX + 1);
function yin(off) { let e = 0; for (let i = 0; i < Wn; i++) e += x[off + i] * x[off + i]; if (e / Wn < 4e6) return 0; for (let t = 1; t <= TMAX; t++) { let s = 0; for (let i = 0; i < Wn; i++) { const df = x[off + i] - x[off + i + t]; s += df * df; } d[t] = s; } let run = 0; cm[0] = 1; for (let t = 1; t <= TMAX; t++) { run += d[t]; cm[t] = d[t] * t / run; } for (let t = TMIN; t < TMAX; t++) { if (cm[t] < 0.12) { while (t + 1 < TMAX && cm[t + 1] < cm[t]) t++; const a = cm[t - 1], b = cm[t], c = cm[t + 1]; const den = a - 2 * b + c; return SR / (den ? t + 0.5 * (a - c) / den : t); } } return 0; }
const frames = []; for (let o = 0; o + Wn + TMAX < x.length; o += 160) frames.push(yin(o)); // 10 ms hop
const lab = words.map((w) => { let m = 0, f = 0; for (let i = Math.floor(w.s * 100); i < Math.min(frames.length, Math.ceil(w.e * 100)); i++) { const v = frames[i]; if (v >= 90 && v <= 155) m++; else if (v >= 190 && v <= 265) f++; } return m + f < 2 ? "?" : m > f * 1.3 ? "M" : f > m * 1.3 ? "F" : "?"; });
// smooth: majority of a 5-word window, '?' inherit
const sm = lab.map((l, i) => { const c = { M: 0, F: 0 }; for (let k = Math.max(0, i - 2); k <= Math.min(lab.length - 1, i + 2); k++) if (lab[k] !== "?") c[lab[k]]++; return c.M === c.F ? l : c.M > c.F ? "M" : "F"; });
let out = [], cur = null; words.forEach((w, i) => { const l = sm[i]; if (!cur || (l !== cur.l && l !== "?" && cur.l !== "?")) { cur = { l, t: w.s, text: "" }; out.push(cur); } if (cur.l === "?" && l !== "?") cur.l = l; cur.text += w.w; });
for (const r of out) console.log(`${r.t.toFixed(0).padStart(3)} [${r.l}] ${r.text.trim()}`);
process.exit(0);

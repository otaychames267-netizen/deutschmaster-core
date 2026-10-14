// usage: node qa.mjs <name>   -> QA of <name>.new.m4a: (1) Whisper re-transcription vs the script (word-level diff = TTS misreadings / omissions),
// (2) per-voice pitch (gender / distinctness check), (3) overall loudness + duration.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const name = process.argv[2];
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const timeline = JSON.parse(fs.readFileSync(`${name}.timeline.json`, "utf8")); const speech = timeline.filter((t) => t.kind === "speech");

// ---- 1) transcription
const mp3 = `${name}.qa.mp3`; execFileSync("ffmpeg", ["-y", "-v", "error", "-i", `${name}.new.m4a`, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "40k", mp3]);
let asr = null;
if (fs.existsSync(`${name}.qa.json`)) asr = JSON.parse(fs.readFileSync(`${name}.qa.json`, "utf8"));
else {
  for (let a = 1; a <= 4 && !asr; a++) {
    const form = new FormData(); form.append("file", new Blob([fs.readFileSync(mp3)], { type: "audio/mpeg" }), "a.mp3"); form.append("model", "openai/whisper-large-v3"); form.append("language", "de"); form.append("response_format", "verbose_json"); form.append("temperature", "0");
    try { const r = await fetch("https://api.deepinfra.com/v1/openai/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.DEEPINFRA_API_KEY}` }, body: form, signal: AbortSignal.timeout(420_000) }); if (r.ok) asr = await r.json(); else console.log("stt", r.status); } catch (e) { console.log("stt err", String(e.message ?? e)); }
  }
  if (!asr) { console.log("STT failed"); process.exit(1); }
  fs.writeFileSync(`${name}.qa.json`, JSON.stringify(asr));
}
const NUM = { sechsundvierzig: "46", fünfundfünfzig: "55", sechzig: "60", hundertfünfundzwanzig: "125", siebzigsten: "70", siebzig: "70", achtzehnte: "18", achtzehnten: "18", zehn: "10", neun: "9", sieben: "7", sechs: "6", zwei: "2", eine: "1" };
const norm = (s) => s.toLowerCase().replace(/[„“”"«»]/g, "").replace(/(\d)\./g, "$1").replace(/[.,!?;:–—…]/g, " ").replace(/-/g, " ").split(/\s+/).filter(Boolean).map((w) => NUM[w] ?? w);
const ref = norm(speech.map((s) => s.text).join(" ")); const hyp = norm((asr.segments ?? []).map((s) => s.text).join(" "));
// word-level Levenshtein with backtrace
const n = ref.length, m = hyp.length; const D = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
for (let i = 0; i <= n; i++) D[i][0] = i; for (let j = 0; j <= m; j++) D[0][j] = j;
for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
const ops = []; let i = n, j = m;
while (i > 0 || j > 0) {
  if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) { if (ref[i - 1] !== hyp[j - 1]) ops.push({ t: "sub", ref: ref[i - 1], hyp: hyp[j - 1], at: i - 1 }); i--; j--; }
  else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { ops.push({ t: "del", ref: ref[i - 1], at: i - 1 }); i--; }
  else { ops.push({ t: "ins", hyp: hyp[j - 1], at: i }); j--; }
}
ops.reverse();
console.log(`WER ${(100 * D[n][m] / n).toFixed(1)}% (${D[n][m]} edits / ${n} ref words)`);
for (const o of ops) { const ctx = ref.slice(Math.max(0, o.at - 3), o.at + 3).join(" "); console.log(`  ${o.t.padEnd(3)} ref="${o.ref ?? ""}" hyp="${o.hyp ?? ""}"   …${ctx}…`); }

// ---- 2) pitch per voice (median of per-chunk medians), simple autocorrelation on voiced frames
const pcm = fs.readFileSync(`${name}.new.pcm`); const x = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1); const SR = 24000;
function medF0(a, b) {
  const fr = []; const W = 1024; const minL = Math.floor(SR / 400), maxL = Math.floor(SR / 70);
  for (let o = a; o + W + maxL < b; o += 1200) { let e = 0; for (let k = 0; k < W; k++) e += x[o + k] * x[o + k]; if (e / W < 4e5) continue; let best = 0, bl = 0; for (let l = minL; l <= maxL; l++) { let s = 0; for (let k = 0; k < W; k += 2) s += x[o + k] * x[o + k + l]; if (s > best) { best = s; bl = l; } } if (best / (e / 2) > 0.5) fr.push(SR / bl); }
  fr.sort((p, q) => p - q); return fr.length > 10 ? fr[fr.length >> 1] : 0;
}
const byV = {}; for (const s of speech) { const f = medF0(Math.floor(s.start * SR), Math.floor(s.end * SR)); if (f) (byV[s.voice] ??= []).push(f); }
for (const [v, a] of Object.entries(byV)) { a.sort((p, q) => p - q); console.log(`pitch ${v}: median ${Math.round(a[a.length >> 1])} Hz (p10 ${Math.round(a[Math.floor(a.length * 0.1)])}, p90 ${Math.round(a[Math.floor(a.length * 0.9)])}, ${a.length} chunks)`); }

// ---- 3) loudness + duration
import { spawnSync } from "node:child_process";
const r = spawnSync("ffmpeg", ["-hide_banner", "-i", `${name}.new.m4a`, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
const err = r.stderr ?? ""; const I = err.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop(); const TP = err.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop(); const dur = err.match(/Duration: (\d+:\d+:[\d.]+)/)?.[1];
console.log(`duration ${dur}, integrated ${I}, true peak ${TP}`);

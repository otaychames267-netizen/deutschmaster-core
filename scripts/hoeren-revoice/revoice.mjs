// usage: node revoice.mjs <name>   (reads <name>.script.json)
// Re-voices a Hören exercise: every spoken turn of the script is synthesized with Qwen3-TTS (DeepInfra, the owner's cloned German voices), music/ring/door-bell cues are
// cut from the ORIGINAL audio, everything is laid on one timeline, loudness-normalised (-18 LUFS, like the clean/ audio) and encoded to <name>.new.m4a.
// Output next to it: <name>.timeline.json (start/end of every chunk, usable as a transcript) and a per-chunk speed report (cps = characters per second) to spot truncated / runaway clips.
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
const name = process.argv[2];
const script = JSON.parse(fs.readFileSync(`${name}.script.json`, "utf8"));
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const SR = 24000; fs.mkdirSync("cache", { recursive: true });

function chunksOf(text, max = 230) {
  const sents = text.match(/[^.!?]+[.!?]+["“”„]?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const out = []; let cur = "";
  for (const s of sents) { if (cur && (cur + " " + s).length > max) { out.push(cur); cur = s; } else cur = cur ? cur + " " + s : s; }
  if (cur) out.push(cur); return out;
}
async function synth(voiceId, text) {
  const key = crypto.createHash("sha1").update(voiceId + "|" + text).digest("hex"); const f = `cache/${key}.pcm`;
  if (fs.existsSync(f)) return fs.readFileSync(f);
  let err = "";
  for (let a = 1; a <= 5; a++) {
    try {
      const r = await fetch("https://api.deepinfra.com/v1/openai/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${env.DEEPINFRA_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: "Qwen/Qwen3-TTS", voice: voiceId, input: text, response_format: "pcm" }), signal: AbortSignal.timeout(120_000) });
      if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 4000) { fs.writeFileSync(f, b); return b; } err = "tiny audio " + b.length; }
      else { err = r.status + " " + (await r.text()).slice(0, 160); if (r.status === 402) throw new Error("DeepInfra balance exhausted: " + err); }
    } catch (e) { err = String(e.message ?? e); if (/balance/.test(err)) throw e; }
    await new Promise((x) => setTimeout(x, 1500 * a));
  }
  throw new Error(`TTS failed for "${text.slice(0, 40)}…": ${err}`);
}
function trim(buf) { // drop silence at both ends (keep 50 ms)
  const x = new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + (buf.length & ~1))); const W = 480, TH = 200 * 200;
  const loud = (i) => { let e = 0; for (let k = 0; k < W && i + k < x.length; k++) e += x[i + k] * x[i + k]; return e / W > TH; };
  let a = 0; while (a + W < x.length && !loud(a)) a += W / 4; let b = x.length - W; while (b > a && !loud(b)) b -= W / 4;
  a = Math.max(0, Math.floor(a - SR * 0.05)); b = Math.min(x.length, Math.floor(b + W + SR * 0.05));
  return Buffer.from(x.slice(a, b).buffer);
}
// pitch-preserving slow-down (Qwen speaks ~15-20% faster than the original exam recordings; the owner's learners need the real exam pace)
function stretch(buf, tempo) {
  if (!tempo || tempo === 1) return buf;
  const r = spawnSync("ffmpeg", ["-v", "error", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", "-", "-af", `rubberband=tempo=${tempo}:formant=preserved`, "-f", "s16le", "-"], { input: buf, maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout?.length) throw new Error("rubberband failed: " + r.stderr?.toString().slice(0, 200));
  return r.stdout;
}
const silence = (s) => Buffer.alloc(Math.round(s * SR) * 2);
function clip(start, end, fadeIn = 0, fadeOut = 0) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", String(start), "-to", String(end), "-i", `../hoeren/orig/teil2/${name}.m4a`, "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const x = new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)); const n = x.length;
  for (let i = 0; i < Math.min(n, fadeIn * SR); i++) x[i] = Math.round(x[i] * (i / (fadeIn * SR)));
  for (let i = 0; i < Math.min(n, fadeOut * SR); i++) x[n - 1 - i] = Math.round(x[n - 1 - i] * (i / (fadeOut * SR)));
  return Buffer.from(x.buffer);
}

// 1) synthesize all chunks (3 in parallel), keeping the script order
const jobs = []; script.items.forEach((it, i) => { if (it.type === "tts") chunksOf(it.text).forEach((c, k) => jobs.push({ i, k, voice: script.voices[it.voice], vname: it.voice, text: c })); });
let next = 0, done = 0; const results = new Map();
await Promise.all(Array.from({ length: 3 }, async () => { while (next < jobs.length) { const j = jobs[next++]; const b = stretch(trim(await synth(j.voice, j.text)), script.tempo?.[j.vname]); results.set(`${j.i}:${j.k}`, b); if (++done % 10 === 0) console.log(`synthesized ${done}/${jobs.length}`); } }));

// 2) lay out the timeline
const parts = []; const timeline = []; let t = 0; const push = (buf) => { parts.push(buf); t += buf.length / 2 / SR; };
const report = [];
script.items.forEach((it, i) => {
  if (it.type === "silence") { push(silence(it.s)); }
  else if (it.type === "clip") { const s = t; push(clip(it.start, it.end, it.fadeIn, it.fadeOut)); timeline.push({ kind: "clip", start: +s.toFixed(2), end: +t.toFixed(2), src: `${it.start}-${it.end}` }); if (it.gapAfter) push(silence(it.gapAfter)); }
  else {
    const cs = chunksOf(it.text);
    cs.forEach((c, k) => { const b = results.get(`${i}:${k}`); const s = t; push(b); const dur = b.length / 2 / SR; timeline.push({ kind: "speech", voice: it.voice, start: +s.toFixed(2), end: +t.toFixed(2), text: c }); report.push({ voice: it.voice, chars: c.length, sec: +dur.toFixed(1), cps: +(c.length / dur).toFixed(1), text: c.slice(0, 50) }); if (k < cs.length - 1) push(silence(0.28)); });
    push(silence(it.gapAfter ?? 0.6));
  }
});
fs.writeFileSync(`${name}.timeline.json`, JSON.stringify(timeline, null, 1));
fs.writeFileSync(`${name}.new.pcm`, Buffer.concat(parts));

// 3) loudness + encode
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "s16le", "-ar", String(SR), "-ac", "1", "-i", `${name}.new.pcm`, "-af", "loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", `${name}.new.m4a`]);
const cps = report.map((r) => r.cps); const mean = cps.reduce((a, b) => a + b, 0) / cps.length;
console.log(`total ${t.toFixed(1)} s, ${report.length} chunks, mean ${mean.toFixed(1)} chars/s`);
for (const r of report) if (r.cps < mean * 0.7 || r.cps > mean * 1.35) console.log(`  OUTLIER ${r.voice} ${r.sec}s ${r.cps} cps  "${r.text}"`);
const byVoice = {}; for (const r of report) { (byVoice[r.voice] ??= { chars: 0, sec: 0 }); byVoice[r.voice].chars += r.chars; byVoice[r.voice].sec += r.sec; }
for (const [v, s] of Object.entries(byVoice)) console.log(`  ${v}: ${s.chars} chars, ${s.sec.toFixed(0)} s, ${(s.chars / s.sec).toFixed(1)} cps`);
process.exit(0);

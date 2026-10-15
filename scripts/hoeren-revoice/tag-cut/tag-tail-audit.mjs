// For every file whose tag cut runs to the end of the file, transcribes what the ORIGINAL contains after the tag so a long tail cut never swallows real content.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const cuts = JSON.parse(fs.readFileSync("cuts.json", "utf8")); const spans = JSON.parse(fs.readFileSync("tag-spans-valid.json", "utf8"));
async function asr(file, a, b) {
  const tmp = `ta-${process.pid}-${Math.random().toString(36).slice(2, 8)}.mp3`; execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(a), "-to", String(b), "-i", file, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", tmp]);
  for (let t = 1; t <= 5; t++) { const form = new FormData(); form.append("file", new Blob([fs.readFileSync(tmp)], { type: "audio/mpeg" }), "w.mp3"); form.append("model", "whisper-large-v3"); form.append("language", "de"); form.append("response_format", "text"); form.append("temperature", "0");
    try { const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(120_000) }); if (r.ok) { fs.unlinkSync(tmp); return (await r.text()).replace(/\s+/g, " ").trim(); } await new Promise((x) => setTimeout(x, 4000 * t)); } catch { await new Promise((x) => setTimeout(x, 3000 * t)); } }
  fs.unlinkSync(tmp); return "(asr failed)";
}
const todo = [];
for (const [p, v] of Object.entries(cuts)) for (const c of v.cuts) if (c.tail) {
  const sp = spans[p].spans.filter((s) => s.s >= c.s - 0.5 && s.s < c.e).sort((a, b) => b.e - a.e)[0];
  const tagEnd = sp ? sp.e : c.s; const after = v.dur - tagEnd;
  todo.push({ p, tagEnd, dur: v.dur, after, cutLen: c.e - c.s });
}
console.log(`${todo.length} tail cuts; ${todo.filter((t) => t.after > 4).length} have > 4 s after the tag`);
const q = todo.filter((t) => t.after > 4); const out = [];
await Promise.all(Array.from({ length: 3 }, async () => { while (q.length) { const t = q.shift(); const txt = await asr("../hoeren/" + t.p, t.tagEnd + 0.3, t.dur); out.push({ ...t, txt }); } }));
for (const o of out.sort((a, b) => b.after - a.after)) console.log(`${o.p.replace("clean/", "").padEnd(46)} tagEnd ${o.tagEnd.toFixed(1)} dur ${o.dur.toFixed(1)} after ${o.after.toFixed(1)}s | ${o.txt.slice(0, 160) || "(nothing)"}`);
process.exit(0);

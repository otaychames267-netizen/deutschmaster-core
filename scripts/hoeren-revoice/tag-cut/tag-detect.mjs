// Finds the spoken teacher tag ("Deutschlehrer Orhan Yigit", "Mit den Beiträgen des Deutschlehrers …", "Vorbereitet vom Deutschlehrer …") in the LIVE audio files, with word-level times.
// usage: node tag-detect.mjs   (reads tagged-paths.json + all-audio-ex.json + ../hoeren-t/*.json; writes tag-spans.json and prints a compact review list)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const paths = JSON.parse(fs.readFileSync("tagged-paths.json", "utf8")).filter((p) => !p.startsWith("voice2/"));
const rows = JSON.parse(fs.readFileSync("all-audio-ex.json", "utf8"));
const RX = /orhan|yigit|deutschlehrer|vorbereitet vom|beiträgen des|beitr(ä|ae)ge des/i;
const NAME = /^(or(h|ch)an|yi?gi?t|ig(i)?t|yed|jigit|yigi|igit|yiğit|yeet|jet)[.,!?]*$/i;
const clean = (p) => "../hoeren/" + p.replace(/^clean\//, "clean/"); // local mirror: hoeren/clean/teilN/<file>
const out = fs.existsSync("tag-spans.json") ? JSON.parse(fs.readFileSync("tag-spans.json", "utf8")) : {};
async function groqWords(file, a, b) {
  const tmp = `td-${process.pid}-${Math.random().toString(36).slice(2, 7)}.mp3`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(a), "-to", String(b), "-i", file, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", tmp]);
  let j = null;
  for (let t = 1; t <= 5 && !j; t++) {
    const form = new FormData(); form.append("file", new Blob([fs.readFileSync(tmp)], { type: "audio/mpeg" }), "w.mp3"); form.append("model", "whisper-large-v3"); form.append("language", "de"); form.append("response_format", "verbose_json"); form.append("temperature", "0"); form.append("timestamp_granularities[]", "word");
    try { const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(120_000) }); if (r.ok) j = await r.json(); else await new Promise((x) => setTimeout(x, 4000 * t)); } catch { await new Promise((x) => setTimeout(x, 3000 * t)); }
  }
  fs.unlinkSync(tmp); return (j?.words ?? []).map((w) => ({ w: w.word.trim(), s: Math.round((a + w.start) * 100) / 100, e: Math.round((a + w.end) * 100) / 100 }));
}
async function one(p) {
  if (out[p]) return;
  const ex = rows.find((r) => r.audio_path === p); const tj = fs.readdirSync("../hoeren-t").map((f) => JSON.parse(fs.readFileSync("../hoeren-t/" + f, "utf8"))).find((j) => j.id === ex.id);
  const hits = (tj?.segments ?? []).filter((s) => RX.test(s.text)); const dur = tj?.duration ?? 600;
  const wins = []; for (const h of hits) { const a = Math.max(0, h.start - 8), b = Math.min(dur, h.end + 8); if (wins.length && a <= wins[wins.length - 1][1]) wins[wins.length - 1][1] = Math.max(wins[wins.length - 1][1], b); else wins.push([a, b]); }
  const spans = [];
  for (const [a, b] of wins) {
    const words = await groqWords(clean(p), a, b);
    for (let i = 0; i < words.length; i++) {
      if (!NAME.test(words[i].w) && !/^deutschlehrer/i.test(words[i].w)) continue;
      // grow the span: back over "Deutschlehrer(s)", "Vorbereitet vom", "Mit den Beiträgen des"; forward over name tokens
      let s = i, e = i; while (s > 0 && /^(deutschlehrers?|vom|des|den|beitr(ä|ae)gen|beitr(ä|ae)ge|mit|vorbereitet|von)$/i.test(words[s - 1].w.replace(/[.,!?]/g, "")) && words[i].s - words[s - 1].s < 4.5) s--;
      while (e + 1 < words.length && NAME.test(words[e + 1].w) ) e++;
      const text = words.slice(s, e + 1).map((x) => x.w).join(" ");
      const prev = words.slice(Math.max(0, s - 6), s).map((x) => x.w).join(" "), next = words.slice(e + 1, e + 7).map((x) => x.w).join(" ");
      if (!spans.length || spans[spans.length - 1].e < words[s].s - 0.01) spans.push({ s: words[s].s, e: words[e].e, text, prev, next, prevEnd: s > 0 ? words[s - 1].e : null, nextStart: e + 1 < words.length ? words[e + 1].s : null });
      i = e;
    }
  }
  out[p] = { id: ex.id, title: ex.title, dur, spans, windows: wins };
  fs.writeFileSync("tag-spans.json", JSON.stringify(out));
}
const queue = [...paths]; await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) { const p = queue.shift(); try { await one(p); } catch (e) { console.log("FAILED", p, String(e).slice(0, 100)); } } }));
for (const p of paths) { const o = out[p]; if (!o) { console.log("MISSING", p); continue; } console.log(`${p.replace("clean/", "").padEnd(44)} ${o.spans.length} span(s): ` + o.spans.map((s) => `[${s.s}-${s.e}] ...${s.prev} «${s.text}» ${s.next}...`).join("  |  ")); }
process.exit(0);

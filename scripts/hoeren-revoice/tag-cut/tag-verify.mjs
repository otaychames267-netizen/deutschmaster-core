// Re-transcribes the edited audio around every cut (Groq, with and without the tag prompt) and flags any remaining name or a damaged neighbour word.
// usage: node tag-verify.mjs [only-path-substring] [--quiet]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const cuts = JSON.parse(fs.readFileSync(process.env.CUTS ?? "cuts.json", "utf8"));
const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null; const quiet = process.argv.includes("--quiet");
const BAD = /or?h?r?h?an\b|orchan|yi?g[iy]t|\bigit\b|\byed\b|deutschlehrer|beiträgen des|vorbereitet vom/i;
async function asr(file, a, b, prompt) {
  const tmp = `tv-${process.pid}-${Math.random().toString(36).slice(2, 8)}.mp3`; execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(Math.max(0, a)), "-to", String(b), "-i", file, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", tmp]);
  for (let t = 1; t <= 5; t++) { const form = new FormData(); form.append("file", new Blob([fs.readFileSync(tmp)], { type: "audio/mpeg" }), "w.mp3"); form.append("model", "whisper-large-v3"); form.append("language", "de"); form.append("response_format", "text"); form.append("temperature", "0"); if (prompt) form.append("prompt", prompt);
    try { const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(120_000) }); if (r.ok) { fs.unlinkSync(tmp); return (await r.text()).replace(/\s+/g, " ").trim(); } await new Promise((x) => setTimeout(x, 4000 * t)); } catch { await new Promise((x) => setTimeout(x, 3000 * t)); } }
  fs.unlinkSync(tmp); return "(asr failed)";
}
let bad = 0, checked = 0;
const queue = Object.entries(cuts).filter(([p]) => !only || p.includes(only));
async function one([p, v]) {
  const rel = p.replace(/^clean\//, ""); const file = "out/" + rel; let removedBefore = 0; const lines = [];
  for (const c of v.cuts) {
    const t = c.s - removedBefore; const win = c.tail ? [Math.max(0, v.ndur - 14), v.ndur] : [t - 5, t + 5];
    const [plain, prompted] = await Promise.all([asr(file, win[0], win[1], ""), asr(file, win[0], win[1], "Mit den Beiträgen des Deutschlehrers Orhan Yigit. Vorbereitet vom Deutschlehrer Orhan Yigit.")]);
    const flag = BAD.test(plain) || BAD.test(prompted); checked++; if (flag) bad++;
    lines.push(`${flag ? "!! REMAINS" : "ok        "} ${rel} @${t.toFixed(1)}s${c.tail ? " (end)" : ""}\n      plain   : ${plain.slice(0, 190)}\n      prompted: ${prompted.slice(0, 190)}`);
    removedBefore += c.e - c.s;
  }
  if (!quiet || lines.some((l) => l.startsWith("!!"))) console.log(lines.join("\n")); else console.log(lines.map((l) => l.split("\n")[0]).join("\n"));
}
const q = [...queue]; await Promise.all(Array.from({ length: 3 }, async () => { while (q.length) await one(q.shift()); }));
console.log(`checked ${checked} cut regions, ${bad} still contain a name/tag word`);
process.exit(0);

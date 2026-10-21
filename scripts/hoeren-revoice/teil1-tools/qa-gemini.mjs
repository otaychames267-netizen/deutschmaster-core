// usage (cwd = work dir): node qa-gemini.mjs <name>
// QA of <name>.final.m4a against <name>.timeline.json: every synthesized chunk is cut out, transcribed by Gemini audio understanding and compared word by word with the script text.
// Numbers are removed from BOTH sides before the comparison (the transcriber writes "500" for "fünfhundert"; that is formatting, not a TTS error). Exit code 2 when any chunk is above 12 % or empty.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const name = process.argv[2];
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const tl = JSON.parse(fs.readFileSync(`${name}.timeline.json`, "utf8")).filter((t) => t.kind === "speech");
const NUMW = /^(null|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|(drei|vier|fünf|sech|sieb|acht|neun)zehn|(zwan|drei|vier|fünf|sech|sieb|acht|neun)(zig|ßig)|hundert|tausend|million(en)?|und|komma|prozent)+$/;
const norm = (s) => s.toLowerCase().replace(/(\d)\.(\d{3})/g, "$1$2").replace(/[^a-zäöüß0-9\s]/g, " ").split(/\s+/).filter((w) => w && !/^\d/.test(w) && !NUMW.test(w));
function ops(ref, hyp) { const n = ref.length, m = hyp.length, d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]); for (let j = 0; j <= m; j++) d[0][j] = j; for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)); const out = []; let i = n, j = m; while (i > 0 || j > 0) { if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) { if (ref[i - 1] !== hyp[j - 1]) out.push(`${ref[i - 1]}→${hyp[j - 1]}`); i--; j--; } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { out.push(`-${ref[i - 1]}`); i--; } else { out.push(`+${hyp[j - 1]}`); j--; } } return { n: d[n][m], list: out.reverse() }; }
async function gem(file) {
  const data = fs.readFileSync(file).toString("base64");
  for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"]) for (let a = 1; a <= 2; a++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" }, signal: AbortSignal.timeout(120000),
        body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "audio/mpeg", data } }, { text: "Transkribiere diese deutsche Audioaufnahme vollständig und wörtlich (nichts weglassen, nichts hinzufügen). Gib nur den Text aus." }] }], generationConfig: { temperature: 0 } }) });
      if (r.ok) { const j = await r.json(); const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""); if (t) return t; }
    } catch { /* next */ }
    await new Promise((x) => setTimeout(x, 3000));
  }
  return "";
}
let totalE = 0, totalN = 0, bad = 0;
for (const [i, c] of tl.entries()) {
  const f = `qa-${name}-${i}.mp3`;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0, c.start - 0.3)), "-to", String(c.end + 0.3), "-i", `${name}.final.m4a`, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", f]);
  const hyp = await gem(f); let ref = norm(c.text), h = norm(hyp);
  // "Aufgaben 41-45" is spoken "41 bis 45": the written hyphen has no word, the transcript has "bis" — formatting, not a TTS error
  if (/\d\s*[-–]\s*\d/.test(c.text)) { ref = ref.filter((w) => w !== "bis"); h = h.filter((w) => w !== "bis"); }
  let o = ops(ref, h);
  // the transcriber often splits or joins compounds ("Hörverstehen" -> "Hör verstehen"): identical letters in the same order = identical speech
  if (ref.length && ref.join("") === h.join("")) o = { n: 0, list: [] };
  totalE += o.n; totalN += ref.length; const pct = (100 * o.n) / Math.max(1, ref.length);
  if (!h.length || pct > 12) bad++;
  console.log(`  chunk ${i} [${c.voice}] ${ref.length} words, ${o.n} diffs (${pct.toFixed(1)}%)${!h.length || pct > 12 ? "  <== CHECK" : ""} ${o.list.slice(0, 6).join(" ")}`);
  fs.unlinkSync(f);
}
console.log(`${name}: WER ${(100 * totalE / Math.max(1, totalN)).toFixed(1)}% over ${totalN} words, ${bad} chunk(s) to check`);
process.exit(bad ? 2 : 0);

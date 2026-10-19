import fs from "node:fs";
const name = process.argv[2];
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const tl = JSON.parse(fs.readFileSync(`${name}.timeline.json`, "utf8")).filter((t) => t.kind === "speech");
const NUM = { null: 0, ein: 1, eins: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
const norm = (s) => s.toLowerCase().replace(/(\d)\.(\d{3})/g, "$1$2").replace(/[^a-zäöüß0-9\s]/g, " ").split(/\s+/).filter(Boolean).map((w) => (w in NUM ? String(NUM[w]) : w.replace(/^(o)ldendorff$/, "oldendorf")));
function ops(ref, hyp) { const n = ref.length, m = hyp.length, d = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]); for (let j = 0; j <= m; j++) d[0][j] = j; for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)); const out = []; let i = n, j = m; while (i > 0 || j > 0) { if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) { if (ref[i - 1] !== hyp[j - 1]) out.push(`sub ${ref[i - 1]}→${hyp[j - 1]}`); i--; j--; } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { out.push(`del ${ref[i - 1]}`); i--; } else { out.push(`ins ${hyp[j - 1]}`); j--; } } return { n: d[n][m], list: out.reverse() }; }
async function gem(file) {
  const data = fs.readFileSync(file).toString("base64");
  for (const model of ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"]) for (let a = 1; a <= 2; a++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" }, signal: AbortSignal.timeout(120000),
        body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "audio/mpeg", data } }, { text: "Transkribiere diese deutsche Audioaufnahme vollständig und wörtlich (nichts weglassen, nichts hinzufügen). Zahlen so schreiben, wie sie gesprochen werden. Gib nur den Text aus." }] }], generationConfig: { temperature: 0 } }) });
      if (r.ok) { const j = await r.json(); const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""); if (t) return t; }
    } catch {}
    await new Promise((x) => setTimeout(x, 3000));
  }
  return "";
}
let totalE = 0, totalN = 0;
for (const [i, c] of tl.entries()) {
  const hypText = await gem(`chunkqa-${i}.mp3`); const ref = norm(c.text), hyp = norm(hypText); const o = ops(ref, hyp);
  totalE += o.n; totalN += ref.length;
  console.log(`chunk ${i}: ${ref.length} words, ${o.n} diffs (${(100 * o.n / ref.length).toFixed(1)}%) ${o.list.slice(0, 8).join(" | ")}`);
}
console.log(`TOTAL WER (Gemini ASR, numbers normalised): ${(100 * totalE / totalN).toFixed(1)}%`);
process.exit(0);

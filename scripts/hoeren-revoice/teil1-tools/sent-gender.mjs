// usage: node sent-gender.mjs <name> <pcm-name>  -> per sentence (from <name>.words.json): F0-band counts (low 90-150 = male, high 190-270 = female; global-minimum YIN) and a label; prints the transcript with speaker tags merged into runs
import fs from "node:fs";
const [name, pcmName] = process.argv.slice(2);
const words = JSON.parse(fs.readFileSync(`${name}.words.json`, "utf8"));
const pcm = fs.readFileSync(pcmName + ".pcm"); const x = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length >> 1); const SR = 16000;
const Wn = 640, TMAX = 230, TMIN = 53; const d = new Float64Array(TMAX + 1), cm = new Float64Array(TMAX + 1);
function yin(off) { let e = 0; for (let i = 0; i < Wn; i++) e += x[off + i] * x[off + i]; if (e / Wn < 2e5) return 0; for (let t = 1; t <= TMAX; t++) { let s = 0; for (let i = 0; i < Wn; i++) { const df = x[off + i] - x[off + i + t]; s += df * df; } d[t] = s; } let run = 0; cm[0] = 1; for (let t = 1; t <= TMAX; t++) { run += d[t]; cm[t] = d[t] * t / run; } let bestT = 0, bestV = 1; for (let t = TMIN; t < TMAX; t++) if (cm[t] < bestV) { bestV = cm[t]; bestT = t; } if (bestV > 0.2) return 0; const a = cm[bestT - 1], b = cm[bestT], c = cm[bestT + 1]; const den = a - 2 * b + c; return SR / (den ? bestT + 0.5 * (a - c) / den : bestT); }
const sents = []; let cur = null; for (const w of words) { if (!cur) cur = { s: w.s, e: w.e, t: "" }; cur.e = w.e; cur.t += (cur.t ? " " : "") + w.w.trim(); if (/[.!?]$/.test(w.w.trim())) { sents.push(cur); cur = null; } } if (cur) sents.push(cur);
const out = sents.map((s) => { let lo = 0, hi = 0; for (let o = Math.floor(s.s * SR); o + Wn + TMAX < Math.min(s.e * SR, x.length); o += 320) { const f = yin(o); if (!f) continue; if (f >= 90 && f < 150) lo++; else if (f >= 190 && f <= 270) hi++; } const tot = lo + hi; const lab = tot < 6 ? "?" : hi > lo * 1.2 ? "F" : lo > hi * 1.2 ? "M" : "?"; return { ...s, lo, hi, lab }; });
// fill '?' from neighbours only when both neighbours agree
out.forEach((o, i) => { if (o.lab === "?" && i > 0 && i < out.length - 1 && out[i - 1].lab === out[i + 1].lab && out[i - 1].lab !== "?") o.fill = out[i - 1].lab; });
for (const o of out) console.log(`${o.s.toFixed(0).padStart(3)} ${(o.fill ? o.fill.toLowerCase() : o.lab)} lo${String(o.lo).padStart(3)} hi${String(o.hi).padStart(3)}  ${(process.env.FULL ? o.t : o.t.slice(0, 88))}`);

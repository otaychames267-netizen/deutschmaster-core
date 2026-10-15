import fs from "node:fs";
import { loadClip, mfcc } from "./fp-lib.mjs";
const sp = JSON.parse(fs.readFileSync("tag-spans-valid.json", "utf8"));
const cuts = JSON.parse(fs.readFileSync("cuts.json", "utf8"));
const items = [];
for (const [p, v] of Object.entries(sp)) for (const s of v.spans) items.push({ p, s: s.s, e: s.e, text: s.text, m: mfcc(loadClip("../hoeren/" + p, Math.max(0, s.s - 0.05), s.e + 0.05), false) });
function dtw(a, b) { const n = a.length, m = b.length; let prev = new Float64Array(m + 1).fill(Infinity), cur = new Float64Array(m + 1); let pl = new Float64Array(m + 1), cl = new Float64Array(m + 1); prev[0] = 0;
  for (let i = 1; i <= n; i++) { cur[0] = Infinity; for (let j = 1; j <= m; j++) { let s = 0; for (let k = 0; k < 12; k++) { const q = a[i - 1][k] - b[j - 1][k]; s += q * q; } const c = Math.sqrt(s); let best = prev[j - 1], bl = pl[j - 1]; if (prev[j] < best) { best = prev[j]; bl = pl[j]; } if (cur[j - 1] < best) { best = cur[j - 1]; bl = cl[j - 1]; } cur[j] = c + best; cl[j] = bl + 1; } [prev, cur] = [cur, prev]; [pl, cl] = [cl, pl]; } return prev[m] / pl[m]; }
const n = items.length; const D = Array.from({ length: n }, () => new Float64Array(n));
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = dtw(items[i].m, items[j].m); D[i][j] = D[j][i] = d; }
// single-link clustering at threshold
const TH = Number(process.argv[2] ?? 14); const par = [...Array(n).keys()]; const f = (x) => (par[x] === x ? x : (par[x] = f(par[x])));
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (D[i][j] < TH) par[f(i)] = f(j);
const groups = {}; for (let i = 0; i < n; i++) (groups[f(i)] ??= []).push(i);
const out = Object.values(groups).sort((a, b) => b.length - a.length);
console.log(n, "spans ->", out.length, "clusters @", TH);
for (const g of out) { const rep = g.map((i) => ({ i, avg: g.reduce((s, j) => s + (i === j ? 0 : D[i][j]), 0) / Math.max(1, g.length - 1) })).sort((a, b) => a.avg - b.avg)[0]; const it = items[rep.i]; const durs = g.map((i) => items[i].e - items[i].s); console.log(`size ${String(g.length).padStart(2)} rep ${it.p.replace("clean/", "")} [${it.s}-${it.e}] «${it.text}» avgD=${rep.avg.toFixed(1)} dur ${Math.min(...durs).toFixed(1)}-${Math.max(...durs).toFixed(1)}`); }
fs.writeFileSync("fp-clusters.json", JSON.stringify(out.map((g) => ({ members: g.map((i) => ({ p: items[i].p, s: items[i].s, e: items[i].e, text: items[i].text })), rep: (() => { const r = g.map((i) => ({ i, avg: g.reduce((s, j) => s + (i === j ? 0 : D[i][j]), 0) / Math.max(1, g.length - 1) })).sort((a, b) => a.avg - b.avg)[0].i; return { p: items[r].p, s: items[r].s, e: items[r].e }; })() }))));
process.exit(0);

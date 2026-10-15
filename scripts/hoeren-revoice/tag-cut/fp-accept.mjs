// groups fingerprint hits (<= TH) into tag spans: usage node fp-accept.mjs <prefix> <nparts> <TH> -> prints accepted spans per file
import fs from "node:fs";
const [prefix, nparts, th = "15"] = process.argv.slice(2); const rows = JSON.parse(fs.readFileSync("rest.json", "utf8"));
const all = {}; for (let i = 0; i < Number(nparts); i++) { const f = `${prefix}-${i}.json`; if (fs.existsSync(f)) Object.assign(all, JSON.parse(fs.readFileSync(f, "utf8"))); }
const out = {};
for (const [p, v] of Object.entries(all)) {
  const hs = v.hits.filter((h) => h.cost <= Number(th)).sort((a, b) => a.cost - b.cost); const groups = [];
  for (const h of hs) { const g = groups.find((g) => Math.min(g.e, h.e) - Math.max(g.s, h.s) > 0.5 * Math.min(g.e - g.s, h.e - h.s)); if (g) { g.hits.push(h); } else groups.push({ s: h.s, e: h.e, cost: h.cost, hits: [h] }); }
  for (const g of groups) { // union of overlapping hits is risky (warped); use the best-cost hit, extend only to a clearly longer low-cost hit
    const best = g.hits[0]; g.s = best.s; g.e = best.e; g.cost = best.cost; }
  groups.sort((a, b) => a.s - b.s); out[p] = { dur: v.dur, spans: groups.map((g) => ({ s: g.s, e: g.e, cost: g.cost, n: g.hits.length })) };
}
fs.writeFileSync(`${prefix}-accepted.json`, JSON.stringify(out));
for (const [p, v] of Object.entries(out)) console.log(`${p.replace("clean/", "").padEnd(46)} ${v.spans.map((s) => `[${s.s}-${s.e} c${s.cost}]`).join(" ") || "-"}`);

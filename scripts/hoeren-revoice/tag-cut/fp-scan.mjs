// ASR-free tag finder: subsequence-DTW of every known tag phrase (cluster representatives) over the whole file.
// usage: node fp-scan.mjs <paths.json> <out.json> [part nparts]   -> { path: { dur, hits:[{s,e,cost,ref}] } }
import fs from "node:fs";
import { loadClip, mfcc, subseqDTW } from "./fp-lib.mjs";
const [pj, outf, part = "0", nparts = "1"] = process.argv.slice(2);
const paths = JSON.parse(fs.readFileSync(pj, "utf8")).filter((_, i) => i % Number(nparts) === Number(part));
const clusters = JSON.parse(fs.readFileSync("fp-clusters.json", "utf8"));
const refs = clusters.map((c, i) => ({ id: i, text: c.members[0].text, n: c.members.length, m: mfcc(loadClip("../hoeren/" + c.rep.p, Math.max(0, c.rep.s - 0.05), c.rep.e + 0.05), false) }));
const TH = Number(process.env.TH ?? 22);
const res = fs.existsSync(outf) ? JSON.parse(fs.readFileSync(outf, "utf8")) : {};
for (const p of paths) {
  if (res[p]) continue;
  const x = loadClip((process.env.FPBASE ?? "../hoeren/") + p); const t = mfcc(x, false); const hits = [];
  for (const r of refs) { const { cost, start } = subseqDTW(r.m, t);
    for (let i = 0; i < cost.length; i++) { if (cost[i] > TH) continue; const dfr = i + 2 - start[i]; if (dfr < 0.72 * r.m.length || dfr > 1.38 * r.m.length) continue; let isMin = true; for (let k = Math.max(0, i - 100); k <= Math.min(cost.length - 1, i + 100); k++) if (k < i ? cost[k] <= cost[i] : cost[k] < cost[i]) { isMin = false; break; } if (isMin) hits.push({ s: +(start[i] / 100).toFixed(2), e: +((i + 1) / 100 + 0.04).toFixed(2), cost: +cost[i].toFixed(1), ref: r.id }); } }
  hits.sort((a, b) => a.s - b.s); res[p] = { dur: x.length / 16000, hits }; fs.writeFileSync(outf, JSON.stringify(res));
  console.log(`${p.replace("clean/", "").padEnd(46)} ${hits.map((h) => `[${h.s}-${h.e} c${h.cost} r${h.ref}]`).join(" ") || "no hits"}`);
}
process.exit(0);

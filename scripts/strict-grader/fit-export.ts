/**
 * Fits the strict free grader's calibrator against Claude Sonnet 5's grades and writes src/lib/grading/strict-free/calibration.json.
 *   bun run scripts/strict-grader/fit-export.ts --gradings claude-gradings.json --obs obs/gemini-3.1-flash-lite[,obs/other-model] [--out calibration.json] [--lambda 12]
 * Prints 10-fold cross-validation (grouped by TASK, so a task never appears in both train and test) before the final fit on everything.
 * claude-gradings.json = rows of essay_gradings (model = 'claude-sonnet-5') joined with exam_items.content / exams.metadata (see README).
 */
import fs from "node:fs";
import { buildFeatures, type ObservationSheet } from "../../src/lib/grading/strict-free/features";
import { fitRidge, predictRidge, type Calibration } from "../../src/lib/grading/strict-free/ridge";
import { applyExaminerRules } from "../../src/lib/grading/strict-free/rules";

const arg = (n: string, d?: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const gradings = JSON.parse(fs.readFileSync(arg("gradings", "claude-gradings.json")!, "utf8")) as any[];
const byId = new Map(gradings.map((r) => [r.id, r]));
const dirs = (arg("obs", "obs/gemini-3.1-flash-lite") as string).split(",");
const lambda = Number(arg("lambda", "12"));
const out = arg("out", "src/lib/grading/strict-free/calibration.json")!;

interface Row { obs: ObservationSheet; id: string; task: string; model: string; f: Record<string, number>; y: { ta: number; cd: number; fa: number; total: number } }
const rows: Row[] = [];
for (const dir of dirs) for (const file of fs.readdirSync(dir)) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf8")) as { id: string; obs: ObservationSheet };
  const r = byId.get(j.id); if (!r) continue;
  const { f } = buildFeatures(r.essay_text, j.obs, r.word_count, r.metadata?.category);
  rows.push({ obs: j.obs, id: j.id, task: r.exam_item_id ?? j.id, model: dir.split("/").pop()!, f, y: { ta: r.ta, cd: r.cd, fa: r.fa, total: r.total } });
}
const keys = Object.keys(rows[0].f);
console.log(`${rows.length} observation sheets (${dirs.length} model(s)), ${keys.length} features, lambda ${lambda}`);
const X = rows.map((r) => keys.map((k) => r.f[k]));

// ---- grouped CV
const tasks = [...new Set(rows.map((r) => r.task))]; let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; tasks.sort(() => rnd() - 0.5);
const fold = new Map(tasks.map((t, i) => [t, i % 10]));
const pred = { ta: [] as number[], cd: [] as number[], fa: [] as number[] };
for (let k = 0; k < 10; k++) {
  const tr = rows.map((_, i) => i).filter((i) => fold.get(rows[i].task) !== k), te = rows.map((_, i) => i).filter((i) => fold.get(rows[i].task) === k);
  for (const t of ["ta", "cd", "fa"] as const) { const m = fitRidge(tr.map((i) => X[i]), tr.map((i) => rows[i].y[t]), lambda); for (const i of te) pred[t][i] = predictRidge(m, X[i]); }
}
const clamp = (v: number) => Math.max(0, Math.min(15, Math.round(v)));
const withRules = process.argv.includes("--rules");
const tot = rows.map((r, i) => { const base = { ta: clamp(pred.ta[i]), cd: clamp(pred.cd[i]), fa: clamp(pred.fa[i]) }; const rr = withRules ? applyExaminerRules(base, r.obs) : { scores: base, rule: null as string | null }; if (process.env.ONLY_RULE && rr.rule !== process.env.ONLY_RULE) return base.ta + base.cd + base.fa; const q = rr.scores; return q.ta + q.cd + q.fa; });
const err = tot.map((v, i) => v - rows[i].y.total);
const mae = err.reduce((s, v) => s + Math.abs(v), 0) / err.length;
const bias = err.reduce((s, v) => s + v, 0) / err.length;
const w3 = err.filter((v) => Math.abs(v) <= 3).length / err.length;
const pass = tot.filter((v, i) => (v >= 27) === (rows[i].y.total >= 27)).length / tot.length;
console.log(`${withRules ? "WITH examiner rules" : "no rules"}: unseen-task CV  total MAE ${mae.toFixed(2)}/45 | bias ${bias.toFixed(2)} | within ±3: ${(w3 * 100).toFixed(0)}% | pass/fail agreement: ${(pass * 100).toFixed(0)}%`);
for (const m of [...new Set(rows.map((r) => r.model))]) { const idx = rows.map((_, i) => i).filter((i) => rows[i].model === m); console.log(`  ${m}: MAE ${(idx.reduce((s, i) => s + Math.abs(err[i]), 0) / idx.length).toFixed(2)} bias ${(idx.reduce((s, i) => s + err[i], 0) / idx.length).toFixed(2)} (n=${idx.length})`); }

// ---- final fit
const cal: Calibration = { version: 1, keys, lambda, trainedOn: `claude-sonnet-5 x ${new Set(rows.map((r) => r.id)).size} essays; observers: ${dirs.map((d) => d.split("/").pop()).join(", ")}; unseen-task CV total MAE ${mae.toFixed(2)}`, models: { ta: fitRidge(X, rows.map((r) => r.y.ta), lambda), cd: fitRidge(X, rows.map((r) => r.y.cd), lambda), fa: fitRidge(X, rows.map((r) => r.y.fa), lambda) } };
fs.mkdirSync(out.replace(/[^/\\]+$/, "") || ".", { recursive: true });
fs.writeFileSync(out, JSON.stringify(cal));
console.log(`wrote ${out}`);

// per-rule effect (only meaningful with --rules)
if (withRules) { const clampS = (i: number) => ({ ta: clamp(pred.ta[i]), cd: clamp(pred.cd[i]), fa: clamp(pred.fa[i]) }); const by: Record<string, { n: number; before: number; after: number }> = {}; rows.forEach((r, i) => { const b = clampS(i); const rr = applyExaminerRules(b, r.obs); const k = rr.rule ?? "none"; const e = (by[k] ??= { n: 0, before: 0, after: 0 }); e.n++; e.before += Math.abs(b.ta + b.cd + b.fa - r.y.total); e.after += Math.abs(rr.scores.ta + rr.scores.cd + rr.scores.fa - r.y.total); }); for (const [k, e] of Object.entries(by)) console.log(`  rule ${k.padEnd(20)} n=${String(e.n).padStart(3)}  MAE before ${(e.before / e.n).toFixed(2)} -> after ${(e.after / e.n).toFixed(2)}`); }

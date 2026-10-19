/** Sprachbausteine Teil 1 importer. Reads a JSON array of transcribed exercises
 * and inserts into sb_exercises / sb_t1_passages / sb_t1_gaps. Idempotent by title
 * (skips an exercise whose title already exists for teil=1), so it can be run
 * incrementally per batch. Validates shape before writing. --apply to write.
 *
 * Data file format (array):
 *   { "title": "...", "passage": "text with {{21}}..{{30}} gap markers",
 *     "gaps": [ { "n":21, "a":"...", "b":"...", "c":"...", "correct":"a" }, ... ] }
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const APPLY = process.argv.includes("--apply");
const FILE = process.argv[2];
if (!FILE) { console.error("usage: bun scripts/sb-t1-import.mjs <data.json> [--apply]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const data = JSON.parse(readFileSync(FILE, "utf8"));
if (!Array.isArray(data)) throw new Error("data must be an array");

// ---- validate every exercise before touching the DB ----
const errs = [];
for (const [i, ex] of data.entries()) {
  const tag = `#${i} "${ex.title || "?"}"`;
  if (!ex.title) errs.push(`${tag}: missing title`);
  if (!ex.passage) errs.push(`${tag}: missing passage`);
  if (!Array.isArray(ex.gaps) || ex.gaps.length !== 10) errs.push(`${tag}: expected 10 gaps, got ${ex.gaps?.length}`);
  const nums = new Set();
  for (const g of ex.gaps || []) {
    if (typeof g.n !== "number") errs.push(`${tag}: gap missing numeric n`);
    if (!["a", "b", "c"].includes(g.correct)) errs.push(`${tag} gap ${g.n}: correct must be a|b|c (got ${g.correct})`);
    if (!g.a || !g.b || !g.c) errs.push(`${tag} gap ${g.n}: all three options required`);
    nums.add(g.n);
    if (!ex.passage.includes(`{{${g.n}}}`)) errs.push(`${tag}: passage missing marker {{${g.n}}}`);
  }
  // markers present in passage must all have a gap
  for (const m of (ex.passage.match(/\{\{(\d+)\}\}/g) || [])) { const n = +m.slice(2, -2); if (!nums.has(n)) errs.push(`${tag}: marker ${m} has no gap def`); }
}
if (errs.length) { console.error("VALIDATION FAILED:\n" + errs.join("\n")); process.exit(1); }
console.log(`Validated ${data.length} exercise(s), all well-formed.`);

// ---- idempotency: which titles already exist ----
const existing = new Set((await q(`select title from sb_exercises where teil=1;`)).map(r => r.title));
const todo = data.filter(ex => !existing.has(ex.title));
console.log(`${data.length - todo.length} already imported (skipped); ${todo.length} to insert.`);
if (!APPLY) { console.log("(dry run — re-run with --apply)"); process.exit(0); }

for (const ex of todo) {
  const ins = await q(`insert into sb_exercises (title, teil, source_pdf, created_by) values (${S(ex.title)}, 1, ${S("Sprach 1 mit antwort final 2025-2.pdf")}, '${CREATED_BY}') returning id;`);
  const id = ins[0].id;
  await q(`insert into sb_t1_passages (exercise_id, title, passage) values ('${id}', ${S(ex.title)}, ${S(ex.passage)});`);
  const vals = ex.gaps.map(g => `('${id}',${g.n},${S(g.a)},${S(g.b)},${S(g.c)},'${g.correct}')`).join(",");
  await q(`insert into sb_t1_gaps (exercise_id, gap_number, option_a, option_b, option_c, correct) values ${vals};`);
  console.log(`  + ${ex.title}`);
}
console.log(`APPLIED: inserted ${todo.length} Teil 1 exercise(s).`);

/** Insert ONE Sprachbausteine Teil 1 exercise from a faithful, manually-transcribed
 * JSON file. Text is base64-encoded to avoid any escaping/encoding corruption.
 * Validates the passage/gap consistency before writing. --apply to write.
 *
 * Data file format:
 *   {
 *     "title": "Altes Handwerk",
 *     "level": "B2",
 *     "source_pdf": "Sprach 1 mit antwort final 2025-2.pdf",
 *     "instructions": "Lesen Sie den folgenden Text …",
 *     "passage": "Liebe Agnieszka,\n\njetzt ist … {{21}}, dass …",   // gap markers {{n}}
 *     "gaps": [ {"n":21,"a":"her","b":"hin","c":"vorbei","correct":"a"}, … ]
 *   }
 *
 * Two-part correlative options (e.g. "zwar… aber") occupy TWO {{n}} tokens sharing the
 * same gap number — that is allowed and expected; the option text keeps the "…".
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: bun scripts/sb-t1-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
// sb_exercises.level must be "TELC_B1"/"TELC_B2" — matches lesen_exercises/exams
// convention. Normalizes bare "B1"/"B2" (an older, now-abandoned convention) too.
function normalizeLevel(raw) {
  const v = (raw || "TELC_B2").toUpperCase();
  if (v === "B1" || v === "TELC_B1") return "TELC_B1";
  return "TELC_B2";
}
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (!d.title) errs.push("title required");
if (!d.passage) errs.push("passage required");
if (!Array.isArray(d.gaps) || !d.gaps.length) errs.push("gaps required");

// gap numbers referenced in the passage
const markerNums = [...(d.passage || "").matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
const markerSet = new Set(markerNums);
const gapNums = new Set();
for (const g of d.gaps || []) {
  if (typeof g.n !== "number") { errs.push(`gap missing numeric n: ${JSON.stringify(g)}`); continue; }
  if (gapNums.has(g.n)) errs.push(`duplicate gap n=${g.n}`);
  gapNums.add(g.n);
  for (const k of ["a", "b", "c"]) if (!g[k] || !String(g[k]).trim()) errs.push(`gap ${g.n}: option ${k} empty`);
  if (!["a", "b", "c"].includes(g.correct)) errs.push(`gap ${g.n}: correct must be a|b|c (got ${g.correct})`);
  if (g.a === g.b || g.a === g.c || g.b === g.c) errs.push(`gap ${g.n}: duplicate option text`);
  if (!markerSet.has(g.n)) errs.push(`gap ${g.n}: no {{${g.n}}} marker in passage`);
}
for (const n of markerSet) if (!gapNums.has(n)) errs.push(`passage marker {{${n}}} has no gap definition`);

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }

const sortedGaps = [...d.gaps].sort((a, b) => a.n - b.n);
console.log(`OK: "${d.title}" (position ${d.position}) — ${sortedGaps.length} gaps [${sortedGaps.map(g => g.n).join(",")}], markers used: ${markerNums.length} (two-part: ${markerNums.length - markerSet.size})`);
console.log("Answer key:", sortedGaps.map(g => `${g.n}${g.correct.toUpperCase()}`).join(" "));

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from sb_exercises where teil=1 and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`Exercise titled "${d.title}" already exists (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

if (typeof d.position !== "number") { console.error("position (number) required — PDF page/sequence order"); process.exit(1); }
const ins = await q(`insert into sb_exercises (title, teil, level, source_pdf, import_notes, position)
  values (${S(d.title)}, 1, ${S(normalizeLevel(d.level))}, ${S(d.source_pdf || "")}, ${S(d.import_notes || "manual PDF transcription")}, ${d.position})
  returning id;`);
const exId = ins[0].id;
await q(`insert into sb_t1_passages (exercise_id, title, instructions, passage)
  values ('${exId}', ${S(d.title)}, ${S(d.instructions || "")}, ${S(d.passage)});`);
const values = sortedGaps.map(g => `('${exId}', ${g.n}, ${S(g.a)}, ${S(g.b)}, ${S(g.c)}, '${g.correct}')`).join(",\n");
await q(`insert into sb_t1_gaps (exercise_id, gap_number, option_a, option_b, option_c, correct) values\n${values};`);
console.log(`\nInserted exercise ${exId} with ${sortedGaps.length} gaps.`);

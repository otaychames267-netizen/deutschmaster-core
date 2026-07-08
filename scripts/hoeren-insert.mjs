/** Insert ONE Hören exercise (Richtig/Falsch statements about a short spoken text)
 * from a faithful, manually-transcribed JSON file. Text is base64-encoded to avoid
 * any escaping/encoding corruption. Audio is NOT handled here (Phase 1).
 * --apply to write; dry run otherwise.
 *
 * Data file format:
 *   {
 *     "title": "…",                     // e.g. "Lufthansa"
 *     "teil": 1,                          // 1, 2, or 3
 *     "level": "B2",
 *     "position": 1,                       // official PDF/source order within its Teil
 *     "source_pdf": "DOC-20260516-WA0005..pdf",
 *     "version_tag": "اساسي" | "معدل" | null,
 *     "variant_group": "…" | null,
 *     "notes": "…",
 *     "instructions": "Sie hören nun eine Nachrichtensendung. …",
 *     "image_path": "hoeren/teil-1/lufthansa.png" | null,   // object path in the hoeren-images bucket (upload separately)
 *     "statements": [
 *       { "number": 41, "text": "Die Deutsche Lufthansa hat ihre Führungsposition verloren.", "correct": false },
 *       ...
 *     ]
 *   }
 *
 * Rules enforced:
 *   - statements[] non-empty, each has a unique number, non-empty text, boolean correct
 *   - teil is 1, 2, or 3
 *   - duplicate title within the same teil is blocked unless --force
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: node scripts/hoeren-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (!d.title) errs.push("title required");
if (![1, 2, 3].includes(d.teil)) errs.push("teil must be 1, 2, or 3");
if (typeof d.position !== "number") errs.push("position (number) required");
if (!Array.isArray(d.statements) || !d.statements.length) errs.push("statements[] required");

const numbers = new Set();
for (const s of d.statements || []) {
  if (typeof s.number !== "number") errs.push(`statement missing a numeric "number": ${JSON.stringify(s)}`);
  if (numbers.has(s.number)) errs.push(`duplicate statement number ${s.number}`);
  numbers.add(s.number);
  if (!s.text || !String(s.text).trim()) errs.push(`statement ${s.number} missing text`);
  if (typeof s.correct !== "boolean") errs.push(`statement ${s.number}: "correct" must be true or false`);
}

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }

const stmts = [...d.statements].sort((a, b) => a.number - b.number);
console.log(`OK: "${d.title}" (Teil ${d.teil}, position ${d.position}) — ${stmts.length} statements`);
console.log("Answer key:", stmts.map((s) => `${s.number}=${s.correct ? "Richtig" : "Falsch"}`).join("  "));

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from hoeren_exercises where teil=${d.teil} and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`Exercise titled "${d.title}" already exists in Hören Teil ${d.teil} (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

const ins = await q(`insert into hoeren_exercises (title, teil, level, image_path, instructions, source_pdf, import_notes, position, version_tag, variant_group)
  values (${S(d.title)}, ${d.teil}, ${S(d.level || "B2")}, ${d.image_path ? S(d.image_path) : "NULL"}, ${S(d.instructions || "")}, ${S(d.source_pdf || "")}, ${S(d.notes || "manual PDF transcription")}, ${d.position}, ${d.version_tag ? S(d.version_tag) : "NULL"}, ${d.variant_group ? S(d.variant_group) : "NULL"})
  returning id;`);
const exId = ins[0].id;
const stmtValues = stmts.map((s) => `('${exId}', ${s.number}, ${S(String(s.text))}, ${s.correct})`).join(",\n");
await q(`insert into hoeren_statements (exercise_id, statement_number, statement_text, correct_answer) values\n${stmtValues};`);
console.log(`\nInserted exercise ${exId}: ${stmts.length} statements.`);

/** Insert ONE Schreiben writing-prompt exercise into the generic exams/exam_items
 * tables (the schema the existing /schreiben/beschwerde route already reads from).
 * --apply to write; dry run otherwise.
 *
 * Data file format:
 *   {
 *     "title": "…",
 *     "section": "schreiben",
 *     "category": "beschwerde",           // maps to metadata.category, informational only
 *     "level": "B2",
 *     "position": 1,
 *     "source_pdf": "Schreiben.B2.NEU.MAY.2026.pdf",
 *     "task": "…",                        // full prompt text shown to the student
 *     "min_words": 180,
 *     "max_words": 220
 *   }
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: node scripts/schreiben-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (!d.title) errs.push("title required");
if (d.section !== "schreiben") errs.push("section must be 'schreiben'");
if (!["TELC_B1", "TELC_B2"].includes(d.level)) errs.push("level must be TELC_B1 or TELC_B2");
if (typeof d.position !== "number") errs.push("position (number) required");
if (!d.task || !String(d.task).trim()) errs.push("task text required");
if (!/Aufgabe/.test(d.task || "")) errs.push("task text missing 'Aufgabe' block — looks incomplete");
if (!/•/.test(d.task || "")) errs.push("task text has no bullet points — looks incomplete");
if (typeof d.min_words !== "number" || typeof d.max_words !== "number") errs.push("min_words/max_words (numbers) required");

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }

console.log(`OK: "${d.title}" (${d.section}/${d.category}, ${d.level}, position ${d.position}) — ${d.task.length} chars`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from public.exams where section='schreiben' and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`Exercise titled "${d.title}" already exists in Schreiben (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

const metadata = JSON.stringify({ category: d.category ?? null, estimated_minutes: 30, difficulty: "Standard" });
const ins = await q(`insert into public.exams (title, level, module, section, teil, exam_type, status, display_order, metadata)
  values (${S(d.title)}, '${d.level}', 'schriftlich', 'schreiben', NULL, 'vorbereitung', 'published', ${d.position}, '${metadata}'::jsonb)
  returning id;`);
const examId = ins[0].id;

const content = JSON.stringify({ task: d.task, min_words: d.min_words, max_words: d.max_words });
await q(`insert into public.exam_items (exam_id, position, kind, content, points)
  values ('${examId}', 1, 'writing_prompt', '${content.replace(/'/g, "''")}'::jsonb, 10);`);

console.log(`\nInserted exam ${examId}: 1 writing_prompt item.`);

/** Insert ONE Sprachbausteine Teil 2 exercise (Lückentext mit gemeinsamer Wortliste)
 * from a faithful, manually-transcribed JSON file. Text is base64-encoded to avoid any
 * escaping/encoding corruption. Enforces the §6–8 verification rules before writing.
 * --apply to write; dry run otherwise.
 *
 * Data file format:
 *   {
 *     "title": "…",                       // = exercise heading / addressee etc.
 *     "level": "B2",
 *     "position": 1,                       // official PDF page/sequence order
 *     "source_pdf": "sprachbausteine teil 2.pdf",
 *     "version_tag": "اساسي" | "معدل" | null,     // optional print-variant tag
 *     "variant_group": "…" | null,          // optional: groups variants of one base
 *     "notes": "…",                         // optional import notes
 *     "instructions": "Lesen Sie den folgenden Text …",
 *     "passage": "… {{31}} … {{40}} …",     // gap markers {{n}} inline in the text
 *     "words": ["AB","ABER","AM", …],       // shared word list (MORE than gaps: distractors)
 *     "answers": { "31": "AB", "32": "ABER", … }   // gap_number → correct word (must be in words)
 *   }
 *
 * Rules enforced (spec §7 variants / §8 verification):
 *   - every {{n}} marker has exactly one answer and vice-versa
 *   - each gap appears once (no repeated {{n}})
 *   - each correct answer is present in the shared word list
 *   - word list has no duplicates and contains strictly MORE words than gaps
 *   - duplicate title in teil=2 is blocked (variant must differ) unless --force
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: node scripts/sb-t2-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (!d.title) errs.push("title required");
if (!d.passage) errs.push("passage required");
if (!Array.isArray(d.words) || !d.words.length) errs.push("words[] required");
if (!d.answers || typeof d.answers !== "object") errs.push("answers{} required");
if (typeof d.position !== "number") errs.push("position (number) required");

// gap markers referenced in the passage
const markerNums = [...(d.passage || "").matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
const markerSet = new Set(markerNums);
if (markerNums.length !== markerSet.size) errs.push(`passage repeats a gap marker (${markerNums.length} markers, ${markerSet.size} unique) — Teil 2 gaps must be unique`);

// word list integrity
const words = (d.words || []).map((w) => String(w));
const wordSet = new Set(words);
if (wordSet.size !== words.length) errs.push("words[] contains duplicates");

// answers integrity
const answerGaps = Object.keys(d.answers || {}).map(Number);
const answerSet = new Set(answerGaps);
for (const n of markerSet) if (!answerSet.has(n)) errs.push(`gap {{${n}}} has no answer`);
for (const n of answerGaps) if (!markerSet.has(n)) errs.push(`answer for gap ${n} has no {{${n}}} marker`);
for (const [n, w] of Object.entries(d.answers || {})) {
  if (!wordSet.has(String(w))) errs.push(`answer ${n}="${w}" is not in the word list`);
}

// distractors: TELC Teil 2 always offers more words than gaps
if (words.length && markerSet.size && words.length <= markerSet.size) {
  errs.push(`word list (${words.length}) must be larger than gap count (${markerSet.size}) — distractors expected`);
}

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }

const gapList = [...markerSet].sort((a, b) => a - b);
console.log(`OK: "${d.title}" (position ${d.position}) — ${gapList.length} gaps [${gapList.join(",")}], ${words.length} words (${words.length - gapList.length} distractors)`);
console.log("Answer key:", gapList.map((n) => `${n}=${d.answers[n] ?? d.answers[String(n)]}`).join("  "));

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from sb_exercises where teil=2 and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`Exercise titled "${d.title}" already exists in teil 2 (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

const ins = await q(`insert into sb_exercises (title, teil, level, source_pdf, import_notes, position, version_tag, variant_group)
  values (${S(d.title)}, 2, ${S(d.level || "B2")}, ${S(d.source_pdf || "")}, ${S(d.notes || "manual PDF transcription")}, ${d.position}, ${d.version_tag ? S(d.version_tag) : "NULL"}, ${d.variant_group ? S(d.variant_group) : "NULL"})
  returning id;`);
const exId = ins[0].id;
await q(`insert into sb_t2_passages (exercise_id, title, instructions, passage)
  values ('${exId}', ${S(d.title)}, ${S(d.instructions || "")}, ${S(d.passage)});`);
const wordValues = words.map((w, i) => `('${exId}', ${i + 1}, ${S(w)})`).join(",\n");
await q(`insert into sb_t2_words (exercise_id, word_number, word) values\n${wordValues};`);
const gapValues = gapList.map((n) => `('${exId}', ${n}, ${S(String(d.answers[n] ?? d.answers[String(n)]))})`).join(",\n");
await q(`insert into sb_t2_gaps (exercise_id, gap_number, correct_word) values\n${gapValues};`);
console.log(`\nInserted exercise ${exId}: ${gapList.length} gaps, ${words.length} words.`);

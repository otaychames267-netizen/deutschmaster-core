/** Insert ONE new Lesen Teil 3 exercise (10 situations 11-20 + up to 12 info-texts A-L)
 * from a faithful, manually-transcribed JSON file. Text is base64-encoded to avoid any
 * escaping/encoding corruption. --apply to write; dry run otherwise.
 *
 * Data file format:
 *   {
 *     "title": "Lesen Teil 3 — Übung 39",
 *     "source_pdf": "lesen teil 3.pdf",
 *     "import_notes": "…",
 *     "key": "IJEFXKXDCB",                      // 10 chars, one per situation 11-20; X = keine Lösung
 *     "situations": { "11": "…", …, "20": "…" },
 *     "texts": { "A": {"title":"…","content":"…"}, … }   // only letters that really exist in the source
 *   }
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: node scripts/t3-batch2-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (!d.title) errs.push("title required");
if (!d.key || d.key.length !== 10) errs.push("key must be exactly 10 characters (situations 11-20)");
for (const c of d.key || "") if (!/[A-LX]/.test(c)) errs.push(`invalid key letter '${c}' (must be A-L or X)`);
for (let n = 11; n <= 20; n++) {
  const s = d.situations?.[String(n)];
  if (!s || !s.trim()) errs.push(`situation ${n} missing`);
}
const textLetters = new Set(Object.keys(d.texts || {}));
for (const L of textLetters) {
  if (!/^[A-L]$/.test(L)) errs.push(`invalid text letter '${L}'`);
  if (!d.texts[L].content || !d.texts[L].content.trim()) errs.push(`text ${L}: content empty`);
}
for (let i = 0; i < (d.key || "").length; i++) {
  const c = d.key[i];
  if (c !== "X" && !textLetters.has(c)) errs.push(`key assigns ${11 + i}→${c} but text ${c} does not exist`);
}
// each non-X letter may be used only once (TELC rule: jeden Info-Text nur einmal verwenden)
const used = [...(d.key || "")].filter((c) => c !== "X");
if (new Set(used).size !== used.length) errs.push("key reuses a letter — each Info-Text may match only once");

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }

console.log(`OK: "${d.title}" — key ${d.key}, ${textLetters.size} texts [${[...textLetters].sort().join("")}]`);
for (let n = 11; n <= 20; n++) console.log(`  ${n} -> ${d.key[n - 11]}  ${d.situations[String(n)].slice(0, 60)}`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from lesen_exercises where teil=3 and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`Exercise titled "${d.title}" already exists (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

const ins = await q(`insert into lesen_exercises (title, teil, source_pdf, import_notes, created_by)
  values (${S(d.title)}, 3, ${S(d.source_pdf || "")}, ${S(d.import_notes || "manual PDF transcription")}, '${CREATED_BY}') returning id;`);
const id = ins[0].id;

const sitVals = [];
for (let n = 11; n <= 20; n++) {
  const letter = d.key[n - 11]; const nm = letter === "X"; const cl = nm ? "null" : `'${letter}'`;
  sitVals.push(`('${id}',${n},${S(d.situations[String(n)])},${cl},${nm})`);
}
const txtVals = [...textLetters].sort().map((L) => `('${id}','${L}',${S(d.texts[L].title || "")},${S(d.texts[L].content)})`);
await q(`insert into lesen_t3_situations (exercise_id,number,description,correct_letter,no_match) values ${sitVals.join(",")};
         insert into lesen_t3_texts (exercise_id,letter,title,content) values ${txtVals.join(",")};`);
console.log(`\nInserted exercise ${id}: 10 situations, ${textLetters.size} texts, key ${d.key}.`);

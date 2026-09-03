/** Insert ONE Lesen exercise (Teil 1, 2, or 3) with an explicit `level` from a
 * faithful, manually-transcribed JSON file. Bypasses import_lesen_t1/t2_exercise_admin
 * because those RPCs never set `level` (column default is 'TELC_B2') — needed for the
 * platform's first non-B2 Lesen content. Reuses the same validation rules as those RPCs
 * and as t3-batch2-insert.mjs. --apply to write; dry run otherwise.
 *
 * Data file shapes — see 01-lesen-t1-disco.json / 02-lesen-t2-leipzigerin.json /
 * 03-lesen-t3-wien.json in backups/b1-modelltest1/ for real examples.
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: node scripts/b1-lesen-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (!d.title) errs.push("title required");
if (![1, 2, 3].includes(d.teil)) errs.push("teil must be 1, 2, or 3");
if (!d.level) errs.push("level required");

if (d.teil === 1) {
  const hs = Array.isArray(d.headlines) ? d.headlines : [];
  const ts = Array.isArray(d.texts) ? d.texts : [];
  if (hs.length !== 10) errs.push(`${hs.length}/10 headlines`);
  const letters = new Set(); let distractors = 0;
  hs.forEach((h) => {
    const l = (h.letter || "").toUpperCase();
    if (!/^[A-J]$/.test(l)) errs.push(`bad headline letter "${h.letter}"`);
    if (letters.has(l)) errs.push(`duplicate headline ${l}`);
    letters.add(l);
    if (!h.text?.trim()) errs.push(`headline ${l} empty`);
    if (h.is_distractor) distractors++;
  });
  if (hs.length === 10 && distractors !== 5) errs.push(`${distractors}/5 distractors`);
  if (ts.length !== 5) errs.push(`${ts.length}/5 texts`);
  const used = new Set();
  ts.forEach((t) => {
    if (![1, 2, 3, 4, 5].includes(t.position)) errs.push(`bad text position ${t.position}`);
    if (!t.content?.trim()) errs.push(`text ${t.position} empty`);
    const c = (t.correct_headline || "").toUpperCase();
    if (!/^[A-J]$/.test(c)) errs.push(`text ${t.position} bad answer`);
    const h = hs.find((x) => (x.letter || "").toUpperCase() === c);
    if (h && h.is_distractor) errs.push(`text ${t.position} correct_headline ${c} is flagged distractor`);
    used.add(c);
  });
  if (ts.length === 5 && used.size !== 5) errs.push(`texts map to ${used.size}/5 distinct headlines`);
} else if (d.teil === 2) {
  if (!d.passage || !d.passage.trim()) errs.push("passage required");
  const qs = Array.isArray(d.questions) ? d.questions : [];
  if (qs.length !== 5) errs.push(`${qs.length}/5 questions`);
  qs.forEach((q_) => {
    if (!q_.question?.trim()) errs.push(`Q${q_.number}: empty text`);
    if (!q_.option_a?.trim() || !q_.option_b?.trim() || !q_.option_c?.trim()) errs.push(`Q${q_.number}: empty option`);
    if (!["a", "b", "c"].includes((q_.correct || "").toLowerCase())) errs.push(`Q${q_.number}: answer not a/b/c`);
  });
} else if (d.teil === 3) {
  if (!d.key || d.key.length !== 10) errs.push("key must be exactly 10 characters (situations 11-20)");
  for (const c of d.key || "") if (!/[A-LX]/.test(c)) errs.push(`invalid key letter '${c}' (must be A-L or X)`);
  for (let n = 11; n <= 20; n++) if (!d.situations?.[String(n)]?.trim()) errs.push(`situation ${n} missing`);
  const textLetters = new Set(Object.keys(d.texts || {}));
  for (const L of textLetters) {
    if (!/^[A-L]$/.test(L)) errs.push(`invalid text letter '${L}'`);
    if (!d.texts[L].content?.trim()) errs.push(`text ${L}: content empty`);
  }
  for (let i = 0; i < (d.key || "").length; i++) {
    const c = d.key[i];
    if (c !== "X" && !textLetters.has(c)) errs.push(`key assigns ${11 + i}→${c} but text ${c} does not exist`);
  }
  const used = [...(d.key || "")].filter((c) => c !== "X");
  if (new Set(used).size !== used.length) errs.push("key reuses a letter — each Info-Text may match only once");
}

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }
console.log(`OK: teil ${d.teil} "${d.title}" (level ${d.level})`);
if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from lesen_exercises where teil=${d.teil} and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`Exercise titled "${d.title}" already exists in Lesen Teil ${d.teil} (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

const ins = await q(`insert into lesen_exercises (title, teil, level, source_pdf, import_notes, created_by)
  values (${S(d.title)}, ${d.teil}, ${S(d.level)}, ${S(d.source_pdf || "")}, ${S(d.import_notes || d.notes || "manual PDF transcription")}, '${CREATED_BY}') returning id;`);
const exId = ins[0].id;

if (d.teil === 1) {
  const hVals = d.headlines.map((h) => `('${exId}', '${(h.letter || "").toUpperCase()}', ${S(h.text)}, ${!!h.is_distractor})`).join(",\n");
  const tVals = d.texts.map((t) => `('${exId}', ${t.position}, ${S(t.title || "")}, ${S(t.content)}, '${(t.correct_headline || "").toUpperCase()}')`).join(",\n");
  await q(`insert into lesen_t1_headlines (exercise_id, letter, text, is_distractor) values\n${hVals};
           insert into lesen_t1_texts (exercise_id, position, title, content, correct_headline) values\n${tVals};`);
} else if (d.teil === 2) {
  await q(`insert into lesen_t2_passages (exercise_id, title, instructions, passage) values ('${exId}', ${S(d.title)}, ${S(d.instructions || "")}, ${S(d.passage)});`);
  const qVals = d.questions.map((q_) => `('${exId}', ${q_.number}, ${S(q_.question)}, ${S(q_.option_a)}, ${S(q_.option_b)}, ${S(q_.option_c)}, '${q_.correct.toLowerCase()}')`).join(",\n");
  await q(`insert into lesen_t2_questions (exercise_id, number, question, option_a, option_b, option_c, correct) values\n${qVals};`);
} else if (d.teil === 3) {
  const textLetters = new Set(Object.keys(d.texts || {}));
  const sitVals = [];
  for (let n = 11; n <= 20; n++) {
    const letter = d.key[n - 11]; const nm = letter === "X"; const cl = nm ? "null" : `'${letter}'`;
    sitVals.push(`('${exId}',${n},${S(d.situations[String(n)])},${cl},${nm})`);
  }
  const txtVals = [...textLetters].sort().map((L) => `('${exId}','${L}',${S(d.texts[L].title || "")},${S(d.texts[L].content)})`);
  await q(`insert into lesen_t3_situations (exercise_id,number,description,correct_letter,no_match) values ${sitVals.join(",")};
           insert into lesen_t3_texts (exercise_id,letter,title,content) values ${txtVals.join(",")};`);
}

console.log(`\nInserted exercise ${exId} (Lesen Teil ${d.teil}, level ${d.level}).`);

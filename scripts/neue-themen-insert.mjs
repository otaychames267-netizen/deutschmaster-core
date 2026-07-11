/**
 * Insert the "ALL NEUE THEMEN VON TELC" content batch across every module
 * (Lesen T1/T2/T3, Sprachbausteine T1/T2, Hören T1/T2/T3, Schreiben,
 * Sprechen Teil 1 + Teil 3) in one pass. Source JSON already reviewed by
 * hand (see conversation) — one genuine cross-batch duplicate found and
 * excluded here: "Liebe Lina, lieber Florian" (SB Teil 1) is byte-identical
 * to the already-imported "Lina und Florian" exercise (id
 * f3edd073-151b-426a-9d55-1f5fc601ce81), confirmed by comparing full passage
 * text, not just the title.
 *
 * Usage: node scripts/neue-themen-insert.mjs [--apply]   (dry run without --apply)
 */
import { readFileSync } from "node:fs";

const SCRATCH = "C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus-AuraLingovia/d62fd849-b08b-4a27-a94b-dd84844ba827/scratchpad/neue_themen";
const APPLY = process.argv.includes("--apply");

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
  return env;
}
const env = loadEnv();
const REF = env.SUPABASE_PROJECT_REF, TOKEN = env.SUPABASE_ACCESS_TOKEN;

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${text}\nSQL: ${sql.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}
function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (Array.isArray(v)) return `ARRAY[${v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(",")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
}
function readJson(name) { return JSON.parse(readFileSync(`${SCRATCH}/${name}`, "utf8")); }

const sprechen1 = readJson("out_sprechen1.json");
const sbT1New = readJson("out_sb_t1_new.json").filter((x) => x.title !== "Liebe Lina, lieber Florian"); // confirmed dup, excluded
const hoerenT2New = readJson("out_hoeren_t2_new.json");
const combined1to8 = readJson("out_combined_1to8.json");
const combined9to15 = readJson("out_combined_9to15.json");

const SOURCE_1 = "TEIL 1 SPRECHEN.pdf";
const SOURCE_SB1 = "SPRACHBAUSTEINE TEIL 1.pdf";
const SOURCE_H2 = "HOREN TEIL 2.pdf";
const SOURCE_COMBINED = "LESEN TEIL 1. TEIL 2 . TEIL 3. SCHREIBEN .SPRACHBAUSTEINE TEIL 1 . TEIL 2 HOREN TEIL 2.pdf";

const statements = [];

// ---- Lesen T1 ----
statements.push(`
  WITH ex AS (INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf) VALUES ('Leseverstehen Teil 1 — Übungstest 6', 1, 'TELC_B2', 'Standard', ${esc(SOURCE_COMBINED)}) RETURNING id),
  h AS (INSERT INTO lesen_t1_headlines (exercise_id, letter, text, is_distractor)
    SELECT ex.id, x.letter, x.text, x.is_distractor FROM ex, jsonb_to_recordset(${esc(JSON.stringify(combined1to8.lesen_t1.headlines))}::jsonb) AS x(letter text, text text, is_distractor boolean) RETURNING exercise_id)
  INSERT INTO lesen_t1_texts (exercise_id, position, title, content, correct_headline)
  SELECT (SELECT id FROM ex), x.position, x.title, x.content, x.correct_headline
  FROM jsonb_to_recordset(${esc(JSON.stringify(combined1to8.lesen_t1.texts))}::jsonb) AS x(position int, title text, content text, correct_headline text);`);

// ---- Lesen T2 ----
statements.push(`
  WITH ex AS (INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf) VALUES (${esc(combined1to8.lesen_t2.title)}, 2, 'TELC_B2', 'Standard', ${esc(SOURCE_COMBINED)}) RETURNING id),
  p AS (INSERT INTO lesen_t2_passages (exercise_id, title, instructions, passage) SELECT id, ${esc(combined1to8.lesen_t2.title)}, ${esc(combined1to8.lesen_t2.instructions)}, ${esc(combined1to8.lesen_t2.passage)} FROM ex RETURNING exercise_id)
  INSERT INTO lesen_t2_questions (exercise_id, number, question, option_a, option_b, option_c, correct)
  SELECT p.exercise_id, x.number, x.question, x.option_a, x.option_b, x.option_c, x.correct FROM p, jsonb_to_recordset(${esc(JSON.stringify(combined1to8.lesen_t2.questions))}::jsonb) AS x(number int, question text, option_a text, option_b text, option_c text, correct text);`);

// ---- Lesen T3 ----
statements.push(`
  WITH ex AS (INSERT INTO lesen_exercises (title, teil, level, difficulty, source_pdf) VALUES ('Leseverstehen Teil 3 — Übungstest 6', 3, 'TELC_B2', 'Standard', ${esc(SOURCE_COMBINED)}) RETURNING id),
  sit AS (INSERT INTO lesen_t3_situations (exercise_id, number, description, correct_letter, no_match)
    SELECT ex.id, x.number, x.description, x.correct_letter, x.no_match FROM ex, jsonb_to_recordset(${esc(JSON.stringify(combined1to8.lesen_t3.situations))}::jsonb) AS x(number int, description text, correct_letter text, no_match boolean) RETURNING exercise_id)
  INSERT INTO lesen_t3_texts (exercise_id, letter, title, content)
  SELECT (SELECT id FROM ex), x.letter, x.title, x.content FROM jsonb_to_recordset(${esc(JSON.stringify(combined1to8.lesen_t3.ads))}::jsonb) AS x(letter text, title text, content text);`);

// ---- Sprachbausteine T1 (3 from standalone file, minus 1 confirmed dup, + 1 from combined) ----
function sbT1Insert(title, passage, gaps, sourcePdf) {
  return `
  WITH ex AS (INSERT INTO sb_exercises (title, teil, level, source_pdf) VALUES (${esc(title)}, 1, 'TELC_B2', ${esc(sourcePdf)}) RETURNING id),
  p AS (INSERT INTO sb_t1_passages (exercise_id, title, instructions, passage) SELECT id, ${esc(title)}, NULL, ${esc(passage)} FROM ex RETURNING exercise_id)
  INSERT INTO sb_t1_gaps (exercise_id, gap_number, option_a, option_b, option_c, correct)
  SELECT p.exercise_id, x.gap_number, x.option_a, x.option_b, x.option_c, x.correct FROM p, jsonb_to_recordset(${esc(JSON.stringify(gaps))}::jsonb) AS x(gap_number int, option_a text, option_b text, option_c text, correct text);`;
}
for (const ex of sbT1New) statements.push(sbT1Insert(ex.title, ex.passage, ex.gaps, SOURCE_SB1));
statements.push(sbT1Insert(combined1to8.sb_t1.title, combined1to8.sb_t1.passage, combined1to8.sb_t1.gaps, SOURCE_COMBINED));

// ---- Sprachbausteine T2 ----
statements.push(`
  WITH ex AS (INSERT INTO sb_exercises (title, teil, level, source_pdf) VALUES (${esc(combined1to8.sb_t2.title)}, 2, 'TELC_B2', ${esc(SOURCE_COMBINED)}) RETURNING id),
  p AS (INSERT INTO sb_t2_passages (exercise_id, title, instructions, passage) SELECT id, ${esc(combined1to8.sb_t2.title)}, NULL, ${esc(combined1to8.sb_t2.passage)} FROM ex RETURNING exercise_id),
  w AS (INSERT INTO sb_t2_words (exercise_id, word_number, word) SELECT p.exercise_id, x.n, x.word FROM p, jsonb_to_recordset(${esc(JSON.stringify(combined1to8.sb_t2.word_bank.map((w, i) => ({ n: i + 1, word: w.word }))))}::jsonb) AS x(n int, word text) RETURNING exercise_id)
  INSERT INTO sb_t2_gaps (exercise_id, gap_number, correct_word)
  SELECT (SELECT exercise_id FROM w LIMIT 1), x.gap_number, x.correct_word FROM jsonb_to_recordset(${esc(JSON.stringify(combined1to8.sb_t2.gaps))}::jsonb) AS x(gap_number int, correct_word text);`);

// ---- Hören T1/T2/T3 (combined booklet) ----
function hoerenInsert(title, teil, instructions, stmts, sourcePdf, position) {
  return `
  WITH ex AS (INSERT INTO hoeren_exercises (title, teil, level, instructions, source_pdf, position) VALUES (${esc(title)}, ${teil}, 'TELC_B2', ${esc(instructions)}, ${esc(sourcePdf)}, ${position}) RETURNING id)
  INSERT INTO hoeren_statements (exercise_id, statement_number, statement_text, correct_answer)
  SELECT ex.id, x.n, x.t, x.c FROM ex, jsonb_to_recordset(${esc(JSON.stringify(stmts))}::jsonb) AS x(n int, t text, c boolean);`;
}
statements.push(hoerenInsert(combined9to15.hoeren_t1.title, 1, combined9to15.hoeren_t1.instructions,
  combined9to15.hoeren_t1.statements.map((s) => ({ n: s.statement_number, t: s.statement_text, c: s.correct_answer })), SOURCE_COMBINED, 999));
statements.push(hoerenInsert(combined9to15.hoeren_t2.title, 2, combined9to15.hoeren_t2.instructions,
  combined9to15.hoeren_t2.statements.map((s) => ({ n: s.statement_number, t: s.statement_text, c: s.correct_answer })), SOURCE_COMBINED, 999));
statements.push(hoerenInsert(combined9to15.hoeren_t3.title, 3, combined9to15.hoeren_t3.instructions,
  combined9to15.hoeren_t3.statements.map((s) => ({ n: s.statement_number, t: s.statement_text, c: s.correct_answer })), SOURCE_COMBINED, 999));

// ---- Hören T2 standalone file (4 exercises) — renumbered 46-55 to match the
// established convention for Teil 2 (confirmed against existing rows), since
// the source pages used 3 different inconsistent numbering schemes (1-10,
// 46-55, 91-100) for what is structurally always "statements 46-55".
for (const ex of hoerenT2New) {
  const renumbered = ex.statements.map((s, i) => ({ n: 46 + i, t: s.statement_text, c: s.correct_answer }));
  statements.push(hoerenInsert(ex.title, 2, ex.instructions, renumbered, SOURCE_H2, 999));
}

// ---- Schreiben ----
statements.push(`
  WITH ex AS (INSERT INTO exams (title, level, module, section, teil, exam_type, status, display_order, metadata)
    VALUES (${esc(combined9to15.schreiben.title)}, 'TELC_B2', 'schriftlich', 'schreiben', NULL, 'vorbereitung', 'published', 999, ${esc(JSON.stringify({ category: "informell", estimated_minutes: 30, difficulty: "Standard" }))}::jsonb) RETURNING id)
  INSERT INTO exam_items (exam_id, position, kind, content, points)
  SELECT id, 1, 'writing_prompt', ${esc(JSON.stringify({ task: combined9to15.schreiben.task, min_words: combined9to15.schreiben.min_words, max_words: combined9to15.schreiben.max_words }))}::jsonb, 10 FROM ex;`);

// ---- Sprechen Teil 1 (7 fixed categories) ----
statements.push(`
  INSERT INTO muendlich_materials (teil, category, title, body_text, source_pdf, position)
  SELECT 1, 'themen', x.category, x.points, ${esc(SOURCE_1)}, x.pos
  FROM jsonb_to_recordset(${esc(JSON.stringify(sprechen1.map((c, i) => ({ category: c.category, points: c.guiding_points.join(", "), pos: i + 1 }))))}::jsonb) AS x(category text, points text, pos int);`);

// ---- Sprechen Teil 3 (1 new scenario) ----
statements.push(`
  INSERT INTO muendlich_materials (teil, category, title, body_text, source_pdf, position)
  VALUES (3, 'themen', ${esc(combined9to15.sprechen_t3.title)}, ${esc(combined9to15.sprechen_t3.body_text)}, ${esc(SOURCE_COMBINED)}, 999);`);

console.log(`${statements.length} statement groups prepared.`);
console.log(`Excluded duplicate: "Liebe Lina, lieber Florian" (SB T1, matches existing "Lina und Florian").`);
console.log(`SB T1 new count: ${sbT1New.length} (of 3 in source file) + 1 from combined = ${sbT1New.length + 1} total.`);
console.log(`Hören T2 standalone-file exercises: ${hoerenT2New.map((e) => e.title).join(", ")}`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

for (const [i, sql] of statements.entries()) {
  await q(sql);
  console.log(`[${i + 1}/${statements.length}] applied`);
}
console.log("\nAll statements applied successfully.");

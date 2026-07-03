/**
 * FINAL Teil 1 assembler — 42 exercises, exact from the PDF.
 *  - 22 DIGITAL themes: taken verbatim from the text layer (headlines + 5 texts +
 *    printed answer key). Chosen block per theme is pinned by PDF page in PICK[].
 *  - 20 MANUAL themes (5 digital that failed auto-parse + 15 scanned): transcribed
 *    from the page images into scratchpad/t1-manual.json.
 * All 42 are ordered by TOC position (ord). --plan prints; --apply wipes teil=1
 * and inserts in order. Verifies structure before writing.
 */
import { readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";
const MANUAL_FILE = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\t1-manual.json";
const APPLY = process.argv.includes("--apply");
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql){ const r=await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${SBP}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})}); const t=await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t); }

// Strip trailing next-page banner junk that bleeds into the last digital text:
// the "Telc/tele Leseverstehen, Teil 1" marker, Arabic marker/title lines, and a
// bare trailing page number. Loops until stable. Digital-only (scanned texts are
// supplied inline and never carry this).
function cleanText(s) {
  let t = (s || "").replace(/\f/g, "\n");
  let prev;
  do {
    prev = t;
    t = t.replace(/\n[^\n]*\blese?r?verstehen\b[\s\S]*$/i, "");   // "[Telc] Lese(r)verstehen, Teil 1" next-page header
    t = t.replace(/\n[^\n]*[؀-ۿ][^\n]*$/, "");
    t = t.replace(/[ \t]*\n\s*\d{1,3}\s*$/, "");
    t = t.replace(/[ \t]{2,}\d{1,3}\s*$/, "");   // bare trailing page number after a gap on the same line
    t = t.replace(/\s+$/, "");
  } while (t !== prev);
  return t;
}

// theme ord (TOC order) -> { page (digital pick) , title }. Pages are the block's
// "Lesen Sie zuerst" page. Manual themes have no page here (loaded from JSON).
const PICK = [
  { ord: 1,  page: 2,  title: "Limonade" },
  { ord: 3,  page: 11, title: "Die Programmierer" },
  { ord: 4,  page: 14, title: "Finanz" },
  { ord: 5,  page: 16, title: "Impfung" },
  { ord: 6,  page: 18, title: "Inseln" },
  { ord: 8,  page: 22, title: "In den Alpen" },
  { ord: 10, page: 31, title: "Insekten" },
  { ord: 11, page: 33, title: "Tanzkurs" },
  { ord: 12, page: 36, title: "Schulen" },
  { ord: 13, page: 38, title: "Bilder" },
  { ord: 14, page: 41, title: "Jugend forscht" },
  { ord: 15, page: 43, title: "Bonbons" },
  { ord: 16, page: 48, title: "Kaffee" },
  { ord: 17, page: 50, title: "Kinder Handy" },
  { ord: 19, page: 54, title: "Auf dem Weg" },
  { ord: 20, page: 56, title: "Keine Zeit" },
  { ord: 21, page: 60, title: "Trampoline" },
  { ord: 22, page: 63, title: "Sport ist gesund" },
  { ord: 23, page: 66, title: "Österreich Markt" },
  { ord: 25, page: 71, title: "Alte Spiele" },
  { ord: 26, page: 73, title: "Benzin" },
];

// ── parse digital blocks from text layer ──
const dir = mkdtempSync(join(tmpdir(), "asm-")); const out = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, out], { stdio: "pipe" });
const full = readFileSync(out, "utf8");
const delim = /Lesen Sie zuerst die zehn [ÜU]berschriften/gi;
const marks = []; let mm; while ((mm = delim.exec(full))) marks.push(mm.index);
const pageOf = (off) => (full.slice(0, off).match(/\f/g) || []).length + 1;
const segs = full.split(delim);
const hlRe = /^\s*(?:(\d)_|_{2}|_)\s*([a-j])\)\s*(.+?)\s*$/i;
const blocksByPage = new Map();
for (let k = 1; k < segs.length; k++) {
  const page = pageOf(marks[k - 1]);
  const lines = segs[k].split(/\r?\n/); const headlines = []; const ans = {}; let hi = 0;
  for (; hi < lines.length; hi++) {
    const m = lines[hi].match(hlRe);
    if (m) { const L = m[2].toUpperCase(); headlines.push({ letter: L, text: m[3].trim() }); if (m[1]) ans[+m[1]] = L; }
    if (headlines.length >= 10 && /^\s*Text\s*1\b/i.test(lines[hi + 1] || "")) break;
  }
  if (headlines.length !== 10) continue;
  const re = /(^|\n)\s*Text\s*([1-5])\b[^\n]*\n([\s\S]*?)(?=\n\s*Text\s*[1-5]\b|$)/gi;
  const o = {}; let t; const body = lines.slice(hi + 1).join("\n");
  while ((t = re.exec(body))) { const p = +t[2]; const c = t[3].replace(/\n{2,}/g, "\n").trim(); if (c && !o[p]) o[p] = c; }
  const texts = Object.entries(o).map(([p, content]) => ({ position: +p, content: cleanText(content), correct_headline: ans[+p] }));
  if (!blocksByPage.has(page)) blocksByPage.set(page, { page, headlines, texts, ans });
}

const exercises = [];
for (const p of PICK) {
  const b = blocksByPage.get(p.page);
  if (!b) { console.log(`⚠ MISSING digital block for page ${p.page} (${p.title})`); continue; }
  const correct = new Set(b.texts.map(t => t.correct_headline));
  const headlines = b.headlines.map(h => ({ letter: h.letter, text: h.text, is_distractor: !correct.has(h.letter) }));
  exercises.push({ ord: p.ord, title: p.title, headlines, texts: b.texts });
}

// extract 5 text bodies from a page range's text layer (for digital-manual entries)
function textsFromPages(a, b, key) {
  const o = join(dir, `tx${a}.txt`);
  execFileSync(POPPLER, ["-layout", "-f", String(a), "-l", String(b || a), PDF, o], { stdio: "pipe" });
  const txt = readFileSync(o, "utf8").replace(/\f/g, "\n");
  const re = /(^|\n)\s*Text\s*:?\s*([1-5])\s*:?\s*\n?([\s\S]*?)(?=\n\s*Text\s*:?\s*[1-5]\b|$)/gi;
  const map = {}; let m;
  while ((m = re.exec(txt))) { const p = +m[2]; const c = m[3].replace(/\n{2,}/g, "\n").replace(/[ \t]{2,}/g, " ").trim(); if (c && !map[p]) map[p] = c; }
  return Object.entries(map).map(([p, content]) => ({ position: +p, content: cleanText(content), correct_headline: (key[p - 1] || "").toUpperCase() }));
}

// ── manual/scanned exercises ──
if (existsSync(MANUAL_FILE)) {
  const manual = JSON.parse(readFileSync(MANUAL_FILE, "utf8"));
  for (const ex of manual) {
    // digital-manual: pull texts from the layer via textPages + key
    if (ex.textPages && ex.key) ex.texts = textsFromPages(ex.textPages[0], ex.textPages[1], ex.key);
    const correct = new Set(ex.texts.map(t => t.correct_headline));
    ex.headlines = ex.headlines.map(h => ({ letter: h.letter, text: h.text, is_distractor: !correct.has(h.letter) }));
    exercises.push({ ord: ex.ord, title: ex.title, headlines: ex.headlines, texts: ex.texts });
  }
}

exercises.sort((a, b) => a.ord - b.ord);

// ── validate ──
let bad = 0;
for (const e of exercises) {
  const L = e.headlines.map(h => h.letter.toUpperCase());
  const key = e.texts.map(t => t.correct_headline);
  const errs = [];
  if (e.headlines.length < 9 || e.headlines.length > 10 || new Set(L).size !== e.headlines.length) errs.push(`headlines(${e.headlines.length}/${new Set(L).size})`);
  if (e.texts.length !== 5) errs.push(`texts(${e.texts.length})`);
  if (new Set(key).size !== 5) errs.push(`key not 5-distinct [${key.join("")}]`);
  if (key.some(k => !L.includes((k||"").toUpperCase()))) errs.push(`key letter not in headlines`);
  if (e.texts.some(t => !t.content || !t.content.trim())) errs.push(`empty text`);
  if (e.headlines.length === 9) console.log(`  ℹ ord ${e.ord} "${e.title}": 9 headlines (source omits one — documented)`);
  if (errs.length) { bad++; console.log(`  ✗ ord ${e.ord} "${e.title}": ${errs.join(", ")}`); }
}
console.log(`\nAssembled ${exercises.length}/42 exercises. Invalid: ${bad}`);
console.log(`Ords present: ${exercises.map(e => e.ord).join(",")}`);
for (const e of exercises) console.log(`  ${String(e.ord).padStart(2)}. "${e.title}"  key=${e.texts.map(t=>t.correct_headline).join("")}  t1="${e.texts.find(t=>t.position===1)?.content.slice(0,34)}"`);

if (APPLY) {
  if (exercises.length !== 41 || bad) { console.log(`REFUSING to apply: expected 41 valid exercises, got ${exercises.length} (invalid=${bad}).`); process.exit(1); }
  await q(`delete from lesen_exercises where teil=1;`);
  for (const ex of exercises) {
    const hl = ex.headlines.map(h => `(${S(h.letter.toUpperCase())},${S(h.text)},${!!h.is_distractor})`);
    const tx = ex.texts.map(t => `(${t.position},${S(t.content)},${S((t.correct_headline||"").toUpperCase())})`);
    const r = await q(`insert into lesen_exercises (title,teil,source_pdf,created_by) values (${S(ex.title||"")},1,${S("Lesen teil 1..pdf")},'${CREATED_BY}') returning id;`);
    const id = r[0].id;
    await q(`insert into lesen_t1_headlines (exercise_id,letter,text,is_distractor) values ${hl.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
    await q(`insert into lesen_t1_texts (exercise_id,position,content,correct_headline) values ${tx.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
  }
  console.log(`\nAPPLIED ${exercises.length} exercises.`);
} else console.log(`\n(dry run — need t1-manual.json with the 20 remaining before --apply)`);

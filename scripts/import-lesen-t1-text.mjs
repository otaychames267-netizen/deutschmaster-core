/**
 * FREE text-layer importer for Lesen Teil 1 (no vision API).
 *
 * The high-quality PDF has a real text layer with the answer key encoded inline
 * (e.g. "3_c)" = text 3 → headline c; "__a)" = distractor). We extract with
 * Poppler's pdftotext (free), parse each exercise, and:
 *   - skip exercises already in the DB (matched by headline set) — never re-create,
 *   - import only genuinely-missing exercises,
 *   - update only the TITLE of existing exercises whose title is empty/temporary,
 *   - skip list/index/overview pages (no valid 10-headline exercise block).
 *
 * Usage: bun scripts/import-lesen-t1-text.mjs "<pdf>" [--dry-run] [--titles-only]
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) { let v = m[2].trim(); if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1); process.env[m[1]] = v; }
  }
}
loadEnv();
const SBP = process.env.SUPABASE_ACCESS_TOKEN, REF = process.env.SUPABASE_PROJECT_REF;
const CREATED_BY = process.env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER = process.env.POPPLER_BIN || "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const pdfPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const titlesOnly = process.argv.includes("--titles-only");
if (!pdfPath) { console.error("usage: bun scripts/import-lesen-t1-text.mjs <pdf> [--dry-run] [--titles-only]"); process.exit(1); }

async function runSql(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
  });
  const t = await r.text(); if (!r.ok) throw new Error(`SQL ${r.status}: ${t}`); return JSON.parse(t);
}
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

// ── Extract text layer ──
const dir = mkdtempSync(join(tmpdir(), "t1text-"));
const txtFile = join(dir, "out.txt");
execFileSync(POPPLER, ["-layout", pdfPath, txtFile], { stdio: "pipe" });
const full = readFileSync(txtFile, "utf8");

// ── Parse exercises ──
const MARKER = /Lesen Sie zuerst die zehn [ÜU]berschriften/i;
const segments = full.split(MARKER);
// segments[0] = preamble; for exercise k, headlines+texts are in segments[k], its title is the tail of segments[k-1].
const headlineRe = /^\s*(?:(\d)_|_{2})\s*([a-j])\)\s*(.+?)\s*$/i;

function parseExercise(body, prevTail) {
  const lines = body.split(/\r?\n/);
  const headlines = [];
  const answerByNum = {}; // text number -> letter
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(headlineRe);
    if (m) {
      const num = m[1] ? parseInt(m[1], 10) : null;
      const letter = m[2].toUpperCase();
      const text = m[3].trim();
      headlines.push({ letter, text, is_distractor: num === null });
      if (num) answerByNum[num] = letter;
    }
    if (headlines.length >= 10 && /^\s*Text\s*1\b/i.test(lines[i + 1] || "")) break;
  }
  // texts — layout A: texts follow the headlines (current segment); layout B:
  // texts precede the headlines (previous segment's tail). Prefer the current
  // segment; only fall back to prevTail when this segment has no texts.
  const rest = lines.slice(i + 1).join("\n");
  function extractTexts(str) {
    const out = {};
    const re = /(^|\n)\s*Text\s*([1-5])\b[^\n]*\n([\s\S]*?)(?=\n\s*Text\s*[1-5]\b|$)/gi;
    let m;
    while ((m = re.exec(str)) !== null) { const p = parseInt(m[2], 10); const c = m[3].replace(/\n{2,}/g, "\n").trim(); if (c && !out[p]) out[p] = c; }
    return out;
  }
  let textMap = extractTexts(rest);
  if (Object.keys(textMap).length === 0) textMap = extractTexts(prevTail || "");
  const texts = Object.entries(textMap).map(([p, content]) => ({ position: +p, content, correct_headline: answerByNum[+p] || "" }));
  // title: last short non-empty line of prevTail that isn't part of a long paragraph
  let title = "";
  if (prevTail) {
    const cand = prevTail.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let k = cand.length - 1; k >= 0; k--) {
      const l = cand[k].replace(/[؀-ۿ‎‏‫‬]/g, "").trim(); // strip Arabic
      if (l && l.length <= 60 && !/^\d+$/.test(l) && !/^Text\s*\d/i.test(l) && !/Leseverstehen|Teil\s*1|^telc$/i.test(l)) { title = l; break; }
    }
  }
  return { title, headlines, texts };
}

function valid(ex) {
  if (ex.headlines.length !== 10) return false;
  if (new Set(ex.headlines.map((h) => h.letter)).size !== 10) return false;
  if (ex.texts.length !== 5) return false;
  const used = new Set(ex.texts.map((t) => (t.correct_headline || "").toUpperCase()));
  if (used.size !== 5 || [...used].some((u) => !/^[A-J]$/.test(u))) return false;
  if (ex.headlines.filter((h) => h.is_distractor).length !== 5) return false;
  return true;
}
const hlSig = (headlines) => createHash("sha256").update(headlines.map((h) => norm(h.text)).sort().join("|")).digest("hex").slice(0, 16);

const parsed = [];
for (let k = 1; k < segments.length; k++) {
  const ex = parseExercise(segments[k], segments[k - 1]);
  parsed.push(ex);
}
console.log(`parsed ${parsed.length} exercise block(s) from text layer (free)`);

// Reject sentence-fragment titles (keep short capitalised noun phrases only).
function cleanTitle(t) {
  if (!t) return "";
  const x = t.trim();
  if (x.length > 40) return "";
  if (/^[a-zäöüß]/.test(x)) return "";   // starts lowercase → prose
  if (/\.$/.test(x)) return "";           // ends with a period → sentence
  if (x.split(/\s+/).length > 5) return "";
  return x;
}

// ── DB: existing teil-1 by FUZZY headline overlap (text-layer is cleaner than
//    the old vision extraction, so exact match would miss and create dupes). ──
const dbRows = await runSql(`select e.id, e.title, coalesce((select json_agg(h.text) from lesen_t1_headlines h where h.exercise_id=e.id),'[]') hs from lesen_exercises e where e.teil=1;`);
const dbSets = dbRows.map((r) => ({ id: r.id, title: r.title, set: new Set((r.hs || []).map(norm)) }));
function bestMatch(headlines) {
  const s = headlines.map((h) => norm(h.text));
  let best = 0, match = null;
  for (const db of dbSets) { const o = s.filter((x) => db.set.has(x)).length; if (o > best) { best = o; match = db; } }
  return { best, match };
}

let imported = 0, skippedExisting = 0, titleUpdated = 0, invalid = 0, dups = 0;
for (const ex of parsed) {
  ex.title = cleanTitle(ex.title);
  if (!valid(ex)) {
    invalid++;
    if (dryRun) {
      const ans = new Set(ex.texts.map((t) => (t.correct_headline || "").toUpperCase()).filter(Boolean)).size;
      console.log(`  · invalid: headlines=${ex.headlines.length} texts=${ex.texts.length} distinctAnswers=${ans}`);
    }
    continue;
  }
  const { best, match } = bestMatch(ex.headlines);
  const existing = best >= 6 ? match : null;
  if (existing) {
    // already in DB (cleaner version) — never re-create. Optionally fix an empty/temp title.
    const cur = (existing.title || "").trim();
    const wantsTitle = ex.title && (cur === "" || /^Lesen Teil 1( \d+)?$/i.test(cur));
    if (wantsTitle && !dryRun) {
      await runSql(`update lesen_exercises set title=convert_from(decode('${b64(ex.title)}','base64'),'UTF8') where id='${existing.id}';`);
      titleUpdated++;
      console.log(`  ✎ title "${ex.title}" → existing exercise (was "${cur || "(empty)"}")`);
    } else if (wantsTitle) { console.log(`  ✎ would set title "${ex.title}" (dry run)`); titleUpdated++; }
    skippedExisting++;
    continue;
  }
  if (titlesOnly) { continue; }
  // register as known so a repeat of the same exercise later in the PDF is deduped
  dbSets.push({ id: "new", title: ex.title, set: new Set(ex.headlines.map((h) => norm(h.text))) });
  // genuinely missing → import
  const answers = ex.texts.slice().sort((a, b) => a.position - b.position).map((t) => t.correct_headline).join("");
  if (dryRun) { console.log(`  ＋ NEW "${ex.title || "(no title)"}" — answers ${answers} (dry run)`); imported++; continue; }
  const title = ex.title || "Lesen Teil 1";
  const sql = `select import_lesen_t1_exercise_admin('${CREATED_BY}'::uuid,` +
    `convert_from(decode('${b64(title)}','base64'),'UTF8'),` +
    `convert_from(decode('${b64(JSON.stringify(ex.headlines))}','base64'),'UTF8')::jsonb,` +
    `convert_from(decode('${b64(JSON.stringify(ex.texts.map((t) => ({ position: t.position, content: t.content, correct_headline: t.correct_headline })))) }','base64'),'UTF8')::jsonb,` +
    `convert_from(decode('${b64(pdfPath.split(/[\\/]/).pop())}','base64'),'UTF8'));`;
  try { const res = await runSql(sql); console.log(`  ＋ imported "${res?.[0]?.import_lesen_t1_exercise_admin?.title}" — answers ${answers}`); imported++; }
  catch (e) { console.log(`  ✗ import failed "${ex.title}": ${String(e.message).slice(0, 120)}`); invalid++; }
}

console.log(`\n── Summary (text layer, no vision API) ──`);
console.log(`parsed=${parsed.length} valid+new imported=${imported} existing-skipped=${skippedExisting} titles-updated=${titleUpdated} duplicates=${dups} invalid/listpages=${invalid}`);

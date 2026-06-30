/**
 * Headless importer for TELC B2 Lesen Teil 1 (Engineering Spec §16/§17/§21/§27).
 *
 * A Teil 1 exercise = 10 headlines (A–J; 5 correct + 5 distractors) and 5 texts
 * (positions 1–5), each text matched to one correct headline. Each exercise
 * spans 2 consecutive scanned pages (headlines + texts 1–2, then texts 3–5).
 *
 * Same production engine as the Teil 2 importer: Poppler rasterize → Claude
 * vision (forced tool-use, always-valid JSON) over the 2-page pair → strict
 * full-content validation → Opus fallback on low-confidence pages → duplicate
 * detection on full content → atomic insert via import_lesen_t1_exercise_admin.
 * Parallel --concurrency, deterministic resumable cache, --replace/--dry-run/
 * --verify/--no-cache.
 *
 * Never invents content/titles; incomplete or uncertain exercises go to review,
 * never imported (§21). Titles verbatim from PDF; empty stays empty; distinct
 * same-title exercises auto-numbered server-side (§17).
 *
 * Usage:
 *   bun scripts/import-lesen-t1.mjs "<pdf>" [--max-pages N] [--replace] [--dry-run] [--verify] [--concurrency N]
 */
import { readFileSync, mkdtempSync, mkdirSync, existsSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}
loadEnv();

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SBP_TOKEN     = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF   = process.env.SUPABASE_PROJECT_REF;
const MODEL         = process.env.CLAUDE_EXTRACT_MODEL || "claude-sonnet-4-6";
const OPUS_MODEL    = process.env.CLAUDE_VALIDATE_MODEL || "claude-opus-4-8";
const CREATED_BY    = process.env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER_BIN   = process.env.POPPLER_BIN || "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftoppm.exe";

const PROMPT_VERSION = "t1-pair-v2";
const CACHE_DIR = join(process.env.LOCALAPPDATA || tmpdir(), "lesen-import-cache");
mkdirSync(CACHE_DIR, { recursive: true });
const useCache = !process.argv.includes("--no-cache");

const pdfPath  = process.argv[2];
const maxPages = (() => { const i = process.argv.indexOf("--max-pages"); return i > 0 ? parseInt(process.argv[i + 1], 10) : Infinity; })();
const dryRun   = process.argv.includes("--dry-run");
const replace  = process.argv.includes("--replace");
const verify   = process.argv.includes("--verify");
const concurrency = (() => { const i = process.argv.indexOf("--concurrency"); return i > 0 ? Math.max(1, parseInt(process.argv[i + 1], 10)) : 6; })();

if (!pdfPath) { console.error('Usage: bun scripts/import-lesen-t1.mjs "<pdf>" [--replace|--dry-run|--verify] [--concurrency N]'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error("ANTHROPIC_API_KEY missing"); process.exit(1); }
if (!dryRun && (!SBP_TOKEN || !PROJECT_REF)) { console.error("SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF missing"); process.exit(1); }

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SBP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

function rasterize(pdf) {
  const dir = mkdtempSync(join(tmpdir(), "lesen-t1-"));
  execFileSync(POPPLER_BIN, ["-png", "-r", "150", pdf, join(dir, "p")], { stdio: "pipe" });
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort((a, b) => parseInt(a.match(/(\d+)\.png$/)[1], 10) - parseInt(b.match(/(\d+)\.png$/)[1], 10))
    .map((f) => join(dir, f));
}

const PROMPT = `These are two consecutive scanned pages of an official TELC B2 "Leseverstehen, Teil 1" exercise (a SOLVED copy showing the official answer key).

Teil 1 structure: 10 headlines labelled A–J, and 5 short texts numbered 1–5. Each text matches exactly ONE headline; 5 headlines are correct (one per text) and the other 5 are distractors (unused). In the solved copy the correct headline for each text is indicated (e.g. the matching letter marked/written by the text, or the used headlines checked).

Extract EVERYTHING VERBATIM (no translation, paraphrase, summary, or spelling correction; keep German text and paragraphs with \\n):
- title: the exercise's own printed topic/theme banner if one is clearly shown (e.g. a heading like "GRIPPE IMPFUNG"), verbatim. Do NOT use the section header "Leseverstehen, Teil 1" / "Teil 1" / "telc" — those are never a title. If there is no specific printed exercise title, use empty string "".
- headlines: all 10, each { letter A–J, text verbatim, is_distractor true/false }. Exactly 5 must be is_distractor=true.
- texts: all 5, each { position 1–5, title (verbatim sub-title if any else ""), content verbatim, correct_headline the matching A–J letter from the answer key }.

The 5 texts must map to 5 DISTINCT correct headlines. If these two pages are NOT a complete Teil 1 exercise (cover, instructions, or a partial page), set skip=true.`;

async function extractPair(imgA, imgB, model, cacheBase) {
  const bytesA = readFileSync(imgA), bytesB = readFileSync(imgB);
  const cacheFile = join(CACHE_DIR, createHash("sha256").update(model).update(PROMPT_VERSION).update(cacheBase).digest("hex") + ".json");
  if (useCache && existsSync(cacheFile)) return { data: JSON.parse(readFileSync(cacheFile, "utf8")), usage: null };

  const images = [bytesA, bytesB].map((b) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: b.toString("base64") } }));
  const tool = {
    name: "submit_exercise",
    description: "Submit one extracted TELC Lesen Teil 1 exercise verbatim.",
    input_schema: {
      type: "object",
      properties: {
        skip: { type: "boolean" },
        title: { type: "string" },
        headlines: {
          type: "array",
          items: { type: "object", properties: {
            letter: { type: "string" }, text: { type: "string" }, is_distractor: { type: "boolean" },
          }, required: ["letter", "text", "is_distractor"] },
        },
        texts: {
          type: "array",
          items: { type: "object", properties: {
            position: { type: "integer" }, title: { type: "string" }, content: { type: "string" }, correct_headline: { type: "string" },
          }, required: ["position", "content", "correct_headline"] },
        },
      },
      required: ["headlines", "texts"],
    },
  };
  const body = { model, max_tokens: 8192, tools: [tool], tool_choice: { type: "tool", name: "submit_exercise" },
    messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, ...images] }] };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
      if (json.stop_reason === "max_tokens") throw new Error("truncated (max_tokens)");
      const block = (json.content || []).find((b) => b.type === "tool_use");
      if (!block) throw new Error("no tool_use block");
      if (useCache) { try { writeFileSync(cacheFile, JSON.stringify(block.input)); } catch {} }
      return { data: block.input, usage: json.usage };
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

// A headline is a distractor iff no text maps to it. Deriving this (rather than
// trusting the model's is_distractor flag) removes the contradiction class where
// a headline is flagged distractor yet assigned to a text.
function normalizeExercise(ex) {
  if (Array.isArray(ex.texts) && Array.isArray(ex.headlines)) {
    const correct = new Set(ex.texts.map((t) => (t.correct_headline || "").toUpperCase()));
    ex.headlines = ex.headlines.map((h) => ({ ...h, is_distractor: !correct.has((h.letter || "").toUpperCase()) }));
  }
  return ex;
}

function validateExercise(ex) {
  const errs = [];
  const hs = Array.isArray(ex.headlines) ? ex.headlines : [];
  const ts = Array.isArray(ex.texts) ? ex.texts : [];
  if (hs.length !== 10) errs.push(`${hs.length}/10 headlines`);
  const letters = new Set();
  let distractors = 0;
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
    used.add(c);
  });
  if (ts.length === 5 && used.size !== 5) errs.push(`texts map to ${used.size}/5 distinct headlines`);
  return errs;
}

const normText = (s) => (s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
const fullSig = (ex) => {
  const h = (ex.headlines || []).map((x) => `${(x.letter || "").toUpperCase()}:${x.text}`).sort().join("|");
  const t = (ex.texts || []).slice().sort((a, b) => a.position - b.position).map((x) => `${x.position}:${x.content}:${(x.correct_headline || "").toUpperCase()}`).join("|");
  return createHash("sha256").update(normText(h)).digest("hex").slice(0, 16) + ":" + createHash("sha256").update(normText(t)).digest("hex").slice(0, 16);
};

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");

async function insertExercise(ex, sourcePdf) {
  const headlines = ex.headlines.map((h) => ({ letter: (h.letter || "").toUpperCase(), text: h.text, is_distractor: !!h.is_distractor }));
  const texts = ex.texts.map((t) => ({ position: t.position, title: t.title || "", content: t.content, correct_headline: (t.correct_headline || "").toUpperCase() }));
  const sql =
    `select import_lesen_t1_exercise_admin(` +
    `'${CREATED_BY}'::uuid,` +
    `convert_from(decode('${b64(ex.title || "")}','base64'),'UTF8'),` +
    `convert_from(decode('${b64(JSON.stringify(headlines))}','base64'),'UTF8')::jsonb,` +
    `convert_from(decode('${b64(JSON.stringify(texts))}','base64'),'UTF8')::jsonb,` +
    `convert_from(decode('${b64(sourcePdf)}','base64'),'UTF8')` +
    `) as result;`;
  return runSql(sql);
}

// ── main ──
const sourcePdf = pdfPath.split(/[\\/]/).pop();
const pdfStamp = statSync(pdfPath).size;
console.log(`\n=== Importing Teil 1: ${sourcePdf} (model=${MODEL}${dryRun ? ", DRY RUN" : ""}${verify ? ", VERIFY" : ""}) ===`);

if (replace && !dryRun && !verify) {
  const del = await runSql(`delete from lesen_exercises where teil=1 and source_pdf=convert_from(decode('${b64(sourcePdf)}','base64'),'UTF8') returning id;`);
  console.log(`--replace: cleared ${del.length} existing Teil 1 exercise(s) from this source PDF`);
}

const pages = rasterize(pdfPath).slice(0, maxPages === Infinity ? undefined : maxPages);
const pairs = [];
for (let i = 0; i + 1 < pages.length; i += 2) pairs.push([i, i + 1]);
console.log(`rasterized ${pages.length} pages → ${pairs.length} candidate exercise(s)\n`);

let inTok = 0, outTok = 0;
const tStart = Date.now();
const results = new Array(pairs.length);

async function processPair(idx) {
  const [a, b] = pairs[idx];
  const cacheBase = `${sourcePdf}#${pdfStamp}#p${a}-${b}`;
  try {
    let { data, usage } = await extractPair(pages[a], pages[b], MODEL, cacheBase);
    if (usage) { inTok += usage.input_tokens || 0; outTok += usage.output_tokens || 0; }
    if (!data.skip && validateExercise(data).length) {
      const fb = await extractPair(pages[a], pages[b], OPUS_MODEL, cacheBase + "#opus");
      if (fb.usage) { inTok += fb.usage.input_tokens || 0; outTok += fb.usage.output_tokens || 0; }
      if (!fb.data.skip && validateExercise(normalizeExercise(fb.data)).length < validateExercise(normalizeExercise(data)).length) data = fb.data;
    }
    if (data && !data.skip) normalizeExercise(data);
    results[idx] = { pair: idx + 1, pageA: a + 1, data };
  } catch (e) {
    results[idx] = { pair: idx + 1, pageA: a + 1, error: e.message };
  }
}

const queue = Array.from(pairs.keys());
async function worker() { let i; while ((i = queue.shift()) !== undefined) await processPair(i); }
await Promise.all(Array.from({ length: Math.min(concurrency, pairs.length) }, worker));
console.log(`extracted ${pairs.length} pair(s) in ${((Date.now() - tStart) / 1000).toFixed(1)}s\n`);

// Preload existing signatures (cross-PDF dedup / verify)
const dbBySig = new Map();
if (!dryRun) {
  const rows = await runSql(`select e.title, e.source_pdf,
    coalesce((select json_agg(json_build_object('letter',h.letter,'text',h.text) ) from lesen_t1_headlines h where h.exercise_id=e.id),'[]'::json) as headlines,
    coalesce((select json_agg(json_build_object('position',x.position,'content',x.content,'correct_headline',x.correct_headline) order by x.position) from lesen_t1_texts x where x.exercise_id=e.id),'[]'::json) as texts
    from lesen_exercises e where e.teil=1;`);
  for (const r of rows) dbBySig.set(fullSig({ headlines: r.headlines, texts: r.texts }), r);
}

if (verify) {
  const assembled = new Map();
  let invalid = 0;
  for (const r of results) {
    if (!r.data || r.data.skip || r.error || validateExercise(r.data).length) { invalid++; continue; }
    assembled.set(fullSig(r.data), r);
  }
  const dbThis = new Map();
  for (const [sig, r] of dbBySig) if (r.source_pdf === sourcePdf) dbThis.set(sig, r);
  const missing = [...assembled.keys()].filter((s) => !dbThis.has(s));
  const extra = [...dbThis.keys()].filter((s) => !assembled.has(s));
  console.log(`── VERIFY ${sourcePdf} ──`);
  console.log(`pairs=${pairs.length} invalid/review=${invalid} unique-assembled=${assembled.size} db=${dbThis.size} matched=${assembled.size - missing.length} missing=${missing.length} extra=${extra.length}`);
  if (missing.length) for (const s of missing) console.log(`  MISSING: "${assembled.get(s).data.title}" (pair pg ${assembled.get(s).pageA})`);
  if (extra.length) for (const s of extra) console.log(`  EXTRA: "${dbThis.get(s).title}"`);
  if (!missing.length && !extra.length) console.log("RESULT: OK — DB content is an EXACT match of the PDF-derived exercises.");
  process.exit(missing.length || extra.length ? 1 : 0);
}

// Insert
let imported = 0, skipped = 0, review = 0, dups = 0;
const reviewList = [];
const seen = new Set(dbBySig.keys());
for (const r of results) {
  const label = `pair ${r.pair} (pages ${r.pageA}-${r.pageA + 1})`;
  if (r.error) { console.log(`✗ ${label}: ERROR ${r.error}`); review++; reviewList.push({ label, why: r.error }); continue; }
  if (r.data.skip) { console.log(`• ${label}: skipped (not a Teil 1 exercise)`); skipped++; continue; }
  const errs = validateExercise(r.data);
  const titleShown = r.data.title ? `"${r.data.title}"` : "(no title)";
  if (errs.length) { console.log(`⚠ ${label}: NEEDS REVIEW ${titleShown} — ${errs.join("; ")}`); review++; reviewList.push({ label, why: errs.join("; ") }); continue; }
  const sig = fullSig(r.data);
  if (seen.has(sig)) { console.log(`• ${label}: duplicate ${titleShown} — skipped`); dups++; continue; }
  seen.add(sig);
  if (dryRun) { console.log(`✓ ${label}: ${titleShown} — answers ${r.data.texts.slice().sort((a,b)=>a.position-b.position).map((t)=>t.correct_headline).join("")} (dry run)`); imported++; continue; }
  try {
    const res = await insertExercise(r.data, sourcePdf);
    console.log(`✓ ${label}: imported as "${res?.[0]?.result?.title}" — answers ${r.data.texts.slice().sort((a,b)=>a.position-b.position).map((t)=>t.correct_headline).join("")}`);
    imported++;
  } catch (e) { console.log(`✗ ${label}: ERROR ${e.message}`); review++; reviewList.push({ label, why: e.message }); }
}

console.log(`\n── Summary: ${sourcePdf} ──`);
console.log(`pairs=${pairs.length} imported=${imported} duplicates=${dups} skipped=${skipped} review=${review}  tokens in=${inTok} out=${outTok}`);
if (reviewList.length) { console.log("needs review:"); for (const r of reviewList) console.log(`  - ${r.label}: ${r.why}`); }

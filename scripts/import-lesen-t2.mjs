/**
 * Headless importer for TELC B2 Lesen Teil 2 (Engineering Spec §16/§17/§21/§27).
 *
 * Robust per-page pipeline: Poppler rasterizes every page → Claude vision
 * CLASSIFIES each page (passage / questions / other) and extracts it verbatim
 * via forced tool-use → each questions page is paired with the most recent
 * passage page to form one exercise (handles variant versions, multi-page and
 * irregular layouts that break naive 2-page pairing) → strict validation →
 * duplicate detection (same passage AND questions) → atomic insert.
 *
 * Never invents content/titles. Questions with an uncertain answer key, or
 * incomplete exercises, are reported for manual review and NOT imported (§21).
 * Titles come only from the PDF; empty stays empty; distinct same-title
 * exercises are auto-numbered server-side (§17).
 *
 * Usage:
 *   bun scripts/import-lesen-t2.mjs "<pdf path>" [--max-pages N] [--replace] [--dry-run]
 */
import { readFileSync, mkdtempSync, mkdirSync, existsSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

// Persistent classification cache keyed by page-image content + model + prompt
// version: re-runs (after a crash, a fixed bug, or --replace) skip the API
// entirely for unchanged pages — near-instant and free. Bump PROMPT_VERSION to
// invalidate when the extraction prompt/schema changes; --no-cache bypasses.
const PROMPT_VERSION = "perpage-v2";
const CACHE_DIR = join(process.env.LOCALAPPDATA || tmpdir(), "lesen-import-cache");
mkdirSync(CACHE_DIR, { recursive: true });
const useCache = !process.argv.includes("--no-cache");

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

const pdfPath  = process.argv[2];
const maxPages = (() => { const i = process.argv.indexOf("--max-pages"); return i > 0 ? parseInt(process.argv[i + 1], 10) : Infinity; })();
const dryRun   = process.argv.includes("--dry-run");
const replace  = process.argv.includes("--replace");
const concurrency = (() => { const i = process.argv.indexOf("--concurrency"); return i > 0 ? Math.max(1, parseInt(process.argv[i + 1], 10)) : 6; })();

if (!pdfPath) { console.error('Usage: bun scripts/import-lesen-t2.mjs "<pdf>" [--max-pages N] [--replace] [--dry-run]'); process.exit(1); }
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
  const dir = mkdtempSync(join(tmpdir(), "lesen-t2-"));
  execFileSync(POPPLER_BIN, ["-png", "-r", "150", pdf, join(dir, "p")], { stdio: "pipe" });
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort((a, b) => parseInt(a.match(/(\d+)\.png$/)[1], 10) - parseInt(b.match(/(\d+)\.png$/)[1], 10))
    .map((f) => join(dir, f));
}

const PAGE_PROMPT = `This is ONE scanned page of an official TELC B2 "Leseverstehen, Teil 2" exam booklet (a SOLVED copy: the correct answer on questions pages is marked with a RED BOX / red outline around the correct option letter).

Classify this page and extract it VERBATIM (no translation, paraphrase, summary, or spelling correction; preserve German text and paragraphs with \\n):
- kind="passage": a reading article — has a printed headline title and article text, NO numbered multiple-choice questions. Put the headline in "title" (verbatim; "" if there is genuinely no printed title) and the full article in "passage".
- kind="questions": contains the multiple-choice questions (numbered 6–10), each with options a/b/c; the correct option is red-boxed. Put them in "questions".
- kind="other": cover, instructions-only, answer-key table, or blank.

Only set "correct" when you can see the red box clearly; otherwise null.`;

async function classifyPage(imgPath, model = MODEL, cacheBase = null) {
  const bytes = readFileSync(imgPath);
  // Deterministic cache key: Poppler PNG bytes vary run-to-run, so key by the
  // stable source identity (pdf + size + page) when provided.
  const keyMaterial = cacheBase ?? bytes;
  const cacheFile = join(CACHE_DIR, createHash("sha256").update(model).update(PROMPT_VERSION).update(keyMaterial).digest("hex") + ".json");
  if (useCache && existsSync(cacheFile)) {
    return { data: JSON.parse(readFileSync(cacheFile, "utf8")), usage: null, cached: true };
  }
  const image = { type: "image", source: { type: "base64", media_type: "image/png", data: bytes.toString("base64") } };
  const tool = {
    name: "submit_page",
    description: "Submit the classification + verbatim extraction of one exam page.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["passage", "questions", "other"] },
        title: { type: "string", description: "passage headline verbatim, or empty string" },
        passage: { type: "string", description: "full article text verbatim (passage pages only)" },
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              number: { type: "integer" },
              question: { type: "string" },
              option_a: { type: "string" }, option_b: { type: "string" }, option_c: { type: "string" },
              correct: { type: ["string", "null"], enum: ["a", "b", "c", null] },
            },
            required: ["number", "question", "option_a", "option_b", "option_c", "correct"],
          },
        },
      },
      required: ["kind"],
    },
  };
  const body = { model, max_tokens: 8192, tools: [tool], tool_choice: { type: "tool", name: "submit_page" },
    messages: [{ role: "user", content: [{ type: "text", text: PAGE_PROMPT }, image] }] };
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

function validateExercise(ex) {
  const errs = [];
  if (!ex.passage || !ex.passage.trim()) errs.push("empty passage");
  const qs = Array.isArray(ex.questions) ? ex.questions : [];
  if (qs.length !== 5) errs.push(`${qs.length}/5 questions`);
  qs.forEach((q) => {
    const n = q.number;
    if (!q.question?.trim()) errs.push(`Q${n}: empty text`);
    if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim()) errs.push(`Q${n}: empty option`);
    if (!["a", "b", "c"].includes((q.correct || "").toLowerCase())) errs.push(`Q${n}: answer not detected`);
  });
  return errs;
}

// Signature spans passage + question texts so variant exercises (same article,
// different questions) are kept; only exact duplicates are skipped.
const sig = (ex) => {
  const base = (ex.passage || "") + "|" + (ex.questions || []).map((q) => q.question || "").join("|");
  return base.toLowerCase().replace(/[^a-z0-9äöüß]/g, "").slice(0, 400);
};

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");

async function insertExercise(ex, sourcePdf) {
  const questions = ex.questions.map((q) => ({
    number: q.number, question: q.question,
    option_a: q.option_a, option_b: q.option_b, option_c: q.option_c,
    correct: (q.correct || "").toLowerCase(),
  }));
  const sql =
    `select import_lesen_t2_exercise_admin(` +
    `'${CREATED_BY}'::uuid,` +
    `convert_from(decode('${b64(ex.title || "")}','base64'),'UTF8'),` +
    `convert_from(decode('${b64(ex.passage)}','base64'),'UTF8'),` +
    `convert_from(decode('${b64(JSON.stringify(questions))}','base64'),'UTF8')::jsonb,` +
    `convert_from(decode('${b64(sourcePdf)}','base64'),'UTF8')` +
    `) as result;`;
  return runSql(sql);
}

// ── main ──
const sourcePdf = pdfPath.split(/[\\/]/).pop();
const pdfStamp = statSync(pdfPath).size;
console.log(`\n=== Importing: ${sourcePdf} (model=${MODEL}${dryRun ? ", DRY RUN" : ""}) ===`);

if (replace && !dryRun) {
  const del = await runSql(`delete from lesen_exercises where teil=2 and source_pdf=convert_from(decode('${b64(sourcePdf)}','base64'),'UTF8') returning id;`);
  console.log(`--replace: cleared ${del.length} existing exercise(s) from this source PDF`);
}

const seenSigs = new Set();
if (!dryRun) {
  const rows = await runSql(`select p.passage, (select coalesce(string_agg(q.question, '|' order by q.number),'') from lesen_t2_questions q where q.exercise_id=e.id) as qtext from lesen_t2_passages p join lesen_exercises e on e.id=p.exercise_id where e.teil=2;`);
  for (const r of rows) seenSigs.add(sig({ passage: r.passage, questions: (r.qtext || "").split("|").map((q) => ({ question: q })) }));
}

const pages = rasterize(pdfPath).slice(0, maxPages === Infinity ? undefined : maxPages);
console.log(`rasterized ${pages.length} pages — classifying each…\n`);

// Pass 1: classify every page — parallelized with a concurrency pool. Pages are
// independent, so throughput scales ~concurrency× vs the sequential version.
const classified = new Array(pages.length);
let inTok = 0, outTok = 0;
const tClassify = Date.now();

async function classifyOne(i) {
  const cacheBase = `${sourcePdf}#${pdfStamp}#p${i}`;
  try {
    let { data, usage } = await classifyPage(pages[i], MODEL, cacheBase);
    if (usage) { inTok += usage.input_tokens || 0; outTok += usage.output_tokens || 0; }
    // §27 fallback: if Sonnet's extraction is low-confidence (a questions page
    // with <5 questions, or a passage page with no text), re-extract with Opus.
    const weakQuestions = data.kind === "questions" && (
      !Array.isArray(data.questions) || data.questions.length < 5 ||
      data.questions.some((q) => !["a", "b", "c"].includes((q.correct || "").toLowerCase()))
    );
    const weakPassage   = data.kind === "passage" && (!data.passage || !data.passage.trim());
    if (weakQuestions || weakPassage) {
      const fb = await classifyPage(pages[i], OPUS_MODEL, cacheBase);
      if (fb.usage) { inTok += fb.usage.input_tokens || 0; outTok += fb.usage.output_tokens || 0; }
      const fbq = Array.isArray(fb.data.questions) ? fb.data.questions.length : 0;
      if ((fb.data.kind === "questions" && fbq >= 5) || (fb.data.kind === "passage" && fb.data.passage?.trim()) || fb.data.kind === "other") {
        console.log(`  page ${String(i + 1).padStart(2)}: ${data.kind} weak → opus fallback → ${fb.data.kind}${fb.data.kind === "questions" ? ` (${fbq} q)` : ""}`);
        classified[i] = fb.data;
        return;
      }
    }
    const nq = Array.isArray(data.questions) ? data.questions.length : 0;
    console.log(`  page ${String(i + 1).padStart(2)}: ${data.kind}${data.kind === "passage" && data.title ? ` "${data.title.slice(0, 48)}"` : ""}${data.kind === "questions" ? ` (${nq} q)` : ""}`);
    classified[i] = data;
  } catch (e) {
    console.log(`  page ${String(i + 1).padStart(2)}: ERROR ${e.message}`);
    classified[i] = { kind: "other", _error: e.message };
  }
}

const queue = Array.from(pages.keys());
async function worker() { let i; while ((i = queue.shift()) !== undefined) await classifyOne(i); }
await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, worker));

const classifySecs = (Date.now() - tClassify) / 1000;
console.log(`\nclassified ${pages.length} pages in ${classifySecs.toFixed(1)}s (concurrency=${concurrency} → ${(classifySecs / pages.length).toFixed(2)}s/page)`);

// Pass 2: assemble exercises — pair each questions page with the most recent passage
const exercises = [];
let lastPassage = null;
classified.forEach((p, idx) => {
  if (p.kind === "passage" && p.passage?.trim()) {
    lastPassage = { title: p.title || "", passage: p.passage };
  } else if (p.kind === "questions" && Array.isArray(p.questions) && p.questions.length) {
    exercises.push({ page: idx + 1, title: lastPassage?.title ?? "", passage: lastPassage?.passage ?? "", questions: p.questions, orphan: !lastPassage });
  }
});

// Pass 3: validate, dedup, insert
let imported = 0, skipped = 0, review = 0;
const reviewList = [];
console.log(`\nassembled ${exercises.length} exercise(s) from ${pages.length} pages\n`);
for (const ex of exercises) {
  const titleShown = ex.title ? `"${ex.title}"` : "(no title)";
  const label = `exercise @ questions p${ex.page}`;
  if (ex.orphan) { console.log(`⚠ ${label}: NEEDS REVIEW — questions with no preceding passage`); review++; reviewList.push({ label, errs: ["no passage"] }); continue; }
  const errs = validateExercise(ex);
  if (errs.length) { console.log(`⚠ ${label}: NEEDS REVIEW ${titleShown} — ${errs.join("; ")}`); review++; reviewList.push({ label, errs }); continue; }
  const s = sig(ex);
  if (seenSigs.has(s)) { console.log(`• ${label}: duplicate ${titleShown} — skipped`); skipped++; continue; }
  seenSigs.add(s);
  if (dryRun) { console.log(`✓ ${label}: ${titleShown} — answers ${ex.questions.map((q) => q.correct).join("")} (dry run)`); imported++; continue; }
  try {
    const r = await insertExercise(ex, sourcePdf);
    console.log(`✓ ${label}: imported as "${r?.[0]?.result?.title}" — answers ${ex.questions.map((q) => q.correct).join("")}`);
    imported++;
  } catch (e) { console.log(`✗ ${label}: ERROR ${e.message}`); review++; reviewList.push({ label, errs: [e.message] }); }
}

console.log(`\n── Summary: ${sourcePdf} ──`);
console.log(`pages=${pages.length} assembled=${exercises.length} imported=${imported} duplicates=${skipped} review=${review}  tokens in=${inTok} out=${outTok}`);
if (reviewList.length) { console.log("needs review:"); for (const r of reviewList) console.log(`  - ${r.label}: ${r.errs.join("; ")}`); }

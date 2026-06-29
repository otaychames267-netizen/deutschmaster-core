/**
 * Headless importer for TELC B2 Lesen Teil 2 (Engineering Spec §16/§17/§21/§27).
 *
 * Pipeline: Poppler rasterizes each page → pages are paired (passage page +
 * questions page) → Claude vision extracts the printed title, passage, and the
 * 5 questions with the RED-BOXED official answer key → strict validation →
 * atomic insert via import_lesen_t2_exercise_admin (Management API).
 *
 * Never invents content or titles. Exercises with a missing/uncertain answer
 * key are reported for manual review and NOT imported (§21). Titles come only
 * from the PDF; empty stays empty; duplicates auto-number server-side (§17).
 *
 * Usage:
 *   bun scripts/import-lesen-t2.mjs "<pdf path>" [--max-pairs N] [--dry-run]
 */
import { readFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// ── env ──
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
const CREATED_BY    = process.env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER_BIN   = process.env.POPPLER_BIN || "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftoppm.exe";

const pdfPath = process.argv[2];
const maxPairs = (() => { const i = process.argv.indexOf("--max-pairs"); return i > 0 ? parseInt(process.argv[i + 1], 10) : Infinity; })();
const dryRun = process.argv.includes("--dry-run");
const replace = process.argv.includes("--replace");

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

if (!pdfPath) { console.error("Usage: bun scripts/import-lesen-t2.mjs \"<pdf>\" [--max-pairs N] [--dry-run]"); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error("ANTHROPIC_API_KEY missing"); process.exit(1); }
if (!dryRun && (!SBP_TOKEN || !PROJECT_REF)) { console.error("SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF missing"); process.exit(1); }

// ── rasterize ──
function rasterize(pdf) {
  const dir = mkdtempSync(join(tmpdir(), "lesen-t2-"));
  execFileSync(POPPLER_BIN, ["-png", "-r", "150", pdf, join(dir, "p")], { stdio: "pipe" });
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort((a, b) => {
    const na = parseInt(a.match(/(\d+)\.png$/)[1], 10); const nb = parseInt(b.match(/(\d+)\.png$/)[1], 10);
    return na - nb;
  });
  return files.map((f) => join(dir, f));
}

// ── Claude vision extraction for one passage+questions pair ──
const PROMPT = `You are extracting ONE official TELC B2 "Leseverstehen, Teil 2" exercise from two scanned pages of a SOLVED exam copy.

Page 1 = the reading passage. Page 2 = the 5 questions (numbered 6 to 10), each with options a, b, c. The CORRECT answer for each question is marked with a RED BOX / red outline around the correct option's letter.

Extract EXACTLY what is printed. Do NOT translate, paraphrase, summarize, correct spelling, or invent anything. Preserve the German text verbatim. Preserve passage paragraphs using \\n.

Return ONLY this JSON (no prose, no markdown):
{
  "title": "the printed headline/title at the top of the passage, verbatim; empty string \\"\\" if there is no printed title",
  "passage": "the full passage text, verbatim",
  "questions": [
    { "number": 6, "question": "...", "option_a": "...", "option_b": "...", "option_c": "...", "correct": "a|b|c the option marked with the red box, or null if you cannot tell for certain" }
  ]
}
There must be exactly 5 questions (6,7,8,9,10). If a page is not a Teil 2 exercise, return {"skip": true}.`;

async function extractPair(imgPathA, imgPathB) {
  const images = [imgPathA, imgPathB].map((p) => ({
    type: "image",
    source: { type: "base64", media_type: "image/png", data: readFileSync(p).toString("base64") },
  }));
  // Forced tool-use guarantees a well-formed JSON object (the API handles all
  // string escaping) — robust against German typographic quotes in the text.
  const tool = {
    name: "submit_exercise",
    description: "Submit one extracted TELC Lesen Teil 2 exercise verbatim.",
    input_schema: {
      type: "object",
      properties: {
        skip: { type: "boolean", description: "true if these pages are not a Teil 2 exercise" },
        title: { type: "string", description: "printed title verbatim, or empty string if none" },
        passage: { type: "string", description: "full passage text verbatim, paragraphs separated by \\n" },
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              number: { type: "integer" },
              question: { type: "string" },
              option_a: { type: "string" },
              option_b: { type: "string" },
              option_c: { type: "string" },
              correct: { type: ["string", "null"], enum: ["a", "b", "c", null], description: "the red-boxed option, or null if uncertain" },
            },
            required: ["number", "question", "option_a", "option_b", "option_c", "correct"],
          },
        },
      },
      required: ["passage", "questions"],
    },
  };
  const body = {
    model: MODEL,
    max_tokens: 8192,
    temperature: 0,
    tools: [tool],
    tool_choice: { type: "tool", name: "submit_exercise" },
    messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, ...images] }],
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
      if (json.stop_reason === "max_tokens") throw new Error("response truncated (max_tokens) — passage too long");
      const block = (json.content || []).find((b) => b.type === "tool_use");
      if (!block) throw new Error("no tool_use block in response");
      return { data: block.input, usage: json.usage };
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

function validate(ex) {
  const errs = [];
  if (!ex || typeof ex !== "object") return ["no data"];
  if (!ex.passage || !ex.passage.trim()) errs.push("empty passage");
  const qs = ex.questions || [];
  if (qs.length !== 5) errs.push(`${qs.length}/5 questions`);
  qs.forEach((q) => {
    const n = q.number;
    if (!q.question?.trim()) errs.push(`Q${n}: empty text`);
    if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim()) errs.push(`Q${n}: empty option`);
    if (!["a", "b", "c"].includes((q.correct || "").toLowerCase())) errs.push(`Q${n}: answer not detected`);
  });
  return errs;
}

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
console.log(`\n=== Importing: ${sourcePdf} (model=${MODEL}${dryRun ? ", DRY RUN" : ""}) ===`);
if (replace && !dryRun) {
  const del = await runSql(`delete from lesen_exercises where teil=2 and source_pdf=convert_from(decode('${b64(sourcePdf)}','base64'),'UTF8') returning id;`);
  console.log(`--replace: cleared ${del.length} existing exercise(s) from this source PDF`);
}
const pages = rasterize(pdfPath);
console.log(`rasterized ${pages.length} pages → ${Math.min(Math.floor(pages.length / 2), maxPairs)} pair(s) to process\n`);

let imported = 0, skipped = 0, review = 0, inTok = 0, outTok = 0;
const reviewList = [];

for (let i = 0, pair = 0; i + 1 < pages.length && pair < maxPairs; i += 2, pair++) {
  const label = `pair ${pair + 1} (pages ${i + 1}-${i + 2})`;
  try {
    const { data: ex, usage } = await extractPair(pages[i], pages[i + 1]);
    if (usage) { inTok += usage.input_tokens || 0; outTok += usage.output_tokens || 0; }
    if (ex?.skip) { console.log(`• ${label}: skipped (not a Teil 2 exercise)`); skipped++; continue; }
    const errs = validate(ex);
    const titleShown = ex.title ? `"${ex.title}"` : "(no title)";
    if (errs.length) {
      console.log(`⚠ ${label}: NEEDS REVIEW ${titleShown} — ${errs.join("; ")}`);
      review++; reviewList.push({ label, title: ex.title, errs });
      continue;
    }
    if (dryRun) {
      console.log(`✓ ${label}: ${titleShown} — 5 questions, answers ${ex.questions.map((q) => q.correct).join("")} (dry run, not inserted)`);
      imported++;
    } else {
      const r = await insertExercise(ex, sourcePdf);
      const saved = r?.[0]?.result?.title;
      console.log(`✓ ${label}: imported as "${saved}" — answers ${ex.questions.map((q) => q.correct).join("")}`);
      imported++;
    }
  } catch (e) {
    console.log(`✗ ${label}: ERROR ${e.message}`);
    review++; reviewList.push({ label, error: e.message });
  }
}

console.log(`\n── Summary: ${sourcePdf} ──`);
console.log(`imported=${imported} review=${review} skipped=${skipped}  tokens in=${inTok} out=${outTok}`);
if (reviewList.length) {
  console.log(`needs review:`);
  for (const r of reviewList) console.log(`  - ${r.label}: ${r.errs ? r.errs.join("; ") : r.error}`);
}

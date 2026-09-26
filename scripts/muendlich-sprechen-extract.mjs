/**
 * Merge + validate + insert the vision-extracted Sprechen Teil 2/3 content
 * (57 pages, extracted in 3 parallel batches into the scratchpad — see the
 * per-page JSON schema documented inline below) into muendlich_materials.
 *
 * Usage:
 *   node scripts/muendlich-sprechen-extract.mjs review   # merge + dedupe + write backups/ JSON, no DB writes
 *   node scripts/muendlich-sprechen-extract.mjs insert    # same, then insert into muendlich_materials via the Management API
 */
import { readFileSync, writeFileSync } from "node:fs";

const SCRATCH = "C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus-AuraLingovia/d62fd849-b08b-4a27-a94b-dd84844ba827/scratchpad";
const SOURCE_PDF = "Sprechen teil 2 und 3 copy (1).pdf";
const OUT_DIR = new URL("../backups/muendlich/sprechen/", import.meta.url);

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
  } catch { /* rely on real env vars */ }
}

function normTitle(t) {
  return (t ?? "").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

const parts = [1, 2, 3].map((n) => JSON.parse(readFileSync(`${SCRATCH}/sprechen_extract_part${n}.json`, "utf8")));
const pages = parts.flat().sort((a, b) => a.page - b.page);

if (pages.length !== 57 || pages.some((p, i) => p.page !== i + 1)) {
  console.error(`Page sequence check failed: got ${pages.length} entries, pages ${pages.map((p) => p.page).join(",")}`);
  process.exit(1);
}

// Dedupe by (teil, normalized title) — keep first occurrence, drop the rest.
// The extraction agents already flagged known duplicates in `notes`; this is
// the mechanical enforcement across the *full* range (agents only compared
// within their own ~19-page slice).
const seen = new Map(); // key -> page number of first occurrence
const rows = [];
const dropped = [];

for (const p of pages) {
  for (const teil of [2, 3]) {
    const entry = p[`teil${teil}`];
    if (!entry || !entry.title) continue;
    const key = `${teil}:${normTitle(entry.title)}`;
    if (seen.has(key)) {
      dropped.push({ page: p.page, teil, title: entry.title, duplicateOfPage: seen.get(key) });
      continue;
    }
    seen.set(key, p.page);
    rows.push({
      teil,
      category: "themen",
      title: entry.title.trim(),
      body_text: entry.body_text?.trim() ?? null,
      difficulty_level: entry.difficulty_level ?? null,
      theme_category: entry.theme_category ?? null,
      key_arguments: teil === 2 ? (entry.key_arguments ?? null) : null,
      source_pdf: SOURCE_PDF,
      position: p.page,
    });
  }
}

const missing = pages
  .flatMap((p) => [2, 3].map((teil) => (!p[`teil${teil}`] ? { page: p.page, teil } : null)))
  .filter(Boolean);

const summary = {
  pagesProcessed: pages.length,
  rowsToInsert: rows.length,
  teil2Count: rows.filter((r) => r.teil === 2).length,
  teil3Count: rows.filter((r) => r.teil === 3).length,
  droppedDuplicates: dropped,
  missingSections: missing,
  difficultyBreakdown: rows.reduce((acc, r) => { acc[r.difficulty_level ?? "?"] = (acc[r.difficulty_level ?? "?"] ?? 0) + 1; return acc; }, {}),
  themeBreakdown: rows.reduce((acc, r) => { acc[r.theme_category ?? "?"] = (acc[r.theme_category ?? "?"] ?? 0) + 1; return acc; }, {}),
};

writeFileSync(new URL("reviewed_pages.json", OUT_DIR), JSON.stringify(pages, null, 2), "utf8");
writeFileSync(new URL("materials_insert.json", OUT_DIR), JSON.stringify(rows, null, 2), "utf8");
writeFileSync(new URL("summary.json", OUT_DIR), JSON.stringify(summary, null, 2), "utf8");

console.log(JSON.stringify(summary, null, 2));

const mode = process.argv[2];
if (mode !== "insert") {
  console.log("\nReview-only mode. Re-run with 'insert' to write these rows into muendlich_materials.");
  process.exit(0);
}

loadEnv();
const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) { console.error("Missing SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN"); process.exit(1); }

function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `ARRAY[${v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(",")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const values = rows.map((r) =>
  `(${r.teil}, ${esc(r.category)}, ${esc(r.title)}, ${esc(r.body_text)}, ${esc(r.difficulty_level)}, ${esc(r.theme_category)}, ${esc(r.key_arguments)}, ${esc(r.source_pdf)}, ${esc(r.position)})`
).join(",\n");

const sql = `insert into public.muendlich_materials (teil, category, title, body_text, difficulty_level, theme_category, key_arguments, source_pdf, position)\nvalues\n${values};`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
if (!res.ok) { console.error(`Insert failed: ${res.status} ${await res.text()}`); process.exit(1); }
console.log(`\nInserted ${rows.length} rows into muendlich_materials.`);

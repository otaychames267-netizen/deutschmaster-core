/** Insert ONE Mündlich Teil 2 or Teil 3 topic into muendlich_materials
 * (category='themen'). Teil 2 = title only (displayed as a compact card in
 * Room 1 — do NOT put full text in title, it will visually break the
 * selection UI). Teil 3 = title + body_text (full short planning-prompt text,
 * rendered inside a micro-card).
 *
 * This is a TEMPLATE — content has not been extracted from the source PDF yet
 * ("Sprechen teil 2 und 3 copy (1).pdf", Desktop/TELC SPRECHEN TEIL 2 UND 3/,
 * 57 pages, scanned — will need the poppler-bbox+pixel pipeline used for
 * Hören, not a plain text-layer parse). Run per-item like every other import
 * script this session: dry run first, --apply to write.
 *
 * Data file format:
 *   {
 *     "teil": 2,                          // 2 or 3
 *     "title": "…",                        // Teil 2: short heading only. Teil 3: short topic label.
 *     "body_text": "…" | null,             // Teil 3 only: full planning-prompt text. MUST be null for Teil 2.
 *     "position": 1,                        // source PDF page/sequence order
 *     "source_pdf": "Sprechen teil 2 und 3 copy (1).pdf"
 *   }
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const FILE = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
if (!FILE) { console.error("usage: node scripts/muendlich-teil23-insert.mjs <data.json> [--apply] [--force]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const d = JSON.parse(readFileSync(FILE, "utf8"));
const errs = [];
if (![2, 3].includes(d.teil)) errs.push("teil must be 2 or 3 (Teil 1 is explicitly out of scope for now)");
if (!d.title || !String(d.title).trim()) errs.push("title required");
if (typeof d.position !== "number") errs.push("position (number) required");
if (d.teil === 2 && d.body_text) errs.push("Teil 2 is title-only in Room 1 — body_text must be null (a full text block will break the selection card UI)");
if (d.teil === 3 && (!d.body_text || !String(d.body_text).trim())) errs.push("Teil 3 requires body_text (the full short planning-prompt text shown in the micro-card)");
if (d.title && d.title.length > 120) errs.push(`title looks too long for a Teil ${d.teil} card (${d.title.length} chars) — check this isn't accidentally the full text block`);

if (errs.length) { console.error("VALIDATION FAILED:\n - " + errs.join("\n - ")); process.exit(1); }

console.log(`OK: Teil ${d.teil} — "${d.title}" (position ${d.position})${d.body_text ? `, body: ${d.body_text.length} chars` : ""}`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

const dup = await q(`select id from muendlich_materials where teil=${d.teil} and category='themen' and title=${S(d.title)};`);
if (dup.length && !FORCE) { console.error(`"${d.title}" already exists in Teil ${d.teil} (${dup[0].id}). Use --force to add anyway.`); process.exit(1); }

await q(`insert into muendlich_materials (teil, category, title, body_text, storage_path, sort_order, source_pdf, position)
  values (${d.teil}, 'themen', ${S(d.title)}, ${d.body_text ? S(d.body_text) : "NULL"}, NULL, ${d.position}, ${S(d.source_pdf || "")}, ${d.position});`);

console.log("Inserted.");

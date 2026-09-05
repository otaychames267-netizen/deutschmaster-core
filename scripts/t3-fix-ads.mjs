/** Rebuild Teil 3 advertisements from a faithful, image-transcribed JSON. Ads are
 * shared per exercise GROUP, so each entry lists the DB exercise numbers (created_at
 * order, 1-based) that share the same 12 ads. Replaces lesen_t3_texts for those
 * exercises ONLY (situations + keys untouched). Validates 12 ads a-l with title+body,
 * no instruction leakage, no Arabic, reasonable length. --apply to write.
 *
 * Data file format (array):
 *   { "ns":[1,2,3], "ads":[ {"letter":"A","title":"…","content":"…"}, … 12 ] }
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FILE = process.argv[2];
if (!FILE) { console.error("usage: bun scripts/t3-fix-ads.mjs <data.json> [--apply]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const data = JSON.parse(readFileSync(FILE, "utf8"));
const rows = await q(`select id, row_number() over (order by created_at) n from lesen_exercises where teil=3 order by created_at;`);
const idByN = new Map(rows.map(r => [Number(r.n), r.id]));

// validate
const errs = [];
for (const [i, g] of data.entries()) {
  const tag = `entry#${i} ns=${JSON.stringify(g.ns)}`;
  if (!Array.isArray(g.ns) || !g.ns.length) errs.push(`${tag}: ns required`);
  for (const n of g.ns || []) if (!idByN.has(n)) errs.push(`${tag}: no exercise n=${n}`);
  const letters = (g.ads || []).map(a => a.letter).join("");
  // Ads must be a subset of A..L in ascending order (most exercises have all 12;
  // a few legitimately omit some letters, e.g. n21 Berlin has 10: no G/H).
  const FULL = "ABCDEFGHIJKL";
  let ok = letters.length >= 1;
  for (let k = 0, p = -1; k < letters.length; k++) { const idx = FULL.indexOf(letters[k]); if (idx <= p) { ok = false; break; } p = idx; }
  if (!ok) errs.push(`${tag}: ads must be an ascending subset of A..L, got "${letters}"`);
  for (const a of g.ads || []) {
    if (!a.title && !a.content) errs.push(`${tag} ${a.letter}: empty`);
    if (!a.content || a.content.length < 15) errs.push(`${tag} ${a.letter}: body too short`);
    if (a.content && a.content.length > 1300) errs.push(`${tag} ${a.letter}: body suspiciously long (${a.content.length})`);
    if (/[؀-ۿ]/.test((a.title || "") + (a.content || ""))) errs.push(`${tag} ${a.letter}: contains Arabic`);
    if (/Lesen Sie zuerst|Info-Text nur einmal|Markieren Sie Ihre/.test((a.title || "") + (a.content || ""))) errs.push(`${tag} ${a.letter}: instruction text leaked`);
  }
}
if (errs.length) { console.error("VALIDATION FAILED:\n" + errs.join("\n")); process.exit(1); }
console.log(`Validated ${data.length} group(s), all ads well-formed (ascending subset of a-l).`);
if (!APPLY) { console.log("(dry run — re-run with --apply)"); process.exit(0); }

for (const g of data) {
  for (const n of g.ns) {
    const id = idByN.get(n);
    await q(`delete from lesen_t3_texts where exercise_id='${id}';`);
    const vals = g.ads.map(a => `('${id}','${a.letter}',${S(a.title || "")},${S(a.content || "")})`).join(",");
    await q(`insert into lesen_t3_texts (exercise_id,letter,title,content) values ${vals};`);
    console.log(`  n${n}: replaced ${g.ads.length} ads`);
  }
}
console.log(`APPLIED: rebuilt ads for ${data.reduce((s, g) => s + g.ns.length, 0)} exercise(s).`);

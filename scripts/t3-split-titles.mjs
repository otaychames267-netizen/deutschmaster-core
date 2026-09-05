/** Move an ad's heading out of its (already-correct) body into the `title` column.
 * For exercises whose ads were transcribed with the heading folded into `content`
 * (n26–n31), this splits title/body WITHOUT retyping bodies: it verifies the stored
 * content starts with the given title, then strips that prefix (+ following space or
 * newline). Empty title => left untouched (genuinely title-less prose ad, like n8).
 *
 * Data file: [ { "n": 26, "titles": { "B": "Herbstzeit ist Lesezeit!", "C": "…", … } } ]
 * Letters not listed, or mapped to "", stay title-less. --apply to write.
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const FILE = process.argv[2];
if (!FILE) { console.error("usage: bun scripts/t3-split-titles.mjs <data.json> [--apply]"); process.exit(1); }
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }

const data = JSON.parse(readFileSync(FILE, "utf8"));
const rows = await q(`select id, row_number() over (order by created_at) n from lesen_exercises where teil=3 order by created_at;`);
const idByN = new Map(rows.map(r => [Number(r.n), r.id]));

const errs = [], ops = [];
for (const g of data) {
  const id = idByN.get(g.n);
  if (!id) { errs.push(`no exercise n=${g.n}`); continue; }
  const texts = await q(`select letter, title, content from lesen_t3_texts where exercise_id='${id}' order by letter;`);
  for (const [letter, rawTitle] of Object.entries(g.titles || {})) {
    const title = (rawTitle || "").trim();
    if (!title) continue;
    const t = texts.find(x => x.letter === letter);
    if (!t) { errs.push(`n${g.n} ${letter}: no such ad`); continue; }
    const body = t.content ?? "";
    if (!body.startsWith(title)) { errs.push(`n${g.n} ${letter}: content does not start with title\n    title=${JSON.stringify(title)}\n    body =${JSON.stringify(body.slice(0, title.length + 10))}`); continue; }
    let rest = body.slice(title.length).replace(/^[ \t]*\n?/, "").replace(/^[ \t]+/, "");
    if (rest.length < 15) { errs.push(`n${g.n} ${letter}: remaining body too short`); continue; }
    ops.push({ n: g.n, id, letter, title, rest });
  }
}
if (errs.length) { console.error("VALIDATION FAILED:\n" + errs.join("\n")); process.exit(1); }
console.log(`Validated ${ops.length} title split(s) across ${data.length} exercise(s).`);
if (!APPLY) { console.log("(dry run — re-run with --apply)"); process.exit(0); }
for (const o of ops) {
  await q(`update lesen_t3_texts set title=${S(o.title)}, content=${S(o.rest)} where exercise_id='${o.id}' and letter='${o.letter}';`);
  console.log(`  n${o.n} ${o.letter}: title="${o.title.slice(0, 45)}"`);
}
console.log(`APPLIED: split ${ops.length} title(s).`);

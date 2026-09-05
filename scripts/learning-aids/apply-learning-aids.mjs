/** Bulk-write learning_aids JSONB for existing exercises.
 * Reads a merged JSON file shaped { "<exercise_id>": { translation?, items? }, ... }
 * and UPDATEs <table>.learning_aids for each id. Text is base64-encoded to avoid
 * any SQL-escaping issues with Arabic/German quotes.
 *
 * Usage: node scripts/learning-aids/apply-learning-aids.mjs <table> <mergedJsonFile> [--apply]
 * Dry run by default; pass --apply to write. Batches updates to avoid oversized requests.
 */
import { readFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
const [, , TABLE, FILE] = process.argv;
if (!TABLE || !FILE) { console.error("usage: node scripts/learning-aids/apply-learning-aids.mjs <table> <mergedJsonFile> [--apply]"); process.exit(1); }
const ALLOWED_TABLES = new Set(["lesen_exercises", "hoeren_exercises", "sb_exercises"]);
if (!ALLOWED_TABLES.has(TABLE)) { console.error(`table must be one of: ${[...ALLOWED_TABLES].join(", ")}`); process.exit(1); }

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return JSON.parse(t);
}

const data = JSON.parse(readFileSync(FILE, "utf8"));
const ids = Object.keys(data);
console.log(`${ids.length} exercises to update in ${TABLE} (from ${FILE})`);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for (const id of ids) {
  if (!UUID_RE.test(id)) { console.error(`Invalid id (not a UUID): ${id}`); process.exit(1); }
  const aids = data[id];
  if (!aids || typeof aids !== "object") { console.error(`Empty/invalid learning_aids for ${id}`); process.exit(1); }
}

if (!APPLY) {
  console.log("(dry run — pass --apply to write)");
  console.log("Sample:", JSON.stringify(data[ids[0]], null, 2).slice(0, 500));
  process.exit(0);
}

const BATCH = 15;
let done = 0;
for (let i = 0; i < ids.length; i += BATCH) {
  const chunk = ids.slice(i, i + BATCH);
  const stmts = chunk.map((id) => {
    const jsonStr = JSON.stringify(data[id]);
    return `update ${TABLE} set learning_aids = convert_from(decode('${b64(jsonStr)}','base64'),'UTF8')::jsonb where id = '${id}';`;
  }).join("\n");
  await q(stmts);
  done += chunk.length;
  console.log(`  ${done}/${ids.length} written`);
}
console.log(`Done: ${ids.length} exercises updated in ${TABLE}.`);

/** Merge new per-item fields (keywords/paraphrase/options_reasoning/
 * evidence_translation) into EXISTING learning_aids without touching
 * evidence_text/keyword/explanation_correct/explanation_wrong/translation
 * or any other already-authored content. Unlike apply-learning-aids.mjs
 * (full overwrite), this fetches the current row first and deep-merges.
 *
 * Input file shape: { "<exercise_id>": { "<item_key>": { keywords?,
 * paraphrase?, options_reasoning?, evidence_translation? }, ... }, ... }
 *
 * Usage: node scripts/learning-aids/merge-item-fields.mjs <table> <jsonFile> [--apply]
 * Dry run by default; pass --apply to write.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const APPLY = process.argv.includes("--apply");
const [, , TABLE, FILE] = process.argv;
if (!TABLE || !FILE) { console.error("usage: node scripts/learning-aids/merge-item-fields.mjs <table> <jsonFile> [--apply]"); process.exit(1); }
const ALLOWED_TABLES = new Set(["lesen_exercises", "hoeren_exercises", "sb_exercises"]);
if (!ALLOWED_TABLES.has(TABLE)) { console.error(`table must be one of: ${[...ALLOWED_TABLES].join(", ")}`); process.exit(1); }

const patch = JSON.parse(readFileSync(FILE, "utf8"));
const ids = Object.keys(patch);
console.log(`${ids.length} exercises to merge in ${TABLE} (from ${FILE})`);

let missing = 0, updated = 0;
for (const id of ids) {
  const { data: row, error } = await supabase.from(TABLE).select("learning_aids").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) { console.error(`  ! ${id}: exercise not found`); missing++; continue; }
  const current = row.learning_aids ?? { items: {} };
  const items = { ...(current.items ?? {}) };
  for (const [itemKey, newFields] of Object.entries(patch[id])) {
    items[itemKey] = { ...(items[itemKey] ?? {}), ...newFields };
  }
  const merged = { ...current, items };

  if (!APPLY) {
    console.log(`  (dry) ${id}: would merge ${Object.keys(patch[id]).length} item(s)`);
    continue;
  }
  const { error: upErr } = await supabase.from(TABLE).update({ learning_aids: merged }).eq("id", id);
  if (upErr) throw upErr;
  updated++;
  console.log(`  ${updated}/${ids.length - missing} merged (${id})`);
}

if (!APPLY) console.log("(dry run — pass --apply to write)");
else console.log(`Done: ${updated} exercises merged in ${TABLE}. ${missing} missing.`);

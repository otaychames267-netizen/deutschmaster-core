/**
 * One-off Phase 6 fix: 21 Lesen T1 evidence_text values were authored as
 * "first clause...later clause" excerpts spanning two non-adjacent
 * sentences, so they're not a genuine contiguous substring of the source
 * text and HighlightedText's indexOf match silently fails to highlight
 * them. This keeps only the first clause (already a complete, independently
 * supporting sentence in every case checked) and verifies it's a real
 * substring before writing anything back. Touches ONLY evidence_text —
 * explanation/keyword/translation fields are untouched.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const exerciseIds = [
  "9770e950-d264-4599-a79d-293108754a2f", // Benzin
  "861d8f9c-3c03-4756-a01e-72836605a108", // Baby TV
  "43c5ea8b-0621-4130-a984-c9e0ae2c70e2", // Bäder
  "31f04070-e33d-40ab-879c-11399b643e94", // Auf dem Weg
  "9c453df2-5867-4380-81e6-42bafaadbce6", // Bilder
  "9549bea2-30a6-4a69-80c3-9a801234e1c9", // Bienen
  "6669bbcc-eb8a-421c-bd99-64f4fee14458", // Autos
];

let fixedCount = 0;
let skippedCount = 0;

for (const exId of exerciseIds) {
  const { data: ex, error: exErr } = await supabase.from("lesen_exercises").select("id, title, learning_aids").eq("id", exId).single();
  if (exErr) { console.error("fetch failed", exId, exErr.message); continue; }
  const { data: texts } = await supabase.from("lesen_t1_texts").select("position, content").eq("exercise_id", exId);
  const byPos = Object.fromEntries((texts ?? []).map((t) => [String(t.position), t.content]));

  const items = ex.learning_aids?.items ?? {};
  let changed = false;
  for (const [key, item] of Object.entries(items)) {
    const ev = item.evidence_text;
    if (!ev || !ev.includes("...")) continue;
    const firstClause = ev.split(/\s*\.\.\.\s*/)[0].trim();
    const source = byPos[key];
    if (source && firstClause.length >= 15 && source.includes(firstClause)) {
      console.log(`FIX  ${ex.title} #${key}: "${ev.slice(0, 50)}..." -> "${firstClause.slice(0, 60)}"`);
      item.evidence_text = firstClause;
      changed = true;
      fixedCount++;
    } else {
      console.log(`SKIP ${ex.title} #${key}: first clause not found verbatim either — needs manual review`);
      skippedCount++;
    }
  }

  if (changed) {
    const { error: updErr } = await supabase.from("lesen_exercises").update({ learning_aids: ex.learning_aids }).eq("id", exId);
    if (updErr) console.error("update failed", exId, updErr.message);
  }
}

console.log(`\nFixed ${fixedCount} item(s), ${skippedCount} skipped for manual review.`);

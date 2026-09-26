/**
 * Adds merke_type ("grammar" | "fixed_expression") to every already-
 * retrofitted sb_exercises.learning_aids gap (see retrofit-sb-explanations.mjs).
 * Classified from the ORIGINAL (pre-retrofit) explanation text saved in
 * _sb_full_dump.json -- that text is where the earlier authoring pass
 * itself already said "تعبير ثابت"/"تركيب ثابت"/"تعبير اصطلاحي" (fixed
 * expression / fixed construction / idiomatic expression) for genuine
 * collocations (einen Weg finden + wie, sich freuen auf, in Höhe von...),
 * and used different terminology (حرف جر / أداة ربط / صفة / فعل + tense)
 * for general grammar rules (prepositions, connectors incl. two-part
 * correlatives like sowohl...als auch, case/declension, tense/mood, word
 * order) -- verified this session by surveying all "ثابت"-context phrases
 * across the full 1199-gap dataset: no double-connector or bare-preposition
 * entry ever co-occurs with "ثابت"/"اصطلاحي", only genuine collocations do.
 *
 * Dry run by default. Usage:
 *   node scripts/learning-aids/classify-sb-merke-type.mjs [--apply]
 */
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return JSON.parse(t);
}

const FIXED_MARKER = /ثابت|اصطلاحي/;
// "ثابت" is ambiguous in Arabic: it means "fixed/set" (the linguistic term,
// e.g. تعبير ثابت "fixed expression") in the vast majority of occurrences,
// but a handful of entries use it in the unrelated sense of "stable/
// unchanging" describing a grammatical STATE (حالة ثابتة "a stable state",
// e.g. Zustandspassiv vs. Vorgangspassiv explanations) -- confirmed by
// checking every occurrence this session: exactly 3 of 451 marker-hits were
// this false-positive pattern, all pure verb-tense/voice grammar with no
// genuine collocation anywhere else in the same text. Stripped before
// testing so those 3 correctly fall through to "grammar".
const STABLE_STATE_FALSE_POSITIVE = /حال[ةه]\s*\S*\s*ثابت\S*/g;

// Two-part correlative connectors (sowohl...als auch, zwar...aber,
// einerseits...andererseits, weder...noch, nicht nur...sondern auch,
// entweder...oder) are conjunctions -- Category A per the user's own scope
// list -- regardless of which Arabic term the original authoring happened
// to use for them. 25/27 of these in the dataset were already labeled with
// a connector term (أداة ربط) and correctly classify as grammar; exactly 2
// ("entweder...oder", "nicht nur...sondern auch") were inconsistently
// labeled "تعبير ثابت" by whoever authored those two specific exercises.
// Forced to grammar here for consistency across the whole connector class,
// not left to vary by which exercise happened to use which wording.
const CORRELATIVE_CONNECTOR = /^(sowohl|zwar|einerseits|weder|entweder|nicht nur)\.{0,3}/i;

function classify(originalItem, currentKeyword) {
  // Check the CURRENT (already-retrofitted) keyword too, not just the
  // original's -- the original's bare keyword is often just one word of the
  // pair ("oder", "sondern"), while retrofit-sb-explanations.mjs already
  // extracted the full correlative pair ("entweder...oder", "nicht
  // nur...sondern auch") into the current formula. Check both so this
  // catches the pattern regardless of which field happens to hold it.
  if (CORRELATIVE_CONNECTOR.test((originalItem.keyword || "").trim()) || CORRELATIVE_CONNECTOR.test((currentKeyword || "").trim())) {
    return "grammar";
  }
  const text = `${originalItem.explanation_correct || ""} ${originalItem.grammar_structure || ""}`;
  const withoutFalsePositives = text.replace(STABLE_STATE_FALSE_POSITIVE, "");
  return FIXED_MARKER.test(withoutFalsePositives) ? "fixed_expression" : "grammar";
}

async function main() {
  const originalRows = JSON.parse(readFileSync("scripts/learning-aids/_sb_full_dump.json", "utf8"));
  const originalById = new Map(originalRows.map((r) => [r.id, r]));

  const currentRows = await q("select id, title, teil, learning_aids from sb_exercises where learning_aids is not null order by teil, title;");
  console.log(`Loaded ${currentRows.length} exercises (current, already-retrofitted state).`);

  const updates = [];
  const review = [];
  let totalGaps = 0, fixedCount = 0, grammarCount = 0, missingOriginal = 0;

  for (const row of currentRows) {
    const original = originalById.get(row.id);
    const items = row.learning_aids?.items || {};
    const newItems = {};
    for (const [gap, item] of Object.entries(items)) {
      totalGaps++;
      const originalItem = original?.items?.[gap];
      if (!originalItem) missingOriginal++;
      const merkeType = originalItem ? classify(originalItem, item.keyword) : "grammar";
      if (merkeType === "fixed_expression") fixedCount++; else grammarCount++;
      newItems[gap] = { ...item, merke_type: merkeType };
      review.push({ title: row.title, teil: row.teil, gap, keyword: item.keyword, merke_type: merkeType });
    }
    updates.push({ id: row.id, title: row.title, learning_aids: { ...row.learning_aids, items: newItems } });
  }

  console.log(`Total gaps: ${totalGaps}, fixed_expression: ${fixedCount}, grammar: ${grammarCount}, missing original (defaulted to grammar): ${missingOriginal}`);
  const fs = await import("node:fs");
  fs.writeFileSync("scripts/learning-aids/_sb_merke_classification_review.json", JSON.stringify(review, null, 2));
  console.log("Review file: scripts/learning-aids/_sb_merke_classification_review.json");

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to write to the DB)");
    return;
  }

  const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
  const BATCH = 10;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    const stmts = chunk.map((u) => {
      const jsonStr = JSON.stringify(u.learning_aids);
      return `update sb_exercises set learning_aids = convert_from(decode('${b64(jsonStr)}','base64'),'UTF8')::jsonb where id = '${u.id}';`;
    }).join("\n");
    await q(stmts);
    done += chunk.length;
    console.log(`  ${done}/${updates.length} written`);
  }
  console.log(`Done: ${updates.length} exercises updated.`);
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

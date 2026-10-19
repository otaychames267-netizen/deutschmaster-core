// Merges Arabic explanation/vocabulary fields into EXISTING Teil3 speaking_toolbox
// rows (schema_version 2 -> 3), without touching any of the German content already
// authored. Batch file shape: array of
//   { id, erklaerung_ar: { worum_geht_es_ar, was_wird_erwartet_ar, wichtige_punkte_ar[] },
//     wortschatz_ar: { verben[], woerter[], adjektive[] } }
// Array lengths for wichtige_punkte_ar / wortschatz_ar.* must match the existing
// German arrays 1:1 (same order) — validated before writing.
//
// Usage: node scripts/apply-teil3-arabic.mjs <file1.json> [file2.json ...]
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/apply-teil3-arabic.mjs <file1.json> [file2.json ...]");
  process.exit(1);
}

let applied = 0;
let skipped = 0;

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const entries = Array.isArray(raw) ? raw : [raw];
  console.log(`\n${file}: ${entries.length} entries`);

  for (const entry of entries) {
    const { id, erklaerung_ar, wortschatz_ar } = entry;
    if (!id || !erklaerung_ar || !wortschatz_ar) {
      console.log(`  SKIP (missing id/erklaerung_ar/wortschatz_ar): ${JSON.stringify(entry).slice(0, 80)}`);
      skipped++;
      continue;
    }

    const { data: existing, error: fetchErr } = await db
      .from("muendlich_materials")
      .select("id, title, speaking_toolbox")
      .eq("id", id)
      .eq("teil", 3)
      .maybeSingle();
    if (fetchErr || !existing) {
      console.log(`  SKIP ${id}: not found in Teil3 (${fetchErr?.message ?? "no row"})`);
      skipped++;
      continue;
    }
    const tb = existing.speaking_toolbox;
    if (!tb || (tb.schema_version !== 2 && tb.schema_version !== 3)) {
      console.log(`  SKIP ${id} (${existing.title}): toolbox schema_version is ${tb?.schema_version}, expected 2 or 3`);
      skipped++;
      continue;
    }

    const dePoints = tb.erklaerung?.wichtige_punkte ?? [];
    if (erklaerung_ar.wichtige_punkte_ar.length !== dePoints.length) {
      console.log(`  SKIP ${id} (${existing.title}): wichtige_punkte_ar length ${erklaerung_ar.wichtige_punkte_ar.length} != German length ${dePoints.length}`);
      skipped++;
      continue;
    }
    const vocabKeys = ["verben", "woerter", "adjektive"];
    let vocabMismatch = null;
    for (const k of vocabKeys) {
      const deLen = (tb.wortschatz?.[k] ?? []).length;
      const arLen = (wortschatz_ar[k] ?? []).length;
      if (deLen !== arLen) vocabMismatch = `${k}: ar=${arLen} de=${deLen}`;
    }
    if (vocabMismatch) {
      console.log(`  SKIP ${id} (${existing.title}): wortschatz_ar length mismatch (${vocabMismatch})`);
      skipped++;
      continue;
    }

    const updatedToolbox = {
      ...tb,
      schema_version: 3,
      erklaerung: {
        ...tb.erklaerung,
        worum_geht_es_ar: erklaerung_ar.worum_geht_es_ar,
        was_wird_erwartet_ar: erklaerung_ar.was_wird_erwartet_ar,
        wichtige_punkte_ar: erklaerung_ar.wichtige_punkte_ar,
      },
      wortschatz_ar,
    };

    const { error: updateErr } = await db
      .from("muendlich_materials")
      .update({ speaking_toolbox: updatedToolbox })
      .eq("id", id);
    if (updateErr) {
      console.log(`  FAIL ${id} (${existing.title}): ${updateErr.message}`);
      skipped++;
      continue;
    }
    console.log(`  OK ${id} (${existing.title})`);
    applied++;
  }
}

console.log(`\nApplied: ${applied}, Skipped: ${skipped}`);

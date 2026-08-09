// Applies Mündlich Teil 3 content-batch output files (array of {id, toolbox})
// to muendlich_materials.speaking_toolbox. Same shape as apply-teil2-toolbox.mjs
// but validates against the Teil3 schema_version 1 (erklaerung/diskussionsideen/
// beispieldialog/wortschatz) instead of Teil2's schema_version 2.
//
// Usage: node scripts/apply-teil3-toolbox.mjs <file1.json> [file2.json ...]
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const REQUIRED_KEYS = ["erklaerung", "diskussionsideen", "beispieldialog", "wortschatz"];

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/apply-teil3-toolbox.mjs <file1.json> [file2.json ...]");
  process.exit(1);
}

let applied = 0;
let skipped = 0;

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const entries = Array.isArray(raw) ? raw : [raw];
  console.log(`\n${file}: ${entries.length} entries`);

  for (const entry of entries) {
    const { id, toolbox } = entry;
    if (!id || !toolbox) {
      console.log(`  SKIP (missing id/toolbox): ${JSON.stringify(entry).slice(0, 80)}`);
      skipped++;
      continue;
    }
    if (toolbox.schema_version !== 1) {
      console.log(`  SKIP ${id}: schema_version is ${toolbox.schema_version}, expected 1`);
      skipped++;
      continue;
    }
    const missing = REQUIRED_KEYS.filter((k) => !toolbox[k]);
    if (missing.length > 0) {
      console.log(`  SKIP ${id}: missing keys ${missing.join(", ")}`);
      skipped++;
      continue;
    }

    const { data: existing, error: fetchErr } = await db
      .from("muendlich_materials")
      .select("id, title")
      .eq("id", id)
      .eq("teil", 3)
      .maybeSingle();
    if (fetchErr || !existing) {
      console.log(`  SKIP ${id}: not found in Teil3 (${fetchErr?.message ?? "no row"})`);
      skipped++;
      continue;
    }

    const { error: updateErr } = await db
      .from("muendlich_materials")
      .update({ speaking_toolbox: toolbox })
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

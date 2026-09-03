// Inserts a "vorschlaege" struktur section (with its topic-specific demo exchange)
// and the matching dialogue lines into EXISTING Teil3 speaking_toolbox rows that
// don't yet have one — without touching any other authored content (erklaerung,
// other struktur sections, moegliche_fragen/antworten, wortschatz, wortschatz_ar).
//
// Batch file shape: array of
//   { id,
//     demo: { frage, antwort, reaktion? },
//     dialog: [{ speaker: "A"|"B", text }, ...] }   // 2-4 lines, section:"vorschlaege" added automatically
//
// The struktur entry is inserted immediately before "aufgabenverteilung" (falling
// back to before "abschluss", or appended at the end if neither key exists).
// The dialogue lines are inserted immediately before the first beispieldialog
// entry whose section === "aufgabenverteilung" (same fallback logic).
//
// Usage: node scripts/apply-teil3-vorschlaege.mjs <file1.json> [file2.json ...]
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function findInsertIndex(arr, keyFn) {
  let idx = arr.findIndex(x => keyFn(x) === "aufgabenverteilung");
  if (idx === -1) idx = arr.findIndex(x => keyFn(x) === "abschluss");
  if (idx === -1) idx = arr.length;
  return idx;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/apply-teil3-vorschlaege.mjs <file1.json> [file2.json ...]");
  process.exit(1);
}

let applied = 0;
let skipped = 0;

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const entries = Array.isArray(raw) ? raw : [raw];
  console.log(`\n${file}: ${entries.length} entries`);

  for (const entry of entries) {
    const { id, demo, dialog } = entry;
    if (!id || !demo || !dialog?.length) {
      console.log(`  SKIP (missing id/demo/dialog): ${JSON.stringify(entry).slice(0, 80)}`);
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
    if (!tb || ![2, 3].includes(tb.schema_version)) {
      console.log(`  SKIP ${id} (${existing.title}): toolbox schema_version is ${tb?.schema_version}, expected 2 or 3`);
      skipped++;
      continue;
    }
    if (tb.struktur.some(s => s.key === "vorschlaege")) {
      console.log(`  SKIP ${id} (${existing.title}): already has a vorschlaege section`);
      skipped++;
      continue;
    }

    const struktur = [...tb.struktur];
    const strukturIdx = findInsertIndex(struktur, s => s.key);
    struktur.splice(strukturIdx, 0, { key: "vorschlaege", demo });

    const beispieldialog = [...tb.beispieldialog];
    const dialogIdx = findInsertIndex(beispieldialog, d => d.section);
    const newLines = dialog.map(l => ({ ...l, section: "vorschlaege" }));
    beispieldialog.splice(dialogIdx, 0, ...newLines);

    const updatedToolbox = { ...tb, struktur, beispieldialog };

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

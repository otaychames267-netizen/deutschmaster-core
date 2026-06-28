/**
 * Import only T3 from Lesen Teil 3 (1).pdf
 * Fast: text-based PDF, no OCR needed (~1 min)
 */
import { readFile } from "fs/promises";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { extractNormalizedDocument } from "../src/lib/import/pdf-extractor.js";
import { parseLesenT3 } from "../src/lib/import/lesen-t3-parser.js";

const SUPABASE_URL = "https://gewcyydpgbfutkdcyztr.supabase.co";
const SERVICE_KEY  = "";
const PDF_PATH     = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\Lesen Teil 3 (1).pdf";
const IMPORT_USER  = "df47fbfc-7895-4941-864a-5d1d8f4fdc30";

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);

function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  return s.split("").filter((c) => {
    const code = c.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  }).join("").trim();
}

async function main() {
  log("=== T3 Only Import ===");

  // Check if T3 already has data
  const { count } = await db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 3);
  if ((count ?? 0) > 0) {
    log(`T3 already has ${count} exercises — nothing to do.`);
    return;
  }

  log("T3=0, importing...");
  const bytes = await readFile(PDF_PATH);
  const blob  = new Blob([bytes], { type: "application/pdf" });
  const file  = new File([blob], path.basename(PDF_PATH), { type: "application/pdf" });
  const doc   = await extractNormalizedDocument(file);
  log(`  Lines: ${doc.lines.length}, scanned: ${doc.extractionReport.likelyScanned}`);

  const exercises = parseLesenT3(doc);
  log(`  Parsed: ${exercises.length} exercises`);

  if (exercises.length === 0) {
    log("ERROR: parseLesenT3 returned 0 exercises");
    process.exit(1);
  }

  for (let idx = 0; idx < exercises.length; idx++) {
    const ex = exercises[idx];
    const title = `Lesen Teil 3 — Übung ${idx + 1}`;
    const { data: row, error } = await db.from("lesen_exercises")
      .insert({ title, teil: 3, created_by: IMPORT_USER, source_pdf: "Lesen Teil 3 (1).pdf" })
      .select("id").single();
    if (error || !row) { console.error("Insert error:", error?.message); process.exit(1); }

    if (ex.situations?.length) {
      await db.from("lesen_t3_situations").insert(
        ex.situations.map((s: any) => ({
          exercise_id: row.id,
          number: s.number,
          description: sanitize(s.description),
          correct_letter: s.noMatch ? null : (s.correctLetter ?? s.correct_letter ?? null),
          no_match: !!(s.noMatch ?? s.no_match),
        }))
      );
    }

    if (ex.texts?.length) {
      await db.from("lesen_t3_texts").insert(
        ex.texts.map((t: any) => ({
          exercise_id: row.id,
          letter: t.letter,
          title: sanitize(t.title),
          content: sanitize(t.content),
        }))
      );
    }

    log(`  → T3 ${row.id}: ${ex.situations?.length ?? 0} situations, ${ex.texts?.length ?? 0} texts`);
  }

  const { count: finalCount } = await db.from("lesen_exercises").select("id", { count: "exact", head: true }).eq("teil", 3);
  log(`\nDone. T3 exercises in DB: ${finalCount}`);
}

main().catch(e => { console.error(e); process.exit(1); });

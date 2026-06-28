/**
 * Check T1 OCR for answer key patterns and verify DB state.
 */
import { readFile } from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const db = createClient("https://gewcyydpgbfutkdcyztr.supabase.co", "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Check DB state
  const { data: exs } = await db.from("lesen_exercises").select("id, title").eq("teil", 1);
  console.log("T1 exercises in DB:", exs?.length ?? 0);

  for (const ex of exs ?? []) {
    const { data: texts } = await db.from("lesen_t1_texts").select("position, title, correct_headline, content").eq("exercise_id", ex.id).order("position");
    const { data: headlines } = await db.from("lesen_t1_headlines").select("letter, text, is_distractor").eq("exercise_id", ex.id).order("letter");
    console.log(`\nExercise: ${ex.title} (${ex.id})`);
    console.log("Headlines:", headlines?.length ?? 0);
    for (const h of headlines ?? []) {
      console.log(`  [${h.letter}] ${h.text.slice(0, 60)} (distractor: ${h.is_distractor})`);
    }
    console.log("Texts:", texts?.length ?? 0);
    for (const t of texts ?? []) {
      console.log(`  [${t.position}] correct="${t.correct_headline}" title="${t.title}" preview="${t.content.slice(0, 60)}"`);
    }
  }

  // Scan OCR dump for answer key patterns
  try {
    const raw = await readFile("scripts/t1-ocr-dump.txt", "utf8");
    const lines = raw.split("\n");

    // Look for patterns like "1. E" or "Text 1: E" or "1 E"
    const keyPatterns = [
      /^\s*lösungsschlüssel/i,
      /^\s*(lösung|lösungen)\s*[:.]?\s*\d/i,
      /^\s*(\d)\s*[.:\-]\s*([A-J])\b/,
      /text\s+(\d)\s*[:=]\s*([A-J])\b/i,
    ];

    const lastPages = lines.filter(l => {
      const m = l.match(/^--- PAGE (\d+) ---$/);
      return !m || parseInt(m[1]) >= 95;
    });

    console.log("\n\n=== Last 10 pages OCR (pages 95-105, first 20 lines of dump) ===");
    for (let i = 0; i < Math.min(200, lastPages.length); i++) {
      const line = lastPages[i];
      const hasKey = keyPatterns.some(p => p.test(line));
      if (hasKey) console.log(`[KEY] ${line}`);
      else if (line.trim()) console.log(line);
    }
  } catch {
    console.log("(no OCR dump file — only pages 1-20 were saved)");
  }
}

main().catch(e => { console.error(e); process.exit(1); });

import { readFile } from "fs/promises";
import * as path from "path";
import { extractNormalizedDocument } from "../src/lib/import/pdf-extractor.js";
import { parseLesenT3 } from "../src/lib/import/lesen-t3-parser.js";

const PDF_PATH = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\Lesen Teil 3 (1).pdf";

async function main() {
  const bytes = await readFile(PDF_PATH);
  const blob  = new Blob([bytes], { type: "application/pdf" });
  const file  = new File([blob], path.basename(PDF_PATH), { type: "application/pdf" });
  const doc   = await extractNormalizedDocument(file);

  const exercises = parseLesenT3(doc);

  // Find exercises where 13 or 14 has no answer
  let found = 0;
  for (const ex of exercises) {
    const missing = ex.situations.filter(s => (s.number === 13 || s.number === 14) && !s.correct_letter && !s.no_match);
    if (missing.length > 0 && found < 3) {
      found++;
      console.log(`\nExercise (page ${ex.sourcePage}) — missing answers for situations:`, missing.map(s => s.number).join(', '));
      console.log(`All situations: ${ex.situations.map(s => s.number + '→' + (s.no_match ? 'X' : s.correct_letter ?? '?')).join(', ')}`);
      console.log(`Raw answer key:\n  ${ex.rawAnswerKey.split('\n').map(l => `"${l}"`).join('\n  ')}`);
    }
  }

  if (found === 0) console.log('No exercises with missing 13/14 found — parser may be fixed!');
}

main().catch(e => { console.error(e); process.exit(1); });

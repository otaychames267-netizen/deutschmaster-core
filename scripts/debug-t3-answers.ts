/**
 * Debug: Print raw answer key lines from T3 PDF to understand why situation 18 is missing
 */
import { readFile } from "fs/promises";
import * as path from "path";
import { extractNormalizedDocument } from "../src/lib/import/pdf-extractor.js";
import { parseLesenT3 } from "../src/lib/import/lesen-t3-parser.js";

const PDF_PATH = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\Lesen Teil 3 (1).pdf";

const RE_ANS_LINE = /^(1[0-9]|[1-9]):\s*([A-LXa-lx])$/;
const RE_ANS_20  = /^20:\s*([A-LXa-lx])$/;

async function main() {
  console.log("Loading PDF...");
  const bytes = await readFile(PDF_PATH);
  const blob  = new Blob([bytes], { type: "application/pdf" });
  const file  = new File([blob], path.basename(PDF_PATH), { type: "application/pdf" });
  const doc   = await extractNormalizedDocument(file);

  // Group lines by page
  const pageMap = new Map<number, string[]>();
  for (const line of doc.lines) {
    const pn = line.pageNum ?? 0;
    if (!pageMap.has(pn)) pageMap.set(pn, []);
    pageMap.get(pn)!.push(line.text.trim());
  }

  // Find answer key pages (many lines matching NN: X)
  let keyPageCount = 0;
  for (const [pn, lines] of pageMap) {
    const ansCount = lines.filter(l => RE_ANS_LINE.test(l)).length;
    const has20    = lines.some(l => RE_ANS_20.test(l));
    if (ansCount >= 5) {
      keyPageCount++;
      if (keyPageCount <= 3) {
        console.log(`\n=== Answer key page ${pn} (${ansCount} matches, has20=${has20}) ===`);
        for (const l of lines) {
          if (l.length < 2) continue;
          console.log(`  [${RE_ANS_LINE.test(l) ? 'MATCH' : has20 && RE_ANS_20.test(l) ? 'ANS20' : '    '}] "${l}"`);
        }
      }
    }
  }
  console.log(`\nTotal answer key pages found: ${keyPageCount}`);

  // Also show the parser's output for first 3 exercises
  const exercises = parseLesenT3(doc);
  console.log(`\nParser output: ${exercises.length} exercises`);
  for (let i = 0; i < Math.min(3, exercises.length); i++) {
    const ex = exercises[i];
    console.log(`\nExercise ${i+1}: "${ex.title}" confidence=${ex.confidence}`);
    console.log(`  Situations: ${ex.situations.map(s => `${s.number}→${s.no_match ? 'X' : s.correct_letter ?? '?'}`).join(', ')}`);
    console.log(`  Warnings: ${ex.warnings.join('; ') || 'none'}`);
    if (ex.rawAnswerKey) {
      console.log(`  Raw answer key:\n    ${ex.rawAnswerKey.split('\n').join('\n    ')}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });

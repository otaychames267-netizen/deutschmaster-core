/**
 * Test T1 parser against the already-saved OCR dump (no re-OCR needed, fast).
 */
import { readFile } from "fs/promises";
import { parseLesenT1 } from "../src/lib/import/lesen-t1-parser.js";

async function main() {
  const raw = await readFile("scripts/t1-ocr-dump.txt", "utf8");
  const allLines = raw.split("\n");

  // Build RichLine[] with pageNum from "--- PAGE N ---" markers
  let currentPage = 0;
  const richLines: any[] = [];
  let y = 0;
  for (const text of allLines) {
    const m = text.match(/^--- PAGE (\d+) ---$/);
    if (m) { currentPage = parseInt(m[1]); continue; }
    if (text.trim().length > 0) {
      richLines.push({
        text: text.trim(), x: 0, y: y++, pageNum: currentPage,
        bold: false, italic: false, fontSize: 12,
        hasBoldWord: false, color: null, isGreen: false, hasGreenWord: false,
      });
    }
  }

  console.log(`Loaded ${richLines.length} lines across pages 1-20\n`);

  const result = parseLesenT1(richLines);

  console.log(`=== Parser result ===`);
  console.log(`Headlines: ${result.headlines.length}`);
  result.headlines.forEach(h => console.log(`  [${h.letter}] "${h.text.slice(0, 80)}"`));

  console.log(`\nTexts: ${result.texts.length}`);
  result.texts.forEach(t => {
    console.log(`  [${t.position}] title="${t.title}" content_len=${t.content.length}`);
    console.log(`    Preview: "${t.content.slice(0, 100)}"`);
  });

  console.log(`\nDetection strategy: ${result.detectionStrategy}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Warnings: ${result.warnings.join("; ") || "none"}`);
  console.log("\nDone.");
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * Trace why extractHeadlines finds 0 headlines.
 */
import { readFileSync } from "fs";
import { cleanRichLines } from "../src/lib/import/pdf-extractor.js";
import { analyzeDocument, findSectionStart } from "../src/lib/import/document-analyzer.js";

const raw = readFileSync("scripts/t1-ocr-dump.txt", "utf8");
const allLines = raw.split("\n");
let currentPage = 0;
const richLines: any[] = [];
for (const text of allLines) {
  const m = text.match(/^--- PAGE (\d+) ---$/);
  if (m) { currentPage = parseInt(m[1]); continue; }
  if (text.trim().length > 0) {
    richLines.push({ text: text.trim(), x: 0, y: richLines.length, pageNum: currentPage,
      bold: false, italic: false, fontSize: 12, hasBoldWord: false, color: null, isGreen: false, hasGreenWord: false });
  }
}

const RE = /^([A-Ja-j])[.)]\s{1,6}(.{4,})/;

console.log("Before clean:", richLines.length, "lines");
console.log("Matching RE before clean:", richLines.filter(l => RE.test(l.text)).length);

const cleaned = cleanRichLines(richLines);
console.log("After clean:", cleaned.length, "lines");
console.log("Matching RE after clean:", cleaned.filter((l: any) => RE.test(l.text)).length);

const HEADLINE_SECTION_PATTERNS = [
  /\büberschrift(en)?\b/i,
  /\bschlagzeile(n)?\b/i,
  /a\s*[–\-]\s*j\b/i,
  /zehn\s*überschriften/i,
];
const KEY_SECTION_PATTERNS = [
  /\b(lösung|lösungen|lösungsschlüssel)\b/i,
  /\b(answer\s*key|answers)\b/i,
  /\b(schlüssel)\b/i,
];

const headlineSectionIdx = findSectionStart(cleaned, HEADLINE_SECTION_PATTERNS);
const keySectionIdx = findSectionStart(cleaned, KEY_SECTION_PATTERNS);
console.log("\nheadlineSectionIdx:", headlineSectionIdx);
console.log("keySectionIdx:", keySectionIdx);

const searchFrom = headlineSectionIdx >= 0 ? headlineSectionIdx : 0;
const searchEnd = keySectionIdx > 0 ? keySectionIdx : cleaned.length;
console.log("searchFrom:", searchFrom, "searchEnd:", searchEnd);

// Manually run extractHeadlines logic
const map = new Map<string, string>();
for (let i = searchFrom; i < searchEnd; i++) {
  const m = cleaned[i].text.match(RE);
  if (!m) continue;
  const letter = m[1].toUpperCase();
  if (!map.has(letter)) {
    map.set(letter, m[2].trim().slice(0, 60));
    console.log(`  Found headline [${letter}] at line ${i}: "${m[2].trim().slice(0, 50)}"`);
  }
}
console.log("\nTotal headlines found:", map.size);

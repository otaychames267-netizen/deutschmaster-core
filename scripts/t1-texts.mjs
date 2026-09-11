/** Extract the 5 "Text N" bodies from a PDF page range's text layer. Used to
 *  pull exact text bodies for digital exercises whose headline layout defeated
 *  the main parser. Usage: bun scripts/t1-texts.mjs <pageStart> <pageEnd> */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";
const a = parseInt(process.argv[2], 10), b = parseInt(process.argv[3] || process.argv[2], 10);
const dir = mkdtempSync(join(tmpdir(), "tx-")); const o = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", "-f", String(a), "-l", String(b), PDF, o], { stdio: "pipe" });
let txt = readFileSync(o, "utf8").replace(/\f/g, "\n");
// drop headline-answer lines and banners; keep from first "Text 1"
const re = /(^|\n)\s*Text\s*([1-5])\b\s*:?\s*\n?([\s\S]*?)(?=\n\s*Text\s*[1-5]\b|$)/gi;
const o2 = {}; let m;
while ((m = re.exec(txt))) { const p = +m[2]; const c = m[3].replace(/\n{2,}/g, "\n").replace(/[ \t]{2,}/g, " ").trim(); if (c && !o2[p]) o2[p] = c; }
const texts = Object.entries(o2).map(([p, content]) => ({ position: +p, content }));
console.log(JSON.stringify(texts, null, 1));
console.log(`\n--- ${texts.length} texts, lengths: ${texts.map(t => t.content.length).join(",")}`);

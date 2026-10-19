/** Dump headline lines (letter/digit/text) + detected key for given pages. */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";
const hlRe = /^\s*(?:(\d)\s*_|_{2}|_)?\s*([a-j])\s*\)\s*(.+?)\s*$/i;
for (const p of process.argv.slice(2).map(Number)) {
  const dir = mkdtempSync(join(tmpdir(), "hl-")); const o = join(dir, "o.txt");
  execFileSync(POPPLER, ["-layout", "-f", String(p), "-l", String(p), PDF, o], { stdio: "pipe" });
  const lines = readFileSync(o, "utf8").split(/\r?\n/);
  console.log(`\n===== page ${p} =====`);
  const ans = {};
  for (const ln of lines) { const m = ln.match(hlRe); if (m && m[2]) { if (m[1]) ans[+m[1]] = m[2].toUpperCase(); console.log(`  ${m[1]||' '}  ${m[2].toUpperCase()})  ${m[3]}`); } }
  console.log(`  KEY: ${[1,2,3,4,5].map(n=>ans[n]||'?').join('')}`);
}

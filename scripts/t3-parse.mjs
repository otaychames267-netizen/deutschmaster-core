/** Parse the Teil 3 PDF text layer: segment exercises, extract official answer
 *  keys (items 11-20), and print a structured map. Read-only analysis. */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen Teil 3 (1).pdf";
const dir = mkdtempSync(join(tmpdir(), "t3-")); const o = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, o], { stdio: "pipe" });
const pages = readFileSync(o, "utf8").split("\f");

// An answer-key page is dominated by "NN: X" tokens for NN in 11..20.
function keysOnPage(txt) {
  const toks = [...txt.matchAll(/\b(1[1-9]|20)\s*:\s*([A-La-lxX])\b/g)];
  if (toks.length < 8) return null;
  // group by situation number in order of appearance -> columns = number of versions
  const bySit = {};
  for (const m of toks) { const n = +m[1], v = m[2].toUpperCase(); (bySit[n] ||= []).push(v); }
  const versions = Math.max(...Object.values(bySit).map(a => a.length));
  const keys = [];
  for (let col = 0; col < versions; col++) {
    let k = "";
    for (let n = 11; n <= 20; n++) { const a = bySit[n]; k += a && a[col] ? a[col] : "-"; }
    keys.push(k);
  }
  return keys;
}

let out = [];
pages.forEach((p, i) => {
  const k = keysOnPage(p);
  if (k) out.push({ page: i + 1, keys: k });
});
console.log(`Answer-key pages: ${out.length}`);
for (const r of out) console.log(`  p${String(r.page).padStart(3)}: ${r.keys.join("   |   ")}`);
console.log(`\nTotal key columns (= exercise versions): ${out.reduce((s, r) => s + r.keys.length, 0)}`);

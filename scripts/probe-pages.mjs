/** Per-page text-layer probe: char count + first meaningful line, to locate scanned pages. */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const pdf = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";
const dir = mkdtempSync(join(tmpdir(), "pp-"));
const out = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", pdf, out], { stdio: "pipe" });
const pages = readFileSync(out, "utf8").split("\f");
pages.forEach((p, i) => {
  const clean = p.replace(/\s+/g, " ").trim();
  const letters = (clean.match(/[a-zäöüßA-ZÄÖÜ]/g) || []).length;
  const first = clean.slice(0, 70);
  console.log(`p${String(i + 1).padStart(3)} len=${String(clean.length).padStart(5)} alpha=${String(letters).padStart(5)}  ${first}`);
});

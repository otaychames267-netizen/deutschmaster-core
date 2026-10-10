/** Print the 10 situations (11-20) from given PDF pages, to compare versions. */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen Teil 3 (1).pdf";
const dir = mkdtempSync(join(tmpdir(), "t3x-")); const o = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, o], { stdio: "pipe" });
const pages = readFileSync(o, "utf8").split("\f");
const clean = (s) => s.replace(/[؀-ۿ‌-‏‪-‮]/g, "").replace(/\bWG\b/g,"").replace(/\s+/g, " ").trim();
for (const pn of process.argv.slice(2).map(Number)) {
  const txt = pages[pn - 1] || "";
  console.log(`\n===== p${pn} =====`);
  // situations: "__NN) text" up to next "__NN)" or ad/end
  const re = /_+\s*(1[1-9]|20)\)\s*([\s\S]*?)(?=_+\s*(?:1[1-9]|20)\)|(?:\n\s*[a-l]\.\s)|$)/g;
  let m;
  while ((m = re.exec(txt))) {
    console.log(`  ${m[1]}) ${clean(m[2]).slice(0, 88)}`);
  }
}

/** Classify every page of the Teil 3 PDF: S=situations, A=ads, K=answer key.
 *  Prints a compact page map + group boundaries to design the parser. */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = process.argv[2] || "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen Teil 3 (1).pdf";
const dir = mkdtempSync(join(tmpdir(), "t3s-")); const o = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, o], { stdio: "pipe" });
const pages = readFileSync(o, "utf8").split("\f");

function classify(txt) {
  const hasInstr = /Lesen Sie zuerst die zehn Situationen/i.test(txt);
  const sitCount = (txt.match(/_+\s*1[1-9]\)|_+\s*20\)/g) || []).length;
  const adCount  = (txt.match(/(^|\n)\s*[a-l]\.\s+\S/g) || []).length;
  const keyToks  = (txt.match(/\b(1[1-9]|20)\s*:\s*[A-La-lxX]/g) || []).length;
  // title after header
  const tm = txt.match(/Leseverstehen,\s*Teil\s*3\s+(.*?)\s*(LANGUAGE|Lesen Sie)/is);
  const rawTitle = tm ? tm[1].replace(/[؀-ۿ‌-‏‪-‮]/g, "").replace(/\d+/g,"").replace(/\s+/g," ").trim() : "";
  let kind = "?";
  if (keyToks >= 8) kind = "K";
  else if (hasInstr || sitCount >= 5) kind = "S";
  else if (adCount >= 2) kind = "A";
  else kind = "-";
  return { kind, sitCount, adCount, keyToks, rawTitle, modified: /المعدل|معدل/.test(txt) };
}

let line = "";
pages.forEach((p, i) => {
  if (!p.trim()) return;
  const c = classify(p);
  const tag = `${c.kind}${c.kind==="S"?`(${c.sitCount}${c.modified?"m":""})`:c.kind==="A"?`(${c.adCount})`:c.kind==="K"?`(${c.keyToks})`:""}`;
  console.log(`p${String(i+1).padStart(3)} ${tag.padEnd(9)} ${c.rawTitle.slice(0,34)}`);
});

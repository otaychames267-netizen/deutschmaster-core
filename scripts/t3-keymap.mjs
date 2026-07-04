/** Build the authoritative version->key map from the Teil 3 PDF.
 * Groups pages as [S+ A+ K]; each S page is a version with its 10 situations;
 * the K page holds one key column per version (in order). Emits, per version,
 * a normalized situations signature + its official key. Writes JSON for re-keying. */
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen Teil 3 (1).pdf";
const OUT = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\t3-keymap.json";
const dir = mkdtempSync(join(tmpdir(), "km-")); const o = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, o], { stdio: "pipe" });
const pages = readFileSync(o, "utf8").split("\f");

const stripAr = (s) => s.replace(/[؀-ۿ‌-‏‪-‮]/g, "");
const norm = (s) => stripAr(s).toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

function kindOf(txt) {
  const keyToks = (txt.match(/\b(1[1-9]|20)\s*:\s*[A-La-lxX]/g) || []).length;
  const sit = (txt.match(/_+\s*(?:1[1-9]|20)\)/g) || []).length;
  const instr = /Lesen Sie zuerst die zehn Situationen/i.test(txt);
  if (keyToks >= 8) return "K";
  if (instr || sit >= 5) return "S";
  const ad = (txt.match(/(^|\n)\s*[a-l]\.\s+\S/g) || []).length;
  if (ad >= 2) return "A";
  return "-";
}
function situationsOf(txt) {
  const re = /_+\s*(1[1-9]|20)\)\s*([\s\S]*?)(?=_+\s*(?:1[1-9]|20)\)|(?:\n\s*[a-l]\.\s)|$)/g;
  const map = {}; let m;
  while ((m = re.exec(txt))) { const n = +m[1]; if (!map[n]) map[n] = stripAr(m[2]).replace(/\bWG\b/g, "").replace(/\s+/g, " ").trim(); }
  return map;
}
function keysOf(txt) {
  const toks = [...txt.matchAll(/\b(1[1-9]|20)\s*:\s*([A-La-lxX])\b/g)];
  const bySit = {}; for (const m of toks) { const n = +m[1]; (bySit[n] ||= []).push(m[2].toUpperCase()); }
  const cols = Math.max(0, ...Object.values(bySit).map(a => a.length));
  const keys = [];
  for (let c = 0; c < cols; c++) { let k = ""; for (let n = 11; n <= 20; n++) { const a = bySit[n]; k += (a && a[c]) ? a[c] : "-"; } keys.push(k); }
  return keys;
}

// walk pages, build groups
const kinds = pages.map(kindOf);
const versions = []; // {situations, sig, page}
let curVersions = [];
const out = [];
for (let i = 0; i < pages.length; i++) {
  const k = kinds[i];
  if (k === "S") {
    const sit = situationsOf(pages[i]);
    const nums = Object.keys(sit).map(Number).sort((a,b)=>a-b);
    curVersions.push({ page: i + 1, situations: sit, sig: norm(nums.map(n => sit[n]).join("|")) });
  } else if (k === "K") {
    const keys = keysOf(pages[i]);
    curVersions.forEach((v, idx) => {
      out.push({ page: v.page, keyPage: i + 1, versionIdx: idx, nVersions: curVersions.length, nKeys: keys.length,
        key: keys[idx] ?? keys[keys.length - 1] ?? "??????????", situations: v.situations, sig: v.sig });
    });
    curVersions = [];
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`Versions: ${out.length}`);
const mism = out.filter(v => v.nVersions !== v.nKeys);
console.log(`Groups where nVersions != nKeys (need review): ${[...new Set(mism.map(v=>v.keyPage))].join(", ") || "none"}`);
for (const v of out) console.log(`  p${String(v.page).padStart(3)} v${v.versionIdx+1}/${v.nVersions} key=${v.key}  s11="${(v.situations[11]||"").slice(0,40)}"`);

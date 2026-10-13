/** FULL Teil 3 rebuild from the PDF. Groups = [S+ A+ K]. Per group: ads a-l
 * (scanned from ALL group pages incl. situations page), versions (situations
 * 11-20 per S page), keys (columns on the K page). Each version -> one exercise
 * with its situations + the group ads + its key. Outputs JSON for review. */
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = process.argv[2] || "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen Teil 3 (1).pdf";
const OUT = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\t3-rebuild.json";
const dir = mkdtempSync(join(tmpdir(), "rb-")); const o = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, o], { stdio: "pipe" });
const pages = readFileSync(o, "utf8").split("\f");

const stripAr = (s) => (s || "").replace(/[؀-ۿ‌-‏‪-‮]/g, "");
const deWG = (s) => s.replace(/\bWG\b/g, " ").replace(/LANGUAGE\s+Tests/gi, " ").replace(/Leseverstehen,\s*Teil\s*3/gi, " ");
const oneline = (s) => stripAr(deWG(s)).replace(/\s+/g, " ").trim();

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
  while ((m = re.exec(txt))) { const n = +m[1]; if (!map[n]) map[n] = oneline(m[2]); }
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
// ads: marker "x." at line start, EITHER with a title on the same line OR alone
// (title-less ad, text below). Content runs until the next marker. In-order a-l.
function adsOf(mergedTxt) {
  const lines = stripAr(mergedTxt).split(/\r?\n/);
  const ads = {}; let cur = null;
  for (const ln of lines) {
    const m = ln.match(/^\s*([a-l])\.\s*(.*)$/);
    const same = m ? m[2].trim() : "";
    // real ad marker: "x." alone, or followed by a title that is NOT another
    // abbreviation like "d. h." / "z. B." (lowercase letter + period).
    const isMarker = m && (same === "" || !/^[a-zäöü]\.\s/.test(same));
    if (isMarker) {
      if (!ads[m[1]]) { cur = m[1]; ads[cur] = { body: [] }; if (same) ads[cur].body.push(deWG(same).trim()); }
      else cur = null;   // duplicate marker (ad repeated on another page): stop collecting
    } else if (cur) {
      const t = deWG(ln).trim(); if (t) ads[cur].body.push(t);
    }
  }
  const out = {};
  for (const L of "abcdefghijkl") if (ads[L]) {
    const body = ads[L].body.join(" ").replace(/\s+/g, " ").trim();
    // title heuristic: short first segment (author/heading) becomes title, else empty
    const first = ads[L].body[0]?.replace(/\s+/g," ").trim() || "";
    const title = (first && first.length <= 60 && !/[.]$/.test(first)) ? first : "";
    out[L.toUpperCase()] = { title, content: body };
  }
  return out;
}

const kinds = pages.map((p, i) => p.trim() ? kindOf(p) : "-");
const exercises = []; let group = null;
function flush() {
  if (!group) return;
  const ads = adsOf(group.pageTexts.join("\n"));
  const keys = keysOf(group.keyText || "");
  group.versions.forEach((v, idx) => {
    exercises.push({ pdfPage: v.page, groupKeyPage: group.keyPage, versionIdx: idx, nVersions: group.versions.length, nKeys: keys.length,
      situations: v.situations, key: keys[idx] ?? keys[keys.length - 1] ?? "??????????", ads, adCount: Object.keys(ads).length });
  });
  group = null;
}
for (let i = 0; i < pages.length; i++) {
  const k = kinds[i];
  if (k === "S") {
    if (!group || group.closed) { flush(); group = { versions: [], pageTexts: [], keyText: null }; }
    group.versions.push({ page: i + 1, situations: situationsOf(pages[i]) });
    group.pageTexts.push(pages[i]);
  } else if (k === "A") { if (group) group.pageTexts.push(pages[i]); }
  else if (k === "K") { if (group) { group.keyText = pages[i]; group.keyPage = i + 1; group.closed = true; flush(); } }
}
flush();

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
for (const e of exercises) e.sig = norm([11,12,13,14,15,16,17,18,19,20].map(n => e.situations[n] || "").join("|"));
writeFileSync(OUT, JSON.stringify(exercises, null, 1));
console.log(`Exercises (versions): ${exercises.length}`);
const badSit = exercises.filter(e => Object.keys(e.situations).length !== 10);
const badKey = exercises.filter(e => !/^[A-LX]{10}$/.test(e.key));
console.log(`sit!=10: ${badSit.length} | key malformed(${badKey.length}): ${badKey.map(e=>"p"+e.pdfPage+"("+e.key+")").join(",")}`);
console.log(`\nAd-count problems:`);
for (const e of exercises.filter(x => x.adCount !== 12)) {
  const miss = [..."ABCDEFGHIJKL"].filter(L => !e.ads[L]);
  console.log(`  p${e.pdfPage} v${e.versionIdx+1}/${e.nVersions} ads=${e.adCount} missing=[${miss.join("")}]`);
}
console.log(`\nGroups nVersions != nKeys:`);
const seenGrp = new Set();
for (const e of exercises.filter(x => x.nVersions !== x.nKeys)) {
  if (seenGrp.has(e.groupKeyPage)) continue; seenGrp.add(e.groupKeyPage);
  const grp = exercises.filter(x => x.groupKeyPage === e.groupKeyPage);
  const sigs = grp.map(g => g.sig);
  const dupWithin = grp.map((g,i)=> sigs.indexOf(g.sig)!==i ? `v${i+1}=v${sigs.indexOf(g.sig)+1}` : null).filter(Boolean);
  console.log(`  keyPage p${e.groupKeyPage}: ${e.nVersions} versions, ${e.nKeys} keys; dup-sits: [${dupWithin.join(",")||"none"}]  keys=[${grp.map(g=>g.key).join(",")}]`);
}

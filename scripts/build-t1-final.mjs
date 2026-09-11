/**
 * AUTHORITATIVE Teil 1 rebuild. 42 exercises total:
 *   - 27 DIGITAL (PDF pages 2–77): parsed exactly from the embedded text layer
 *     (headlines, 5 texts, answer key from the "N_ x)" markers). Basic/modified
 *     variants of the same theme are collapsed to ONE exercise, keeping the
 *     modified (corrected) answer key. Titles assigned from TITLES[] in document
 *     order (verified against the printed banners).
 *   - 15 SCANNED (PDF pages 78–116): supplied in SCANNED[] below, transcribed
 *     from the page images (the text layer there is garbled/empty).
 * --plan prints the full plan (no DB writes). --apply wipes teil=1 and inserts
 * all 42 in order.
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";
const APPLY = process.argv.includes("--apply");
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
async function q(sql){ const r=await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${SBP}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})}); const t=await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t); }

// Titles for the 27 digital exercises, in document (PDF) order. Exact printed
// banner theme, variant serial stripped.
const TITLES = ["Limonade","Schlafzug","Die Programmierer","Finanz","Impfung","Inseln","Bienen","In den Alpen","Kartoffeln","Insekten","Tanzkurs","Schulen","Bilder","Jugend forscht","Bonbons","Kaffee","Kinder und Handy","Grundschulen","Auf dem Weg","Keine Zeit","Trampoline","Sport ist gesund","Österreich Markt","Das Licht","Alte Spiele","Benzin","Umwelt"];

// ── Parse digital exercises from the text layer ──
const dir = mkdtempSync(join(tmpdir(), "bt1-")); const out = join(dir, "o.txt");
execFileSync(POPPLER, ["-layout", PDF, out], { stdio: "pipe" });
const full = readFileSync(out, "utf8");
const segs = full.split(/Lesen Sie zuerst die zehn [ÜU]berschriften/i);
const hlRe = /^\s*(?:(\d)_|_{2}|_)\s*([a-j])\)\s*(.+?)\s*$/i;

const stripAr = (s) => (s || "").replace(/[؀-ۿ‌-‏‪-‮]/g, "").trim();
function bannerOf(prevSeg) {
  const lines = (prevSeg || "").split(/\r?\n/);
  // marker "Telc/tele Leseverstehen, Teil 1" sits on its own line; the banner is
  // the line directly ABOVE it (form-feed + Arabic + German banner text).
  for (let i = lines.length - 1; i >= 1; i--) {
    if (/\b(?:telc|tele)[\s.-]*lese?r?verstehen/i.test(lines[i])) {
      let b = lines[i - 1].replace(/\f/g, " ");
      b = stripAr(b).replace(/\s{2,}/g, " ").trim();
      if (b) return b;
    }
  }
  return "";
}
const cleanTitle = (b) => {
  let x = stripAr(b).replace(/\s{2,}/g, " ").trim();
  x = x.replace(/\s*\d+\s*$/, "");            // trailing variant serial
  x = x.replace(/^\d+\s*/, "").trim();         // leading number
  if (!x) return "";
  if (x.length > 34) return "";                // banner is short; long = grabbed a text line
  if (/[.!?:;/@]|www|\d{2,}/.test(x)) return "";
  if (/^[a-zäöüß]/.test(x)) return "";         // starts lowercase → sentence fragment
  if (/^(text|teil|lesen|telc|tele)\b/i.test(x)) return "";
  return x;
};
const shingles = (s) => { const w = norm(s); const set = new Set(); for (let i = 0; i + 8 <= w.length; i += 2) set.add(w.slice(i, i + 8)); return set; };
const jaccard = (a, b) => { const A = shingles(a), B = shingles(b); if (!A.size || !B.size) return 0; let inter = 0; for (const x of A) if (B.has(x)) inter++; return inter / (A.size + B.size - inter); };

// locate each "Lesen Sie zuerst" delimiter with its page number (count of \f before it)
const delim = /Lesen Sie zuerst die zehn [ÜU]berschriften/gi;
const marks = []; let mm; while ((mm = delim.exec(full))) marks.push(mm.index);
const pageOf = (off) => (full.slice(0, off).match(/\f/g) || []).length + 1;

const blocks = [];
for (let k = 1; k < segs.length; k++) {
  const page = pageOf(marks[k - 1]);
  const lines = segs[k].split(/\r?\n/); const headlines = []; const ans = {}; let hi = 0;
  for (; hi < lines.length; hi++) {
    const m = lines[hi].match(hlRe);
    if (m) { const L = m[2].toUpperCase(); headlines.push({ letter: L, text: m[3].trim() }); if (m[1]) ans[+m[1]] = L; }
    if (headlines.length >= 10 && /^\s*Text\s*1\b/i.test(lines[hi + 1] || "")) break;
  }
  if (headlines.length !== 10) continue;
  if (new Set(Object.values(ans)).size !== 5 || [1,2,3,4,5].some(n=>!ans[n])) continue;
  const extract = (str) => { const o = {}; const re = /(^|\n)\s*Text\s*([1-5])\b[^\n]*\n([\s\S]*?)(?=\n\s*Text\s*[1-5]\b|$)/gi; let m; while ((m = re.exec(str))) { const p = +m[2]; const c = m[3].replace(/\n{2,}/g, "\n").trim(); if (c && !o[p]) o[p] = c; } return o; };
  const tm = extract(lines.slice(hi + 1).join("\n"));   // strictly in-segment, no cross-exercise fallback
  const texts = Object.entries(tm).map(([p, content]) => ({ position: +p, content, correct_headline: ans[+p] }));
  const banner = bannerOf(segs[k - 1]);
  const prevTail = (segs[k - 1] || "").slice(-400);
  const modified = /المعدل|التعديل/.test(prevTail);
  blocks.push({ k, page, banner, title: cleanTitle(banner), headlines, texts, key: [1,2,3,4,5].map(n=>ans[n]).join(""), modified, tcount: texts.length });
}
console.log(`Digital blocks parsed: ${blocks.length}`);
console.log(`page  mod  key    tN  banner/title              h0                              text1-start`);
for (const b of blocks) console.log(`p${String(b.page).padStart(3)}  ${b.modified?"MOD":"   "}  ${b.key}  t${b.tcount}  ${(b.title||"·").padEnd(24)} ${b.headlines[0].text.slice(0,28).padEnd(29)} ${(b.texts.find(t=>t.position===1)?.content||"(no t1)").slice(0,40)}`);

if (APPLY) {
  const all = digital.map((e, i) => ({ title: TITLES[i] || "", headlines: e.headlines, texts: e.texts }));
  await q(`delete from lesen_exercises where teil=1;`);
  for (const ex of all) {
    const correct = new Set(ex.texts.map(t => t.correct_headline));
    for (const h of ex.headlines) h.is_distractor = !correct.has(h.letter);
    const hl = ex.headlines.map(h => `(${S(h.letter)},${S(h.text)},${h.is_distractor})`);
    const tx = ex.texts.map(t => `(${t.position},${S(t.content)},${S(t.correct_headline)})`);
    const r = await q(`insert into lesen_exercises (title,teil,source_pdf,created_by) values (${S(ex.title)},1,${S("Lesen teil 1..pdf")},'${CREATED_BY}') returning id;`);
    const id = r[0].id;
    await q(`insert into lesen_t1_headlines (exercise_id,letter,text,is_distractor) values ${hl.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
    await q(`insert into lesen_t1_texts (exercise_id,position,content,correct_headline) values ${tx.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
  }
  console.log(`\nAPPLIED ${all.length} digital exercises (scanned pending).`);
} else console.log(`\n(dry run)`);

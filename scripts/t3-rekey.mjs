/** Re-key Teil 3: match each DB exercise to its PDF version by situation
 * signature and set the correct answer key (correct_letter / no_match) from the
 * PDF. Situations + ads in the DB are already correct; only keys were wrong.
 * --apply writes; default is a dry-run report. */
import { readFileSync } from "node:fs";
const KM = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\t3-keymap.json";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const APPLY = process.argv.includes("--apply");
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }
const norm = (s) => (s || "").replace(/[؀-ۿ‌-‏‪-‮]/g, "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

const pdf = JSON.parse(readFileSync(KM, "utf8"));
// per-version bag of situation-word tokens (fuzzy match tolerant of OCR noise)
const shingle = (s) => { const w = norm(s); const g = new Set(); for (let i = 0; i + 6 <= w.length; i += 1) g.add(w.slice(i, i + 6)); return g; };
for (const v of pdf) v._sh = shingle([11,12,13,14,15,16,17,18,19,20].map(n => v.situations[n] || "").join(" "));
function jac(a, b) { let inter = 0; for (const x of a) if (b.has(x)) inter++; return inter / (a.size + b.size - inter || 1); }
function bestMatch(sh) {
  let best = null, bestScore = -1, second = -1;
  for (const v of pdf) { const s = jac(sh, v._sh); if (s > bestScore) { second = bestScore; bestScore = s; best = v; } else if (s > second) second = s; }
  return { best, score: bestScore, gap: bestScore - second };
}

const rows = await q(`select e.id, row_number() over (order by e.created_at) n,
  coalesce((select json_agg(json_build_object('num',s.number,'desc',s.description,'cl',s.correct_letter,'nm',s.no_match) order by s.number) from lesen_t3_situations s where s.exercise_id=e.id),'[]') sits
  from lesen_exercises e where e.teil=3 order by e.created_at;`);

let matched = 0, keyOk = 0, keyFix = 0, unmatched = [];
const usedPdf = new Map();
const plan = [];
for (const r of rows) {
  const sits = r.sits;
  const sh = shingle(sits.map(s => s.desc).join(" "));
  const curKey = [...Array(10)].map((_, i) => { const s = sits.find(x => x.num === 11 + i); return s ? (s.cl || (s.nm ? "X" : "-")) : "-"; }).join("");
  const { best, score, gap } = bestMatch(sh);
  const confident = score >= 0.55 && gap >= 0.04;
  if (!best || !confident) { unmatched.push({ n: r.n, curKey, score: score.toFixed(2), gap: gap.toFixed(2), s11: (sits[0]?.desc || "").slice(0, 42) }); continue; }
  matched++;
  usedPdf.set(best.page, (usedPdf.get(best.page) || 0) + 1);
  const correctKey = best.key;
  if (correctKey === curKey) keyOk++; else keyFix++;
  plan.push({ id: r.id, n: r.n, pdfPage: best.page, curKey, correctKey, fix: correctKey !== curKey, score: score.toFixed(2), sits });
}
console.log(`DB exercises: ${rows.length} | matched to PDF: ${matched} | unmatched: ${unmatched.length}`);
console.log(`Keys already correct: ${keyOk} | keys to FIX: ${keyFix}`);
const missing = pdf.filter(v => !usedPdf.has(v.page));
console.log(`PDF versions with NO DB match (missing): ${missing.length}${missing.length ? " -> pages " + missing.map(v=>v.page).join(",") : ""}`);
console.log(`\nUnmatched DB exercises:`); for (const u of unmatched) console.log(`  n${u.n} key=${u.curKey} s11="${u.s11}"`);
console.log(`\nKey fixes (n: cur -> correct  [PDF p]):`);
for (const p of plan.filter(x => x.fix)) console.log(`  n${String(p.n).padStart(2)}: ${p.curKey} -> ${p.correctKey}  [p${p.pdfPage}]`);

if (APPLY) {
  let applied = 0;
  for (const p of plan.filter(x => x.fix)) {
    const stmts = [];
    for (let i = 0; i < 10; i++) {
      const num = 11 + i; const letter = p.correctKey[i];
      if (letter === "X") stmts.push(`update lesen_t3_situations set correct_letter=null, no_match=true where exercise_id='${p.id}' and number=${num};`);
      else if (/[A-L]/.test(letter)) stmts.push(`update lesen_t3_situations set correct_letter='${letter}', no_match=false where exercise_id='${p.id}' and number=${num};`);
    }
    await q(stmts.join("\n"));
    applied++;
  }
  console.log(`\nAPPLIED key fixes to ${applied} exercises.`);
} else console.log(`\n(dry run — re-run with --apply)`);

/**
 * FREE Teil 1 title cleanup + dedupe (no API). Uses the new PDF text layer as
 * the source of truth. Matches each DB exercise to a PDF exercise by ANSWER KEY
 * (robust even when old-vision headlines are garbled) and applies the clean
 * German title; strips Arabic / removes artificial numbering as fallback; flags
 * duplicates (same answer key + same headline set). --apply to execute.
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env","utf8").split(/\r?\n/)){ const m=l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if(m) env[m[1]]=m[2]; }
async function q(sql){ const r=await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})}); const t=await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t); }
const b64 = (s)=> Buffer.from(s??"","utf8").toString("base64");
const norm = (s)=> (s||"").toLowerCase().replace(/[^a-z0-9äöüß]/g,"");
const apply = process.argv.includes("--apply");
const POPPLER = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const pdf = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";

// ── Parse PDF: answerKey + clean German title + headline set per exercise ──
const dir = mkdtempSync(join(tmpdir(),"ft-")); const out=join(dir,"o.txt");
execFileSync(POPPLER,["-layout",pdf,out],{stdio:"pipe"});
const full = readFileSync(out,"utf8");
const segs = full.split(/Lesen Sie zuerst die zehn [ÜU]berschriften/i);
const hlRe = /^\s*(?:(\d)_|_{2})\s*([a-j])\)\s*(.+?)\s*$/i;
function cleanTitle(t){
  if(!t) return "";
  if(/(?:__|\d_)\s*[a-j]\)/i.test(t)) return "";      // a headline line, not a title
  let x = t.replace(/[؀-ۿ‎‏‪-‮]/g,"").trim();            // strip Arabic + RTL marks
  x = x.replace(/^\d+\s+/,"").replace(/\s*\/\s*.*$/,"").trim(); // drop "/ subtitle"
  if(!x || x.length>40) return "";
  if(/[)(&]/.test(x)) return "";                         // brackets / "Z & K" publisher mark
  if(/^[a-zäöüß]/.test(x)) return "";
  if(/[.!?]$/.test(x)) return "";
  if(/^(Text|telc|tele|Leseverstehen|Teil|LESEN|Lesen)\b/i.test(x)) return "";
  if(x.split(/\s+/).length>5) return "";
  return x;
}
const byAnswer = new Map(); const byHl = [];
for(let k=1;k<segs.length;k++){
  const lines = segs[k].split(/\r?\n/);
  const hls=[]; const ans={};
  for(const ln of lines){ const m=ln.match(hlRe); if(!m) continue; const letter=m[2].toUpperCase(); hls.push({letter,text:m[3].trim()}); if(m[1]) ans[+m[1]]=letter; }
  if(hls.length<8) continue;
  const key=[1,2,3,4,5].map(n=>ans[n]||"?").join("");
  // title from tail of previous segment
  const tailLines=(segs[k-1]||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  let title=""; for(let j=tailLines.length-1;j>=0;j--){ const c=cleanTitle(tailLines[j]); if(c){ title=c; break; } }
  const hset=new Set(hls.map(h=>norm(h.text)));
  if(!key.includes("?") && !byAnswer.has(key)) byAnswer.set(key,{title,hset});
  byHl.push({key,title,hset});
}
console.log(`PDF: ${byHl.length} exercise blocks parsed, ${byAnswer.size} with full answer key`);

// ── DB ──
const rows = await q(`select e.id, e.title, (select string_agg(t.correct_headline,'' order by t.position) from lesen_t1_texts t where t.exercise_id=e.id) ans, coalesce((select json_agg(h.text) from lesen_t1_headlines h where h.exercise_id=e.id),'[]') hs from lesen_exercises e where e.teil=1;`);
function fuzzyTitle(hs){ const s=hs.map(norm); let best=0,t=""; for(const e of byHl){ const o=s.filter(x=>e.hset.has(x)).length; if(o>best){best=o;t=e.title;} } return best>=6?t:""; }

const updates=[]; const seenHl=new Map(); const dupes=[];
for(const r of rows){
  const hsArr = r.hs||[]; const sig = hsArr.map(norm).sort().join("|");
  // duplicate: identical headline set already seen
  if(seenHl.has(sig)){ dupes.push({id:r.id,title:r.title,keep:seenHl.get(sig)}); continue; }
  seenHl.set(sig, r.title||r.id);
  const cur=(r.title||"").trim();
  const hasArabic = /[؀-ۿ]/.test(cur);
  const isPlaceholder = /^Lesen Teil 1/i.test(cur);
  // A title is already clean if it has no Arabic, isn't empty, and isn't a
  // placeholder — leave those untouched (spurious numbering handled afterwards).
  if(!hasArabic && cur!=="" && !isPlaceholder) { seenHl.set(sig, cur); continue; }
  const germanPart = cleanTitle(cur);
  let proposed = "", method = "none";
  if(hasArabic && germanPart) { proposed = germanPart; method = "arabic-strip"; }
  else if(r.ans && byAnswer.get(r.ans)?.title) { proposed = byAnswer.get(r.ans).title; method = "answer-key"; }
  else { const f = fuzzyTitle(hsArr); if(f){ proposed = f; method = "fuzzy"; } }
  // Auto-apply only high-confidence (answer-key / arabic-strip). Fuzzy + none →
  // manual (admin panel) so we never write a guessed wrong title.
  if(proposed && proposed!==cur && (method==="answer-key" || method==="arabic-strip"))
    updates.push({id:r.id, from:cur||"(empty)", to:proposed, method});
  else
    updates.push({id:r.id, from:cur||"(empty)", to:"__NEEDS_MANUAL__", note:method==="fuzzy"?`fuzzy guess: ${proposed}`:"no clean PDF match"});
}
console.log(`\nTITLE UPDATES (${updates.length}):`);
for(const u of updates) console.log(`  ${u.to==="__NEEDS_MANUAL__"?"⚠":"✎"} "${u.from}" → "${u.to}"${u.note?" ("+u.note+")":""}`);
console.log(`\nDUPLICATES to remove (${dupes.length}):`);
for(const d of dupes) console.log(`  ✗ "${d.title}" (dup of "${d.keep}")`);

if(apply){
  for(const u of updates){ if(u.to==="__NEEDS_MANUAL__") continue; await q(`update lesen_exercises set title=convert_from(decode('${b64(u.to)}','base64'),'UTF8') where id='${u.id}';`); }
  for(const d of dupes){ await q(`delete from lesen_exercises where id='${d.id}';`); }
  console.log(`\nAPPLIED: ${updates.filter(u=>u.to!=="__NEEDS_MANUAL__").length} title updates, ${dupes.length} duplicates removed.`);
} else console.log(`\n(dry run — re-run with --apply)`);

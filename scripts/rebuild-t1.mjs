/**
 * Exact Teil 1 clean-section rebuild from the new PDF text layer (no API, no
 * guesses). Title = the line immediately before the "Telc Leseverstehen, Teil 1"
 * marker. Answer key = the official inline N_ prefixes. Dedups repeated blocks
 * by answer key (keeps the one carrying a title). --apply wipes the existing
 * clean-section rows and inserts the exact versions; exercises whose title is
 * not present in the text layer are listed as NEEDS-PAGE-READ (I transcribe
 * those from the rendered page separately).
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const env={}; for(const l of readFileSync("C:/Users/asus/AuraLingovia/.env","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if(m) env[m[1]]=m[2];}
async function q(sql){const r=await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})});const t=await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);}
const b64=(s)=>Buffer.from(s??"","utf8").toString("base64");
const S=(s)=>`convert_from(decode('${b64(s)}','base64'),'UTF8')`;
const apply=process.argv.includes("--apply");
const CREATED_BY=env.IMPORT_CREATED_BY||"6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER="C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const pdf="C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";

function cleanTitle(t){
  if(!t) return "";
  let x=t.replace(/[؀-ۿ‎‏‪-‮]/g,"").trim();
  if(!x||x.length>45||/[)(&]/.test(x)) return "";
  if(/^[a-zäöüß]/.test(x)||/[.!?:]$/.test(x)) return "";       // sentence fragment
  if(/^(Text|telc|tele|Leseverstehen|Teil|LESEN|Lesen|Informationen|Thema)\b/i.test(x)) return "";
  if(x.split(/\s+/).length>5) return "";
  return x;
}

const dir=mkdtempSync(join(tmpdir(),"rb-")); const out=join(dir,"o.txt");
execFileSync(POPPLER,["-layout",pdf,out],{stdio:"pipe"});
const full=readFileSync(out,"utf8");
const segs=full.split(/Lesen Sie zuerst die zehn [ÜU]berschriften/i);
const hlRe=/^\s*(?:(\d)_|_{2})\s*([a-j])\)\s*(.+?)\s*$/i;
const byKey=new Map();
for(let k=1;k<segs.length;k++){
  const lines=segs[k].split(/\r?\n/); const headlines=[]; const ans={}; let hi=0;
  for(;hi<lines.length;hi++){ const m=lines[hi].match(hlRe); if(m){ const L=m[2].toUpperCase(); headlines.push({letter:L,text:m[3].trim()}); if(m[1]) ans[+m[1]]=L; }
    if(headlines.length>=10 && /^\s*Text\s*1\b/i.test(lines[hi+1]||"")) break; }
  if(headlines.length!==10) continue;                            // skip merged/incomplete here
  const key=[1,2,3,4,5].map(n=>ans[n]||"?").join("");
  if(key.includes("?")) continue;
  if(new Set(Object.values(ans)).size!==5) continue;
  const extract=(str)=>{ const o={}; const re=/(^|\n)\s*Text\s*([1-5])\b[^\n]*\n([\s\S]*?)(?=\n\s*Text\s*[1-5]\b|$)/gi; let m; while((m=re.exec(str))){ const p=+m[2]; const c=m[3].replace(/\n{2,}/g,"\n").trim(); if(c&&!o[p]) o[p]=c; } return o; };
  let tm=extract(lines.slice(hi+1).join("\n")); if(Object.keys(tm).length<5) tm=extract(segs[k-1]||"");
  const texts=Object.entries(tm).map(([p,content])=>({position:+p,content,correct_headline:ans[+p]}));
  if(texts.length!==5) continue;
  // title = line before the "Telc...Leseverstehen" marker at end of prev segment
  const pl=(segs[k-1]||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  while(pl.length && /Telc.{0,3}Leseverstehen|tele\s*leserverstehen|^Teil\s*1$/i.test(pl[pl.length-1])) pl.pop();
  while(pl.length && (/^\d+$/.test(pl[pl.length-1]) || /[א-ת&]/.test(pl[pl.length-1]))) pl.pop();
  const title=cleanTitle(pl[pl.length-1]||"");
  const correct=new Set(Object.values(ans));
  for(const h of headlines) h.is_distractor=!correct.has(h.letter);
  const prev=byKey.get(key);
  // keep the block that has a title (dedupe repeated blocks)
  if(!prev || (!prev.title && title)) byKey.set(key,{key,title,headlines,texts});
}
const list=[...byKey.values()];
const titled=list.filter(e=>e.title), untitled=list.filter(e=>!e.title);
console.log(`Unique clean exercises: ${list.length}  (with title: ${titled.length}, NEEDS-PAGE-READ: ${untitled.length})`);
console.log(`\nWITH EXACT TITLE:`); for(const e of titled) console.log(`  ${e.key}  "${e.title}"`);
console.log(`\nNEEDS-PAGE-READ (no title in text layer):`); for(const e of untitled) console.log(`  ${e.key}`);

if(apply){
  await q(`delete from lesen_exercises where teil=1;`);
  for(const e of list){
    const hl=e.headlines.map(h=>`(${S(h.letter)},${S(h.text)},${h.is_distractor})`);
    const tx=e.texts.map(t=>`(${t.position},${S(t.content)},${S(t.correct_headline)})`);
    const r=await q(`insert into lesen_exercises (title,teil,source_pdf,created_by) values (${S(e.title||"")},1,${S("Lesen teil 1..pdf")},'${CREATED_BY}') returning id;`);
    const id=r[0].id;
    await q(`insert into lesen_t1_headlines (exercise_id,letter,text,is_distractor) values ${hl.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
    await q(`insert into lesen_t1_texts (exercise_id,position,content,correct_headline) values ${tx.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
  }
  console.log(`\nAPPLIED: wiped + inserted ${list.length} exact exercises.`);
} else console.log(`\n(dry run — re-run with --apply)`);

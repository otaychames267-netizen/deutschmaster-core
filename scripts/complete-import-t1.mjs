/**
 * FREE "complete the Teil 1 import" (no API). The new PDF text layer is the
 * source of truth. For each clean PDF exercise we find its DB counterpart by
 * headline overlap; if the DB copy is garbled (Arabic/empty/placeholder title or
 * a mismatching answer key from the old vision import) we REPLACE its title,
 * headlines and texts with the clean version (correct answer key included).
 * Already-clean, correct exercises are left untouched. Unmatched clean PDF
 * exercises are inserted. --apply to execute.
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const env={}; for(const l of readFileSync("C:/Users/asus/AuraLingovia/.env","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if(m) env[m[1]]=m[2];}
async function q(sql){const r=await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})});const t=await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);}
const b64=(s)=>Buffer.from(s??"","utf8").toString("base64");
const norm=(s)=>(s||"").toLowerCase().replace(/[^a-z0-9äöüß]/g,"");
const sqlStr=(s)=>`convert_from(decode('${b64(s)}','base64'),'UTF8')`;
const apply=process.argv.includes("--apply");
const CREATED_BY=env.IMPORT_CREATED_BY||"6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER="C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin\\pdftotext.exe";
const pdf="C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";

function cleanTitle(t){
  if(!t) return "";
  if(/(?:__|\d_)\s*[a-j]\)/i.test(t)) return "";
  let x=t.replace(/[؀-ۿ‎‏‪-‮]/g,"").trim().replace(/^\d+\s+/,"").replace(/\s*\/\s*.*$/,"").trim();
  if(!x||x.length>40||/[)(&]/.test(x)||/^[a-zäöüß]/.test(x)||/[.!?]$/.test(x)) return "";
  if(/^(Text|telc|tele|Leseverstehen|Teil|LESEN|Lesen)\b/i.test(x)) return "";
  if(x.split(/\s+/).length>5) return "";
  return x;
}

// ── Parse clean PDF exercises ──
const dir=mkdtempSync(join(tmpdir(),"ci-")); const out=join(dir,"o.txt");
execFileSync(POPPLER,["-layout",pdf,out],{stdio:"pipe"});
const full=readFileSync(out,"utf8");
const segs=full.split(/Lesen Sie zuerst die zehn [ÜU]berschriften/i);
const hlRe=/^\s*(?:(\d)_|_{2})\s*([a-j])\)\s*(.+?)\s*$/i;
const exs=[];
for(let k=1;k<segs.length;k++){
  const lines=segs[k].split(/\r?\n/);
  const headlines=[]; const ans={}; let hi=0;
  for(;hi<lines.length;hi++){ const m=lines[hi].match(hlRe); if(m){ const L=m[2].toUpperCase(); headlines.push({letter:L,text:m[3].trim()}); if(m[1]) ans[+m[1]]=L; }
    if(headlines.length>=10 && /^\s*Text\s*1\b/i.test(lines[hi+1]||"")) break; }
  if(headlines.length!==10) continue;
  // texts (this segment, fallback prevTail)
  const extract=(str)=>{ const o={}; const re=/(^|\n)\s*Text\s*([1-5])\b[^\n]*\n([\s\S]*?)(?=\n\s*Text\s*[1-5]\b|$)/gi; let m; while((m=re.exec(str))){ const p=+m[2]; const c=m[3].replace(/\n{2,}/g,"\n").trim(); if(c&&!o[p]) o[p]=c; } return o; };
  let tm=extract(lines.slice(hi+1).join("\n")); if(!Object.keys(tm).length) tm=extract(segs[k-1]||"");
  const texts=Object.entries(tm).map(([p,content])=>({position:+p,content,correct_headline:ans[+p]||""}));
  if(texts.length!==5 || new Set(texts.map(t=>t.correct_headline)).size!==5) continue;
  if(texts.some(t=>!/^[A-J]$/.test(t.correct_headline))) continue;
  // mark distractors
  const correct=new Set(texts.map(t=>t.correct_headline));
  for(const h of headlines) h.is_distractor=!correct.has(h.letter);
  // title
  const tail=(segs[k-1]||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  let title=""; for(let j=tail.length-1;j>=0;j--){ const c=cleanTitle(tail[j]); if(c){title=c;break;} }
  exs.push({title,headlines,texts,answers:[1,2,3,4,5].map(n=>ans[n]).join(""),set:new Set(headlines.map(h=>norm(h.text)))});
}
console.log(`Clean PDF exercises parsed: ${exs.length}`);

// ── DB ──
const rows=await q(`select e.id,e.title,(select string_agg(t.correct_headline,'' order by t.position) from lesen_t1_texts t where t.exercise_id=e.id) ans, coalesce((select json_agg(h.text) from lesen_t1_headlines h where h.exercise_id=e.id),'[]') hs from lesen_exercises e where e.teil=1;`);
for(const r of rows){ r.set=new Set((r.hs||[]).map(norm)); r.claimed=false; }

// ── Greedy 1:1 match by overlap (>=7) ──
const pairs=[];
for(const ex of exs) for(const r of rows){ const o=[...ex.set].filter(x=>r.set.has(x)).length; if(o>=7) pairs.push({ex,r,o}); }
pairs.sort((a,b)=>b.o-a.o);
const matched=new Map();
for(const p of pairs){ if(p.ex._done||p.r.claimed) continue; p.ex._done=true; p.r.claimed=true; matched.set(p.ex,p.r); }

let replaced=0, inserted=0, unchanged=0;
const plan=[];
for(const ex of exs){
  const r=matched.get(ex);
  if(r){
    const garbled = !r.title || /[؀-ۿ]/.test(r.title) || /^Lesen Teil 1/i.test(r.title) || r.ans!==ex.answers;
    if(garbled){ plan.push({kind:"REPLACE",id:r.id,from:`${r.title||"(empty)"} [${r.ans}]`,to:`${ex.title||"(no title)"} [${ex.answers}]`}); replaced++; }
    else unchanged++;
  } else { plan.push({kind:"INSERT",to:`${ex.title||"(no title)"} [${ex.answers}]`}); inserted++; }
}
console.log(`\nPlan: ${replaced} replace, ${inserted} insert, ${unchanged} already-correct (untouched)`);
for(const p of plan) console.log(`  ${p.kind==="REPLACE"?"♻":"＋"} ${p.kind} ${p.from?`"${p.from}" → `:""}"${p.to}"`);

if(apply){
  for(const ex of exs){
    const r=matched.get(ex);
    const hlVals=ex.headlines.map(h=>`(${sqlStr(h.letter)},${sqlStr(h.text)},${h.is_distractor})`).join(",");
    const txVals=ex.texts.map(t=>`(${t.position},${sqlStr(t.content)},${sqlStr(t.correct_headline)})`).join(",");
    if(r){
      const garbled = !r.title || /[؀-ۿ]/.test(r.title) || /^Lesen Teil 1/i.test(r.title) || r.ans!==ex.answers;
      if(!garbled) continue;
      await q(`update lesen_exercises set title=${sqlStr(ex.title||"")} where id='${r.id}';
        delete from lesen_t1_headlines where exercise_id='${r.id}';
        delete from lesen_t1_texts where exercise_id='${r.id}';
        insert into lesen_t1_headlines (exercise_id,letter,text,is_distractor) values ${hlVals.replace(/\(/g,`('${r.id}',`)};
        insert into lesen_t1_texts (exercise_id,position,content,correct_headline) values ${txVals.replace(/\(/g,`('${r.id}',`)};`);
    } else {
      await q(`select import_lesen_t1_exercise_admin('${CREATED_BY}'::uuid, ${sqlStr(ex.title||"Lesen Teil 1")}, ${sqlStr(JSON.stringify(ex.headlines))}::jsonb, ${sqlStr(JSON.stringify(ex.texts))}::jsonb, ${sqlStr("Lesen teil 1..pdf")});`);
    }
  }
  console.log(`\nAPPLIED: ${replaced} replaced, ${inserted} inserted.`);
} else console.log(`\n(dry run — re-run with --apply)`);

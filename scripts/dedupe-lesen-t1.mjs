/**
 * FREE duplicate detection for Teil 1 (no API). Two exercises with a high
 * headline overlap (>=8/10) are the same exercise — typically a clean text-layer
 * copy and a garbled old-vision copy (Arabic/empty title, possibly wrong answer
 * key). Keeps the best-titled copy, removes the rest. --apply to execute.
 */
import { readFileSync } from "node:fs";
const env={}; for(const l of readFileSync("C:/Users/asus/AuraLingovia/.env","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if(m) env[m[1]]=m[2];}
async function q(sql){const r=await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})});const t=await r.text(); if(!r.ok) throw new Error(t); return JSON.parse(t);}
const norm=(s)=>(s||"").toLowerCase().replace(/[^a-z0-9äöüß]/g,"");
const apply=process.argv.includes("--apply");

const rows=await q(`select e.id,e.title,(select string_agg(t.correct_headline,'' order by t.position) from lesen_t1_texts t where t.exercise_id=e.id) ans, coalesce((select json_agg(h.text) from lesen_t1_headlines h where h.exercise_id=e.id),'[]') hs from lesen_exercises e where e.teil=1;`);
for(const r of rows) r.set=new Set((r.hs||[]).map(norm));
// title quality score: clean German best
function score(t){ t=(t||"").trim(); if(t==="") return 0; if(/^Lesen Teil 1/i.test(t)) return 1; if(/[؀-ۿ]/.test(t)) return 2; return 5; }

const removed=new Set(); const groups=[];
for(let i=0;i<rows.length;i++){
  if(removed.has(rows[i].id)) continue;
  const grp=[rows[i]];
  for(let j=i+1;j<rows.length;j++){
    if(removed.has(rows[j].id)) continue;
    const o=[...rows[i].set].filter(x=>rows[j].set.has(x)).length;
    if(o>=8){ grp.push(rows[j]); }
  }
  if(grp.length>1){
    grp.sort((a,b)=>score(b.title)-score(a.title)); // best first
    for(let k=1;k<grp.length;k++) removed.add(grp[k].id);
    groups.push(grp);
  }
}
console.log(`Duplicate groups (>=8/10 headline overlap): ${groups.length}`);
for(const g of groups){
  console.log(`  KEEP "${g[0].title||'(empty)'}" [${g[0].ans}]`);
  for(let k=1;k<g.length;k++) console.log(`    remove "${g[k].title||'(empty)'}" [${g[k].ans}]`);
}
console.log(`\nTotal to remove: ${removed.size}`);
if(apply){ for(const id of removed) await q(`delete from lesen_exercises where id='${id}';`); console.log(`APPLIED: removed ${removed.size} duplicate(s).`); }
else console.log(`(dry run — re-run with --apply)`);

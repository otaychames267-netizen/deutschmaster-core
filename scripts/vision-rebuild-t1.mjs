/**
 * AUTHORITATIVE Teil 1 rebuild from the PDF page IMAGES via Claude vision.
 * The image is the single source of truth — exact banner title, headlines, texts
 * and answer key. Detects each exercise's "headlines page" (>=6 A–J option lines
 * in the text layer, works for clean + scanned), then reads that page plus its
 * neighbours as images. Validates, dedups by answer key + headlines, then (with
 * --apply) WIPES teil-1 and inserts the exact exercises. Deterministic cache →
 * resumable, never re-charged. --plan shows cost with no API.
 *
 * Usage: bun scripts/vision-rebuild-t1.mjs [--plan] [--apply] [--concurrency N] [--model X]
 */
import { readFileSync, mkdtempSync, mkdirSync, existsSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const KEY = env.ANTHROPIC_API_KEY, SBP = env.SUPABASE_ACCESS_TOKEN, REF = env.SUPABASE_PROJECT_REF;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const POPPLER_DIR = "C:\\Users\\asus\\AppData\\Local\\poppler\\poppler-26.02.0\\Library\\bin";
const PDF = "C:\\Users\\asus\\Desktop\\TELC PDFS LESEN\\Lesen teil 1..pdf";
const MODEL = (()=>{const i=process.argv.indexOf("--model");return i>0?process.argv[i+1]:"claude-sonnet-4-6";})();
const CONC = (()=>{const i=process.argv.indexOf("--concurrency");return i>0?Math.max(1,parseInt(process.argv[i+1],10)):4;})();
const PLAN = process.argv.includes("--plan"), APPLY = process.argv.includes("--apply");
const PROMPT_VERSION = "t1-vision-v2";
const CACHE_DIR = join(env.LOCALAPPDATA || tmpdir(), "lesen-import-cache"); mkdirSync(CACHE_DIR, { recursive: true });

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
async function runSql(sql){ const r=await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:"POST",headers:{Authorization:`Bearer ${SBP}`,"Content-Type":"application/json"},body:JSON.stringify({query:sql})}); const t=await r.text(); if(!r.ok) throw new Error(`SQL ${r.status}: ${t}`); return JSON.parse(t); }

// ── render all pages + per-page text for headlines-page detection ──
const dir = mkdtempSync(join(tmpdir(), "vrb-"));
execFileSync(join(POPPLER_DIR,"pdftoppm.exe"), ["-png","-r","150",PDF,join(dir,"p")], { stdio:"pipe" });
const pages = readdirSync(dir).filter(f=>f.endsWith(".png")).sort((a,b)=>parseInt(a.match(/(\d+)\.png$/)[1])-parseInt(b.match(/(\d+)\.png$/)[1])).map(f=>join(dir,f));
const txtFile = join(dir,"t.txt"); execFileSync(join(POPPLER_DIR,"pdftotext.exe"),["-layout",PDF,txtFile],{stdio:"pipe"});
const pageText = readFileSync(txtFile,"utf8").split("\f");
const optRe = /^\s*(?:\d_|_+|\d)?\s*[a-j]\)/i;
const headlinePages = [];
pageText.forEach((t,i)=>{ const n=t.split(/\r?\n/).filter(l=>optRe.test(l)).length; if(n>=6) headlinePages.push(i); });
console.log(`${pages.length} pages, ${headlinePages.length} headlines pages detected (=${headlinePages.length} expected exercises)`);

const pdfStamp = statSync(PDF).size;
function cacheFile(idx, model, wide){ return join(CACHE_DIR, createHash("sha256").update(model).update(PROMPT_VERSION).update(`${pdfStamp}#hp${idx}${wide?"#wide":""}`).digest("hex")+".json"); }

const PROMPT = `These page images are from an official TELC B2 "Leseverstehen, Teil 1" exercise (a SOLVED copy showing the official answer key). One exercise = a prominent TITLE/banner, 10 headlines labelled A–J, and 5 short texts numbered 1–5. Each text matches exactly ONE headline; in the solved copy the correct headline for each text is marked (e.g. the matching number printed next to the headline like "3 c", or the letter written by the text).

Extract the ONE complete exercise verbatim (no translation, paraphrase or correction; keep German text and \\n):
- title: the prominent printed banner/heading text exactly as shown (the GERMAN words, e.g. "GRIPPE IMPFUNG", "Schlafzug"). Ignore foreign-script translations and the publisher mark. If there is truly no title, "".
- headlines: all 10 { letter A–J, text verbatim }.
- texts: all 5 { position 1–5, content verbatim, correct_headline = the A–J letter the answer key assigns to that text }.
The 5 texts must map to 5 DISTINCT headlines. Set skip=true if the images do not contain one complete exercise.`;

async function extract(idx, model, wide=false){
  const cf = cacheFile(idx, model, wide);
  if(existsSync(cf)) return { data: JSON.parse(readFileSync(cf,"utf8")), cached:true };
  const p = headlinePages[idx];
  const win = wide ? [p-2,p-1,p,p+1,p+2] : [p-1,p,p+1];
  const imgs = win.filter(x=>x>=0&&x<pages.length).map(x=>({type:"image",source:{type:"base64",media_type:"image/png",data:readFileSync(pages[x]).toString("base64")}}));
  const tool={name:"submit",description:"Submit one Teil 1 exercise",input_schema:{type:"object",properties:{skip:{type:"boolean"},title:{type:"string"},headlines:{type:"array",items:{type:"object",properties:{letter:{type:"string"},text:{type:"string"}},required:["letter","text"]}},texts:{type:"array",items:{type:"object",properties:{position:{type:"integer"},content:{type:"string"},correct_headline:{type:"string"}},required:["position","content","correct_headline"]}}},required:["headlines","texts"]}};
  const body={model,max_tokens:8192,tools:[tool],tool_choice:{type:"tool",name:"submit"},messages:[{role:"user",content:[{type:"text",text:PROMPT},...imgs]}]};
  for(let a=0;a<3;a++){ try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json(); if(!r.ok) throw new Error(`Claude ${r.status}: ${JSON.stringify(j).slice(0,150)}`);
    const blk=(j.content||[]).find(b=>b.type==="tool_use"); if(!blk) throw new Error("no tool_use");
    writeFileSync(cf, JSON.stringify(blk.input)); return { data:blk.input, usage:j.usage };
  }catch(e){ if(a===2) throw e; await new Promise(r=>setTimeout(r,1500*(a+1))); } }
}
function valid(ex){ const h=Array.isArray(ex.headlines)?ex.headlines:[],t=Array.isArray(ex.texts)?ex.texts:[];
  if(h.length!==10||new Set(h.map(x=>(x.letter||"").toUpperCase())).size!==10) return false;
  if(t.length!==5) return false; const u=new Set(t.map(x=>(x.correct_headline||"").toUpperCase()));
  if(u.size!==5||[...u].some(x=>!/^[A-J]$/.test(x))) return false;
  if(t.some(x=>!x.content||!x.content.trim())||h.some(x=>!x.text||!x.text.trim())) return false; return true; }
const sig=(ex)=>createHash("sha256").update(norm((ex.headlines||[]).map(h=>h.text).sort().join("|"))).digest("hex").slice(0,16);

if(PLAN){ let cached=0; for(let i=0;i<headlinePages.length;i++) if(existsSync(cacheFile(i,MODEL))) cached++;
  console.log(`PLAN: ${headlinePages.length} exercises, ${cached} cached(free), ${headlinePages.length-cached} need API (~$${((headlinePages.length-cached)*0.05).toFixed(2)} at Sonnet).`); process.exit(0); }

let inTok=0,outTok=0; const results=new Array(headlinePages.length);
const queue=[...headlinePages.keys()];
async function worker(){ let i; while((i=queue.shift())!==undefined){ try{ let {data,usage}=await extract(i,MODEL); if(usage){inTok+=usage.input_tokens||0;outTok+=usage.output_tokens||0;}
    if(!data.skip && !valid(data)){ const w=await extract(i,MODEL,true); if(w.usage){inTok+=w.usage.input_tokens||0;outTok+=w.usage.output_tokens||0;} if(!w.data.skip && (valid(w.data) || ((w.data.texts||[]).length>(data.texts||[]).length))) data=w.data; }
    results[i]={page:headlinePages[i]+1,data}; const dh=(data.headlines||[]).length,dt=(data.texts||[]).length,da=new Set((data.texts||[]).map(x=>(x.correct_headline||"").toUpperCase())).size; console.log(`  hp${i} (page ${headlinePages[i]+1}): ${data.skip?"skip":`"${(data.title||"(no title)").slice(0,28)}" h=${dh} t=${dt} ans=${da} ${valid(data)?"ok":"INVALID"}`}`); }catch(e){ results[i]={page:headlinePages[i]+1,error:e.message}; console.log(`  hp${i}: ERROR ${e.message}`);} } }
await Promise.all(Array.from({length:Math.min(CONC,headlinePages.length)},worker));

// dedup + collect valid
const seen=new Map(); const final=[]; let invalid=0;
for(const r of results){ if(!r||r.error||!r.data||r.data.skip){ if(r&&!r.data?.skip&&!r.error) invalid++; continue; }
  if(!valid(r.data)){ invalid++; console.log(`  ⚠ invalid @ page ${r.page}: "${r.data.title||""}"`); continue; }
  const s=sig(r.data); if(seen.has(s)) continue; seen.set(s,1);
  const correct=new Set(r.data.texts.map(t=>(t.correct_headline||"").toUpperCase()));
  r.data.headlines.forEach(h=>h.is_distractor=!correct.has((h.letter||"").toUpperCase()));
  final.push(r.data); }
console.log(`\nExtracted ${final.length} unique valid exercises (invalid/skipped: ${invalid}). tokens in=${inTok} out=${outTok}`);

if(APPLY){
  await runSql(`delete from lesen_exercises where teil=1;`);
  for(const ex of final){
    const hl=ex.headlines.map(h=>`(${S((h.letter||"").toUpperCase())},${S(h.text)},${!!h.is_distractor})`);
    const tx=ex.texts.map(t=>`(${t.position},${S(t.content)},${S((t.correct_headline||"").toUpperCase())})`);
    const r=await runSql(`insert into lesen_exercises (title,teil,source_pdf,created_by) values (${S(ex.title||"")},1,${S("Lesen teil 1..pdf")},'${CREATED_BY}') returning id;`);
    const id=r[0].id;
    await runSql(`insert into lesen_t1_headlines (exercise_id,letter,text,is_distractor) values ${hl.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
    await runSql(`insert into lesen_t1_texts (exercise_id,position,content,correct_headline) values ${tx.map(v=>`('${id}',`+v.slice(1)).join(",")};`);
  }
  console.log(`APPLIED: wiped + inserted ${final.length} exercises.`);
} else console.log(`(dry run — re-run with --apply; extractions are cached so apply is free)`);

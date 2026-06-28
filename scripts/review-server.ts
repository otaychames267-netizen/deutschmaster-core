/**
 * review-server.ts — local side-by-side review tool for Lesen Teil 2.
 *
 * Shows each exercise's PDF page image beside the OCR-extracted article text,
 * highlights flagged passages, and lets you correct + approve each one. NOTHING
 * is written to the database until you click "Commit approved", and only
 * approved exercises are committed.
 *
 * Run:  tsx scripts/review-server.ts "<pdf>" <outName> [port]
 * Then open http://localhost:<port>
 */
import "dotenv/config";
import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { extractPageImagePng } from "../src/lib/import/gemini-vision.js";
import { checkCoherence } from "../src/lib/import/coherence.js";
import { createClient } from "@supabase/supabase-js";

const PDF = process.argv[2];
const OUT = process.argv[3] ?? "t2_pdf1";
const PORT = parseInt(process.argv[4] ?? "8717");
const CACHE_DIR = "scripts/.extract-cache";
const PAGE_DIR = "scripts/.page-dumps";
const EX_FILE = path.join(CACHE_DIR, `${OUT}.exercises.json`);
const REVIEW_FILE = path.join(CACHE_DIR, `${OUT}.review.json`);

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://gewcyydpgbfutkdcyztr.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const IMPORT_USER = "df47fbfc-7895-4941-864a-5d1d8f4fdc30";

async function loadJson<T>(f: string, fb: T): Promise<T> { try { return JSON.parse(await readFile(f, "utf8")); } catch { return fb; } }

function buildList(ex: Record<string, any>, review: Record<string, any>) {
  return Object.keys(ex).map(Number).sort((a, b) => a - b).map((idx) => {
    const e = ex[idx];
    const r = review[idx] ?? {};
    const title = r.title ?? e.title ?? "";
    const article = r.article ?? e.article ?? "";
    const coh = checkCoherence(article);
    const qOk = (e.questions?.length === 5) && (e.questions ?? []).every((q: any) => q.option_a && q.option_b && q.option_c) && (e.answer_key?.length >= 5);
    return {
      idx, title, article,
      articlePage: e._pages?.[0] ?? null,
      questionPage: e._pages?.[1] ?? null,
      questions: e.questions ?? [],
      answer_key: e.answer_key ?? [],
      coherence: coh.score, issues: coh.issues, structureOk: qOk,
      approved: !!r.approved,
    };
  });
}

async function pagePng(n: number): Promise<Buffer> {
  await mkdir(PAGE_DIR, { recursive: true });
  const f = path.join(PAGE_DIR, `page_${n}.png`);
  if (existsSync(f)) return readFile(f);
  const buf = await extractPageImagePng(PDF, n);
  await writeFile(f, buf);
  return buf;
}

const HTML = /* html */ `<!doctype html><html><head><meta charset="utf-8"><title>Lesen Teil 2 — Review</title>
<style>
 body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#0f1116;color:#e6e6e6}
 header{position:sticky;top:0;background:#171a21;padding:10px 16px;border-bottom:1px solid #2a2f3a;display:flex;gap:16px;align-items:center;z-index:10}
 header b{color:#7cc4ff}
 .wrap{display:flex;gap:16px;padding:16px;align-items:flex-start}
 .col{flex:1;min-width:0}
 img{width:100%;border:1px solid #2a2f3a;border-radius:8px;background:#fff}
 textarea{width:100%;min-height:520px;background:#11141a;color:#e6e6e6;border:1px solid #2a2f3a;border-radius:8px;padding:10px;font:13px/1.6 ui-monospace,monospace;resize:vertical}
 input[type=text]{width:100%;background:#11141a;color:#e6e6e6;border:1px solid #2a2f3a;border-radius:6px;padding:8px;margin-bottom:8px}
 .badge{display:inline-block;background:#3a2a2a;border:1px solid #5a3a3a;color:#ffb3b3;border-radius:10px;padding:2px 8px;margin:2px;font-size:12px}
 .ok{color:#8ee08e}.warn{color:#ffd27c}.bad{color:#ff9a9a}
 button{background:#2a6df0;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:600}
 button.sec{background:#333a47}button.green{background:#1f9d55}button:disabled{opacity:.5;cursor:default}
 .nav{display:flex;gap:8px;align-items:center}
 .pill{padding:2px 8px;border-radius:10px;font-size:12px}
 .pill.appr{background:#1f9d55}.pill.pend{background:#7a5a1f}
 .qbox{background:#11141a;border:1px solid #2a2f3a;border-radius:8px;padding:8px;margin-top:8px;font-size:13px}
 .corr{color:#8ee08e;font-weight:700}
</style></head><body>
<header>
 <b>Lesen Teil 2 — Review</b>
 <span id="prog"></span>
 <div class="nav"><button class="sec" onclick="go(-1)">◀ Prev</button><span id="pos"></span><button class="sec" onclick="go(1)">Next ▶</button></div>
 <span style="flex:1"></span>
 <button class="green" id="commitBtn" onclick="commitAll()">Commit approved to DB</button>
</header>
<div class="wrap">
 <div class="col"><div id="pageWrap"></div></div>
 <div class="col">
   <div id="meta"></div>
   <label>Title (real printed title):</label>
   <input type="text" id="title">
   <label>Article body (verbatim — correct OCR errors, never reword):</label>
   <textarea id="article"></textarea>
   <div style="margin-top:8px;display:flex;gap:8px">
     <button onclick="save(false)">Save</button>
     <button class="green" onclick="save(true)">Approve ✓</button>
     <button class="sec" onclick="save('unapprove')">Un-approve</button>
   </div>
   <div id="issues" style="margin-top:8px"></div>
   <div id="qview"></div>
 </div>
</div>
<script>
let data=[],cur=0;
async function load(){data=await (await fetch('/api/exercises')).json();render();}
function go(d){cur=Math.max(0,Math.min(data.length-1,cur+d));render();}
function hl(t){ // highlight adjacent duplicate words
  return t.replace(/\\b([A-Za-zÄÖÜäöüß]{3,})(\\s+)(\\1)\\b/gi,'<mark style="background:#a33">$1$2$3</mark>');
}
function render(){
 const e=data[cur];
 document.getElementById('pos').textContent=(cur+1)+' / '+data.length+' (ex '+e.idx+')';
 const appr=data.filter(x=>x.approved).length;
 document.getElementById('prog').innerHTML='Approved: <b>'+appr+'</b> / '+data.length;
 document.getElementById('pageWrap').innerHTML = e.articlePage?('<img src="/api/page?n='+e.articlePage+'">'+(e.questionPage?'<img style="margin-top:8px" src="/api/page?n='+e.questionPage+'">':'')):'<i>no page</i>';
 document.getElementById('title').value=e.title||'';
 document.getElementById('article').value=e.article||'';
 const cls=e.coherence>=1?'ok':e.coherence>=0.7?'warn':'bad';
 document.getElementById('meta').innerHTML='<span class="pill '+(e.approved?'appr':'pend')+'">'+(e.approved?'APPROVED':'PENDING')+'</span> '+
   '<span class="'+cls+'">coherence '+e.coherence.toFixed(2)+'</span> · structure '+(e.structureOk?'<span class=ok>OK</span>':'<span class=bad>INCOMPLETE</span>')+' · article page '+e.articlePage;
 document.getElementById('issues').innerHTML = (e.issues&&e.issues.length)?('<b>Flagged:</b> '+e.issues.map(i=>'<span class=badge>'+i+'</span>').join('')):'<span class=ok>No structural issues detected (still verify against PDF).</span>';
 document.getElementById('qview').innerHTML='<div class=qbox><b>Questions / Options / Answer key (already validated — read-only):</b>'+
   e.questions.map(q=>{const k=(e.answer_key.find(a=>a.number===q.number)||{}).answer;return '<div style="margin-top:6px">'+q.number+'. '+q.text+'<br>'+
   ['a','b','c'].map(o=>(k===o?'<span class=corr>✓ ':'&nbsp;&nbsp;')+o+') '+q['option_'+o]+(k===o?'</span>':'')).join('<br>')+'</div>';}).join('')+'</div>';
}
async function save(mode){
 const e=data[cur];
 const body={idx:e.idx,title:document.getElementById('title').value,article:document.getElementById('article').value};
 if(mode===true)body.approved=true; if(mode==='unapprove')body.approved=false;
 await fetch('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 data=await (await fetch('/api/exercises')).json();
 if(mode===true&&cur<data.length-1)cur++; render();
}
async function commitAll(){
 const appr=data.filter(x=>x.approved).length;
 if(!appr){alert('Nothing approved yet.');return;}
 if(!confirm('Commit '+appr+' approved exercises to the database? This deletes existing Teil 2 exercises and imports the approved ones.'))return;
 const r=await (await fetch('/api/commit',{method:'POST'})).json();
 alert(r.message||JSON.stringify(r));
}
load();
</script></body></html>`;

async function commit(): Promise<{ ok: boolean; message: string }> {
  const ex = await loadJson<Record<string, any>>(EX_FILE, {});
  const review = await loadJson<Record<string, any>>(REVIEW_FILE, {});
  const list = buildList(ex, review).filter((e) => e.approved);
  if (!list.length) return { ok: false, message: "No approved exercises to commit." };

  // Re-validate approved ones (structure must be complete)
  const bad = list.filter((e) => !e.structureOk || !e.title.trim() || !e.article.trim());
  if (bad.length) return { ok: false, message: `Cannot commit: ${bad.length} approved exercise(s) are incomplete (idx ${bad.map((b) => b.idx).join(",")}).` };

  // version-number duplicate titles
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const counts = new Map<string, number>(); for (const e of list) counts.set(norm(e.title), (counts.get(norm(e.title)) ?? 0) + 1);
  const run = new Map<string, number>();
  for (const e of list) { const k = norm(e.title); if ((counts.get(k) ?? 0) > 1) { const n = (run.get(k) ?? 0) + 1; run.set(k, n); (e as any).finalTitle = `${e.title} ${n}`; } else (e as any).finalTitle = e.title; }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: existing } = await db.from("lesen_exercises").select("id").eq("teil", 2);
  for (const x of existing ?? []) { await db.from("lesen_t2_questions").delete().eq("exercise_id", x.id); await db.from("lesen_t2_passages").delete().eq("exercise_id", x.id); await db.from("lesen_exercises").delete().eq("id", x.id); }

  let n = 0;
  for (const e of list) {
    const { data: row, error } = await db.from("lesen_exercises").insert({ title: (e as any).finalTitle, teil: 2, created_by: IMPORT_USER, source_pdf: OUT }).select("id").single();
    if (error || !row) continue;
    await db.from("lesen_t2_passages").insert({ exercise_id: row.id, title: (e as any).finalTitle, passage: e.article });
    await db.from("lesen_t2_questions").insert(e.questions.map((q: any) => ({ exercise_id: row.id, number: q.number, question: q.text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, correct: String(e.answer_key.find((a: any) => a.number === q.number).answer).toLowerCase() })));
    n++;
  }
  return { ok: true, message: `Committed ${n} approved exercises to the database.` };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (url.pathname === "/") { res.writeHead(200, { "content-type": "text/html" }); res.end(HTML); return; }
    if (url.pathname === "/api/exercises") {
      const ex = await loadJson<Record<string, any>>(EX_FILE, {});
      const review = await loadJson<Record<string, any>>(REVIEW_FILE, {});
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(buildList(ex, review))); return;
    }
    if (url.pathname === "/api/page") { const n = parseInt(url.searchParams.get("n") ?? "0"); const png = await pagePng(n); res.writeHead(200, { "content-type": "image/png" }); res.end(png); return; }
    if (url.pathname === "/api/save" && req.method === "POST") {
      let b = ""; for await (const c of req) b += c; const body = JSON.parse(b);
      const review = await loadJson<Record<string, any>>(REVIEW_FILE, {});
      review[body.idx] = { ...(review[body.idx] ?? {}), title: body.title, article: body.article, ...(body.approved !== undefined ? { approved: body.approved } : {}), reviewedAt: new Date().toISOString() };
      await writeFile(REVIEW_FILE, JSON.stringify(review, null, 2));
      res.writeHead(200, { "content-type": "application/json" }); res.end('{"ok":true}'); return;
    }
    if (url.pathname === "/api/commit" && req.method === "POST") { const r = await commit(); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(r)); return; }
    res.writeHead(404); res.end("not found");
  } catch (e) { res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ error: String(e).slice(0, 300) })); }
});

server.listen(PORT, () => console.log(`Review server: http://localhost:${PORT}  (PDF=${PDF}, data=${OUT})`));

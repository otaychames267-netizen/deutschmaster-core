/** Final Teil 3 assembler. Uses t3-rebuild.json (PDF situations + key + ads per
 * version). Unions ads per ad-set (fills gaps from complete siblings), resolves
 * version->key, dedups 100%-identical versions, and (with --apply) rebuilds the
 * DB in place: same lesen_exercises rows where possible, correct situations/texts. */
import { readFileSync } from "node:fs";
const RB = "C:\\Users\\asus\\AppData\\Local\\Temp\\claude\\C--Users-asus-AuraLingovia\\d62fd849-b08b-4a27-a94b-dd84844ba827\\scratchpad\\t3-rebuild.json";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
const CREATED_BY = env.IMPORT_CREATED_BY || "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3";
const APPLY = process.argv.includes("--apply");
const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const S = (s) => `convert_from(decode('${b64(s)}','base64'),'UTF8')`;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");

const versions = JSON.parse(readFileSync(RB, "utf8"));
// Verified overrides (source defects confirmed against the PDF images):
// p83 Berlin: key positions 13/14 = X (no matching ad); ads g/h absent in source.
const KEY_OVERRIDE = { 83: "EDXXKLJAIC" };
for (const v of versions) if (KEY_OVERRIDE[v.pdfPage]) v.key = KEY_OVERRIDE[v.pdfPage];

// ---- 1. ad-set grouping: union ads across versions sharing >=6 identical ad titles/content ----
const adSig = (ads) => Object.entries(ads).map(([L, a]) => L + norm(a.title || a.content).slice(0, 24)).sort().join("|");
// cluster versions by ad overlap
const clusters = [];
for (const v of versions) {
  const vAds = v.ads;
  const vKeys = new Set(Object.values(vAds).map(a => norm(a.title || a.content).slice(0, 30)));
  let found = null;
  for (const c of clusters) {
    let overlap = 0; for (const k of vKeys) if (c.keys.has(k)) overlap++;
    if (overlap >= 6) { found = c; break; }
  }
  if (!found) { found = { keys: new Set(), ads: {}, members: [] }; clusters.push(found); }
  for (const k of vKeys) found.keys.add(k);
  for (const [L, a] of Object.entries(vAds)) if (!found.ads[L] || (found.ads[L].content.length < a.content.length)) found.ads[L] = a;
  found.members.push(v);
}
// attach unioned ad-set to each version
for (const c of clusters) for (const v of c.members) v.fullAds = c.ads;

const adGaps = versions.filter(v => Object.keys(v.fullAds).length !== 12);
console.log(`Ad-set clusters: ${clusters.length}`);
console.log(`Versions still missing ads after union: ${adGaps.length}${adGaps.length ? " -> " + adGaps.map(v => "p" + v.pdfPage + "[" + [..."ABCDEFGHIJKL"].filter(L => !v.fullAds[L]).join("") + "]").join(", ") : ""}`);

// ---- 1b. detect MISPLACED modified pages: an "extra" version (idx >= nKeys)
// whose situations don't match its group's first version = a stray/garbled page
// from another exercise (would create a Frankenstein). Exclude + flag; never guess.
const shingle = (s) => { const w = norm(s); const g = new Set(); for (let i = 0; i + 6 <= w.length; i++) g.add(w.slice(i, i + 6)); return g; };
const jac = (a, b) => { let x = 0; for (const t of a) if (b.has(t)) x++; return x / (a.size + b.size - x || 1); };
const byKeyPage = {}; for (const v of versions) (byKeyPage[v.groupKeyPage] ||= []).push(v);
const misplaced = [];
for (const v of versions) {
  if (v.versionIdx >= v.nKeys && v.nVersions > v.nKeys) {
    const first = byKeyPage[v.groupKeyPage][0];
    const sim = jac(shingle(Object.values(v.situations).join(" ")), shingle(Object.values(first.situations).join(" ")));
    v._simToGroup = +sim.toFixed(2);
    if (sim < 0.45) { v._misplaced = true; misplaced.push(v); }
  }
}
const kept = versions.filter(v => !v._misplaced);
// for each misplaced stray, find its best fuzzy match among kept versions (is it a garbled dup of clean content?)
for (const s of misplaced) {
  let best = 0, bestP = null;
  for (const k of kept) { const j = jac(shingle(Object.values(s.situations).join(" ")), shingle(Object.values(k.situations).join(" "))); if (j > best) { best = j; bestP = k.pdfPage; } }
  s._bestKept = +best.toFixed(2); s._bestKeptP = bestP;
}
// cluster the strays among themselves
const strayClusters = [];
for (const s of misplaced) { let f = null; for (const c of strayClusters) if (jac(shingle(Object.values(s.situations).join(" ")), shingle(Object.values(c[0].situations).join(" "))) > 0.5) { f = c; break; } if (f) f.push(s); else strayClusters.push([s]); }
console.log(`Misplaced/garbled modified pages excluded: ${misplaced.length} (in ${strayClusters.length} distinct cluster(s))`);
for (const s of misplaced) console.log(`  p${s.pdfPage}: bestMatchKept=p${s._bestKeptP} (${s._bestKept})  s11="${(s.situations[11]||"").slice(0,32)}"`);

// ---- 2. dedup 100%-identical versions (situations + ads + key) ----
const fullSig = (v) => norm([11,12,13,14,15,16,17,18,19,20].map(n => v.situations[n] || "").join("|")) + "##" + norm(Object.entries(v.fullAds).map(([L,a])=>L+a.content).join("|")) + "##" + v.key;
const seen = new Map(); const removed = [];
for (const v of kept) { const s = fullSig(v); if (seen.has(s)) { v._dupOf = seen.get(s); removed.push(v); } else seen.set(s, v.pdfPage); }
console.log(`\n100%-identical duplicate versions removed: ${removed.length}${removed.length ? " -> " + removed.map(v => "p" + v.pdfPage + " (dup of p" + v._dupOf + ")").join(", ") : ""}`);

const finalVersions = kept.filter(v => !v._dupOf);
console.log(`Final exercises: ${finalVersions.length} (from ${versions.length} PDF versions, ${misplaced.length} misplaced excluded)`);
if (process.argv.includes("--map")) { console.log("MAP " + JSON.stringify(finalVersions.map((v, i) => ({ n: i + 1, page: v.pdfPage, key: v.key })))); process.exit(0); }

// ---- 3. key sanity ----
const badKey = finalVersions.filter(v => !/^[A-LX]{10}$/.test(v.key));
console.log(`Malformed keys: ${badKey.length}${badKey.length ? " -> " + badKey.map(v=>"p"+v.pdfPage+"("+v.key+")").join(",") : ""}`);
// keys with a letter not present in ads
const keyOutOfRange = finalVersions.filter(v => [...v.key].some(c => c !== "X" && !v.fullAds[c]));
console.log(`Keys referencing a missing ad letter: ${keyOutOfRange.length}${keyOutOfRange.length?" -> "+keyOutOfRange.map(v=>"p"+v.pdfPage).join(","):""}`);

const fallbackKeys = finalVersions.filter(v => v.nVersions > v.nKeys && v.versionIdx >= v.nKeys);
console.log(`\nVersions with fallback (unverified) key assignment: ${fallbackKeys.length}${fallbackKeys.length ? " -> " + fallbackKeys.map(v => "p" + v.pdfPage + "(v" + (v.versionIdx+1) + "/" + v.nVersions + " key=" + v.key + ")").join(", ") : ""}`);

if (!APPLY) { console.log("\n(dry run — re-run with --apply)"); process.exit(0); }

// ---- 4. rebuild DB: reuse existing exercise rows (by created_at order) ----
const rows = await q(`select id from lesen_exercises where teil=3 order by created_at;`);
if (rows.length < finalVersions.length) throw new Error(`only ${rows.length} exercise rows for ${finalVersions.length} versions`);
// wipe children
await q(`delete from lesen_t3_situations where exercise_id in (select id from lesen_exercises where teil=3);
         delete from lesen_t3_texts where exercise_id in (select id from lesen_exercises where teil=3);`);
for (let i = 0; i < finalVersions.length; i++) {
  const v = finalVersions[i]; const id = rows[i].id;
  const sitVals = [];
  for (let n = 11; n <= 20; n++) {
    const desc = v.situations[n] || ""; const letter = v.key[n - 11];
    const nm = letter === "X"; const cl = /[A-L]/.test(letter) ? `'${letter}'` : "null";
    sitVals.push(`('${id}',${n},${S(desc)},${cl},${nm})`);
  }
  const txtVals = [];
  for (const L of "ABCDEFGHIJKL") { const a = v.fullAds[L]; if (!a || !a.content) continue; txtVals.push(`('${id}','${L}',${S(a.title || "")},${S(a.content || "")})`); }
  await q(`insert into lesen_t3_situations (exercise_id,number,description,correct_letter,no_match) values ${sitVals.join(",")};
           insert into lesen_t3_texts (exercise_id,letter,title,content) values ${txtVals.join(",")};`);
}
// surplus rows (dedup removed 2 + misplaced excluded 12) are KEPT for manual
// review (rule 9). Mark them so the report/UI can flag them; do NOT delete.
const surplus = rows.slice(finalVersions.length).map(r => `'${r.id}'`);
if (surplus.length && process.argv.includes("--delete-surplus")) {
  await q(`delete from lesen_exercises where id in (${surplus.join(",")});`);
  console.log(`\nAPPLIED: rebuilt ${finalVersions.length} exercises, DELETED ${surplus.length} surplus rows.`);
} else {
  console.log(`\nAPPLIED: rebuilt ${finalVersions.length} exercises. ${surplus.length} surplus rows KEPT (flagged for review).`);
}

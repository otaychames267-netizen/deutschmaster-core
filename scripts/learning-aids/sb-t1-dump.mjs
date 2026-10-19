/** Dumps every B2 Sprachbausteine Teil 1 exercise (passage + gaps + current aids) and groups identical gaps across variants.
 * Usage: node scripts/learning-aids/sb-t1-dump.mjs stats            → counts (unique gaps vs total)
 *        node scripts/learning-aids/sb-t1-dump.mjs show <from> <to> → prints exercises by position range (passages + options, answer marked, reuse hints) */
import fs, { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t);
}
const norm = (s) => s.replace(/\s+/g, " ").trim();
export const gapKey = (before, after, opts, correct) => createHash("md5").update(norm(before).toLowerCase() + "|" + norm(after).toLowerCase() + "|" + opts.map((o) => o.toLowerCase()).sort().join("/") + "|" + correct.toLowerCase()).digest("hex").slice(0, 12);

/** Reads the store and re-keys every entry from its "from" (position#gap) with the CURRENT gapKey, so the key window can change safely. */
export function loadStore(ex) {
  const p = "scripts/learning-aids/sb_t1_store.json";
  if (!fs.existsSync(p)) return {};
  const raw = JSON.parse(fs.readFileSync(p, "utf8")); const out = {};
  for (const s of Object.values(raw)) {
    const [pos, n] = s.from.split("#").map(Number);
    const e = ex.find((x) => x.position === pos); const g = e?.gaps.find((x) => x.n === n);
    if (!g) throw new Error("store entry " + s.from + " has no matching gap");
    out[g.key] = s;
  }
  return out;
}

export async function loadAll() {
  const ex = await q(`select e.id, e.title, e.position, p.passage, e.learning_aids as aids from sb_exercises e join sb_t1_passages p on p.exercise_id=e.id where e.teil=1 and e.level='TELC_B2' and e.is_hidden=false order by e.position`);
  const gaps = await q(`select exercise_id, gap_number n, option_a a, option_b b, option_c c, correct from sb_t1_gaps where exercise_id in (select id from sb_exercises where teil=1 and level='TELC_B2' and is_hidden=false) order by exercise_id, gap_number`);
  for (const e of ex) {
    e.gaps = gaps.filter((g) => g.exercise_id === e.id).map((g) => {
      const opts = [g.a, g.b, g.c]; const correct = { a: g.a, b: g.b, c: g.c }[g.correct];
      const re = new RegExp("\\{\\{" + g.n + "\\}\\}");
      const idx = e.passage.search(re);
      const before = e.passage.slice(Math.max(0, idx - 40), idx).replace(/\{\{\d+\}\}/g, "___");
      const after = e.passage.slice(idx + String(g.n).length + 4, idx + String(g.n).length + 4 + 40).replace(/\{\{\d+\}\}/g, "___");
      return { n: g.n, opts, correct, letter: g.correct, before, after, key: gapKey(before, after, opts, correct) };
    });
  }
  return ex;
}

if (process.argv[1].endsWith("sb-t1-dump.mjs")) {
  const mode = process.argv[2];
  const ex = await loadAll();
  if (mode === "stats") {
    const seen = new Map(); let total = 0;
    for (const e of ex) for (const g of e.gaps) { total++; if (!seen.has(g.key)) seen.set(g.key, `${e.title}#${g.n}`); }
    const pass = new Map(); for (const e of ex) { const k = norm(e.passage); pass.set(k, (pass.get(k) ?? 0) + 1); }
    console.log({ exercises: ex.length, totalGaps: total, uniqueGaps: seen.size, identicalPassageGroups: [...pass.values()].filter((v) => v > 1).length });
  } else if (mode === "show") {
    const from = Number(process.argv[3]), to = Number(process.argv[4]);
    const first = new Map(); const out = [];
    const store = loadStore(ex);
    for (const e of ex) for (const g of e.gaps) if (!first.has(g.key)) first.set(g.key, `${e.position}#${g.n}`);
    for (const e of ex.filter((x) => x.position >= from && x.position <= to)) {
      if (e.aids?.restyle_v2) { out.push(`
########## [${e.position}] ${e.title}  — DONE (restyled)`); continue; }
      out.push(`\n########## [${e.position}] ${e.title}   (id ${e.id})\n${e.passage}\n`);
      for (const g of e.gaps) {
        const dup = first.get(g.key);
        const dupNote = store[g.key] ? `   ← COVERED by store (${store[g.key].from}) — skip` : dup && dup !== `${e.position}#${g.n}` ? `   ← SAME as ${dup} (will reuse once ${dup} is written)` : "";
        out.push(`${g.n}: ${g.opts.map((o, i) => (g.letter === "abc"[i] ? `[${o}]` : o)).join(" | ")}${dupNote}`);
      }
    }
    console.log(out.join("\n"));
  }
}

/** Dumps every B2 Sprachbausteine Teil 2 exercise (passage + shared word list + answer key + current aids) and groups identical gaps across variants.
 * Usage: node scripts/learning-aids/sb-t2-dump.mjs stats            → counts (unique gaps vs total)
 *        node scripts/learning-aids/sb-t2-dump.mjs show <from> <to> → prints exercises by position range (passage, word list, key per gap, reuse hints) */
import fs, { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t);
}
const norm = (s) => s.replace(/\s+/g, " ").trim();
/** A gap is identical across variants when the surrounding text, the whole word list and the answer are identical (so every ✗ word is also in the other bank). */
export const gapKey = (before, after, bank, correct) => createHash("md5").update(norm(before).toLowerCase() + "|" + norm(after).toLowerCase() + "|" + bank.map((o) => o.toLowerCase()).sort().join("/") + "|" + correct.toLowerCase()).digest("hex").slice(0, 12);

/** Reads the store and re-keys every entry from its "from" (position#gap) with the CURRENT gapKey. */
export function loadStore(ex) {
  const p = "scripts/learning-aids/sb_t2_store.json";
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
  const where = `teil=2 and level='TELC_B2' and is_hidden=false`;
  const ex = await q(`select e.id, e.title, e.position, p.passage, e.learning_aids as aids from sb_exercises e join sb_t2_passages p on p.exercise_id=e.id where ${where.replace(/(\w+)=/g, "e.$1=")} order by e.position`);
  const gaps = await q(`select exercise_id, gap_number n, correct_word w from sb_t2_gaps where exercise_id in (select id from sb_exercises where ${where}) order by exercise_id, gap_number`);
  const words = await q(`select exercise_id, word_number, word from sb_t2_words where exercise_id in (select id from sb_exercises where ${where}) order by exercise_id, word_number`);
  for (const e of ex) {
    e.bank = words.filter((w) => w.exercise_id === e.id).map((w) => w.word);
    e.gaps = gaps.filter((g) => g.exercise_id === e.id).map((g) => {
      const re = new RegExp("\\{\\{" + g.n + "\\}\\}");
      const idx = e.passage.search(re);
      const before = e.passage.slice(Math.max(0, idx - 40), idx).replace(/\{\{\d+\}\}/g, "___");
      const after = e.passage.slice(idx + String(g.n).length + 4, idx + String(g.n).length + 4 + 40).replace(/\{\{\d+\}\}/g, "___");
      return { n: g.n, correct: g.w, before, after, key: gapKey(before, after, e.bank, g.w) };
    });
  }
  return ex;
}

if (process.argv[1].endsWith("sb-t2-dump.mjs")) {
  const mode = process.argv[2];
  const ex = await loadAll();
  if (mode === "stats") {
    const seen = new Map(); let total = 0;
    for (const e of ex) for (const g of e.gaps) { total++; if (!seen.has(g.key)) seen.set(g.key, `${e.title}#${g.n}`); }
    const restyled = ex.filter((e) => e.aids?.restyle_v2).length;
    console.log({ exercises: ex.length, restyled, totalGaps: total, uniqueGaps: seen.size });
  } else if (mode === "show") {
    const from = Number(process.argv[3]), to = Number(process.argv[4]);
    const first = new Map(); const out = [];
    const store = loadStore(ex);
    for (const e of ex) for (const g of e.gaps) if (!first.has(g.key)) first.set(g.key, `${e.position}#${g.n}`);
    for (const e of ex.filter((x) => x.position >= from && x.position <= to)) {
      if (e.aids?.restyle_v2) { out.push(`\n########## [${e.position}] ${e.title}  — DONE (restyled)`); continue; }
      out.push(`\n########## [${e.position}] ${e.title}   (id ${e.id})\n${e.passage}\n\nWORD LIST: ${e.bank.join(" | ")}`);
      for (const g of e.gaps) {
        const dup = first.get(g.key);
        const note = store[g.key] ? `   ← COVERED by store (${store[g.key].from}) — skip` : dup && dup !== `${e.position}#${g.n}` ? `   ← SAME as ${dup} (will reuse once ${dup} is written)` : "";
        out.push(`${g.n}: ${g.correct}${note}`);
      }
    }
    console.log(out.join("\n"));
  }
}

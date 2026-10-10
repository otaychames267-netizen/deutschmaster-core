/** Export a restorable snapshot of all Teil 3 data (exercises + situations + texts)
 * to a JSON file. Run with a path arg. Reuse for restore if ever needed. */
import { readFileSync, writeFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;
async function q(sql) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) }); const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t); }
const out = process.argv[2] || "backups/lesen-teil3-snapshot.json";
const data = await q(`select json_agg(x order by created_at) j from (
  select e.id, e.title, e.teil, e.created_at,
    (select json_agg(json_build_object('number',s.number,'description',s.description,'correct_letter',s.correct_letter,'no_match',s.no_match) order by s.number) from lesen_t3_situations s where s.exercise_id=e.id) situations,
    (select json_agg(json_build_object('letter',t.letter,'title',t.title,'content',t.content) order by t.letter) from lesen_t3_texts t where t.exercise_id=e.id) texts
  from lesen_exercises e where e.teil=3
) x;`);
const rows = data[0].j || [];
writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`Exported ${rows.length} Teil 3 exercises to ${out}`);

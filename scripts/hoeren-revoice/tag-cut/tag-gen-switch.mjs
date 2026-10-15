// Builds tag-switch.sql (apply) and tag-rollback.sql (undo) from cuts.json + tag-uploaded.json + the live Buchhandlung learning_aids / transcript.
import fs from "node:fs";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
const db = async (query) => (await (await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) })).json());
const cuts = JSON.parse(fs.readFileSync("cuts.json", "utf8")); const up = JSON.parse(fs.readFileSync("tag-uploaded.json", "utf8"));
if (up.length !== Object.keys(cuts).length) throw new Error("upload incomplete " + up.length + "/" + Object.keys(cuts).length);
const tm = (map, t) => { for (const m of map) if (t >= m.a - 1e-6 && t <= m.b + 1e-6) return +(m.off + (t - m.a)).toFixed(1); return null; };
const BU = "clean/teil3/buchhandlung.m4a"; const bu = cuts[BU];
const [ex] = await db(`select id, learning_aids from hoeren_exercises where audio_path='${BU}'`);
const [tr] = await db(`select exercise_id, duration_s, text, segments from hoeren_transcripts where audio_path='${BU}'`);
const aids = JSON.parse(JSON.stringify(ex.learning_aids));
for (const [n, it] of Object.entries(aids.items)) { if (it.audio_start == null) continue; const a = tm(bu.map, it.audio_start), b = tm(bu.map, Math.min(it.audio_end, bu.dur - 0.01)); if (a == null || b == null) throw new Error("aid outside kept audio: " + n); it.audio_start = a; it.audio_end = b; }
const TAG = /\s*(Mit den Beiträgen des )?(Vorbereitet vom )?Deutschlehrer(s)? (Orhan|Ohrhan) (Yigit|Yed)\.?/gi;
const segs = tr.segments.filter((s) => s.start < bu.cuts[1].s - 0.01).map((s) => { const t = s.text.replace(TAG, "").trim(); const st = s.start >= bu.cuts[0].e - 0.01 ? tm(bu.map, s.start) : s.start; const en = s.end >= bu.cuts[0].e - 0.01 ? tm(bu.map, Math.min(s.end, bu.cuts[1].s)) : Math.min(s.end, bu.cuts[0].s); return { ...s, text: t, start: st, end: en }; }).filter((s) => s.text);
const text = tr.text.replace(TAG, "").replace(/\s+/g, " ").trim();
const q = (s) => "$j$" + s + "$j$";
const up_sql = [], down_sql = [];
for (const u of up) { up_sql.push(`update public.hoeren_exercises set audio_path = '${u.neu}' where audio_path = '${u.old}';`); down_sql.push(`update public.hoeren_exercises set audio_path = '${u.old}' where audio_path = '${u.neu}';`); }
const head = `-- 2026-10-15 owner: cut the spoken teacher tag ("Deutschlehrer Orhan Yigit" / "Mit den Beiträgen des Deutschlehrers …" / "Vorbereitet vom …") out of the Hören audio.\n-- ${up.length} files re-cut (quietest-frame snap, 25 ms fades), uploaded as NEW objects under notag/; the clean/… originals stay in the bucket untouched.\n`;
fs.writeFileSync("tag-switch.sql", head + `-- ROLLBACK: see tag-rollback.sql\nbegin;\n${up_sql.join("\n")}\nupdate public.hoeren_exercises set learning_aids = ${q(JSON.stringify(aids))}::jsonb where id = '${ex.id}';\nupdate public.hoeren_transcripts set audio_path = 'notag/teil3/buchhandlung.m4a', duration_s = ${bu.ndur.toFixed(1)}, text = ${q(text)}, segments = ${q(JSON.stringify(segs))}::jsonb where exercise_id = '${tr.exercise_id}';\ncommit;\n`);
fs.writeFileSync("tag-rollback.sql", head + `-- ROLLBACK for tag-switch.sql\nbegin;\n${down_sql.join("\n")}\nupdate public.hoeren_exercises set learning_aids = ${q(JSON.stringify(ex.learning_aids))}::jsonb where id = '${ex.id}';\nupdate public.hoeren_transcripts set audio_path = '${BU}', duration_s = ${tr.duration_s}, text = ${q(tr.text)}, segments = ${q(JSON.stringify(tr.segments))}::jsonb where exercise_id = '${tr.exercise_id}';\ncommit;\n`);
console.log("files", up.length, "| aids", JSON.stringify(Object.entries(aids.items).map(([n, i]) => [n, i.audio_start, i.audio_end])), "| segs", tr.segments.length, "->", segs.length);
process.exit(0);

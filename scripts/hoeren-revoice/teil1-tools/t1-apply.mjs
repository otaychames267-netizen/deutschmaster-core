// usage (cwd = work dir): node t1-apply.mjs <slug>
// Applies a finished + QA-checked re-voice: uploads <slug>.final.m4a to hoeren-audio/gemini/teil1/<slug>.m4a and points every exercise that used the old file at it.
// Refuses unless <slug>.qa.log shows "0 chunk(s) to check". The old path of every switched exercise is appended to gemini-teil1.rollback.sql (old files stay in the bucket), the switch to gemini-teil1.switch.sql.
import fs from "node:fs";
const slug = process.argv[2];
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
if (!fs.existsSync(`${slug}.final.m4a`) || !fs.existsSync(`${slug}.meta.json`)) { console.log(`${slug}: no final.m4a / meta.json`); process.exit(1); }
if (!/ 0 chunk\(s\) to check/.test(fs.existsSync(`${slug}.qa.log`) ? fs.readFileSync(`${slug}.qa.log`, "utf8") : "")) { console.log(`${slug}: QA log missing or not clean — not applied`); process.exit(2); }
const meta = JSON.parse(fs.readFileSync(`${slug}.meta.json`, "utf8"));
const SH = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY };
const newPath = `gemini/teil1/${slug}.m4a`;
const up = await fetch(`${env.SUPABASE_URL}/storage/v1/object/hoeren-audio/${newPath}`, { method: "POST", headers: { ...SH, "content-type": "audio/mp4", "x-upsert": "true" }, body: fs.readFileSync(`${slug}.final.m4a`), signal: AbortSignal.timeout(120000) });
if (!up.ok) { console.log("upload failed", up.status, (await up.text()).slice(0, 200)); process.exit(1); }
for (const e of meta.exercises) {
  const cur = (await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?select=audio_path&id=eq.${e.id}`, { headers: SH })).json())[0];
  if (cur?.audio_path !== meta.audio_path) { console.log(`  skip ${e.title}: audio_path is now ${cur?.audio_path} (expected ${meta.audio_path})`); continue; }
  const p = await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?id=eq.${e.id}`, { method: "PATCH", headers: { ...SH, "content-type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ audio_path: newPath }) });
  if (!p.ok) { console.log("  PATCH failed", e.title, p.status); process.exit(1); }
  fs.appendFileSync("gemini-teil1.switch.sql", `update hoeren_exercises set audio_path='${newPath}' where id='${e.id}'; -- ${e.title.replace(/'/g, "")}\n`);
  fs.appendFileSync("gemini-teil1.rollback.sql", `update hoeren_exercises set audio_path='${meta.audio_path}' where id='${e.id}'; -- ${e.title.replace(/'/g, "")}\n`);
  console.log(`  switched: ${e.title}  ${meta.audio_path} -> ${newPath}`);
}
process.exit(0);

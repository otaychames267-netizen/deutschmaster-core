// usage (cwd = work dir): node t1-run.mjs <audio_path fragment> [--apply]
// One Teil 1 exercise end to end: t1-build (download + Gemini transcript + script) -> revoice (Gemini TTS) -> encode (-18 LUFS) -> qa-gemini (per-chunk WER).
// With --apply and a passing QA (exit 0): uploads <slug>.final.m4a to hoeren-audio/gemini/teil1/<slug>.m4a and points every exercise that used the old file at it.
// The old path of every switched exercise is appended to gemini-teil1.rollback.sql (old files stay in the bucket) and the switch to gemini-teil1.switch.sql.
// Exit codes: 0 done, 2 QA flagged chunks (not applied), 3 Gemini TTS quota exhausted (re-run later; the per-chunk cache resumes), 1 other error.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const [frag, flag] = process.argv.slice(2);
const T = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"); // this folder (teil1-tools)
const R = T.replace(/teil1-tools\/?$/, ""); // scripts/hoeren-revoice/
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const run = (script, args) => { const r = spawnSync("node", [script, ...args], { encoding: "utf8", maxBuffer: 1 << 26 }); return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") }; };

let r = run(T + "t1-build.mjs", [frag]); console.log(r.out.split("\n").slice(0, 1).join("\n"));
if (r.code) { console.log(r.out.slice(-600)); process.exit(1); }
const slug = r.out.match(/^(\S+): /)[1];
r = run(R + "revoice.mjs", [slug]); fs.writeFileSync(`${slug}.revoice.log`, r.out);
if (r.code) { console.log(/quota/i.test(r.out) ? "GEMINI TTS QUOTA EXHAUSTED — resume later" : r.out.slice(-600)); process.exit(/quota/i.test(r.out) ? 3 : 1); }
console.log(r.out.split("\n").filter((l) => /^total|OUTLIER/.test(l)).join("\n"));
r = run(R + "encode.mjs", [slug, "64"]); if (r.code) { console.log(r.out.slice(-400)); process.exit(1); }
console.log(r.out.trim().split("\n").pop());
r = run(T + "qa-gemini.mjs", [slug]); fs.writeFileSync(`${slug}.qa.log`, r.out); console.log(r.out.trim().split("\n").filter((l) => /CHECK|WER/.test(l)).join("\n"));
if (r.code) { console.log(`${slug}: QA flagged chunk(s) — NOT applied (see ${slug}.qa.log)`); process.exit(2); }
if (flag !== "--apply") { console.log(`${slug}: QA ok, not applied (no --apply)`); process.exit(0); }

// ---- apply
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

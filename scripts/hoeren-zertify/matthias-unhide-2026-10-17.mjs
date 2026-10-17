import fs from "node:fs";
const env = {};
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const NOTICE = "هذه التمارين لم تدرج في تونس بعد، ولكن لا يجب استبعادها أبداً";
const id = "5dd2eb0c-5b6c-4351-8d64-a9d004522788";
// HoerenTeilPage hides every exercise whose import_notes carries the Tunisia notice behind "Coming Soon" (SHOW_UNRELEASED_CONTENT=false), so the owner's "Neu + announce it" needs the notice gone.
// To bring it back (hide again): append " | " + NOTICE to import_notes.
const cur = (await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?select=import_notes&id=eq.${id}`, { headers: H })).json())[0];
const notes = cur.import_notes.replace(" | " + NOTICE, "").replace(NOTICE, "").trim() + " | Shown to students on purpose (owner 2026-10-17: Neu badge + dashboard announcement).";
const r = await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ import_notes: notes }) });
const j = await r.json();
console.log(r.status, "has notice now:", j[0].import_notes.includes(NOTICE), "|", j[0].title, "| hidden:", j[0].is_hidden);
// what a student's Teil 2 list returns now (same filters as HoerenTeilPage)
const list = await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?select=title,import_notes,position&teil=eq.2&level=eq.TELC_B2&is_hidden=eq.false&order=position.asc`, { headers: H })).json();
const visible = list.filter((x) => !(x.import_notes ?? "").includes(NOTICE));
console.log("B2 Teil 2: visible", visible.length, "of", list.length, "| Matthias listed:", visible.filter((x) => /Matthias/.test(x.title)).map((x) => x.title + "@" + x.position));

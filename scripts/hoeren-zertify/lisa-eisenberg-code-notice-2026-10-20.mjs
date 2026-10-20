import fs from "node:fs";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const U = env.SUPABASE_URL + "/rest/v1/";
// 1. the code under "Lisa Eisenberg ( Original )" (shown as the big violet code badge on the exercise card = hoeren_exercises.reference_code); only if it is still empty
const id = "54a9a8b2-fa6a-4786-8af1-9ccb0a39e90b";
const cur = (await (await fetch(`${U}hoeren_exercises?select=title,reference_code&id=eq.${id}`, { headers: H })).json())[0];
console.log("before:", JSON.stringify(cur));
if (cur.reference_code && cur.reference_code !== "15790") { console.log("reference_code already set to something else — not overwriting"); process.exit(1); }
const p = await fetch(`${U}hoeren_exercises?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ reference_code: "15790" }) });
console.log("patch", p.status, JSON.stringify((await p.json())[0]?.reference_code));
// 2. dashboard announcement (the owner's own wording, only typography tidied)
const message = [
  "تنبيه ⚠️",
  "",
  "اذا جاكم Lisa Eisenberg فيه audio لي في site راهو اخدمو نفس كود.",
  "",
  "اذا جاكم audio مش نفسو ركزو بالباهي، راهو الكود 15790.",
  "",
  "مع العلم لتو مفما حتى معلومة اذا نفس الجمل كيما الجمل متع الاساسي ولا معدلين في الجمل، ركزو في audio وقت الامتحان بالباهي.",
].join("\n");
console.log("message length", message.length);
const now = new Date(), exp = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
const r = await fetch(`${U}dashboard_announcements`, { method: "POST", headers: H, body: JSON.stringify({ message, published_at: now.toISOString(), expires_at: exp.toISOString(), created_by: "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3" }) });
const j = await r.json(); console.log("announcement", r.status, j[0]?.id, "expires", j[0]?.expires_at);

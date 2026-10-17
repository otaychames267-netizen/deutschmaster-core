import fs from "node:fs";
const env = {};
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const id = "5dd2eb0c-5b6c-4351-8d64-a9d004522788";

// 1. "Neu" badge = the "( Neu )" marker in the title (src/lib/exercise-variant.ts parses it into the badge)
const t = await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?id=eq.${id}&title=eq.Matthias`, { method: "PATCH", headers: H, body: JSON.stringify({ title: "Matthias ( Neu )" }) });
const tj = await t.json();
console.log("title", t.status, tj.map((r) => r.title));
if (!tj.length) process.exit(1);

// 2. announcement on the students' dashboard (72 h, same table/shape as the earlier announcements)
const message = [
  "🎧 تمرين جديد في Hören Teil 2 (B2): «Matthias»",
  "",
  "مقابلة إذاعية مع معلّم يعمل أيضًا في العناية بالأشجار (Baumpfleger): 10 جمل Richtig/Falsch مع الصوت، وبصياغة جديدة لبعض الجمل مقارنةً بالنسخة الموجودة سابقًا.",
  "",
  "ستجده في Hören ← Teil 2 بعلامة Neu، وتجد زر الترجمة العربية لكل جملة.",
].join("\n");
console.log("length", message.length);
const now = new Date(), exp = new Date(now.getTime() + 72 * 3600 * 1000);
const r = await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_announcements`, { method: "POST", headers: H, body: JSON.stringify({ message, published_at: now.toISOString(), expires_at: exp.toISOString(), created_by: "6a0e6445-a411-48ba-912c-ccd5fcd9b6f3" }) });
const j = await r.json();
console.log("announcement", r.status, JSON.stringify(j).slice(0, 160));

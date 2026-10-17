import fs from "node:fs";
const env = {};
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
// owner 2026-10-17: the announcement must not say the exercise differs from the previous version
const message = [
  "🎧 تمرين جديد في Hören Teil 2 (B2): «Matthias»",
  "",
  "مقابلة إذاعية مع معلّم يعمل أيضًا في العناية بالأشجار (Baumpfleger): 10 جمل Richtig/Falsch مع الصوت.",
  "",
  "ستجده في Hören ← Teil 2 بعلامة Neu، وتجد زر الترجمة العربية لكل جملة.",
].join("\n");
const r = await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_announcements?id=eq.4b3c0f45-fa1b-4231-8b25-4a000cf1b49d`, { method: "PATCH", headers: H, body: JSON.stringify({ message }) });
const j = await r.json();
console.log(r.status, j.length, JSON.stringify(j[0]?.message));

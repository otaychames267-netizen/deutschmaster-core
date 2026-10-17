import fs from "node:fs";
const env = {};
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const U = env.SUPABASE_URL + "/rest/v1/";
const id = "5dd2eb0c-5b6c-4351-8d64-a9d004522788";

// owner 2026-10-17: the exercise must be identical to zertify's, answer key included -> zertify's own revealed key: Richtig = 1,2,3,4,7,8,9, Falsch = 5,6,10.
// (The earlier audio-verified key was RRFFRFFRFR. Our mp3 is Orhan Yigit's simulation of this interview and contradicts zertify's key on 3,4,5,7,9,10, so the mp3 is detached again — zertify has no audio for this exercise either.)
const set = async (nums, v) => (await fetch(`${U}hoeren_statements?exercise_id=eq.${id}&statement_number=in.(${nums})`, { method: "PATCH", headers: H, body: JSON.stringify({ correct_answer: v }) })).status;
console.log("true ", await set("1,2,3,4,7,8,9", true));
console.log("false", await set("5,6,10", false));

const notes = "Migrated from zertify.app (user-owned prior platform), 2026-10-17. Statements AND answer key identical to zertify (reveal: Richtig = 1,2,3,4,7,8,9). Owner's decision. No audio (zertify has none; our mp3 for 'Der Baumpfleger Matthias ( Neu )' is a different recording whose content contradicts this key on 3,4,5,7,9,10). | Shown to students on purpose (owner 2026-10-17: Neu badge + dashboard announcement).";
const e = await fetch(`${U}hoeren_exercises?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ audio_path: null, import_notes: notes }) });
console.log("exercise", e.status);

// the dashboard announcement must not promise audio any more
const message = [
  "🎧 تمرين جديد في Hören Teil 2 (B2): «Matthias»",
  "",
  "مقابلة إذاعية مع معلّم يعمل أيضًا في العناية بالأشجار (Baumpfleger): 10 جمل Richtig/Falsch.",
  "",
  "ستجده في Hören ← Teil 2 بعلامة Neu، وتجد زر الترجمة العربية لكل جملة.",
].join("\n");
const a = await fetch(`${U}dashboard_announcements?id=eq.4b3c0f45-fa1b-4231-8b25-4a000cf1b49d`, { method: "PATCH", headers: H, body: JSON.stringify({ message }) });
console.log("announcement", a.status);

const back = await (await fetch(`${U}hoeren_statements?select=statement_number,correct_answer&exercise_id=eq.${id}&order=statement_number`, { headers: H })).json();
console.log("key now:", back.map((b) => (b.correct_answer ? "R" : "F")).join(""), "(zertify: RRRRFFRRRF is 1,2,3,4,7,8,9 = R)");
const ex = (await (await fetch(`${U}hoeren_exercises?select=title,audio_path&id=eq.${id}`, { headers: H })).json())[0];
console.log(ex.title, "audio:", ex.audio_path);

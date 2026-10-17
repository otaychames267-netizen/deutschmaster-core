import fs from "node:fs";
const env = {};
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const api = (p, opt = {}) => fetch(env.SUPABASE_URL + "/rest/v1/" + p, { headers: H, ...opt });

// insert-only guard: never touch an existing row
const exists = await (await api("hoeren_exercises?select=id,title&teil=eq.2&level=eq.TELC_B2&title=eq.Matthias")).json();
if (exists.length) { console.log("ALREADY EXISTS, aborting:", JSON.stringify(exists)); process.exit(0); }
const ours = (await (await api("hoeren_exercises?select=audio_path,position&id=eq.f0a52061-e248-4e03-b5bc-04adc482a6d3")).json())[0];

const notes = "Migrated from zertify.app (user-owned prior platform), 2026-10-17. Statements verbatim from zertify. zertify's own key (reveal: Richtig = 1,2,3,4,7,8,9) CONTRADICTS the interview audio on statements 3,4,5,7,9,10, so the key here was verified against the interview audio itself (Groq Whisper transcript) — the same interview and audio as 'Der Baumpfleger Matthias ( Neu )'. | هذه التمارين لم تدرج في تونس بعد، ولكن لا يجب استبعادها أبداً";
const ex = await api("hoeren_exercises", { method: "POST", body: JSON.stringify({ title: "Matthias", teil: 2, level: "TELC_B2", position: 999, import_notes: notes, audio_path: ours.audio_path }) });
const exRow = await ex.json();
console.log("exercise", ex.status, JSON.stringify(exRow).slice(0, 300));
if (!ex.ok) process.exit(1);
const id = exRow[0].id;
const st = [
  [1, "Matthias arbeitet inzwischen ungefähr zu gleichen Teilen als Lehrer und als Baumpfleger.", true],
  [2, "Bei seiner Arbeit ist Matthias hauptsächlich im städtischen Raum tätig.", true],
  [3, "Baumpfleger war schon als Kind Matthias' Traumberuf.", false],
  [4, "Für Arbeiten in Städten verwendet Matthias normalerweise eine Hebebühne.", false],
  [5, "Als Baumpfleger überprüft Matthias Bäume auf ihre Verkehrssicherheit.", true],
  [6, "Für die professionelle Baumpflege benötigt Matthias nur wenige und preiswerte Arbeitsmittel.", false],
  [7, "Bei Pando handelt es sich um einen einzigen, ungefähr 80.000 Jahre alten Baumstamm.", false],
  [8, "Aus Sicherheitsgründen darf Matthias bei Kletterarbeiten grundsätzlich nicht allein arbeiten.", true],
  [9, "Matthias hat bei seiner Arbeit bereits einen schweren Unfall erlitten.", false],
  [10, "Matthias nutzt die Baumpflege als Ausgleich zu seinem anderen Beruf.", true],
].map(([n, t, c]) => ({ exercise_id: id, statement_number: n, statement_text: t, correct_answer: c }));
const r = await api("hoeren_statements", { method: "POST", body: JSON.stringify(st) });
console.log("statements", r.status, (await r.json()).length);
// verify
const back = await (await api(`hoeren_statements?select=statement_number,correct_answer&exercise_id=eq.${id}&order=statement_number`)).json();
console.log(id, back.map((b) => (b.correct_answer ? "R" : "F")).join(""));

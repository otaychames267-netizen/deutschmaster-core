/**
 * One-off Phase 6 fix: the last 6 Lesen T1 evidence_text mismatches after
 * the ellipsis fix — each caused by either a straight-vs-curly opening
 * quote drift from the source PDF, or the evidence_text's own closing
 * clause not lining up with where the source sentence actually continues.
 * Every replacement below was hand-verified against the real passage text
 * (see the DB query output this was derived from); this script just writes
 * the corrected string and confirms the substring now matches before saving.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const fixes = [
  {
    exId: "43c5ea8b-0621-4130-a984-c9e0ae2c70e2", // Bäder
    item: "2",
    newEvidence: "\"Wir sorgen für mehr Sicherheit am Strand\", erklären Melanie Schille und Rüdiger Teichmann (42).",
  },
  {
    exId: "43c5ea8b-0621-4130-a984-c9e0ae2c70e2", // Bäder
    item: "5",
    newEvidence: "„Der Fluss hatte einfach zu wenig Wasser, da konnten wir mit dem großen Kreuzfahrtschiff nicht weiterfahren!\" Per Bus ging es nach Prag.",
  },
  {
    exId: "9c453df2-5867-4380-81e6-42bafaadbce6", // Bilder
    item: "4",
    newEvidence: "Noch nie hat man die Sterne so eindrucksvoll über den Landschaften der Erde gesehen wie auf den Bildern in diesem Buch",
  },
  {
    exId: "9c453df2-5867-4380-81e6-42bafaadbce6", // Bilder
    item: "5",
    newEvidence: "Die Autoren zeigen den Weg des 1906 in Paris geborenen Fotografen von der Kindheit in Berlin über die Jahre in Weimar und Dessau bis hin zum Leben in Hamburg, Stockholm und schließlich New York",
  },
  {
    exId: "9549bea2-30a6-4a69-80c3-9a801234e1c9", // Bienen
    item: "2",
    newEvidence: "sowie gegenseitig ihre Evolution vorangetrieben: In Amerika wurde die bisher älteste Biene entdeckt. Sie lag seit 100 Millionen Jahren in Bernstein",
  },
  {
    exId: "6669bbcc-eb8a-421c-bd99-64f4fee14458", // Autos
    item: "4",
    newEvidence: "„Nutzen statt Besitzen\" lautet er und umfasst so unterschiedliche Praktiken wie Wohnungstausch, Kleidertauschpartys, Autogemeinschaften",
  },
];

const byExercise = new Map();
for (const f of fixes) {
  if (!byExercise.has(f.exId)) byExercise.set(f.exId, []);
  byExercise.get(f.exId).push(f);
}

for (const [exId, exFixes] of byExercise) {
  const { data: ex, error } = await supabase.from("lesen_exercises").select("id, title, learning_aids").eq("id", exId).single();
  if (error) { console.error("fetch failed", exId, error.message); continue; }
  const { data: texts } = await supabase.from("lesen_t1_texts").select("position, content").eq("exercise_id", exId);
  const byPos = Object.fromEntries((texts ?? []).map((t) => [String(t.position), t.content]));

  for (const f of exFixes) {
    const source = byPos[f.item];
    if (!source || !source.includes(f.newEvidence)) {
      console.error(`ABORT ${ex.title} #${f.item}: replacement still not a verbatim substring — not writing`);
      continue;
    }
    ex.learning_aids.items[f.item].evidence_text = f.newEvidence;
    console.log(`FIX ${ex.title} #${f.item}: OK`);
  }

  const { error: updErr } = await supabase.from("lesen_exercises").update({ learning_aids: ex.learning_aids }).eq("id", exId);
  if (updErr) console.error("update failed", exId, updErr.message);
}

console.log("done");

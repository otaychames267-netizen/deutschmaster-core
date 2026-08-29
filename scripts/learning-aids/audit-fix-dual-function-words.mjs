/**
 * Targeted audit fix: dual-function words (während/seit/bis as preposition
 * OR conjunction depending on what follows; wie/denn as question markers
 * vs. subordinators; als as temporal conjunction vs. role/identity marker)
 * that the earlier bulk classifier got wrong in a systematic way -- it
 * matched on the word alone without checking whether a NOUN (preposition)
 * or a CLAUSE (conjunction) follows it in that specific sentence. Found by
 * a full-dataset audit, not exercise-by-exercise -- see the conversation.
 *
 * Each fix identified by (title, teil, gap) with the real sentence already
 * verified.
 *
 * Usage: node scripts/learning-aids/audit-fix-dual-function-words.mjs [--apply]
 */
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return JSON.parse(t);
}

const FIXES = [
  {
    title: "Das Schicksal des Braunbären", teil: 2, gap: "31",
    override: {
      item_type: "preposition",
      keyword: "während + Genitiv (hier: Nomen, nicht Nebensatz)",
      explanation_correct: "\"während\" هنا حرف جر يسبق اسماً في حالة الملكية (der vergangenen 12000 Jahre)، لا أداة ربط تُدخل جملة كاملة.",
      explanation_wrong: "\"während\" هنا حرف جر يسبق اسماً في حالة الملكية (der vergangenen 12000 Jahre)، لا أداة ربط تُدخل جملة كاملة.",
      grammar_example: "Während der letzten zehn Jahre hat sich das Klima spürbar verändert.",
    },
  },
  {
    title: "Lernen ist kein Privileg der Jugend (معدل)", teil: 2, gap: "38",
    override: {
      item_type: "preposition",
      keyword: "während + Genitiv (hier: Nomen, nicht Nebensatz)",
      explanation_correct: "\"während\" هنا حرف جر يسبق اسماً في حالة الملكية (ihres Arbeitslebens)، لا أداة ربط تُدخل جملة كاملة.",
      explanation_wrong: "\"während\" هنا حرف جر يسبق اسماً في حالة الملكية (ihres Arbeitslebens)، لا أداة ربط تُدخل جملة كاملة.",
      grammar_example: "Während ihres Studiums hat sie im Ausland gelebt.",
    },
  },
  {
    title: "Herr Dr. Moosberger", teil: 1, gap: "28",
    override: {
      item_type: "preposition",
      keyword: "während + Genitiv (zwei Nomen)",
      explanation_correct: "\"während\" هنا حرف جر يسبق اسمين في حالة الملكية (meiner Berufstätigkeit und meines Studiums)، لا أداة ربط.",
      explanation_wrong: "\"während\" هنا حرف جر يسبق اسمين في حالة الملكية (meiner Berufstätigkeit und meines Studiums)، لا أداة ربط.",
      grammar_example: "Während meiner Ausbildung habe ich viel gelernt.",
    },
  },
  {
    title: "Meike", teil: 1, gap: "22",
    override: {
      item_type: "conjunction",
      keyword: "seit + Nebensatz (Verb am Ende)",
      explanation_correct: "\"seit\" هنا أداة ربط تُدخل جملة كاملة (ich einen neuen Chef habe)، لا حرف جر يسبق اسماً فقط.",
      explanation_wrong: "\"seit\" هنا أداة ربط تُدخل جملة كاملة (ich einen neuen Chef habe)، لا حرف جر يسبق اسماً فقط.",
      // grammar_example already present and correctly matches the
      // conjunction use ("Seit ich in Berlin wohne...") -- kept as-is.
    },
  },
  {
    title: "HausbewohnerInnen", teil: 1, gap: "23",
    override: {
      item_type: "preposition",
      keyword: "bis zu + Dativ (Frist)",
      explanation_correct: "\"bis zu\" هنا حرف جر مركّب يعني \"حتى/بحلول\" موعد نهائي، ويسبق اسماً في حالة الجر (diesem Datum).",
      explanation_wrong: "\"bis zu\" هنا حرف جر مركّب يعني \"حتى/بحلول\" موعد نهائي، ويسبق اسماً في حالة الجر (diesem Datum).",
      grammar_example: "Bitte melden Sie sich bis zu diesem Freitag an.",
    },
  },
  {
    title: "Karin ( Original )", teil: 1, gap: "22",
    override: {
      item_type: "adjective_adverb",
      keyword: "denn (Modalpartikel in Fragen)",
      explanation_correct: "\"denn\" هنا أداة تلطيف في سؤال مباشر (Modalpartikel)، تضفي نبرة ودية فضولية — وليست أداة ربط سببية (\"لأن\").",
      explanation_wrong: "\"denn\" هنا أداة تلطيف في سؤال مباشر (Modalpartikel)، تضفي نبرة ودية فضولية — وليست أداة ربط سببية (\"لأن\").",
      grammar_example: "Was machst du denn heute Abend?",
    },
  },
  {
    title: "Karin (معدل)", teil: 1, gap: "22",
    override: {
      item_type: "adjective_adverb",
      keyword: "denn (Modalpartikel in Fragen)",
      explanation_correct: "\"denn\" هنا أداة تلطيف في سؤال مباشر (Modalpartikel)، تضفي نبرة ودية فضولية — وليست أداة ربط سببية (\"لأن\").",
      explanation_wrong: "\"denn\" هنا أداة تلطيف في سؤال مباشر (Modalpartikel)، تضفي نبرة ودية فضولية — وليست أداة ربط سببية (\"لأن\").",
      grammar_example: "Was machst du denn heute Abend?",
    },
  },
  {
    title: "Vanessa", teil: 1, gap: "24",
    override: {
      item_type: "adjective_adverb",
      keyword: "Wie (Fragewort, direkte Frage)",
      explanation_correct: "\"Wie\" هنا أداة استفهام تبدأ سؤالاً مباشراً (كيف الحال...)، وليست أداة ربط بين جملتين.",
      explanation_wrong: "\"Wie\" هنا أداة استفهام تبدأ سؤالاً مباشراً (كيف الحال...)، وليست أداة ربط بين جملتين.",
      grammar_example: "Wie ist es dir bei der neuen Arbeit ergangen?",
    },
  },
  {
    title: "Jens' Fußballtrainer-Sorgen", teil: 1, gap: "23",
    override: {
      item_type: "grammar_structure",
      keyword: "als + Rolle/Beruf (ohne Artikel)",
      // Existing explanation content was already accurate (real role, not
      // comparison); item_type was the only thing wrong (was conjunction,
      // but this "als" doesn't link two clauses at all here).
      grammar_example: "Sie arbeitet seit Kurzem als Ärztin in einem großen Krankenhaus.",
    },
  },
  {
    title: "Maria und Timur", teil: 1, gap: "27",
    override: {
      item_type: "grammar_structure",
      keyword: "als + Rolle/Lebensphase (ohne Artikel)",
      // Same: content already correctly distinguishes als (real role) from
      // wie (comparison); only item_type needed fixing.
    },
  },
];

async function main() {
  for (const fix of FIXES) {
    const rows = await q(`select id, learning_aids from sb_exercises where title = '${fix.title.replace(/'/g, "''")}' and teil = ${fix.teil};`);
    if (rows.length === 0) { console.error(`SKIP: no row for "${fix.title}"`); continue; }
    if (rows.length > 1) console.log(`NOTE: "${fix.title}" has ${rows.length} duplicate rows (known migration dupe) -- applying fix to all of them.`);
    for (const row of rows) {
      const items = { ...row.learning_aids.items };
      const before = items[fix.gap]?.item_type;
      const evBefore = items[fix.gap]?.evidence_text?.slice(0, 50);
      items[fix.gap] = { ...items[fix.gap], ...fix.override };
      console.log(`${fix.title} [${row.id.slice(0, 8)}] / gap ${fix.gap}: ${before} -> ${items[fix.gap].item_type}  (ev: ${evBefore})`);
      if (APPLY) {
        const newAids = { ...row.learning_aids, items };
        const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
        await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
      }
    }
  }
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
  else console.log("\nDone.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

/**
 * Third pilot round: completes "Liebe Agnieszka" (all 10 gaps now at the
 * full depth) -- gaps 21, 25, 26, 29, 30 still needed either a Beispiel or
 * a real meaning-first rewrite (not just naming the pattern). See the
 * conversation for the full spec.
 *
 * Usage: node scripts/learning-aids/pilot-sb-explanation-rewrite-3.mjs [--apply]
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

const OVERRIDES = {
  "21": { // her -- Feste Struktur, add Beispiel
    grammar_example: "Es ist schon drei Jahre her, dass ich in Deutschland war.",
  },
  "25": { // werde...legen -- Zeitform (Futur I)
    keyword: "werden + Infinitiv (Futur I)",
    explanation_correct: "\"werde ... legen\" هنا Futur I لأن الحدث سيحدث بعد انتهاء الامتحان، في المستقبل.",
    explanation_wrong: "\"werde ... legen\" هنا Futur I لأن الحدث سيحدث بعد انتهاء الامتحان، في المستقبل.",
    grammar_example: "Ich werde morgen früh aufstehen.",
  },
  "26": { // Darauf -- Pronominaladverb, explain what it points back to + formation
    keyword: "auf + das → darauf",
    explanation_correct: "\"darauf\" يشير هنا إلى فكرة \"أيام من الراحة بعد الامتحان\"، المذكورة قبل قليل، مع الفعل \"sich freuen auf\".",
    explanation_wrong: "\"darauf\" يشير هنا إلى فكرة \"أيام من الراحة بعد الامتحان\"، المذكورة قبل قليل، مع الفعل \"sich freuen auf\".",
    grammar_example: "Ich freue mich schon darauf, meine Familie wiederzusehen.",
  },
  "29": { // zu beschäftigen -- add Beispiel (item_type already fixed to grammar_structure)
    grammar_example: "Es ist schwer, Deutsch schnell zu lernen.",
  },
  "30": { // wie -- einen Weg finden, wie: explain the MEANING, not just name it
    explanation_correct: "\"einen Weg finden, wie...\" تعني إيجاد حل أو طريقة للتعامل مع موقف صعب. \"wie\" هنا يقدّم شرح هذه الطريقة.",
    explanation_wrong: "\"einen Weg finden, wie...\" تعني إيجاد حل أو طريقة للتعامل مع موقف صعب. \"wie\" هنا يقدّم شرح هذه الطريقة.",
    grammar_example: "Sie hat einen Weg gefunden, wie sie Arbeit und Familie verbindet.",
  },
};

async function main() {
  const rows = await q("select id, learning_aids from sb_exercises where title = 'Liebe Agnieszka' and teil = 1;");
  if (rows.length !== 1) throw new Error(`expected exactly 1 row, got ${rows.length}`);
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, override] of Object.entries(OVERRIDES)) {
    console.log(`\n=== gap ${gap} ===`);
    items[gap] = { ...items[gap], ...override };
    console.log("AFTER:", JSON.stringify(items[gap], null, 2));
  }

  if (!APPLY) {
    console.log("\n(dry run — pass --apply to write to the DB)");
    return;
  }

  const newAids = { ...row.learning_aids, items };
  const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
  await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  console.log("\nDone: Liebe Agnieszka fully completed at the new depth.");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

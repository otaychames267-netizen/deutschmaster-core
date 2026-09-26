/**
 * Second pilot round: deepens the explanation structure per the user's
 * refined spec -- rule + brief contrast (for connectors) + Merke formula +
 * a genuinely separate "Beispiel" sentence (grammar_example, now labeled
 * in the UI), and critically: a fixed idiom explained as a WHOLE (meaning +
 * case pattern across pronouns), never as an isolated grammar fact about
 * one word. Applied to 3 real gaps already used in pilot 1 (enhanced) plus
 * 2 new real gaps recreating the user's own verb+Rektion and tense examples.
 *
 * Usage: node scripts/learning-aids/pilot-sb-explanation-rewrite-2.mjs [--apply]
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

const TARGETS = [
  {
    title: "Liebe Agnieszka", teil: 1, gap: "23", // wenn -- Konnektor + Zeitregel
    override: {
      keyword: "wenn = إذا/عندما → الحاضر والمستقبل",
      explanation_correct: "\"wenn\" هنا لأن الحديث عن حدث مستقبلي متوقع (العودة بعد الامتحان). \"als\" تُستخدم فقط لحدث ماضٍ مكتمل مرة واحدة.",
      explanation_wrong: "\"wenn\" هنا لأن الحديث عن حدث مستقبلي متوقع (العودة بعد الامتحان). \"als\" تُستخدم فقط لحدث ماضٍ مكتمل مرة واحدة.",
      grammar_example: "Ich rufe dich an, wenn ich zu Hause bin.",
    },
  },
  {
    title: "Liebe Agnieszka", teil: 1, gap: "24", // zwar...aber -- add Beispiel
    override: {
      grammar_example: "Der Kurs ist zwar interessant, aber sehr schwierig.",
    },
  },
  {
    title: "Liebe Agnieszka", teil: 1, gap: "28", // dir -- Redewendung, explain the WHOLE idiom
    override: {
      explanation_correct: "\"jemandem auf der Nase herumtanzen\" تعبير ثابت يعني التصرف بوقاحة وعدم احترام سلطة شخص. الشخص المتأثر يأتي دائماً بحالة الجر: du→dir، ich→mir، er→ihm.",
      explanation_wrong: "\"jemandem auf der Nase herumtanzen\" تعبير ثابت يعني التصرف بوقاحة وعدم احترام سلطة شخص. الشخص المتأثر يأتي دائماً بحالة الجر: du→dir، ich→mir، er→ihm.",
      grammar_example: "Mein Bruder tanzt mir auf der Nase herum.",
    },
  },
  {
    title: "Daniela", teil: 1, gap: "28", // sich interessieren für -- Verb + Rektion
    override: {
      keyword: "sich interessieren für + Akk.",
      explanation_correct: "الفعل \"sich interessieren\" يأتي دائماً مع \"für\" + Akkusativ عند التعبير عن الاهتمام بشيء.",
      explanation_wrong: "الفعل \"sich interessieren\" يأتي دائماً مع \"für\" + Akkusativ عند التعبير عن الاهتمام بشيء.",
      grammar_example: "Ich interessiere mich für eine Ausbildung.",
    },
  },
  {
    title: "Eltern und Erziehungsberechtigte", teil: 1, gap: "27", // geschaffen -- Passiv/Zeitform
    override: {
      keyword: "werden + Partizip II (Passiv)",
      explanation_correct: "هنا نستخدم المبني للمجهول (\"werden\" + Partizip II) لأن الواقع البديل لا يفعل الفعل بنفسه، بل يتم إنشاؤه. اسم المفعول من \"schaffen\" هو \"geschaffen\".",
      explanation_wrong: "هنا نستخدم المبني للمجهول (\"werden\" + Partizip II) لأن الواقع البديل لا يفعل الفعل بنفسه، بل يتم إنشاؤه. اسم المفعول من \"schaffen\" هو \"geschaffen\".",
      grammar_example: "Das Bild wurde digital bearbeitet.",
    },
  },
];

async function main() {
  for (const target of TARGETS) {
    const rows = await q(`select id, learning_aids from sb_exercises where title = '${target.title.replace(/'/g, "''")}' and teil = ${target.teil};`);
    if (rows.length !== 1) { console.error(`SKIP: expected 1 row for "${target.title}", got ${rows.length}`); continue; }
    const row = rows[0];
    const items = { ...row.learning_aids.items };
    console.log(`\n=== ${target.title} / gap ${target.gap} ===`);
    console.log("BEFORE:", JSON.stringify(items[target.gap], null, 2));
    items[target.gap] = { ...items[target.gap], ...target.override };
    console.log("AFTER:", JSON.stringify(items[target.gap], null, 2));

    if (APPLY) {
      const newAids = { ...row.learning_aids, items };
      const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
      await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
      console.log("  -> written.");
    }
  }
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

/**
 * Batch T1 #6: "Autorinnen und Autoren". Three reclassifications found on
 * individual analysis: "stark zurückgehen" is a productive degree-adverb +
 * change-verb pattern (stark/leicht/deutlich + steigen/sinken/wachsen...),
 * not one fixed idiom -> adjective_adverb. "darum" (bitten darum, dass...)
 * is the cataphoric pronominal adverb pointing FORWARD to the following
 * clause, not the verb+preposition pair itself -> pronoun_adverb. "dass"
 * after "das heißt nicht" is the ordinary subordinating conjunction, not
 * something specific to this one phrase -> conjunction.
 *
 * Usage: node scripts/learning-aids/batch-t1-06.mjs [--apply]
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
  "21": {
    keyword: "wie ihr/du/Sie wisst (Einleitung Bekanntes)",
    explanation_correct: "\"wie ihr wisst\" تعبير تمهيدي ثابت لتقديم معلومة معروفة مسبقاً للمستمعين؛ لا يُستبدل \"wie\" هنا بأداة استفهام أخرى.",
    explanation_wrong: "\"wie ihr wisst\" تعبير تمهيدي ثابت لتقديم معلومة معروفة مسبقاً للمستمعين؛ لا يُستبدل \"wie\" هنا بأداة استفهام أخرى.",
  },
  "22": {
    keyword: "vorliegen (verfügbar sein)",
    explanation_correct: "\"vorliegen\" يعني \"أن يكون متوفراً/جاهزاً\"؛ يناسب هنا توفر النصوص والصور قبل بدء العمل.",
    explanation_wrong: "\"vorliegen\" يعني \"أن يكون متوفراً/جاهزاً\"؛ يناسب هنا توفر النصوص والصور قبل بدء العمل.",
  },
  "23": {
    keyword: "im Interesse von jmdm./etw. sein",
    explanation_correct: "\"im Interesse von\" تعبير ثابت يعني \"لصالح/في مصلحة\"؛ لا يُستبدل \"im\" بحرف جر آخر.",
    explanation_wrong: "\"im Interesse von\" تعبير ثابت يعني \"لصالح/في مصلحة\"؛ لا يُستبدل \"im\" بحرف جر آخر.",
  },
  "24": {
    keyword: "abliefern (trennbares Verb: ab + liefern)",
    explanation_correct: "\"abliefern\" (يسلّم) فعل منفصل؛ في جملة الأمر تنتقل البادئة \"ab\" إلى نهاية الجملة.",
    explanation_wrong: "\"abliefern\" (يسلّم) فعل منفصل؛ في جملة الأمر تنتقل البادئة \"ab\" إلى نهاية الجملة.",
  },
  "25": {
    keyword: "bei jmdm. liegen (Zuständigkeit/Besitz)",
    explanation_correct: "\"bei jemandem liegen\" تعبير ثابت يعني \"تعود ملكية/مسؤولية شيء لشخص\" — هنا: حقوق الصور تعود لكم.",
    explanation_wrong: "\"bei jemandem liegen\" تعبير ثابت يعني \"تعود ملكية/مسؤولية شيء لشخص\" — هنا: حقوق الصور تعود لكم.",
  },
  "26": {
    item_type: "adjective_adverb",
    keyword: "stark + Veränderungsverb (Verstärkung)",
    explanation_correct: "\"stark\" ظرف تدرّج يكثّف فعل التغيّر \"zurückgehen\" (انخفضت بشكل كبير، لا بسيط).",
    explanation_wrong: "\"stark\" ظرف تدرّج يكثّف فعل التغيّر \"zurückgehen\" (انخفضت بشكل كبير، لا بسيط).",
  },
  "27": {
    item_type: "pronoun_adverb",
    keyword: "bitten um + das → darum (verweist auf Nebensatz)",
    explanation_correct: "\"darum\" هنا ضمير ظرفي يشير إلى الجملة التالية (اختيار مواضيع تهم الأعضاء)؛ الفعل \"bitten\" يحكم \"um\"، و\"darum\" يمهّد لجملة تفسيرية لاحقة.",
    explanation_wrong: "\"darum\" هنا ضمير ظرفي يشير إلى الجملة التالية (اختيار مواضيع تهم الأعضاء)؛ الفعل \"bitten\" يحكم \"um\"، و\"darum\" يمهّد لجملة تفسيرية لاحقة.",
  },
  "28": {
    keyword: "ansprechen (Interesse wecken)",
    explanation_correct: "\"ansprechen\" هنا يعني \"يلامس اهتمام شخص/يثير اهتمامه\"، لا \"يتحدث إلى\" (المعنى الحرفي).",
    explanation_wrong: "\"ansprechen\" هنا يعني \"يلامس اهتمام شخص/يثير اهتمامه\"، لا \"يتحدث إلى\" (المعنى الحرفي).",
  },
  "29": {
    item_type: "conjunction",
    keyword: "dass (Nebensatz nach das heißt nicht)",
    explanation_correct: "\"dass\" أداة ربط عادية تُدخل جملة ثانوية توضيحية بعد \"das heißt nicht\" (هذا لا يعني أن...).",
    explanation_wrong: "\"dass\" أداة ربط عادية تُدخل جملة ثانوية توضيحية بعد \"das heißt nicht\" (هذا لا يعني أن...).",
  },
  "30": {
    keyword: "sich verstehen als + Nomen",
    explanation_correct: "\"sich verstehen als\" تعبير ثابت يعني \"يعتبر نفسه كذا\"؛ يليه اسم يصف الهوية التي تتبناها الجهة عن نفسها.",
    explanation_wrong: "\"sich verstehen als\" تعبير ثابت يعني \"يعتبر نفسه كذا\"؛ يليه اسم يصف الهوية التي تتبناها الجهة عن نفسها.",
  },
};

async function main() {
  const rows = await q("select id, learning_aids from sb_exercises where title = 'Autorinnen und Autoren' and teil = 1;");
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, override] of Object.entries(OVERRIDES)) {
    items[gap] = { ...items[gap], ...override };
    console.log(`gap ${gap}: item_type=${items[gap].item_type}, keyword="${items[gap].keyword}"`);
  }
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
    console.log("-> written.");
  } else {
    console.log("\n(dry run — pass --apply to write to the DB)");
  }
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

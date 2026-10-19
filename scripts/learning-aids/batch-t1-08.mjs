/**
 * Batch T1 #8: "Eltern und Erziehungsberechtigte" + "Daniela". Real re-audit
 * found 7/10 gaps in Eltern und 3/10 in Daniela misclassified on the
 * earlier pass:
 *   - "während" was tagged conjunction, but here it governs a genitive
 *     NOUN (während des Unterrichts), not introducing a clause -- that's
 *     the preposition use of während, not the conjunction use.
 *   - "anlässlich"/"anhand" were tagged grammar_structure but are simply
 *     prepositions (+ Genitiv).
 *   - "darum" (es geht darum, ...) is cataphoric pronoun_adverb pointing to
 *     the following infinitive clause, not a fixed_expression.
 *   - "um...zu" (purpose, same subject) is a productive structure, not an
 *     idiom, same reasoning as "es ist + Adj + zu + Infinitiv" earlier.
 *   - "lässt" (sich...lassen = can be done) is a passive-like grammar
 *     construction, not a tense.
 *   - "größter" (superlative declension) and "ganz besonders" (intensifier
 *     stack) are adjective/adverb questions, not fixed expressions.
 *   - "überstehen" is a plain verb-choice question, not an idiom.
 *   - "doch" softening an imperative is a modal particle (Abtönungspartikel),
 *     not a conjunction -- explained as such, filed under adjective_adverb
 *     (closest existing bucket; particles behave adverbially).
 *
 * Usage: node scripts/learning-aids/batch-t1-08.mjs [--apply]
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

const ELTERN = {
  "21": {
    item_type: "preposition",
    keyword: "anlässlich + Genitiv",
    explanation_correct: "\"anlässlich\" حرف جر رسمي يعني \"بمناسبة\"، ويحكم دائماً حالة الملكية (Genitiv).",
    explanation_wrong: "\"anlässlich\" حرف جر رسمي يعني \"بمناسبة\"، ويحكم دائماً حالة الملكية (Genitiv).",
    grammar_example: "Anlässlich des Firmenjubiläums gibt es eine kleine Feier.",
  },
  "22": {
    grammar_example: "Das sind die Themen, denen wir uns als Nächstes widmen.",
  },
  "23": {
    item_type: "pronoun_adverb",
    keyword: "es geht um + das → darum (verweist auf Nebensatz)",
    explanation_correct: "\"darum\" ضمير ظرفي يشير هنا إلى الجملة التالية (تسليط الضوء على التواصل عبر الإنترنت)؛ \"es geht um\" + إشارة لجملة لاحقة تصبح \"es geht darum\".",
    explanation_wrong: "\"darum\" ضمير ظرفي يشير هنا إلى الجملة التالية (تسليط الضوء على التواصل عبر الإنترنت)؛ \"es geht um\" + إشارة لجملة لاحقة تصبح \"es geht darum\".",
    grammar_example: "Es geht darum, die Sicherheit der Schüler zu verbessern.",
  },
  "24": {
    item_type: "grammar_structure",
    keyword: "um...zu + Infinitiv (Zweck, gleiches Subjekt)",
    explanation_correct: "\"um...zu + Infinitiv\" يصوغ الهدف عندما يكون فاعل الجملتين نفسه (man)؛ \"damit\" تُستخدم فقط عند اختلاف الفاعلين.",
    explanation_wrong: "\"um...zu + Infinitiv\" يصوغ الهدف عندما يكون فاعل الجملتين نفسه (man)؛ \"damit\" تُستخدم فقط عند اختلاف الفاعلين.",
    grammar_example: "Er lernt jeden Tag, um die Prüfung zu bestehen.",
  },
  "25": {
    grammar_example: "Der Umweltschutz liegt ihr sehr am Herzen.",
  },
  "26": {
    item_type: "preposition",
    keyword: "anhand + Genitiv",
    explanation_correct: "\"anhand\" حرف جر يعني \"بالاستناد إلى/من خلال\"، ويحكم حالة الملكية (Genitiv).",
    explanation_wrong: "\"anhand\" حرف جر يعني \"بالاستناد إلى/من خلال\"، ويحكم حالة الملكية (Genitiv).",
    grammar_example: "Anhand des Beispiels versteht man die Regel besser.",
  },
  "28": {
    item_type: "adjective_adverb",
    keyword: "Superlativ dekliniert: groß → größter (nach von)",
    explanation_correct: "\"größter\" صيغة التفضيل المطلق (الأعظم) من \"groß\"، مصرَّفة بنهاية \"-er\" بعد حرف الجر \"von\".",
    explanation_wrong: "\"größter\" صيغة التفضيل المطلق (الأعظم) من \"groß\"، مصرَّفة بنهاية \"-er\" بعد حرف الجر \"von\".",
    grammar_example: "Diese Entscheidung ist von größter Bedeutung für die Firma.",
  },
  "29": {
    item_type: "grammar_structure",
    keyword: "sich + Infinitiv + lassen (Möglichkeit)",
    explanation_correct: "\"sich + Infinitiv + lassen\" يعبّر عن إمكانية القيام بالفعل (يمكن تجنبه)؛ \"lassen\" يتطابق هنا مع الفاعل المفرد \"Derartiges\".",
    explanation_wrong: "\"sich + Infinitiv + lassen\" يعبّر عن إمكانية القيام بالفعل (يمكن تجنبه)؛ \"lassen\" يتطابق هنا مع الفاعل المفرد \"Derartiges\".",
    grammar_example: "Dieser Fehler lässt sich leicht korrigieren.",
  },
  "30": {
    item_type: "preposition",
    keyword: "während + Genitiv (zeitlich, hier kein Nebensatz)",
    explanation_correct: "\"während\" هنا حرف جر لا أداة ربط: يسبق مباشرة اسماً في حالة الملكية (des Unterrichts)، بمعنى \"أثناء\".",
    explanation_wrong: "\"während\" هنا حرف جر لا أداة ربط: يسبق مباشرة اسماً في حالة الملكية (des Unterrichts)، بمعنى \"أثناء\".",
    grammar_example: "Während der Pause dürfen die Schüler das Gebäude verlassen.",
  },
};

const DANIELA = {
  "21": { grammar_example: "Eigentlich wollte ich heute joggen gehen, aber es regnet." },
  "22": { grammar_example: "Wenn man müde ist, sollte man eine Pause machen." },
  "23": { grammar_example: "Das ist der Kollege, mit dessen Rat ich sehr zufrieden war." },
  "24": {
    item_type: "verb",
    keyword: "überstehen (eine schwierige Zeit durchstehen)",
    explanation_correct: "\"überstehen\" يعني \"يتجاوز/يصمد أمام\" فترة صعبة — هنا: فترة الدراسة الشاقة.",
    explanation_wrong: "\"überstehen\" يعني \"يتجاوز/يصمد أمام\" فترة صعبة — هنا: فترة الدراسة الشاقة.",
    grammar_example: "Wir haben die schwierige Zeit gemeinsam gut überstanden.",
  },
  "25": { grammar_example: "Sie hat mich gefragt, ob ich morgen Zeit habe." },
  "26": { grammar_example: "Wir sollten am Wochenende mal wieder etwas Tolles unternehmen." },
  "27": {
    item_type: "adjective_adverb",
    keyword: "ganz + Adjektiv/Adverb (Verstärkung)",
    explanation_correct: "\"ganz\" ظرف تكثيف يعزز \"besonders\" (بشكل خاص جداً).",
    explanation_wrong: "\"ganz\" ظرف تكثيف يعزز \"besonders\" (بشكل خاص جداً).",
    grammar_example: "Diese Frage interessiert mich ganz besonders.",
  },
  "29": {
    item_type: "adjective_adverb",
    keyword: "doch (Abtönungspartikel, mildert Aufforderung)",
    explanation_correct: "\"doch\" هنا أداة تلطيف (Modalpartikel) تجعل جملة الأمر أكثر وداً، وليست أداة ربط منطقية.",
    explanation_wrong: "\"doch\" هنا أداة تلطيف (Modalpartikel) تجعل جملة الأمر أكثر وداً، وليست أداة ربط منطقية.",
    grammar_example: "Setz dich doch einen Moment zu uns.",
  },
  "30": { grammar_example: "Wir haben uns endlich auf einen Termin geeinigt." },
};

async function applyExercise(title, overrides) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, override] of Object.entries(overrides)) items[gap] = { ...items[gap], ...override };
  console.log(`\n#### ${title} ####`);
  for (const gap of Object.keys(overrides)) console.log(`  gap ${gap}: item_type=${items[gap].item_type}`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
    console.log("  -> written.");
  }
}

async function main() {
  await applyExercise("Eltern und Erziehungsberechtigte", ELTERN);
  await applyExercise("Daniela", DANIELA);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

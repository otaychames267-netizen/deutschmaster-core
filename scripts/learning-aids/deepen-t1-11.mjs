/**
 * Deepen T1 #11: "Justus oder Juhannas ( Original )", "Justus oder
 * Juhannas (معدل)", "Jutta" -- same distractor-reasoning pattern.
 *
 * Also fixes a real content bug in Jutta gap 28: the stored keyword and
 * explanation discussed "über" as correct, but the actual bolded evidence
 * text ("schon **hinter** mir") and the answer key (correct = "hinter")
 * both say "hinter" -- this is the fixed idiom "etwas hinter sich haben"
 * (to have something behind you / be done with it), not "über" at all.
 *
 * Usage: node scripts/learning-aids/deepen-t1-11.mjs [--apply]
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

const JUSTUS_SHARED_WRONG = {
  "21": "\"an\" لا يقترن بالفعل الانعكاسي \"sich freuen\" بهذا المعنى، و\"für\" (من أجل) حرف جر مختلف -- التعبير الثابت \"sich freuen über etwas\" (يفرح بشيء مُستلَم) يستلزم \"über\".",
  "23": "\"einfach\" (ببساطة) لا يكثّف النفي بهذا المعنى، و\"kaum\" (بالكاد) قد يخلق تكراراً غريباً مع \"nicht\" -- التعبير الشائع \"nicht besonders\" (ليس كثيراً) يستلزم \"besonders\".",
  "24": "\"allerdings\" (لكن) أداة تضاد، و\"außerdem\" (علاوة على ذلك) أداة إضافة -- لا تعبّران عن التبرير الختامي (فبعد كل شيء) الذي تعبّر عنه \"schließlich\".",
  "25": "\"steht\" (يقف) فعل مختلف تماماً لا يصف مسافة، و\"abgerückt\" (منسحب/مبتعد) كلمة غير مألوفة في هذا السياق -- التعبير المعتاد لوصف مسافة مكان هو \"entfernt\".",
  "26": "\"ändern\" (يغيّر طبيعة شيء) لا يكوّن التعبير الثابت مع \"Stelle\"، و\"verwechseln\" (يخلط بين شيئين) معنى مختلف تماماً -- التعبير الثابت \"die Stelle wechseln\" يستلزم \"wechseln\".",
  "27": "\"sagend\" ليست صيغة ألمانية معتادة بهذا الاستخدام، و\"zu sagen\" مصدر بـ\"zu\" -- لا يكوّن التعبير الاصطلاحي الثابت \"ehrlich gesagt\" (بصراحة) الذي يستلزم صيغة الفاعل الثاني: gesagt.",
  "28": "\"kommende\" حالة رفع/نصب -- لا تناسب حالة الجر بعد \"ab dem\"، و\"kommendem\" نهاية التصريف القوي -- بينما وجود أداة التعريف \"dem\" يفرض التصريف الضعيف: kommenden.",
  "29": "\"als\" (من/عندما) لا يكوّن تركيب المقارنة التناسبية، و\"weil\" (لأن) سببية -- معنى مختلف عن تركيب \"je...desto\" (كلما...كلما) الذي يستلزم \"je\".",
  "30": "\"ist\" مضارع مباشر -- لا يصوغ اقتراحاً مهذباً افتراضياً، و\"war\" ماضٍ بسيط -- لا يناسب اقتراحاً حالياً؛ التعبير الثابت \"wie wäre es\" يستلزم Konjunktiv II: wäre.",
};

const JUSTUS_ORIGINAL_WRONG = {
  ...JUSTUS_SHARED_WRONG,
  "22": "\"daher\" (لذلك) ظرف نتيجة -- لا يكثّف نفياً، و\"sicher\" (بالتأكيد) ظرف يقين -- لا يناسب تعزيز النفي \"nicht\" كما تفعل \"gar\".",
};

const JUSTUS_MOD_WRONG = {
  ...JUSTUS_SHARED_WRONG,
  "22": "\"daher\" (لذلك) ظرف نتيجة، و\"sicher\" (بالتأكيد) ظرف يقين -- كلاهما لا يصلح رقماً ترتيبياً؛ التعبير الثابت \"zum ersten Mal\" (لأول مرة) يستلزم \"ersten\".",
};

const JUTTA_WRONG = {
  "21": "\"darauf\" ترتبط بأفعال أخرى مثل \"warten auf\"، و\"dazu\" ترتبط بتعابير أخرى مثل \"dazu sagen\" -- التعبير \"ein Grund für etwas\" يستلزم الضمير الظرفي \"dafür\".",
  "22": "\"statt\" (بدلاً من) معنى مختلف تماماً، و\"während\" (أثناء) ظرف زمني -- لا يصف سبباً مباشراً كما تفعل \"wegen\".",
  "23": "\"verschieben\" مصدر -- لا يناسب زمن الماضي التام (Perfekt) الذي يستلزم صيغة الفاعل الثاني بعد \"habe\"، و\"verschiebten\" ليست صيغة ألمانية صحيحة إطلاقاً.",
  "24": "\"sogar nicht\" ليست صيغة ألمانية معتادة بهذا الترتيب، و\"noch nicht\" (لم يحدث بعد) عكس المعنى تماماً -- الجملة تصف توقف قدرة كانت موجودة سابقاً، وهذا يستلزم \"nicht mehr\" (لم يعد).",
  "25": "\"geschicken\" ليست صيغة ألمانية صحيحة (الفعل الصحيح لو استُخدم هو schicken→geschickt، وحتى هو لا يناسب المعنى)، و\"nachgewiesen\" (أثبَت) معنى مختلف تماماً -- التعبير الطبي الثابت \"ins Krankenhaus einweisen\" يستلزم \"eingewiesen\".",
  "26": "\"Gleichgewicht\" (توازن) كلمة حقيقية لكن معناها مختلف تماماً (لا علاقة بالوزن)، و\"Gleichgültigkeit\" (لا مبالاة) معنى غير ذي صلة إطلاقاً.",
  "27": "\"auf\" و\"für\" لا يقترنان بـ\"Behandlung gehen\" بهذا المعنى -- التعبير الثابت \"zur Behandlung gehen\" (يذهب للعلاج) يستلزم \"zur\" (zu+der) حصراً.",
  "28": "\"über\" و\"vor\" لا يكوّنان التعبير الاصطلاحي الثابت -- \"etwas hinter sich haben\" (يكون قد أنهى شيئاً/أصبح خلفه) يستلزم \"hinter\" حصراً.",
  "29": "\"vor allem\" (قبل كل شيء) توحي بأن هذه النصيحة الأهم، لا مجرد مثال واحد من عدة، و\"auf alle Fälle\" (على كل حال) معنى مختلف تماماً -- لا يقدّم مثالاً من قائمة كما تفعل \"unter anderem\".",
  "30": "\"eigentlich\" (في الأصل) لا تنفي شيئاً، و\"überhaupt\" (على الإطلاق) وحدها لا تكوّن التعبير المؤكِّد للنفي بنفس قوة ووضوح \"gar nicht\" (لا... إطلاقاً) في هذا الموضع.",
};

const JUTTA_GAP28_FIX = {
  keyword: "etwas hinter sich haben (Idiom)",
  explanation_correct: "\"etwas hinter sich haben\" تعبير اصطلاحي ثابت يعني \"أنهى/أنجز شيئاً بالفعل\" -- العلاجات المذكورة قد اكتملت بالفعل.",
};

async function deepenExercise(title, wrongMap, extraFix) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  if (extraFix?.gap28) items["28"] = { ...items["28"], ...extraFix.gap28 };
  console.log(`${title}: updated explanation_wrong for ${Object.keys(wrongMap).length} gaps${extraFix?.gap28 ? " (+ fixed gap 28 keyword/explanation mismatch)" : ""}`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function main() {
  await deepenExercise("Justus oder Juhannas ( Original )", JUSTUS_ORIGINAL_WRONG);
  await deepenExercise("Justus oder Juhannas (معدل)", JUSTUS_MOD_WRONG);
  await deepenExercise("Jutta", JUTTA_WRONG, { gap28: JUTTA_GAP28_FIX });
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

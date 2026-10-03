/**
 * Deepen T2 #03: "Die Internet-Hauptstadt Deutschlands", "Der klügste
 * Freund des Menschen" (2 duplicate-content rows: "( Original )" and
 * "(معدل)" -- identical gaps/word-bank, so the same WRONG map is applied
 * to both ids, mirroring the T1 "Meyerhofer 2" precedent).
 *
 * Usage: node scripts/learning-aids/deepen-t2-03.mjs [--apply]
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

const INTERNET_WRONG = {
  "31": "\"ÜBER\" حرف جر مختلف تماماً لا يقترن بالفعل \"sich anschließen\"، و\"IN\" حرف جر آخر (يُستخدم في التعبير \"sich verwandeln in\" في الفجوة 36) -- لا يكوّن هذا التعبير؛ التعبير الثابت \"sich anschließen an\" يستلزم \"AN\" حصراً.",
  "32": "\"GEWESEN\" صيغة الفاعل الثاني لفعل \"sein\" (كان) -- تصف حالة ثابتة لا تحولاً، و\"WORDEN\" صيغة خاصة تُستخدم حصراً في المبني للمجهول (كما في الفجوة 33) -- لا في وصف صيرورة نشطة؛ وصف تحول (أصبح) يستلزم \"GEWORDEN\".",
  "33": "\"GEWORDEN\" صيغة \"werden\" الدالة على الصيرورة النشطة (كما في الفجوة 32) -- لا صيغة المبني للمجهول، و\"GEWESEN\" صيغة \"sein\" -- معنى مختلف تماماً؛ تركيب Perfekt Passiv (ist+Partizip II+...) يستلزم \"WORDEN\" حصراً.",
  "34": "\"DOCH\" (لكن) أداة تعارض مستقلة -- لا يبدأ بها تركيب \"nicht nur...sondern auch\"، و\"EIGENTLICH\" (في الواقع) ظرف تصحيح -- معنى مختلف تماماً؛ البنية الجامعة تستلزم بدء الجزء الأول بـ\"NICHT\".",
  "35": "\"DOCH\" أداة تعارض عامة -- لا ترتبط تحديداً ببنية \"nicht nur\" السابقة، و\"ÜBRIGENS\" (بالمناسبة) ظرف جانبي -- معنى مختلف تماماً؛ البنية \"nicht nur...sondern auch\" تفرض \"SONDERN\" حصراً.",
  "36": "\"AN\" حرف جر آخر (يُستخدم في التعبير \"sich anschließen an\" في الفجوة 31) -- لا يقترن بالفعل \"sich verwandeln\"، و\"ÜBER\" حرف جر مختلف تماماً؛ التعبير الثابت \"sich verwandeln in\" يستلزم \"IN\" حصراً.",
  "37": "\"EIGENTLICH\" (في الواقع) يفيد تصحيحاً أو استدراكاً بسيطاً -- لا انتقالاً حاداً لفكرة معارضة، و\"ÜBRIGENS\" (بالمناسبة) يقدّم ملاحظة جانبية -- معنى مختلف تماماً؛ الانتقال لفكرة معارضة يستدعي \"DOCH\".",
  "38": "\"DARÜBER\" ضمير ظرفي لكن بحرف جر مختلف (über) -- التعبير الثابت \"Kritik üben an\" يستلزم حرف الجر \"an\" حصراً (daran)، و\"ÜBER\" حرف جر مجرد -- لا يعمل ضميراً إشارياً لفكرة سابقة؛ هذا يستلزم \"DARAN\".",
  "39": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا الفعل المركّب، و\"IN\" حرف جر آخر (بمعنى الدخول إلى مكان) -- لا يناسب النتيجة المجردة هنا؛ التعبير الثابت \"führen zu\" (يؤدي إلى) يستلزم \"ZU\" حصراً.",
  "40": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"ÜBER\" حرف جر آخر -- لا يقترن بـ\"Wert legen\"؛ التعبير الثابت \"Wert legen auf\" يستلزم \"AUF\" حصراً.",
};

const KLUEGSTE_WRONG = {
  "31": "\"ABER\" (لكن) أداة تعارض مستقلة -- تكرار زائد مع \"jedoch\" اللاحقة في نفس الجملة، و\"DARÜBER\" ضمير ظرفي -- لا يعمل أداة تمهيد؛ تمهيد لتباين لاحق (يُستكمل بـ jedoch) يستدعي \"ZWAR\" حصراً.",
  "32": "\"SEIEN\" صيغة Konjunktiv I من \"sein\" -- فعل مختلف تماماً لا يكوّن المبني للمجهول، و\"WAR\" صيغة مفرد -- لا تطابق الفاعل الجمعي \"Untersuchungen\"؛ مبني للمجهول في الماضي بصيغة الجمع يفرض \"WURDEN\".",
  "33": "\"AN\" حرف الجر نفسه المستخدم بالفعل في التعبير \"an den Augen\" -- لا يصلح جزيء الفعل المنفصل المطلوب أيضاً، و\"ÜBER\" جزيء مختلف تماماً؛ الفعل المنفصل \"ablesen\" في نهاية شبه الجملة يستلزم الجزيء \"AB\" حصراً.",
  "34": "\"AN\" حرف جر آخر -- لا يقترن بالفعل \"reagieren\" بهذا المعنى، و\"ÜBER\" حرف جر مختلف تماماً؛ التعبير الثابت \"reagieren auf\" يستلزم \"AUF\" حصراً.",
  "35": "\"SEIEN\" صيغة الجمع من نفس الفعل -- لا تطابق الفاعل المفرد \"der Blickkontakt\"، و\"WAR\" صيغة إخبارية مباشرة (Indikativ) -- لا تناسب نقل كلام الباحثين بأسلوب غير مباشر؛ هذا يستلزم Konjunktiv I المفرد: SEI.",
  "36": "\"SEI\" صيغة Konjunktiv I لنقل كلام غير مباشر -- لا تناسب وصف حالة ماضية حقيقية لوحظت في التجربة، و\"WURDEN\" صيغة جمع مبني للمجهول -- لا تطابق الفاعل المفرد \"der Behälter\" في جملة فاعلة عادية؛ هذا يستلزم \"WAR\".",
  "37": "\"AN\" حرف جر مختلف تماماً، و\"ÜBER\" حرف جر آخر -- لا يكوّنان التعبير الثابت \"um...herum\" (الالتفاف حول)؛ هذا يستلزم \"UM\" حصراً.",
  "38": "\"DARAUF\" ضمير ظرفي بحرف جر مختلف (auf) -- التعبير الثابت \"davon ausgehen\" يستلزم حرف الجر \"von\" حصراً، و\"DARÜBER\" ضمير ظرفي آخر بحرف جر مختلف (über) -- لا يناسب أيضاً؛ هذا يستلزم \"DAVON\".",
  "39": "\"DAVON\" ضمير ظرفي بحرف جر مختلف (von) -- التعبير الثابت \"stolz sein auf\" يستلزم حرف الجر \"auf\" حصراً، و\"DARÜBER\" ضمير ظرفي آخر بحرف جر مختلف (über) -- لا يناسب أيضاً؛ هذا يستلزم \"DARAUF\".",
  "40": "\"ABER\" أداة تعارض عامة -- لا ترتبط تحديداً ببنية \"nicht nur\" السابقة، و\"ZWAR\" (يمهّد لتباين لاحق بصيغة مختلفة) -- معنى مختلف تماماً هنا؛ البنية \"nicht nur...sondern auch\" تفرض \"SONDERN\" حصراً.",
};

async function deepenExercise(title, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 2;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  await applyToId(rows[0].id, title, wrongMap);
}

async function applyToId(id, label, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where id = '${id}';`);
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  console.log(`${label} (${id}): updated explanation_wrong for ${Object.keys(wrongMap).length} gaps`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function main() {
  await deepenExercise("Die Internet-Hauptstadt Deutschlands", INTERNET_WRONG);
  await applyToId("e9ecf337-5d74-4268-82da-cbd728207d1f", "Der klügste Freund des Menschen ( Original )", KLUEGSTE_WRONG);
  await applyToId("30846832-7b65-408e-ac48-33f014f8d659", "Der klügste Freund des Menschen (معدل)", KLUEGSTE_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

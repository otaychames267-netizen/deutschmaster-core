/**
 * Deepen T2 #01: "Ausbildung mit über 30", "Allein das Wort „Museum“ ist
 * schon fad", "Crowdfunding boomt, Print lebt" -- add genuine
 * explanation_wrong distractor reasoning. Teil 2 has no per-gap a/b/c
 * options, so distractors are drawn from genuinely tempting alternative
 * words in that exercise's own word bank (sb_t2_words).
 *
 * Usage: node scripts/learning-aids/deepen-t2-01.mjs [--apply]
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

const AUSBILDUNG_WRONG = {
  "31": "\"DA\" أداة ربط تابعة تستلزم فعلاً مصرّفاً في نهاية الجملة (كما في الفجوة 33) -- لا يناسب ترتيب الفعل في المرتبة الثانية هنا (hat)، و\"WARUM\" أداة استفهام تحوّل الجملة إلى سؤال غير مباشر -- لا تناسب سرد سبب مباشر؛ الجملة هنا جملة رئيسية مستقلة تفسّر الجملة السابقة، وهذا يستلزم أداة الربط \"DENN\" (فعل في المرتبة الثانية).",
  "32": "\"SOLLTE\" يفيد إلزاماً خارجياً (توصية/واجب) -- لا رغبة شخصية، و\"DURFTEN\" ماضٍ بسيط بصيغة الجمع (كانوا يُسمح لهم) -- زمن وعدد خاطئان تماماً لهدف حالي لشخص مفرد؛ التعبير عن هدف شخصي حالي يستلزم \"MÖCHTE\".",
  "33": "\"DENN\" أداة ربط تنسيقية تستلزم ترتيب الفعل في المرتبة الثانية -- لا يناسب الفعل \"fehlt\" الواقع في نهاية الجملة هنا، و\"DAGEGEN\" ظرف مقارنة مستقل -- لا يعمل أداة ربط تابعة إطلاقاً؛ الجملة الجانبية السببية بفعل في النهاية تستلزم \"DA\".",
  "34": "\"AUSWAHL\" (الاختيار) لا يتكوّن معها التعبير الثابت مع الفعل \"geben\" بهذا المعنى، و\"VERFÜGUNG\" كلمة من سياق مختلف تماماً (فجوة 38) -- التعبير الثابت \"jemandem eine Chance geben\" يستلزم \"CHANCE\" حصراً.",
  "35": "\"DA\" أداة ربط تابعة سببية -- لا تصلح لإدخال سؤال غير مباشر بعد فعل \"erklären\"، و\"DAGEGEN\" ظرف مقارنة -- معنى مختلف تماماً؛ السؤال عن السبب داخل جملة مُدرَجة يستلزم \"WARUM\".",
  "36": "\"ZIEHEN\" (يسحب/يجذب) فعل لا يكوّن أي تعبير ثابت مع \"Verantwortung\"، و\"DURFTEN\" صيغة فعل وجهي مصرّفة -- لا تناسب موضع المصدر بعد \"bereit... zu\"؛ التعبير الثابت \"Verantwortung übernehmen\" يستلزم المصدر \"ÜBERNEHMEN\".",
  "37": "\"SOLLTE\" صيغة مفرد (هو/هي) -- لا تطابق الفاعل الجمعي \"sie\" (كبار السن) هنا، و\"DURFTEN\" ماضٍ إخباري بسيط -- لا يناسب نقل رأي محتمل/مهذّب؛ هذا يستلزم صيغة Konjunktiv II الجمعية: KÖNNTEN.",
  "38": "\"AUSWAHL\" لا يكوّن أي تعبير ثابت مع \"vor ... stehen\"، و\"ZIEHEN\" فعل من فئة مختلفة تماماً -- التعبير الثابت \"(nicht mehr) zur/vor Verfügung stehen\" يستلزم الاسم \"VERFÜGUNG\" حصراً.",
  "39": "\"DAGEGEN\" (بالمقابل) تقارن بين نقطتين منفصلتين -- لا تنقض فكرة سلبية سابقة كتنازل، و\"SONDERN\" يستلزم نفياً مباشراً بـ\"nicht\" غير موجود هنا؛ التنازل عن الفكرة السلبية السابقة (نقص الخبرة الزمنية) يستلزم \"TROTZDEM\".",
  "40": "\"DAGEGEN\" يفيد تبايناً بين نقطتين مستقلتين -- لا تصحيحاً مباشراً لفكرة منفية بـ\"nicht\" كما هنا، و\"AUSWAHL\" اسم لا يصلح أداة ربط إطلاقاً؛ بنية \"nicht X, sondern Y\" تستلزم \"SONDERN\" حصراً.",
};

const MUSEUM_WRONG = {
  "31": "\"GIPFEL\" (القمة) اسم لا يكوّن أي تعبير ثابت مع الفعل \"bringen\" بهذا المعنى، و\"DARIN\" ضمير ظرفي -- لا يعمل اسماً في هذا الموضع؛ التعبير الثابت \"etwas auf den Punkt bringen\" (تلخيص شيء بدقة) يستلزم الاسم \"PUNKT\" حصراً.",
  "32": "\"LIEFERN\" (يزوّد/يورّد) فعل من سياق مختلف تماماً، و\"BRINGEN\" فعل عام -- لا يكوّن التعبير الاصطلاحي الثابت \"etwas aus der Welt schaffen\" (القضاء على شيء نهائياً) الذي يستلزم \"SCHAFFEN\" حصراً.",
  "33": "\"AM\" (an+dem مدمجة) حرف جر مندمج مع أداة تعريف -- لا يصلح جزيئاً منفصلاً لفعل \"anbieten\"، و\"ZUM\" حرف جر مختلف تماماً -- لا يكوّن الفعل المنفصل المطلوب؛ الفعل \"anbieten\" في نهاية الجملة الرئيسية يستلزم الجزيء المنفصل \"AN\" حصراً.",
  "34": "\"EHER\" (بالأحرى) ظرف مقارنة -- معنى مختلف تماماً عن \"إضافي\"، و\"DARUM\" ضمير ظرفي -- لا يعمل صفة أمام اسم؛ \"noch\" + اسم جمع بلا أداة يستلزم صفة \"WEITERE\" بمعنى إضافية/أخرى.",
  "35": "\"DARIN\" ضمير ظرفي لكن بحرف جر مختلف (in) -- التعبير الثابت \"es geht um etwas\" يستلزم حرف الجر \"um\" حصراً، و\"WOVON\" صيغة استفهامية (عن أي شيء) -- لا تناسب جملة إخبارية تشير لفكرة تالية؛ هذا يستلزم \"DARUM\".",
  "36": "\"AM\" (an+dem) حرف جر مندمج مختلف -- لا يكوّن التعبير الثابت الجامد \"Mittel zum Zweck\"، و\"DARUM\" ضمير ظرفي -- لا يعمل حرف جر مدمجاً مع أداة التعريف؛ هذا التعبير الجامد يستلزم \"ZUM\" (zu+dem) حصراً.",
  "37": "\"LIEFERN\" (يزوّد) فعل بمعنى مختلف تماماً لا علاقة له بالهروب من الروتين، و\"GIPFEL\" اسم -- لا يصلح مصدراً بعد \"zu\"؛ السياق (الهروب من الروتين المدرسي) يستلزم الفعل \"ENTGEHEN\".",
  "38": "\"WOMIT\" ضمير استفهامي ظرفي لكن بحرف جر مختلف (mit) -- التعبير الثابت \"wovon etwas handelt\" (عمّا يدور حديث شيء) يستلزم حرف الجر \"von\" حصراً، و\"DARUM\" ضمير إشاري -- لا يعمل أداة استفهام؛ هذا يستلزم \"WOVON\".",
  "39": "\"AN\" حرف جر غير مندمج -- الإدماج مع أداة التعريف \"dem\" إلزامي هنا (لا توجد صفة أو أداة تفصل بينهما)، و\"ZUM\" (zu+dem) حرف جر مختلف تماماً؛ التعبير الثابت \"es liegt an etwas\" مع الاسم المذكر المباشر يستلزم \"AM\" (an+dem).",
  "40": "\"DARUM\" ضمير ظرفي -- معنى مختلف تماماً عن المقارنة، و\"WEITERE\" صفة -- لا تعمل ظرف مقارنة؛ بنية المقارنة \"eher...als\" (بالأحرى... من) تستلزم الظرف \"EHER\" حصراً.",
};

const CROWDFUNDING_WRONG = {
  "31": "\"ergeben\" (ينتج عن) فعل بمعنى مختلف تماماً، و\"eigentlich\" ظرف -- لا يصلح مصدراً في نهاية الجملة؛ السياق (عرض مشروع تقني في المهرجان) يستلزم المصدر \"vorstellen\".",
  "32": "\"zwar\" تحتاج \"aber\" لاحقاً في تركيب تنازلي -- غير موجود هنا، و\"sogleich\" (فوراً) ظرف زمني -- معنى مختلف تماماً؛ إضافة موضوع مواز بنفس الأهمية يستلزم \"ebenfalls\".",
  "33": "\"vor\" حرف جر مجرد -- التعبير الثابت \"die Jahre davor\" يستلزم الضمير الظرفي المركّب \"davor\"، و\"obwohl\" أداة ربط تابعة -- لا تعمل ظرفاً بعد اسم؛ هذا يستلزم \"davor\".",
  "34": "\"obwohl\" أداة ربط تابعة تستلزم فعلاً في نهاية الجملة -- غير مناسب هنا لتركيب مستقل، و\"eigentlich\" (في الواقع) ظرف تخفيف -- لا يصحّح فكرة منفية مباشرة كما هنا؛ تصحيح فكرة منفية سابقاً يستلزم \"vielmehr\".",
  "35": "\"davor\" ضمير ظرفي مركّب -- لا يعمل جزيء فعل منفصل، و\"durch\" حرف جر مختلف تماماً -- لا يكوّن الفعل المنفصل \"vorherrschen\"؛ هذا الفعل في نهاية الجملة يستلزم الجزيء \"vor\" حصراً.",
  "36": "\"erfolgreich\" (ناجح) صفة بمعنى مختلف تماماً، و\"sogleich\" ظرف زمني -- لا يكوّنان التعبير الثابت \"bereit sein, zu\"؛ الاستعداد للقيام بفعل يستلزم \"bereit\".",
  "37": "\"eigentlich\" (في الواقع) يفيد تصحيحاً أو استدراكاً -- لا تقديراً غير قاطع لصفة تفضيلية، و\"zwar\" تحتاج \"aber\" لاحقاً -- تركيب مختلف تماماً؛ التعبير عن تقدير غير قاطع أمام صيغة التفضيل (bekannteste) يستلزم \"wohl\".",
  "38": "\"vor\" حرف جر مختلف تماماً لا يصف وسيلة، و\"damit\" ضمير ظرفي -- لا يعمل حرف جر بسيطاً هنا؛ وصف وسيلة التمويل (بواسطة التمويل الجماعي) يستلزم حرف الجر \"durch\".",
  "39": "\"bereit\" (مستعد) صفة بمعنى مختلف تماماً، و\"ergeben\" فعل -- لا يعمل ظرف كيفية أمام الفعل الانعكاسي \"behaupten\"؛ التعبير الثابت \"sich erfolgreich behaupten\" يستلزم الظرف \"erfolgreich\".",
  "40": "\"davor\" ضمير ظرفي بحرف جر مختلف (vor) -- التعبير الثابت \"mit etwas verbunden sein\" يستلزم حرف الجر \"mit\"، و\"durch\" حرف جر بسيط -- لا يعمل ضميراً إشارياً يشير لفكرة سابقة؛ الإشارة لفكرة سابقة (المنتج المطبوع) يستلزم الضمير الظرفي \"damit\".",
};

async function deepenExercise(title, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 2;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  console.log(`${title}: updated explanation_wrong for ${Object.keys(wrongMap).length} gaps`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function main() {
  await deepenExercise("Ausbildung mit über 30", AUSBILDUNG_WRONG);
  await deepenExercise("Allein das Wort „Museum“ ist schon fad", MUSEUM_WRONG);
  await deepenExercise("Crowdfunding boomt, Print lebt", CROWDFUNDING_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

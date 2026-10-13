/**
 * Deepen T1 #15: "Liebe Sandra ( Original )", "Liebe Sandra (معدل)",
 * "Lieber Thomas" -- same distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-15.mjs [--apply]
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

const SANDRA_SHARED_WRONG = {
  "25": "\"in\" و\"zu\" لا يقترنان بالفعل \"bestehen\" بهذا المعنى -- التعبير الثابت \"bestehen aus\" (يتكون من) يستلزم \"aus\".",
  "27": "\"lebende\" و\"lebender\" نهايتا تصريف لا تطابقان صيغة الجمع المطلوبة هنا بعد \"wild\" (بلا أداة تعريف) -- السياق يستلزم النهاية \"-en\": lebenden.",
  "28": "\"wenigen\" حالة جر -- بينما \"Stunden\" هنا مفعول به زمني بحالة النصب، و\"weniger\" إما صيغة مقارنة تحتاج نقطة مقارنة أو حالة ملكية -- كلاهما لا يناسب حالة النصب الجمعية البسيطة المطلوبة: wenige.",
  "29": "\"Sofern\" (بشرط أن) أداة شرطية -- لا تصف تتابعاً زمنياً، و\"Somit\" (وبذلك) ظرف نتيجة مستقل -- لا يصلح أداة ربط تُدخل جملة ثانوية.",
};

const SANDRA_ORIGINAL_WRONG = {
  ...SANDRA_SHARED_WRONG,
  "21": "\"dir\" حالة جر -- بينما الفعل المتعدي \"überraschen\" يستلزم مفعولاً به مباشراً بالنصب، و\"sich\" ضمير انعكاسي للغائب -- لا يطابق المخاطَبة.",
  "22": "\"möchte\" (تودّ) تعبّر عن رغبة، و\"müsste\" (يجب أن) تعبّر عن ضرورة -- لا يناسبان تخيل احتمال بسيط كما تفعل \"könnte\".",
  "23": "\"mit\" لا يقترن بالفعل \"sich erholen\" بهذا المعنى، و\"vor\" ترتبط بأفعال أخرى مثل \"sich fürchten vor\" -- التعبير الثابت \"sich erholen von\" (يستريح من) يستلزم \"von\".",
  "24": "\"für\" لا يكوّن التعبير الثابت \"etwas als X empfinden\"، و\"wie\" (مثل) توحي بمقارنة -- لا حكماً مباشراً على طبيعة الشيء كما تفعل \"als\".",
  "26": "\"hat\" فعل مساعد خاطئ لهذا التركيب، و\"wird\" يصوغ مبنياً للمجهول مختلفاً -- التركيب الثابت \"sein + zu + Infinitiv\" (إمكانية سلبية: يمكن الوصول إليها) يستلزم \"ist\".",
  "30": "\"dürftest\" تحمل دلالة إذن، و\"könntest\" تحمل دلالة قدرة -- كلاهما معنى مختلف عن نقل رغبة سابقة (gern) بأدب، الذي يستلزم \"würdest\".",
};

const SANDRA_MOD_WRONG = {
  ...SANDRA_SHARED_WRONG,
  "21": "\"was\" أداة استفهام/وصل -- لا تعمل فاعلاً شكلياً هنا، و\"das\" ضمير إشارة -- لا يناسب التركيب غير الشخصي \"es überrascht jmdn., dass...\" الذي يستلزم \"es\".",
  "22": "\"ob\" (هل) تصوغ سؤالاً غير مباشر، و\"weil\" (لأن) سببية -- لا تكملان التركيب الثابت \"es überrascht, dass...\" الذي يستلزم \"dass\".",
  "23": "\"viele\" صيغة جمع -- لا تناسب الاسم المفرد غير المعدود \"Stress\"، و\"großen\" صفة مختلفة تماماً بنهاية تصريف -- لا تصلح كمحدد كمّي هنا؛ الصحيح \"viel\" بلا تصريف.",
  "24": "\"das\" ضمير إشارة يحتاج اسماً محدداً سابقاً، و\"es\" ضمير شخصي -- لا يعمل ضميراً موصولاً يربط بجملة كاملة سابقة؛ هذا يستلزم \"was\".",
  "26": "\"erreicht\" صيغة فاعل ثانٍ أو مضارع مصرّف -- لا تناسب تركيب \"zu+Infinitiv\" الذي يستلزم مصدراً مجرداً، و\"erreichte\" ماضٍ بسيط -- معنى وزمن مختلفان تماماً.",
  "30": "\"wie\" (كيف) تسأل عن الكيفية، و\"warum\" (لماذا) تسأل عن السبب -- لا تناسبان السؤال عن \"ما الجديد\" الذي يستلزم \"was\" في التعبير الثابت \"was gibt es Neues\".",
};

const THOMAS_WRONG = {
  "21": "\"trotz\" حرف جر يحتاج اسماً بحالة الملكية بعده مباشرة -- لا جملة كاملة بفعل مصرّف (hatte)، و\"während\" (أثناء) ظرف/أداة زمنية -- لا تصوغ تناقضاً.",
  "22": "\"hat\" فعل مساعد للماضي التام العادي -- لا يميّز الأسبقية الزمنية المطلوبة بعد \"bevor\" مع فعل رئيسي ماضٍ، و\"hätte\" صيغة حال افتراضي -- لا سرد واقعي.",
  "23": "\"konnte\" (استطعتُ) يفيد قدرة، و\"sollte\" (كان يُفترض) يفيد توجيهاً خارجياً -- لا يناسبان نية شخصية داخلية (التفكير في تغيير الرأي) كما يفعل \"wollte\".",
  "24": "\"dafür\" ترتبط بأفعال أخرى، و\"damit\" ترتبط بجمل الغرض -- التعبير الثابت \"nichts hören wollen von\" يستلزم \"davon\".",
  "25": "\"Weder...noch\" تنفي الأمرين معاً -- عكس المعنى (شعرت بكليهما فعلاً)، و\"Zwar...aber\" تصوغ تنازلاً/تبايناً -- لا وصفاً لشعورين متزامنين متكاملين كما تفعل \"einerseits...andererseits\".",
  "26": "\"davon\" ترتبط بأفعال أخرى مثل \"abhängen von\"، و\"dazu\" ترتبط بتعابير أخرى -- التعبير الثابت \"helfen bei\" يستلزم الضمير الظرفي \"dabei\".",
  "27": "\"aussuchen\" مصدر مجرد ناقص \"zu\" الإلزامية بعد \"helfen, zu+Infinitiv\" (مع فعل منفصل يُدرَج \"zu\" بين البادئة والجذع)، و\"ausgesucht\" صيغة الفاعل الثاني -- لا تناسب هذا التركيب.",
  "28": "\"grundlegenden\" نهاية التصريف الضعيف -- بينما \"einige\" (بلا أداة تعريف) تستلزم التصريف القوي بنهاية \"-e\" للجمع بحالة النصب، و\"grundlegender\" حالة رفع مذكرة أو ملكية -- لا تناسب الجمع المنصوب هنا.",
  "29": "\"am\" (an+dem) حرف جر مختلف، و\"zum\" (zu+dem) يكرر حرف الجر \"zu\" الموجود أصلاً لاحقاً في التعبير -- التعبير الثابت \"im Gegensatz zu\" يستلزم \"im\" حصراً.",
  "30": "\"dass\" تصوغ جملة خبرية مؤكدة -- لا سؤالاً عن الكيفية، و\"ob\" (هل) تصوغ سؤالاً بنعم/لا -- بينما الجملة تسأل عن \"الكيفية\" التي يستلزمها \"wie\".",
};

async function deepenExercise(title, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
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
  await deepenExercise("Liebe Sandra ( Original )", SANDRA_ORIGINAL_WRONG);
  await deepenExercise("Liebe Sandra (معدل)", SANDRA_MOD_WRONG);
  await deepenExercise("Lieber Thomas", THOMAS_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

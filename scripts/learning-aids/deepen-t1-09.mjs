/**
 * Deepen T1 #9: "Ida", "Igor", "Jens' Fußballtrainer-Sorgen" -- same
 * distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-09.mjs [--apply]
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

const IDA_WRONG = {
  "21": "\"an\" لا يقترن بالفعل الانعكاسي \"sich freuen\" بهذا المعنى، و\"wegen\" (بسبب) حرف جر سببي -- التعبير الثابت \"sich freuen auf\" (يتطلع إلى) يستلزم \"auf\" حصراً.",
  "22": "\"habe\" صيغة حاضر/فعل مساعد عادي -- لا تصف بديلاً افتراضياً لم يحدث، و\"würde\" فعل مساعد افتراضي آخر لا يتوافق مع تركيب \"täglich... fahren können\" هنا -- الصحيح Konjunktiv II لـ\"haben\": hätte.",
  "23": "\"dich\" ضمير المخاطب لا يطابق الفاعل \"ich\"، و\"uns\" (نحن) ضمير جمعي -- لا يناسب فاعلاً مفرداً بصيغة المتكلم.",
  "24": "\"ausgepackt habe\" ماضٍ تام عادي -- لا يميّز الأسبقية الزمنية المطلوبة بعد \"nachdem\"، و\"auspackte\" ماضٍ بسيط -- لا يصوغ التتابع الزمني الصحيح (الفعل الأسبق يحتاج Plusquamperfekt).",
  "25": "\"darauf\" ترتبط بأفعال أخرى مثل \"warten auf\"، و\"darin\" ترتبط بـ\"in\" (كما في \"darin besteht\") -- التعبير الثابت \"es liegt an etwas\" يستلزم \"daran\".",
  "26": "\"einander\" وحدها تحتاج حرف جر ملحقاً بها لتعمل كظرف هنا، و\"gegeneinander\" (ضد بعضهما) معنى معاكس -- لا يناسب حديثاً ودياً.",
  "27": "\"denn\" (لأن) أداة سببية -- معنى مختلف، و\"wenn\" (إذا/عندما) لا تكوّن التعبير الثابت المقارن \"anders als\" (مختلف عن) -- هذا يستلزم \"als\" حصراً.",
  "28": "\"trotzdem\" ظرف مستقل يستلزم ترتيباً معكوساً في جملته الخاصة -- لا فعلاً في النهاية، و\"während\" (بينما/أثناء) لا تصوغ تناقضاً بل تزامناً زمنياً.",
  "29": "\"mit\" و\"zu\" لا يقترنان بهذا المعنى المكاني (ضمن قسم/مجموعة) -- التعبير \"bei uns\" (عندنا/لدينا) يستلزم \"bei\".",
  "30": "\"hoffentlich\" (نأمل) يعبّر عن أمنية، و\"sicherlich\" (بالتأكيد) يعبّر عن يقين -- لا يناسبان السؤال الحقيقي الفضولي الذي يعبّر عنه \"eigentlich\" هنا.",
};

const IGOR_WRONG = {
  "21": "\"mit\" لا يقترن بالفعل الانعكاسي \"sich freuen\" بهذا المعنى، و\"wegen\" (بسبب) حرف جر سببي -- التعبير الثابت \"sich freuen über etwas\" (يفرح بشيء مُستلَم) يستلزم \"über\".",
  "22": "\"sonst\" (وإلا) يصف نتيجة بديلة، و\"weiterhin\" (باستمرار) يوحي باستمرار حالة قائمة -- لا إضافة سبب ثانٍ جديد كما تفعل \"außerdem\".",
  "23": "\"kommen\" (يأتي) لا يكوّن التعبير الثابت \"Zug fahren\"، و\"nehmen\" (يأخذ) يحتاج أداة تعريف (den Zug nehmen) -- بينما الجملة هنا تستخدم الصيغة المجردة \"Zug fahren\".",
  "24": "\"darum\" و\"deshalb\" ظرفا نتيجة مستقلان -- لا يصوغان جملة ثانوية بفعل في الوسط/النهاية كما يفعل \"da\" التابعة هنا.",
  "25": "\"deshalb\" ظرف نتيجة مستقل، و\"damit\" ترتبط بجمل الغرض -- الفعل الثابت \"abhängen von etwas\" يستلزم الضمير الظرفي \"davon\" حصراً.",
  "26": "\"besprochen\" فاعل ثانٍ لفعل متعدٍ \"besprechen\" (يناقش شيئاً) -- بينما \"mit jemandem sprechen\" (يتحدث مع) فعل غير متعدٍ يستلزم \"gesprochen\"، و\"versprochen\" (وعد) معنى مختلف تماماً.",
  "27": "\"als\" و\"wenn\" لا يُدخلان جملة مفعول به بعد الفعل \"vorschlagen\" -- التعبير الثابت \"vorschlagen, dass\" يستلزم \"dass\" حصراً.",
  "28": "\"euch\" ضمير المخاطبين لا يطابق الفاعل الغائب \"die beiden\"، و\"uns\" (نحن) أيضاً لا يطابق فاعلاً بصيغة الغائب.",
  "29": "\"das\" أداة تعريف محايدة -- لا تناسب الجمع، و\"die\" حالة رفع/نصب جمعية -- بينما \"wegen\" يستلزم حالة الملكية الجمعية: der.",
  "30": "\"bestenfalls\" (في أفضل الأحوال) يوحي بتحفظ، و\"keinesfalls\" (بأي حال لا) عكس المعنى تماماً -- لا يناسبان التطلع الواثق الذي يعبّر عنه \"jedenfalls\" (على أي حال).",
};

const JENS_WRONG = {
  "21": "\"gelassen\" صيغة الفاعل الثاني -- لا تناسب الفعل الوجهي \"will\" الذي يستلزم مصدراً مجرداً، و\"ließ\" صيغة ماضٍ بسيط -- لا تتوافق مع هذا التركيب الوجهي أيضاً.",
  "22": "\"denn\" أداة ربط تنسيقية لا تدفع الفعل للنهاية -- بينما الفعل هنا في آخر الجملة (möchte) يؤكد جملة ثانوية تابعة، و\"wenn\" أداة شرطية -- لا تصف سبباً فعلياً حقيقياً.",
  "23": "\"für\" لا تصف دوراً وظيفياً، و\"wie\" (مثل) توحي بالتشبيه (كأنه مدرب) لا بدور حقيقي فعلي كما يفيده \"als\" هنا.",
  "24": "\"ob\" (هل) تفيد الشك -- بينما الجملة تعبّر عن اكتشاف حقيقة مؤكدة (أنك متحمس لكرة القدم)، و\"wann\" (متى) أداة استفهام زمنية -- معنى مختلف تماماً.",
  "25": "\"eigentlich\" (في الأصل) لا تكثّف كمية، و\"unbedingt\" (حتماً) ظرف إصرار -- لا يناسب وصف درجة الضغط كما يفعل \"ziemlich\" (إلى حد كبير).",
  "26": "\"für\" لا تصف فترة نشاط، و\"während\" قريبة زمنياً لكنها تحتاج حالة الملكية (während des Schulpraktikums) -- بينما التعبير الثابت المستخدم هنا \"beim + اسم النشاط\" يستلزم \"beim\".",
  "27": "\"durchsetzen\" مصدر مجرد ناقص \"zu\" الإلزامية بعد \"schaffen, zu+Infinitiv\"، و\"zu durchsetzen\" ترتيب خاطئ -- الأفعال المنفصلة تُدرِج \"zu\" بين البادئة والجذع (durchzusetzen)، لا قبل الفعل كاملاً.",
  "28": "\"das\" و\"welches\" ضميرا إشارة/وصل يحتاجان اسماً محدداً سابقاً -- بينما الجملة هنا تصف فكرة عامة غير محددة (فعلوا ما أرادوا)، وهذا يستلزم ضمير الوصل غير المحدد \"was\".",
  "29": "\"totalen\" نهاية حالة النصب المذكرة أو الملكية -- لا تناسب حالة الجر المحايدة هنا، و\"totales\" حالة رفع/نصب محايدة -- بينما \"in\" (ساكنة) تستلزم حالة الجر: totalem.",
  "30": "\"mich\" حالة نصب -- بينما الفعل الانعكاسي \"sich(Dativ) etwas vorstellen\" يستلزم حالة الجر، و\"sich\" ضمير انعكاسي للغائب -- لا يطابق فاعلاً بصيغة المتكلم \"ich\".",
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
  await deepenExercise("Ida", IDA_WRONG);
  await deepenExercise("Igor", IGOR_WRONG);
  await deepenExercise("Jens' Fußballtrainer-Sorgen", JENS_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

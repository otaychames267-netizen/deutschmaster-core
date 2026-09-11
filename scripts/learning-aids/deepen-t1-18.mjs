/**
 * Deepen T1 #18: "Mitarbeiterinnen und Mitarbeiter ( Neu )", "Paola",
 * "Rahim" -- same distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-18.mjs [--apply]
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

const MITARBEITER_WRONG = {
  "21": "\"der\" حالة مفردة -- لا تطابق الجمع \"Jahresziele\"، و\"diese\" ضمير إشارة -- لا يعمل ضميراً موصولاً؛ العائد على اسم جمع كمفعول به يستلزم \"die\".",
  "22": "\"das\" ضمير إشارة -- لا يصلح أداة ربط، و\"ob\" (هل) تصوغ سؤالاً غير مباشر -- لا تناسب اليقين المعبَّر عنه (أنا مقتنع)؛ التعبير الثابت \"überzeugt sein, dass\" يستلزم \"dass\".",
  "23": "\"Magazin\" بلا نهاية -- لا يناسب حالة الملكية، و\"Magazines\" صيغة غير معتادة بحرف زائد -- الصيغة الألمانية الصحيحة لحالة الملكية تستلزم \"-s\" فقط: Magazins.",
  "24": "\"den\" لا يحمل نهاية حالة الجر الجمعية الصحيحة، و\"dem\" حالة جر مفردة -- لا تطابق الاسم الجمعي السابق \"KommunikationsexpertInnen\"؛ هذا يستلزم \"denen\".",
  "25": "\"zum\" و\"zur\" هما حرف الجر \"zu\" مدمجاً مع أداة تعريف -- لا يناسبان هذا الموضع؛ التركيب \"es gilt, zu+Infinitiv\" يستلزم \"zu\" المجردة كأداة مصدر فقط.",
  "26": "\"in\" بلا إدماج مع أداة التعريف غير صحيحة نحوياً هنا (الإدماج إلزامي)، و\"aus\" (من) حرف جر مختلف تماماً -- التعبير الزمني الثابت \"im Sommer\" يستلزم \"im\".",
  "27": "\"Diese\" صيغة مؤنثة/جمعية -- لا تناسب الاسم المحايد \"Mal\"، و\"Diesen\" حالة نصب مذكرة أو جر جمعية -- بينما \"Mal\" هنا فاعل الجملة بحالة الرفع المحايدة: Dieses.",
  "28": "\"von\" لا يقترن بالفعل الانعكاسي \"sich bedanken\" بهذا المعنى، و\"für\" تُستخدم عند ذكر سبب الشكر (sich bedanken für etwas) لا الأشخاص المشكورين أنفسهم -- هذا يستلزم \"bei\".",
  "29": "\"welcher\" صيغة مذكرة/مؤنثة -- لا تناسب الاسم المحايد \"Sommerfest\"، و\"welchem\" حالة جر -- بينما الضمير هنا فاعل الجملة (الحفل الذي سيُقام) بحالة الرفع المحايدة: welches.",
  "30": "\"gemeinsames\" نهاية محايدة -- لا تناسب الاسم المذكر \"Erfolg\" بحالة النصب، و\"gemein\" صفة مختلفة تماماً بمعنى \"لئيم/مبتذل\" -- كلمة خاطئة كلياً هنا.",
};

const PAOLA_WRONG = {
  "21": "\"ihr\" ضمير المخاطبين غير الرسمي أو ضمير ملكية -- لا يصلح مفعولاً به هنا، و\"Sie\" صيغة مخاطبة رسمية -- لا تناسب أسلوب الرسالة الودي؛ الإشارة للطفلة (لاورا) تستلزم \"sie\".",
  "22": "\"obwohl\" أداة ربط تابعة تستلزم فعلاً في النهاية -- غير موجود هنا، و\"trotzdem\" (رغم ذلك) توحي بتناقض -- لا نتيجة منطقية مباشرة كما تفعل \"deshalb\".",
  "23": "\"bis\" (حتى) تصف موعداً نهائياً -- لا سؤالاً عن التوقيت، و\"dann\" (ثم) ظرف زمني بسيط -- لا يصلح أداة استفهام تُدخل جملة سؤال غير مباشر؛ هذا يستلزم \"wann\".",
  "24": "\"im\" و\"in\" لا يكوّنان التعبير الثابت \"auf jeden Fall\" (على كل حال) -- هذا التعبير يستلزم \"auf\" حصراً.",
  "25": "\"vom\" (من) يصف نقطة انطلاق آنية -- لا استمراراً من نقطة زمنية، و\"Zum\" (إلى) يصف اتجاهاً/غرضاً -- معنى مختلف تماماً؛ الاستمرار من نقطة ماضية حتى الآن يستلزم \"seit\".",
  "26": "\"obwohl\" (رغم أنّ) تصوغ تناقضاً -- معنى مختلف، و\"ohnehin\" (على أي حال) ظرف بسيط -- لا يصلح أداة ربط تُدخل سؤالاً داخلياً غير مباشر؛ هذا يستلزم \"ob\".",
  "27": "\"verstellen\" (يُعدّل/يحجب) فعل مختلف تماماً، و\"zustellen\" (يُسلّم بريداً) معنى غير ذي صلة إطلاقاً -- التعبير الثابت \"sich (nicht) vorstellen können\" يستلزم \"vorstellen\".",
  "28": "\"dafür\" ترتبط بأفعال أخرى، و\"damit\" ترتبط بجمل الغرض -- التعبير الثابت \"was hältst du von\" يستلزم \"davon\".",
  "29": "\"wie\" (مثل) توحي بمقارنة/تشبيه -- لا مؤهلاً مهنياً حقيقياً، و\"zu\" لا تقترن بـ\"Ausbildung\" بهذا المعنى؛ التعبير الثابت \"Ausbildung als\" يستلزم \"als\".",
  "30": "\"hätte\" فعل مختلف (haben) لا يناسب هذا التعبير، و\"wäre\" صيغة Konjunktiv II من \"sein\" -- لكن التعبير الاصطلاحي الثابت \"wie dem auch sei\" يستخدم تحديداً صيغة Konjunktiv I: sei.",
};

const RAHIM_WRONG = {
  "21": "\"für\" لا يقترن بالفعل \"sich freuen\" هنا، و\"wegen\" (بسبب) حرف جر سببي -- التعبير الثابت \"sich freuen über etwas\" يستلزم \"über\".",
  "22": "\"man\" (المرء) ضمير عام -- لا يطابق فاعلاً غائباً مفرداً (die Wohnung)، و\"uns\" (نحن) ضمير جمعي للمتكلمين -- لا يناسب الفعل الانعكاسي \"sich befinden\" بفاعل الشقة نفسها.",
  "23": "\"auf der\" و\"für den\" حرفا جر لا يناسبان وصف \"منظر مُشاهَد من\" الشرفة -- هذا يستلزم \"von dem\" (من).",
  "24": "\"wurden\" ماضٍ بسيط -- لا يناسب وصف قدرة حالية عامة، و\"würden\" صيغة حال افتراضي -- لا سرد واقعي؛ الفعل الوجهي \"kann\" + مبني للمجهول مضارع يستلزم مصدر \"werden\".",
  "25": "\"an\" و\"in\" لا يقترنان بالفعل الانعكاسي \"sich beschäftigen\" بهذا المعنى -- التعبير الثابت \"sich beschäftigen mit\" (ينشغل بـ) يستلزم \"mit\".",
  "26": "\"anstatt\" (بدلاً من) تصف استبدالاً -- معنى مختلف، و\"sondern\" تحتاج نفياً سابقاً مباشراً غير موجود هنا -- التباين المتزامن بين نشاطين مختلفين يستلزم \"während\".",
  "27": "\"entweder\" تحتاج \"oder\" وتفيد اختياراً حصرياً -- معنى مختلف، و\"sowohl\" تقترن بـ\"als auch\" وتفيد الجمع -- لا تمهيداً لتباين لاحق كما تفعل \"zwar\".",
  "28": "\"denen\" حالة جر جمعية -- لا تطابق المرجع المفرد \"einen Mitbewohner\"، و\"seinen\" ضمير ملكية عادي -- لا يعمل ضميراً موصولاً؛ وصف ملكية عبر جملة نسبية يستلزم \"dessen\".",
  "29": "\"deswegen\" (لذلك) ظرف نتيجة مستقل -- لا يصوغ جملة غرض، و\"indem\" (من خلال) يصف وسيلة/طريقة -- معنى مختلف عن الهدف الذي يعبّر عنه \"damit\".",
  "30": "\"gewusst habe\" ماضٍ تام إخباري -- لا شرطاً غير حقيقي، و\"wüsste\" صيغة حال افتراضي حاضرة -- لا تناسب شرطاً غير حقيقي في الماضي، الذي يستلزم Konjunktiv II الماضي: gewusst hätte.",
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
  await deepenExercise("Mitarbeiterinnen und Mitarbeiter ( Neu )", MITARBEITER_WRONG);
  await deepenExercise("Paola", PAOLA_WRONG);
  await deepenExercise("Rahim", RAHIM_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

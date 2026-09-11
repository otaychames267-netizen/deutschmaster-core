/**
 * Deepen T1 #14: "Liebe Anna ( Original )", "Liebe Anna (معدل)", "Liebe
 * Clara" -- same distractor-reasoning pattern. "Liebe Clara" is a
 * template-twin of "Julia" (batch deepen-t1-10) -- reused that reasoning
 * for the identical gaps (21, 24, 25, 27, 28, 30) and wrote fresh
 * reasoning for the gaps with different distractor sets (22, 23, 26, 29).
 *
 * Usage: node scripts/learning-aids/deepen-t1-14.mjs [--apply]
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

const ANNA_ORIGINAL_WRONG = {
  "21": "\"vergehend\" ليست صيغة فاعل ثانٍ صحيحة لتركيب Perfekt هنا، و\"vergingen\" صيغة ماضٍ بسيط جمعية -- لا تناسب الفاعل المفرد \"Jahr\" مع الفعل المساعد \"ist\".",
  "22": "\"gleich\" و\"sofort\" (فوراً) يصفان سرعة حدوث فعل، لا مفاجأة وقوعه -- المرض غير المتوقع يستلزم ظرف المفاجأة \"plötzlich\".",
  "23": "\"als\" تصف حدثاً ماضياً وحيداً -- لا نقطة عودة مستقبلية، و\"da\" (بما أنّ) سببية -- معنى مختلف تماماً عن الزمن المقصود هنا.",
  "24": "\"sondern\" تحتاج نفياً سابقاً مباشراً غير موجود هنا، و\"sowohl\" تقترن بـ\"als auch\" -- تركيب تناسق مختلف تماماً؛ التناقض المعتدل هنا يستلزم الجزء الأول من \"zwar...aber\".",
  "25": "\"wollte\" (أردتُ) ماضي الرغبة -- لا خطة مستقبلية، و\"würde\" صيغة حال افتراضي -- لا تناسب خطة مستقبلية مؤكدة كما يفعل الفعل المساعد \"werde\" للمستقبل.",
  "26": "\"Damit\" ترتبط بجمل الغرض، و\"Davon\" ترتبط بأفعال أخرى مثل \"abhängen von\" -- التعبير الثابت \"sich freuen auf\" يستلزم \"darauf\".",
  "27": "\"darüber\" ترتبط بأفعال أخرى مثل \"sprechen über\"، و\"dazu\" ترتبط بتعابير أخرى -- التعبير الثابت \"halten von\" (يرى رأياً في) يستلزم \"davon\".",
  "28": "\"an\" و\"in\" لا يكوّنان التعبير الاصطلاحي الثابت \"auf der Nase herumtanzen\" (يتلاعب بشخص/لا يطيعه) -- هذا التعبير يستلزم \"auf\" حصراً.",
  "29": "\"beschäftigen lassen\" يعني تفويض المهمة لشخص آخر -- معنى مختلف، و\"beschäftigt zu sein\" صيغة تصف حالة المتكلم نفسه (مشغول) لا فعل إشغال الأطفال؛ التركيب \"es ist nicht leicht, zu...\" يستلزم المصدر النشط: zu beschäftigen.",
  "30": "\"zurechtkamst\" ماضٍ بسيط -- لا يصف طريقة تدبر مستمرة حالياً، و\"zurechtzukommen\" مصدر بـ\"zu\" -- لا يصلح فعلاً نهائياً مصرَّفاً في نهاية سؤال غير مباشر؛ هذا يستلزم فعلاً مضارعاً مطابقاً للفاعل \"du\": zurechtkommst.",
};

const ANNA_MOD_WRONG = {
  "21": "\"das\" حالة محايدة -- لا تناسب الاسم المذكر \"Brief\"، و\"der\" حالة رفع مذكرة -- بينما الفعل المتعدي \"erhalten\" يستلزم حالة النصب: den.",
  "22": "\"bist\" فعل مساعد خاطئ (الفعل المتعدي verbringen يستلزم haben لا sein)، و\"warst\" صيغة ماضٍ بسيط -- لا تتوافق مع بنية الجملة التي تستلزم الماضي التام (hast...verbracht).",
  "23": "\"mir\" حالة جر -- بينما الفعل المتعدي \"fragen\" يستلزم مفعولاً به مباشراً بالنصب، و\"sich\" ضمير انعكاسي للغائب -- لا يطابق المتكلمة \"ich\" التي سُئلت.",
  "24": "\"obwohl\" أداة ربط تابعة تستلزم فعلاً في النهاية -- غير موجود في الجملة التالية ذات الترتيب الطبيعي، و\"sondern\" تحتاج نفياً سابقاً مباشراً غير موجود هنا.",
  "25": "\"erst\" (لم يحدث إلا) توحي بتأخر، و\"schon\" (بالفعل) توحي بتبكير مفاجئ -- لا تناسبان طمأنة \"لا نزال بما يكفي من الشباب\" كما تفعل \"noch\".",
  "26": "\"bearbeitet\" (يعالج/يحرر) معنى مختلف عن \"يُشغّل جهازاً\"، و\"bewirkt\" (يُحدث تأثيراً) معنى مختلف تماماً -- التعبير الثابت \"einen Computer bedienen\" يستلزم \"bedient\".",
  "27": "\"lernen\" مصدر مجرد ناقص \"zu\" الإلزامية بعد \"Angst haben\"، و\"lernen müssen\" يضيف فعلاً وجهياً زائداً يغيّر المعنى إلى \"الاضطرار للتعلم\" لا مجرد \"التعلم\".",
  "28": "\"fortsetzen\" (يواصل) معنى مختلف تماماً، و\"übersetzen\" (يترجم) معنى غير ذي صلة إطلاقاً -- استخدام معرفة عملياً يستلزم \"einsetzen\".",
  "29": "\"Ob\" (هل) تصوغ سؤالاً غير مباشر، و\"Wann\" (متى) أداة استفهام زمنية -- لا تكوّنان التعبير الشرطي الثابت \"wenn du mich fragst\" (إذا سألتني) الذي يستلزم \"Wenn\".",
  "30": "\"also\" (إذن) أداة نتيجة -- لا توضيحاً لسبب التوقف، و\"kaum\" (بالكاد) معنى مختلف تماماً -- تقديم توضيح/سبب لعبارة التوقف يستلزم \"nämlich\".",
};

const CLARA_WRONG = {
  "21": "\"miteinander\" (معاً) توحي بفعل مشترك، و\"zueinander\" (لبعضهما) تصف موقفاً/اتجاهاً -- لا تبادل أخبار عن بعد كما يفيده التعبير الثابت \"voneinander hören\".",
  "22": "\"über\" (حول/فوق) حرف جر مختلف، و\"in\" (في) يصف التواجد داخل مكان واحد -- لا التنقل عبر عدة أماكن كما تفعل \"durch\"؛ التعبير الثابت \"eine Reise durch ein Gebiet\" يستلزم \"durch\".",
  "23": "\"Als\" (عندما) ظرف زمني، و\"Wenn\" (إذا/عندما) أداة شرطية -- لا يكوّنان التعبير التمهيدي الثابت \"wie du weißt\" (كما تعلمين) الذي يستلزم \"Wie\".",
  "24": "\"wurde\" فعل مساعد للمبني للمجهول يحتاج صيغة فاعل ثانٍ -- غير موجودة هنا، و\"würde\" صيغة حال افتراضي -- لا تصف حقيقة ماضية فعلية كما يفعل \"war\".",
  "25": "\"er\" ضمير غائب مذكر لا مرجع محدد له، و\"man\" (المرء) ضمير عام مختلف -- التركيب غير الشخصي لوصف حالة عامة (الهدوء) يستلزم الفاعل الشكلي \"es\".",
  "26": "\"ersten\" نهاية حالة الجر/النصب -- لا تناسب حالة الرفع المؤنثة بعد \"meine\"، و\"erst\" (لم يحدث إلا) ظرف مختلف تماماً بمعنى \"ليس قبل\" -- ليس صفة ترتيبية بمعنى \"الأولى\".",
  "27": "\"darüber\" ترتبط بأفعال أخرى مثل \"sprechen über\"، و\"davon\" ترتبط بـ\"abhängen von\" أو \"erzählen von\" -- التعبير الثابت \"denken an etwas\" يستلزم الضمير الظرفي \"daran\".",
  "28": "\"kann\" (يستطيع) يعبّر عن قدرة، لا إلزاماً، و\"mag\" (يحب/ربما) يعبّر عن تفضيل أو احتمال ضعيف -- لا يناسبان العودة الحتمية غير المرغوبة التي يصفها \"muss\".",
  "29": "\"bei\" و\"in\" حرفا جر -- لا يناسبان هذا التركيب الذي يحتاج ضميراً مجرداً بحالة الجر مباشرة (لا حرف جر)؛ التعبير الثابت \"jemandem kommt ein Gedanke\" يستلزم \"mir\".",
  "30": "\"bräuchte\" (لاحتجتُ) يعبّر عن حاجة لا إمكانية، و\"dürfte\" يحمل دلالة إذن/احتمال مختلفة -- لا يناسب التأمل المتردد في فكرة مستقبلية عابرة كما يفعل \"könnte\".",
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
  await deepenExercise("Liebe Anna ( Original )", ANNA_ORIGINAL_WRONG);
  await deepenExercise("Liebe Anna (معدل)", ANNA_MOD_WRONG);
  await deepenExercise("Liebe Clara", CLARA_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

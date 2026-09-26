/**
 * Deepen T1 #4: "Eltern und Erziehungsberechtigte", "Familie Geissler
 * oder Dippold", "Ferdinand, Phillip, Christopher ( Original )" -- same
 * pattern: adding genuine distractor reasoning to explanation_wrong.
 *
 * Usage: node scripts/learning-aids/deepen-t1-04.mjs [--apply]
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

const ELTERN_WRONG = {
  "21": "\"mithilfe\" (بمساعدة) تعني الاستعانة بأداة أو وسيلة، لا مناسبة، و\"zwecks\" (لغرض) تعني هدفاً مقصوداً -- لا مناسبة يُحتفى بها أو يُشار إليها.",
  "22": "\"deren\" ضمير وصل بحالة الملكية (لِمن) لا حالة الجر، و\"dessen\" أيضاً حالة ملكية مفردة -- كلاهما لا يناسب حالة الجر الجمعية التي يستلزمها الفعل \"sich widmen\".",
  "23": "\"davon\" ترتبط بأفعال أخرى مثل \"sprechen von\"، و\"darüber\" ترتبط بـ\"sprechen über\" -- التعبير الثابت \"es geht um\" يستلزم \"darum\" حصراً.",
  "24": "\"damit\" تُستخدم فقط عند اختلاف فاعلي الجملتين -- وهنا الفاعل واحد (man)، و\"dass\" تصوغ جملة خبرية لا جملة غرض بصيغة المصدر.",
  "25": "\"herz\" صيغة حالة الرفع بلا نهاية -- لا تناسب حالة الجر التي يستلزمها التعبير الثابت \"am Herzen liegen\"، و\"herze\" ليست صيغة ألمانية صحيحة إطلاقاً.",
  "26": "\"durch\" (عبر) تفيد وسيلة سببية عامة، و\"mit\" (بـ) عامة جداً -- كلاهما لا يحمل دقة \"بالاستناد إلى مثال محدد\" التي تحملها \"anhand\".",
  "27": "\"schaffen\" مصدر لا يناسب الفعل المساعد \"werden\" الذي يستلزم صيغة الفاعل الثاني، و\"geschafft\" هي صيغة الفاعل الثاني لفعل \"schaffen\" بمعنى \"ينجز/يتمكن من\" -- بينما \"schaffen\" بمعنى \"يخلق/ينشئ\" له صيغة فاعل ثانٍ شاذة مختلفة: geschaffen.",
  "28": "\"größe\" ليست صيغة تصريف صفة صحيحة هنا، و\"größen\" نهاية توحي بالجمع -- بينما \"von größter Bedeutung\" تعبير ثابت بصيغة المفرد المؤنث فقط.",
  "29": "\"lassen\" صيغة مصدر/جمع لا تطابق الفاعل المفرد \"Derartiges\"، و\"lasst\" صيغة أمر لمخاطبين (ihr) -- لا مكان لصيغة الأمر في جملة خبرية كهذه.",
  "30": "\"nämlich\" (أي/يعني) أداة توضيح لا علاقة لها بالزمن، و\"trotzdem\" (رغم ذلك) ظرف تنازل مستقل -- لا يصلح حرف جر يسبق اسماً بحالة الملكية كما يفعل \"während\".",
};

const GEISSLER_WRONG = {
  "21": "\"wegen\" (بسبب) حرف جر سببي لا يقترن بـ\"Antwort\"، و\"von\" (من) لا يكوّن التلازم الثابت \"Antwort auf\" -- هذا التعبير يقترن حصراً بـ\"auf\".",
  "22": "\"zu\" لا يكوّن الفعل المنفصل \"abschließen\"، و\"aus\" يوحي بفعل مختلف تماماً \"ausschließen\" (يستبعد) -- معنى خاطئ كلياً هنا.",
  "23": "\"kaum\" (بالكاد) يعني عكس التحسن تقريباً -- معنى سلبي، و\"fast\" (تقريباً) يوحي بعدم تحقق الهدف فعلياً -- كلاهما لا يناسب نية التحسين الإيجابية الواضحة هنا.",
  "24": "\"unterrichten\" (يُدرّس) اتجاه معاكس -- هي طالبة لا معلمة، و\"lernen\" (يتعلّم) قريب المعنى لكنه لا يكوّن التلازم الثابت مع \"Kurs\" -- \"einen Kurs machen\" هو التعبير الصحيح للالتحاق بدورة.",
  "25": "\"über\" تناسب سؤالاً عن موضوع (Frage über etwas)، لا سؤالاً موجهاً لشخص، و\"für\" لا تقترن بـ\"Frage\" بهذا المعنى إطلاقاً -- التعبير الثابت \"eine Frage an jemanden\" يستلزم \"an\".",
  "26": "\"irgendwo\" (في مكان ما) ظرف مكان -- لا يناسب \"bei\" + شخص، و\"irgendetwas\" (شيء ما) اسم لشيء -- لا يصلح بعد \"bei\" لوصف الشخص الذي تستعير منه.",
  "27": "\"falls\" (في حال) أداة شرطية -- لا تناسب التعبير عن الشكر المباشر، و\"dafür\" ضمير ظرفي -- لا يصلح لإدخال جملة ثانوية بعد \"danke\".",
  "28": "\"noch\" (لا يزال/بعد) يعني أن الحجز لم يتم بعد -- عكس المعنى المقصود، و\"bevor\" (قبل أن) أداة ربط زمنية -- لا تصلح ظرفاً بسيطاً هنا.",
  "29": "\"zu\" لا يكوّن الفعل المنفصل \"vorschlagen\"، و\"nach\" يوحي بفعل مختلف تماماً \"nachschlagen\" (يبحث/يراجع في قاموس) -- معنى خاطئ كلياً.",
  "30": "\"weniger\" (أقل) عكس المعنى تماماً (تريد أن يروا أكثر لا أقل)، و\"viel\" (كثير) ليست صيغة مقارنة -- لا تناسب تركيب \"ein bisschen + مقارنة\" الذي يستلزم \"mehr\".",
};

const FERDINAND_WRONG = {
  "21": "\"anstatt...zu\" تعني \"بدلاً من فعل كذا\" -- معنى معاكس (هي تعمل فعلاً، لا تتجنب العمل)، و\"ohne...zu\" تعني \"دون فعل كذا\" -- يناقض حقيقة أنها تعمل لتغطية الإيجار.",
  "22": "\"dass\" تصوغ جملة خبرية مؤكدة -- لا تناسب السؤال الضمني عن \"الكيفية\"، و\"während\" (بينما/أثناء) ظرف/أداة ربط زمنية -- معنى مختلف تماماً.",
  "23": "\"denn\" (لأن) تصوغ رابطاً سببياً يتعارض مع \"andererseits\" (من ناحية أخرى) التي تصوغ تبايناً أصلاً، و\"und\" (و) حيادية جداً -- لا تعكس التضاد المقصود.",
  "24": "\"bestimmt\" (بالتأكيد) يعبّر عن يقين بحدوث أمر، لا شدة رغبة، و\"völlig\" (كلياً) ظرف تكثيف لكنه لا يقترن بالفعل \"wollen\" بهذا التلازم الثابت.",
  "25": "\"dich\" ضمير المخاطب (أنت) لا يطابق الفاعل \"ich\"، و\"sich\" ضمير انعكاسي للغائب -- لا يناسب فاعلاً بصيغة المتكلم \"ich\" أيضاً.",
  "26": "\"wenn\" توحي بتكرار أو شرط عام -- بينما كونهما زوجين في فترة المدرسة حدث ماضٍ محدد يستلزم \"als\"، و\"wie\" (كيف/كـ) أداة مقارنة لا زمنية.",
  "27": "\"vergangenen\" (الماضية) عكس المعنى تماماً -- السؤال عن خطط مستقبلية لا ماضية، و\"baldigen\" (وشيكة) صحيحة نحوياً لكنها لا تقترن بـ\"Wochenenden\" بنفس شيوع \"kommenden\".",
  "28": "\"danach\" ترتبط بأفعال أخرى مثل \"fragen danach\"، و\"darüber\" ترتبط بـ\"sich freuen über\" -- التعبير الثابت \"Lust zu etwas haben\" يستلزم \"dazu\".",
  "29": "\"aber\" أداة تضاد عامة لا تقترن تحديداً بـ\"nicht nur\"، و\"oder\" (أو) تصوغ بديلاً -- لا تناسب تركيب \"nicht nur... sondern auch\" الإضافي.",
  "30": "\"gegen\" (ضد) معنى معاكس تماماً، و\"ohne\" (بدون) لا يناسب سياق اقتراح شيء مناسب لشخص إطلاقاً.",
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
  await deepenExercise("Eltern und Erziehungsberechtigte", ELTERN_WRONG);
  await deepenExercise("Familie Geissler oder Dippold", GEISSLER_WRONG);
  await deepenExercise("Ferdinand, Phillip, Christopher ( Original )", FERDINAND_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

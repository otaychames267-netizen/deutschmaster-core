/**
 * Deepen T1 #10: "Judith oder Lina", "Julia", "Julian" -- same
 * distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-10.mjs [--apply]
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

const JUDITH_WRONG = {
  "21": "\"Zuversichtlich\" (بثقة) ظرف حالة -- لا يعبّر عن أمل بأمر غير مؤكد، و\"Möglichst\" (قدر الإمكان) يحتاج كلمة أخرى ملحقة به -- لا يقف مستقلاً هنا.",
  "22": "\"vermutlich\" (على الأرجح) يفيد تخميناً -- لا يناسب خطة فريق مؤكدة، و\"bestimmt\" (بالتأكيد) ظرف يقين -- لا يقدّم توضيحاً/تفسيراً كما تفعل \"nämlich\".",
  "23": "\"fast\" و\"beinahe\" (تقريباً) تفيدان عدم الدقة -- بينما موعد الحفل محدد بيقين (بعد غد فعلاً)، وهذا يستلزم ظرف التأكيد \"schon\".",
  "24": "\"dafür\" ترتبط بأفعال أخرى مثل \"sich interessieren für\"، و\"dadurch\" (من خلال ذلك) تصف وسيلة/سبباً -- التعبير الثابت \"einverstanden sein mit\" يستلزم الضمير الظرفي \"damit\".",
  "25": "\"Wenn\" توحي بتكرار أو شرط عام -- بينما \"das letzte Mal\" يصف مناسبة ماضية وحيدة محددة، و\"Wann\" أداة استفهام -- لا تصلح لجملة خبرية هنا.",
  "26": "\"zueinander\" (لبعضهما) تصف اتجاهاً/موقفاً متبادلاً، و\"voneinander\" (عن بعضهما) تصف انفصالاً -- لا نشاطاً مشتركاً كما تفعل \"miteinander\".",
  "27": "\"vor Kurzem\" و\"kürzlich\" (مؤخراً) ظرفا زمن ماضٍ -- بينما الجملة تصف نقطة زمنية قريبة من حدث مستقبلي (الحفل)، وهذا يستلزم \"kurz vor\" (قبيل).",
  "28": "\"insofern\" (بقدر ما) يفيد ارتباطاً محدوداً/مشروطاً -- لا نتيجة مباشرة، و\"deshalb\" ظرف نتيجة مستقل يبدأ عادة جملة جديدة -- بينما \"weshalb\" يربط داخل الجملة نفسها.",
  "29": "\"sämtlich\" (كل/جميع) أداة كمّ لا تكثيف، و\"erschöpfend\" (شامل/وافٍ) تصف شمولية التفاصيل -- لا تكثيف صفة \"جديدة\" كما تفعل \"vollkommen\" (تماماً).",
  "30": "\"passenden\" (مناسب) معنى مختلف -- لا يكوّن التعبير الختامي الثابت، و\"bequemen\" (مريح) يصف الراحة الجسدية عادة (كمقعد مريح) -- لا يقترن بـ\"Tag\" في تمنيات كهذه؛ الصحيح \"einen angenehmen Tag\" حصراً.",
};

const JULIA_WRONG = {
  "21": "\"miteinander\" (معاً) توحي بفعل مشترك، و\"zueinander\" (لبعضهما) تصف موقفاً/اتجاهاً -- لا تبادل أخبار عن بعد كما يفيده التعبير الثابت \"voneinander hören\".",
  "22": "\"über\" و\"von\" لا يقترنان بـ\"Rundreise\" بهذا المعنى -- التعبير الثابت \"eine Reise durch ein Gebiet\" (رحلة عبر منطقة) يستلزم \"durch\" حصراً.",
  "23": "\"Als\" (عندما) ظرف زمني، و\"weil\" (لأن) سببية -- لا يكوّنان التعبير التمهيدي الثابت \"wie du weißt\" (كما تعلمين) الذي يستلزم \"wie\".",
  "24": "\"wurde\" فعل مساعد للمبني للمجهول يحتاج صيغة فاعل ثانٍ -- غير موجودة هنا، و\"würde\" صيغة حال افتراضي -- لا تصف حقيقة ماضية فعلية كما يفعل \"war\".",
  "25": "\"er\" ضمير غائب مذكر لا مرجع محدد له، و\"man\" (المرء) ضمير عام مختلف -- التركيب غير الشخصي لوصف حالة عامة (الهدوء) يستلزم الفاعل الشكلي \"es\".",
  "26": "\"ersten\" نهاية تناسب حالة الجر/النصب المذكرة أو الجمع، و\"erster\" نهاية حالة الرفع المذكرة القوية -- بينما \"Station\" اسم مؤنث بعد ضمير ملكية \"meine\" يستلزم نهاية \"-e\".",
  "27": "\"darüber\" ترتبط بأفعال أخرى مثل \"sprechen über\"، و\"davon\" ترتبط بـ\"abhängen von\" أو \"erzählen von\" -- التعبير الثابت \"denken an etwas\" يستلزم الضمير الظرفي \"daran\".",
  "28": "\"kann\" (يستطيع) يعبّر عن قدرة، لا إلزاماً، و\"mag\" (يحب/ربما) يعبّر عن تفضيل أو احتمال ضعيف -- لا يناسبان العودة الحتمية غير المرغوبة التي يصفها \"muss\".",
  "29": "\"ich\" حالة رفع -- لكن فاعل الجملة هنا هو \"der Gedanke\" (الفكرة) لا المتكلمة، و\"mich\" حالة نصب -- التعبير الثابت \"jemandem kommt ein Gedanke\" (تخطر لشخص فكرة) يستلزم حالة الجر: mir.",
  "30": "\"bräuchte\" (لاحتجتُ) يعبّر عن حاجة لا إمكانية، و\"dürfte\" يحمل دلالة إذن/احتمال مختلفة -- لا يناسب التأمل المتردد في فكرة مستقبلية عابرة كما يفعل \"könnte\".",
};

const JULIAN_WRONG = {
  "21": "\"können\" مصدر/صيغة جمع -- لا تطابق التصريف الماضي المطلوب بصيغة \"du\" (تماشياً مع hattest)، و\"dürfen\" فعل مختلف تماماً (يُسمح له) -- معنى الإذن لا القدرة.",
  "22": "\"werden\" مصدر/صيغة جمع -- لا تعبّر عن رغبة افتراضية، و\"wäre\" صيغة حال افتراضي لفعل \"sein\" (يكون) -- فعل مختلف لا يقترن بـ\"fahren\" هنا.",
  "23": "\"als\" و\"von\" لا يقترنان بـ\"Zeit haben\" بهذا المعنى -- التعبير الثابت \"Zeit für etwas haben\" يستلزم \"für\" حصراً.",
  "24": "\"mehr\" صيغة مقارنة -- لا تناسب هذا الموضع، و\"viel\" بلا تصريف -- بينما حرف الجر \"nach\" (حالة الجر) قبل اسم جمع \"Jahren\" يستلزم نهاية \"-en\" على الصفة: vielen.",
  "25": "\"gefällt\" تصريف مفرد -- لا يطابق الفاعل الجمعي \"Fachwerkhäuser\"، و\"mögen\" فعل مختلف تماماً (يحب) يحتاج بنية جملة أخرى (ich mag) لا \"mir gefallen...\".",
  "26": "\"als\" معنى مختلف تماماً هنا، و\"wenn\" أداة شرطية تستلزم فعلاً في النهاية -- بينما الترتيب الطبيعي بعد الفجوة (dort gibt es) يؤكد أن المطلوب أداة عطف تنسيقية: denn.",
  "27": "\"außerdem\" (علاوة على ذلك) أداة إضافة -- لا تصوغ عرضاً مشروطاً، و\"da\" (بما أنّ) سببية -- معنى مختلف عن الشرط الذي يصوغه \"wenn\" هنا.",
  "28": "\"wenn\" تحتاج جملة شرطية كاملة تالية، لا تقف ظرفاً مستقلاً بادئاً جملة جديدة، و\"denn\" (لأن) سببية -- معنى مختلف عن الظرف الرابط \"dann\" (عندئذ) هنا.",
  "29": "\"entladener\" (من entladen) يصف تفريغ شحنة/مركبة -- لا صناديق منزلية، و\"entleerter\" (أُفرِغ) قريب المعنى لكنه ليس التعبير الثابت المستخدم مع صناديق الانتقال، الذي يستلزم \"ausräumen → ausgeräumt\".",
  "30": "\"so dass\" تصوغ نتيجة -- بينما الجملة هنا تفسر سبب الحظ (الشقة واسعة ومركزية)، و\"zu\" ليست أداة ربط أصلاً -- لا تصلح هنا نحوياً.",
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
  await deepenExercise("Judith oder Lina", JUDITH_WRONG);
  await deepenExercise("Julia", JULIA_WRONG);
  await deepenExercise("Julian", JULIAN_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

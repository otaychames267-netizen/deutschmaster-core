/**
 * Deepen T1 #16: "Liebe Agnieszka", "Lina", "Lina und Florian" -- same
 * distractor-reasoning pattern. Note: "Liebe Agnieszka" was one of the
 * exercises hand-deepened earliest in this session (per the prior
 * summary), but the heuristic scan showed it still had
 * explanation_wrong === explanation_correct for every gap -- turns out
 * only its item_type/keyword/grammar_example were finalized earlier, not
 * the distractor reasoning. Filling that in now.
 *
 * Usage: node scripts/learning-aids/deepen-t1-16.mjs [--apply]
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

const AGNIESZKA_WRONG = {
  "21": "\"hin\" (نحو/باتجاه) تصف اتجاهاً بعيداً عن المتكلم -- معنى مختلف، و\"vorbei\" (انتهى/مضى) تصف انتهاء شيء -- لا التعبير الثابت \"es ist...her, dass\" (مضى وقت منذ أن) الذي يستلزم \"her\".",
  "22": "\"gekränkt\" فاعل ثانٍ لفعل مختلف تماماً \"kränken\" (يجرح مشاعر) -- معنى مختلف كلياً، و\"kränklich\" صفة تصف حالة صحية مزمنة -- لا مرضاً مفاجئاً حديثاً.",
  "23": "\"als\" تصف حدثاً ماضياً وحيداً -- لا نقطة عودة مستقبلية متوقعة، و\"da\" (بما أنّ) سببية -- معنى مختلف تماماً.",
  "24": "\"nicht nur... sondern\" أداة ربط إضافية -- لا تناسب التنازل هنا، و\"teils... teils\" (جزئياً...جزئياً) تصف تجزئة -- لا تناقضاً معتدلاً بين صفة إيجابية وأخرى سلبية لنفس الشخص.",
  "25": "\"wollte\" (أردتُ) ماضي الرغبة -- لا خطة مستقبلية، و\"würde\" صيغة حال افتراضي -- لا تناسب خطة مستقبلية مؤكدة كما يفعل الفعل المساعد \"werde\" للمستقبل.",
  "26": "\"Dafür\" ترتبط بتعابير أخرى، و\"Danach\" (بعد ذلك) ظرف زمني -- لا يقترن بالفعل \"sich freuen auf\"؛ هذا يستلزم \"darauf\".",
  "27": "\"darüber\" ترتبط بأفعال أخرى مثل \"sprechen über\"، و\"dazu\" ترتبط بتعابير أخرى -- التعبير الثابت \"was hältst du von...\" (ما رأيك في) يستلزم \"davon\".",
  "28": "\"dich\" حالة نصب -- بينما التعبير الثابت \"jemandem auf der Nase herumtanzen\" يستلزم حالة الجر للشخص المتأثر، و\"sich\" ضمير انعكاسي للغائب -- لا يطابق المخاطَبة.",
  "29": "\"beschäftigen lassen\" يعني تفويض المهمة لشخص آخر -- معنى مختلف، و\"beschäftigt zu sein\" يصف حالة المتكلم نفسه (مشغول) لا فعل إشغال الأطفال؛ التركيب \"Es ist (nicht) leicht, zu...\" يستلزم المصدر النشط: zu beschäftigen.",
  "30": "\"weshalb\" (لأي سبب) تسأل عن السبب -- لا الطريقة، و\"wo\" (أين) ظرف مكاني -- معنى مختلف تماماً؛ التعبير الثابت \"einen Weg finden, wie...\" يستلزم \"wie\".",
};

const LINA_WRONG = {
  "21": "\"an\" و\"von\" لا يقترنان بالفعل \"suchen\" بهذا المعنى -- التعبير الثابت \"suchen nach\" (يبحث عن) يستلزم \"nach\".",
  "22": "\"danach\" ترتبط بأفعال أخرى مثل \"fragen danach\"، و\"darüber\" ترتبط بـ\"sprechen über\" -- التعبير الثابت \"denken an\" يستلزم \"daran\".",
  "23": "\"wäre\" و\"würde\" صيغتا حال افتراضي -- لا تصفان حقيقة ماضية واقعية (حلماً كان قائماً فعلاً) كما يفعل \"war\".",
  "24": "\"Andererseits\" تحتاج \"einerseits\" سابقة لها -- تركيب مختلف، و\"weder\" تحتاج \"noch\" وتفيد النفي -- لا تناسب التناقض المعتدل الإيجابي/السلبي الذي يستلزم \"zwar...aber\".",
  "25": "\"mochte\" (أحببتُ) فعل مختلف يعبّر عن التفضيل، و\"wollte\" (أردتُ) يعبّر عن رغبة شخصية -- لا إلزاماً خارجياً فرضته ظروف سوق العمل كما يفيده \"musste\".",
  "26": "\"verschiedene\" نهاية لا تطابق التصريف المطلوب هنا بعد \"durch\" في هذا السياق، و\"verschiedener\" نهاية حالة الملكية أو الرفع المذكرة -- لا تناسب الجمع بحالة النصب المطلوبة: verschiedenen.",
  "27": "\"hatte\" فعل مختلف تماماً (يملك) -- لا علاقة له بالبحث، و\"war\" فعل مساعد لحالة قائمة (Zustandspassiv) -- بينما المقصود عملية بحث جارية في الماضي، وهذا يستلزم المبني للمجهول الإجرائي: wurde.",
  "28": "\"keinen\" حالة نصب مذكرة أو جر جمعية -- لا تطابق الاسم المؤنث الجمعي \"Chancen\"، و\"keiner\" حالة جر مفردة مؤنثة أو رفع مذكرة -- كلاهما لا يناسب الجمع المنصوب المطلوب: keine.",
  "29": "\"in\" و\"mit\" لا يقترنان بالاسم \"Einladung\" بهذا المعنى -- التعبير الثابت \"eine Einladung zu etwas\" (دعوة إلى) يستلزم \"zu\".",
  "30": "\"welches\" ضمير وصل يحتاج مرجعاً محدد الجنس -- لا يناسب \"das Einzige\" (صيغة خاصة)، و\"wo\" (أين) ظرف مكاني -- معنى مختلف تماماً؛ الأسماء مثل \"das Einzige\" تستلزم ضمير الوصل الخاص \"was\".",
};

const LINA_FLORIAN_WRONG = {
  "21": "\"dürft\" (يُسمح لكم) يفيد إذناً، و\"könnt\" (تستطيعون) يفيد قدرة -- لا يناسبان النبرة الملحة للدعوة (أخيراً) التي يعبّر عنها فعل التوصية \"sollt\".",
  "22": "\"an\" و\"in\" لا يقترنان بالفعل \"einladen\" بهذا المعنى الزمني (دعوة من أجل فترة) -- التعبير الثابت \"einladen für\" يستلزم \"für\".",
  "23": "\"unter\" (تحت/بين) معنى مختلف تماماً، و\"zu\" (إلى) تصف اتجاهاً لا مكان إقامة ساكناً -- التعبير الثابت \"wohnen bei jemandem\" يستلزم \"bei\".",
  "24": "\"einige\" صيغة جمع -- لا تناسب الضمير المستقل المفرد المقصود هنا (بمعنى \"أشياء عدة\")، و\"einigen\" حالة جر جمعية -- كلاهما لا يكوّن التعبير الثابت \"einiges zu bieten haben\" الذي يستلزم \"einiges\".",
  "25": "\"dem\" حالة جر -- بينما فعل الحركة \"steigen auf\" يستلزم حالة النصب، و\"der\" حالة رفع مذكرة أو جر مؤنثة -- بينما \"Turm\" اسم مذكر بحالة النصب يستلزم \"den\".",
  "26": "\"ist\" تصريف مفرد -- لا يطابق الفاعل المركب الجمعي (المكتبة والغرفة معاً)، و\"waren\" ماضٍ بسيط -- لا يصف إمكانية حالية قائمة كما يفعل \"sind\".",
  "27": "\"wann\" (متى) أداة استفهام زمنية، و\"wie\" (كيف) أداة استفهام عن الكيفية -- لا تناسبان الإشارة لمكان جغرافي محدد (الخندق) كما يفعل \"wo\".",
  "28": "\"Daneben\" (بجانب ذلك) يصف إضافة جانبية، و\"Darin\" (بداخل ذلك) يصف التواجد داخل شيء -- لا مرافقة نشاط سابق (الجولة) كسياق لمعلومة تالية كما يفعل \"Dabei\".",
  "29": "\"dies\" صيغة مختصرة بلا تصريف حالة، و\"dieses\" حالة رفع/نصب محايدة -- بينما \"an\" الزمنية الساكنة تستلزم حالة الجر: diesem.",
  "30": "\"man\" (المرء) ضمير عام -- لا يطابق التعبير الاصطلاحي الثابت \"sich sehen lassen können\"، و\"sie\" (هي/هم) ضمير شخصي عادي -- لا يعمل ضميراً انعكاسياً مطابقاً للفاعل \"die Umgebung\".",
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
  await deepenExercise("Liebe Agnieszka", AGNIESZKA_WRONG);
  await deepenExercise("Lina", LINA_WRONG);
  await deepenExercise("Lina und Florian", LINA_FLORIAN_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

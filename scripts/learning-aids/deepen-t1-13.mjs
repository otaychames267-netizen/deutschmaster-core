/**
 * Deepen T1 #13: "Lara", "Laura", "Leon" -- same distractor-reasoning
 * pattern.
 *
 * Also fixes a real content bug in Leon gap 29: stored keyword/explanation
 * named "erst" as the answer, but the actual bolded evidence text
 * ("für die kommenden Wochenenden **noch** keine Pläne haben") and the
 * answer key (correct = "noch") both say "noch". Same mismatch pattern
 * as the Jutta and Karin fixes earlier in this session.
 *
 * Usage: node scripts/learning-aids/deepen-t1-13.mjs [--apply]
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

const LARA_WRONG = {
  "21": "\"dein\" حالة رفع/بلا تصريف -- لا تناسب حالة النصب المطلوبة بعد \"auf...antworten\"، و\"deine\" نهاية مؤنثة/جمعية -- بينما \"Brief\" اسم مذكر يستلزم \"deinen\".",
  "22": "\"denn\" أداة ربط تنسيقية لا تدفع الفعل للنهاية -- بينما هذه جملة ثانوية تابعة، و\"obwohl\" (رغم أنّ) تصوغ تناقضاً غير موجود هنا.",
  "23": "\"schon\" (بالفعل) توحي بتحقق أبكر من المتوقع، و\"weiterhin\" (باستمرار) تصف حالة/فعلاً مستمراً -- لا ذكرى لا تزال قائمة كما تفعل \"noch\".",
  "24": "\"Vor\" و\"Zu\" لا يقترنان بالتعبير الثابت \"für etwas wünschen\" (يتمنى من أجل شيء) -- هذا التعبير يستلزم \"Für\" حصراً.",
  "25": "\"neue\" حالة رفع/نصب -- لا تناسب حالة الجر، و\"neuer\" نهاية قوية -- بينما وجود ضمير الملكية \"seiner\" (حالة جر) يفرض التصريف الضعيف: neuen.",
  "26": "\"bloß\" أداة تلطيف لكن بنبرة تحذير/إلحاح مختلفة، و\"mal\" تُستخدم لتخفيف طلب أو اقتراح -- لا لتأكيد معرفة مشتركة مفترضة كما تفعل \"ja\".",
  "27": "\"Damit\" ترتبط بجمل الغرض، و\"Darüber\" ترتبط بأفعال أخرى مثل \"sprechen über\" -- التعبير الثابت \"stolz auf etwas\" (فخور بـ) يستلزم \"darauf\".",
  "28": "\"ist\" مضارع مباشر -- لا يصوغ أمنية افتراضية مهذبة، و\"würde\" فعل مساعد آخر يقترن بمصدر لا بصفة محمول كـ\"schön\" -- التعبير الثابت \"es wäre schön, wenn...\" يستلزم \"wäre\".",
  "29": "\"aufgrund\" و\"wegen\" (بسبب) حرفا جر سببيان -- يفيدان سبباً، بينما الجملة تصف تنازلاً (إيجاد وقت رغم الانشغال، لا بسببه) الذي يستلزم \"trotz\".",
  "30": "\"könnten\" صيغة حال افتراضي -- تكرار زائد مع سياق الطلب المباشر هنا، و\"konnten\" ماضٍ بسيط -- لا يناسب غرضاً حالياً؛ \"damit...können\" في طلب مباشر يستلزم المضارع: können.",
};

const LAURA_WRONG = {
  "21": "\"dem\" حالة جر مفردة -- لا تطابق الاسم الجمعي السابق \"Dinge\"، و\"deren\" ضمير وصل بحالة الملكية -- بينما حرف الجر \"von\" يستلزم حالة الجر الجمعية: denen.",
  "22": "\"man\" (المرء) ضمير عام -- لا يناسب التركيب غير الشخصي \"es war + صفة\" (كان الأمر...)، و\"-\" (بلا كلمة) مستحيل لأن الجملة تحتاج فاعلاً نحوياً.",
  "23": "\"darauf\" ترتبط بأفعال أخرى مثل \"warten auf\"، و\"dazu\" ترتبط بتعابير أخرى -- التعبير الثابت \"sich gewöhnen an\" (يتعود على) يستلزم \"daran\".",
  "24": "\"ein\" لا يحمل نهاية حالة النصب المذكرة، و\"einer\" حالة جر/ملكية مؤنثة -- بينما \"Pullover\" اسم مذكر بحالة النصب (مفعول به لـ\"haben\") يستلزم \"einen\".",
  "25": "\"musste\" صيغة ماضٍ إخباري مباشر -- لا كلاماً منقولاً، و\"brauche\" فعل مختلف (يحتاج) لا \"يجب\" -- الكلام المنقول عن رأي الرئيس يستلزم Konjunktiv I لـ\"müssen\": müsse.",
  "26": "\"der Nähe\" وحدها ناقصة (بلا \"von\" لتحديد المكان)، و\"die Nähe\" حالة رفع/نصب -- بينما \"aus\" يستلزم حالة الجر؛ التعبير الكامل \"aus der Nähe von + مدينة\" يستلزم الخيار الكامل.",
  "27": "\"großem\" نهاية مفردة قوية -- لا تناسب الجمع، و\"dem großen\" أداة تعريف مفردة -- بينما \"Containerschiffen\" اسم جمع بحالة الجر يستلزم \"den großen\".",
  "28": "\"den Schiffen\" حالة جر -- بينما \"um\" يحكم حالة النصب، و\"die Schiffen\" مزيج غير صحيح (أداة تعريف حالة النصب مع نهاية اسم حالة الجر) -- الصحيح: die Schiffe.",
  "29": "\"eins\" ضمير عددي مستقل -- لا يعمل أداة تنكير هنا، و\"ein\" حالة رفع/نصب محايدة -- بينما \"in\" الساكنة تستلزم حالة الجر: einem.",
  "30": "\"wiederzusehen brauchen\" يستخدم فعلاً مختلفاً (brauchen) بتركيب مختلف تماماً، و\"müssen wiedersehen\" ترتيب خاطئ -- في الجملة الثانوية يأتي المصدر قبل الفعل الوجهي مباشرة: wiedersehen müssen.",
};

const LEON_WRONG = {
  "21": "\"ab\" (اعتباراً من) تصف نقطة بداية زمنية -- معنى مختلف، و\"von\" (من) لا تكوّن التعبير الثابت \"Grüße aus + مكان\" (تحيات من مكان) الذي يستلزم \"aus\".",
  "22": "\"wann\" (متى) أداة استفهام زمنية، و\"wie\" (كيف) أداة استفهام عن الكيفية -- لا تناسبان الإخبار عن أحداث (\"ما الذي جرى\") كما تفعل \"was\".",
  "23": "\"indem\" (من خلال) تصف وسيلة/طريقة -- معنى مختلف تماماً، و\"obwohl\" (رغم أنّ) تصوغ تناقضاً غير موجود -- الجملة تفسر سبباً مباشراً يستلزم \"da\".",
  "24": "\"ist\" مضارع بسيط -- لا يعبّر عن أمل مستقبلي، و\"würde\" صيغة حال افتراضي -- لا تناسب أملاً واقعياً مباشراً بالمستقبل؛ المبني للمجهول المستقبلي يستلزم \"wird\".",
  "25": "\"bin\" مضارع، و\"war\" ماضٍ إخباري مباشر -- لا يعبّران عن رغبة افتراضية غير متحققة في الماضي؛ هذا يستلزم Konjunktiv II: wäre.",
  "26": "\"musste\" (كان يجب) يفيد إلزاماً خارجياً، و\"sollte\" (كان يُفترض) يفيد توقعاً من الآخرين -- لا يناسبان استحالة اجتماعية بسيطة (لا يليق) كما يفيدها \"konnte\" هنا مع \"schlecht\".",
  "27": "\"aber\" (لكن) تصوغ تبايناً -- لا سبباً، و\"sondern\" تحتاج نفياً سابقاً مباشراً غير موجود هنا -- تفسير سبب الفرح يستلزم \"denn\".",
  "28": "\"Beide\" صيغة جمعية تُستخدم للإشارة لعناصر معدودة منفصلة، و\"Beiden\" حالة جر -- بينما الإشارة هنا لفكرة مجردة موحدة (الحدثان معاً) بصيغة الفاعل، وهذا يستلزم الضمير المحايد المستقل: Beides.",
  "29": "\"erst\" (لم يحدث إلا) تفيد تأخراً غير متوقع، و\"schon\" (بالفعل) تعني عكس المقصود (وجود خطط بالفعل) -- التعبير الصحيح لعدم وجود خطط حتى الآن يستلزم \"noch\".",
  "30": "\"für\" لا يقترن بالفعل \"sich freuen\" هنا، و\"über\" تناسب الفرح بشيء حاضر مُستلَم -- لا التطلع لشيء مستقبلي (رسالة قادمة) كما يفيده \"sich freuen auf\" الذي يستلزم \"auf\".",
};

const LEON_GAP29_FIX = {
  keyword: "noch keine Pläne (bisher nicht)",
  explanation_correct: "\"noch keine Pläne haben\" تعبير شائع بمعنى \"لا توجد خطط حتى الآن\" -- براحة لعدم الانشغال في عطلات نهاية الأسبوع القادمة.",
};

async function deepenExercise(title, wrongMap, extraFix) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  if (extraFix?.gap29) items["29"] = { ...items["29"], ...extraFix.gap29 };
  console.log(`${title}: updated explanation_wrong for ${Object.keys(wrongMap).length} gaps${extraFix?.gap29 ? " (+ fixed gap 29 keyword/explanation mismatch)" : ""}`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function main() {
  await deepenExercise("Lara", LARA_WRONG);
  await deepenExercise("Laura", LAURA_WRONG);
  await deepenExercise("Leon", LEON_WRONG, { gap29: LEON_GAP29_FIX });
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

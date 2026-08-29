/**
 * Deepen T1 #17: "Maria und Timur", "Markus", "Meike" -- same
 * distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-17.mjs [--apply]
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

const MARIA_TIMUR_WRONG = {
  "21": "\"seien\" صيغة Konjunktiv I (كلام منقول) -- لا سرداً مباشراً لواقعة، و\"sind\" مضارع -- لا يميّز الأسبقية الزمنية المطلوبة بعد \"nachdem\" مع فعل رئيسي في الماضي التام.",
  "22": "\"Das\" ضمير إشارة/أداة تعريف -- لا يعمل ظرفاً استنتاجياً في بداية الجملة، و\"Dass\" أداة ربط تابعة تستلزم فعلاً في النهاية -- غير موجود هنا (gibt es بترتيب طبيعي).",
  "23": "\"an\" لا يقترن بالفعل \"sich freuen\" هنا، و\"auf\" تناسب التطلع لأمر مستقبلي (sich freuen auf) -- لا الفرح من أجل قرار شخص آخر كما يفعل \"für\".",
  "24": "\"je...desto\" تركيب مقارنة تناسبية -- معنى مختلف تماماً، و\"weder...noch\" تنفي كلا الأمرين -- عكس المعنى المقصود (سيحتفلان في كلا البلدين فعلاً).",
  "25": "\"Verwandte\" نهاية التصريف القوي -- بينما أداة التحديد \"alle\" تفرض التصريف الضعيف بنهاية \"-en\" على الاسم المُسمّى، و\"Verwandter\" حالة مفردة -- لا تناسب الجمع.",
  "26": "\"unsere\" حالة رفع/نصب، و\"unseren\" حالة جر/نصب -- كلاهما لا يناسب حالة الملكية الجمعية التي يستلزمها تركيب \"einige von + Genitiv\": unserer.",
  "27": "\"für\" لا تصف دوراً/مرحلة عمرية، و\"wie\" (مثل) توحي بالتشبيه -- لا بمرحلة حياتية حقيقية فعلاً عاشاها الفاعل كما يفيده \"als\" هنا.",
  "28": "\"dass\" تصوغ جملة خبرية مؤكدة -- لا تساؤلاً، و\"falls\" (في حال) أداة شرطية -- لا تناسب الفعل \"überlegen\" بمعنى التساؤل عمّا إذا كان ينبغي فعل شيء؛ هذا يستلزم \"ob\".",
  "29": "\"bereiten\" (يُحضّر) فعل مختلف لا يكوّن هذا التعبير، و\"machen\" (يفعل) فعل عام -- لا يكوّن التعبير الاصطلاحي الثابت \"alle Hände voll zu tun haben\" الذي يستلزم \"tun\" حصراً.",
  "30": "\"könnten\" (قد نستطيع) يعبّر عن إمكانية، و\"sollten\" (ينبغي) يعبّر عن توصية -- لا يكوّنان التعبير الثابت \"die Gelegenheit haben\" الذي يستلزم صيغة الفعل \"haben\" حصراً (هنا: hätten).",
};

const MARKUS_WRONG = {
  "21": "\"doch\" أداة تلطيف لكنها تفيد إصراراً/تصحيحاً لطيفاً -- لا تخفيف جزم متردد، و\"sogar\" (حتى) أداة تكثيف مفاجئة -- لا تناسب نبرة \"أعتقد\" غير الجازمة.",
  "22": "\"hinten\" (في الخلف) ظرف مكان -- لا يعمل حرف جر في هذا التعبير الثابت، و\"hinunter\" (إلى الأسفل) معنى مختلف تماماً -- التعبير \"etwas hinter sich haben\" يستلزم حرف الجر \"hinter\".",
  "23": "\"gepasst\" صيغة فاعل ثانٍ لفعل مختلف تماماً \"passen\" (يناسب) -- معنى مختلف، و\"bestehen\" مصدر -- لا يناسب الفعل المساعد \"habe\" الذي يستلزم صيغة الفاعل الثاني: bestanden.",
  "24": "\"also\" (إذن) أداة نتيجة -- معنى مختلف، و\"wohl\" (على الأرجح) تحمل شكاً يناقض التأكيد المقصود هنا؛ الإشارة لمعلومة بديهية يوافق عليها القارئ تستلزم \"ja\".",
  "25": "\"mir\" حالة جر -- بينما الفعل الانعكاسي \"sich fangen\" يستلزم ضميراً انعكاسياً بحالة النصب، و\"meins\" (ملكي) ضمير ملكية -- لا يعمل ضميراً انعكاسياً إطلاقاً.",
  "26": "\"seit\" (منذ) تصف مدة مستمرة من الماضي -- لا حدثاً مستقبلياً واحداً، و\"nachdem\" (بعد أن) تُستخدم عادة لتتابع ماضٍ -- لا لتتابع مستقبلي مباشر كما تفعل \"sobald\".",
  "27": "\"um\" تقترن بالفعل عند ذكر اسم المنصب (sich bewerben um eine Stelle) لا الجهة، و\"an\" لا تقترن بهذا الفعل إطلاقاً؛ الإشارة إلى جهة (شركة) تستلزم \"bei\".",
  "28": "\"wer\" (من، فاعل) و\"wen\" (من، مفعول به) أداتا استفهام عن أشخاص -- بينما السؤال هنا عن أمور/ظروف غير شخصية تنتظر المتكلمة، وهذا يستلزم \"was\".",
  "29": "\"dem\" حالة جر لكن بصيغة مذكرة/محايدة، و\"das\" حالة رفع/نصب محايدة -- بينما لاحقة \"-erei\" تحدد جنس الاسم كمؤنث، فحالة الجر المؤنثة الصحيحة: der.",
  "30": "\"dann\" (ثم) ظرف تتابع زمني -- معنى مختلف، و\"auch\" (أيضاً) أداة إضافة عامة -- لا تقدّم تفصيلاً دقيقاً مباشراً كما يفعل التعبير الثابت \"und zwar\".",
};

const MEIKE_WRONG = {
  "21": "\"neue\" حالة رفع/نصب -- لا تناسب حالة الجر، و\"neuer\" نهاية التصريف القوي -- بينما أداة الملكية \"deiner\" (حالة جر) تفرض التصريف الضعيف بنهاية \"-en\": neuen.",
  "22": "\"Sobald\" (بمجرد أن) تصف نقطة تحفيز واحدة، و\"Solange\" (طالما) تصف مدة مشروطة بحالة قائمة -- لا نقطة بداية استمرت منها تغييرات حتى الآن كما تفعل \"Seit\".",
  "23": "\"daran\" ترتبط بأفعال أخرى مثل \"denken an\"، و\"darauf\" ترتبط بـ\"warten auf\" -- التعبير الثابت \"nachdenken über\" يستلزم الضمير الظرفي \"darüber\".",
  "24": "\"es\" ضمير غير شخصي -- لا يعمل ضميراً انعكاسياً، و\"mir\" حالة جر -- بينما الفعل الانعكاسي \"sich einschreiben\" يستلزم حالة النصب: mich.",
  "25": "\"Damit\" (لكي) أداة غرض -- معنى مختلف تماماً، و\"Wenn\" (إذا/عندما) أداة شرطية -- لا تصف تناقضاً واقعياً حقيقياً (شكوك سابقة مقابل رضا حالي) كما تفعل \"Obwohl\".",
  "26": "\"dürfte\" تحمل دلالة إذن أو احتمال، و\"müsste\" (يجب أن) تعبّر عن ضرورة -- لا يناسبان الشك الذاتي في القدرة على الإنجاز كما يفعل \"könnte\".",
  "27": "\"als\" تُستخدم في مقارنة تفضيل (أكثر من)، لا مقارنة تساوٍ، و\"nach\" (بعد/وفق) حرف جر مختلف تماماً -- تركيب المقارنة المتساوية \"so...wie\" يستلزم \"wie\".",
  "28": "\"nahmen\" ماضٍ بسيط -- لا يناسب حقيقة عامة حالية، و\"nimmt\" تصريف مفرد -- لا يطابق الفاعل الجمعي \"die Vorbereitungen\" الذي يستلزم صيغة الجمع: nehmen.",
  "29": "\"mein\" (ملكي) ضمير ملكية -- لا يعمل ضمير مفعول به، و\"mir\" حالة جر -- بينما حرف الجر \"für\" يحكم حالة النصب دائماً: mich.",
  "30": "\"der\" حالة مفردة -- لا تطابق الجمع \"Chatgruppen\"، و\"die\" حالة رفع/نصب -- بينما \"in\" الساكنة تستلزم حالة الجر الجمعية: denen.",
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
  await deepenExercise("Maria und Timur", MARIA_TIMUR_WRONG);
  await deepenExercise("Markus", MARKUS_WRONG);
  await deepenExercise("Meike", MEIKE_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

/**
 * Deepen T2 #05: "Die Reise im Schlafwagen", "Die Rückkehr des
 * Nachtzugs", "Die wichtigsten Regeln auf der Skipiste".
 *
 * Usage: node scripts/learning-aids/deepen-t2-05.mjs [--apply]
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

const SCHLAFWAGEN_WRONG = {
  "31": "\"KONKURRENTEN\" (منافسون) اسم غير ذي صلة بالإلغاء، و\"AUSWEITEN\" مصدر (يوسّع) -- عكس المعنى المطلوب تماماً (توسيع لا إلغاء) وصيغته أيضاً غير مطابقة (مصدر لا فاعل ثانٍ)؛ وصف إلغاء عروض سابقة في مبني للمجهول يستدعي \"EINGESTELLT\".",
  "32": "\"KONKURRENTEN\" (منافسون) كلمة من نفس الحقل الدلالي (الأعمال) لكن بمعنى معاكس تقريباً (الخصوم لا الزبائن)، و\"GRÜNDEN\" (يُستخدم في الفجوة 33 بمعنى مختلف تماماً: أسباب) -- التعبير الثابت \"Kunden gewinnen\" (كسب زبائن) يستلزم \"KUNDEN\" حصراً.",
  "33": "\"KUNDEN\" (يُستخدم في الفجوة 32) اسم من سياق مختلف تماماً (زبائن لا أسباب)، و\"KONKURRENTEN\" (منافسون) اسم غير ذي صلة؛ التعبير الثابت \"aus Gründen des Umweltschutzes\" (لأسباب بيئية) يستلزم \"GRÜNDEN\" حصراً.",
  "34": "\"NEUE\" صفة -- لا تكوّن التعبير الاسمي الثابت، و\"KONKURRENZ\" (يُستخدم في الفجوة 35 بمعنى مختلف: منافسة) -- لا يكوّن هذا التعبير؛ التعبير الثابت \"in Mode kommen\" (يعود للرواج) يستلزم \"MODE\" حصراً.",
  "35": "\"KONKURRENTEN\" (المنافسون كأشخاص) صيغة مختلفة من نفس الجذر لكنها تدل على أشخاص لا على المنافسة كمفهوم مجرد، و\"MODE\" (يُستخدم في الفجوة 34) اسم من تعبير مختلف؛ التعبير الثابت \"jemandem Konkurrenz machen\" يستلزم \"KONKURRENZ\" حصراً.",
  "36": "\"INSGESAMT\" (إجمالاً) ظرف تلخيصي -- لا تكثيفاً ودياً لصفة، و\"VOREILIG\" (يُستخدم في الفجوة 40 بمعنى مختلف تماماً: متسرع) -- لا علاقة له بالتكثيف؛ تكثيف الصفة بأسلوب ودي (إلى حد ما) يستدعي \"GANZ\".",
  "37": "\"DURCH\" حرف جر -- لا يعمل ظرف إضافة، و\"WÄHREND\" (يُستخدم في الفجوة 39 بمعنى مختلف: بينما/أثناء) -- لا يصلح لإضافة سبب مستقل؛ إضافة سبب آخر مستقل تستدعي \"AUSSERDEM\".",
  "38": "\"WÄHREND\" (بينما) أداة زمنية/تعارض -- معنى مختلف تماماً عن وصف الدور، و\"DURCH\" حرف جر وسيلة -- لا يصف دوراً أو صفة لشيء؛ وصف الدور/الصفة (بصفته وسيلة نقل) يستدعي \"ALS\".",
  "39": "\"ALS\" (يُستخدم في الفجوة 38 بمعنى \"بصفته\") -- لا تعني التزامن هنا ولا تصلح لوصف حدثين مستمرين متزامنين، و\"AUSSERDEM\" ظرف إضافة مستقل -- لا يعمل أداة ربط تابعة لجملتين متزامنتين؛ التزامن بين حدثين يستدعي \"WÄHREND\".",
  "40": "\"GANZ\" (يُستخدم في الفجوة 36 كأداة تكثيف) -- لا يصف صفة \"التسرع\" بذاته، و\"INSGESAMT\" (إجمالاً) ظرف تلخيصي -- معنى مختلف تماماً؛ السياق (تصحيح توقع كان خاطئاً) يحدد \"VOREILIG\" (متسرع).",
};

const NACHTZUG_WRONG = {
  "31": "\"FORM\" (شكل) اسم من حقل مختلف -- لا يكوّن التعبير الثابت \"in Mode bringen\"، و\"WIRKLICH\" (فعلاً) ظرف -- لا يعمل اسماً في هذا الموضع؛ التعبير الثابت \"etwas wieder in Mode bringen\" يستلزم \"MODE\" حصراً.",
  "32": "\"WIRKLICH\" (فعلاً) ظرف تأكيد -- لا يقترن ببنية المقارنة \"so...wie\" بنفس الطريقة، و\"INSGESAMT\" (يُستخدم في الفجوة 34 بمعنى مختلف: إجمالاً) -- لا يناسب تكثيف المقارنة هنا؛ هذا يستلزم \"GANZ\".",
  "33": "\"EINGESTELLT\" (يُستخدم في الفجوة 36) صيغة الفاعل الثاني -- لا تصلح مصدراً بعد الفعل الوجهي \"könnten\"، و\"GESTALTET\" (يُستخدم في الفجوة 39) صيغة الفاعل الثاني أيضاً -- نفس المشكلة؛ الفعل الوجهي \"könnten\" يستلزم مصدراً في نهاية الجملة: \"AUSWEITEN\".",
  "34": "\"GANZ\" (يُستخدم في الفجوة 32 كأداة تكثيف) -- لا يصف عدداً إجمالياً، و\"WIRKLICH\" (فعلاً) ظرف تأكيد -- معنى مختلف تماماً؛ وصف العدد الإجمالي يستدعي \"INSGESAMT\".",
  "35": "\"SONDERN\" أداة ربط -- لا تعمل صفة، و\"FORM\" اسم -- لا يصف الاسم \"Intercity-Nachtverbindung\"؛ أداة التنكير المؤنثة بالنصب (eine) تفرض نهاية \"-e\" على الصفة \"neu\": \"NEUE\".",
  "36": "\"AUSWEITEN\" (يُستخدم في الفجوة 33 بمعنى مختلف: يوسّع) -- لا علاقة له بتوظيف موظفين، و\"GESTALTET\" (يُستخدم في الفجوة 39 بمعنى مختلف: مصمَّم) -- أيضاً غير ذي صلة؛ السياق (توظيف موظفين جدد) يحدد \"EINGESTELLT\".",
  "37": "\"FORM\" (شكل) اسم غير ذي صلة بالمنافسة، و\"WEGEN\" (يُستخدم في الفجوة 40) حرف جر -- لا يعمل اسماً بصيغة الجمع هنا؛ السياق (شركات أخرى منافسة) يحدد \"KONKURRENTEN\".",
  "38": "\"WEGEN\" (يُستخدم في الفجوة 40 بمعنى \"بسبب\") -- يفسّر سبباً لا وسيلة، و\"ALS\" (بصفته) أداة وصف دور -- معنى مختلف تماماً؛ وصف الوسيلة (عرض تنقل صديق للمناخ) يستدعي \"DURCH\".",
  "39": "\"EINGESTELLT\" (يُستخدم في الفجوة 36 بمعنى مختلف: تم توظيفه/إلغاؤه) -- لا علاقة له بالتصميم البصري، و\"AUSWEITEN\" (يُستخدم في الفجوة 33) مصدر -- لا يصلح صيغة فاعل ثانٍ بعد \"wäre\"؛ وصف تصميم بصري في تركيب افتراضي يستدعي \"GESTALTET\".",
  "40": "\"DURCH\" (يُستخدم في الفجوة 38 بمعنى \"بواسطة\") -- يصف وسيلة لا سبباً، و\"ALS\" (بصفته) -- معنى مختلف تماماً؛ تفسير سبب إلغاء القطار (خسائر مرتفعة) يستدعي \"WEGEN\".",
};

const SKIPISTE_WRONG = {
  "31": "\"GELTEN\" (يسري/يُطبَّق) فعل من نفس الحقل القانوني لكن بمعنى مختلف تماماً (لا يكوّن التعبير \"mit etwas rechnen\")، و\"EINORDNEN\" (يصنّف) فعل غير ذي صلة؛ التعبير الثابت \"mit etwas rechnen\" (يتوقع/يحسب حساب شيء) يستلزم \"RECHNEN\" حصراً.",
  "32": "\"GELTEN\" فعل من نفس الجذر لكنه فعل لا صفة -- لا يصلح بعد الفعل المساعد \"ist\" بهذا الموضع النحوي، و\"KANN\" فعل وجهي -- لا يعمل صفة؛ وصف نطاق سريان قانوني (بعد \"ist\") يستدعي الصفة \"GÜLTIG\".",
  "33": "\"RAND\" (يُستخدم في الفجوة 38 بمعنى \"حافة\") اسم غير ذي صلة، و\"STELLE\" (يُستخدم في الفجوة 39 بمعنى \"موقع\") اسم آخر غير ذي صلة -- كلاهما ليس جزيء فعل منفصل؛ الفعل المنفصل \"vorsehen\" في نهاية الجملة يستلزم \"VOR\" حصراً.",
  "34": "\"DARF\" (يُسمح له) يفيد إذناً -- معنى مختلف تماماً عن التوصية، و\"KANN\" (يستطيع) يفيد قدرة -- لا توصية عامة؛ التوصية العامة لكل قارئ (ينبغي أن يعرف) تستدعي \"SOLLTE\".",
  "35": "\"ZWAR\" (يمهّد لتباين لاحق) معنى مختلف تماماً، و\"ALLERDINGS\" (يُستخدم في الفجوة 37 بمعنى \"لكن/مع ذلك\") -- لا يكوّن بنية النتيجة؛ بنية \"so...dass\" تستلزم \"SO\" حصراً.",
  "36": "\"EINORDNEN\" (يصنّف/يندمج) فعل غير ذي صلة بمواءمة السرعة، و\"ANGEBEN\" (يُستخدم في الفجوة 40 بمعنى \"يُدلي ببيانات\") فعل مختلف تماماً؛ التعبير الثابت \"etwas (an etwas) anpassen\" (يكيّف) يستلزم \"ANPASSEN\" حصراً.",
  "37": "\"ZWAR\" تحتاج عادة \"aber\" لاحقاً في تركيب تنازلي مختلف -- لا تعمل بمفردها كقيد مباشر هنا، و\"SO\" (يُستخدم في الفجوة 35) أداة نتيجة -- معنى مختلف تماماً؛ تقييد الفكرة السابقة (السماح بالتجاوز لكن بشرط) يستدعي \"ALLERDINGS\".",
  "38": "\"STELLE\" (يُستخدم في الفجوة 39 بمعنى \"موقع\") اسم من سياق مختلف، و\"VOR\" (يُستخدم في الفجوة 33) جزيء فعل منفصل -- لا يعمل اسماً؛ السياق (السماح باستخدام الحافة فقط) يحدد \"RAND\".",
  "39": "\"RAND\" (يُستخدم في الفجوة 38 بمعنى \"حافة\") اسم من سياق مختلف، و\"EINORDNEN\" مصدر -- لا يعمل اسماً؛ السياق (إخلاء مكان السقوط) يحدد \"STELLE\".",
  "40": "\"ANPASSEN\" (يُستخدم في الفجوة 36 بمعنى \"يكيّف\") فعل مختلف تماماً، و\"EINORDNEN\" (يصنّف) فعل غير ذي صلة؛ التعبير الثابت \"Personalien angeben\" (الإدلاء بالبيانات الشخصية) يستلزم \"ANGEBEN\" حصراً.",
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
  await deepenExercise("Die Reise im Schlafwagen", SCHLAFWAGEN_WRONG);
  await deepenExercise("Die Rückkehr des Nachtzugs", NACHTZUG_WRONG);
  await deepenExercise("Die wichtigsten Regeln auf der Skipiste", SKIPISTE_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

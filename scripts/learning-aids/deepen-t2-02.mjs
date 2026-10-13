/**
 * Deepen T2 #02: "Das Schicksal des Braunbären", "Das Fahrrad: ernsthafte
 * Konkurrenz fürs Auto?", "Der Hund als intelligentes Wesen" -- same
 * distractor-reasoning pattern as deepen-t2-01, drawing from each
 * exercise's own word bank.
 *
 * Usage: node scripts/learning-aids/deepen-t2-02.mjs [--apply]
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

const BRAUNBAER_WRONG = {
  "31": "\"SODASS\" أداة ربط تستلزم جملة كاملة بفعل مصرّف -- غير مناسبة هنا لأن ما يلي هو اسم بحالة الملكية فقط (der vergangenen 12000 Jahre) بلا فعل، و\"SOWIE\" (وكذلك) أداة عطف -- معنى مختلف تماماً عن الظرفية الزمنية؛ وصف مدة زمنية ممتدة قبل اسم في حالة الملكية يستلزم حرف الجر \"WÄHREND\".",
  "32": "\"VORKOMMEN\" اسم -- لا يعمل ضميراً ظرفياً في بداية الجملة، و\"KAM\" فعل ماضٍ مصرّف -- لا يصلح ضميراً أيضاً؛ الإشارة لنتيجة مترتبة على سبب سابق (ارتفاع الحرارة) تستلزم الضمير الظرفي \"DADURCH\".",
  "33": "\"SODASS\" تفيد نتيجة (لذلك/بحيث) -- لا جملة مُتممة لصفة \"unumstritten\"، و\"SOWIE\" أداة عطف بمعنى \"وكذلك\" -- لا تصلح أداة ربط تابعة لجملة متممة؛ التعبير الثابت \"unumstritten, dass\" يستلزم \"DASS\" حصراً.",
  "34": "\"KAM\" فعل ماضٍ -- لا يعمل حرف جر، و\"BEGRIFFE\" اسم (مفاهيم) -- لا علاقة له بوصف مقدار كمي؛ وصف مقدار تغيّر رقمي (درجتان إلى أربع درجات) يستلزم حرف الجر \"UM\".",
  "35": "\"VORKOMMEN\" (التكرار/الحدوث) كلمة من نفس الجذر لكن بمعنى مختلف تماماً (لا علاقة بالنسل)، و\"BEGRIFFE\" (مفاهيم) اسم غير ذي صلة إطلاقاً؛ التعبير الثابت \"Nachkommen bekommen\" (الحصول على نسل) يستلزم \"NACHKOMMEN\" حصراً.",
  "36": "\"DADURCH\" ضمير ظرفي لكن بحرف جر مختلف (durch) -- التعبير الثابت \"der Grund für etwas\" يستلزم حرف الجر \"für\" حصراً (dafür)، و\"SOWIE\" أداة عطف -- لا تعمل ضميراً ظرفياً؛ هذا يستلزم \"DAFÜR\".",
  "37": "\"SODASS\" تصف نتيجة مترتبة على ما سبق -- عكس الاتجاه المطلوب هنا (تفسير السبب لا النتيجة)، و\"KAM\" فعل مصرّف -- لا يعمل أداة ربط؛ تفسير سبب الجملة السابقة يستلزم \"DENN\".",
  "38": "\"BEGRIFFE\" (مفاهيم) كلمة تشبه \"Eingriffe\" شكلاً لكنها مختلفة جذرياً في المعنى (لا علاقة لها بالتدخل في الطبيعة)، و\"VORKOMMEN\" (حدوث) اسم غير ذي صلة؛ السياق (تعدي الإنسان على الموئل الطبيعي) يحدد \"EINGRIFFE\" (تدخلات) حصراً.",
  "39": "\"KAM\" فعل مصرّف -- لا يعمل ظرفاً، و\"SOWIE\" أداة عطف -- معنى مختلف تماماً؛ وصف استمرار انتشار سابق (حتى تلك اللحظة) يستلزم الظرف \"NOCH\".",
  "40": "\"KAM\" فعل مصرّف من \"kommen\" -- لا يكوّن التعبير الاصطلاحي الثابت \"bergab gehen mit\"، و\"VORKOMMEN\" اسم/مصدر -- لا يصلح فعلاً مصرّفاً هنا؛ هذا التعبير يستلزم الفعل \"GING\" (من gehen) حصراً.",
};

const FAHRRAD_WRONG = {
  "31": "\"FAST\" (تقريباً) تفيد اقتراباً من اكتمال الشيء (الاتجاه الإيجابي)، و\"BEINAHE\" مرادف له بنفس المعنى -- كلاهما عكس الاتجاه الدلالي المطلوب هنا (الندرة شبه المعدومة)؛ هذا يستلزم \"KAUM\".",
  "32": "\"VOR\" حرف جر مختلف تماماً لا يكوّن هذا الفعل المركّب، و\"AN\" حرف جر آخر (يُستخدم في التعبير الثابت \"Angebot an\" في الفجوة 37) -- لا يقترن بالفعل \"umsteigen\"؛ التعبير الثابت \"umsteigen auf\" (التحول إلى) يستلزم \"AUF\" حصراً.",
  "33": "\"VOR\" حرف جر يشبه \"vorbei\" شكلاً لكنه يعني \"أمام/قبل\" -- معنى مختلف تماماً عن \"المرور بمحاذاة\"، و\"DANN\" ظرف زمني -- لا علاقة له بالحركة المكانية؛ التعبير الثابت \"an etwas vorbei\" (المرور بمحاذاة شيء) يستلزم \"VORBEI\" حصراً.",
  "34": "\"VOR\" حرف جر بمعنى مختلف تماماً (أمام/قبل)، و\"DAFÜR\" ضمير ظرفي -- لا يصلح لبنية استبدال بمصدر؛ بنية المقارنة الاستبدالية \"X statt zu Y\" (بدلاً من) تستلزم \"STATT\" حصراً.",
  "35": "\"VOR\" حرف جر بمعنى \"أمام/قبل\" -- عكس المعنى المكاني الداخلي المطلوب، و\"DAFÜR\" ضمير ظرفي -- لا يصلح حرف جر يحكم اسماً بحالة الملكية؛ وصف موقع داخلي محصور يستلزم \"INNERHALB\" حصراً.",
  "36": "\"DÜRFEN\" (يُسمح له) يفيد إذناً -- عكس المعنى المطلوب (اضطرار موضوعي لا خيار فيه)، و\"SOLLEN\" (يُفترض) يفيد توصية/غرضاً خارجياً غير مؤكد -- لا اضطراراً حتمياً؛ هذا يستلزم \"MÜSSEN\".",
  "37": "\"AUF\" حرف جر آخر (يُستخدم في الفعل المركّب \"umsteigen auf\" في الفجوة 32) -- لا يكوّن التعبير الثابت هنا، و\"VOR\" حرف جر مختلف تماماً؛ التعبير الثابت \"ein Angebot an + Dativ\" يستلزم \"AN\" حصراً.",
  "38": "\"MÜSSEN\" (يجب) يفيد اضطراراً حتمياً موضوعياً -- لا وعداً تسويقياً غير مؤكد، و\"DÜRFEN\" (يُسمح) يفيد إذناً -- معنى مختلف تماماً؛ التعبير عن غرض/وعد غير مؤكد لمنتج (يُفترض أن...) يستلزم \"SOLLEN\".",
  "39": "\"DENN\" (لأن) يفسّر سبباً -- لا يصوغ نتيجة لشرط زمني (wenn...dann)، و\"VOR\" حرف جر -- لا يعمل ظرف نتيجة؛ النتيجة المترتبة على الشرط الزمني (wenn es regnet) تستلزم \"DANN\".",
  "40": "\"DANN\" (حينئذٍ) يصوغ نتيجة لشرط -- لا تفسيراً سببياً لجملة سابقة، و\"DAFÜR\" ضمير ظرفي -- لا يعمل أداة ربط؛ تفسير سبب الجملة السابقة (عدم توفر حماية عملية من الطقس) يستلزم \"DENN\".",
};

const HUND_WRONG = {
  "31": "\"WELCHE\" ضمير استفهامي/موصول يستلزم مرجعاً محدداً بجنس ثابت -- لا يكوّن التعبير الثابت هنا، و\"DAS\" ضمير إشاري/موصول محايد -- لا يصلح أيضاً لهذا التعبير الاصطلاحي الجامد؛ التعبير الثابت \"was ... betrifft\" (فيما يتعلق بـ) يستلزم \"WAS\" حصراً.",
  "32": "\"ÜBRIGENS\" (بالمناسبة) يقدّم ملاحظة جانبية -- لا تحولاً زمنياً حاداً في المعرفة، و\"DEM\" أداة تعريف/ضمير -- لا يعمل ظرف زمن؛ الإشارة لتحول حديث في المعرفة (مقابل الاعتقاد السابق) تستلزم \"JETZT\".",
  "33": "\"ZU\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AUS\" حرف جر آخر (يُستخدم في الفعل \"auswählen aus\" في الفجوة 34) -- لا يقترن بـ\"Experimente\"؛ التعبير الثابت \"Experimente an + مؤسسة\" يستلزم \"AN\" حصراً.",
  "34": "\"AN\" حرف جر آخر (يُستخدم في التعبير \"Experimente an\" في الفجوة 33) -- لا يقترن بالفعل \"auswählen\"، و\"ZU\" حرف جر مختلف تماماً؛ التعبير الثابت \"auswählen aus\" (يختار من بين) يستلزم \"AUS\" حصراً.",
  "35": "\"DEM\" أداة تعريف/ضمير حالة جر بسيط -- لا يعمل ضميراً ظرفياً مركّباً، و\"WELCHE\" ضمير استفهامي/موصول -- معنى مختلف تماماً؛ الإشارة لموضوع سابق (الصورة) بحرف الجر \"auf\" تستلزم الضمير الظرفي \"DARAUF\".",
  "36": "\"DASS\" وحدها أداة ربط تُدخل جملة متممة لفعل/صفة -- لا تصوغ نتيجة مترتبة على وصف سابق، و\"ZU\" أداة مصدر -- لا تعمل أداة ربط لجملة كاملة؛ النتيجة المترتبة على وصف الشاشة اللمسية تستلزم \"SO DASS\" (بحيث).",
  "37": "\"DAS\" ضمير إشاري -- لا يصلح جزءاً من بنية ربط مزدوجة، و\"ÜBRIGENS\" (بالمناسبة) ظرف جانبي -- معنى مختلف تماماً؛ البنية الجامعة بين فعلين متتاليين تستلزم \"NICHT NUR\" (مقترنة لاحقاً بـ sondern auch).",
  "38": "\"DEM\" ضمير حالة جر لكن بصيغة المفرد -- لا يطابق المرجع الجمعي \"zwei Gefäße\"، و\"WELCHE\" ضمير موصول بصيغة الرفع/النصب -- لا حالة الجر المطلوبة بعد \"von\"؛ حرف الجر \"von\" مع مرجع جمعي يفرض \"DENEN\".",
  "39": "\"SO DASS\" تصوغ نتيجة (بحيث) -- لا جملة متممة بعد فعل \"schließen\" (يستنتج)، و\"WELCHE\" ضمير موصول -- لا يصلح أداة ربط لجملة متممة كاملة؛ التعبير الثابت \"schließen, dass\" يستلزم \"DASS\" حصراً.",
  "40": "\"DAS\" أداة تعريف/ضمير إشاري محايد مفرد -- لا تنفي اسماً جمعياً، و\"DEM\" حالة جر مفردة -- لا تناسب أيضاً؛ نفي اسم جمع بحالة النصب (vergleichbare Resultate) يستلزم \"KEINE\".",
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
  await deepenExercise("Das Schicksal des Braunbären", BRAUNBAER_WRONG);
  await deepenExercise("Das Fahrrad: ernsthafte Konkurrenz fürs Auto?", FAHRRAD_WRONG);
  await deepenExercise("Der Hund als intelligentes Wesen", HUND_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

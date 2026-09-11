/**
 * Deepen T2 #07: "Hase im Display", "Im Restaurant" (2 rows: "( Original )"
 * and "(معدل)" -- mostly shared content but gaps 33/34/38 differ, so each
 * row gets its own WRONG map applied by id), "Ist der Umgang mit
 * Haustieren gesund für Kleinkinder?".
 *
 * Usage: node scripts/learning-aids/deepen-t2-07.mjs [--apply]
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

const HASE_WRONG = {
  "31": "\"NACH\" حرف جر مختلف تماماً لا يكوّن هذا التعبير المكرر، و\"AN\" (يُستخدم في الفجوة 32) حرف جر آخر -- لا يقترن بهذا التركيب؛ التعبير الثابت \"von X zu X\" يستلزم \"ZU\" حصراً.",
  "32": "\"ZU\" (يُستخدم في الفجوة 31) حرف جر آخر -- لا يقترن بالفعل \"herankommen\"، و\"NACH\" حرف جر مختلف تماماً؛ التعبير الثابت \"herankommen an\" يستلزم \"AN\" حصراً.",
  "33": "\"SEHR\" (جداً) ظرف تكثيف -- معنى مختلف تماماً عن الفورية الزمنية، و\"DA\" ظرف مكاني/إشاري -- لا يفيد نفس معنى \"بالفعل\"؛ التأكيد على السرعة الفورية يستدعي \"SCHON\".",
  "34": "\"AN\" (يُستخدم في الفجوة 32) حرف جر آخر -- لا يكوّن هذا التعبير، و\"ZU\" (يُستخدم في الفجوة 31) حرف جر مختلف -- لا يناسب أيضاً؛ التعبير الثابت \"aus der Mode kommen\" (يخرج عن الموضة) يستلزم \"AUS\" حصراً.",
  "35": "\"HÖHER\" (أعلى) صفة مقارنة -- لا تعمل أداة في بنية التعويض، و\"SEHR\" (جداً) ظرف تكثيف عادي -- لا يكوّن بنية \"dafür...umso\" الخاصة؛ هذا يستلزم \"UMSO\" حصراً.",
  "36": "\"DARAUS\" (يُستخدم في الفجوة 38 بمعنى \"من ذلك\") ضمير ظرفي بحرف جر مختلف، و\"DA\" ظرف مكاني بسيط -- لا يعمل ضميراً ظرفياً مركّباً بنفس المعنى؛ الربط بنشاط سابق كسياق يستدعي \"DABEI\".",
  "37": "\"DA\" يمكن أن تعني \"لأن\" لكنها أداة ربط تابعة تستلزم فعلاً في نهاية الجملة -- لا يناسب ترتيب الفعل الثاني هنا (dürfen)، و\"ALSO\" (يُستخدم في الفجوة 39 بمعنى \"إذن\") يصوغ نتيجة لا سبباً؛ تفسير سبب الجملة السابقة يستدعي \"DENN\".",
  "38": "\"DABEI\" (يُستخدم في الفجوة 36) ضمير ظرفي بحرف جر مختلف، و\"DA\" ظرف بسيط -- لا يعمل ضميراً ظرفياً يشير لعبارة سابقة بحرف الجر \"aus\"؛ الإشارة لعبارة سابقة (I-L-D) يستدعي \"DARAUS\".",
  "39": "\"DENN\" (يُستخدم في الفجوة 37 بمعنى \"لأن\") يفسّر سبباً -- لا يستخلص نتيجة، و\"DABEI\" (يُستخدم في الفجوة 36) ضمير ظرفي -- معنى مختلف تماماً؛ استخلاص نتيجة من الوصف السابق يستدعي \"ALSO\".",
  "40": "\"STATISCH\" (ثابت/راكد) كلمة تشبه \"drastisch\" شكلاً لكنها بمعنى معاكس تماماً (ثبات لا تغيّر حاد)، و\"HÖHER\" (أعلى) صفة مقارنة -- لا تعمل ظرفاً يصف حدة الفعل \"ansteigen\"؛ وصف حدة التغيّر يستدعي \"DRASTISCH\".",
};

const RESTAURANT_ORIGINAL_WRONG = {
  "31": "\"BLEIBT\" (يبقى) فعل بصيغة المفرد -- لا يطابق الفاعل الجمعي \"die Arme\" (الذراعان)، و\"BEREIT\" (جاهز) صفة -- لا تعمل فعلاً؛ التعبير الثابت \"gehören nicht auf\" (لا مكان لها على) يستلزم فعل الجمع \"GEHÖREN\".",
  "32": "\"BLEIBT\" (يبقى) فعل بمعنى مختلف تماماً (البقاء الذاتي لا الإبقاء على شيء)، و\"GEHÖREN\" (يُستخدم في الفجوة 31) فعل بصيغة الجمع -- لا يطابق الفاعل المفرد الضمني (man) هنا؛ التعبير الثابت \"etwas anbehalten\" (يُبقي شيئاً منتعلاً) يستلزم \"BEHÄLT\".",
  "33": "\"JEDER\" (كل واحد) يفيد التعميم المطلق -- مبالغة في التعميم، بينما \"so mancher\" يشير لعدد غير محدد من الناس دون شمول الجميع، و\"ALS\" أداة مقارنة -- لا تعمل ضميراً؛ الإشارة لمجموعة غير محددة من الناس تستدعي \"MANCHER\".",
  "34": "\"ALS\" (بصفته) أداة وصف دور -- معنى مختلف تماماً عن وصف الوسيلة اللفظية، و\"TIPP\" (نصيحة) اسم -- لا يعمل حرف جر؛ وصف وسيلة النداء اللفظية يستدعي حرف الجر \"MIT\".",
  "35": "\"ALS\" (بصفته/كما) أداة مقارنة -- معنى مختلف تماماً عن التضاد، و\"BEREIT\" (جاهز) صفة -- لا تعمل أداة تضاد؛ التضاد بين خيارين (النداء القديم مقابل الجديد) يستدعي \"DAGEGEN\".",
  "36": "\"TIPP\" (نصيحة) اسم قريب دلالياً لكنه لا يكوّن التعبير \"ein Wink mit der Hand\" (إشارة باليد)، و\"TAKT\" (يُستخدم في الفجوة 38 بمعنى \"لباقة\") اسم مختلف تماماً؛ السياق (طريقة جذب انتباه النادل بيد) يحدد \"WINK\".",
  "37": "\"BEREIT\" (جاهز) صفة قريبة المعنى لكنها لا تكوّن التعبير الثابت \"fertig sein mit\" (ينتهي من)، و\"KLAR\" (يُستخدم في الفجوة 39 بمعنى \"واضح\") صفة أخرى مختلفة؛ هذا التعبير يستلزم \"FERTIG\" حصراً.",
  "38": "\"WINK\" (يُستخدم في الفجوة 36 بمعنى \"إشارة\") اسم غير ذي صلة باللباقة، و\"TIPP\" (نصيحة) اسم آخر غير ذي صلة؛ السياق (حساسية موضوع الدفع) يحدد \"TAKT\".",
  "39": "\"FERTIG\" (يُستخدم في الفجوة 37 بمعنى \"منتهٍ\") صفة مختلفة تماماً، و\"BEREIT\" (جاهز) صفة أخرى غير ذات صلة؛ التعبير الثابت \"jemandem etwas klarmachen\" (يوضح لشخص أمراً) يستلزم \"KLAR\" حصراً.",
  "40": "\"ALS\" أداة مقارنة -- لا تعمل ضمير وصل، و\"JEDER\" (كل واحد) ضمير عام -- لا يعود على جملة كاملة سابقة؛ عودة ضمير الوصل على فكرة/جملة كاملة (الدفع منفصلاً) تستلزم \"WAS\".",
};

const RESTAURANT_MODIFIZIERT_WRONG = {
  ...RESTAURANT_ORIGINAL_WRONG,
  "33": "\"MANCHER\" نفس الكلمة لكن بحالة الرفع/النصب -- بينما الفعل \"bereiten\" يحكم حالة الجر (Dativ) لمن يواجه المشكلة، و\"JEDER\" (كل واحد) يفيد التعميم المطلق -- مبالغة في التعميم؛ الفعل \"bereiten\" يحكم Dativ ويفرض تحديداً \"MANCHEM\".",
  "34": "\"ALS\" (بصفته) أداة وصف دور -- معنى مختلف تماماً، و\"TAKTGEFÜHL\" (يُستخدم في الفجوة 38) اسم -- لا يعمل حرف جر؛ وصف وسيلة النداء (بلفظة معينة) يستدعي حرف الجر \"MIT\".",
  "38": "\"WINK\" (يُستخدم في الفجوة 36 بمعنى \"إشارة\") اسم غير ذي صلة باللباقة، و\"MANCHEM\" (يُستخدم في الفجوة 33) ضمير غير محدد -- لا يعمل اسماً مجرداً هنا؛ السياق (حساسية موضوع الدفع) يحدد \"TAKTGEFÜHL\" (الإحساس باللباقة).",
};

const HAUSTIERE_WRONG = {
  "31": "\"WIE\" تُستخدم في المقارنة المتساوية \"so...wie\" -- لا مقارنة التفوق/التفضيل بعد صيغة مقارنة (seltener)، و\"GEGENSATZ\" (تضاد) اسم -- لا يعمل أداة مقارنة؛ بنية المقارنة \"Komparativ + als\" تستلزم \"ALS\" حصراً.",
  "32": "\"FRÜHEREN\" (سابقة) صفة قريبة المعنى لكنها تشير لماضٍ بعيد/مختلف عموماً، لا لأسبوع محدد منقضٍ حديثاً، و\"UM\" حرف جر -- لا يعمل صفة؛ وصف مدة زمنية منقضية حديثاً (الأسبوع الماضي) يستدعي \"VERGANGENEN\".",
  "33": "\"WAREN\" (كانوا) فعل ماضٍ -- لا يعمل أداة تمهيد، و\"GEGENSATZ\" (تضاد) اسم -- لا يصلح أيضاً؛ التمهيد لتناقض معتدل لاحق (aber) يستدعي \"ZWAR\".",
  "34": "\"UM\" حرف جر بمعنى مختلف (حول/من أجل) -- لا يصف وسيلة تعرّض، و\"WIE\" (مثل) أداة تشبيه -- معنى مختلف تماماً؛ وصف الوسيلة المسببة للتعرض للجراثيم (عبر النزهات اليومية) يستدعي \"DURCH\".",
  "35": "\"GEGENTEIL\" (يُستخدم في الفجوة 40 بمعنى \"العكس\") -- معنى معاكس تماماً للمطلوب، و\"GEGENSATZ\" (تضاد) اسم غير ذي صلة؛ الإشارة لتطابق مع فكرة سابقة (نفس التأثير) تستدعي \"DIESELBE\".",
  "36": "\"WAREN\" (كانوا) فعل مساعد من \"sein\" -- يُستخدم لوصف حالة لا لتكوين مبني للمجهول الإجرائي في الماضي، و\"UM\" حرف جر -- لا يعمل فعلاً مساعداً؛ مبني للمجهول في الماضي (تمت متابعتهم) يفرض الفعل المساعد \"WURDEN\".",
  "37": "\"WENIGER\" (يُستخدم في الفجوة 38) صيغة مقارنة غير قابلة للتصريف -- لا تأخذ نهاية التصريف المطلوبة قبل الاسم المحايد \"Risiko\"، و\"DEUTLICH\" (يُستخدم في الفجوة 39) ظرف تكثيف -- معنى مختلف؛ وصف انخفاض نسبي في مخاطر (قبل اسم محايد بالنصب) يستلزم الصفة المصرّفة \"GERINGERES\".",
  "38": "\"GERINGERES\" (يُستخدم في الفجوة 37) صيغة صفة مصرّفة -- لا تعمل ظرفاً يصف الفعل \"auftreten\"، و\"DEUTLICH\" (يُستخدم في الفجوة 39) ظرف تكثيف بمعنى مختلف؛ وصف انخفاض التكرار (يحدث بشكل أقل) يستدعي الظرف غير المصرّف \"WENIGER\".",
  "39": "\"GERINGERES\" (يُستخدم في الفجوة 37) صفة مصرّفة بمعنى مختلف، و\"ZWAR\" (يُستخدم في الفجوة 33) أداة تمهيد -- معنى مختلف تماماً؛ تكثيف صفة المقارنة (أفضل بشكل واضح) يستدعي \"DEUTLICH\".",
  "40": "\"GEGENSATZ\" (تضاد) اسم قريب الشكل والمعنى لكنه لا يكوّن التعبير الثابت \"das Gegenteil ergeben\"، و\"DIESELBE\" (يُستخدم في الفجوة 35 بمعنى \"نفسها\") -- معنى معاكس تماماً؛ التعبير الثابت يستلزم \"GEGENTEIL\" حصراً.",
};

async function deepenExercise(title, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 2;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  await applyToId(rows[0].id, title, wrongMap);
}

async function applyToId(id, label, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where id = '${id}';`);
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  console.log(`${label} (${id}): updated explanation_wrong for ${Object.keys(wrongMap).length} gaps`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function main() {
  await deepenExercise("Hase im Display", HASE_WRONG);
  await applyToId("9cdcbd4e-d3d6-47bb-8c1a-3de0d9240d32", "Im Restaurant ( Original )", RESTAURANT_ORIGINAL_WRONG);
  await applyToId("064a85e9-14a6-4cb9-afb3-80f371593215", "Im Restaurant (معدل)", RESTAURANT_MODIFIZIERT_WRONG);
  await deepenExercise("Ist der Umgang mit Haustieren gesund für Kleinkinder?", HAUSTIERE_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

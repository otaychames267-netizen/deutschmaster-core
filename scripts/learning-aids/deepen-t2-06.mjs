/**
 * Deepen T2 #06: "Es gibt immer weniger Deutsche", "Fische sind
 * schlauer, als wir denken", "Garten in der Stadt".
 *
 * Usage: node scripts/learning-aids/deepen-t2-06.mjs [--apply]
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

const DEUTSCHE_WRONG = {
  "31": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"STATT\" (بدلاً من) حرف جر آخر بمعنى مختلف تماماً؛ التعبير الثابت \"nach Angaben von\" (وفقاً لبيانات) يستلزم \"NACH\" حصراً.",
  "32": "\"ÜBERHEBLICH\" (متعجرف) صفة غير ذات صلة إطلاقاً، و\"BESCHEIDEN\" (متواضع) صفة بمعنى مختلف تماماً (يوحي بضآلة لا حدة) -- عكس المعنى المطلوب؛ وصف حدة التغيّر (انخفاض حاد) يستدعي \"DRASTISCH\".",
  "33": "\"ERHÖHEN\" (يرفع) فعل غير ذي صلة، و\"STEIGEN\" (يُستخدم في الفجوة 35 بمعنى \"يرتفع\") فعل آخر -- لا يكوّن التعبير الثابت \"mit etwas rechnen\" (يتوقع)؛ هذا يستلزم \"RECHNEN\" حصراً.",
  "34": "\"STATT\" (بدلاً من) حرف جر بمعنى الاستبدال -- لا السببية، و\"AN\" حرف جر مختلف تماماً؛ تفسير سبب المشاكل يستدعي \"AUFGRUND\".",
  "35": "\"ERHÖHEN\" فعل متعدٍ يحتاج مفعولاً به مباشراً (شخصاً يرفع شيئاً) -- لا يناسب الفاعل نفسه وهو يرتفع ذاتياً هنا (متوسط العمر)، و\"RECHNEN\" (يُستخدم في الفجوة 33) فعل مختلف تماماً؛ وصف ارتفاع رقمي تدريجي ذاتي يستدعي الفعل اللازم \"STEIGEN\".",
  "36": "\"ÜBERHEBLICH\" (متعجرف) صفة غير ذات صلة بسهولة الاستنتاج، و\"BESCHEIDEN\" (متواضع) صفة أخرى غير ذات صلة؛ وصف سهولة الاستنتاج (يمكن تخمينه دون صعوبة) يستدعي \"UNSCHWER\".",
  "37": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا الفعل المركّب، و\"FÜR\" (يُستخدم في الفجوة 38) حرف جر آخر -- لا يقترن بالفعل \"einstellen\" بهذا المعنى؛ التعبير الثابت \"sich einstellen auf\" (يتكيّف مع) يستلزم \"AUF\" حصراً.",
  "38": "\"AUF\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يقترن بالفعل \"interessieren\"، و\"AN\" حرف جر مختلف تماماً؛ التعبير الثابت \"sich interessieren für\" يستلزم \"FÜR\" حصراً.",
  "39": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AUF\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يقترن بـ\"Konsum\" بهذا المعنى؛ التعبير الثابت \"im Konsum\" يستلزم \"IM\" حصراً.",
  "40": "\"ERHÖHEN\" (يرفع) فعل غير ذي صلة بحل المشاكل، و\"STEIGEN\" (يُستخدم في الفجوة 35 بمعنى \"يرتفع\") فعل آخر غير ذي صلة؛ التعبير الثابت \"Probleme beheben\" (يحل المشاكل) يستلزم \"BEHEBEN\" حصراً.",
};

const FISCHE_WRONG = {
  "31": "\"DEUTLICH\" (بوضوح) ظرف تكثيف لكنه لا يكوّن التعبير الثابت \"genau das Gegenteil\" (العكس تماماً)، و\"DENN\" أداة ربط -- لا تعمل ظرف تأكيد؛ التأكيد الحاسم على النفي يستدعي \"GENAU\".",
  "32": "\"DEUTLICH\" (بوضوح) ظرف -- معنى مختلف تماماً، و\"BETRACHTUNG\" (تأمل/نظرة) اسم -- لا يعمل صفة؛ التعبير الثابت \"zu etwas fähig sein\" يستلزم الصفة \"FÄHIG\" حصراً.",
  "33": "\"ENTWARFEN\" (من الفعل entwerfen بمعنى \"يصمم/يخطط\") فعل يشبه \"entwickelten\" شكلاً لكنه مختلف جذرياً في المعنى (لا علاقة له بالتطور التدريجي عبر الزمن)، و\"DER\" أداة تعريف -- لا يعمل فعلاً؛ وصف تطور تاريخي تدريجي يستدعي \"ENTWICKELTEN\" حصراً.",
  "34": "\"BETRACHTUNG\" (تأمل/نظر) اسم قريب الشكل لكنه لا يكوّن التعبير الثابت \"lernen durch Beobachtung\" (يتعلم بالملاحظة النشطة)، و\"DEUTLICH\" ظرف -- لا يعمل اسماً؛ هذا التعبير يستلزم \"BEOBACHTUNG\" حصراً.",
  "35": "\"DOCH\" (يُستخدم في الفجوة 37 بمعنى \"لكن\") أداة تعارض -- معنى مختلف تماماً، و\"DENN\" أداة ربط سببية -- لا تعزز نفياً مستمراً؛ تعزيز النفي بذكر استمراريته حتى فترة معينة يستدعي \"NOCH\".",
  "36": "\"DOCH\" (يُستخدم في الفجوة 37) أداة تعارض -- معنى مختلف تماماً عن الاستطراد، و\"DEUTLICH\" (بوضوح) ظرف كيفية -- لا يقدّم ملاحظة جانبية؛ إضافة معلومة جانبية عرضية تستدعي \"ÜBRIGENS\".",
  "37": "\"DENN\" أداة ربط تنسيقية -- لا تتبعها هنا صيغة سؤال بترتيب الفعل قبل الفاعل بنفس الطبيعية، و\"ÜBRIGENS\" (يُستخدم في الفجوة 36) ظرف استطرادي -- معنى مختلف؛ الانتقال لسؤال تأملي جديد يستدعي \"DOCH\".",
  "38": "\"ALS\" (يُستخدم في الفجوة 39) أداة مقارنة -- لا تكوّن هذا التعبير، و\"DER\" أداة تعريف -- لا تعمل حرف جر؛ التعبير الثابت \"für intelligent halten\" (يعتبر ذكياً) يستلزم \"FÜR\" حصراً.",
  "39": "\"FÜR\" (يُستخدم في الفجوة 38) حرف جر -- معنى مختلف تماماً عن المقارنة، و\"WER\" (يُستخدم في الفجوة 40) أداة استفهام -- لا تصلح للمقارنة؛ المقارنة بين نوعين مختلفين من الظروف تستدعي \"ALS\".",
  "40": "\"DER\" ضمير إشاري/موصول يستلزم مرجعاً محدداً معروفاً مسبقاً -- لا صياغة نصيحة عامة لأي شخص مجهول الهوية، و\"ALS\" (يُستخدم في الفجوة 39) أداة مقارنة -- معنى مختلف تماماً؛ النصيحة العامة الموجهة لأي شخص مهتم (من أراد أن...) تستدعي \"WER\".",
};

const GARTEN_WRONG = {
  "31": "\"ERZOGEN\" (تربّى) صيغة فاعل ثانٍ لفعل مختلف تماماً (لا علاقة له بالتسجيل في قائمة انتظار)، و\"BEZÜCHTET\" ليست صيغة فعل ألمانية صحيحة (تشابه شكلي مضلل مع \"gezüchtet\" في الفجوة 32) ولا تصلح مصدراً بعد \"lassen sich... auf\"؛ التعبير الثابت \"sich auf eine Warteliste setzen lassen\" يستلزم المصدر \"SETZEN\" حصراً.",
  "32": "\"BEZÜCHTET\" ليست كلمة ألمانية صحيحة (تشابه شكلي مضلل فقط)، و\"ERZOGEN\" (تربّى) صيغة فاعل ثانٍ لكن بمعنى \"التربية\" (للأشخاص/الحيوانات) لا \"الزراعة\" (للنباتات)؛ وصف عملية زراعة الزهور في مبني للمجهول يستدعي \"GEZÜCHTET\" حصراً.",
  "33": "\"KLEIN\" (صغير) صفة -- لا تعمل اسماً فاعلاً للجملة، و\"KEIN\" أداة نفي -- لا تصلح أيضاً؛ التعبير الثابت \"die Vorteile liegen auf der Hand\" (المزايا واضحة جلياً) يستلزم الاسم \"VORTEILE\" حصراً.",
  "34": "\"KLEIN\" (صغير) صفة بالصيغة الأساسية لا صيغة المقارنة، و\"VON\" حرف جر -- لا يعمل صفة مقارنة؛ بنية \"je...desto\" تفرض صيغة المقارنة \"HÖHER\" حصراً.",
  "35": "\"VON\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"ES\" ضمير -- لا يعمل حرف جر؛ التعبير الثابت \"Schutz vor\" (حماية من) يستلزم \"VOR\" حصراً.",
  "36": "\"SOLCHE\" (يُستخدم في الفجوة 39) أداة إشارة -- لا تعمل ضميراً فاعلاً شكلياً، و\"KEIN\" أداة نفي -- لا تصلح أيضاً؛ التركيب غير الشخصي لوصف حالة طبيعية (تُورق وتُزهر) يستلزم الضمير الشكلي \"ES\" حصراً.",
  "37": "\"KLEIN\" (صغير) صفة غير ذات صلة، و\"HÖHER\" (يُستخدم في الفجوة 34) صيغة مقارنة -- معنى مختلف تماماً؛ التأكيد على بساطة الشعور الإيجابي يستدعي الظرف \"EINFACH\".",
  "38": "\"DADURCH\" (يُستخدم في الفجوة 40 بمعنى \"بذلك\") ضمير ظرفي -- معنى مختلف تماماً عن التحول الزمني، و\"ES\" ضمير شكلي -- لا يعمل ظرف زمن؛ الإشارة لتحول حديث في الإدراك يستدعي \"MITTLERWEILE\".",
  "39": "\"KLEIN\" (صغير) صفة وصفية عادية -- لا تشير لفكرة سابقة، و\"KEIN\" أداة نفي -- معنى مختلف تماماً؛ الإشارة لفكرة سابقة (المساحات الخضراء) تستدعي أداة الإشارة \"SOLCHE\".",
  "40": "\"MITTLERWEILE\" (يُستخدم في الفجوة 38 بمعنى \"في هذه الأثناء\") ظرف زمن -- معنى مختلف تماماً عن السببية، و\"VON\" حرف جر بسيط -- لا يعمل ضميراً ظرفياً يشير لسبب سابق؛ الإشارة لنتيجة مترتبة على سبب سابق تستدعي \"DADURCH\".",
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
  await deepenExercise("Es gibt immer weniger Deutsche", DEUTSCHE_WRONG);
  await deepenExercise("Fische sind schlauer, als wir denken", FISCHE_WRONG);
  await deepenExercise("Garten in der Stadt", GARTEN_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

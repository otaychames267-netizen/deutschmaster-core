/**
 * Deepen T1 #19 (FINAL Teil-1 batch): "Ramon", "Theatertournee durch
 * Spanien", "Vanessa". "Ramon" is an exact template-twin of "Lieber
 * Thomas" (deepen-t1-15) -- identical gaps and options -- so its
 * distractor reasoning is reused directly rather than re-derived.
 *
 * Usage: node scripts/learning-aids/deepen-t1-19.mjs [--apply]
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

const RAMON_WRONG = {
  "21": "\"trotz\" حرف جر يحتاج اسماً بحالة الملكية بعده مباشرة -- لا جملة كاملة بفعل مصرّف (hatte)، و\"während\" (أثناء) ظرف/أداة زمنية -- لا تصوغ تناقضاً.",
  "22": "\"hat\" فعل مساعد للماضي التام العادي -- لا يميّز الأسبقية الزمنية المطلوبة بعد \"bevor\" مع فعل رئيسي ماضٍ، و\"hätte\" صيغة حال افتراضي -- لا سرد واقعي.",
  "23": "\"konnte\" (استطعتُ) يفيد قدرة، و\"sollte\" (كان يُفترض) يفيد توجيهاً خارجياً -- لا يناسبان نية شخصية داخلية (التفكير في تغيير الرأي) كما يفعل \"wollte\".",
  "24": "\"dafür\" ترتبط بأفعال أخرى، و\"damit\" ترتبط بجمل الغرض -- التعبير الثابت \"nichts hören wollen von\" يستلزم \"davon\".",
  "25": "\"weder...noch\" تنفي الأمرين معاً -- عكس المعنى (شعرت بكليهما فعلاً)، و\"zwar...aber\" تصوغ تنازلاً/تبايناً -- لا وصفاً لشعورين متزامنين متكاملين كما تفعل \"einerseits...andererseits\".",
  "26": "\"davon\" ترتبط بأفعال أخرى مثل \"abhängen von\"، و\"dazu\" ترتبط بتعابير أخرى -- التعبير الثابت \"helfen bei\" يستلزم الضمير الظرفي \"dabei\".",
  "27": "\"aussuchen\" مصدر مجرد ناقص \"zu\" الإلزامية بعد \"helfen, zu+Infinitiv\" (مع فعل منفصل يُدرَج \"zu\" بين البادئة والجذع)، و\"ausgesucht\" صيغة الفاعل الثاني -- لا تناسب هذا التركيب.",
  "28": "\"grundlegenden\" نهاية التصريف الضعيف -- بينما \"einige\" (بلا أداة تعريف) تستلزم التصريف القوي بنهاية \"-e\" للجمع بحالة النصب، و\"grundlegender\" حالة رفع مذكرة أو ملكية -- لا تناسب الجمع المنصوب هنا.",
  "29": "\"am\" (an+dem) حرف جر مختلف، و\"zum\" (zu+dem) يكرر حرف الجر \"zu\" الموجود أصلاً لاحقاً في التعبير -- التعبير الثابت \"im Gegensatz zu\" يستلزم \"im\" حصراً.",
  "30": "\"dass\" تصوغ جملة خبرية مؤكدة -- لا سؤالاً عن الكيفية، و\"ob\" (هل) تصوغ سؤالاً بنعم/لا -- بينما الجملة تسأل عن \"الكيفية\" التي يستلزمها \"wie\".",
};

const THEATERTOURNEE_WRONG = {
  "21": "\"aus\" (من) لا تصف تنقلاً عبر بلد، و\"von\" (من) حرف جر مختلف تماماً -- التعبير الثابت \"Tour durch\" (جولة عبر) يستلزم \"durch\".",
  "22": "\"eine\" حالة رفع/نصب -- لا تناسب حالة الجر بعد \"mit\"، و\"einen\" حالة نصب مذكرة -- بينما \"Gruppe\" اسم مؤنث بحالة الجر يستلزم \"einer\".",
  "23": "\"dich\" حالة نصب -- بينما التعبير الثابت \"sich (Dativ) etwas denken können\" يستلزم حالة الجر، و\"sich\" ضمير انعكاسي للغائب -- لا يطابق المخاطَب.",
  "24": "\"aufregend\" (مثير) يصف شيئاً يسبب الإثارة -- لا حالة الفاعل نفسه، و\"aufzuregen\" مصدر بـ\"zu\" -- لا يعمل صفة محمول هنا؛ وصف الحالة النفسية للفاعل نفسه يستلزم Partizip II: aufgeregt.",
  "25": "\"weil\" (لأن) سببية -- معنى مختلف تماماً، و\"zwar\" تحتاج \"aber\" في تركيب مختلف -- لا تناسب هذا الموضع كأداة ربط تابعة؛ التناقض بين التوتر والطلاقة يستلزم \"obwohl\".",
  "26": "\"In\" بلا إدماج مع أداة التعريف -- غير صحيح نحوياً هنا، و\"Während\" (أثناء) أداة/ظرف مختلف تماماً -- التعبير الزمني الثابت \"im Herbst\" يستلزم \"Im\".",
  "27": "\"hätte\" فعل مختلف (haben) لا يقترن بـ\"wiedersehen\" هنا، و\"wurde\" ماضٍ بسيط -- لا يعبّر عن رغبة افتراضية حالية قوية؛ هذا يستلزم Konjunktiv II: würde.",
  "28": "\"müssen\" (يجب) يفيد إلزاماً، و\"sollen\" (ينبغي) يفيد توصية -- لا يناسبان قدرة تحققت بفضل مساعدة الآخرين كما يفيده \"können\".",
  "29": "\"damit\" ترتبط بجمل الغرض، و\"dazu\" ترتبط بأفعال أخرى -- التعبير الثابت \"ein bisschen davon haben\" (شيء منه) يستلزم \"davon\".",
  "30": "\"wiederfinden\" مصدر -- لا يناسب الفعل المساعد \"habe\" الذي يستلزم صيغة الفاعل الثاني، و\"wiederzufinden\" مصدر بـ\"zu\" -- لا يصلح هنا أيضاً؛ زمن الماضي التام يستلزم: wiedergefunden.",
};

const VANESSA_WRONG = {
  "21": "\"an den\" لا يقترن بالفعل \"sich freuen\" بهذا المعنى، و\"auf dem\" تناسب التطلع لأمر مستقبلي (sich freuen auf) -- لا الفرح بشيء مُستلَم فعلاً (رسالة) كما يفيده \"über den\".",
  "22": "\"noch nicht\" (لم يحدث بعد) توحي بانتظار حدث مستقبلي -- لا انقطاع تواصل مستمر بالفعل، و\"keines\" (لا شيء من كذا) ضمير نفي محدد -- لا يناسب هذا المعنى العام؛ هذا يستلزم \"nichts mehr\".",
  "23": "\"eben\" أداة تلطيف لكن بمعنى مختلف (\"بالضبط\")، و\"überhaupt\" (على الإطلاق) ظرف تكثيف -- لا يناسب تأكيد معرفة مشتركة مفترضة كما تفعل \"doch\".",
  "24": "\"Wann\" (متى) أداة استفهام زمنية، و\"Was\" (ماذا) تسأل عن شيء محدد -- لا تناسبان السؤال عن \"الحال/الوضع\" الذي يستلزم \"Wie\".",
  "25": "\"die\" حالة رفع/نصب -- لا تناسب حالة الملكية، و\"von\" حرف جر بديل أقل شيوعاً -- التعبير الثابت \"am Fuß + Genitiv\" يستلزم أداة الملكية الجمعية المباشرة: der.",
  "26": "\"gelaufen\" فاعل ثانٍ لفعل مختلف تماماً \"laufen\" (يمشي) -- لا علاقة له بالألم، و\"geworden\" (أصبح) معنى مختلف كلياً -- التعبير الثابت \"weh tun\" يستلزم \"getan\".",
  "27": "\"durchfallen\" (يرسب/يسقط عبر) معنى مختلف تماماً (كالرسوب في امتحان)، و\"wegfallen\" (يُستبعد/يسقط) يصف إلغاء شيء -- لا انهياراً جسدياً من الإرهاق كما يفيده \"umfallen\".",
  "28": "\"dich\" حالة نصب -- بينما التعبير الثابت \"sich (Dativ) etwas vorstellen\" يستلزم حالة الجر، و\"mal\" أداة تلطيف -- لا تعمل ضميراً انعكاسياً إطلاقاً.",
  "29": "\"alle\" (كل، جمع) لا تناسب الاسم المفرد \"Menge\"، و\"ganze\" (كامل) لا تكوّن التعبير الثابت \"jede Menge\" (الكثير من) -- هذا يستلزم \"jede\".",
  "30": "\"dabei\" و\"davon\" يرتبطان بأفعال أخرى -- التعبير الثابت \"aufhören mit\" (يتوقف عن) يستلزم الضمير الظرفي \"damit\".",
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
  await deepenExercise("Ramon", RAMON_WRONG);
  await deepenExercise("Theatertournee durch Spanien", THEATERTOURNEE_WRONG);
  await deepenExercise("Vanessa", VANESSA_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

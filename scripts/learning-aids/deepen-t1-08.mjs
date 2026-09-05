/**
 * Deepen T1 #8: "Herr Martini ( Original )", "Herr Martini (معدل)",
 * "Herr Wenzel" -- same distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-08.mjs [--apply]
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

const MARTINI_SHARED_WRONG = {
  "22": "\"ankommenden\" صيغة غير معتادة بهذا المعنى (تتعلق بـ\"الوصول\" لا بوصف شهر قادم)، و\"gekommenen\" صيغة فاعل ثانٍ تعني \"الذي أتى/انقضى\" -- عكس معنى \"القادم\" المقصود.",
  "23": "\"aus\" و\"mit\" لا يقترنان بالفعل \"auswählen\" بهذا المعنى -- التعبير الثابت \"nach Kriterien auswählen\" (يختار وفق معايير) يستلزم \"nach\" حصراً.",
  "24": "\"fordern\" (يطالب) معنى معاكس (الأسرة تقدّم لا تطالب)، و\"nehmen\" (يأخذ) معنى مختلف -- لا يصف تقديم الإقامة.",
  "25": "\"weil\" (لأن) تعكس اتجاه المنطق (نتيجة لا سبب)، و\"wenn\" أداة شرطية -- لا تصف نتيجة حتمية مترتبة كما تفعل \"so dass\".",
  "26": "\"Verbunden von\" و\"Zusammen neben\" ليسا تعبيرين ألمانيين ثابتين صحيحين -- التعبير الشائع للمشاركة في نشاط هو \"gemeinsam mit\" حصراً.",
  "28": "\"hat geplant\" فعل نشط يفترض فاعلاً منفذاً محدداً (نحن خططنا)، لا وصف حالة، و\"wird geplant haben\" زمن مستقبل تام معقد وغير مناسب -- المقصود وصف حالة تخطيط قائمة الآن بالمبني للمجهول الحالي: ist geplant.",
  "29": "\"gesprochen\" فاعل ثانٍ لفعل \"sprechen\" (يتكلم) غير متعدٍ -- لا يأخذ مفعولاً به مباشراً كـ\"Aspekte\"، و\"versprochen\" فاعل ثانٍ لفعل \"versprechen\" (يعِد) -- معنى مختلف تماماً.",
  "30": "\"hatten\" صيغة ماضٍ -- لا تناسب أملاً بشأن المستقبل، و\"hätten\" صيغة حال افتراضي -- لا يستلزمها التعبير عن أمل حقيقي بسيط بعد \"hoffen, dass\".",
};

const MARTINI_ORIGINAL_WRONG = {
  ...MARTINI_SHARED_WRONG,
  "21": "\"an\" لا يقترن بـ\"Anfrage\" بهذا المعنى، و\"von\" (من) تُستخدم أصلاً في الجملة للدلالة على تاريخ الاستفسار (vom 16. Juni) -- لا تصلح لتكرار الإشارة للموضوع؛ \"Anfrage zu etwas\" يستلزم \"zu\".",
  "27": "\"die Ansicht\" تعني \"الرأي/المنظر\" -- معنى مختلف تماماً، و\"das Betrachten\" (التأمل/النظر) أضيق من معنى \"زيارة\" الكامل لمتحف أو معرض.",
};

const MARTINI_MOD_WRONG = {
  ...MARTINI_SHARED_WRONG,
  "21": "\"Seiner\" (له/لها) ضمير ملكية للغائب -- لا يطابق المخاطَب، و\"Deiner\" (لك) صيغة غير رسمية (du) -- لا تناسب أسلوب الرسالة الرسمي الذي يستخدم \"Sie\".",
  "27": "\"die\" وحدها (أداة تعريف مجردة) لا تكوّن عبارة اسمية مكتملة المعنى هنا، و\"das Betrachten\" (التأمل/النظر) أضيق من معنى \"زيارة\" الكامل لمتحف أو معرض.",
};

const WENZEL_WRONG = {
  "21": "\"auf\" لا يقترن بـ\"Dank\" بهذا المعنى، و\"wegen\" (بسبب) حرف جر سببي -- التعبير الثابت \"Dank für etwas\" يستلزم \"für\" حصراً.",
  "22": "\"jeden\" (كل) محدد يحتاج اسماً تالياً مباشرة، لا يقف ظرفاً مستقلاً هنا، و\"jedoch\" (لكن) أداة تضاد -- معنى مختلف تماماً.",
  "23": "\"gedacht\" يقترن عادة بـ\"für\" (مُخصَّص لـ) لا بصيغة الجملة هنا، و\"geeignet\" (مناسب) معنى مختلف (الملاءمة لا التخصيص) -- التعبير الثابت \"einem Aspekt gewidmet sein\" يستلزم \"gewidmet\".",
  "24": "\"vorbereitend\" صيغة بلا نهاية تصريف -- لا تناسب موقعها كصفة قبل اسم جمع بعد \"mehrere\"، و\"vorbereiteten\" صيغة الفاعل الثاني (الذي أُعِدَّ مسبقاً) -- معنى مختلف عن \"تحضيرية\" (الغرض منها التحضير).",
  "25": "\"am meisten\" صيغة ظرفية تُستخدم مع الأفعال (الأكثر)، لا كمحدد كمّي قبل اسم، و\"meistens\" (عادةً/غالباً) ظرف تكرار -- معنى مختلف تماماً عن \"معظم\" الكمّية.",
  "26": "\"gegenüber\" (مقابل) تصف موقعاً مواجهاً لا مساراً، و\"während\" (أثناء) ظرف زمني -- معنى مختلف تماماً عن \"على طول\" مسار جغرافي.",
  "27": "\"hinter\" و\"neben\" لا يكوّنان التعبير المجازي الثابت \"auf den Spuren\" (على خطى) -- هذا التعبير يستلزم \"auf\" حصراً.",
  "28": "\"der\" حالة رفع -- لا تعبّر عن الملكية، و\"dessen\" حالة ملكية مفردة مذكرة/محايدة -- بينما المرجع هنا جمع (Wissenschaftlern) يستلزم \"deren\".",
  "29": "\"sogar\" (حتى) أداة تكثيف -- معنى مختلف تماماً، و\"sogleich\" (فوراً) ظرف زمني -- لا يصوغ شرطاً كما تفعل \"sofern\".",
  "30": "\"erhältlich\" (متوفر للشراء) يصف سلعاً لا مكتباً يمكن التواصل معه، و\"wirksam\" (فعّال) معنى مختلف تماماً.",
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
  await deepenExercise("Herr Martini ( Original )", MARTINI_ORIGINAL_WRONG);
  await deepenExercise("Herr Martini (معدل)", MARTINI_MOD_WRONG);
  await deepenExercise("Herr Wenzel", WENZEL_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

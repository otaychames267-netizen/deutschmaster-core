/**
 * Deepen T1 #7: "HausbewohnerInnen", "Herr Dr. Dobromil", "Herr Dr.
 * Moosberger" -- same distractor-reasoning pattern. Dobromil/Moosberger
 * are near-twin letters (like Andrea/David) with several identical gaps
 * and a few genuinely different ones (23, 25, 28).
 *
 * Usage: node scripts/learning-aids/deepen-t1-07.mjs [--apply]
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

const HAUSBEWOHNER_WRONG = {
  "21": "\"Damit\" أداة غرض تحتاج جملة ثانوية تالية -- لا تقف مستقلة هنا، و\"So\" (هكذا) عامة جداً -- لا تشير تحديداً للهدف المذكور سابقاً (التجهيز الشتوي) كما تفعل \"Dafür\".",
  "22": "\"sind\" فعل مساعد خاطئ -- لا يكوّن المبني للمجهول مع \"durchgeführt\"، و\"können\" فعل وجهي يغيّر المعنى إلى إمكانية عامة -- لا تنفيذاً مخططاً فعلياً.",
  "23": "\"bei\" لا تعبّر عن موعد نهائي، و\"vor\" (قبل) قريبة زمنياً لكنها لا تكوّن التعبير الثابت \"bis zu + موعد\" للدلالة على المهلة النهائية.",
  "24": "\"beheben\" مصدر لا يناسب تركيب \"werden...müssen\" الذي يستلزم صيغة الفاعل الثاني، و\"behebt\" صيغة مضارع مصرّفة -- لا تتوافق مع هذا التركيب المبني للمجهول الوجهي.",
  "25": "\"dass\" تصوغ جملة خبرية لا جملة غرض، و\"für\" لا تكوّن تركيب غرض بصيغة المصدر -- الصيغة الصحيحة للغرض هنا \"um...zu\" حصراً.",
  "26": "\"verhindern\" (يمنع) معنى معاكس تماماً (يريدون تسهيل الوصول لا منعه)، و\"vergessen\" (ينسى) معنى مختلف كلياً.",
  "27": "\"einiger\" (بعض) معنى مختلف تماماً، و\"letzte\" حالة رفع/نصب -- لا تناسب حالة الجر التي يستلزمها حرف الجر \"in\" في هذا التعبير الثابت.",
  "28": "\"weswegen\" (لأي سبب) أداة استفهام/وصل -- معنى مختلف، و\"weil\" (لأن) سببية -- لا تكمل التعبير الثابت \"darauf achten, dass\" الذي يستلزم \"dass\" حصراً.",
  "29": "\"Bälle\" حالة رفع/نصب جمعية بلا -n -- لا تناسب حالة الجر بعد \"mit\"، و\"Ballen\" كلمة مختلفة تماماً تعني \"بالة/حزمة\" لا \"كرات\".",
  "30": "\"freundliche\" حالة رفع/نصب -- لا تناسب حالة الجر بعد \"mit\"، و\"freundlichem\" حالة جر مفردة -- بينما \"Grüßen\" اسم جمع يستلزم نهاية \"-en\".",
};

const DOB_MOOS_SHARED_WRONG = {
  "21": "\"allergrößte\" حالة رفع/نصب -- لا تناسب حالة الجر بعد \"mit\"، و\"allergrößten\" نهاية تناسب المذكر/الجمع في حالة الجر -- بينما \"Interesse\" اسم محايد يستلزم \"-em\": allergrößtem.",
  "22": "\"an dem\" و\"auf dem\" حرفا جر لا يعبّران عن \"ضمن مضمون\" الإعلان -- المعنى المقصود (البحث داخل الإعلان) يستلزم \"in dem\".",
  "24": "\"können\" مصدر مجرد ناقص \"zu\" الإلزامية بعد \"es reizt mich, zu+Infinitiv\"، و\"könnte\" صيغة حال افتراضي -- لا تناسب سلسلة المصادر المتتالية هنا.",
  "26": "\"durch ein Jahr\" ليست صيغة ألمانية معتادة للتعبير عن مدة، و\"seit einem Jahr\" (منذ عام) توحي باستمرار حتى الآن -- بينما النص يصف عاماً مكتملاً في الماضي انتهى بالانتقال للجامعة.",
  "27": "\"erfand\" (اخترع) معنى غير منطقي مع \"حب/شغف\"، و\"merkte\" (لاحظ) فعل أضعف من المقصود -- لا يكوّن التعبير الثابت \"seine Liebe entdecken\".",
  "29": "\"teils...teils\" (جزئياً...جزئياً) توحي بتجزئة الشيء -- لا شمولاً كاملاً، و\"weder...noch\" (لا...ولا) تنفي كليهما -- عكس المعنى المقصود (معرفة شاملة بالمنطقتين).",
  "30": "\"auf Ihre Anzeige antworten\" مصدر مجرد ناقص \"zu\" الإلزامية بعد \"sich entschließen\"، و\"um auf Ihre Anzeige zu antworten\" يضيف \"um\" زائدة -- الفعل \"sich entschließen\" يقترن بـ\"zu+Infinitiv\" مباشرة دون \"um\".",
};

const DOBROMIL_WRONG = {
  ...DOB_MOOS_SHARED_WRONG,
  "23": "\"Ihrem\" مكرر في التصريف مع أداة التعريف \"dem\" السابقة عليه (يكفي أحدهما ليحمل علامة الجر)؛ الصحيح بعد \"dem\" هو التصريف الضعيف بنهاية \"-en\"، و\"Ihres\" حالة ملكية خاطئة تماماً هنا.",
  "25": "\"an\" و\"mit\" لا يقترنان بتعبير \"eine Lehre bei einer Firma\" (تدريب مهني لدى شركة) -- هذا التعبير يستلزم \"bei\" حصراً.",
  "28": "\"das\" و\"welches\" ضميرا وصل/إشارة عاديان -- لا يكوّنان التعبير الاصطلاحي الثابت \"was...angeht\" (فيما يخص) الذي يستلزم \"was\" حصراً.",
};

const MOOSBERGER_WRONG = {
  ...DOB_MOOS_SHARED_WRONG,
  "23": "\"als\" تُستخدم في مقارنة تفضيل (أكثر من)، لا مقارنة تساوٍ، و\"wie\" هي الجزء الثاني من التركيب الثابت -- لا يمكنها شغل موضع الجزء الأول \"so\" هنا.",
  "25": "\"beging\" (ارتكب/احتفل بـ) فعل مختلف تماماً لا يقترن بـ\"Lehre\"، و\"belief\" (بلغ/وصل إلى) فعل مختلف كلياً يُستخدم للمبالغ لا لبدء تدريب.",
  "28": "\"Dabei\" و\"Inzwischen\" ظرفان مستقلان -- لا يصلحان حرفي جر يسبقان اسمين بحالة الملكية كما يفعل \"Während\".",
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
  await deepenExercise("HausbewohnerInnen", HAUSBEWOHNER_WRONG);
  await deepenExercise("Herr Dr. Dobromil", DOBROMIL_WRONG);
  await deepenExercise("Herr Dr. Moosberger", MOOSBERGER_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

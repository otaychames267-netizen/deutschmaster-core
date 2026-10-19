/**
 * Deepen T1 #3: "Daniela", "David ( Original )", "David (معدل)" -- same
 * pattern: adding genuine distractor reasoning to explanation_wrong.
 *
 * Usage: node scripts/learning-aids/deepen-t1-03.mjs [--apply]
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

const DANIELA_WRONG = {
  "21": "\"außerdem\" (علاوة على ذلك) أداة إضافة لا تعبّر عن نية أصلية، و\"überhaupt\" (على الإطلاق) ظرف تعميم لا يحمل معنى \"كانت النية أصلاً\" الذي تحمله \"eigentlich\".",
  "22": "\"er\" ضمير غائب مذكر لا مرجع محدد له في الجملة، و\"es\" ضمير غير شخصي لكنه لا يطابق بنية \"man...man\" العامة المستخدمة في الجملة الرئيسية اللاحقة.",
  "23": "\"der\" ضمير وصل بحالة الرفع -- لا يعبّر عن الملكية (بمساعدته)، و\"seiner\" ضمير ملكية عادي لا يصلح ضميراً موصولاً يربط جملة نسبية.",
  "24": "\"übersetzen\" يعني \"يترجم\" -- معنى مختلف تماماً، و\"übertragen\" يعني \"ينقل/يبث\" -- لا علاقة له بتجاوز فترة صعبة.",
  "25": "\"dass\" تُدخل جملة خبرية مؤكدة لا سؤالاً، و\"falls\" أداة شرطية (في حال) -- لا تناسب نقل سؤال بنعم/لا كما فعلته صديقتها فعلاً.",
  "26": "\"verbringen\" (يقضي وقتاً) قريب المعنى لكنه لا يكوّن التلازم الثابت مع \"etwas Tolles\"، و\"verplanen\" (يخطط/يحجز وقتاً) يوحي بالتنظيم لا بالقيام بنشاط فعلي.",
  "27": "\"recht\" (إلى حد ما) ظرف تكثيف لكنه لا يقترن بـ\"besonders\" بهذا التلازم الثابت، و\"zwar\" (فعلاً/صحيح أنّ) أداة تنازل لا علاقة لها بالتكثيف هنا.",
  "28": "\"auf\" و\"in\" لا يقترنان بالفعل الانعكاسي \"sich interessieren\" بهذا المعنى إطلاقاً -- هذا الفعل يرتبط ثابتاً بـ\"für\" فقط.",
  "29": "\"bestimmt\" و\"sicher\" (بالتأكيد) ظرفا يقين يعبران عن ثقة بحدوث أمر، لا أداتا تلطيف لصيغة الأمر كما تفعل \"doch\".",
  "30": "\"euch\" ضمير المخاطبين (أنتم) لا يطابق الفاعل \"wir\"، و\"sich\" ضمير انعكاسي للغائب -- لا يناسب فاعلاً بصيغة المتكلمين \"wir\" أيضاً.",
};

const DAVID_SHARED_WRONG = {
  "21": "\"ganz\" (تماماً) ظرف تكثيف لكنه لا يقترن بصيغة المقارنة \"schöner\" بهذا الشكل، و\"zwar\" (فعلاً) أداة تنازل لا علاقة لها بتعزيز صيغ المقارنة.",
  "22": "\"jedoch\" و\"trotzdem\" (لكن/رغم ذلك) ظرفان مستقلان يستلزمان ترتيب الفعل الثاني الطبيعي في جملتيهما الخاصة، لا فعلاً في النهاية كما يستلزم \"obwohl\" التابعة.",
  "23": "\"überschauen\" يعني \"يستعرض بنظرة شاملة\" -- معنى مختلف عن زيارة معلم سياحي محدد، و\"vorschauen\" ليس فعلاً ألمانياً معتاداً بهذه الصيغة.",
  "24": "\"konnten\" (استطعنا) ماضي القدرة -- لا يناسب التخطيط المستقبلي، و\"wollten\" (أردنا) ماضي الرغبة -- كلاهما زمن خاطئ؛ السياق يحتاج اقتراحاً مهذباً بصيغة الحاضر الافتراضي \"sollten\".",
  "25": "\"anzukommen wirst\" تركيب غير صحيح (يخلط بين مصدر بـ\"zu\" وفعل مساعد للمستقبل يستلزم مصدراً مجرداً)، و\"wirst ankommen\" يتبع ترتيب الجملة الرئيسية (V2) لا ترتيب السؤال غير المباشر الذي يستلزم الفعل في النهاية.",
  "26": "\"für den Fall\" و\"im Fall\" يحتاجان \"dass\" لاحقة لتكوين أداة ربط كاملة (für den Fall, dass...) -- لا يصلحان بمفردهما ككلمة واحدة هنا كما تفعل \"falls\".",
  "27": "\"neulich\" (مؤخراً) يشير إلى نقطة زمنية ماضية محددة لا استمرارية، و\"vormals\" (سابقاً) يوحي بأمر لم يعد قائماً -- بينما الغرفة ما زالت تُستخدم لهذا الغرض حتى الآن.",
  "28": "\"aufholen\" يعني \"يعوّض/يلحق بالركب\" -- معنى مختلف تماماً، و\"aufsparen\" يعني \"يدّخر/يحتفظ لوقت لاحق\" -- لا علاقة له بتجديد ذكريات قديمة.",
  "29": "\"wann\" أداة استفهام تُستخدم في الأسئلة فقط -- لا كأداة ربط زمنية في جملة خبرية، و\"wo\" (أين) ظرف مكاني -- معنى مختلف تماماً عن الزمن المقصود هنا.",
};

const DAVID_ORIGINAL_WRONG = {
  ...DAVID_SHARED_WRONG,
  "30": "\"geh\" و\"komm\" فعلا أمر مختلفان تماماً (اذهب/تعال) -- لا يكوّنان التعبير الاصطلاحي الثابت \"lass dich überraschen\" الذي يقترن حصراً بالفعل \"lassen\".",
};

const DAVID_MOD_WRONG = {
  ...DAVID_SHARED_WRONG,
  "30": "\"fast\" (تقريباً) يعني أن الأمر يكاد يُصدَّق -- أضعف من المعنى المقصود (يصعب تصديقه فعلاً)، و\"wohl\" (ربما/على الأرجح) أداة تخمين مختلفة تماماً -- لا تكوّن التعبير الثابت \"kaum zu glauben\".",
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
  await deepenExercise("Daniela", DANIELA_WRONG);
  await deepenExercise("David ( Original )", DAVID_ORIGINAL_WRONG);
  await deepenExercise("David (معدل)", DAVID_MOD_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

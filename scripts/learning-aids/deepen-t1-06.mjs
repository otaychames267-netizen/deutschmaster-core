/**
 * Deepen T1 #6: "Frau Stein ( Neu )", "Frau Szabo ( Original )", "Frau
 * Szabo (معدل)" -- same distractor-reasoning pattern.
 *
 * Usage: node scripts/learning-aids/deepen-t1-06.mjs [--apply]
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

const STEIN_WRONG = {
  "21": "\"Ihrem Vortrag\" حالة جر، و\"Ihren Vortrag\" حالة نصب -- كلاهما خاطئ؛ \"anlässlich\" يحكم حالة الملكية (Genitiv) حصراً: Ihres Vortrags.",
  "22": "\"wenn\" أداة شرطية -- لا تصوغ استفساراً غير مباشر، و\"dass\" تُدخل جملة خبرية مؤكدة -- لا سؤالاً بنعم/لا كما يستدعيه الفعل \"anfragen\".",
  "23": "\"und...und\" ليست أداة ربط مزدوجة ثابتة بهذا الشكل، و\"zwar...aber\" (صحيح أنّ...لكن) أداة تنازل -- لا تناسب الجمع البسيط بين عنصرين هنا.",
  "24": "\"bis zu\" تحتاج بنية مختلفة (bis zu + اسم بحالة الجر)، و\"bis vor\" لا يناسب تركيب \"von...bis\" الثابت لتحديد فترة زمنية.",
  "25": "\"denen\" حالة جر -- لا تعبّر عن الملكية (مواضيعها)، و\"die\" حالة رفع/نصب عادية -- لا تصلح ضميراً موصولاً بمعنى الملكية.",
  "26": "\"Vorgetragene\" ليست صيغة شائعة بمعنى \"المحاضِرة\" (بل تعني تقريباً \"الشيء المُلقى\")، و\"Vortrag\" اسم يعني \"المحاضرة\" نفسها -- لا الشخص القائم بها.",
  "27": "\"geredet haben\" صيغة ماضٍ تام لا تناسب التعبير الثابت \"die Möglichkeit geben, zu+Infinitiv\"، و\"sprechen\" مصدر مجرد ناقص \"zu\" الإلزامية هنا.",
  "28": "\"zu Hilfe\" تعبير ثابت مختلف بمعنى \"للنجدة\"، و\"zum Benutzen\" ليست تعبيراً ثابتاً يقترن بـ\"stehen\" -- التعبير الصحيح \"zur Verfügung stehen\" حصراً.",
  "29": "\"eines Tages\" (يوماً ما) تعني نقطة زمنية غير محددة مستقبلاً، و\"für einen Tag\" تعني \"لمدة يوم واحد\" -- كلاهما معنى مختلف عن \"قبل بضعة أيام\" التي تعبّر عنها \"ein paar Tage\".",
  "30": "\"damit\" ترتبط بجمل الغرض، و\"dafür\" ترتبط بأفعال أخرى مثل \"sich interessieren für\" -- الفعل الثابت \"rechnen mit etwas\" يستلزم الضمير الظرفي \"dabei\" (من mit).",
};

const SZABO_SHARED_WRONG = {
  "22": "\"in Betrag\" ليست عبارة ألمانية ثابتة صحيحة، و\"in Summe\" تعني \"إجمالاً/بالمجموع\" -- معنى مختلف عن تحديد مبلغ واحد كما يفعل \"in Höhe von\".",
  "27": "\"ein\" حالة رفع/نصب -- لا تناسب حرف الجر \"zwischen\" الذي يستلزم حالة الجر، و\"einem\" حالة جر لكن بصيغة مذكرة/محايدة -- بينما \"Privatunterkunft\" اسم مؤنث يستلزم \"einer\".",
  "28": "\"Sofort\" (فوراً) ظرف بسيط -- لا يصلح أداة ربط تُدخل جملة ثانوية، و\"Sooft\" (كلما) توحي بالتكرار -- بينما التسجيل حدث واحد لا متكرر.",
  "29": "\"dafür\" و\"dazu\" ضميران ظرفيان -- لا يصلحان لصياغة جملة غرض بفاعل مختلف؛ هذا يستلزم أداة الربط \"damit\".",
};

const SZABO_ORIGINAL_WRONG = {
  ...SZABO_SHARED_WRONG,
  "21": "\"bei\" و\"in\" لا يقترنان بالاسم \"Interesse\" بهذا المعنى -- التعبير الثابت \"Interesse an etwas\" يستلزم \"an\" حصراً.",
  "23": "\"Zur\" تحتاج بنية اسمية مختلفة قليلاً، و\"Zwecks\" حرف جر رسمي يحكم حالة الملكية دون أداة -- لا يتوافق مع صيغة \"besserer Einschätzung\" هنا.",
  "24": "\"angeschlossen\" صيغة الفاعل الثاني -- لا تناسب الفعل المساعد \"wird\" الذي يستلزم مصدراً مجرداً، و\"schließen an\" ترتيب خاطئ -- البادئة المنفصلة \"an\" يجب أن تبقى متصلة بالمصدر: anschließen.",
  "25": "\"anlässlich\" (بمناسبة) لا يناسب هنا (لا حديث عن مناسبة)، و\"mittels\" (بواسطة) يعني \"باستخدام أداة\" -- معنى مختلف عن \"بخصوص/فيما يتعلق بـ\" التي تعبّر عنها \"bezüglich\".",
  "26": "\"als\" تُستخدم في مقارنة تفضيل بسيطة (أكثر من)، لا في تركيب \"so...wie möglich\"، و\"wenn\" أداة شرطية -- لا علاقة لها بهذا التركيب الثابت.",
  "30": "\"Für\" و\"Zu\" لا يقترنان بالتعبير الختامي الثابت \"weitere Fragen\" -- هذا التعبير يستلزم \"Bei\" حصراً.",
};

const SZABO_MOD_WRONG = {
  ...SZABO_SHARED_WRONG,
  "21": "\"dabei\" (بذلك) لا تعني \"مرفق طيه\"، و\"vorbei\" (انتهى/مضى) معنى مختلف تماماً -- التعبير الرسمي لإرفاق مستند هو \"anbei\" حصراً.",
  "23": "\"für\" لا يتوافق مع البنية الاسمية \"zur genaueren Einschätzung\" هنا، و\"zweck\" ليست صيغة صحيحة (الصيغة الصحيحة لو استُخدمت لكانت \"zwecks\"، وحتى هي لا تناسب هذه البنية).",
  "24": "\"durchführen\" و\"veranstalten\" فعلان متعديان يفترضان فاعلاً منفذاً صريحاً (نحن نُجري/ننظّم)، بينما الجملة هنا تصف وقوع الاختبار من تلقاء نفسه بفعل غير متعدٍ: stattfinden.",
  "25": "\"anlässlich\" (بمناسبة) لا يناسب هنا (لا حديث عن مناسبة)، و\"mittels\" (بواسطة) يعني \"باستخدام أداة\" -- معنى مختلف عن \"بخصوص/فيما يتعلق بـ\" التي تعبّر عنها \"bezüglich\".",
  "26": "\"möglich\" (ممكن) صفة عادية -- لا تعمل كظرف تكثيف يسبق صفة أخرى، و\"möglicherweise\" (ربما) ظرف احتمال -- معنى مختلف عن \"أقصى قدر ممكن\" الذي يعبّر عنه \"möglichst\".",
  "30": "\"Für\" لا يقترن بهذا التعبير الختامي الثابت، و\"Als\" (كـ/عندما) معنى مختلف تماماً -- التعبير الصحيح \"Bei weiteren Fragen\" يستلزم \"Bei\".",
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
  await deepenExercise("Frau Stein ( Neu )", STEIN_WRONG);
  await deepenExercise("Frau Szabo ( Original )", SZABO_ORIGINAL_WRONG);
  await deepenExercise("Frau Szabo (معدل)", SZABO_MOD_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

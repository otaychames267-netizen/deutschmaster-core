/**
 * Deepen T1 #5: "Ferdinand, Phillip, Christopher (معدل)", "Frau
 * Goronsksa", "Frau Melchior – Dresden-Reise" -- same distractor-reasoning
 * pattern, plus two real data-completeness fixes in the Ferdinand variant:
 *  - gap 29 was missing its learning_aids entry entirely (only 9/10 gaps
 *    present). Added it. Note: this variant's correct answer is "als"
 *    (forming "nicht nur..., als auch..."), not "sondern" like the
 *    Original -- both "sondern auch" and the less common "als auch" are
 *    real German correlative pairings, so this isn't a bug, just a
 *    different (rarer, more formal-register) construction being tested.
 *  - gap 30's evidence_text had the bold marker on the wrong occurrence
 *    of "einfach" (the sentence has it twice); corrected to bold the one
 *    that's actually the tested gap.
 *
 * Usage: node scripts/learning-aids/deepen-t1-05.mjs [--apply]
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

const FERDINAND_MOD_WRONG = {
  "21": "\"damit\" تُستخدم عند اختلاف فاعلي الجملتين -- والفاعل هنا واحد (ich)، و\"für\" لا تكوّن تركيب الغرض \"für...zu+Infinitiv\" بهذا الشكل.",
  "22": "\"wann\" (متى) تسأل عن الزمن، و\"wo\" (أين) تسأل عن المكان -- لا علاقة لأي منهما بالسؤال عن \"الكيفية\" الذي يستلزم \"wie\".",
  "23": "\"damit\" (لكي) أداة غرض -- معنى مختلف تماماً، و\"denn\" (لأن) تصوغ رابطاً سببياً لا يناسب التضاد مع \"andererseits\".",
  "24": "\"bestimmt\" (بالتأكيد) يعبّر عن يقين بحدوث أمر، لا شدة رغبة، و\"völlig\" (كلياً) ظرف تكثيف لكنه لا يقترن بالفعل \"wollen\" بهذا التلازم الثابت.",
  "25": "\"dich\" ضمير المخاطب (أنت) لا يطابق الفاعل \"ich\"، و\"sich\" ضمير انعكاسي للغائب -- لا يناسب فاعلاً بصيغة المتكلم \"ich\" أيضاً.",
  "26": "\"da\" (بما أنّ) أداة سببية -- معنى مختلف، و\"wenn\" توحي بتكرار أو شرط عام -- بينما الحدث هنا فترة ماضية محددة تستلزم \"als\".",
  "27": "\"jetzigen\" (الحالية) تشير إلى الحاضر لا المستقبل، و\"letzten\" (الماضية) عكس المعنى تماماً -- السؤال عن خطط قادمة يستلزم \"kommenden\".",
  "28": "\"danach\" ترتبط بأفعال أخرى مثل \"fragen danach\"، و\"darüber\" ترتبط بـ\"sich freuen über\" -- التعبير الثابت \"Lust zu etwas haben\" يستلزم \"dazu\".",
  "29": "\"ebenso\" (بالمثل) ظرف مستقل لا يكوّن تركيباً ثابتاً مع \"nicht nur\"، و\"oder\" (أو) يصوغ بديلاً منفصلاً -- لا يناسب المعنى الإضافي المقصود.",
  "30": "\"einen\" أداة تنكير غير محددة لا تصلح ظرفاً هنا، و\"einzig\" (الوحيد) صفة حصر -- لا تناسب نبرة التخفيف العفوية المقصودة بـ\"einfach\" (ببساطة).",
};

const FERDINAND_MOD_GAP29 = {
  item_type: "conjunction",
  keyword: "als auch (mit nicht nur, seltener als sondern auch)",
  evidence_text: "die haben nicht nur sehr leckere Kuchen, **als** auch einige kleine Gerichte zu wirklich günstigen Preisen.",
  explanation_correct: "\"als auch\" يقترن أحياناً بـ\"nicht nur\" (أقل شيوعاً من \"sondern auch\" لكنه مستخدم، خصوصاً في السجل الأدبي/الرسمي) ليضيف عنصراً ثانياً.",
  explanation_wrong: FERDINAND_MOD_WRONG["29"],
  grammar_example: "Das Café bietet nicht nur Kuchen, als auch kleine Speisen an.",
};

const FERDINAND_MOD_GAP30_EVIDENCE = "Wäre das **einfach** was für dich? Mail mir doch einfach, wenn du magst, ich würde mich freuen.";

const GORONSKSA_WRONG = {
  "21": "\"dabei\" (بذلك/في تلك الأثناء) لا يعبّر عن جزء من كل، و\"daraus\" (من ذلك/خارجه) حرف جر مختلف -- لا يناسب المعنى الجزئي \"8 من أصل 10\".",
  "22": "\"die\" حالة رفع/نصب لا تناسب حرف الجر \"an\" الذي يستلزم حالة الجر، و\"den\" لا يطابق الجمع \"Schulen\" في حالة الجر الصحيحة (denen).",
  "23": "\"durch\" (عبر) لا يناسب التعبير عن جدول أيام، و\"in\" عامة جداً -- لا تكوّن التعبير الثابت \"an + Tagen\" للدلالة على \"في أيام محددة\".",
  "24": "\"Jeder Mittwoch\" حالة رفع تحتاج بنية جملة مختلفة، و\"Zum Mittwoch\" حرف جر خاطئ -- لا يعبّر عن التكرار الأسبوعي الذي تعبّر عنه نهاية \"-s\" الظرفية.",
  "25": "\"jedem Kurs\" حالة جر، و\"jeden Kurs\" حالة نصب -- كلاهما خاطئ؛ \"zu Beginn\" تليها حالة الملكية (Genitiv) حصراً: jedes Kurses.",
  "26": "\"der\" حالة رفع لا تناسب معنى الملكية هنا، و\"deren\" صيغة الملكية المؤنثة/الجمعية -- بينما \"Einstufungstest\" اسم مذكر يستلزم \"dessen\".",
  "27": "\"obwohl\" (رغم أنّ) تصوغ تناقضاً غير موجود هنا، و\"wobei\" (حيث/بينما) لا تصوغ شرطاً واضحاً بنفس دقة \"wenn\".",
  "28": "\"Sie\" حالة رفع/نصب لا جر، و\"Euch\" صيغة جمع غير رسمية (أنتم) -- لا تناسب أسلوب الرسالة الرسمي الذي يستخدم \"Sie\".",
  "29": "\"hat\" فعل مساعد خاطئ هنا، و\"wird\" تصوغ مبنياً للمجهول للعملية الجارية (يُدرَج الآن) -- بينما المقصود وصف حالة قائمة بالفعل (متضمَّن مسبقاً) يستلزم \"ist\".",
  "30": "\"müssen eine Diät halten\" يضع الفعل الوجهي في البداية بترتيب الجملة الرئيسية -- لا يطابق ترتيب النهاية المطلوب هنا توازياً مع \"vegetarisch essen\"، و\"müssen halten eine Diät\" ترتيب كلمات غير صحيح إطلاقاً (المفعول به يجب أن يسبق المصدر: eine Diät halten).",
};

const MELCHIOR_WRONG = {
  "21": "\"für das\" حرف جر خاطئ لا يناسب المعنى المكاني المجازي (داخل الرسالة)، و\"von dem\" (من) أيضاً لا يعبّر عن \"ضمن مضمون الرسالة\" كما تفعل \"in dem\".",
  "22": "\"Wann\" أداة استفهام لا تناسب جملة خبرية، و\"Wenn\" أداة شرطية -- لا تعبّر عن السبب المباشر (بما أنّ الكتيب لم يجهز بعد) الذي تعبّر عنه \"Da\".",
  "23": "\"Verbracht\" صيغة فعل \"verbringen\" (يقضي وقتاً) -- معنى مختلف عن \"يُسكَن/يُقيم\"، و\"Zugebracht\" ليست صيغة مستخدمة بهذا المعنى إطلاقاً.",
  "24": "\"man\" ضمير عام لا يطابق فعلاً انعكاسياً بفاعل غائب محدد (الفندق)، و\"Sie\" ضمير المخاطب الرسمي -- بينما فاعل الجملة هنا هو \"das Hotel\" (هو/الغائب).",
  "25": "\"geschaut\" يحتاج بنية مختلفة (sich etwas anschauen)، و\"gesehen\" قريب المعنى لكن التركيب هنا مبني للمجهول من فعل \"zeigen\" (يُعرض لكم) لا \"sehen\" (يرى).",
  "26": "\"die\" حالة رفع/نصب لا تناسب معنى الإضافة هنا، و\"von\" حرف جر بديل أقل شيوعاً من حالة الملكية المباشرة (der Semper-Oper) التي يستلزمها الاسم \"Besuch\".",
  "27": "\"mit\" لا تقترن بصفة \"berühmt\" بهذا المعنى، و\"wegen\" (بسبب) حرف جر سببي مختلف -- التعبير الثابت \"berühmt für\" يستلزم \"für\" حصراً.",
  "28": "\"fällt\" و\"liegt\" فعلان لا يقترنان بالتعبير الثابت \"zur Verfügung\" -- هذا التعبير يستلزم الفعل \"stehen\" حصراً.",
  "29": "\"beteiligen\" بلا الضمير الانعكاسي \"sich\" يعني \"يُشرِك شخصاً آخر\" (فعل متعدٍ) -- لا \"يشارك بنفسه\"، و\"fahren\" (يسافر) يصف الرحلة نفسها لا المشاركة فيها.",
  "30": "\"vermachen\" يعني \"يورّث/يترك في وصية\" -- معنى مختلف تماماً، و\"schaffen\" (يُنجز/يخلق) فعل مختلف -- لا يكوّن التعبير الثابت \"einen Überblick verschaffen\".",
};

async function deepenExercise(title, wrongMap, extra) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  if (extra?.gap29) items["29"] = extra.gap29;
  if (extra?.gap30Evidence) items["30"] = { ...items["30"], evidence_text: extra.gap30Evidence };
  console.log(`${title}: updated explanation_wrong for ${Object.keys(wrongMap).length} gaps${extra?.gap29 ? " (+ added missing gap 29)" : ""}${extra?.gap30Evidence ? " (+ fixed gap 30 evidence_text)" : ""}`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function main() {
  await deepenExercise("Ferdinand, Phillip, Christopher (معدل)", FERDINAND_MOD_WRONG, { gap29: FERDINAND_MOD_GAP29, gap30Evidence: FERDINAND_MOD_GAP30_EVIDENCE });
  await deepenExercise("Frau Goronsksa", GORONSKSA_WRONG);
  await deepenExercise("Frau Melchior – Dresden-Reise", MELCHIOR_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

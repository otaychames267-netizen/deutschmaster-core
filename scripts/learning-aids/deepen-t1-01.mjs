/**
 * Deepen T1 #1: "Andrea ( Original )", "Andrea (معدل)", "Autorinnen und
 * Autoren" -- these already had solid item_type/keyword/grammar_example
 * from an earlier pass (this session's batch-t1-05/06), but
 * explanation_wrong was identical to explanation_correct for every gap
 * (no real "why the alternatives fail" reasoning). This pass adds that,
 * reasoning from the actual a/b/c distractors stored in sb_t1_gaps.
 * Everything else (item_type, keyword, evidence_text, grammar_example,
 * translation) is preserved as-is via spread.
 *
 * Usage: node scripts/learning-aids/deepen-t1-01.mjs [--apply]
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

const ANDREA_ORIGINAL_WRONG = {
  "21": "\"gleich\" تعني \"فوراً\" (عكس المقصود تماماً)، و\"zuerst\" تعني \"أولاً\" في تسلسل خطوات -- لا علاقة لهما بالاعتذار عن الرد المتأخر.",
  "22": "\"am besten\" تُستخدم عادة للنصح (\"الأفضل أن...\")، لا لوصف طريقة عمل جهاز، و\"bestenfalls\" (في أفضل الأحوال) تحمل تحفظاً -- أي أن الأمور بالكاد جيدة، عكس معنى العمل بشكل ممتاز تماماً.",
  "23": "\"bei\" تصف التواجد الثابت (الجلوس عند شخص) لا الحركة نحوه، و\"mit\" لا تقترن بـ\"kommen\" لوصف الوجهة هنا.",
  "24": "\"denn\" تصوغ علاقة سببية (لأن) لا تناسب هنا (البحث ليس سبب التأخر، بل حقيقة متناقضة معه)، و\"oder\" (أو) لا تصوغ تبايناً بل بديلاً -- غير مناسب هنا إطلاقاً.",
  "25": "\"geringe\" (قليلة) تُنتج تناقضاً منطقياً هنا (لا يحتاج خبرة قليلة = يحتاج خبرة كثيرة)، عكس المقصود تماماً؛ و\"gute\" (جيدة) تفترض أن أي خبرة قد تكفي طالما جيدة -- بينما \"besondere\" (خاصة) تعني بوضوح أنه لا يوجد شرط خبرة أصلاً.",
  "26": "\"künftige\" (مستقبلية) لا تناسب المعنى (لا حديث عن مهارة مستقبلية بل عن لغة إضافية الآن)، و\"nächste\" (التالية) توحي بترتيب/تسلسل لا وجود له هنا.",
  "27": "\"anwerben\" يعني \"يجنّد شخصاً آخر\" (اتجاه معاكس تماماً -- لا يمكن \"تجنيد نفسك\")، و\"umwerben\" يعني \"يستميل/يغازل\" شخصاً -- معنى مختلف تماماً لا علاقة له بالتقدم لوظيفة.",
  "28": "\"Bedauerlich\" صفة تحتاج بنية مختلفة (Es ist bedauerlich, dass...)، لا تقف بمفردها في بداية الجملة بهذا الشكل، و\"Schade\" تُستخدم عادة كتعجب مستقل أو مع \"dass\" -- لا كظرف يقلب ترتيب الفعل والفاعل بنفس أسلوب \"leider\".",
  "29": "\"deshalb\" (لذلك) تفترض رابطاً سببياً بالجملة السابقة (عدم معرفة أصحاب الفندق) -- لا علاقة منطقية بالعمل في المخيم، و\"trotzdem\" (رغم ذلك) تفترض تجاوز عائق غير موجود هنا.",
  "30": "\"ausgemacht\" (اتُّفق عليه) يفترض اتفاقاً بين أطراف متعددة لا قراراً شخصياً، و\"beschließen\" (يقرر) فعل غير انعكاسي في الألمانية (لا يقترن بـ\"sich\") -- بينما \"sich entscheiden\" هو الفعل الانعكاسي الصحيح المطلوب هنا بعد \"mich\" الظاهرة في الجملة.",
};

const ANDREA_MOD_WRONG = {
  ...ANDREA_ORIGINAL_WRONG,
  "24": "\"fast\" (تقريباً/على وشك) يعني أنه لم يتأخر بعد فعلياً -- عكس المعنى المقصود (متأخر فعلاً)، و\"ungefähr\" (تقريباً بمعنى تقديري) لا يصلح لتكثيف صفة كـ\"spät\" بهذا الشكل.",
  "28": "\"außerdem\" (علاوة على ذلك) أداة إضافة لا تصوغ معنى \"وإلا لكان الأمر مختلفاً\"، و\"damals\" (حينها/في ذلك الوقت) ظرف زمني ماضٍ لا علاقة له بالمعنى الافتراضي الشرطي هنا.",
};

const AUTORINNEN_WRONG = {
  "21": "\"was\" (ماذا) لا يصلح لصياغة عبارة \"كما تعلمون\" التمهيدية -- يحتاج بنية مختلفة تماماً، و\"wann\" (متى) أداة استفهام زمنية لا علاقة لها بهذا المعنى التمهيدي.",
  "22": "\"unterliegen\" يعني \"يخضع لـ\" (كالخضوع لقانون) -- معنى مختلف تماماً، و\"liegen lassen\" يعني \"ينسى/يترك شيئاً\" -- عكس معنى \"التوفر\" المقصود هنا تماماً.",
  "23": "\"von\" لا يناسب هنا نحوياً (الجملة تستخدم حالة الملكية \"der Autorinnen\" مباشرة، لا \"von\" + حالة الجر)، و\"ohne\" (بدون) يعكس المعنى تماماً -- يوحي بعدم الاهتمام لا الفائدة.",
  "24": "\"zu\" (zuliefern) فعل حقيقي لكن بمعنى \"يورّد كمدخل إنتاجي\" (صناعي/لوجستي) -- لا يناسب تسليم مقال، و\"ein\" (einliefern) يعني \"يُدخل/يُنوَّم\" (كإدخال مريض) -- معنى مختلف تماماً.",
  "25": "\"mit\" لا تقترن بفعل \"liegen\" بهذا المعنى إطلاقاً، و\"für\" (من أجل) قد تبدو قريبة لكن التعبير الثابت الصحيح هو \"bei jemandem liegen\" حصراً، لا \"für\".",
  "26": "\"unerschütterlich\" (ثابت/لا يتزعزع) يصف قناعات أو مواقف راسخة، لا درجة انخفاض رقمي، و\"fest\" (ثابت/مُحكم) لا يقترن بفعل \"zurückgehen\" (ينخفض) لتكثيف درجة الانخفاض.",
  "27": "\"deswegen\" (لذلك) أداة ربط سببية مستقلة، لا ضمير ظرفي مرتبط بالفعل \"bitten\"، و\"dafür\" ترتبط بأفعال أخرى مثل \"sich interessieren für\" أو \"danken für\" -- ليس \"bitten um\".",
  "28": "\"besprechen\" يعني \"يناقش\" (كمناقشة موضوع في اجتماع) -- معنى مختلف عن \"يثير اهتمام\"، و\"aussprechen\" يعني \"ينطق/يُعبّر عن رأي\" -- لا علاقة له بإثارة اهتمام القراء.",
  "29": "\"ob\" (هل) تصوغ سؤالاً غير مباشر -- لا يناسب توضيح معنى \"هذا لا يعني...\"، و\"damit\" (لكي) تصوغ غرضاً -- ليس المقصود هنا غرضاً بل نفي دلالة خاطئة محتملة.",
  "30": "\"sowie\" (وكذلك) أداة ربط تنسيقية لا تصف هوية، و\"als ob\" (كما لو أنّ) تفترض حالة افتراضية غير حقيقية (وكأنها مستقلة رغم أنها ليست كذلك) -- عكس المعنى المقصود هنا تماماً (هي مستقلة فعلاً).",
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
  await deepenExercise("Andrea ( Original )", ANDREA_ORIGINAL_WRONG);
  await deepenExercise("Andrea (معدل)", ANDREA_MOD_WRONG);
  await deepenExercise("Autorinnen und Autoren", AUTORINNEN_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

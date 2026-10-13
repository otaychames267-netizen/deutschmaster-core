/**
 * Deepen T1 #2: "Brauckmann Versand", "Corinna ( Original )", "Corinna
 * (معدل)" -- same pattern as deepen-t1-01: adding genuine distractor
 * reasoning to explanation_wrong, everything else preserved via spread.
 *
 * Usage: node scripts/learning-aids/deepen-t1-02.mjs [--apply]
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

const BRAUCKMANN_WRONG = {
  "21": "\"Monate\" حالة الرفع/النصب الجمعية بلا نهاية -n، لا تناسب حالة الجر الإلزامية بعد \"vor\"، و\"Monats\" حالة الملكية المفردة -- لا جمعية ولا مناسبة هنا إطلاقاً.",
  "22": "\"ihnen\" بحرف صغير تعني \"لهم\" (الغائبون) لا المخاطَب، و\"Sie\" حالة رفع/نصب لا تناسب حالة الجر التي يستلزمها الفعل \"mitteilen\".",
  "23": "\"müssen\" صيغة مصدر/جمع لا تناسب السياق، و\"muss\" صيغة مضارع -- بينما الرسالة تسرد أحداثاً ماضية بأكملها (Präteritum).",
  "24": "\"endlich\" (أخيراً) توحي بانتظار طويل انتهى، و\"schon\" (بالفعل) توحي بحدوث أبكر من المتوقع -- كلاهما عكس معنى \"الوقت المتبقي\" المقصود بـ\"noch\".",
  "25": "\"denn\" أداة ربط سببية (لأن) تعكس اتجاه المنطق (سبب لا نتيجة)، ولا تقلب ترتيب الفعل والفاعل، و\"weshalb\" أداة استفهام/وصل نسبية تحتاج بنية مختلفة تماماً.",
  "26": "\"sondern\" تحتاج نفياً سابقاً مباشراً (nicht... sondern) غير موجود هنا، و\"sonst\" (وإلا) تصف نتيجة بديلة لا خياراً مباشراً بين أمرين.",
  "27": "\"für\" لا تقترن بالفعل \"bitten\" بهذا المعنى، و\"wegen\" (بسبب) حرف جر سببي مختلف تماماً عن التلازم الثابت \"bitten um\".",
  "28": "\"meinem\" حالة الجر المذكرة/المحايدة، و\"meiner\" حالة الجر أو الملكية المؤنثة -- كلاهما لا يناسب حالة النصب المؤنثة المطلوبة بعد فعل الحركة \"zurückkehren in\".",
  "29": "\"mitgenommen\" صيغة الفاعل الثاني تحتاج فعلاً مساعداً غير موجود هنا، و\"mitnehme\" صيغة مضارع مصرّفة -- لا تناسب الفعل الوجهي \"möchte\" الذي يستلزم مصدراً مجرداً.",
  "30": "الخيار \"-\" (بلا كلمة) غير ممكن لأن الفعل \"benachrichtigen\" يتطلب مفعولاً به مباشراً، و\"mir\" حالة الجر -- بينما \"benachrichtigen\" يحكم حالة النصب مباشرة (mich).",
};

const CORINNA_SHARED_WRONG = {
  "21": "\"ob\" تصوغ سؤالاً غير مباشر (هل) -- لا يناسب توضيح سبب الأسف، و\"weil\" تصوغ سبباً منفصلاً -- بينما \"es tut mir leid, dass...\" تعبير ثابت يتطلب \"dass\" حصراً لذكر الأمر المؤسف نفسه.",
  "22": "\"bedienen\" يعني \"يخدم/يُشغّل جهازاً\" -- معنى مختلف تماماً، و\"beeilen\" (sich beeilen) يعني \"يستعجل\" -- لا علاقة له بالانشغال بشيء.",
  "23": "\"bloß\" و\"nur\" (فقط/مجرد) أدوات حصر، لكنهما لا تحملان نبرة \"أليس معروفاً بداهة\" التي تحملها \"doch\" في هذا السؤال البلاغي.",
  "25": "\"übermächtig\" (طاغٍ/قاهر) يصف قوة مفرطة، و\"übermäßig\" (مفرط) يصف زيادة عن الحد -- لا علاقة لأي منهما بمعنى \"في الغالب/غالباً\".",
  "27": "\"gering\" (ضئيل) يصف كميات قابلة للقياس، و\"knapp\" (بالكاد/أقل قليلاً من) يفيد كمية محددة تقترب من حد معين -- لا يناسبان اسماً مجرداً مثل \"Lust\" (رغبة) الذي يقترن بـ\"wenig\" تحديداً.",
  "28": "\"läuft\" (يجري) لا يقترن بـ\"wieder\" بهذا المعنى (عودة شعور)، و\"steht\" (يقف) معنى مختلف تماماً -- لا علاقة له بعودة الرغبة.",
  "29": "\"brauchst\" (تحتاج) و\"hast\" (تملك) لا يكوّنان التعبير الثابت \"sich Zeit lassen\" -- هذا التعبير يقترن حصراً بالفعل \"lassen\".",
  "30": "\"kürzlich\" (مؤخراً) ظرف زمن ماضٍ لا علاقة له بهذا التركيب، و\"üblich\" (معتاد) يعني \"المعتاد/الشائع\" -- لا يكوّن التعبير الثابت \"so...wie möglich\".",
};

const CORINNA_ORIGINAL_WRONG = {
  ...CORINNA_SHARED_WRONG,
  "24": "\"außerdem\" (علاوة على ذلك) يضيف فكرة جديدة منفصلة لا تخصيصاً لفئة من مجموعة سابقة، و\"jedoch\" (لكن) أداة تضاد -- لا تخصيص هنا بل توضيح تفصيلي.",
  "26": "\"darf\" (يُسمح لي) يفيد إذناً -- عكس المعنى المقصود (عبء لا امتياز)، و\"soll\" (يُفترض بي) يوحي بتوجيه خارجي -- أقل ملاءمة من الإلزام الشخصي الذي يعززه \"leider\".",
};

const CORINNA_MOD_WRONG = {
  ...CORINNA_SHARED_WRONG,
  "24": "\"außerdem\" (علاوة على ذلك) يضيف فكرة جديدة منفصلة لا تخصيصاً لفئة من مجموعة سابقة، و\"jedoch\" (لكن) أداة تضاد -- لا تخصيص هنا بل توضيح تفصيلي.",
  "26": "\"nahe\" (قريب) صفة مكانية لا تصلح لتقريب مدة زمنية، و\"ziemlich\" (إلى حد ما) ظرف تكثيف للصفات -- لا يقترن بكمية زمنية محددة بهذا الشكل.",
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
  await deepenExercise("Brauckmann Versand", BRAUCKMANN_WRONG);
  await deepenExercise("Corinna ( Original )", CORINNA_ORIGINAL_WRONG);
  await deepenExercise("Corinna (معدل)", CORINNA_MOD_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

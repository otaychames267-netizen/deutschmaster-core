/**
 * Deepen T2 #12: "Online-Sprachkurse & Co.", "Schnell und schneller",
 * "Schönschrift ist wieder \"in\"".
 *
 * Usage: node scripts/learning-aids/deepen-t2-12.mjs [--apply]
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

const ONLINE_SPRACHKURSE_WRONG = {
  "31": "\"KAUM\" (بالكاد) ظرف ندرة -- عكس المعنى المطلوب تماماً، و\"SCHON\" (يُستخدم في الفجوة 40 بمعنى \"فوراً\") ظرف فورية -- معنى مختلف عن التأكيد على الامتداد غير المتوقع؛ هذا يستدعي \"SOGAR\".",
  "32": "\"VON\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"FÜR\" حرف جر آخر -- لا يناسب أيضاً؛ التعبير الثابت \"Partnerschaft mit\" يستلزم \"MIT\" حصراً.",
  "33": "\"ABER\" (يُستخدم في الفجوة 37) أداة تعارض عامة -- لا ترتبط تحديداً ببنية \"nicht nur\" السابقة، و\"OHNE\" (يُستخدم في الفجوة 34) حرف جر -- لا يعمل أداة عطف؛ البنية الجامعة \"nicht nur...sondern auch\" تفرض \"SONDERN\" حصراً.",
  "34": "\"ANSTATT\" (يُستخدم في الفجوة 35 بمعنى \"بدلاً من\") يفيد استبدالاً -- لا نفي ظرف مصاحب، و\"SONDERN\" (يُستخدم في الفجوة 33) أداة عطف -- معنى مختلف تماماً؛ نفي حدوث ظرف مصاحب يستدعي \"OHNE\".",
  "35": "\"OHNE\" (يُستخدم في الفجوة 34) يفيد نفي مصاحبة -- لا استبدالاً، و\"FÜR\" (من أجل) حرف جر -- معنى مختلف تماماً؛ بنية المقارنة الاستبدالية تحدد \"ANSTATT\".",
  "36": "\"SOGAR\" (يُستخدم في الفجوة 31 بمعنى \"حتى\") ظرف تأكيد على امتداد -- معنى مختلف عن التكثيف، و\"SO\" (هكذا) ظرف عام -- لا يكوّن التعبير المكثّف الثابت؛ تكثيف صفة الملاءمة يستدعي \"BESONDERS\".",
  "37": "\"SONDERN\" (يُستخدم في الفجوة 33) يستلزم نفياً مباشراً بـ\"nicht\" سابقاً -- غير موجود هنا، و\"OHNE\" (يُستخدم في الفجوة 34) حرف جر -- لا يعمل أداة تعارض؛ التضاد بين المتعة والمحدودية يستدعي \"ABER\".",
  "38": "\"MÜSSTE\" (سيكون مضطراً) يفيد اضطراراً افتراضياً أقوى -- لا توصية بديلة لطيفة، و\"SO\" (هكذا) ظرف -- لا يعمل فعلاً وجهياً؛ تقديم توصية بديلة أفضل يستدعي \"SOLLTE\".",
  "39": "\"FÜR\" (من أجل) حرف جر -- لا يصوغ جملة غرض بمصدر بنفس الطريقة، و\"VON\" حرف جر آخر -- معنى مختلف تماماً؛ التعبير عن الغرض يستدعي \"UM\" (مقترنة بـ zu).",
  "40": "\"SOGAR\" (يُستخدم في الفجوة 31 بمعنى \"حتى\") يفيد امتداداً غير متوقع -- لا الفورية، و\"SO\" (هكذا) ظرف كيفية -- معنى مختلف تماماً؛ التأكيد على الفورية يستدعي \"SCHON\".",
};

const SCHNELL_SCHNELLER_WRONG = {
  "31": "\"SEI\" صيغة Konjunktiv I لنقل كلام غير مباشر -- لا فكرة افتراضية مستبعدة، و\"WÜRDE\" (يُستخدم في الفجوة 39) فعل مساعد لصيغة would+مصدر -- لا يقترن مباشرة هنا بنفس الطبيعية؛ وصف فكرة افتراضية مستبعدة يستدعي Konjunktiv II المباشر لفعل sein: \"WÄRE\".",
  "32": "\"DARAN\" (يُستخدم في الفجوة 37) ضمير ظرفي بحرف جر مختلف (an)، و\"DARAUF\" (يُستخدم في الفجوة 38) ضمير ظرفي آخر بحرف جر مختلف (auf) -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"Grund für etwas\" يستلزم \"DAFÜR\" حصراً.",
  "33": "\"MÖCHTE\" (يودّ) فعل وجهي يفيد الرغبة -- لا احتمالاً متردداً، و\"WÜRDE\" (يُستخدم في الفجوة 39) فعل مساعد آخر -- لا يناسب هذا التركيب المحدد؛ التخمين غير القاطع يستدعي \"MAG\".",
  "34": "\"ENTWEDER\" تحتاج \"oder\" لاحقاً وتفيد اختياراً حصرياً -- معنى مختلف تماماً، و\"ODER\" (أو) أداة اختيار -- لا تصلح تمهيداً لتناقض؛ التناقض المعتدل يستدعي \"ZWAR\".",
  "35": "\"ODER\" (أو) أداة اختيار -- معنى مختلف تماماً، و\"ENTWEDER\" تحتاج \"oder\" لا \"zwar\" السابقة -- لا تكتمل بها الجملة؛ التمهيد السابق بـ\"zwar\" يفرض \"ABER\" حصراً.",
  "36": "\"WIE\" تُستخدم في المقارنة المتساوية \"so...wie\" -- لا مقارنة الزيادة بعد \"mehr\"، و\"ODER\" (أو) أداة اختيار -- معنى مختلف تماماً؛ بنية المقارنة \"mehr...als\" تحدد \"ALS\" حصراً.",
  "37": "\"DAFÜR\" (يُستخدم في الفجوة 32) ضمير ظرفي بحرف جر مختلف (für)، و\"DARAUF\" (يُستخدم في الفجوة 38) ضمير ظرفي آخر بحرف جر مختلف (auf) -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"zweifeln an\" يستلزم \"DARAN\" حصراً.",
  "38": "\"DAFÜR\" (يُستخدم في الفجوة 32) ضمير ظرفي بحرف جر مختلف (für)، و\"DARAN\" (يُستخدم في الفجوة 37) ضمير ظرفي آخر بحرف جر مختلف (an) -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"Einfluss auf\" يستلزم \"DARAUF\" حصراً.",
  "39": "\"WÄRE\" (يُستخدم في الفجوة 31) صيغة Konjunktiv II من \"sein\" مباشرة -- لا تقترن بمصدر \"entstehen\" بهذا التركيب، و\"SEI\" صيغة Konjunktiv I -- لا تناسب نقل استنتاج غير مؤكد قطعياً؛ هذا يستدعي تركيب würde+مصدر: \"WÜRDE\".",
  "40": "\"DARAUF\" (يُستخدم في الفجوة 38) ضمير ظرفي بحرف جر مختلف (auf)، و\"DARAN\" (يُستخدم في الفجوة 37) ضمير ظرفي آخر بحرف جر مختلف (an) -- التعبير الثابت \"danach befragt\" يستلزم حرف الجر \"nach\" تحديداً: \"DANACH\".",
};

const SCHOENSCHRIFT_WRONG = {
  "31": "\"DAS\" ضمير إشاري -- لا يعمل أداة ربط سببية، و\"UM\" حرف جر/أداة غرض -- معنى مختلف تماماً؛ تفسير السبب يستدعي \"WEIL\".",
  "32": "\"SUCHEN\" (يبحثون) فعل -- لا يعمل ظرفاً، و\"VON\" حرف جر -- لا يصلح أيضاً؛ وصف تفاقم تدريجي يستدعي \"IMMER\".",
  "33": "\"GESTALTEN\" (يُستخدم في الفجوة 39 بمعنى \"يصمم\") فعل مختلف تماماً، و\"SUCHEN\" (يبحثون) فعل آخر غير ذي صلة؛ التعبير الثابت \"mit etwas zu tun haben\" يستلزم \"TUN\" حصراً.",
  "34": "\"DAS\" ضمير إشاري -- لا يعمل اسماً بصيغة الجمع هنا، و\"FÜR\" حرف جر -- لا يصلح أيضاً؛ وصف الحروف كأشكال بصرية لا كلمات يحدد \"FIGUREN\".",
  "35": "\"GEHT\" (يُستخدم في الفجوة 40 بمعنى \"يسير\") فعل مختلف تماماً، و\"TUN\" (يُستخدم في الفجوة 33) فعل آخر -- لا يكوّنان مبني للمجهول هنا؛ مبني للمجهول في المضارع يفرض الفعل المساعد \"WERDEN\".",
  "36": "\"DAS\" ضمير إشاري مجرد -- لا يعمل ضميراً ظرفياً، و\"VON\" حرف جر مختلف تماماً -- لا يكوّن هذا التعبير؛ التعبير الثابت \"Erfahrungen machen mit\" يستلزم الضمير الظرفي \"DAMIT\" حصراً.",
  "37": "\"GESTALTEN\" (يُستخدم في الفجوة 39) فعل -- لا يعمل صفة، و\"SUCHEN\" (يبحثون) فعل آخر -- لا يصلح أيضاً؛ وصف أسلوب تدريس مرح يستدعي الصفة \"SPIELERISCHE\".",
  "38": "\"DAS\" ضمير إشاري -- لا يعمل أداة ربط لجملة متممة، و\"FÜR\" حرف جر -- لا يصلح أيضاً؛ التعبير الثابت \"ein Anliegen sein, dass\" يستلزم \"DASS\" حصراً.",
  "39": "\"TUN\" (يُستخدم في الفجوة 33) فعل عام بمعنى مختلف، و\"SUCHEN\" (يبحثون) فعل آخر غير ذي صلة بالتصميم؛ السياق (تصميم دعوات وشعارات) يحدد \"GESTALTEN\".",
  "40": "\"WERDEN\" (يُستخدم في الفجوة 35) فعل مساعد للمبني للمجهول -- معنى مختلف تماماً، و\"TUN\" (يُستخدم في الفجوة 33) فعل آخر -- لا يكوّن التعبير الثابت \"von der Hand gehen\"؛ هذا يستلزم \"GEHT\" حصراً.",
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
  await deepenExercise("Online-Sprachkurse & Co. – Wie lernt man heute am besten eine Sprache?", ONLINE_SPRACHKURSE_WRONG);
  await deepenExercise("Schnell und schneller", SCHNELL_SCHNELLER_WRONG);
  await deepenExercise("Schönschrift ist wieder \"in\"", SCHOENSCHRIFT_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

/**
 * Deepen T2 #17 (FINAL batch): "Wie Handschrift wieder cool wird" (2 rows:
 * "( Original )" and "(معدل)" -- share the same word bank but differ in
 * which gap maps to which word, so each analyzed individually), "Wie
 * TV-Bilder die Fantasie von Kindern prägen". This completes the T2
 * distractor-deepening pass across all 61 remaining exercises.
 *
 * Usage: node scripts/learning-aids/deepen-t2-17.mjs [--apply]
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

const HANDSCHRIFT_ORIGINAL_WRONG = {
  "31": "\"DAS\" ضمير إشاري -- لا يعمل أداة ربط سببية، و\"NIE\" (أبداً) ظرف نفي زمني -- معنى مختلف تماماً؛ تفسير السبب يستدعي \"WEIL\".",
  "32": "\"SUCHEN\" (يبحثون) فعل -- لا يعمل ظرفاً، و\"FIGUREN\" (أشكال) اسم -- لا يصلح أيضاً؛ وصف تفاقم تدريجي يستدعي \"IMMER\".",
  "33": "\"GESTALTEN\" (يُستخدم في الفجوة 39 بمعنى \"يصمم\") فعل مختلف تماماً، و\"SUCHEN\" (يبحثون) فعل آخر غير ذي صلة؛ التعبير الثابت \"mit etwas zu tun haben\" يستلزم \"TUN\" حصراً.",
  "34": "\"NIE\" (أبداً) ظرف نفي -- لا يعمل فعلاً مساعداً، و\"FIGUREN\" (أشكال) اسم -- لا يصلح أيضاً؛ مبني للمجهول في الماضي يفرض \"WURDE\".",
  "35": "\"DAMIT\" (يُستخدم في الفجوة 36) ضمير ظرفي بحرف جر مختلف (mit)، و\"FÜR\" حرف جر آخر -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"Verbindung von\" يستلزم \"VON\" حصراً.",
  "36": "\"VON\" (يُستخدم في الفجوة 35) حرف جر آخر -- لا يعمل ضميراً ظرفياً، و\"DAS\" ضمير إشاري مجرد -- لا يصلح أيضاً؛ التعبير الثابت \"Erfahrungen machen mit\" يستلزم الضمير الظرفي \"DAMIT\" حصراً.",
  "37": "\"GESTALTEN\" (يُستخدم في الفجوة 39) فعل -- لا يعمل صفة، و\"SUCHEN\" (يبحثون) فعل آخر -- لا يصلح أيضاً؛ وصف أسلوب تدريس مرح يستدعي الصفة \"SPIELERISCHE\".",
  "38": "\"DAS\" ضمير إشاري -- لا يعمل أداة ربط لجملة متممة، و\"FÜR\" حرف جر -- لا يصلح أيضاً؛ التعبير الثابت \"ein Anliegen sein, dass\" يستلزم \"DASS\" حصراً.",
  "39": "\"TUN\" (يُستخدم في الفجوة 33) فعل عام بمعنى مختلف، و\"SUCHEN\" (يبحثون) فعل آخر غير ذي صلة بالتصميم؛ السياق (تصميم دعوات وشعارات) يحدد \"GESTALTEN\".",
  "40": "\"WURDE\" (يُستخدم في الفجوة 34) فعل مساعد للمبني للمجهول -- معنى مختلف تماماً، و\"TUN\" (يُستخدم في الفجوة 33) فعل آخر -- لا يكوّن التعبير الثابت \"von der Hand gehen\"؛ هذا يستلزم \"GEHT\" حصراً.",
};

const HANDSCHRIFT_MODIFIZIERT_WRONG = {
  "31": "\"DAS\" ضمير إشاري -- لا يعمل أداة ربط سببية، و\"NIE\" (أبداً) ظرف نفي زمني -- معنى مختلف تماماً؛ تفسير السبب يستدعي \"WEIL\".",
  "32": "\"FIGUREN\" (أشكال) اسم -- لا يعمل ظرفاً، و\"GESTALTEN\" (يصمم) فعل -- لا يصلح أيضاً؛ وصف التفاقم التدريجي يستدعي \"IMMER\".",
  "33": "\"SUCHEN\" (يُستخدم في الفجوة 37 بمعنى \"يبحث\") فعل مختلف تماماً، و\"GESTALTEN\" (يصمم) فعل آخر غير ذي صلة؛ التعبير الثابت \"mit etwas zu tun haben\" يستلزم \"TUN\" حصراً.",
  "34": "\"VON\" (يُستخدم في الفجوة 39) حرف جر آخر -- لا يعمل ضميراً ظرفياً، و\"DAS\" ضمير إشاري مجرد -- لا يصلح أيضاً؛ التعبير الثابت \"Erfahrungen machen mit\" يستلزم الضمير الظرفي \"DAMIT\" حصراً.",
  "35": "\"GESTALTEN\" (يصمم) فعل -- لا يعمل صفة، و\"SUCHEN\" (يُستخدم في الفجوة 37) فعل آخر -- لا يصلح أيضاً؛ وصف أسلوب تدريس مرح يستدعي الصفة \"SPIELERISCHE\".",
  "36": "\"DAS\" ضمير إشاري -- لا يعمل أداة ربط لجملة متممة، و\"FÜR\" حرف جر -- لا يصلح أيضاً؛ التعبير الثابت \"wichtig sein, dass\" يستلزم \"DASS\" حصراً.",
  "37": "\"TUN\" (يُستخدم في الفجوة 33) فعل عام بمعنى مختلف، و\"GESTALTEN\" (يصمم) فعل آخر غير ذي صلة بالبحث عن أسلوب شخصي؛ السياق (السعي لإيجاد أسلوب شخصي) يحدد \"SUCHEN\".",
  "38": "\"DAMIT\" (يُستخدم في الفجوة 34) ضمير ظرفي -- لا يعمل فعلاً، و\"WURDE\" (يُستخدم في الفجوة 40) فعل مساعد للمبني للمجهول -- معنى مختلف تماماً؛ التعبير الثابت \"von der Hand gehen\" يستلزم \"GEHT\" حصراً.",
  "39": "\"DAMIT\" (يُستخدم في الفجوة 34) ضمير ظرفي بحرف جر مختلف (mit)، و\"FÜR\" حرف جر آخر -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"Verbindung von\" يستلزم \"VON\" حصراً.",
  "40": "\"NIE\" (أبداً) ظرف نفي -- لا يعمل فعلاً مساعداً، و\"GEHT\" (يُستخدم في الفجوة 38) فعل مختلف تماماً -- لا يصلح أيضاً؛ مبني للمجهول في الماضي يفرض \"WURDE\".",
};

const TVBILDER_WRONG = {
  "31": "\"AUS\" (من) حرف جر بمعنى مختلف تماماً (أصل/مصدر لا وسيلة)، و\"VON\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يصف وسيلة تسبب تحولاً سلوكياً؛ هذا يستلزم \"DURCH\" حصراً.",
  "32": "\"VON\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يكوّن هذا التعبير، و\"MIT\" (يُستخدم في الفجوة 38) حرف جر مختلف -- لا يناسب أيضاً؛ التعبير الثابت \"vor allem\" يستلزم \"VOR\" حصراً.",
  "33": "\"WAS\" (يُستخدم في الفجوة 39 بمعنى \"ماذا/ما هو\") يسأل عن ماهية عامة -- لا نوعية محددة من بين خيارات، و\"JENE\" (تلك) ضمير إشاري -- لا يعمل أداة استفهام؛ السؤال عن نوعية محددة يستدعي \"WELCHE\".",
  "34": "\"VERÄNDERTEN\" (تغيّرت) فعل قريب الشكل لكنه يصف تحولاً عبر الزمن لا فرقاً بين مجموعتين متزامنتين، و\"MACHTEN\" (فعلوا) فعل عام غير ذي صلة؛ وصف اختلاف واضح بين مجموعتين يستدعي \"UNTERSCHIEDEN\".",
  "35": "\"MACHTEN\" (فعلوا) فعل عام قريب المعنى لكنه لا يكوّن التعبير الثابت \"etwas enden lassen\"، و\"VERÄNDERTEN\" (غيّروا) فعل آخر بمعنى مختلف؛ هذا التعبير يستلزم \"LIESSEN\" حصراً.",
  "36": "\"SO\" (هكذا) ظرف كيفية -- معنى مختلف تماماً عن السؤال عن الدرجة، و\"WAS\" (يُستخدم في الفجوة 39) أداة استفهام أخرى -- لا تسأل عن الدرجة/الحجم؛ التعبير عن درجة/حجم التأثير يستدعي \"WIE\" (مع sehr).",
  "37": "\"DURCH\" (يُستخدم في الفجوة 31) حرف جر آخر -- لا يصف ملكية/انتساب، و\"VOR\" (يُستخدم في الفجوة 32) حرف جر مختلف -- لا يناسب أيضاً؛ وصف ملكية/انتساب يستدعي \"VON\".",
  "38": "\"VON\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يكوّن التعبير الثابت هنا، و\"VOR\" (يُستخدم في الفجوة 32) حرف جر مختلف -- لا يناسب أيضاً؛ حرف الجر \"mit\" + اسم محايد سابق يحددان \"MIT DEM\".",
  "39": "\"WELCHE\" (يُستخدم في الفجوة 33) يسأل عن اختيار محدد من بين عدة أشياء -- لا عن ماهية شيء عامة، و\"JENE\" (تلك) ضمير إشاري -- لا يعمل أداة استفهام؛ السؤال عن ماهية شيء يستدعي \"WAS\".",
  "40": "\"SO\" (هكذا) ظرف كيفية -- معنى مختلف تماماً عن التمهيد الشرطي، و\"JENE\" (تلك) ضمير إشاري -- لا يعمل ظرف تمهيد؛ التمهيد لشرط لاحق محدد يستدعي \"DANN\" (مقترنة بـ wenn).",
};

async function applyToId(id, label, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where id = '${id}';`);
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  console.log(`${label} (${id}): updated explanation_wrong for ${Object.keys(wrongMap).length} gaps`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function deepenExercise(title, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 2;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  await applyToId(rows[0].id, title, wrongMap);
}

async function main() {
  await applyToId("39759870-8adc-4bb3-a115-75901ac2a6ad", "Wie Handschrift wieder cool wird ( Original )", HANDSCHRIFT_ORIGINAL_WRONG);
  await applyToId("f9b5212e-e33a-4929-b71a-8c564f2762b0", "Wie Handschrift wieder cool wird (معدل)", HANDSCHRIFT_MODIFIZIERT_WRONG);
  await deepenExercise("Wie TV-Bilder die Fantasie von Kindern prägen", TVBILDER_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

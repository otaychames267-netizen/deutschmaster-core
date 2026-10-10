/**
 * Deepen T2 #15: "Teleshopping – nicht immer gut und günstig", "Theater
 * für Kinder und Jugendliche" (2 rows: "( Original )" and "(معدل)"),
 * "Vegetarisch essen".
 *
 * Usage: node scripts/learning-aids/deepen-t2-15.mjs [--apply]
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

const TELESHOPPING_WRONG = {
  "31": "\"EHER\" (إلى حد ما) ظرف تلطيف -- عكس اتجاه التكثيف المطلوب، و\"ABER\" (لكن) أداة تعارض -- لا تعمل ظرف تكثيف؛ تكثيف صفة سلبية يستدعي \"DEUTLICH\".",
  "32": "\"BESCHLOSS\" (قرر) فعل قريب المعنى لكنه لا يكوّن التعبير الثابت \"ein Fazit ziehen\"، و\"RECHNUNG\" (فاتورة) اسم -- لا يعمل فعلاً؛ هذا التعبير يستلزم \"ZOG\" حصراً.",
  "33": "\"NACH\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"ABGESEHEN\" (يُستخدم في الفجوة 36) صفة فاعل ثانٍ -- لا يعمل حرف جر بسيطاً؛ التعبير الثابت \"Erfahrungen bei\" يستلزم \"BEI\" حصراً.",
  "34": "\"ABER\" (لكن) أداة تعارض عامة -- لا تصحّح فكرة منفية بـ\"nicht\" مباشرة، و\"EHER\" (إلى حد ما) ظرف تلطيف -- معنى مختلف تماماً؛ النفي السابق يفرض \"SONDERN\" حصراً.",
  "35": "\"RECHNUNG\" (فاتورة) اسم من نفس الحقل المالي لكنه لا يكوّن التعبير الثابت \"in voller Höhe\"، و\"NACH\" حرف جر -- لا يعمل اسماً؛ هذا التعبير يستلزم \"HÖHE\" حصراً.",
  "36": "\"BEI\" (يُستخدم في الفجوة 33) حرف جر -- لا يعمل صيغة فاعل ثانٍ، و\"EHER\" (إلى حد ما) ظرف -- لا يصلح أيضاً؛ التعبير الثابت \"ganz abgesehen davon\" يستلزم \"ABGESEHEN\" حصراً.",
  "37": "\"ZOG\" (يُستخدم في الفجوة 32 بمعنى \"استخلص\") فعل مختلف تماماً، و\"DABEI\" (يُستخدم في الفجوة 40) ضمير ظرفي -- لا يعمل فعلاً؛ التعبير الثابت الانعكاسي \"sich wenden an\" يستلزم \"WENDEN\" حصراً.",
  "38": "\"EHER\" (إلى حد ما) ظرف تلطيف -- معنى مختلف تماماً عن التأكيد على الامتداد، و\"ABER\" (لكن) أداة تعارض -- لا تعمل ظرف تعزيز؛ التأكيد على امتداد غير متوقع يستدعي \"SOGAR\".",
  "39": "\"DEUTLICH\" (يُستخدم في الفجوة 31 بمعنى \"بشكل واضح\") ظرف تكثيف -- معنى مختلف تماماً عن التماثل، و\"SOGAR\" (يُستخدم في الفجوة 38) ظرف تعزيز -- لا يكوّن بنية المقارنة التماثلية؛ \"genauso...wie\" تستلزم \"GENAUSO\" حصراً.",
  "40": "\"WENDEN\" (يُستخدم في الفجوة 37) فعل -- لا يعمل ضميراً ظرفياً، و\"ABGESEHEN\" (يُستخدم في الفجوة 36) صيغة فاعل ثانٍ -- لا يصلح أيضاً؛ الربط بسياق سابق يستدعي \"DABEI\".",
};

const THEATER_ORIGINAL_WRONG = {
  "31": "\"ABER\" (لكن) أداة تعارض عامة -- لا ترتبط تحديداً ببنية \"nicht nur\" السابقة، و\"TROTZ\" (رغم) حرف جر -- لا يعمل أداة عطف؛ البنية الجامعة \"nicht nur...sondern auch\" تفرض \"SONDERN\" حصراً.",
  "32": "\"VOR\" (قبل) حرف جر بمعنى مختلف تماماً (نقطة سابقة لا استمرارية)، و\"AB\" (يُستخدم في الفجوة 34 بمعنى \"اعتباراً من\" لبداية مستقبلية) -- معنى مختلف عن الاستمرارية من الماضي؛ وصف نشاط مستمر منذ الماضي يستدعي \"SEIT\".",
  "33": "\"TROTZ\" (رغم) حرف جر تنازلي -- معنى معاكس تقريباً، و\"OHNE\" (بدون) حرف جر -- معنى مختلف تماماً؛ تفسير سبب حاجة الأطفال للمساعدة يستدعي \"WEGEN\".",
  "34": "\"SEIT\" (يُستخدم في الفجوة 32 بمعنى \"منذ\" لاستمرارية من الماضي) -- عكس الاتجاه الزمني المطلوب هنا، و\"VOR\" (قبل) حرف جر -- معنى مختلف تماماً؛ وصف بداية زمنية مستقبلية يستدعي \"AB\".",
  "35": "\"AUF\" (يُستخدم في الفجوة 39) حرف جر آخر -- لا يكوّن هذا التعبير، و\"VOR\" حرف جر مختلف تماماً؛ التعبير الثابت \"am Ende\" يستلزم \"AM\" حصراً.",
  "36": "\"DA\" أداة ربط/ظرف -- لا يعمل ضميراً فاعلاً شكلياً، و\"DARUM\" (يُستخدم في الفجوة 38) ضمير ظرفي -- لا يصلح أيضاً؛ التركيب غير الشخصي \"es ist wichtig\" يستدعي \"ES\" حصراً.",
  "37": "\"WEGEN\" (يُستخدم في الفجوة 33) حرف جر -- لا يعمل أداة ربط تابعة لجملة كاملة، و\"OHNE\" (بدون) حرف جر آخر -- معنى مختلف تماماً؛ تفسير السبب يستدعي \"DA\".",
  "38": "\"DAZU\" ضمير ظرفي بحرف جر مختلف (zu) -- التعبير الثابت \"sich kümmern um\" يستلزم حرف الجر \"um\" حصراً (darum)، و\"ES\" (يُستخدم في الفجوة 36) ضمير شكلي -- لا يعمل ضميراً ظرفياً؛ هذا يستلزم \"DARUM\".",
  "39": "\"AM\" (يُستخدم في الفجوة 35) حرف جر آخر -- لا يكوّن هذا التعبير، و\"VOR\" حرف جر مختلف تماماً؛ التعبير الثابت \"auf diese Weise\" يستلزم \"AUF\" حصراً.",
  "40": "\"OHNE\" (بدون) حرف جر -- معنى مختلف تماماً عن الغرض، و\"TROTZ\" (رغم) حرف جر تنازلي -- لا يصوغ جملة غرض بمصدر؛ التعبير عن الغرض يستدعي \"UM\" (مقترنة بـ zu).",
};

const THEATER_MODIFIZIERT_WRONG = {
  "31": "\"ABER\" (لكن) أداة تعارض عامة -- لا ترتبط تحديداً ببنية \"nicht nur\" السابقة، و\"DA\" أداة ربط سببية -- لا تعمل أداة عطف؛ البنية الجامعة \"nicht nur...sondern auch\" تفرض \"SONDERN\" حصراً.",
  "32": "\"AB\" (يُستخدم في الفجوة 34 بمعنى \"اعتباراً من\") -- عكس الاتجاه الزمني المطلوب، و\"AM\" حرف جر مختلف -- معنى مختلف تماماً؛ وصف نشاط مستمر منذ الماضي يستدعي \"SEIT\".",
  "33": "\"DA\" أداة ربط تابعة -- لا تعمل حرف جر يحكم اسماً مباشرة، و\"DARUM\" ضمير ظرفي -- لا يصلح أيضاً؛ تفسير سبب حاجة الأطفال للمساعدة يستدعي حرف الجر \"WEGEN\".",
  "34": "\"SEIT\" (يُستخدم في الفجوة 32) -- عكس الاتجاه الزمني المطلوب هنا، و\"AM\" حرف جر مختلف -- معنى مختلف تماماً؛ وصف بداية زمنية مستقبلية يستدعي \"AB\".",
  "35": "\"DA\" أداة ربط -- لا تعمل أداة تعريف بحالة الملكية، و\"DAZU\" ضمير ظرفي -- لا يصلح أيضاً؛ التعبير الثابت \"Ende + Genitiv\" يستلزم أداة التعريف بحالة الملكية \"DES\".",
  "36": "\"DA\" أداة ربط -- لا تعمل اسم علم، و\"AM\" حرف جر -- لا يصلح أيضاً؛ السياق (اسم الممثل الكامل) يحدد \"WOLFGANG\".",
  "37": "\"DARUM\" ضمير ظرفي -- لا يعمل أداة نفي أمام اسم، و\"DAZU\" ضمير ظرفي آخر -- لا يصلح أيضاً؛ نفي وجود أموال يستدعي \"KEINE\".",
  "38": "\"DES\" (يُستخدم في الفجوة 35) أداة تعريف -- لا تعمل صيغة فاعل ثانٍ، و\"WOLFGANG\" (يُستخدم في الفجوة 36) اسم علم -- لا يصلح فعلاً؛ مبني للمجهول يفرض Partizip II: \"AUFGEHÄNGT\".",
  "39": "\"AM\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AB\" (يُستخدم في الفجوة 34) حرف جر آخر -- لا يناسب أيضاً؛ التعبير الثابت \"auf diese Weise\" يستلزم \"AUF\" حصراً.",
  "40": "\"KEINE\" (يُستخدم في الفجوة 37) أداة نفي -- معنى معاكس تقريباً، و\"ABER\" (لكن) أداة تعارض -- معنى مختلف تماماً؛ وصف حاجة مستمرة إضافية يستدعي \"NOCH\".",
};

const VEGETARISCH_WRONG = {
  "31": "\"SCHWER\" (بشدة/بصعوبة) ظرف تكثيف لكنه لا يكوّن التعبير الشائع \"deutlich erhöht\" بنفس الدقة، و\"WORAUF\" أداة استفهام ظرفية -- لا تعمل ظرف تكثيف؛ تكثيف صفة الزيادة يستدعي \"DEUTLICH\".",
  "32": "\"VOR\" (يُستخدم في الفجوة 35) حرف جر آخر -- لا يكوّن هذا التعبير، و\"AN\" (يُستخدم في الفجوة 38) حرف جر مختلف -- لا يناسب أيضاً؛ التعبير الثابت \"Auswirkungen auf\" يستلزم \"AUF\" حصراً.",
  "33": "\"BEIDE\" صيغة صفة تطابق اسماً جمعياً تالياً -- لا تعمل ضميراً مستقلاً هنا، و\"ESSENDE\" (آكل/متغذٍ) صفة فاعل حالي -- معنى مختلف تماماً؛ الإشارة لخيارين مجتمعين معاً تستدعي الضمير المحايد المستقل \"BEIDES\".",
  "34": "\"ERSETZEN\" (يُستخدم في الفجوة 39 بمعنى \"يستبدل\") فعل مختلف تماماً، و\"EINSETZEN\" (يُدرج/يوظّف) فعل آخر غير ذي صلة؛ التعبير الثابت \"den Bedarf decken\" يستلزم \"DECKEN\" حصراً.",
  "35": "\"AN\" (يُستخدم في الفجوة 38) جزيء فعل منفصل مختلف، و\"AUF\" (يُستخدم في الفجوة 32) حرف جر آخر -- لا يكوّنان الفعل المنفصل \"vorkommen\"؛ هذا يستلزم \"VOR\" حصراً.",
  "36": "\"ERSETZEN\" (يُستخدم في الفجوة 39) فعل مختلف تماماً، و\"DECKEN\" (يُستخدم في الفجوة 34) فعل آخر غير ذي صلة؛ التعبير الثابت \"stecken in\" يستلزم \"STECKT\" حصراً.",
  "37": "\"EINSETZEN\" (يُدرج/يوظّف) فعل غير ذي صلة، و\"ERSETZEN\" (يُستخدم في الفجوة 39 بمعنى \"يستبدل\") فعل آخر مختلف تماماً؛ التعبير الثابت \"überprüfen lassen\" يستلزم \"ÜBERPRÜFEN\" حصراً.",
  "38": "\"VOR\" (يُستخدم في الفجوة 35) جزيء فعل منفصل مختلف، و\"AUF\" (يُستخدم في الفجوة 32 وموجود بالفعل هنا كحرف جر أساسي) -- لا يصلح جزيئاً منفصلاً إضافياً؛ الفعل المنفصل \"ankommen auf\" يستلزم الجزيء \"AN\" في نهاية الجملة.",
  "39": "\"DECKEN\" (يُستخدم في الفجوة 34 بمعنى \"يلبي\") فعل مختلف تماماً، و\"STECKT\" (يُستخدم في الفجوة 36) فعل آخر غير ذي صلة؛ التعبير الثابت \"ersetzen durch\" يستلزم \"ERSETZEN\" حصراً.",
  "40": "\"ESSENDE\" (آكل/متناول) صيغة الفاعل الحالي من \"essen\" -- تصف فعلاً جارياً لا حالة تغذية مكتسبة، و\"EINSETZEN\" مصدر -- لا يعمل صفة؛ وصف حالة تغذية مكتسبة يستدعي صيغة الفاعل الثاني \"ERNÄHRTE\".",
};

async function deepenExercise(title, wrongMap) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 2;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  await applyToId(rows[0].id, title, wrongMap);
}

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

async function main() {
  await deepenExercise("Teleshopping – nicht immer gut und günstig", TELESHOPPING_WRONG);
  await applyToId("184aef82-0069-400c-afec-5363d06a19eb", "Theater für Kinder und Jugendliche ( Original )", THEATER_ORIGINAL_WRONG);
  await applyToId("e9d1565b-71a1-45f5-969d-c6365ecc275e", "Theater für Kinder und Jugendliche (معدل)", THEATER_MODIFIZIERT_WRONG);
  await deepenExercise("Vegetarisch essen", VEGETARISCH_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

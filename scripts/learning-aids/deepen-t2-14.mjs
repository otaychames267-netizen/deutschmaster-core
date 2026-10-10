/**
 * Deepen T2 #14: "Songwettbewerb auf der Burg Tanneck", "Städte vor dem
 * Infarkt", "Teamarbeit als Schlüssel zum Erfolg".
 *
 * Usage: node scripts/learning-aids/deepen-t2-14.mjs [--apply]
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

const SONGWETTBEWERB_WRONG = {
  "31": "\"DURFTE\" (كان يُسمح له) يفيد إذناً -- عكس المعنى المطلوب (رد فعل تلقائي لا اختياري)، و\"HÄTTE\" صيغة Konjunktiv II من \"haben\" -- لا تصف حدثاً ماضياً واقعياً؛ وصف رد فعل تلقائي غير إرادي يستدعي \"MUSSTE\".",
  "32": "\"ALS\" (بصفته/عندما) أداة مقارنة/زمنية -- لا تعمل ضمير تعميم، و\"ERST\" (فقط/لأول مرة) ظرف -- معنى مختلف تماماً؛ التأكيد على شمول شخصين معاً يستدعي \"BEIDE\".",
  "33": "\"WISST\" (تعرفان) فعل مصرّف -- لا يعمل ضمير وصل، و\"ALS\" أداة زمنية/مقارنة -- لا تصلح أيضاً؛ عودة ضمير الوصل على اسم جمع كمفعول به يحدد \"DIE\".",
  "34": "\"HÄTTE\" صيغة Konjunktiv II من \"haben\" -- فعل مختلف تماماً لا يكوّن هذا التعبير، و\"DURFTE\" (كان يُسمح له) فعل ماضٍ إخباري -- لا يفيد الاقتراح المهذب؛ تعبير الاقتراح المهذب \"wie wäre es\" يستلزم \"WÄRE\" حصراً.",
  "35": "\"ERST\" (فقط/للتو) يوحي ببداية حديثة أو قصيرة -- عكس المعنى المطلوب، و\"ÜBERHAUPT\" (يُستخدم في الفجوة 36 بمعنى \"على الإطلاق\") ظرف تعزيز نفي -- معنى مختلف تماماً؛ التأكيد على امتداد زمني طويل يستدعي \"SCHON\".",
  "36": "\"SCHON\" (يُستخدم في الفجوة 35 بمعنى \"منذ/بالفعل\") ظرف زمني -- معنى مختلف تماماً عن تعزيز النفي، و\"ERST\" (فقط) ظرف تقييد -- لا يعزز نفياً قاطعاً؛ تعزيز النفي القاطع يستدعي \"ÜBERHAUPT\".",
  "37": "\"WISST\" (تعرفان) فعل بصيغة المخاطَب الجمعي -- لا يطابق الفاعل غير الشخصي \"man\"، و\"DURFTE\" (كان يُسمح له) فعل بمعنى مختلف تماماً -- لا يصف معرفة عامة؛ وصف معرفة عامة شائعة يستدعي \"KENNT\".",
  "38": "\"DIE\" (يُستخدم في الفجوة 33) ضمير موصول -- لا يعمل ضميراً ظرفياً، و\"ALS\" أداة مقارنة -- لا يصلح أيضاً؛ التعبير الثابت \"es geht darum\" يستلزم \"DARUM\" حصراً.",
  "39": "\"ALS\" تصف حدثاً ماضياً فريداً -- لا تنازلاً شرطياً عاماً، و\"ERST\" (فقط) ظرف -- لا تعمل أداة شرط؛ التنازل الشرطي يستدعي \"WENN\" (مقترنة بـ auch).",
  "40": "\"ERST\" (فقط/للتو) يوحي بتأخر الحدث -- عكس معنى \"قريباً\"، و\"SCHON\" (يُستخدم في الفجوة 35) ظرف زمني آخر -- معنى مختلف تماماً؛ التعبير الثابت \"bald hören lassen\" يستلزم \"BALD\" حصراً.",
};

const STAEDTE_WRONG = {
  "31": "\"DAZU\" (يُستخدم في الفجوة 37) ضمير ظرفي بحرف جر مختلف (zu) -- التعبير الثابت \"träumen von\" يستلزم حرف الجر \"von\" حصراً، و\"HIERMIT\" (بموجب هذا) ظرف رسمي -- معنى مختلف تماماً؛ هذا يستلزم \"DAVON\".",
  "32": "\"SO\" (هكذا) ظرف كيفية -- لا يعمل ضمير تعميم، و\"WENN\" (إذا) أداة شرطية -- لا تصلح للتعميم على فاعل غير محدد بنفس الطريقة؛ التعميم على أي شخص يقود سيارة يستدعي \"WER\".",
  "33": "\"WENN\" (إذا) أداة شرطية -- لا تصلح جملة متممة مؤكدة، و\"SO\" (هكذا) ظرف -- لا يعمل أداة ربط؛ التعبير الثابت \"daraus folgt, dass\" يستلزم \"DASS\" حصراً.",
  "34": "\"SO\" (هكذا) ظرف كيفية -- معنى مختلف تماماً عن التكرار، و\"HIERMIT\" (بموجب هذا) ظرف رسمي -- لا يصلح أيضاً؛ وصف تكرار الظاهرة يستدعي \"OFT\".",
  "35": "\"GRABEN\" (يُستخدم في الفجوة 39 بمعنى \"يحفر\") فعل مختلف تماماً، و\"KLAUEN\" (يسرق) فعل غير ذي صلة إطلاقاً؛ بنية المقارنة \"länger...als sie fahren\" تحدد \"FAHREN\".",
  "36": "\"SO\" (هكذا) ظرف نتيجة -- معنى مختلف تماماً عن السبب، و\"WENN\" (إذا) أداة شرطية -- لا تفسّر سبباً واقعاً؛ تفسير سبب الجملة السابقة يستدعي \"DENN\".",
  "37": "\"DAVON\" (يُستخدم في الفجوة 31) ضمير ظرفي بحرف جر مختلف (von)، و\"HIERMIT\" (بموجب هذا) ظرف رسمي -- لا يكوّنان التعبير الثابت \"führen zu\"؛ هذا يستلزم \"DAZU\" حصراً.",
  "38": "\"SO\" (هكذا) ظرف كيفية -- لا يصوغ جملة غرض بمصدر، و\"WENN\" (إذا) أداة شرطية -- معنى مختلف تماماً؛ التعبير عن الغرض في بداية الجملة يستدعي \"UM\" (مقترنة بـ zu).",
  "39": "\"REIBEN\" (يفرك) فعل غير ذي صلة، و\"KLAUEN\" (يسرق) فعل آخر غير ذي صلة إطلاقاً؛ السياق (حفر أنفاق المترو) يحدد \"GRABEN\".",
  "40": "\"GRABEN\" (يُستخدم في الفجوة 39 بمعنى \"يحفر\") فعل مختلف تماماً، و\"REIBEN\" (يفرك) فعل غير ذي صلة؛ التعبير الثابت \"Arbeit kosten\" يستلزم \"KOSTEN\" حصراً.",
};

const TEAMARBEIT_WRONG = {
  "31": "\"ERBRINGEN\" (يُقدّم/يُنجز) فعل قريب المعنى (يُستخدم عادة مع الاسم \"Nachweis\" لا كفعل مباشر هنا)، و\"FÖRDERTE\" (عزّز/دعم) فعل ماضٍ بمعنى مختلف تماماً -- السياق (إثبات علمي) يحدد \"NACHWEISEN\" حصراً.",
  "32": "\"DAZU\" (يُستخدم في الفجوة 33) ضمير ظرفي -- لا يحكم اسماً تالياً مباشرة، و\"DAVON\" (يُستخدم في الفجوة 34) ضمير ظرفي آخر بحرف جر مختلف -- لا يصلح أيضاً؛ التعبير الثابت \"fähig zu\" يستلزم حرف الجر المجرد \"ZU\".",
  "33": "\"DAVON\" (يُستخدم في الفجوة 34 بحرف جر von) ضمير ظرفي مختلف، و\"ZU\" (يُستخدم في الفجوة 32) حرف جر مجرد -- لا يعمل ضميراً ظرفياً؛ الربط بمهمة سابقة كسياق يستدعي \"DAZU\".",
  "34": "\"DAZU\" (يُستخدم في الفجوة 33 بحرف جر zu) ضمير ظرفي مختلف، و\"ZU\" (يُستخدم في الفجوة 32) حرف جر مجرد -- لا يعمل ضميراً ظرفياً جزئياً؛ الإشارة الجزئية لمجموعة سابقة تستدعي \"DAVON\".",
  "35": "\"HABEN\" (يملكون) فعل إخباري مباشر -- لا يناسب نقل نتيجة الدراسة بأسلوب غير مباشر، و\"MUSSTEN\" (اضطروا) فعل وجهي ماضٍ -- معنى مختلف تماماً؛ نقل نتيجة الدراسة بأسلوب غير مباشر يستدعي Konjunktiv I: \"SEI\".",
  "36": "\"BEKANNTLICH\" (كما هو معروف) ظرف استهلالي -- معنى مختلف تماماً عن الحصرية، و\"ZU\" (يُستخدم في الفجوة 32) حرف جر -- لا يعمل ظرف حصر؛ التعبير عن الحصرية يستدعي \"NUR\".",
  "37": "\"MUSSTEN\" (اضطروا) فعل وجهي يفيد الإلزام -- لا القدرة الناتجة، و\"HABEN\" (يملكون) فعل حاضر -- لا يصف قدرة ماضية؛ وصف قدرة تحققت في الماضي يستدعي \"KONNTEN\".",
  "38": "\"ERBRINGEN\" مصدر (وليس فعلاً مصرّفاً بصيغة الغائب المفرد كما هنا)، و\"FÖRDERTE\" (عزّز) فعل ماضٍ بمعنى مختلف تماماً -- التعبير الثابت \"Hinweise liefern\" يستلزم \"LIEFERT\" حصراً.",
  "39": "\"HABEN\" (يملكون) فعل عام -- لا يكوّن التعبير الثابت \"Acht geben\"، و\"ERBRINGEN\" (يُنجز) فعل آخر غير ذي صلة؛ هذا التعبير يستلزم \"GEBEN\" حصراً.",
  "40": "\"NUR\" (يُستخدم في الفجوة 36 بمعنى \"فقط\") ظرف حصر -- معنى مختلف تماماً عن التماثل، و\"BEKANNTLICH\" (كما هو معروف) ظرف استهلالي -- لا يعمل أداة مقارنة؛ التماثل الكامل بين طرفين يستدعي \"WIE\".",
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
  await deepenExercise("Songwettbewerb auf der Burg Tanneck", SONGWETTBEWERB_WRONG);
  await deepenExercise("Städte vor dem Infarkt", STAEDTE_WRONG);
  await deepenExercise("Teamarbeit als Schlüssel zum Erfolg", TEAMARBEIT_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

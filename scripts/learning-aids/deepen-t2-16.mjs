/**
 * Deepen T2 #16: "Verlernen die Deutschen die Höflichkeit?", "Was steckt
 * hinter \"Bio\"?" (2 rows: "( Original )" and "(معدل)").
 *
 * Usage: node scripts/learning-aids/deepen-t2-16.mjs [--apply]
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

const HOEFLICHKEIT_WRONG = {
  "31": "\"MEINEN\" (يُستخدم في الفجوة 32 بمعنى \"يعتقدون\") فعل رأي عام -- لا يكوّن التعبير الثابت \"zustimmen\"، و\"NEHMEN\" (يأخذون) فعل مختلف تماماً -- لا علاقة له بالموافقة؛ هذا يستلزم \"STIMMEN\" حصراً (مقترنة بـ zu).",
  "32": "\"STIMMEN\" (يُستخدم في الفجوة 31 بمعنى \"يوافقون\") فعل مختلف قليلاً في الدلالة -- لا ينقل رأياً شخصياً بنفس الطبيعية، و\"NACHEINANDER\" (تباعاً) ظرف -- معنى مختلف تماماً؛ نقل رأي أغلبية المُستطلَعين يستدعي \"MEINEN\".",
  "33": "\"MAN\" ضمير عام -- لا يعمل حرف جر، و\"FEIN\" (لطيف/ناعم) صفة -- لا يصلح أيضاً؛ التعبير الثابت \"Wunsch nach\" يستلزم \"NACH\" حصراً.",
  "34": "\"NACHEINANDER\" (تباعاً/الواحد تلو الآخر) كلمة تشبه \"Miteinander\" في التركيب لكنها تصف تتابعاً زمنياً لا تفاعلاً متبادلاً، و\"SINNLOS\" (بلا معنى) صفة -- معنى مختلف تماماً؛ السياق (قواعد للتعامل المتبادل) يحدد \"MITEINANDER\".",
  "35": "\"SINNLOS\" (بلا معنى) صفة قريبة المعنى لكنها لا تكوّن التعبير الشائع \"vergeblich suchen\"، و\"FEIN\" (لطيف) صفة -- معنى مختلف تماماً؛ وصف بحث غير مثمر يستدعي \"VERGEBLICH\".",
  "36": "\"FEIN\" (لطيف/دقيق) صفة بمعنى مختلف تماماً، و\"NEHMEN\" (يأخذون) فعل -- لا يعمل أداة تقريب كمي؛ التقريب الكمي لنسبة مئوية يستدعي \"GUT\".",
  "37": "\"MEINEN\" (يُستخدم في الفجوة 32) فعل رأي -- لا يفيد احتمالاً متروكاً للتخمين، و\"STIMMEN\" (يُستخدم في الفجوة 31) فعل موافقة -- معنى مختلف تماماً؛ التعبير عن احتمال متروك للتخمين يستدعي \"MÖGEN\".",
  "38": "\"LASSEN\" (يُستخدم في الفجوة 39 بمعنى \"يترك\") فعل مختلف تماماً، و\"NEHMEN\" (يأخذون) فعل آخر غير ذي صلة؛ التعبير الثابت الانعكاسي \"sich stören an\" يستلزم \"STÖREN\" حصراً.",
  "39": "\"STÖREN\" (يُستخدم في الفجوة 38 بمعنى \"ينزعج\") فعل مختلف تماماً، و\"NEHMEN\" (يأخذون) فعل بمعنى معاكس تقريباً (يأخذ الأولوية لا يمنحها)؛ التعبير الثابت \"den Vortritt lassen\" يستلزم \"LASSEN\" حصراً.",
  "40": "\"MAN\" ضمير فاعل عام -- لا يعمل ضميراً انعكاسياً، و\"GUT\" (يُستخدم في الفجوة 36) صفة -- لا يصلح أيضاً؛ التعبير الثابت \"sich gehören\" يستلزم \"SICH\" حصراً.",
};

const BIO_ORIGINAL_WRONG = {
  "31": "\"WENN\" (إذا/عندما) أداة شرطية زمنية -- لا تصوغ سؤالاً بالشك، و\"DASS\" (يُستخدم في الفجوة 40) أداة ربط لجملة متممة مؤكدة -- معنى مختلف تماماً؛ التساؤل الشكوك يستدعي \"OB\".",
  "32": "\"SOGAR\" (حتى) ظرف تعزيز امتداد -- معنى مختلف تماماً عن الإضافة، و\"FÜR\" حرف جر -- لا يعمل ظرف إضافة مستقل؛ إضافة سبب آخر مستقل يستدعي \"AUSSERDEM\".",
  "33": "\"ENTLASTET\" (يُستخدم في الفجوة 35 بمعنى \"يخفف العبء\") فعل مختلف تماماً، و\"VERWENDET\" (يُستخدم في الفجوة 38 بمعنى \"يُستخدم\") فعل آخر -- لا يصف محتوى المنتج بنفس المعنى؛ وصف محتوى المنتج يستدعي \"ENTHALTEN\".",
  "34": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AUF\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يناسب أيضاً؛ التعبير الثابت \"hinter etwas stehen\" يستلزم \"HINTER\" حصراً.",
  "35": "\"ENTHALTEN\" (يُستخدم في الفجوة 33 بمعنى \"يحتوي\") فعل مختلف تماماً، و\"VERWENDET\" (يُستخدم في الفجوة 38) فعل آخر -- لا يصف تخفيف الضرر البيئي؛ وصف تخفيف الضرر البيئي يستدعي \"ENTLASTET\".",
  "36": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AUF\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يناسب أيضاً؛ التعبير الثابت \"kommen aus\" يستلزم \"AUS\" حصراً.",
  "37": "\"AN\" حرف جر مختلف تماماً، و\"AUS\" (يُستخدم في الفجوة 36) حرف جر آخر -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"auf dem Markt\" يستلزم \"AUF\" حصراً.",
  "38": "\"ENTHALTEN\" (يُستخدم في الفجوة 33) فعل مختلف تماماً، و\"ENTLASTET\" (يُستخدم في الفجوة 35) فعل آخر غير ذي صلة؛ مبني للمجهول يفرض Partizip II: \"VERWENDET\".",
  "39": "\"SOGAR\" (حتى) ظرف تعزيز امتداد -- معنى مختلف تماماً عن التأكيد على الصرامة، و\"FÜR\" حرف جر -- لا يعمل ظرف تأكيد؛ تأكيد صرامة الشرط يستدعي \"WIRKLICH\".",
  "40": "\"OB\" (يُستخدم في الفجوة 31 بمعنى \"هل\") يصوغ سؤالاً مشكوكاً فيه -- لا جملة متممة لضمان مؤكد، و\"SONDERN\" أداة عطف -- لا تعمل أداة ربط لجملة متممة؛ التعبير الثابت \"garantieren, dass\" يستلزم \"DASS\" حصراً.",
};

const BIO_MODIFIZIERT_WRONG = {
  "31": "\"WENN\" (إذا/عندما) أداة شرطية زمنية -- لا تصوغ سؤالاً بالشك، و\"SONDERN\" أداة عطف -- لا تعمل أداة سؤال؛ التساؤل الشكوك يستدعي \"OB\".",
  "32": "\"AN\" حرف جر -- لا يعمل ظرف إضافة مستقل، و\"Belastet\" (يُثقل) فعل -- لا يصلح أيضاً؛ إضافة سبب آخر يستدعي \"Außerdem\".",
  "33": "\"Entlastet\" (يُستخدم لاحقاً بمعنى \"يخفف العبء\") فعل مختلف تماماً عن الاحتواء، و\"Belastet\" (يُثقل/يُحمّل عبئاً) فعل بمعنى معاكس تقريباً -- لا يصف محتوى المنتج؛ وصف محتوى المنتج يستدعي \"ENTHALTEN\".",
  "34": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AUF\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يناسب أيضاً؛ التعبير الثابت \"hinter etwas stehen\" يستلزم \"HINTER\" حصراً.",
  "35": "\"Belastet\" (يُثقل/يُحمّل عبئاً) فعل من نفس الجذر لكنه بمعنى معاكس تماماً (يزيد الضرر لا يخففه)، و\"ENTHALTEN\" (يُستخدم في الفجوة 33) فعل آخر بمعنى مختلف؛ وصف تخفيف الضرر البيئي يستدعي \"ENTLASTET\" حصراً لا نقيضها Belastet.",
  "36": "\"AN\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"AUF\" (يُستخدم في الفجوة 37) حرف جر آخر -- لا يناسب أيضاً؛ التعبير الثابت \"kommen aus\" يستلزم \"AUS\" حصراً.",
  "37": "\"AN\" حرف جر مختلف تماماً، و\"AUS\" (يُستخدم في الفجوة 36) حرف جر آخر -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"auf dem Markt\" يستلزم \"AUF\" حصراً.",
  "38": "\"ENTHALTEN\" (يُستخدم في الفجوة 33) فعل مختلف تماماً، و\"Entlastet\" (يُستخدم في الفجوة 35) فعل آخر غير ذي صلة؛ مبني للمجهول يفرض صيغة الفاعل الثاني \"VERWENDET\".",
  "39": "\"AN\" حرف جر -- لا يعمل ظرف تأكيد، و\"Belastet\" فعل -- لا يصلح أيضاً؛ تأكيد صرامة الشرط يستدعي \"WIRKLICH\".",
  "40": "\"OB\" (يُستخدم في الفجوة 31) يصوغ سؤالاً مشكوكاً فيه -- لا جملة متممة لضمان مؤكد، و\"SONDERN\" أداة عطف -- لا تعمل أداة ربط لجملة متممة؛ التعبير الثابت \"garantieren, dass\" يستلزم \"DASS\" حصراً.",
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
  await deepenExercise("Verlernen die Deutschen die Höflichkeit?", HOEFLICHKEIT_WRONG);
  await applyToId("4d37c542-fc5d-4437-bde1-6d1cbd96fa7f", "Was steckt hinter \"Bio\"? ( Original )", BIO_ORIGINAL_WRONG);
  await applyToId("04ad0a50-30ea-4987-a3f8-19e5d321540c", "Was steckt hinter \"Bio\"? (معدل)", BIO_MODIFIZIERT_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

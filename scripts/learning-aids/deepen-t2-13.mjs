/**
 * Deepen T2 #13: "Schwarzarbeit kann teuer werden" (2 rows: "( Original )"
 * and "(معدل)"), "Sicherer Schulweg", "Sollte man nicht doch besser aufs
 * Fahrrad umsteigen?" (a paraphrase-twin of the already-deepened "Das
 * Fahrrad: ernsthafte Konkurrenz fürs Auto?" -- shares 14/15 word-bank
 * words but differs at gap 33, so re-derived, not copy-pasted).
 *
 * Usage: node scripts/learning-aids/deepen-t2-13.mjs [--apply]
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

const SCHWARZARBEIT_ORIGINAL_WRONG = {
  "31": "\"UM\" (من أجل) أداة غرض -- معنى مختلف تماماً عن المفارقة الاستبدالية، و\"DAGEGEN\" (بالمقابل) ظرف تضاد -- لا يصوغ بنية استبدال بمصدر؛ بنية المفارقة \"X anstatt zu Y\" تستلزم \"ANSTATT\" حصراً.",
  "32": "\"ALLES\" (كل شيء) ضمير محايد عام -- لا يطابق الاسم المؤنث \"Gelegenheit\" نحوياً، و\"HÖCHSTENS\" (على الأكثر) ظرف تقييد كمي -- معنى مختلف تماماً؛ نفي التعميم المطلق (ليست كل فرصة) يستدعي \"JEDE\".",
  "33": "\"DAGEGEN\" ضمير ظرفي -- لا يحكم اسماً تالياً مباشرة (illegale Arbeiter)، و\"UM\" حرف جر مختلف تماماً -- لا يناسب أيضاً؛ التعبير الثابت \"Argument gegen\" يستلزم حرف الجر المجرد \"GEGEN\".",
  "34": "\"DAGEGEN\" ضمير ظرفي بحرف جر مختلف (gegen) -- التعبير الثابت \"abgesehen davon, dass\" يستلزم حرف الجر \"von\" حصراً، و\"WILL\" (يُستخدم في الفجوة 35) فعل -- لا يعمل ضميراً ظرفياً؛ هذا يستلزم \"DAVON\".",
  "35": "\"WÜNSCHT\" (يتمنى) فعل أضعف دلالياً -- لا يفيد الشرط الصارم الذي تفرضه جهة رسمية، و\"BEKOMMEN\" (يُستخدم في الفجوة 39) فعل مختلف تماماً -- لا يصلح أيضاً؛ وصف شرط صارم يستدعي \"WILL\".",
  "36": "\"AUSGEHEN\" (يُستخدم في الفجوة 37 بمعنى \"يخرج خالي الوفاض\") فعل مختلف تماماً، و\"BEKOMMEN\" (يُستخدم في الفجوة 39) فعل آخر غير ذي صلة؛ التعبير الثابت \"die Ausnahme bilden\" يستلزم \"BILDEN\" حصراً.",
  "37": "\"BILDEN\" (يُستخدم في الفجوة 36 بمعنى \"يُشكّل\") فعل مختلف تماماً، و\"BEKOMMEN\" (يُستخدم في الفجوة 39) فعل آخر غير ذي صلة؛ التعبير الثابت \"leer ausgehen\" يستلزم \"AUSGEHEN\" حصراً.",
  "38": "\"ALLES\" (كل شيء) ضمير محايد -- لا يطابق الاسم الجمعي \"Fälle\" نحوياً، و\"JEDE\" (يُستخدم في الفجوة 32 بمعنى \"كل واحدة\") صفة مفردة -- لا تناسب الجمع؛ الإشارة لفئة حالات سابقة يستدعي \"SOLCHE\".",
  "39": "\"WILL\" (يُستخدم في الفجوة 35) فعل إرادة/طلب -- معنى مختلف تماماً، و\"AUSGEHEN\" (يُستخدم في الفجوة 37) فعل آخر -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"es mit etwas zu tun bekommen\" يستلزم \"BEKOMMEN\" حصراً.",
  "40": "\"HÖCHSTENS\" (على الأكثر) ظرف تقييد كمي يشبه \"meistens\" شكلاً لكنه بمعنى مختلف تماماً (سقف أقصى لا تكرار)، و\"ALLES\" (كل شيء) ضمير -- لا يعمل ظرف تكرار؛ وصف تكرار حدوث الحاجة يستدعي \"MEISTENS\".",
};

const SCHWARZARBEIT_MODIFIZIERT_WRONG = {
  "31": "\"UM\" (من أجل) أداة غرض -- معنى مختلف تماماً عن المفارقة الاستبدالية، و\"DAGEGEN\" (بالمقابل) ظرف تضاد -- لا يصوغ بنية استبدال بمصدر؛ بنية المفارقة \"X anstatt zu Y\" تستلزم \"ANSTATT\" حصراً.",
  "32": "\"ALLES\" (كل شيء) ضمير محايد عام -- لا يطابق الاسم المؤنث \"Gelegenheit\" نحوياً، و\"WECHSELN\" (يُغيّر) فعل -- لا يعمل صفة نفي؛ نفي التعميم المطلق يستدعي \"JEDE\".",
  "33": "\"DAGEGEN\" ضمير ظرفي -- لا يحكم اسماً تالياً مباشرة، و\"UM\" حرف جر مختلف تماماً -- لا يناسب أيضاً؛ التعبير الثابت \"Argument gegen\" يستلزم حرف الجر المجرد \"GEGEN\".",
  "34": "\"DAGEGEN\" ضمير ظرفي بحرف جر مختلف (gegen) -- التعبير الثابت \"abgesehen davon, dass\" يستلزم حرف الجر \"von\" حصراً، و\"WILL\" (يُستخدم في الفجوة 35) فعل -- لا يعمل ضميراً ظرفياً؛ هذا يستلزم \"DAVON\".",
  "35": "\"WÜNSCHT\" (يتمنى) فعل أضعف دلالياً -- لا يفيد الشرط الصارم الذي تفرضه جهة رسمية، و\"BEKOMMEN\" (يُستخدم في الفجوة 39) فعل مختلف تماماً -- لا يصلح أيضاً؛ وصف شرط صارم يستدعي \"WILL\".",
  "36": "\"AUSGEHEN\" (يُستخدم في الفجوة 37 بمعنى \"يخرج خالي الوفاض\") فعل مختلف تماماً، و\"BEKOMMEN\" (يُستخدم في الفجوة 39) فعل آخر غير ذي صلة؛ التعبير الثابت \"die Ausnahme darstellen\" (يُمثّل الاستثناء) يستلزم الفعل المنفصل \"STELLEN\" (dar+stellen) حصراً.",
  "37": "\"STELLEN\" (يُستخدم في الفجوة 36 بمعنى \"يُمثّل\") فعل مختلف تماماً، و\"BEKOMMEN\" (يُستخدم في الفجوة 39) فعل آخر غير ذي صلة؛ التعبير الثابت \"leer ausgehen\" يستلزم \"AUSGEHEN\" حصراً.",
  "38": "\"ALLES\" (كل شيء) ضمير محايد -- لا يطابق الاسم الجمعي \"Fälle\" نحوياً، و\"JEDE\" (يُستخدم في الفجوة 32) صفة مفردة -- لا تناسب الجمع؛ الإشارة لفئة حالات سابقة يستدعي \"SOLCHE\".",
  "39": "\"WILL\" (يُستخدم في الفجوة 35) فعل إرادة/طلب -- معنى مختلف تماماً، و\"AUSGEHEN\" (يُستخدم في الفجوة 37) فعل آخر -- لا يكوّنان هذا التعبير؛ التعبير الثابت \"es mit etwas zu tun bekommen\" يستلزم \"BEKOMMEN\" حصراً.",
  "40": "\"WECHSELN\" (يُغيّر) فعل -- لا يعمل ظرف تكرار، و\"ALLES\" (كل شيء) ضمير -- لا يصلح أيضاً؛ وصف التكرار يستدعي \"MEISTENS\".",
};

const SCHULWEG_WRONG = {
  "31": "\"DOCH\" (لكن) أداة تعارض -- معنى مختلف تماماً عن النتيجة، و\"SCHON\" (بالفعل) ظرف تأكيد فوري -- لا يستخلص نتيجة؛ استخلاص نتيجة من سبب سابق يستدعي \"DESHALB\".",
  "32": "\"DOCH\" (لكن) أداة تعارض -- لا تعمل أداة نفي، و\"SCHON\" (بالفعل) ظرف -- لا يصلح أيضاً؛ نفي التعميم المطلق يستدعي \"NICHT\".",
  "33": "\"BEMÜHEN\" (يجتهد) فعل قريب المعنى لكنه يقترن بحرف جر مختلف (\"sich bemühen um\" لا \"auf\")، و\"VERHALTEN\" (يُستخدم في الفجوة 37 بمعنى \"سلوك\") اسم/فعل مختلف تماماً -- لا يصلح أيضاً؛ التعبير الثابت \"sich konzentrieren auf\" يستلزم \"KONZENTRIEREN\" حصراً.",
  "34": "\"SELBSTBEWUSST\" (يُستخدم في الفجوة 39 بمعنى \"واثق من نفسه\") صفة مختلفة تماماً، و\"SCHON\" (بالفعل) ظرف تأكيد -- لا يفيد التأكيد على الذات؛ التأكيد على الالتزام الذاتي يستدعي \"SELBST\".",
  "35": "\"KRITISCHE\" (يُستخدم في الفجوة 38 بمعنى \"حرجة\") صفة بمعنى مختلف تماماً، و\"PROBLEME\" (مشاكل) اسم -- لا يعمل صفة محمول؛ وصف فائدة أسلوب تربوي يستدعي \"HILFREICH\".",
  "36": "\"STATT\" (بدلاً من) حرف جر بمعنى مختلف تماماً، و\"DOCH\" (لكن) أداة تعارض -- لا تعمل جزءاً من هذا التعبير الثابت؛ \"Schritt für Schritt\" يستلزم \"FÜR\" حصراً.",
  "37": "\"KONZENTRIEREN\" (يُستخدم في الفجوة 33 بمعنى \"يركّز\") فعل مختلف تماماً، و\"PROBLEME\" (مشاكل) اسم غير ذي صلة؛ السياق (قواعد التصرف المروري) يحدد \"VERHALTEN\".",
  "38": "\"HILFREICH\" (يُستخدم في الفجوة 35 بمعنى \"مفيد\") صفة بمعنى مختلف تماماً، و\"PROBLEME\" (مشاكل) اسم -- لا يعمل صفة أمام \"Situationen\"؛ وصف مواقف طارئة محتملة يستدعي \"KRITISCHE\".",
  "39": "\"SELBST\" (يُستخدم في الفجوة 34 بمعنى \"بنفسه\") ضمير تأكيد -- لا يصف صفة الثقة، و\"HILFREICH\" (مفيد) صفة أخرى -- معنى مختلف تماماً؛ وصف الهدف التربوي (الثقة بالنفس) يستدعي \"SELBSTBEWUSST\".",
  "40": "\"PROBLEME\" (مشاكل) اسم بمعنى معاكس تقريباً (المشاكل لا الحلول)، و\"KRITISCHE\" (يُستخدم في الفجوة 38) صفة -- لا تعمل اسماً؛ التعبير الثابت \"Lösungen finden\" يستلزم \"LÖSUNGEN\" حصراً.",
};

const FAHRRAD_UMSTEIGEN_WRONG = {
  "31": "\"FAST\" (تقريباً) تفيد اقتراباً من اكتمال الشيء (الاتجاه الإيجابي)، و\"BEINAHE\" مرادف له بنفس المعنى -- كلاهما عكس الاتجاه الدلالي المطلوب هنا (الندرة شبه المعدومة)؛ هذا يستلزم \"KAUM\".",
  "32": "\"VOR\" حرف جر مختلف تماماً لا يكوّن هذا الفعل المركّب، و\"AN\" (يُستخدم في التعبير الثابت \"Angebot an\" في الفجوة 37) -- لا يقترن بالفعل \"umsteigen\"؛ التعبير الثابت \"umsteigen auf\" يستلزم \"AUF\" حصراً.",
  "33": "\"FAST\" (تقريباً) تعني الاقتراب من اكتمال صفة معينة (طرق تكاد تكون معبّدة جيداً دون أن تكتمل)، لا انطباق الصفة في معظم الحالات كما هنا، و\"VOR\" حرف جر -- لا يعمل ظرفاً وصفياً؛ وصف حالة غالبة لا مطلقة يستدعي \"ZUMEIST\".",
  "34": "\"VOR\" حرف جر بمعنى مختلف تماماً (أمام/قبل)، و\"DAFÜR\" ضمير ظرفي -- لا يصلح لبنية استبدال بمصدر؛ بنية المقارنة الاستبدالية \"X statt zu Y\" تستلزم \"STATT\" حصراً.",
  "35": "\"VOR\" حرف جر بمعنى \"أمام/قبل\" -- عكس المعنى المكاني الداخلي المطلوب، و\"DAFÜR\" ضمير ظرفي -- لا يصلح حرف جر يحكم اسماً بحالة الملكية؛ وصف موقع داخلي محصور يستلزم \"INNERHALB\" حصراً.",
  "36": "\"DÜRFEN\" (يُسمح له) يفيد إذناً -- عكس المعنى المطلوب (اضطرار موضوعي لا خيار فيه)، و\"SOLLEN\" (يُستخدم في الفجوة 38 بمعنى \"يُفترض\") يفيد توصية/غرضاً خارجياً غير مؤكد -- لا اضطراراً حتمياً؛ هذا يستلزم \"MÜSSEN\".",
  "37": "\"AUF\" (يُستخدم في الفعل المركّب \"umsteigen auf\" في الفجوة 32) -- لا يكوّن التعبير الثابت هنا، و\"VOR\" حرف جر مختلف تماماً؛ التعبير الثابت \"ein Angebot an + Dativ\" يستلزم \"AN\" حصراً.",
  "38": "\"MÜSSEN\" (يجب) يفيد اضطراراً حتمياً موضوعياً -- لا وعداً تسويقياً غير مؤكد، و\"DÜRFEN\" (يُسمح) يفيد إذناً -- معنى مختلف تماماً؛ التعبير عن وعد غير مؤكد لمنتج يستلزم \"SOLLEN\".",
  "39": "\"DENN\" (لأن) يفسّر سبباً -- لا يصوغ نتيجة لشرط زمني (wenn...dann)، و\"VOR\" حرف جر -- لا يعمل ظرف نتيجة؛ النتيجة المترتبة على الشرط الزمني تستلزم \"DANN\".",
  "40": "\"DANN\" (حينئذٍ) يصوغ نتيجة لشرط -- لا تفسيراً سببياً لجملة سابقة، و\"DAFÜR\" ضمير ظرفي -- لا يعمل أداة ربط؛ تفسير سبب الجملة السابقة يستدعي \"DENN\".",
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
  await applyToId("dc78fd0b-685a-484d-833e-df74eea6f9ad", "Schwarzarbeit kann teuer werden ( Original )", SCHWARZARBEIT_ORIGINAL_WRONG);
  await applyToId("e9937091-cffb-44d1-a1d1-4f09fd79d536", "Schwarzarbeit kann teuer werden (معدل)", SCHWARZARBEIT_MODIFIZIERT_WRONG);
  await deepenExercise("Sicherer Schulweg", SCHULWEG_WRONG);
  await deepenExercise("Sollte man nicht doch besser aufs Fahrrad umsteigen?", FAHRRAD_UMSTEIGEN_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

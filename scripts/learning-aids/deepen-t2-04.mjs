/**
 * Deepen T2 #04: "Deutschland – ein Paradies für Kinder?" -- a 3-row
 * duplicate-title situation (Original + 2 distinct معدل versions with
 * genuinely different gap content/word-banks in each), same treatment as
 * the T1 Karin/Jugend-diskutiert precedent: each row analyzed and applied
 * individually by id.
 *
 * Usage: node scripts/learning-aids/deepen-t2-04.mjs [--apply]
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

const ORIGINAL_WRONG = {
  "31": "\"VON\" حرف جر آخر (يُستخدم في التعبير \"sprechen von\" في الفجوة 40) -- لا يكوّن التعبير الثابت هنا، و\"BEI\" حرف جر مختلف (يُستخدم في الفجوة 32) -- لا يقترن بـ\"verglichen\"؛ التعبير الثابت \"verglichen mit\" يستلزم \"MIT\" حصراً.",
  "32": "\"MIT\" حرف جر آخر (يُستخدم في التعبير \"verglichen mit\" في الفجوة 31) -- لا يكوّن هذا التعبير بنفس الدقة، و\"VON\" حرف جر مختلف تماماً؛ التعبير الثابت \"bei jmdm. zu Hause bleiben\" يستلزم \"BEI\" حصراً.",
  "33": "\"DASS\" أداة ربط تابعة تستلزم فعلاً في نهاية الجملة -- لا تناسب هذا الموضع الذي يبدأ جملة رئيسية مستقلة بفعل في المرتبة الثانية (hat)، و\"DOCH\" ظرف تعارض -- لا يعمل فاعلاً/ضميراً؛ بدء جملة جديدة تصف ميزة الفكرة السابقة يستدعي ضمير الإشارة \"DAS\".",
  "34": "\"DAVON\" ضمير ظرفي بحرف جر مختلف (von) -- التعبير الثابت \"der Grund für etwas\" يستلزم حرف الجر \"für\" (dafür)، و\"DABEI\" ضمير ظرفي آخر بحرف جر مختلف (bei) -- لا يناسب أيضاً؛ هذا يستلزم \"DAFÜR\".",
  "35": "\"JEDOCH\" (لكن) أداة تعارض مستقلة -- لا تصحّح مباشرة فكرة منفية بـ\"nicht\" كما هنا، و\"DOCH\" أداة تعارض مشابهة -- نفس المشكلة؛ النفي الصريح السابق (nicht still) يفرض بنية التصحيح \"SONDERN\" حصراً.",
  "36": "\"DENNOCH\" ظرف تعارض مستقل يستلزم ترتيب الفعل في المرتبة الثانية في جملته الخاصة -- لا يعمل أداة ربط تابعة، و\"JEDOCH\" (لكن) نفس المشكلة -- كلاهما لا يصلح لجملة جانبية بفعل في النهاية؛ التناقض بين السلوك والنتيجة داخل جملة تابعة يستدعي \"OBWOHL\".",
  "37": "\"DASS\" أداة ربط تابعة لكن بمعنى مختلف (يُدخل جملة متممة/نتيجة لا سبباً)، و\"DAFÜR\" ضمير ظرفي -- لا يعمل أداة ربط لجملة كاملة؛ تفسير سبب الفعل السابق (رفع الدعاوى) يستدعي \"WEIL\".",
  "38": "\"WEIL\" (لأن) أداة ربط سببية -- معنى مختلف تماماً عن النتيجة، و\"OBWOHL\" (رغم أن) أداة تنازل -- لا تناسب بنية النتيجة \"so...dass\"؛ هذا يستلزم \"DASS\" حصراً.",
  "39": "\"MIT\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"BEI\" حرف جر آخر -- لا يقترن بـ\"Anspruch\"؛ التعبير الثابت \"Anspruch auf\" يستلزم \"AUF\" حصراً.",
  "40": "\"MIT\" حرف جر بمعنى \"مع\" (التحدث مع شخص) -- معنى مختلف تماماً عن التحدث عن موضوع، و\"DAVON\" ضمير ظرفي -- لا يصلح مباشرة قبل اسم مذكور صراحة (\"Problemen\")؛ التعبير الثابت \"sprechen von\" مع اسم صريح يستلزم حرف الجر المجرد \"VON\".",
};

const MODIFIED1_WRONG = {
  "31": "\"MIT\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"DAFÜR\" ضمير ظرفي -- لا يعمل حرف جر مدمجاً مع أداة التعريف؛ التعبير الثابت \"zur Verfügung stehen\" (zu+der) يستلزم \"ZUR\" حصراً.",
  "32": "\"MIT\" حرف جر آخر لا يكوّن هذا التعبير بنفس الدقة، و\"DABEI\" ضمير ظرفي مركّب -- لا يحكم اسماً تالياً (dem Kind) مباشرة؛ التعبير الثابت \"bei jmdm. zu Hause bleiben\" يستلزم حرف الجر المجرد \"BEI\".",
  "33": "\"DASS\" أداة ربط تابعة تستلزم فعلاً في نهاية الجملة -- لا تناسب بدء جملة رئيسية مستقلة بفعل في المرتبة الثانية (hat)، و\"JEDOCH\" (لكن) ظرف تعارض -- لا يعمل فاعلاً/ضميراً؛ بدء جملة جديدة تصف ميزة فكرة سابقة يستدعي ضمير الإشارة \"DAS\".",
  "34": "\"DOCH\" (لكن) أداة تعارض عامة -- تُستخدم لاحقاً في الفجوة 35 للانتقال لفكرة إضافية مختلفة، و\"JEDOCH\" أداة تعارض مشابهة لكن أضعف ارتباطاً بالتنازل عن ميزة مذكورة سابقاً -- التنازل عن الميزة المذكورة توًّا (عدم فقدان الوظيفة) رغم وجود مشكلة حقيقية يستدعي تحديداً \"DENNOCH\".",
  "35": "\"DENNOCH\" (رغم ذلك) مرتبطة تحديداً بالتنازل عن فكرة سابقة محددة (الفجوة 34) -- لا بمجرد الانتقال لموضوع إضافي جديد، و\"JEDOCH\" أداة تعارض رسمية أثقل -- أقل طبيعية في بدء فقرة جديدة؛ الانتقال لفكرة إضافية متناقضة يستدعي \"DOCH\".",
  "36": "\"JEDOCH\" أداة تعارض مستقلة -- لا تصحّح مباشرة فكرة منفية بـ\"nicht\"، و\"DAVON\" ضمير ظرفي -- لا علاقة له بهذه البنية؛ النفي السابق (nicht still) يفرض \"SONDERN\" حصراً.",
  "37": "\"DABEI\" ضمير ظرفي -- لا يعمل ضمير مفعول به لشخص، و\"DAFÜR\" ضمير ظرفي آخر -- نفس المشكلة؛ نفي فاعل بشري كمفعول به (لا يزعج أحداً) يستدعي ضمير النفي \"NIEMANDEN\".",
  "38": "\"DASS\" أداة ربط لكن بمعنى مختلف (نتيجة/تتميم لا سبب)، و\"DAFÜR\" ضمير ظرفي -- لا يعمل أداة ربط لجملة كاملة؛ تفسير سبب الفعل السابق (رفع الدعاوى) يستدعي \"WEIL\".",
  "39": "\"WEIL\" (لأن) أداة سببية -- معنى مختلف تماماً عن النتيجة، و\"DABEI\" ضمير ظرفي -- لا يعمل أداة ربط لجملة نتيجة؛ بنية \"so...dass\" تستلزم \"DASS\" حصراً.",
  "40": "\"MIT\" حرف جر مختلف تماماً، و\"BEI\" حرف جر آخر (يُستخدم في الفجوة 32) -- لا يقترنان بـ\"Anspruch\"؛ التعبير الثابت \"Anspruch auf\" يستلزم \"AUF\" حصراً.",
};

const MODIFIED2_WRONG = {
  "31": "\"BEI\" حرف جر مختلف تماماً لا يكوّن هذا التعبير، و\"DAFÜR\" ضمير ظرفي -- لا يعمل حرف جر مدمجاً مع أداة التعريف؛ التعبير الثابت \"zur Verfügung stehen\" يستلزم \"ZUR\" حصراً.",
  "32": "\"DOCH\" أداة تعارض عامة أخف وطأة -- لا ترتبط تحديداً بالتنازل عن الميزة المذكورة سابقاً (عدم فقدان الوظيفة)، و\"DAVON\" ضمير ظرفي -- لا يعمل أداة تعارض؛ هذا التنازل المحدد يستدعي \"DENNOCH\".",
  "33": "\"WERDEN\" فعل مساعد بمعنى مختلف تماماً (يُستخدم في الفجوة 36)، و\"SICH\" ضمير انعكاسي -- لا يصلح مصدراً بعد \"zu\"؛ التعبير \"etwas (Akk.) vereinbaren\" (التوفيق بين شيئين) يستلزم المصدر \"VEREINBAREN\" حصراً.",
  "34": "\"DABEI\" ضمير ظرفي (يُستخدم في الفجوة 40 بمعنى مختلف) -- لا يعمل ضمير مفعول به لشخص، و\"DAFÜR\" ضمير ظرفي آخر -- نفس المشكلة؛ نفي فاعل بشري كمفعول به يستدعي \"NIEMANDEN\".",
  "35": "\"DASS\" أداة ربط لكن بمعنى مختلف (نتيجة لا سبب)، و\"DAFÜR\" ضمير ظرفي -- لا يعمل أداة ربط لجملة كاملة؛ تفسير سبب الفعل السابق يستدعي \"WEIL\".",
  "36": "\"VEREINBAREN\" (يُستخدم في الفجوة 33) فعل معجمي كامل المعنى -- لا يعمل فعلاً مساعداً، و\"SICH\" ضمير انعكاسي -- لا يصلح فعلاً مساعداً أيضاً؛ المبني للمجهول الإجرائي في المضارع (Vorgangspassiv) يستلزم الفعل المساعد \"WERDEN\" حصراً.",
  "37": "\"WEIL\" (لأن) أداة سببية -- معنى مختلف تماماً عن النتيجة، و\"BEI\" حرف جر -- لا يعمل أداة ربط لجملة كاملة؛ بنية \"so...dass\" تستلزم \"DASS\" حصراً.",
  "38": "\"DABEI\" ضمير ظرفي -- لا يعمل ضميراً انعكاسياً، و\"DAS\" ضمير إشاري مفرد محايد -- لا يطابق الفاعل الجمعي \"andere Reisende\"؛ الفعل الانعكاسي الثابت \"sich breitmachen\" مع فاعل جمعي يستلزم \"SICH\".",
  "39": "\"BEI\" حرف جر مختلف تماماً، و\"DAVON\" ضمير ظرفي -- لا يقترنان بـ\"Anspruch\"؛ التعبير الثابت \"Anspruch auf\" يستلزم \"AUF\" حصراً.",
  "40": "\"DAVON\" ضمير ظرفي بحرف جر مختلف (von) -- لا يناسب فعل \"meinen\" في هذا السياق، و\"DAS\" ضمير إشاري بسيط -- لا يعمل ضميراً ظرفياً يشير لفكرة سابقة (الحديث عن مشاكل)؛ هذا يستلزم \"DABEI\".",
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

async function main() {
  await applyToId("c481cdb7-4d0f-4fd0-acb7-515efa025a8f", "Deutschland – ein Paradies für Kinder? ( Original )", ORIGINAL_WRONG);
  await applyToId("4bad84c6-326d-4011-9e47-d8e754d8a321", "Deutschland – ein Paradies für Kinder? (معدل) #1", MODIFIED1_WRONG);
  await applyToId("60fcda40-3782-400a-a4d6-3a6c6d1c1783", "Deutschland – ein Paradies für Kinder? (معدل) #2", MODIFIED2_WRONG);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

/**
 * Deepen T1 #12: "Kolleginnen und Kollegen ( Neu )", "Karin ( Original )",
 * and BOTH "Karin (معدل)" rows (a626b2a8 and d31dcea7 -- these turned out
 * to be genuinely different content, not exact duplicates like the
 * earlier Meyerhofer 2 case, so each needed its own analysis).
 *
 * Two real content bugs found and fixed:
 *  - Karin (معدل) [a626b2a8] gap 28: answer key said correct="Ihr", but
 *    "Ihr" is already the fixed subject sitting right before the gap
 *    ("und Ihr ___ alle gut versteht") -- it can't also be the gap's
 *    answer (would duplicate the subject). The evidence_text's own bold
 *    marker and the stored explanation ("the plural subject ihr requires
 *    the matching reflexive euch") both already pointed to "euch" --
 *    the explanation was self-contradicting the stored correct letter.
 *    Fixed sb_t1_gaps.correct from 'b' to 'a'.
 *  - Karin (معدل) [d31dcea7] gap 28: correct_word is genuinely "euch"
 *    (plural -- Karin is happy FOR Karin-the-letter-recipient AND her
 *    roommates as a group), matching the bolded evidence text. But the
 *    stored keyword/explanation still said "dich" (singular), stale
 *    content probably copied from the Original letter's version of this
 *    gap. Fixed keyword + explanation_correct to correctly describe the
 *    plural "euch".
 *
 * Usage: node scripts/learning-aids/deepen-t1-12.mjs [--apply]
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

const KOLLEGINNEN_WRONG = {
  "21": "\"dafür\" ترتبط بتعابير أخرى، و\"daran\" ترتبط بأفعال مثل \"sich erinnern an\" -- التعبير الثابت \"einladen dazu, zu+Infinitiv\" (يدعو للقيام بـ) يستلزم \"dazu\".",
  "22": "\"Als\" تصف حدثاً ماضياً وحيداً -- لا شرطاً عاماً متكرراً، و\"Ob\" (هل) تصوغ سؤالاً غير مباشر -- معنى مختلف تماماً عن الشرط الذي تصوغه \"Wenn\".",
  "23": "\"an das\" حرف جر مختلف تماماً، و\"zur\" (zu+der) لا تقترن بالفعل \"helfen\" بهذا المعنى -- التعبير الثابت \"helfen bei etwas\" يستلزم \"beim\" (bei+dem).",
  "24": "\"einige\" (بعض) توحي بعدة أشياء معدودة -- لا جائزة واحدة غير محددة، و\"keine\" (لا شيء) عكس المعنى تماماً (ينفي إمكانية الفوز).",
  "25": "\"alsbald\" (قريباً) ظرف قديم الطراز يعني \"عما قريب\" لا موعداً نهائياً، و\"beizeiten\" (في وقت مبكر) يوحي بالتبكير العام -- لا بتحديد أقصى موعد كما تفعل \"spätestens\".",
  "26": "\"entlang\" (على طول) تصف مساراً محاذياً لشيء، لا مسافة بين نقطتين، و\"von\" وحدها غير مكتملة (تحتاج zu/bis لاحقة) -- المعنى المقصود يستلزم \"zwischen\".",
  "27": "\"euch\" ضمير المخاطبين لا يطابق الفاعل غير الشخصي \"wer\" (من)، و\"ihn\" (إياه) ضمير مفعول به مباشر -- لا يناسب الفعل الانعكاسي \"sich melden\" هنا.",
  "28": "\"übergeben\" (يُسلّم) معنى مختلف تماماً، و\"übernehmen\" (يتولى) أيضاً معنى مختلف -- الفحص الفني للدراجة يستلزم \"überprüfen\".",
  "29": "\"beim\" و\"zum\" لا يكوّنان التعبير الاصطلاحي الثابت -- \"am Herzen liegen\" (يهمّه كثيراً) يستلزم \"am\" (an+dem) حصراً.",
  "30": "\"an\" و\"mit\" لا يقترنان بالفعل \"hoffen\" بهذا المعنى -- التعبير الثابت \"hoffen auf etwas\" (يأمل في) يستلزم \"auf\" حصراً.",
};

const KARIN_SHARED_2223 = {
  "22": "\"doch\" أداة تلطيف أخرى لكنها تفيد إصراراً لطيفاً أو تصحيحاً، لا فضولاً وديّاً، و\"mal\" أداة تخفيف طلب/اقتراح -- لا تضفي نبرة الاهتمام الفضولي التي تضيفها \"denn\" على سؤال مباشر.",
  "23": "\"dazu\" ضمير ظرفي لا يصلح ظرف إضافة هنا، و\"sogar\" (حتى) توحي بمفاجأة تفوق التوقع -- لا مجرد إضافة عادية لعبء آخر كما تفعل \"noch\".",
};

const KARIN_ORIGINAL_WRONG = {
  ...KARIN_SHARED_2223,
  "21": "\"das\" ضمير إشارة يحتاج اسماً محدداً سابقاً، و\"welches\" ضمير استفهام/وصل يحتاج مرجعاً محدداً -- بينما الجملة هنا تصف فكرة عامة غير محددة (ما تريدين)، وهذا يستلزم \"was\".",
  "24": "\"abnehmen\" (ينقص/يخسر وزناً) معنى مختلف تماماً، و\"nehmen\" (يأخذ) لا يكوّن التعبير الثابت \"eine Einladung annehmen\" (يقبل دعوة) الذي يستلزم \"annehmen\".",
  "25": "\"für\" و\"über\" لا يقترنان بالفعل الانعكاسي \"sich kümmern\" بهذا المعنى -- التعبير الثابت \"sich kümmern um\" (يعتني بـ) يستلزم \"um\" حصراً.",
  "26": "\"bevor\" (قبل أن) تصف أسبقية زمنية، و\"bis\" (حتى) تصف نقطة نهاية -- لا تتابعاً فورياً كما تفعل \"sobald\" (بمجرد أن).",
  "27": "\"wenn\" وحدها تصوغ شرطاً بسيطاً بلا معنى التنازل (حتى لو)، و\"wenn auch\" ترتيب مختلف لنفس الفكرة لكنه لا يناسب موضعه هنا داخل الجملة بنفس طبيعية \"auch wenn\".",
  "28": "\"an\" لا يقترن بالفعل \"sich freuen\" هنا، و\"über\" تناسب الفرح بشيء مُستلَم (sich freuen über)، لا الفرح من أجل شخص آخر -- هذا يستلزم \"für\".",
  "29": "\"demnächst\" (قريباً) ظرف مستقبلي -- عكس الاتجاه الزمني المقصود (حدث ماضٍ)، و\"noch nicht\" (لم يحدث بعد) يناقض حقيقة أنهم فكروا فعلاً في الأمر مرة.",
  "30": "\"müssen\" (يجب) يفيد إلزاماً خارجياً، و\"sollen\" (يُفترض) يفيد توجيهاً خارجياً -- لا يناسبان قراراً شخصياً حراً كما يفيده \"wollen\".",
};

const KARIN_A_WRONG = {
  ...KARIN_SHARED_2223,
  "21": KARIN_ORIGINAL_WRONG["21"],
  "24": "\"neben\" (بجانب) حرف جر مكاني عادي -- لا يعمل كظرف بمعنى \"بشكل إضافي أثناء العمل\"، و\"eben\" (بالضبط/للتو) أداة تلطيف مختلفة المعنى تماماً -- التعبير الثابت \"nebenbei jobben\" يستلزم \"nebenbei\".",
  "25": "\"abnehmen\" (ينقص/يخسر وزناً) معنى مختلف تماماً، و\"nehmen\" (يأخذ) لا يكوّن التعبير الثابت \"eine Einladung annehmen\" الذي يستلزم \"annehmen\".",
  "26": KARIN_ORIGINAL_WRONG["26"],
  "27": KARIN_ORIGINAL_WRONG["27"],
  "28": "\"Ihr\" هي الفاعل نفسه المذكور مسبقاً في الجملة (لا يمكن تكراره كضمير انعكاسي)، و\"Sich\" ضمير انعكاسي للغائب -- لا يطابق فاعل المخاطَبين الجمعي \"ihr\"؛ الصحيح: euch.",
  "29": KARIN_ORIGINAL_WRONG["29"],
  "30": KARIN_ORIGINAL_WRONG["30"],
};

const KARIN_A_GAP28_FIX = { keyword: "ihr → euch (Reflexivpronomen, Plural)" };

const KARIN_B_WRONG = {
  ...KARIN_SHARED_2223,
  "21": KARIN_ORIGINAL_WRONG["21"],
  "24": "\"dazu\" ضمير ظرفي لا يصلح هنا، و\"sogar\" (حتى) توحي بمفاجأة -- لا وصفاً لعمل إضافي معتاد أثناء الدراسة كما تفعل \"nebenbei\".",
  "25": "\"abnehmen\" (ينقص/يخسر وزناً) معنى مختلف تماماً، و\"nehmen\" (يأخذ) لا يكوّن التعبير الثابت \"eine Einladung annehmen\" الذي يستلزم \"annehmen\".",
  "26": KARIN_ORIGINAL_WRONG["26"],
  "27": KARIN_ORIGINAL_WRONG["27"],
  "28": "\"dich\" صيغة مفرد -- لا تناسب الفرح الموجّه لمجموعة (كارين وزميلاتها)، و\"uns\" (نحن) ضمير غائب لا يطابق المخاطَبين.",
  "29": KARIN_ORIGINAL_WRONG["30"],
  "30": "\"nicht\" موجودة أصلاً في الجملة قبل الفجوة مباشرة (لا يمكن تكرارها)، و\"wenig\" (قليل) تُنتج مع \"nicht\" معنى معاكساً (nicht wenig = ليس بالقليل = كثير) -- عكس المعنى المتواضع المقصود؛ الصحيح \"nicht viel\" (ليس كثيراً).",
};

const KARIN_B_GAP28_FIX = {
  keyword: "sich freuen für (Plural: euch)",
  explanation_correct: "\"sich freuen für jemanden\" تعبير ثابت؛ هنا الفرح موجّه للمجموعة (كارين وزميلاتها في السكن)، فيستلزم ضمير الجمع بحالة النصب: euch.",
};

async function applyToId(id, wrongMap, extraFix) {
  const rows = await q(`select id, learning_aids from sb_exercises where id = '${id}';`);
  if (rows.length !== 1) { console.error(`SKIP id ${id}: not found`); return; }
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, wrongText] of Object.entries(wrongMap)) {
    items[gap] = { ...items[gap], explanation_wrong: wrongText };
  }
  if (extraFix?.gap28) items["28"] = { ...items["28"], ...extraFix.gap28 };
  console.log(`[${id.slice(0, 8)}]: updated explanation_wrong for ${Object.keys(wrongMap).length} gaps${extraFix?.gap28 ? " (+ fixed gap 28)" : ""}`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
  }
}

async function fixKarinAAnswerKey() {
  const rows = await q(`select id from sb_t1_gaps where exercise_id = 'a626b2a8-ed0d-4e17-af74-bb34cc4ddf70' and gap_number = 28;`);
  if (rows.length !== 1) { console.error("SKIP Karin A gap28 answer-key fix: not found"); return; }
  console.log(`Karin (معدل) [a626b2a8] gap 28 answer key: b (Ihr) -> a (euch)`);
  if (APPLY) await q(`update sb_t1_gaps set correct = 'a' where id = '${rows[0].id}';`);
}

async function main() {
  await fixKarinAAnswerKey();
  await applyToId("138858b4-3836-4abc-99dc-6b1f224c654b", KOLLEGINNEN_WRONG);
  await applyToId("2986b502-1e12-4793-808a-117389892247", KARIN_ORIGINAL_WRONG);
  await applyToId("a626b2a8-ed0d-4e17-af74-bb34cc4ddf70", KARIN_A_WRONG, { gap28: KARIN_A_GAP28_FIX });
  await applyToId("d31dcea7-19f0-40a4-98b8-125526b1b7be", KARIN_B_WRONG, { gap28: KARIN_B_GAP28_FIX });
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

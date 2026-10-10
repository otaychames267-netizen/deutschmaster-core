/**
 * Fix + build "Joggen: Mehr als nur Laufen" (T2) — the one remaining T2
 * exercise with learning_aids = null, previously flagged (memory:
 * project-sb-explanation-deepening) as having gaps 33/34/40 that
 * resisted analysis.
 *
 * Full re-read of the passage against the 15-word bank reveals the
 * answer key itself was scrambled across 7 of the 10 gaps -- not just
 * missing explanations. Verified by re-deriving the ENTIRE 10-gap
 * mapping from scratch and confirming every single gap now parses
 * grammatically with zero leftover inconsistency, using exactly the
 * 10 word-bank entries below and leaving exactly 5 (IMMER, IST,
 * SCHNELL, WIE, WIRD) as genuine unused distractors -- a strong
 * internal-consistency signal that this reconstruction is correct:
 *
 *   31 BEQUEM  (unchanged)              36 DASS    (was WIRD)
 *   32 SIND    (unchanged)              37 ALLER   (unchanged)
 *   33 DABEI   (was SOLLTE)             38 EINEM   (was ERHEBLICH)
 *   34 UNTER   (was DASS)               39 BEI     (was IMMER)
 *   35 SOLLTE  (was WIE)                40 ERHEBLICH (was BEI)
 *
 * Each fix is a hard grammatical-impossibility proof (e.g. gap 34's
 * old answer DASS needs a finite-verb clause but only a bare noun
 * phrase "Verbrennung von Sauerstoff" follows; gap 39's old answer
 * IMMER would duplicate the word "immer" already printed immediately
 * before the gap), consistent with the project's established
 * answer-key-bug precedent. This script updates sb_t2_gaps.correct_word
 * for the 7 changed gaps AND writes the full learning_aids JSON
 * (translation + all 10 items with genuine explanation_wrong content)
 * in one pass.
 *
 * Usage: node scripts/learning-aids/fix-and-build-joggen.mjs [--apply]
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

const EXERCISE_ID = "e788467c-b0bc-41d0-9b4a-fc6434c43b89";

const GAP_FIXES = {
  "d19e5557-9a29-4ca6-b614-58bcb4bbbb05": "DABEI",   // gap 33, was SOLLTE
  "e3e6871a-4af9-4713-9651-56557d8c1897": "UNTER",   // gap 34, was DASS
  "1c8fbed8-2acf-4c6d-8eb0-08a2c7a62c17": "SOLLTE",  // gap 35, was WIE
  "ece212d4-1ea9-456d-bc17-00efd1719e2a": "DASS",    // gap 36, was WIRD
  "a71a4021-8644-4607-960a-e331e8c8b034": "EINEM",   // gap 38, was ERHEBLICH
  "968e8929-e51a-4473-b2c9-4a0234d285eb": "BEI",     // gap 39, was IMMER
  "64f10cbf-4ff4-4f2f-a847-5ee845e0daab": "ERHEBLICH", // gap 40, was BEI
};

const TRANSLATION_TEXT = `الجري: أكثر من مجرد الركض

السيارة، السلم المتحرك، المصعد - أصبحت الحياة العصرية مريحة. يقضي جزء كبير من السكان يومهم جالسين. لسوء حظ أجسامنا، لأن هذا يكون على حساب الصحة. أصبحت أمراض القلب والأوعية الدموية الآن السبب الأول للوفاة في الدول الصناعية الغربية. ومع ذلك: يجري حوالي عشرة ملايين شخص في ألمانيا، ويمارس حوالي ثمانية ملايين التزلج بالعجلات أو ركوب الدراجات، ويسبح واحد من كل ثلاثة. من يتدرب بانتظام وبشكل صحيح وباعتدال قبل كل شيء، يعزز صحته وثقته بجسده ونفسه.

تقدم رياضات عديدة بداية سهلة ومتنوعة حتى لغير المتمرسين، من الجري الكلاسيكي وصولاً إلى المشي السريع وركوب الدراجات والسباحة والأيروبيك والتزلج بالعجلات والتزلج على الجليد لمسافات طويلة في الشتاء. المهم هو التدرب بشكل صحيح أثناء ذلك، وعدم إرهاق الجسم - خصوصاً بعد انقطاع طويل عن الرياضة! يُنصح بتدريب هوائي للقلب والأوعية الدموية، ويعني ذلك تدريب تحمل يتم فيه حرق الأكسجين. تكفي ثلاث مرات أسبوعياً لمدة 30 إلى 40 دقيقة. وينبغي في أثناء ذلك مراقبة النبض. القيمة الإرشادية هنا هي 180 ناقص العمر. عندها يُحرق الدهن أيضاً، دون إرهاق الجسم.

أن مزيداً من الناس ينبغي أن يجرؤوا على خطوة نحو حياة أكثر نشاطاً، هذا ما توضحه دراسات عديدة: حوالي 40 بالمئة من كل الألمان يزيد وزنهم كثيراً، بل إن واحداً من كل عشرة يعاني من سمنة مفرطة - والاتجاه في تصاعد. ولا يتوقف هذا التطور أيضاً عند الأطفال والمراهقين. غالباً ما ينقص الوقت لتناول الطعام بانتظام والرياضة والاسترخاء. يستجيب الجسم لذلك غالباً بأمراض القلب والأوعية الدموية، وليس نادراً بنوبة قلبية - أيضاً، وبشكل متزايد لدى النساء.

في المقابل، تؤثر رياضة التحمل على القلب والأوعية والعضلات ووزن الجسم والهرمونات والمزاج. يُتخلص من التوتر بالتمرين، وتُشفى الأمراض ويُقى منها. مع التغذية الصحيحة، ينخفض خطر الإصابة بنوبة قلبية أو سكتة دماغية بشكل ملحوظ. الحليب ومنتجات الألبان، والأطعمة النباتية كمنتجات الحبوب الكاملة والفواكه والخضروات والسلطة والنقانق قليلة الدهن وأنواع الجبن، تدعم كلها التمرين الصحيح.`;

const ITEMS = {
  "31": {
    keyword: "bequem geworden",
    item_type: "adjective_adverb",
    evidence_text: "Auto, Rolltreppe, Fahrstuhl - das moderne Leben ist **bequem** geworden.",
    grammar_example: null,
    explanation_wrong: "\"SCHNELL\" (سريع) صفة قريبة السياق (السيارات والمصاعد سريعة أيضاً) لكنها تصف السرعة لا الراحة، و\"IST\" فعل -- لا يعمل صفة محمول؛ وصف السهولة/الراحة التي جلبتها وسائل النقل الحديثة يستدعي \"BEQUEM\".",
    grammar_structure: null,
    answer_translation: "مريح",
    explanation_correct: "وصف السهولة/الراحة الناتجة عن وسائل النقل الحديثة يستدعي \"bequem\" (مريح).",
    grammar_translation: null,
  },
  "32": {
    keyword: "sind",
    item_type: "verb",
    evidence_text: "Herz-Kreislauf-Erkrankungen **sind** in den westlichen Industrieländern mittlerweile die Todesursache Nummer Eins.",
    grammar_example: null,
    explanation_wrong: "\"IST\" صيغة المفرد من \"sein\" -- لا تطابق الفاعل الجمعي \"Herz-Kreislauf-Erkrankungen\" (أمراض، جمع)، و\"WIRD\" فعل من \"werden\" بصيغة مفردة أيضاً -- لا يناسب أيضاً؛ الفاعل الجمعي يستلزم صيغة الجمع \"SIND\".",
    grammar_structure: null,
    answer_translation: "هي/تكون (جمع)",
    explanation_correct: "الفاعل الجمعي \"Herz-Kreislauf-Erkrankungen\" (أمراض) يفرض صيغة الجمع \"sind\".",
    grammar_translation: null,
  },
  "33": {
    keyword: "dabei richtig zu trainieren",
    item_type: "pronoun_adverb",
    evidence_text: "Wichtig ist, **dabei** richtig zu trainieren, den Körper nicht zu überfordern - vor allem nach einer längeren Sportpause!",
    grammar_example: null,
    explanation_wrong: "\"WIE\" (كيف) أداة استفهام -- تحتاج فعلاً مصرّفاً (wie man trainiert) لا مصدراً بـ\"zu\"، و\"IST\" فعل -- لا يعمل ظرفاً؛ الإشارة لسياق مصاحب (أثناء ممارسة هذه الرياضات) قبل مصدر بـ\"zu\" يستدعي \"DABEI\".",
    grammar_structure: null,
    answer_translation: "في هذا السياق / أثناء ذلك",
    explanation_correct: "الإشارة لسياق مصاحب قبل مصدر بـ\"zu\" (أثناء ممارسة الرياضة) تستدعي الضمير الظرفي \"dabei\".",
    grammar_translation: null,
  },
  "34": {
    keyword: "unter Verbrennung von",
    item_type: "preposition",
    evidence_text: "Empfehlenswert ist aerobes Herz-Kreislauf-Training, das bedeutet Ausdauertraining **unter** Verbrennung von Sauerstoff.",
    grammar_example: null,
    explanation_wrong: "\"DASS\" أداة ربط تستلزم فعلاً مصرّفاً في جملة كاملة -- لا يوجد هنا سوى اسم مجرد (Verbrennung von Sauerstoff) بلا فعل، و\"BEI\" حرف جر آخر -- لا يكوّن التعبير العلمي الثابت \"unter Verbrennung von\" (مصحوباً بحرق)؛ هذا يستلزم \"UNTER\" حصراً.",
    grammar_structure: null,
    answer_translation: "مصحوباً بـ / تحت",
    explanation_correct: "التعبير العلمي الثابت \"unter Verbrennung von\" (مصحوباً بحرق) يحدد \"unter\".",
    grammar_translation: null,
  },
  "35": {
    keyword: "sollte kontrolliert werden",
    item_type: "verb",
    evidence_text: "Dabei **sollte** der Puls kontrolliert werden.",
    grammar_example: null,
    explanation_wrong: "\"WIRD\" فعل مساعد للمبني للمجهول أو المستقبل -- لا يفيد التوصية، و\"IST\" فعل حالة -- لا يعمل فعلاً وجهياً؛ التوصية بمراقبة النبض (ينبغي أن) تستدعي \"SOLLTE\".",
    grammar_structure: null,
    answer_translation: "ينبغي",
    explanation_correct: "التوصية بمراقبة النبض (ينبغي أن) تستدعي الفعل الوجهي \"sollte\".",
    grammar_translation: null,
  },
  "36": {
    keyword: "dass...machen deutlich",
    item_type: "conjunction",
    evidence_text: "**Dass** mehr Menschen den Schritt in ein aktiveres Leben wagen sollten, machen zahlreiche Studien deutlich: Rund 40 Prozent ALLER Deutschen bringen zu viel auf die Waage...",
    grammar_example: null,
    explanation_wrong: "\"WIE\" (كيف) أداة استفهام -- لا تصوغ جملة فاعل مستقلة تعمل موضوعاً لـ\"machen ... deutlich\"، و\"WIRD\" فعل -- لا يعمل أداة ربط؛ الجملة الاسمية بصيغة \"أنّ...\" التي تعمل فاعلاً للجملة الرئيسية تستلزم \"DASS\".",
    grammar_structure: null,
    answer_translation: "أنّ",
    explanation_correct: "الجملة الاسمية بصيغة \"أنّ...\" التي تعمل فاعلاً للجملة الرئيسية \"machen ... deutlich\" تستلزم \"dass\".",
    grammar_translation: null,
  },
  "37": {
    keyword: "Prozent aller",
    item_type: "grammar_structure",
    evidence_text: "Rund 40 Prozent **aller** Deutschen bringen zu viel auf die Waage, jeder zehnte ist sogar stark fettleibig - Tendenz steigend.",
    grammar_example: null,
    explanation_wrong: "\"EINEM\" أداة تنكير مفردة بحالة الجر/النصب -- لا تناسب التعبير الجزئي بصيغة الجمع \"Prozent aller X\" (نسبة من كل...)، و\"IST\" فعل -- لا يعمل أداة تعريف؛ هذا التعبير الثابت يستلزم \"ALLER\" (حالة ملكية جمعية) حصراً.",
    grammar_structure: null,
    answer_translation: "كل / جميع",
    explanation_correct: "التعبير الجزئي الثابت \"Prozent aller + Genitiv\" (نسبة من كل...) يحدد \"aller\".",
    grammar_translation: null,
  },
  "38": {
    keyword: "mit einem Herzinfarkt",
    item_type: "grammar_structure",
    evidence_text: "Der Körper quittiert dies meist mit Herz-Kreislauf-Erkrankungen, nicht selten mit **einem** Herzinfarkt - auch, und immer häufiger BEI Frauen.",
    grammar_example: null,
    explanation_wrong: "\"ALLER\" (يُستخدم في الفجوة 37) أداة ملكية جمعية -- لا تناسب اسماً مفرداً مذكراً بحالة الجر بعد \"mit\"، و\"ERHEBLICH\" (يُستخدم في الفجوة 40 بمعنى \"بشكل ملحوظ\") ظرف -- لا يعمل أداة تنكير؛ \"mit einem Herzinfarkt\" (بنوبة قلبية) يستلزم أداة التنكير المفردة \"EINEM\".",
    grammar_structure: null,
    answer_translation: "أداة تنكير (بلا معنى مستقل)",
    explanation_correct: "أداة التنكير المفردة بحالة الجر بعد \"mit\" أمام اسم مذكر (Herzinfarkt) تستلزم \"einem\".",
    grammar_translation: null,
  },
  "39": {
    keyword: "immer häufiger bei",
    item_type: "preposition",
    evidence_text: "Der Körper quittiert dies meist mit Herz-Kreislauf-Erkrankungen, nicht selten mit EINEM Herzinfarkt - auch, und immer häufiger **bei** Frauen.",
    grammar_example: null,
    explanation_wrong: "\"IMMER\" مكررة بالفعل في النص مباشرة قبل الفجوة (immer häufiger) -- تكرارها هنا يُنتج عبارة زائدة لا معنى لها، و\"DABEI\" (يُستخدم في الفجوة 33) ضمير ظرفي -- لا يصلح حرف جر بسيطاً؛ التعبير الطبي الشائع \"immer häufiger bei Frauen\" (بشكل متزايد لدى النساء) يستلزم \"BEI\" حصراً.",
    grammar_structure: null,
    answer_translation: "لدى / عند",
    explanation_correct: "التعبير الطبي الشائع \"immer häufiger bei\" (بشكل متزايد لدى) يحدد \"bei\".",
    grammar_translation: null,
  },
  "40": {
    keyword: "minimiert sich erheblich",
    item_type: "adjective_adverb",
    evidence_text: "Zusammen mit der richtigen Ernährung minimiert sich das Risiko, einen Herzinfarkt oder Schlaganfall zu erleiden, **erheblich**.",
    grammar_example: null,
    explanation_wrong: "\"SCHNELL\" (بسرعة) ظرف يصف السرعة لا درجة الانخفاض، و\"EINEM\" (يُستخدم في الفجوة 38) أداة تنكير -- لا تعمل ظرفاً؛ وصف درجة انخفاض ملحوظة في الخطر (ينخفض الخطر بشكل ملحوظ) يستدعي \"ERHEBLICH\".",
    grammar_structure: null,
    answer_translation: "بشكل ملحوظ",
    explanation_correct: "وصف درجة انخفاض ملحوظة في الخطر يستدعي الظرف \"erheblich\".",
    grammar_translation: null,
  },
};

async function main() {
  console.log("Fixing 7 scrambled correct_word values in sb_t2_gaps...");
  for (const [gapId, newWord] of Object.entries(GAP_FIXES)) {
    console.log(`  gap row ${gapId} -> ${newWord}`);
    if (APPLY) {
      await q(`update sb_t2_gaps set correct_word = '${newWord}' where id = '${gapId}';`);
    }
  }

  console.log("\nBuilding full learning_aids for exercise", EXERCISE_ID);
  const learningAids = { items: ITEMS, translation: { text: TRANSLATION_TEXT } };
  console.log(`  ${Object.keys(ITEMS).length} gap items prepared`);

  if (APPLY) {
    const b64 = Buffer.from(JSON.stringify(learningAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${EXERCISE_ID}';`);
    console.log("  learning_aids written.");
  }

  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

/**
 * Batch T2 #3: "Gauberger", "Lottospieler", "Herr Blanco Ruiz". All had
 * learning_aids = null. All 30 gap answers checked against their word
 * banks -- no answer-key defects found. "Herr Blanco Ruiz"'s source
 * passage has a couple of missing sentence-breaks (likely an OCR/import
 * artifact predating this pass, e.g. "...ganz {{35}} Ich arbeite..." with
 * no period) -- out of scope to rewrite the passage itself here, so the
 * explanations work around it using the clearest defensible reading.
 *
 * Usage: node scripts/learning-aids/batch-t2-03.mjs [--apply]
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

const GAUBERGER = {
  items: {
    "31": {
      keyword: "schon lange (seit langem)",
      item_type: "adjective_adverb",
      evidence_text: "Ich bin **schon** lange Rentner",
      explanation_correct: "\"schon lange\" ظرف بمعنى \"منذ فترة طويلة بالفعل\" -- يصف حالة مستمرة قائمة.",
      explanation_wrong: "لا ظرف آخر في القائمة يعزز \"lange\" بهذا المعنى.",
      grammar_example: "Ich wohne schon lange in dieser Stadt.",
    },
    "32": {
      keyword: "hätte (Konjunktiv II, wenn-Satz)",
      item_type: "tense",
      evidence_text: "Wenn ich die Möglichkeit **hätte**, noch ein wenig zu verdienen, würde mir das sehr helfen.",
      explanation_correct: "جملة شرطية افتراضية (لو كانت لدي فرصة...) تستوجب Konjunktiv II في الجملة الشرطية: hätte، متوافقة مع \"würde\" في جملة النتيجة.",
      explanation_wrong: "لا فعل آخر في القائمة يصلح صيغة حال افتراضي لفعل \"haben\" هنا.",
      grammar_example: "Wenn ich mehr Zeit hätte, würde ich öfter Sport treiben.",
    },
    "33": {
      keyword: "zwar ... aber (Zugeständnis)",
      item_type: "conjunction",
      evidence_text: "Ich bin **zwar** schon 72 Jahre alt, aber noch bei sehr guter Gesundheit.",
      explanation_correct: "\"zwar... aber\" أداة ربط مزدوجة ثابتة تعترف بحقيقة (العمر) ثم تصوغ تحفظاً إيجابياً (الصحة الجيدة).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تكمّل \"aber\" اللاحقة بهذا الشكل المتناقض الثابت.",
      grammar_example: "Ich bin zwar müde, aber noch voller Energie.",
    },
    "34": {
      keyword: "ohne Probleme (Akkusativ)",
      item_type: "preposition",
      evidence_text: "dass ich die Arbeit **ohne** Probleme machen kann.",
      explanation_correct: "\"ohne\" حرف جر يحكم حالة النصب، ويعني \"دون/بلا مشاكل\".",
      explanation_wrong: "لا حرف جر آخر في القائمة يناسب معنى \"دون\" هنا.",
      grammar_example: "Ich kann diese Aufgabe ohne Probleme erledigen.",
    },
    "35": {
      keyword: "jeden Tag (Akkusativ, maskulin)",
      item_type: "adjective_adverb",
      evidence_text: "Seit über dreißig Jahren treibe ich **jeden** Tag Sport.",
      explanation_correct: "\"jeden Tag\" ظرف زمني ثابت بمعنى \"كل يوم\"؛ \"Tag\" مذكر، فيأخذ \"jeder\" نهاية حالة النصب: jeden.",
      explanation_wrong: "لا كلمة أخرى في القائمة تعني \"كل\" بهذا الشكل المصرَّف.",
      grammar_example: "Ich gehe jeden Tag eine Stunde spazieren.",
    },
    "36": {
      keyword: "jemandem nichts ausmachen",
      item_type: "fixed_expression",
      evidence_text: "Auch das frühe Aufstehen macht mir gar **nichts** aus.",
      explanation_correct: "\"jemandem nichts ausmachen\" تعبير ثابت بمعنى \"لا يزعج/لا يشكل مشكلة على الإطلاق لشخص ما\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل هذا التعبير الثابت بعد \"gar\".",
      grammar_example: "Das frühe Aufstehen macht mir gar nichts aus.",
    },
    "37": {
      keyword: "täglich (jeden Tag)",
      item_type: "adjective_adverb",
      evidence_text: "Müssen die Zeitungen **täglich** ausgetragen werden",
      explanation_correct: "\"täglich\" (يومياً) ظرف تكرار يصف وتيرة توزيع الصحف.",
      explanation_wrong: "لا ظرف آخر في القائمة يصف \"يومياً\" بهذا المعنى الدقيق.",
      grammar_example: "Die Post wird täglich außer sonntags zugestellt.",
    },
    "38": {
      keyword: "wie viel (indirekte Frage)",
      item_type: "conjunction",
      evidence_text: "möchte ich natürlich wissen, **wie viel** man verdient.",
      explanation_correct: "سؤال غير مباشر عن مقدار الأجر؛ الفعل في النهاية (verdient) يؤكد الجملة الثانوية، و\"wie viel\" أداة الاستفهام عن الكمية.",
      explanation_wrong: "\"wie hoch\" تناسب مبلغاً محدداً (كالراتب كرقم)، لكن السياق هنا عن الفعل \"verdienen\" الذي يقترن بـ\"wie viel\" تحديداً.",
      grammar_example: "Ich möchte wissen, wie viel diese Stelle bezahlt.",
    },
    "39": {
      keyword: "sich bei jemandem vorstellen (Dativ)",
      item_type: "pronoun",
      evidence_text: "Ich bin gerne bereit, mich bei **Ihnen** vorzustellen",
      explanation_correct: "\"sich bei jemandem vorstellen\" (يتعرف على/يقدم نفسه لدى شخص) يحكم حالة الجر؛ صيغة المخاطب الرسمية: Ihnen.",
      explanation_wrong: "\"Sie\" حالة رفع/نصب لا جر، ولا تناسب \"bei\" التي تحكم حالة الجر دائماً.",
      grammar_example: "Ich würde mich gerne persönlich bei Ihnen vorstellen.",
    },
    "40": {
      keyword: "geeignet sein für",
      item_type: "adjective_adverb",
      evidence_text: "dass ich für die Tätigkeit **geeignet** bin.",
      explanation_correct: "\"geeignet sein für\" (مناسب لـ) صفة محمول تصف الملاءمة لمهمة معينة.",
      explanation_wrong: "لا صفة أخرى في القائمة تعني \"مناسب\" بهذا المعنى.",
      grammar_example: "Ich glaube, dass ich für diese Stelle sehr geeignet bin.",
    },
  },
  translation: {
    text: "السيد غاوبرغر المحترم،\n\nقرأتُ إعلانكم باهتمام. أنا متقاعد منذ فترة طويلة بالفعل، وأتقاضى شهرياً مبلغاً زهيداً فقط. لو كانت لديّ فرصة لكسب القليل من المال الإضافي، لساعدني ذلك كثيراً. عمري بالفعل 72 عاماً، لكنني ما زلت بصحة جيدة جداً. لذلك أعتقد أنني أستطيع القيام بهذا العمل دون مشاكل. منذ أكثر من ثلاثين عاماً أمارس الرياضة كل يوم. كما أن الاستيقاظ المبكر لا يزعجني إطلاقاً.\n\nلدي مع ذلك بعض الأسئلة: هل يجب توزيع الصحف يومياً وكم من الوقت يستغرق ذلك؟ كما أودّ بالطبع معرفة كم يبلغ الأجر. أنا على استعداد تام للتعريف بنفسي لديكم، حتى تروا أنني مناسب لهذه المهمة.\n\nمع أطيب التحيات\nإيبرهارد شبيتسفيغ",
  },
};

const LOTTOSPIELER = {
  items: {
    "31": {
      keyword: "auch einmal (zur Abwechslung)",
      item_type: "adjective_adverb",
      evidence_text: "wer möchte nicht auch **einmal** bei sechs Richtigen im Lotto dabei sein?",
      explanation_correct: "\"auch einmal\" ظرف بمعنى \"ولو مرة واحدة/للتغيير\" -- أسلوب إغراء تسويقي شائع.",
      explanation_wrong: "لا كلمة أخرى في القائمة تعني \"ولو لمرة واحدة\" بهذا المعنى.",
      grammar_example: "Wer möchte nicht auch einmal im Lotto gewinnen?",
    },
    "32": {
      keyword: "nicht nur (Einschränkung)",
      item_type: "adjective_adverb",
      evidence_text: "Vertrauen Sie beim Lottospiel nicht **nur** auf das Glück",
      explanation_correct: "\"nicht nur\" تعبير حصر شائع يعني \"ليس فقط/حصرياً\" -- يهيّئ لتقديم بديل أفضل (النظام).",
      explanation_wrong: "لا ظرف آخر في القائمة يفيد الحصر بهذا المعنى بعد \"nicht\".",
      grammar_example: "Verlassen Sie sich nicht nur auf Zufall.",
    },
    "33": {
      keyword: "können (Sie, Präsens)",
      item_type: "verb",
      evidence_text: "denn Sie **können** Ihre Chancen selbst stark verbessern",
      explanation_correct: "الفعل الوجهي \"können\" (يستطيع) يطابق الفاعل \"Sie\" الرسمي، ويصف الإمكانية.",
      explanation_wrong: "لا فعل وجهي آخر في القائمة يناسب هذا المعنى (الإمكانية) هنا.",
      grammar_example: "Mit dieser Methode können Sie Ihre Ergebnisse deutlich verbessern.",
    },
    "34": {
      keyword: "wenn (Bedingung, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Ihre Chancen selbst stark verbessern, **wenn** Sie mit unserem Lotterie-System spielen",
      explanation_correct: "الفعل في نهاية الجملة (spielen) يدل على جملة ثانوية شرطية؛ \"wenn\" تصوغ الشرط (إن لعبتم بنظامنا).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ شرطاً بهذا الترتيب النحوي.",
      grammar_example: "Sie sparen Zeit, wenn Sie unser System nutzen.",
    },
    "35": {
      keyword: "statt ... zu + Infinitiv",
      item_type: "grammar_structure",
      evidence_text: "**Statt** allein zu spielen, spielen Sie mit uns in einer starken Spielergemeinschaft.",
      explanation_correct: "\"statt... zu + Infinitiv\" تركيب إنتاجي شائع بمعنى \"بدلاً من فعل كذا\" يصوغ بديلاً لفعل غير مُتَّبَع.",
      explanation_wrong: "لا كلمة أخرى في القائمة تبدأ هذا التركيب بمعنى \"بدلاً من\".",
      grammar_example: "Statt zu Hause zu bleiben, gehen wir heute spazieren.",
    },
    "36": {
      keyword: "ganz automatisch (Verstärkung)",
      item_type: "adjective_adverb",
      evidence_text: "Dadurch erhöhen sich **ganz** automatisch Ihre Chancen!",
      explanation_correct: "\"ganz\" هنا ظرف تكثيف يعزز \"automatisch\" (بشكل تلقائي تماماً).",
      explanation_wrong: "لا ظرف آخر في القائمة يعزز \"automatisch\" بهذا المعنى.",
      grammar_example: "Die Kosten sinken dadurch ganz automatisch.",
    },
    "37": {
      keyword: "bei unserem System (Mittel)",
      item_type: "preposition",
      evidence_text: "**Bei** unserem Quantum-System spielen Sie mit einer Chance auf einen Gewinn von 1 Million Euro!",
      explanation_correct: "\"bei\" هنا تصف الاستخدام/السياق (\"عند اللعب بنظامنا\")، حرف جر شائع لوصف طريقة أو أداة.",
      explanation_wrong: "لا حرف جر آخر في القائمة يناسب هذا المعنى (استخدام النظام) هنا.",
      grammar_example: "Bei diesem Angebot sparen Sie bis zu 30 Prozent.",
    },
    "38": {
      keyword: "garantieren (wir, Präsens)",
      item_type: "verb",
      evidence_text: "Alle Gewinne erhalten Sie umgehend und ungekürzt zu 100% - das **garantieren** wir Ihnen!",
      explanation_correct: "\"garantieren\" (يضمن) فعل مضارع مطابق للفاعل \"wir\"، يؤكد الوعد بدفع الأرباح كاملة.",
      explanation_wrong: "لا فعل آخر في القائمة يعني \"يضمن\" بهذا المعنى التسويقي المباشر.",
      grammar_example: "Schnelle Lieferung garantieren wir Ihnen immer.",
    },
    "39": {
      keyword: "bereits (schon)",
      item_type: "adjective_adverb",
      evidence_text: "**Bereits** 700 Quantum-Systemspielgruppen haben zusammen schon über sieben Millionen Euro gewonnen.",
      explanation_correct: "\"bereits\" (بالفعل/سلفاً) ظرف رسمي مرادف لـ\"schon\"، يؤكد نجاحات سابقة موثَّقة.",
      explanation_wrong: "لا ظرف آخر في القائمة يعني \"بالفعل\" بهذا الأسلوب الرسمي.",
      grammar_example: "Bereits über tausend Kunden haben unser Angebot genutzt.",
    },
    "40": {
      keyword: "mitmachen (trennbares Verb, Imperativ)",
      item_type: "verb",
      evidence_text: "**Machen** Sie hier unbedingt mit und gewinnen Sie!",
      explanation_correct: "الفعل المنفصل \"mitmachen\" (يشارك) بصيغة الأمر الرسمية؛ البادئة \"mit\" تبقى في نهاية الجملة.",
      explanation_wrong: "لا فعل آخر في القائمة يكوّن صيغة أمر مناسبة لـ\"mit\" هنا.",
      grammar_example: "Machen Sie noch heute bei unserer Aktion mit!",
    },
  },
  translation: {
    text: "نظام كوانتم\nلعبة اليانصيب المنهجية\nشارع أوتو-زور-آلي 100، برلين 10120\n\nعملاء اليانصيب المحترمون،\n\nمن منكم لا يرغب أن يكون - ولو مرة واحدة - من بين الفائزين بالأرقام الستة الصحيحة؟ لا تعتمدوا في لعب اليانصيب على الحظ فقط، فبإمكانكم تحسين فرصكم بشكل كبير عندما تلعبون بنظامنا - وذلك مقابل 5 يورو فقط أسبوعياً!\n\nبدلاً من اللعب بمفردكم، العبوا معنا ضمن مجموعة لعب قوية. وبذلك تزداد فرصكم تلقائياً بشكل كبير!\n\nوماذا يمكنكم أن تربحوا؟ عند اللعب بنظامنا كوانتم، تلعبون بفرصة الفوز بمليون يورو! تستلمون جميع الأرباح فوراً وكاملة بنسبة 100% - وهذا ما نضمنه لكم!\n\nلقد اقتنعتُ بذلك بنفسي! العبوا معنا نظام كوانتم: أكثر من 700 مجموعة لعب بنظام كوانتم ربحت معاً بالفعل أكثر من سبعة ملايين يورو.\n\nمع أطيب التحيات،\nسابينه ماير-بوتس\n\nملاحظة: كفرصة فوز خاصة، تحصلون اليوم على لعبة مجانية بأربعة أرقام صحيحة. شاركوا هنا حتماً واربحوا! أتمنى لكم حظاً موفقاً......",
  },
};

const HERR_BLANCO_RUIZ = {
  items: {
    "31": {
      keyword: "mir aufgefallen (auffallen + Dativ)",
      item_type: "pronoun",
      evidence_text: "die **mir** in der heutigen Bild-Zeitung aufgefallen ist.",
      explanation_correct: "\"jemandem auffallen\" (يلفت انتباه شخص) يحكم حالة الجر؛ الكاتبة تتحدث عن نفسها: mir.",
      explanation_wrong: "لا ضمير آخر في القائمة يطابق حالة الجر لصيغة المتكلم هنا.",
      grammar_example: "Die Anzeige ist mir sofort aufgefallen.",
    },
    "32": {
      keyword: "für einige Monate (Dauer)",
      item_type: "preposition",
      evidence_text: "Da ich **für** einige Monate beruflich nach Südamerika gehe",
      explanation_correct: "\"für\" + مدة زمنية تعبير شائع يصف مدة إقامة مؤقتة محددة.",
      explanation_wrong: "لا حرف جر آخر في القائمة يصف \"لمدة\" بهذا المعنى.",
      grammar_example: "Ich fahre für zwei Wochen ins Ausland.",
    },
    "33": {
      keyword: "keine Zeit (Verneinung)",
      item_type: "pronoun",
      evidence_text: "Für einen richtigen Sprachkurs habe ich leider **keine** Zeit.",
      explanation_correct: "\"kein-\" أداة نفي تُصرَّف مطابقةً للاسم المؤنث \"Zeit\" بحالة النصب: keine.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح أداة نفي بهذا الشكل المصرَّف.",
      grammar_example: "Für Sport habe ich momentan leider keine Zeit.",
    },
    "34": {
      keyword: "mit den CDs (Mittel)",
      item_type: "preposition",
      evidence_text: "vor allem die Sprachübungen **mit** den CDs.",
      explanation_correct: "\"mit\" تصف الوسيلة (تمارين باستخدام الأقراص المدمجة)، وتحكم حالة الجر.",
      explanation_wrong: "لا حرف جر آخر في القائمة يصف \"باستخدام\" أداة معينة بهذا المعنى.",
      grammar_example: "Die Übungen mit dem Programm machen mir Spaß.",
    },
    "35": {
      keyword: "gute Fortschritte (Plural)",
      item_type: "adjective_adverb",
      evidence_text: "Ich denke, damit könnte ich ganz **gute** [Fortschritte machen].",
      explanation_correct: "\"gut\" هنا صفة جمعية بلا أداة تعريف (تصف تقدماً محتملاً)، فتأخذ نهاية التصريف القوي: -e.",
      explanation_wrong: "لا صفة أخرى في القائمة تناسب هذا الموضع.",
      grammar_example: "Mit dieser Methode könnte ich ganz gute Ergebnisse erzielen.",
    },
    "36": {
      keyword: "am liebsten (bevorzugt)",
      item_type: "fixed_expression",
      evidence_text: "Ich arbeite **am** liebsten mit meinem PC.",
      explanation_correct: "\"am liebsten\" صيغة تفضيل مطلق ثابتة بمعنى \"الأكثر تفضيلاً/يفضّل الأكثر\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل هذا التعبير الثابت قبل \"liebsten\".",
      grammar_example: "Am liebsten arbeite ich morgens, wenn es ruhig ist.",
    },
    "37": {
      keyword: "dass (Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Sie schreiben, **dass** Ihr Programm besonders die alltägliche Kommunikation fördert.",
      explanation_correct: "الفعل في نهاية الجملة (fördert) يدل على جملة ثانوية؛ \"dass\" تُدخل جملة مفعول به بعد \"schreiben\".",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تُدخل جملة مفعول به بهذا الشكل بعد \"schreiben\".",
      grammar_example: "Sie schreiben, dass der Kurs im Herbst beginnt.",
    },
    "38": {
      keyword: "bis (Verb am Ende, Zeitpunkt)",
      item_type: "conjunction",
      evidence_text: "Wie lange wird es dauern, **bis** ich mich meinen Geschäftsfreunden richtig unterhalten kann?",
      explanation_correct: "الفعل في نهاية الجملة (kann) يدل على جملة ثانوية زمنية؛ \"bis\" تصف النقطة الزمنية المستهدفة (حتى يصبح قادراً على التحدث بطلاقة).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصف نقطة زمنية مستقبلية بهذا الشكل.",
      grammar_example: "Es dauert einige Monate, bis man eine Sprache gut sprechen kann.",
    },
    "39": {
      keyword: "pro Woche (Rate)",
      item_type: "preposition",
      evidence_text: "wie viele Stunden **pro** Woche sollte man mindestens üben?",
      explanation_correct: "\"pro\" تعبير ثابت لوصف معدل/نسبة (\"لكل أسبوع\")، شائع في السياقات الإحصائية.",
      explanation_wrong: "لا حرف جر آخر في القائمة يصف معدلاً زمنياً بهذا المعنى.",
      grammar_example: "Ich lerne etwa fünf Stunden pro Woche Spanisch.",
    },
    "40": {
      keyword: "möchte (Wunsch, ich)",
      item_type: "verb",
      evidence_text: "Ich **möchte** gerne ausprobieren, wie ihre Methode funktioniert.",
      explanation_correct: "الفعل الوجهي \"möchte\" (أودّ) يعبّر عن رغبة مهذبة في تجربة المنتج.",
      explanation_wrong: "لا فعل آخر في القائمة يعبّر عن رغبة مهذبة بهذا الشكل.",
      grammar_example: "Ich möchte gerne testen, wie das Programm funktioniert.",
    },
  },
  translation: {
    text: "السيد بلانكو رويز المحترم،\n\nأكتب لكم بخصوص الإعلان الذي لفت انتباهي في صحيفة Bild اليوم. بما أنني سأذهب لأسباب مهنية إلى أمريكا الجنوبية لعدة أشهر، يجب أن أتعلم الإسبانية بسرعة كبيرة. للأسف ليس لدي وقت لدورة لغة حقيقية. لكن طريقتكم تثير اهتمامي، خصوصاً تمارين اللغة على الأقراص المدمجة. أعتقد أنني بذلك قد أحقق تقدماً جيداً جداً. أفضّل العمل بواسطة الكمبيوتر الخاص بي. تذكرون أن برنامجكم يعزز بشكل خاص التواصل اليومي. كم من الوقت سيستغرق حتى أتمكن من التحدث بشكل صحيح مع شركائي في العمل؟ وكم ساعة أسبوعياً ينبغي التدرب على الأقل؟ هل يمكنكم إرسال درس نموذجي لي؟ أودّ تجربته لأرى كيف تعمل طريقتكم.\n\nمع أطيب التحيات\n\nكارين أوبرشير",
  },
};

async function setLearningAids(title, aids) {
  const rows = await q(`select id from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 2;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  console.log(`${title}: writing ${Object.keys(aids.items).length} gaps`);
  if (APPLY) {
    const b64 = Buffer.from(JSON.stringify(aids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${rows[0].id}';`);
  }
}

async function main() {
  await setLearningAids("Gauberger", GAUBERGER);
  await setLearningAids("Lottospieler", LOTTOSPIELER);
  await setLearningAids("Herr Blanco Ruiz", HERR_BLANCO_RUIZ);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

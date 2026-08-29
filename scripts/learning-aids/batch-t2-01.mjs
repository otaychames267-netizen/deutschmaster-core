/**
 * Batch T2 #1: "ADRIAN", "ADRIAN 2", "Alpen". All had learning_aids = null.
 *
 * T2 exercises are word-bank fill-in (sb_t2_gaps.correct_word + a shared
 * sb_t2_words pool per exercise), not multiple-choice like T1 -- confirmed
 * the frontend (sprachbausteine.teil-2.tsx:66) just renders whatever rows
 * exist in sb_t2_words with no fixed-count assumption, so adding entries
 * is safe.
 *
 * Found a 3-gap cluster of genuine answer-key bugs in "ADRIAN" (not its
 * near-identical twin "ADRIAN 2", which is correct at the same slots):
 *  - gap 36: "WEGEN" (preposition, needs a Genitiv NOUN) cannot introduce
 *    the full finite clause that's actually there ("sie als Brücke zu
 *    Europa gilt", verb-final). Needs "WEIL" (subordinating conjunction).
 *  - gap 37: "NUN" (now, an adverb) cannot fill a bare VERB slot ("{{37}}
 *    wir ein gutes Hotel" = "[verb] we a good hotel"). Needs a verb
 *    meaning "to seek" -- "SUCHEN".
 *  - gap 38: "AM" cannot precede a bare adjective ("Es sollte {{38}} ruhig
 *    gelegen sein" -- "am" needs a following noun). Needs "AUCH" (also).
 * "ADRIAN 2" -- byte-identical surrounding text at all 3 spots -- already
 * uses WEIL/SUCHEN/AUCH there, which is strong independent confirmation
 * these are the intended words, not just a defensible alternate reading.
 * Since none of the 3 correct words existed in ADRIAN's own 15-word bank,
 * fixing this required ADDING entries (not just repointing correct_word
 * to an existing sibling, as in the T1 fixes) -- verified safe first via
 * the frontend check above.
 *
 * Usage: node scripts/learning-aids/batch-t2-01.mjs [--apply]
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

const ADRIAN = {
  items: {
    "31": {
      keyword: "den Auftrag haben, ... zu tun",
      item_type: "fixed_expression",
      evidence_text: "unsere Organisation hat den **Auftrag**, eine deutsch-französische Konferenz... vorzubereiten.",
      explanation_correct: "\"den Auftrag haben, etwas zu tun\" تعبير ثابت رسمي بمعنى \"لدى الجهة مهمة/تكليف بفعل كذا\" في المراسلات التجارية.",
      explanation_wrong: "\"Termin\" (موعد) يصف نقطة زمنية لا مهمة موكَلة، فلا يناسب \"den Termin haben, etwas vorzubereiten\".",
      grammar_example: "Der Ausschuss hat den Auftrag, die neuen Regeln zu prüfen.",
    },
    "32": {
      keyword: "stattfinden (Veranstaltung)",
      item_type: "verb",
      evidence_text: "Diese Veranstaltung könnte in Breisach **stattfinden**",
      explanation_correct: "\"stattfinden\" الفعل الثابت لوصف \"إقامة\" حدث/فعالية في مكان معين، بعد الفعل الوجهي \"könnte\" بصيغة المصدر.",
      explanation_wrong: "لا يوجد بديل مناسب آخر في القائمة لوصف \"إقامة فعالية\" بهذا المعنى الدقيق.",
      grammar_example: "Das Konzert könnte auch im Park stattfinden.",
    },
    "33": {
      keyword: "nähere Informationen (Plural)",
      item_type: "noun",
      evidence_text: "daher brauchen wir von Ihnen nähere **Informationen**.",
      explanation_correct: "\"Informationen\" اسم جمع يطابق الصفة \"nähere\" (أكثر تفصيلاً) -- تعبير رسمي شائع لطلب تفاصيل إضافية.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح كاسم جمع بهذا المعنى في هذا الموضع.",
      grammar_example: "Können Sie uns bitte nähere Informationen zu den Preisen schicken?",
    },
    "34": {
      keyword: "nennen (Sie, Präsens)",
      item_type: "verb",
      evidence_text: "In Ihrer Anzeige **nennen** Sie die Sehenswürdigkeiten von Breisach",
      explanation_correct: "\"nennen\" (يذكر/يسمي) فعل مضارع مطابق للفاعل \"Sie\"، ويصف ما يفعله الإعلان (يعدّد المعالم).",
      explanation_wrong: "\"fragen\" (يسأل) فعل شائع مشابه شكلاً، لكن معناه خاطئ تماماً هنا -- الإعلان لا \"يسأل\" عن المعالم بل يذكرها.",
      grammar_example: "In der Broschüre nennen wir alle wichtigen Öffnungszeiten.",
    },
    "35": {
      keyword: "geeignet (Prädikatsadjektiv)",
      item_type: "adjective_adverb",
      evidence_text: "erscheint uns Ihre Stadt als sehr **geeignet**",
      explanation_correct: "\"geeignet\" (مناسب) صفة محمول بعد \"erscheinen als\" (يبدو بصفته)، تصف مدى ملاءمة المدينة للمؤتمر.",
      explanation_wrong: "لا صفة أخرى في القائمة تناسب معنى \"مناسب/ملائم\" في هذا السياق.",
      grammar_example: "Dieser Raum erscheint uns als sehr geeignet für die Konferenz.",
    },
    "36": {
      keyword: "weil (Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Deshalb erscheint uns Ihre Stadt als sehr geeignet, auch **weil** sie als Brücke zu Europa gilt.",
      explanation_correct: "الفعل في نهاية الجملة (gilt) يدل على جملة ثانوية سببية؛ \"weil\" أداة الربط السببية التي تناسب هذا الترتيب.",
      explanation_wrong: "\"wegen\" حرف جر يحتاج اسماً بحالة الملكية بعده مباشرة (wegen ihrer Geltung)، ولا يمكنه إدخال جملة كاملة بفعل في النهاية كهذه.",
      grammar_example: "Die Stadt ist beliebt, auch weil sie so zentral liegt.",
    },
    "37": {
      keyword: "suchen (wir, Präsens)",
      item_type: "verb",
      evidence_text: "Für diese Veranstaltung **suchen** wir ein gutes Hotel",
      explanation_correct: "\"suchen\" (يبحث عن) فعل مضارع مطابق للفاعل \"wir\"، يصف حاجتهم لإيجاد فندق مناسب.",
      explanation_wrong: "\"nun\" (الآن) ظرف زمني، لا يمكنه أن يشغل موضع الفعل الرئيسي في الجملة (\"nun wir ein Hotel\" غير صحيح نحوياً).",
      grammar_example: "Für unser Projekt suchen wir noch einen erfahrenen Partner.",
    },
    "38": {
      keyword: "auch (zusätzliche Eigenschaft)",
      item_type: "adjective_adverb",
      evidence_text: "Es sollte **auch** ruhig gelegen sein.",
      explanation_correct: "\"auch\" (أيضاً) تضيف صفة أخرى مطلوبة (هادئ الموقع) إلى قائمة المواصفات المذكورة سابقاً (قاعات مؤتمرات، إنترنت...).",
      explanation_wrong: "\"am\" حرف جر يحتاج اسماً بعده مباشرة، ولا يمكن أن يسبق صفة مجردة مثل \"ruhig\" بهذا الشكل.",
      grammar_example: "Das Zimmer sollte hell und auch geräumig sein.",
    },
    "39": {
      keyword: "der Termin (Datum)",
      item_type: "noun",
      evidence_text: "Der **Termin** wäre 15.-21. November.",
      explanation_correct: "\"Termin\" (موعد) اسم فاعل الجملة \"wäre\"، يصف التاريخ المقترح للمؤتمر.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصف \"موعداً/تاريخاً\" بهذا المعنى المحدد.",
      grammar_example: "Der Termin für das nächste Treffen wäre Anfang März.",
    },
    "40": {
      keyword: "wären wir dankbar (höfliche Formel)",
      item_type: "tense",
      evidence_text: "Für Prospekte und Informationen zu Preisen und Buchungsbedingungen **wären** wir Ihnen dankbar.",
      explanation_correct: "\"wir wären Ihnen dankbar für...\" صيغة مهذبة ثابتة (Konjunktiv II) شائعة في الرسائل الرسمية لطلب شيء بأدب.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح فعلاً مساعداً لهذه الصيغة المهذبة الثابتة.",
      grammar_example: "Für eine schnelle Antwort wären wir Ihnen sehr dankbar.",
    },
  },
  translation: {
    text: "السادة المحترمون،\n\nتلقّت منظمتنا مهمة تحضير مؤتمر ألماني-فرنسي حول برامج التنمية الأوروبية. يمكن لهذه الفعالية أن تُقام في مدينة برايزاخ، لذا نحتاج منكم إلى معلومات أكثر تفصيلاً. في إعلانكم تذكرون معالم برايزاخ السياحية والإمكانيات السياحية المختلفة. لذلك تبدو لنا مدينتكم مناسبة جداً، خصوصاً لأنها تُعتبر جسراً نحو أوروبا.\n\nالآن لدينا الطلب التالي: من أجل هذه الفعالية نبحث عن فندق جيد، يُفضّل أن يكون على ضفاف نهر الراين، مزوَّد بقاعات مؤتمرات وقاعات عمل، مجهَّز بالمعدات التقنية اللازمة، اتصال بالإنترنت وما إلى ذلك. ينبغي أيضاً أن يكون هادئ الموقع. هل يمكنكم إرسال اقتراحات لنا بهذا الخصوص؟ الموعد سيكون من 15 إلى 21 نوفمبر.\n\nيُرجى إعلامنا في أقرب وقت ممكن. سنكون ممتنين لكم على النشرات والمعلومات المتعلقة بالأسعار وشروط الحجز.\n\nمع أطيب التحيات\n\nأدريان شولر\nشركة EVD Trans",
  },
};

const ADRIAN2 = {
  items: {
    "31": { ...ADRIAN.items["31"] },
    "32": { ...ADRIAN.items["32"] },
    "33": { ...ADRIAN.items["33"] },
    "34": {
      keyword: "beschreiben (Sie, Präsens)",
      item_type: "verb",
      evidence_text: "In Ihrer Anzeige **beschreiben** Sie die Sehenswürdigkeiten von Breisach",
      explanation_correct: "\"beschreiben\" (يصف) فعل مضارع مطابق للفاعل \"Sie\"، مرادف قريب لـ\"nennen\" يستخدم هنا في هذا الإصدار من الرسالة.",
      explanation_wrong: "\"fragen\" (يسأل) معناه خاطئ تماماً -- الإعلان لا \"يسأل\" عن المعالم بل يصفها.",
      grammar_example: "In der Broschüre beschreiben wir alle wichtigen Sehenswürdigkeiten.",
    },
    "35": {
      keyword: "geeignet (Prädikatsadjektiv)",
      item_type: "adjective_adverb",
      evidence_text: "erscheint uns Ihre Stadt als sehr **geeignet**",
      explanation_correct: "\"geeignet\" (مناسب) صفة محمول بعد \"erscheinen als\"، تصف مدى ملاءمة المدينة للمؤتمر.",
      explanation_wrong: "لا صفة أخرى في القائمة تناسب معنى \"مناسب/ملائم\" في هذا السياق.",
      grammar_example: "Dieser Raum erscheint uns als sehr geeignet für die Konferenz.",
    },
    "36": { ...ADRIAN.items["36"] },
    "37": { ...ADRIAN.items["37"] },
    "38": { ...ADRIAN.items["38"] },
    "39": { ...ADRIAN.items["39"] },
    "40": { ...ADRIAN.items["40"] },
  },
  translation: {
    text: "السادة المحترمون،\n\nتلقّت منظمتنا مهمة تحضير مؤتمر ألماني-فرنسي حول برامج التنمية الأوروبية.\n\nيمكن لهذه الفعالية أن تُقام في مدينة برايزاخ، لذا نحتاج منكم إلى معلومات أكثر تفصيلاً. في إعلانكم تصفون معالم برايزاخ السياحية والإمكانيات السياحية المختلفة. لذلك تبدو لنا مدينتكم مناسبة جداً، خصوصاً لأنها تُعتبر جسراً نحو أوروبا.\n\nالآن لدينا الطلب التالي: من أجل هذه الفعالية نبحث عن فندق جيد، يُفضّل أن يكون على ضفاف نهر الراين، مزوَّد بقاعات مؤتمرات وقاعات عمل، مجهَّز بالمعدات التقنية اللازمة، اتصال بالإنترنت وما إلى ذلك. ينبغي أيضاً أن يكون هادئ الموقع. هل يمكنكم إرسال اقتراحات لنا بهذا الخصوص؟ الموعد سيكون من 15 إلى 21 نوفمبر.\n\nيُرجى إعلامنا في أقرب وقت ممكن. سنكون ممتنين لكم على النشرات والمعلومات المتعلقة بالأسعار وشروط الحجز.\n\nمع أطيب التحيات\n\nأدريان شولر\nشركة EVD Trans",
  },
};

const ALPEN = {
  items: {
    "31": {
      keyword: "entdeckt (Perfekt)",
      item_type: "tense",
      evidence_text: "mein Mann und ich haben Ihre Anzeige... **entdeckt**.",
      explanation_correct: "\"haben\" الفعل المساعد موجود سلفاً؛ الماضي التام لفعل \"entdecken\" (يكتشف) يستوجب صيغة الفاعل الثاني: entdeckt.",
      explanation_wrong: "لا فعل آخر في القائمة يعني \"اكتشف\" بهذا المعنى، والكلمات الأخرى لا تصلح صيغة فاعل ثانٍ هنا.",
      grammar_example: "Wir haben Ihre Anzeige in der Zeitung entdeckt.",
    },
    "32": {
      keyword: "weil (Grund, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "schreiben Ihnen, **weil** wir Lust hätten, etwas in einer Gruppe zu machen.",
      explanation_correct: "الفعل في نهاية الجملة (hätten) يدل على جملة ثانوية سببية؛ \"weil\" تفسر سبب الكتابة.",
      explanation_wrong: "\"wenn\" تصوغ شرطاً/تكراراً لا سبباً مباشراً لفعل الكتابة نفسه هنا.",
      grammar_example: "Wir schreiben Ihnen, weil wir Interesse an Ihrem Angebot haben.",
    },
    "33": {
      keyword: "wenn (Bedingung, wiederholt)",
      item_type: "conjunction",
      evidence_text: "Und **wenn** es unser Terminkalender erlaubt, gehen wir auch noch am Wochenende wandern",
      explanation_correct: "الفعل في نهاية الجملة (erlaubt) يدل على جملة ثانوية شرطية متكررة؛ \"wenn\" تناسب الشرط العام غير المرتبط بحدث ماضٍ وحيد.",
      explanation_wrong: "\"weil\" تصوغ سبباً لا شرطاً، ولا تناسب معنى \"كلما سمح الوقت\" هنا.",
      grammar_example: "Wenn das Wetter gut ist, fahren wir mit dem Rad zur Arbeit.",
    },
    "34": {
      keyword: "oft (Häufigkeit)",
      item_type: "adjective_adverb",
      evidence_text: "**oft** fahren wir in die Gegend vom Wilden Kaiser",
      explanation_correct: "\"oft\" (غالباً) ظرف تكرار في الموضع الأول، يقلب ترتيب الفاعل والفعل (fahren wir).",
      explanation_wrong: "لا ظرف آخر في القائمة يصف تكرار الفعل (الذهاب إلى تلك المنطقة) بهذا المعنى.",
      grammar_example: "Am Wochenende fahren wir oft in die Berge.",
    },
    "35": {
      keyword: "kennen (vertraut sein mit)",
      item_type: "verb",
      evidence_text: "wo wir inzwischen alle Wanderwege **kennen**.",
      explanation_correct: "\"kennen\" (يعرف/معتاد على) يصف حالة إلمام بمكان، مطابق للفاعل \"wir\" في المضارع.",
      explanation_wrong: "\"lernen\" (يتعلّم) يصف عملية اكتساب معرفة جديدة، لا حالة إلمام قائمة بالفعل كما يفيد \"inzwischen\" (بات الآن يعرف).",
      grammar_example: "Nach zwanzig Jahren hier kennen wir jede Straße der Stadt.",
    },
    "36": {
      keyword: "zwar ... aber (Gegensatz)",
      item_type: "conjunction",
      evidence_text: "Wir fahren zwar beide auch Ski, **aber** der Winter in den Bergen ist nicht so unbedingt unsere Sache.",
      explanation_correct: "\"zwar... aber\" أداة ربط مزدوجة ثابتة تعترف بحقيقة (يتزلجان) ثم تصوغ تحفظاً (لكن الشتاء ليس هوايتهما المفضلة).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تكمّل \"zwar\" بهذا الشكل المتناقض الثابت.",
      grammar_example: "Ich mag zwar Berge, aber Skifahren ist nicht so meins.",
    },
    "37": {
      keyword: "es macht uns Spaß (Dativ)",
      item_type: "pronoun",
      evidence_text: "Dagegen macht es **uns** viel Spaß, Fahrrad zu fahren",
      explanation_correct: "\"es macht jemandem Spaß\" تعبير ثابت غير شخصي؛ الضمير بحالة الجر يطابق الفاعلين (الزوجان): uns.",
      explanation_wrong: "لا ضمير آخر في القائمة يطابق الفاعلين \"wir\" (الزوجان) بحالة الجر.",
      grammar_example: "Es macht uns immer viel Spaß, zusammen zu kochen.",
    },
    "38": {
      keyword: "würden (Konjunktiv II, würden+Infinitiv)",
      item_type: "tense",
      evidence_text: "Daher **würden** wir uns auch auf gemeinsame Radtouren... freuen.",
      explanation_correct: "تركيب الحال الافتراضي المهذب \"würden + Infinitiv\" (يسعدنا لو...) يعبّر عن أمل/رغبة مستقبلية بلطف.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح فعلاً مساعداً لهذا التركيب الافتراضي.",
      grammar_example: "Wir würden uns freuen, bald von Ihnen zu hören.",
    },
    "39": {
      keyword: "ein paar (ein wenig)",
      item_type: "fixed_expression",
      evidence_text: "Zum Schluss noch ein **paar** Worte zu uns selbst.",
      explanation_correct: "\"ein paar\" تعبير ثابت (بحرف صغير) بمعنى \"بضعة/قليل من\" -- يختلف عن \"ein Paar\" (بحرف كبير) بمعنى \"زوج/ثنائي\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح كمي هنا للدلالة على \"عدد قليل\" بهذا الشكل الثابت.",
      grammar_example: "Ich habe noch ein paar Fragen zu Ihrem Angebot.",
    },
    "40": {
      keyword: "doch einmal (freundliche Aufforderung)",
      item_type: "fixed_expression",
      evidence_text: "Rufen Sie uns doch **einmal** an",
      explanation_correct: "\"doch einmal\" تركيب تلطيف شائع في الدعوات، بمعنى \"فقط جرّبوا الاتصال يوماً ما\" -- أسلوب ودود غير ملزم.",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل \"doch\" بهذا المعنى التلطيفي في دعوة للاتصال.",
      grammar_example: "Besuchen Sie uns doch einmal, wenn Sie in der Nähe sind.",
    },
  },
  translation: {
    text: "رمز الإعلان 2063/9369\n\nعزيزي المجهول،\n\nاكتشفتُ أنا وزوجي إعلانكم في نشرة النادي الألماني للجبال (Alpenverein). نسكن على بُعد نحو 40 كم خارج مدينة نورمبرغ، ونكتب لكم لأننا نرغب في القيام بشيء ما ضمن مجموعة.\n\nنقضي عطلتنا الصيفية عادةً بانتظام في الجبال. وإذا سمح لنا جدولنا، نذهب أيضاً للمشي لمسافات طويلة في عطلة نهاية الأسبوع، وغالباً ما نذهب إلى منطقة \"فيلدر كايزر\"، حيث بات لدينا الآن معرفة بكل مسارات المشي هناك.\n\nنتزلج كلانا أيضاً على الجليد، لكن الشتاء في الجبال ليس بالضرورة هوايتنا المفضلة.\n\nفي المقابل، تسعدنا كثيراً ركوب الدراجات؛ فلدينا هنا في لويبولدشتاين مسارات دراجات رائعة تمر عبر الحقول. لذا يسرّنا أيضاً القيام برحلات دراجات مشتركة هنا عندنا.\n\nأخيراً بضع كلمات عنّا: عمرانا 64 و62 عاماً، نحب الموسيقى ونذهب بين الحين والآخر إلى المسرح.\n\nاتصلوا بنا يوماً ما على الرقم: 09243/7448.\n\nمع تحياتنا\nإيلكا وهاينر غروسمان",
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

async function fixAdrianAnswerKey() {
  const rows = await q(`select g.id, g.gap_number from sb_t2_gaps g join sb_exercises e on e.id = g.exercise_id where e.title = 'ADRIAN' and e.teil = 2 and g.gap_number in (36, 37, 38) order by g.gap_number;`);
  const fixes = { 36: "WEIL", 37: "SUCHEN", 38: "AUCH" };
  for (const row of rows) {
    console.log(`ADRIAN gap ${row.gap_number} answer key -> ${fixes[row.gap_number]}`);
    if (APPLY) await q(`update sb_t2_gaps set correct_word = '${fixes[row.gap_number]}' where id = '${row.id}';`);
  }
  const exRows = await q(`select id from sb_exercises where title = 'ADRIAN' and teil = 2;`);
  const exId = exRows[0].id;
  const maxRows = await q(`select coalesce(max(word_number), 0) as max_num from sb_t2_words where exercise_id = '${exId}';`);
  let nextNum = maxRows[0].max_num + 1;
  for (const word of ["WEIL", "SUCHEN", "AUCH"]) {
    console.log(`ADRIAN word bank: adding "${word}" at word_number ${nextNum}`);
    if (APPLY) await q(`insert into sb_t2_words (exercise_id, word_number, word) values ('${exId}', ${nextNum}, '${word}');`);
    nextNum++;
  }
}

async function main() {
  await fixAdrianAnswerKey();
  await setLearningAids("ADRIAN", ADRIAN);
  await setLearningAids("ADRIAN 2", ADRIAN2);
  await setLearningAids("Alpen", ALPEN);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

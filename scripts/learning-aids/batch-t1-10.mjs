/**
 * Batch T1 #10: "Dominique", "Frau Thoma", "Herr Meyerhofer" -- all 3 had
 * learning_aids = null. Built full content from scratch from real
 * passage + gap data.
 *
 * Two more genuine answer-key bugs found in "Frau Thoma", same category as
 * the Buschhaus one (batch 9):
 *  - gap 21: options dass/darum/weil, DB had "darum" correct. But gap 22
 *    (the clause's verb "sind") sits at the very END of that clause --
 *    verb-final order, which only a SUBORDINATING conjunction can trigger.
 *    "darum" is a coordinating adverb (like "deshalb") that would demand
 *    normal V2 order in its own clause, not verb-final -- it cannot
 *    grammatically produce the word order that is actually in the text.
 *    "dass" is the one that fits (mirrors the identical "schade, dass..."
 *    construction already confirmed correct in "Buschhaus" gap 21).
 *  - gap 27: options für/von/wegen, DB had "von" correct. "von" governs
 *    Dativ, and Dativ PLURAL nouns require a "-n" ending ("von
 *    Mitarbeitern") -- but the text has the unmarked plural "Mitarbeiter"
 *    (no -n), which only matches Akkusativ plural (unchanged from
 *    nominative) -- i.e. "für" (which governs Akkusativ). "von" cannot be
 *    grammatically correct against the actual surface text.
 *
 * Usage: node scripts/learning-aids/batch-t1-10.mjs [--apply]
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

const DOMINIQUE = {
  items: {
    "21": {
      keyword: "ist ... geschehen (Perfekt mit sein)",
      item_type: "tense",
      evidence_text: "Es ist nämlich etwas ganz Besonderes **geschehen**:",
      answer_translation: "حدث",
      explanation_correct: "\"ist\" الفعل المساعد موجود سلفاً؛ فعل \"geschehen\" (يحدث) يُصرَّف في الماضي التام مع \"sein\"، فتصبح الفجوة صيغة الفاعل الثاني: geschehen.",
      explanation_wrong: "\"geschieht\" مضارع، و\"geschah\" ماضٍ بسيط -- كلاهما لا يتوافق مع الفعل المساعد \"ist\" في تركيب الماضي التام.",
      grammar_example: "Gestern Abend ist etwas Merkwürdiges geschehen.",
    },
    "22": {
      keyword: "Stell dir vor (feste Wendung)",
      item_type: "fixed_expression",
      evidence_text: "Stell **dir** vor, ich habe die Stelle bei der EU in Brüssel bekommen!",
      answer_translation: "تخيّل",
      explanation_correct: "\"Stell dir vor\" تعبير ثابت شائع بمعنى \"تخيّل!\"، بضمير انعكاسي بحالة الجر (Dativ).",
      explanation_wrong: "\"dich\" حالة نصب لا تناسب هذا الفعل الانعكاسي الخاص، و\"Du\" ضمير فاعل لا مكان له هنا (الجملة أمرية والفاعل محذوف أصلاً).",
      grammar_example: "Stell dir vor, wir haben im Lotto gewonnen!",
    },
    "23": {
      keyword: "wurden ausgesucht (Passiv, Präteritum)",
      item_type: "tense",
      evidence_text: "Es gab ungefähr 300 Bewerber, und unter denen **wurden** die besten ausgesucht.",
      answer_translation: "تمّ اختيار",
      explanation_correct: "المبنى للمجهول (Passiv) في الماضي البسيط: \"wurden + Partizip II (ausgesucht)\" = \"تم اختيارهم\".",
      explanation_wrong: "\"halten\" فعل مختلف تماماً لا يناسب المعنى، و\"wären\" صيغة الحال الافتراضي (Konjunktiv II) لا تناسب سرد حدث واقعي فعلاً.",
      grammar_example: "Von den vielen Kandidaten wurden nur drei eingeladen.",
    },
    "24": {
      keyword: "lange Zeit (feste Wendung, unveränderlich)",
      item_type: "fixed_expression",
      evidence_text: "Ich hatte mich auf das Vorstellungsgespräch schon **lange** Zeit vorher vorbereitet.",
      answer_translation: "منذ وقت طويل",
      explanation_correct: "\"lange Zeit\" تعبير ثابت شائع بمعنى \"مدة طويلة\"، يُستخدم ظرفياً بلا نهاية تصريف إضافية.",
      explanation_wrong: "\"langem\"/\"langer\" صيغتان مصرَّفتان (حالة جر) لا تناسبان هذا التعبير الظرفي الثابت بلا أداة تعريف.",
      grammar_example: "Wir kennen uns schon lange Zeit.",
    },
    "25": {
      keyword: "man (verallgemeinernd, Konjunktiv II)",
      item_type: "pronoun",
      evidence_text: "ohne meine Sprachkenntnisse und meine Auslandserfahrung hätte **man** die Stelle sicher nicht bekommen.",
      answer_translation: "المرء/الإنسان",
      explanation_correct: "نحوياً \"ich\" ممكن أيضاً، لكن \"man\" هنا يعمّم الملاحظة (\"لا يحصل المرء على هذه الوظيفة دون...\") بدل الحديث المباشر عن الذات فقط -- وهذا هو الأسلوب المقصود في السياق.",
      explanation_wrong: "\"er\" ضمير غائب مذكر لا يوجد له مرجع في النص، و\"ich\" -- رغم صحتها نحوياً -- تجعل الجملة تصريحاً شخصياً مباشراً بدل الملاحظة العامة المقصودة هنا.",
      grammar_example: "Ohne gute Vorbereitung hätte man diese Prüfung kaum bestanden.",
    },
    "26": {
      keyword: "damit (Zweck, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Aber ein bisschen Glück braucht man auch, **damit** so etwas gelingt.",
      answer_translation: "لكي",
      explanation_correct: "الفعل في نهاية الجملة (gelingt) يدل على جملة ثانوية، و\"damit\" تصوغ الغرض (\"من أجل أن ينجح ذلك\").",
      explanation_wrong: "\"als\" أداة زمنية/مقارنة لا تصوغ غرضاً، و\"ob\" أداة سؤال غير مباشر (هل) لا تناسب جملة تفيد الهدف هنا.",
      grammar_example: "Ich lerne jeden Tag, damit ich die Prüfung bestehe.",
    },
    "27": {
      keyword: "bitten um (feste Verb-Präposition)",
      item_type: "verb_prep",
      evidence_text: "Nun bitte ich dich **um** ein paar gute Tipps.",
      answer_translation: "أطلب منك (نصائح)",
      explanation_correct: "الفعل \"bitten\" يرتبط ثابتاً بحرف الجر \"um\": \"jemanden um etwas bitten\" (يطلب من شخص شيئاً).",
      explanation_wrong: "\"über\" ترتبط بأفعال أخرى (sprechen über)، و\"vor\" لا تناسب \"bitten\" إطلاقاً في هذا التركيب.",
      grammar_example: "Er bittet seine Kollegin um einen Rat.",
    },
    "28": {
      keyword: "von dem (Relativpronomen, Dativ maskulin)",
      item_type: "pronoun",
      evidence_text: "Vielleicht kennst du auch jemanden, von **dem** ich Informationen... bekommen kann?",
      answer_translation: "منه (الذي)",
      explanation_correct: "حرف الجر \"von\" يحكم حالة الجر (Dativ)؛ الضمير الموصول يعود إلى \"jemanden\" (مذكر مفرد)، فتصبح صيغة حالة الجر المذكرة: dem.",
      explanation_wrong: "\"den\" حالة نصب و\"denen\" صيغة جمع -- لا تناسبان مرجعاً مفرداً مذكراً بعد حرف جر يحكم حالة الجر.",
      grammar_example: "Das ist der Kollege, von dem ich dir erzählt habe.",
    },
    "29": {
      keyword: "würde ... treffen (Konjunktiv II, würde+Infinitiv)",
      item_type: "tense",
      evidence_text: "Ich würde dich am liebsten kurz **treffen**, um mit dir persönlich zu sprechen.",
      answer_translation: "أن ألتقي",
      explanation_correct: "\"würde\" الفعل المساعد موجود سلفاً، فتركيب الحال الافتراضي المهذب (würde + Infinitiv) يستوجب صيغة المصدر: treffen.",
      explanation_wrong: "\"treffe\" صيغة مضارع لا تتوافق مع \"würde\"، و\"getroffen\" صيغة الفاعل الثاني تناسب الماضي التام لا هذا التركيب.",
      grammar_example: "Ich würde dich gern morgen besuchen.",
    },
    "30": {
      keyword: "in zwei Wochen (zukünftiger Zeitpunkt)",
      item_type: "preposition",
      evidence_text: "Geht das vielleicht **in** zwei Wochen, z.B. am übernächsten Wochenende?",
      answer_translation: "خلال/بعد",
      explanation_correct: "\"in\" + مدة زمنية يصف نقطة مستقبلية (\"بعد مرور أسبوعين من الآن\") -- تركيب زمني شائع للتخطيط المستقبلي.",
      explanation_wrong: "\"bis\" تعني موعداً نهائياً لانتهاء شيء (حتى)، لا نقطة زمنية مستقبلية محددة، و\"an\" لا تُستخدم مع مدة زمنية بهذا الشكل.",
      grammar_example: "Der Bericht muss in drei Tagen fertig sein.",
    },
  },
  translation: {
    text: "عزيزتي دومينيك،\n\nبما أنني لا أستطيع الوصول إليك هاتفياً ولا عبر البريد الإلكتروني، أكتب لك رسالة. لقد حدث شيء استثنائي حقاً: تخيلي، لقد حصلت على الوظيفة لدى الاتحاد الأوروبي في بروكسل!\n\nتذكرين: كان هناك نحو 300 متقدم، ومن بينهم تم اختيار الأفضل. كنت قد استعددت لمقابلة العمل منذ فترة طويلة مسبقاً. ومع ذلك - لولا معرفتي باللغات وخبرتي في الخارج لما حصل المرء على هذه الوظيفة بالتأكيد. لكن الأمر يحتاج أيضاً إلى قليل من الحظ لكي ينجح شيء كهذا.\n\nالآن أطلب منك بعض النصائح الجيدة. ربما تعرفين أيضاً شخصاً يمكنني الحصول منه على معلومات عن الحياة في بلجيكا؟ أفضّل أن ألتقي بك قريباً لأتحدث معك شخصياً. هل يمكن ذلك خلال أسبوعين، مثلاً في نهاية الأسبوع القادمة بعد القادمة؟ رجاءً أخبريني برأيك.\n\nمع أطيب التحيات\nكايتي",
  },
};

const FRAU_THOMA = {
  items: {
    "21": {
      keyword: "schade, dass (Adjektiv + dass-Satz)",
      item_type: "conjunction",
      evidence_text: "schade, **dass** Sie bisher noch nicht Kunde bei Kaffee Partner sind.",
      answer_translation: "أنّ (يؤسفنا أنّ)",
      explanation_correct: "الفعل في نهاية الجملة (sind) يدل على جملة ثانوية بعد صفة تقييمية؛ \"schade, dass...\" (نفس نمط \"Mit freundlichen Grüßen\" في رسائل أخرى) هو التركيب الصحيح.",
      explanation_wrong: "\"darum\" ظرف نتيجة (لذلك) يستوجب ترتيب الفعل الطبيعي (Sie sind...) لا ترتيب النهاية الموجود فعلياً في النص، فهو مستحيل نحوياً هنا؛ و\"weil\" تصوغ سبباً منفصلاً، لا وصفاً لما هو مؤسف بالضبط.",
      grammar_example: "Schade, dass Sie unseren Termin nicht wahrnehmen konnten.",
    },
    "22": {
      keyword: "sind (Sie, formell)",
      item_type: "verb",
      evidence_text: "schade, dass Sie bisher noch nicht Kunde bei Kaffee Partner **sind**.",
      answer_translation: "أنتم (تكونون)",
      explanation_correct: "الفاعل \"Sie\" (صيغة المخاطب الرسمية) يستدعي تصريف \"sein\" بصيغة الجمع/الرسمية: sind.",
      explanation_wrong: "\"seid\" تصريف صيغة الجمع غير الرسمية (ihr)، و\"sein\" صيغة المصدر -- لا تناسبان \"Sie\" الرسمية هنا.",
      grammar_example: "Sie sind herzlich willkommen bei uns.",
    },
    "23": {
      keyword: "Ihnen (Dativ, formell)",
      item_type: "pronoun",
      evidence_text: "weil wir **Ihnen** nicht das richtige Angebot gemacht haben",
      answer_translation: "لكم",
      explanation_correct: "\"jemandem ein Angebot machen\" يستدعي مفعولاً به غير مباشر بحالة الجر؛ صيغة المخاطب الرسمية بحالة الجر: Ihnen.",
      explanation_wrong: "\"Sie\" حالة رفع/نصب لا جر، و\"euch\" صيغة الجمع غير الرسمية -- لا تناسبان المخاطب الرسمي \"Sie\" بحالة الجر.",
      grammar_example: "Wir haben Ihnen bereits eine E-Mail geschickt.",
    },
    "24": {
      keyword: "kennengelernt (Perfekt, trennbares Verb)",
      item_type: "tense",
      evidence_text: "seit wir uns... auf der ANUGA... **kennen gelernt** haben.",
      answer_translation: "تعرّفنا",
      explanation_correct: "\"haben\" موجود في نهاية الجملة، فالفجوة تحتاج صيغة الفاعل الثاني للفعل المنفصل \"kennenlernen\": kennengelernt.",
      explanation_wrong: "\"kennen lernen\" صيغة مصدر، و\"kennen lernte\" مزيج خاطئ (ماضٍ بسيط لا يُستخدم مع \"haben\") -- لا تصلحان لتركيب الماضي التام.",
      grammar_example: "Wir haben uns letztes Jahr auf einer Konferenz kennengelernt.",
    },
    "25": {
      keyword: "möchten (höfliche Absicht)",
      item_type: "verb",
      evidence_text: "Wir **möchten** das jetzt mit dem aktuellen Katalog nachholen",
      answer_translation: "نودّ",
      explanation_correct: "الفعل الوجهي \"möchten\" يعبّر عن نية مهذبة في الحاضر (\"نودّ أن نتدارك ذلك الآن\")، ويسبق مصدراً (nachholen).",
      explanation_wrong: "\"mochten\" صيغة ماضٍ بسيط (كنّا نحب/أعجبنا) -- زمن ومعنى خاطئان، و\"mögen\" صيغة مضارع مباشرة (نحب) أخفّ حدة وغير مناسبة لصياغة نية مهذبة.",
      grammar_example: "Wir möchten Ihnen unser neues Angebot vorstellen.",
    },
    "26": {
      keyword: "finden (Sie, Präsens)",
      item_type: "verb",
      evidence_text: "Sie **finden** darin viele nützliche und attraktive Dinge",
      answer_translation: "تجدون",
      explanation_correct: "الفاعل \"Sie\" الرسمي يستدعي تصريف المضارع بصيغة الجمع/الرسمية: finden.",
      explanation_wrong: "\"fanden\" صيغة ماضٍ بسيط (وجدتم)، و\"findet\" تصريف الغائب المفرد أو مخاطب غير رسمي -- لا يناسبان \"Sie\" في المضارع.",
      grammar_example: "Sie finden alle Details auf unserer Webseite.",
    },
    "27": {
      keyword: "für Mitarbeiter und Besucher (Akkusativ)",
      item_type: "preposition",
      evidence_text: "rund um das Thema Kaffee und Trinkwasser **für** Mitarbeiter und Besucher.",
      answer_translation: "من أجل/لـ",
      explanation_correct: "\"für\" (من أجل) يحكم حالة النصب، والجمع \"Mitarbeiter\" بلا نهاية إضافية يطابق حالة النصب تماماً؛ المعنى: أشياء مخصصة للموظفين والزوار.",
      explanation_wrong: "\"von\" يحكم حالة الجر، وحالة الجر للجمع تستوجب نهاية \"-n\" (von Mitarbeitern) غير الموجودة في النص، فهو مستحيل نحوياً هنا؛ و\"wegen\" (بسبب) لا يناسب المعنى (لا علاقة سببية).",
      grammar_example: "Der Pausenraum ist nur für Mitarbeiter gedacht.",
    },
    "28": {
      keyword: "zeigt (Subjekt nach dem Verb)",
      item_type: "verb",
      evidence_text: "kleine Leckereien und nette Kalender für Büro und Zuhause **zeigt** Ihnen unser Geschenkkatalog.",
      answer_translation: "يعرض",
      explanation_correct: "الفاعل الحقيقي \"unser Geschenkkatalog\" (مفرد) يأتي بعد الفعل هنا لأن قائمة الأشياء استُخدمت في بداية الجملة؛ الفعل يطابق هذا الفاعل المفرد: zeigt.",
      explanation_wrong: "\"zeigen\" تصريف جمع لا يطابق الفاعل المفرد \"Geschenkkatalog\"، و\"gezeigt\" صيغة فاعل ثانٍ تحتاج فعلاً مساعداً غير موجود هنا.",
      grammar_example: "Interessante Rabatte zeigt Ihnen unser neuer Prospekt.",
    },
    "29": {
      keyword: "sich freuen auf (wir → uns)",
      item_type: "pronoun",
      evidence_text: "Wir freuen **uns** auf Sie!",
      answer_translation: "أنفسنا (نتطلع)",
      explanation_correct: "الفعل الانعكاسي \"sich freuen auf\" (يتطلع إلى) يطابق ضميره الانعكاسي مع الفاعل \"wir\": uns.",
      explanation_wrong: "\"mich\" يطابق فاعلاً بصيغة المتكلم المفرد (ich)، و\"sich\" يطابق فاعلاً بصيغة الغائب -- لا يناسبان \"wir\".",
      grammar_example: "Wir freuen uns schon auf das Wochenende.",
    },
    "30": {
      keyword: "Freundliche Grüße (Grußformel ohne \"Mit\")",
      item_type: "fixed_expression",
      evidence_text: "**Freundliche** Grüße aus Wallenhorst",
      answer_translation: "أطيب (التحيات)",
      explanation_correct: "دون \"Mit\" في البداية تصبح صيغة ختام الرسالة \"Freundliche Grüße\" (بدون حالة جر)، فتأخذ الصفة نهاية حالة الرفع الجمعية: -e.",
      explanation_wrong: "\"Freundlichen\" (نهاية -en) صحيحة فقط بعد \"Mit\" (التي تفرض حالة الجر)، و\"Freundlich\" بلا تصريف لا تناسب الاسم الجمع \"Grüße\" إطلاقاً.",
      grammar_example: "Freundliche Grüße und einen schönen Tag noch!",
    },
  },
  translation: {
    text: "استمتاع مع Kaffee Partner\n\nالسيدة توما المحترمة،\n\nيؤسفنا أنكم لستم بعد عميلاً لدى Kaffee Partner. ربما يعود ذلك إلينا، لأننا لم نقدم لكم العرض المناسب منذ أن تعرّفنا قبل فترة في كولن في معرض ANUGA، المعرض الكبير للأغذية والمواد الغذائية الفاخرة. نودّ الآن تدارك ذلك بالكتالوج الحالي الذي تستلمونه اليوم.\n\nستجدون فيه أشياء كثيرة مفيدة وجذابة حول موضوع القهوة ومياه الشرب مخصصة للموظفين والزوار. كما يعرض لكم كتالوج الهدايا لدينا الشاي وحلويات صغيرة وتقاويم لطيفة للمكتب والمنزل.\n\nنتمنى لكم وقتاً ممتعاً في التصفح والاختيار. نتطلع لرؤيتكم!\n\nأطيب التحيات من فالنهورست\nفريق Kaffee Partner\nمانفريد بفلوغر",
  },
};

const HERR_MEYERHOFER = {
  items: {
    "21": {
      keyword: "Ihrem Haus (Dativ nach in, statisch)",
      item_type: "pronoun",
      evidence_text: "miete ich nun schon seit drei Jahren eine Wohnung in **Ihrem** Haus.",
      answer_translation: "مبناكم",
      explanation_correct: "\"in\" لوصف موقع ثابت (لا حركة) يحكم حالة الجر؛ \"Haus\" محايد، فيصبح الضمير الملكي: Ihrem.",
      explanation_wrong: "\"Ihr\" حالة رفع/نصب محايدة، و\"Ihren\" حالة نصب مذكرة -- لا تناسبان حالة الجر المحايدة المطلوبة بعد \"in\" الساكنة.",
      grammar_example: "Ich habe lange in Ihrem Geschäft nach dem Buch gesucht.",
    },
    "22": {
      keyword: "war (Präteritum, Tatsache)",
      item_type: "tense",
      evidence_text: "Ich **war** die ganze Zeit sehr zufrieden, denn im Haus war es immer ruhig, sauber und sicher.",
      answer_translation: "كنتُ",
      explanation_correct: "سرد واقعي لحالة مستمرة في الماضي يستدعي الماضي البسيط (Präteritum): war.",
      explanation_wrong: "\"wäre\" و\"würde\" صيغتا حال افتراضي (Konjunktiv II) تناسبان أموراً غير واقعية، لا سرد حقيقة ماضية بسيطة كهذه.",
      grammar_example: "Ich war lange Zeit sehr glücklich mit dieser Wohnung.",
    },
    "23": {
      keyword: "hat sich verschlechtert (Perfekt, reflexiv)",
      item_type: "tense",
      evidence_text: "In der Zwischenzeit **hat** sich die Wohnqualität... deutlich verschlechtert.",
      answer_translation: "تدهورت",
      explanation_correct: "الأفعال الانعكاسية مثل \"sich verschlechtern\" تُصرَّف دائماً في الماضي التام مع \"haben\"، حتى لو كان الفعل غير الانعكاسي يوحي بتغيّر حالة.",
      explanation_wrong: "\"ist\" تُستخدم مع أفعال حركة/تغيّر حالة غير انعكاسية، و\"wurde\" تشير لصيغة المبني للمجهول -- لا تناسب هذا الفعل الانعكاسي.",
      grammar_example: "Die Lage hat sich in den letzten Monaten deutlich verschlechtert.",
    },
    "24": {
      keyword: "Bis spät abends (feste Zeitangabe)",
      item_type: "preposition",
      evidence_text: "**Bis** spät abends höre ich nun täglich den Lärm der Restaurantgäste im Garten",
      answer_translation: "حتى",
      explanation_correct: "\"bis\" + ظرف زمني (spät abends) يعني \"حتى وقت متأخر من الليل\" -- تعبير زمني ثابت شائع.",
      explanation_wrong: "\"Nach\" (بعد) تعكس الاتجاه الزمني المقصود، و\"Von\" تحتاج نقطة بداية محددة مع \"bis\" لاحقة -- لا تصلح بمفردها هنا.",
      grammar_example: "Bis spät abends waren noch Leute im Büro.",
    },
    "25": {
      keyword: "den Lärm (Akkusativ, hören)",
      item_type: "noun",
      evidence_text: "höre ich nun täglich **den** Lärm der Restaurantgäste im Garten",
      answer_translation: "الضجيج",
      explanation_correct: "الفعل \"hören\" يستدعي مفعولاً به مباشراً بحالة النصب؛ \"Lärm\" مذكر، فأداة التعريف بحالة النصب: den.",
      explanation_wrong: "\"dem\" أداة تعريف حالة الجر، و\"der\" أداة تعريف حالة الرفع المذكرة -- لا تناسبان المفعول به المباشر بحالة النصب.",
      grammar_example: "Ich höre jeden Morgen den Lärm der Baustelle nebenan.",
    },
    "26": {
      keyword: "die (Relativpronomen, Nominativ Plural)",
      item_type: "pronoun",
      evidence_text: "die Parkplätze vor dem Haus, **die** eigentlich für die Mieter reserviert sind, sind immer besetzt",
      answer_translation: "التي",
      explanation_correct: "الضمير الموصول يعود إلى \"die Parkplätze\" (جمع) ويكون فاعل جملته الخاصة (sind reserviert)، فيأخذ صيغة حالة الرفع الجمعية: die.",
      explanation_wrong: "\"denen\" حالة جر جمع، و\"diese\" ضمير إشارة لا ضمير وصل -- لا تناسبان دور الفاعل في هذه الجملة الموصولة.",
      grammar_example: "Die Plätze, die für Gäste reserviert sind, waren alle belegt.",
    },
    "27": {
      keyword: "im Haus (in+dem, statisch)",
      item_type: "preposition",
      evidence_text: "fühle ich mich **im** Haus nicht mehr sicher",
      answer_translation: "في (المبنى)",
      explanation_correct: "\"in\" + \"dem\" تُدمجان إلزامياً في \"im\" لوصف موقع ثابت (الشعور بالأمان داخل المبنى).",
      explanation_wrong: "\"in\" بدون إدماج مع \"dem\" غير صحيحة نحوياً هنا (يجب الدمج الإلزامي)، و\"ins\" (in+das) تدل على حركة نحو موقع محايد -- لا تناسب المعنى الساكن هنا.",
      grammar_example: "Ich fühle mich im neuen Büro sehr wohl.",
    },
    "28": {
      keyword: "geöffnet hat (Perfekt = \"ist offen\")",
      item_type: "tense",
      evidence_text: "weil das Restaurant oft die ganze Nacht **geöffnet** hat.",
      answer_translation: "مفتوح (ظلّ)",
      explanation_correct: "\"hat\" الفعل المساعد موجود سلفاً؛ \"geöffnet haben\" هو التعبير الألماني القياسي لوصف \"يكون مفتوحاً\" (ساعات العمل)، فالفجوة تحتاج صيغة الفاعل الثاني: geöffnet.",
      explanation_wrong: "\"öffnet\" مضارع و\"öffnen\" مصدر -- لا يتوافقان مع الفعل المساعد \"hat\" في هذا التركيب.",
      grammar_example: "Der Supermarkt hat sonntags leider nicht geöffnet.",
    },
    "29": {
      keyword: "Probleme (Akkusativ Plural nach diese)",
      item_type: "noun",
      evidence_text: "Ich möchte Sie dringend bitten, sich um diese **Probleme** zu kümmern",
      answer_translation: "المشاكل",
      explanation_correct: "\"sich kümmern um\" يحكم حالة النصب؛ \"diese\" هنا صيغة جمع، فيجب أن يكون الاسم أيضاً جمعاً بحالة النصب: Probleme.",
      explanation_wrong: "\"Problem\" صيغة مفرد لا تتفق مع \"diese\" الجمعية، و\"Problemen\" صيغة حالة الجر الجمعية -- لكن الفعل هنا يستوجب حالة النصب لا الجر.",
      grammar_example: "Der Techniker kümmert sich sofort um diese Probleme.",
    },
    "30": {
      keyword: "man (diplomatische Verallgemeinerung)",
      item_type: "pronoun",
      evidence_text: "Vielleicht könnte **man** gemeinsam eine Lösung finden.",
      answer_translation: "المرء/يمكن أن",
      explanation_correct: "\"man\" هنا صياغة دبلوماسية عامة (\"ربما يمكن إيجاد حل معاً\") -- أسلوب مهذب شائع في رسائل الشكوى بدل افتراض تعاون الطرف الآخر مباشرة.",
      explanation_wrong: "\"wir\" -- رغم صحتها نحوياً -- تفترض التزام الطرفين مسبقاً بشكل مباشر، و\"er\" ضمير غائب مذكر لا مرجع له في النص.",
      grammar_example: "Vielleicht könnte man in dieser Sache noch einmal miteinander sprechen.",
    },
  },
  translation: {
    text: "السيد ماير هوفر المحترم،\n\nكما تعلمون، أستأجر منذ ثلاث سنوات شقة في مبناكم. كنت طوال الوقت راضية جداً، لأن المبنى كان دائماً هادئاً ونظيفاً وآمناً. لكن في هذه الأثناء تدهورت جودة السكن بشكل واضح بسبب افتتاح المطعم في الطابق الأرضي. أسمع الآن يومياً حتى وقت متأخر من الليل ضجيج زبائن المطعم في الحديقة، وحاويات القمامة في الفناء ممتلئة دائماً، ومواقف السيارات أمام المبنى، المخصصة أصلاً للمستأجرين، مشغولة دائماً، وبيت الدرج متسخ باستمرار. كما أنني لم أعد أشعر بالأمان في المبنى، لأن المطعم غالباً ما يبقى مفتوحاً طوال الليل. أرجو منكم بشدة الاهتمام بهذه المشاكل والتحدث مع أصحاب المطعم. ربما يمكننا معاً إيجاد حل.\n\nمع أطيب التحيات\n\nأنليزه كونه",
  },
};

async function setLearningAids(title, aids) {
  const rows = await q(`select id from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  console.log(`${title}: writing ${Object.keys(aids.items).length} gaps`);
  if (APPLY) {
    const b64 = Buffer.from(JSON.stringify(aids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${rows[0].id}';`);
  }
}

async function fixFrauThomaAnswerKey() {
  const rows = await q(`select g.id, g.gap_number from sb_t1_gaps g join sb_exercises e on e.id = g.exercise_id where e.title = 'Frau Thoma' and e.teil = 1 and g.gap_number in (21, 27) order by g.gap_number;`);
  const fixes = { 21: "a", 27: "a" };
  for (const row of rows) {
    console.log(`Frau Thoma gap ${row.gap_number} answer key -> ${fixes[row.gap_number]}`);
    if (APPLY) await q(`update sb_t1_gaps set correct = '${fixes[row.gap_number]}' where id = '${row.id}';`);
  }
}

async function main() {
  await fixFrauThomaAnswerKey();
  await setLearningAids("Dominique", DOMINIQUE);
  await setLearningAids("Frau Thoma", FRAU_THOMA);
  await setLearningAids("Herr Meyerhofer", HERR_MEYERHOFER);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

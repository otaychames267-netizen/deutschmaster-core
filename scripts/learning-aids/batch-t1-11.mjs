/**
 * Batch T1 #11: "Jelena", "Maria" (x2 distinct letters sharing a title),
 * "Meyerhofer 2". All had learning_aids = null.
 *
 * "Meyerhofer 2" is byte-identical (passage + every gap option + answer
 * key) to "Herr Meyerhofer" from batch 10 -- a genuine duplicate exercise
 * row, not just a similarly-named one. Reused that exact content rather
 * than re-deriving it.
 *
 * "Maria" (teil 1) has two DIFFERENT rows with the same title -- a Cem
 * letter about a weekend trip, and an Alexandra letter about visiting
 * Berlin. These are handled by exercise id, not by title lookup, since
 * title alone is ambiguous here.
 *
 * Usage: node scripts/learning-aids/batch-t1-11.mjs [--apply]
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

const JELENA = {
  items: {
    "21": {
      keyword: "den (Relativpronomen, Akkusativ maskulin)",
      item_type: "pronoun",
      evidence_text: "ich hab dir doch schon vom Deutschkurs erzählt, **den** ich hier besuche.",
      answer_translation: "الذي (أحضره)",
      explanation_correct: "\"besuchen\" يستدعي مفعولاً به بحالة النصب؛ الضمير الموصول يعود إلى \"Deutschkurs\" (مذكر)، فحالة النصب المذكرة: den.",
      explanation_wrong: "\"das\" صيغة محايدة و\"der\" صيغة حالة الرفع المذكرة -- لا تناسبان المفعول به المباشر المذكر بحالة النصب.",
      grammar_example: "Das ist der Kurs, den ich seit September besuche.",
    },
    "22": {
      keyword: "zum Thema (zu+dem, feste Wendung)",
      item_type: "preposition",
      evidence_text: "Wir müssen Informationen **zum** Thema Gesundheit und Ernährung suchen",
      answer_translation: "حول (الموضوع)",
      explanation_correct: "\"zu\" + \"dem\" تُدمجان إلزامياً في \"zum\"؛ \"zum Thema X\" تعبير ثابت شائع بمعنى \"حول موضوع كذا\".",
      explanation_wrong: "\"zu\" بلا إدماج مع أداة التعريف غير صحيحة هنا (الإدماج إلزامي)، و\"zur\" (zu+der) تناسب اسماً مؤنثاً لا \"Thema\" المحايد.",
      grammar_example: "Es gibt viele Informationen zum Thema Klimawandel.",
    },
    "23": {
      keyword: "im Internet (in+dem, feste Wendung)",
      item_type: "preposition",
      evidence_text: "was es dazu Interessantes **im** Internet gibt.",
      answer_translation: "على (الإنترنت)",
      explanation_correct: "\"in\" + \"dem\" تُدمجان إلزامياً في \"im\"؛ \"im Internet\" هي الصياغة الثابتة الوحيدة الصحيحة.",
      explanation_wrong: "\"am\" (an+dem) تُستخدم مع أسطح/مناسبات أخرى لا \"Internet\"، و\"mit\" لا تناسب المعنى (لا مصاحبة هنا بل موقعاً).",
      grammar_example: "Ich habe die Information im Internet gefunden.",
    },
    "24": {
      keyword: "konnte (Präteritum, ich)",
      item_type: "tense",
      evidence_text: "Die interessanteste Internetseite, die ich finden **konnte**, ist www.gesund.ch.",
      answer_translation: "استطعتُ",
      explanation_correct: "سرد حدث ماضٍ مكتمل (ما استطعت العثور عليه) يستدعي الفعل الوجهي بصيغة الماضي البسيط مع \"ich\": konnte.",
      explanation_wrong: "\"können\" مضارع و\"könnten\" حال افتراضي -- لا يناسبان سرد ما تم فعلاً إيجاده في الماضي.",
      grammar_example: "Das beste Rezept, das ich finden konnte, war ganz einfach.",
    },
    "25": {
      keyword: "junge Leute (Plural, unbestimmt)",
      item_type: "adjective_adverb",
      evidence_text: "Diese Seite ist für **junge** Leute gemacht",
      answer_translation: "شباب",
      explanation_correct: "\"für\" يحكم حالة النصب؛ \"Leute\" جمع بلا أداة تعريف، فتأخذ الصفة نهاية التصريف القوي للجمع: -e.",
      explanation_wrong: "\"jungen\" نهاية حالة الجر أو النصب المفرد المذكر، و\"junges\" نهاية محايدة مفردة -- لا تناسبان الاسم الجمع \"Leute\" هنا.",
      grammar_example: "Dieses Angebot ist speziell für junge Familien gedacht.",
    },
    "26": {
      keyword: "welche (Nominativ Plural, indirekte Frage)",
      item_type: "pronoun",
      evidence_text: "Fachleute beschreiben hier genau, **welche** Lebensmittel für unseren Körper wichtig und gesund sind",
      answer_translation: "أيّ (أطعمة)",
      explanation_correct: "\"Lebensmittel\" (جمع) فاعل الفعل \"sind\"؛ أداة الاستفهام \"welche\" بحالة الرفع الجمعية تطابق هذا الفاعل.",
      explanation_wrong: "\"welchen\" حالة جر/نصب، و\"welcher\" حالة رفع مؤنثة أو جر مذكرة -- لا تناسبان الفاعل الجمعي \"Lebensmittel\".",
      grammar_example: "Es ist wichtig zu wissen, welche Vitamine der Körper braucht.",
    },
    "27": {
      keyword: "sich (reflexiv, man)",
      item_type: "pronoun",
      evidence_text: "kann man **sich** seinen persönlichen Speiseplan selbst erstellen",
      answer_translation: "لنفسه",
      explanation_correct: "الفعل الانعكاسي \"sich etwas erstellen\" يطابق ضميره مع الفاعل \"man\" (صيغة الغائب العامة): sich.",
      explanation_wrong: "\"mir\" يطابق فاعلاً بصيغة المتكلم (ich)، و\"dir\" يطابق فاعلاً بصيغة المخاطب (du) -- لا يناسبان \"man\".",
      grammar_example: "Auf dieser Seite kann man sich ein eigenes Profil erstellen.",
    },
    "28": {
      keyword: "finden (Infinitiv nach kann)",
      item_type: "verb",
      evidence_text: "und dafür passende Rezepte **finden**.",
      answer_translation: "أن يجد",
      explanation_correct: "الفعل الوجهي \"kann\" (من الجملة السابقة) يحكم مصدرين متتاليين مرتبطين بـ\"und\": erstellen und finden.",
      explanation_wrong: "\"fand\" ماضٍ بسيط و\"gefunden\" صيغة الفاعل الثاني -- لا يتوافقان مع الفعل الوجهي \"kann\" الذي يستوجب مصدراً مجرداً.",
      grammar_example: "Man kann sich hier registrieren und passende Angebote finden.",
    },
    "29": {
      keyword: "die (Relativpronomen, Nominativ Plural)",
      item_type: "pronoun",
      evidence_text: "Für Menschen, **die** ein paar Kilos zu viel haben, gibt es auch Tipps zum Abnehmen",
      answer_translation: "الذين",
      explanation_correct: "الضمير الموصول يعود إلى \"Menschen\" (جمع) ويكون فاعل جملته الخاصة (haben)، فيأخذ صيغة حالة الرفع الجمعية: die.",
      explanation_wrong: "\"denen\" حالة جر و\"deren\" ضمير ملكية موصول -- لا يناسبان دور الفاعل البسيط هنا.",
      grammar_example: "Für Menschen, die wenig Zeit haben, gibt es auch kurze Rezepte.",
    },
    "30": {
      keyword: "Schreibe (Imperativ, du)",
      item_type: "verb",
      evidence_text: "**Schreibe** mir doch möglichst bald zurück!",
      answer_translation: "اكتبي",
      explanation_correct: "الرسالة بأكملها موجهة بصيغة \"du\" غير الرسمية (dir/dich)؛ صيغة الأمر المفرد غير الرسمي: Schreib(e).",
      explanation_wrong: "\"Schreiben\" صيغة أمر رسمية (Sie) لا تناسب هذه الرسالة الودية، و\"Schreibt\" صيغة أمر لمخاطبين أو أكثر (ihr) -- المخاطبة هنا شخص واحد.",
      grammar_example: "Schreib mir bitte, sobald du Zeit hast!",
    },
  },
  translation: {
    text: "عزيزتي يلينا،\n\nكنت قد أخبرتك بالفعل عن دورة اللغة الألمانية التي أحضرها هنا. إنها جيدة حقاً. حصلنا الآن على مهمة جديدة. علينا البحث عن معلومات حول موضوع الصحة والتغذية ومعرفة ما هو مثير للاهتمام حول ذلك على الإنترنت. أكثر موقع إلكتروني مثير للاهتمام استطعت إيجاده هو www.gesund.ch. هذا الموقع مُعدّ للشباب الراغبين في معرفة المزيد عن التغذية الصحية. يشرح الخبراء هنا بدقة أي الأطعمة مهمة وصحية لأجسامنا وكم مرة وكمية يجب على المرء تناولها يومياً. بالإضافة إلى ذلك، يمكن للمرء إعداد خطة وجبات شخصية بنفسه وإيجاد وصفات مناسبة لها. بالنسبة للأشخاص الذين لديهم بضعة كيلوغرامات زائدة، توجد أيضاً نصائح لإنقاص الوزن وروابط لمراكز لياقة بدنية مختلفة في سويسرا.\n\nوما الجديد عندك؟ اكتبي لي رداً في أقرب وقت ممكن!\n\nإلى اللقاء ومع تحياتي\nباولا",
  },
};

const MARIA_CEM = {
  items: {
    "21": {
      keyword: "noch rasch (bevor der Alltag beginnt)",
      item_type: "adjective_adverb",
      evidence_text: "bevor wieder der Arbeitsalltag beginnt, schicke ich dir **noch** rasch einige Zeilen",
      answer_translation: "بعد (بسرعة)",
      explanation_correct: "\"noch rasch\" يعني \"بسرعة قبل فوات الأوان\" -- ملائم لسياق \"قبل أن يبدأ العمل من جديد\".",
      explanation_wrong: "\"momentan\" (حالياً) لا يحمل معنى \"قبل فوات الوقت\"، و\"weiterhin\" (باستمرار) يصف فعلاً مستمراً لا لحظة عابرة قبل الروتين.",
      grammar_example: "Bevor der Film beginnt, hole ich noch rasch Popcorn.",
    },
    "22": {
      keyword: "wegen + Genitiv",
      item_type: "preposition",
      evidence_text: "dass du **wegen** deiner Grippe nicht dabei sein konntest!",
      answer_translation: "بسبب",
      explanation_correct: "\"wegen\" حرف جر سببي يحكم حالة الملكية (Genitiv): wegen deiner Grippe.",
      explanation_wrong: "\"weil\" أداة ربط سببية تحتاج جملة كاملة لا اسماً مباشرة، و\"deswegen\" ظرف نتيجة يقف بمفرده -- لا يسبق اسماً.",
      grammar_example: "Wegen des schlechten Wetters sind wir zu Hause geblieben.",
    },
    "23": {
      keyword: "bis auf (feste Wendung: außer)",
      item_type: "fixed_expression",
      evidence_text: "**Bis** auf Mirko sind alle mit dem Zug angereist",
      answer_translation: "باستثناء",
      explanation_correct: "\"bis auf\" تعبير ثابت بمعنى \"باستثناء/عدا\"، يقترن دائماً بـ\"auf\" تحديداً.",
      explanation_wrong: "\"außer\" تعمل بمفردها دون \"auf\"، و\"abgesehen\" تحتاج \"von\" لا \"auf\" (abgesehen von) -- كلاهما لا يقترن بـ\"auf\" هنا.",
      grammar_example: "Bis auf eine Kleinigkeit war alles perfekt organisiert.",
    },
    "24": {
      keyword: "hatten (Plusquamperfekt nach nachdem)",
      item_type: "tense",
      evidence_text: "Nachdem wir unser Gepäck abgestellt **hatten**, haben wir gleich einen Rundgang... gemacht.",
      answer_translation: "كنا قد (وضعنا)",
      explanation_correct: "\"nachdem\" يصف حدثاً سابقاً لحدث آخر في الماضي؛ القاعدة: الحدث الأسبق بصيغة الماضي الأبعد (Plusquamperfekt: hatten + Partizip II)، والحدث اللاحق بصيغة الماضي التام (haben gemacht).",
      explanation_wrong: "\"haben\" تصوغ ماضياً تاماً عادياً لا يميّز الأسبقية الزمنية المطلوبة بعد \"nachdem\"، و\"hätten\" صيغة حال افتراضي لا سرد واقعي.",
      grammar_example: "Nachdem sie gegessen hatten, sind sie spazieren gegangen.",
    },
    "25": {
      keyword: "sich erweisen als (feste Verb-Präposition)",
      item_type: "verb_prep",
      evidence_text: "und hat sich **als** ausgezeichnete Fremdenführerin erwiesen.",
      answer_translation: "بصفتها/كـ",
      explanation_correct: "الفعل \"sich erweisen\" يرتبط ثابتاً بـ\"als\" (بمعنى \"تثبت أنها كذا\"): sich als X erweisen.",
      explanation_wrong: "\"für\" و\"zur\" لا تقترنان بهذا الفعل الانعكاسي -- \"erweisen\" لا يستخدم مع أي منهما بهذا المعنى.",
      grammar_example: "Der neue Kollege hat sich als sehr hilfsbereit erwiesen.",
    },
    "26": {
      keyword: "auf dem Programm stehen",
      item_type: "fixed_expression",
      evidence_text: "Am Abend stand dann die Felsenbühne **auf** dem Programm.",
      answer_translation: "على (البرنامج)",
      explanation_correct: "\"auf dem Programm stehen\" تعبير ثابت بمعنى \"مدرج في البرنامج/على جدول الأعمال\".",
      explanation_wrong: "\"in\" و\"zu\" لا تقترنان بهذا التعبير الثابت -- \"stehen\" بهذا المعنى يقترن حصراً بـ\"auf\".",
      grammar_example: "Morgen steht ein Ausflug auf dem Programm.",
    },
    "27": {
      keyword: "ganz schön (umgangssprachliche Verstärkung)",
      item_type: "fixed_expression",
      evidence_text: "Die Wanderung am nächsten Tag war **ganz** schön anstrengend, aber wunderbar.",
      answer_translation: "إلى حد كبير",
      explanation_correct: "\"ganz schön\" + صفة تعبير عامي ثابت بمعنى \"إلى حد كبير/جداً\"، يخفف الجملة أسلوبياً.",
      explanation_wrong: "\"absolut\" و\"vollkommen\" تعنيان \"تماماً/كلياً\" بشكل أقوى ورسمي أكثر، ولا تقترنان عادة بـ\"schön\" بهذا الاستخدام العامي.",
      grammar_example: "Der Test war ganz schön schwer, aber machbar.",
    },
    "28": {
      keyword: "obwohl (Gegensatz, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**Obwohl** alle ziemlich erschöpft waren, haben wir nach dem Abendessen noch lange zusammen gesessen",
      answer_translation: "رغم أنّ",
      explanation_correct: "الفعل في نهاية الجملة (waren) يدل على جملة ثانوية؛ \"obwohl\" تصوغ تناقضاً (جلسوا رغم الإرهاق).",
      explanation_wrong: "\"trotzdem\" ظرف مستقل يستوجب ترتيباً معكوساً (trotzdem waren...) لا ترتيب النهاية الموجود هنا، و\"ungeachtet\" حرف جر يسبق اسماً لا جملة كاملة.",
      grammar_example: "Obwohl es regnete, sind wir spazieren gegangen.",
    },
    "29": {
      keyword: "sollten (vereinbarte Absicht)",
      item_type: "verb",
      evidence_text: "waren wir uns einig, dass wir bald wieder zusammen einen Ausflug machen **sollten**.",
      answer_translation: "ينبغي (لنا)",
      explanation_correct: "بعد \"sich einig sein, dass...\" (الاتفاق على أنّ) يأتي الفعل الوجهي \"sollten\" ليعبر عن النية المتفق عليها.",
      explanation_wrong: "\"durften\" تعني \"كان مسموحاً لنا\" (إذن لا نية)، و\"konnten\" تعني \"كنا قادرين\" (قدرة لا اتفاقاً) -- كلاهما معنى مختلف عن النية المشتركة المتفق عليها.",
      grammar_example: "Wir waren uns einig, dass wir uns bald wieder treffen sollten.",
    },
    "30": {
      keyword: "inzwischen (mittlerweile)",
      item_type: "adjective_adverb",
      evidence_text: "Ich hoffe, dass es dir **inzwischen** schon wieder besser geht.",
      answer_translation: "في هذه الأثناء",
      explanation_correct: "\"inzwischen\" ظرف بمعنى \"في هذه الأثناء/الآن بعد مرور بعض الوقت\" -- يناسب الأمل بتحسن الحال منذ آخر مرة تحدثا.",
      explanation_wrong: "\"während\" حرف جر/أداة ربط (أثناء) تحتاج اسماً أو جملة، لا تقف بمفردها كظرف، و\"zwischen\" (بين) معناها مختلف تماماً (مكاني لا زمني).",
      grammar_example: "Ich hoffe, dass es dir inzwischen wieder gut geht.",
    },
  },
  translation: {
    text: "مرحباً ماريا،\n\nقبل أن يبدأ يوم العمل من جديد، أرسل لك بسرعة بضعة أسطر لأحدثك عن نهاية أسبوعنا. من المؤسف جداً أنك لم تستطيعي الحضور بسبب أنفلونزتك! لقد اشتقنا إليك جميعاً كثيراً.\n\nباستثناء ميركو، وصل الجميع بالقطار وقد التقينا فعلاً في المحطة. من هناك انطلقنا إلى الشقة المفروشة التي كانت ليلو قد حجزتها لنا.\n\nبعد أن وضعنا أمتعتنا جانباً، قمنا مباشرة بجولة في البلدة. كانت ليلو تعرف الكثير من الأشياء المثيرة للاهتمام لتحكيها. فهي تعيش هناك منذ سنوات وأثبتت أنها مرشدة سياحية ممتازة. ما أثار إعجابنا بشكل خاص كانت الحديقة الجميلة جداً، حيث كانت أزهار الرودودندرون تتفتح تماماً حينها. منظر رائع حقاً. كان هذا سيعجبك أيضاً! لاحقاً مشينا إلى بحيرة أمزل، التي يمكن الوصول إليها بسرعة من البلدة. هناك قمنا برحلة بالقارب عبر البحيرة. من القارب يمكن للمرء رؤية منظر رائع للتضاريس الصخرية المذهلة. في المساء كانت المسرحية الصخرية على جدول البرنامج.\n\nكانت رحلة المشي في اليوم التالي متعبة جداً، لكنها كانت رائعة.\n\nرغم أن الجميع كانوا منهكين تماماً، جلسنا معاً لوقت طويل بعد العشاء وتحدثنا عن الأيام الخوالي. في صباح اليوم التالي، بعد فطورنا المشترك، اتفقنا على أننا يجب أن نقوم برحلة معاً مرة أخرى قريباً. وفي المرة القادمة يجب أن تكوني حاضرة بالتأكيد. أرفق لك بعض الصور. كما ترين، كان لقاؤنا ممتعاً حقاً! أتمنى أن تكوني قد تحسنتِ في هذه الأثناء.\n\nمع تحياتنا جميعاً\nجيم",
  },
};

const MARIA_ALEXANDRA = {
  items: {
    "21": {
      keyword: "bei dir (feste Wendung)",
      item_type: "preposition",
      evidence_text: "Nächste Woche werde ich also **bei** dir in Berlin sein.",
      answer_translation: "عندك",
      explanation_correct: "\"bei dir sein\" تعبير ثابت بمعنى \"أكون عندك/في مكانك\".",
      explanation_wrong: "\"nach\" تدل على اتجاه حركة نحو مكان (لا التواجد فيه)، و\"zu\" أيضاً تدل على اتجاه لا تواجداً ساكناً.",
      grammar_example: "Am Wochenende bin ich bei meinen Eltern.",
    },
    "22": {
      keyword: "sich freuen auf → darauf",
      item_type: "pronoun_adverb",
      evidence_text: "Ich freue mich schon sehr **darauf**",
      answer_translation: "لذلك (أتطلع إليه)",
      explanation_correct: "\"sich freuen auf\" يرتبط ثابتاً بـ\"auf\"؛ عند الإشارة إلى فكرة (الزيارة القادمة) يتحول \"auf + das\" إلى ضمير ظرفي: darauf.",
      explanation_wrong: "\"darum\" ترتبط بأفعال أخرى (sich kümmern um)، و\"dazu\" ترتبط بمعانٍ أخرى (بالإضافة إلى ذلك) -- ليس \"sich freuen\".",
      grammar_example: "Ich freue mich schon sehr darauf, dich wiederzusehen.",
    },
    "23": {
      keyword: "ein halbes Jahr (gemischte Deklination, Neutrum)",
      item_type: "adjective_adverb",
      evidence_text: "denn schließlich haben wir uns fast ein **halbes** Jahr nicht gesehen.",
      answer_translation: "نصف (عام)",
      explanation_correct: "بعد أداة التنكير \"ein\" (تصريف مختلط) يأخذ الاسم المحايد \"Jahr\" بحالة النصب نهاية -es على الصفة.",
      explanation_wrong: "\"halbe\" نهاية مؤنثة/جمعية، و\"halben\" نهاية حالة الجر أو النصب المذكرة -- لا تناسبان الاسم المحايد \"Jahr\".",
      grammar_example: "Wir haben uns ein ganzes Jahr nicht gesehen.",
    },
    "24": {
      keyword: "Aber (Gegensatz, normale Wortstellung)",
      item_type: "conjunction",
      evidence_text: "**Aber** ich würde gern auch mal wieder in eine richtige Disko gehen.",
      answer_translation: "لكن",
      explanation_correct: "الترتيب الطبيعي بعد الفجوة (ich würde) يدل على أداة ربط تنسيقية لا تقلب ترتيب الفاعل والفعل؛ \"aber\" تصوغ التباين مع حب الريف المذكور سابقاً.",
      explanation_wrong: "\"Trotzdem\" ظرف يستوجب قلب الترتيب (Trotzdem würde ich) لو احتل الموضع الأول -- وهذا غير موجود هنا، و\"Sondern\" تحتاج نفياً سابقاً مباشراً لتصلح.",
      grammar_example: "Das Landleben ist schön. Aber manchmal vermisse ich die Stadt.",
    },
    "25": {
      keyword: "wäre (Konjunktiv II, hypothetischer Wunsch)",
      item_type: "tense",
      evidence_text: "Mal wieder eine ganze Nacht tanzen, das **wäre** mein Traum!",
      answer_translation: "سيكون",
      explanation_correct: "أمنية افتراضية (لم تتحقق بعد) تستدعي صيغة الحال الافتراضي Konjunktiv II لفعل \"sein\": wäre.",
      explanation_wrong: "\"hätte\" فعل مختلف (haben) لا يناسب المعنى، و\"würde\" تحتاج مصدراً بعدها (würde sein غير مستخدم) -- \"wäre\" هي الصيغة المباشرة الصحيحة.",
      grammar_example: "Ein Urlaub am Meer, das wäre jetzt genau richtig!",
    },
    "26": {
      keyword: "mehr Spaß (Komparativ)",
      item_type: "adjective_adverb",
      evidence_text: "Und zu zweit macht es viel **mehr** Spaß!",
      answer_translation: "أكثر",
      explanation_correct: "صيغة المقارنة \"mehr\" (أكثر) تقارن درجة المتعة بحالة أخرى (بمفرد مقابل مع شخص آخر).",
      explanation_wrong: "\"am meisten\" صيغة التفضيل المطلق (الأكثر إطلاقاً) تحتاج ثلاثة أطراف للمقارنة على الأقل، و\"ganz\" (تماماً) لا تصوغ مقارنة إطلاقاً.",
      grammar_example: "Mit Freunden macht das Reisen viel mehr Spaß.",
    },
    "27": {
      keyword: "noch existiert (weiterhin bestehen)",
      item_type: "adjective_adverb",
      evidence_text: "ob die Disko am Wittenberger Platz **noch** existiert?",
      answer_translation: "ما زالت",
      explanation_correct: "\"noch\" هنا تعني \"ما زالت قائمة حتى الآن\" -- شك بشأن استمرارية وجود المكان بعد فترة طويلة من الغياب.",
      explanation_wrong: "\"auch\" (أيضاً) لا تحمل بُعد الاستمرارية الزمنية المقصود، و\"nur\" (فقط) لا تناسب المعنى إطلاقاً.",
      grammar_example: "Weißt du, ob das kleine Café noch existiert?",
    },
    "28": {
      keyword: "wann (indirekte Frage nach Zeitpunkt)",
      item_type: "conjunction",
      evidence_text: "habe ich noch keine Ahnung, **wann** ich in Berlin ankommen werde.",
      answer_translation: "متى",
      explanation_correct: "سؤال غير مباشر عن نقطة زمنية محددة (متى سأصل)؛ الفعل في النهاية (werde) يؤكد الجملة الثانوية، و\"wann\" أداة الاستفهام الزمنية المناسبة.",
      explanation_wrong: "\"als\" تُستخدم لوصف حدث ماضٍ فريد لا للسؤال عن المستقبل، و\"wenn\" تصوغ شرطاً/تكراراً لا سؤالاً غير مباشر عن نقطة زمنية محددة.",
      grammar_example: "Ich weiß noch nicht, wann der Zug ankommt.",
    },
    "29": {
      keyword: "will (Absicht, ich)",
      item_type: "verb",
      evidence_text: "Jedenfalls **will** ich versuchen, eine Mitfahrgelegenheit zu finden.",
      answer_translation: "أنوي",
      explanation_correct: "الفعل الوجهي \"will\" يعبّر عن نية شخصية ذاتية (\"أنوي أن أحاول\")، وهذا هو المعنى المقصود هنا.",
      explanation_wrong: "\"darf\" تعني \"يُسمح لي\" (إذن من طرف آخر) و\"soll\" تعني \"يُفترض بي\" (توجيه خارجي) -- لا يناسبان نية ذاتية مباشرة.",
      grammar_example: "Ich will unbedingt versuchen, pünktlich zu sein.",
    },
    "30": {
      keyword: "die (Relativpronomen, Nominativ feminin)",
      item_type: "pronoun",
      evidence_text: "die Mitfahrzentrale, **die** so etwas organisiert.",
      answer_translation: "التي",
      explanation_correct: "الضمير الموصول يعود إلى \"die Mitfahrzentrale\" (مؤنث) ويكون فاعل جملته الخاصة (organisiert)، فيأخذ صيغة حالة الرفع المؤنثة: die.",
      explanation_wrong: "\"das\" صيغة محايدة و\"der\" صيغة حالة الرفع المذكرة أو الجر المؤنثة -- لا تناسبان الاسم المؤنث \"Mitfahrzentrale\" كفاعل.",
      grammar_example: "Das ist die Firma, die den Umzug organisiert.",
    },
  },
  translation: {
    text: "شفارتسنبيك، بتاريخ ........\n\nعزيزتي ماريا،\n\nشكراً جزيلاً على الدعوة. الأسبوع القادم سأكون إذن عندك في برلين. أنا سعيدة جداً بذلك مسبقاً، فنحن لم نلتقِ منذ ما يقارب نصف عام! كما تعلمين، أسكن الآن في الريف بالقرب من هامبورغ وأجد ذلك رائعاً جداً. لكنني أودّ أيضاً الذهاب مرة أخرى إلى ديسكو حقيقية. الرقص طوال ليلة كاملة مرة أخرى، هذا حلمي! ويكون الأمر أكثر متعة عندما نكون اثنتين!\n\nهل تعرفين إن كانت الديسكو في ساحة فيتنبرغر ما زالت موجودة؟\n\nللأسف ليس لدي فكرة بعد متى سأصل إلى برلين. على أي حال أنوي محاولة إيجاد وسيلة تنقل مشتركة. فهناك على الإنترنت مركز تنظيم الرحلات المشتركة الذي ينظم أموراً كهذه. لذا لا تقلقي إن وصلت متأخرة بعض الشيء!\n\nأتطلع كثيراً لرؤيتك!\n\nأليكساندرا",
  },
};

async function setLearningAidsByTitle(title, aids) {
  const rows = await q(`select id from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  if (rows.length !== 1) { console.error(`SKIP ${title}: expected 1 row, got ${rows.length}`); return; }
  console.log(`${title}: writing ${Object.keys(aids.items).length} gaps`);
  if (APPLY) {
    const b64 = Buffer.from(JSON.stringify(aids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${rows[0].id}';`);
  }
}

async function setMariaLetters() {
  const rows = await q(`select e.id, p.passage from sb_exercises e join sb_t1_passages p on p.exercise_id = e.id where e.title = 'Maria' and e.teil = 1 order by e.id;`);
  if (rows.length !== 2) { console.error(`SKIP Maria: expected 2 rows, got ${rows.length}`); return; }
  for (const row of rows) {
    const aids = row.passage.includes("Cem") ? MARIA_CEM : row.passage.includes("Alexandra") ? MARIA_ALEXANDRA : null;
    if (!aids) { console.error(`SKIP Maria row ${row.id}: could not identify letter by signature`); continue; }
    console.log(`Maria [${row.id.slice(0, 8)}] (${aids === MARIA_CEM ? "Cem" : "Alexandra"}): writing ${Object.keys(aids.items).length} gaps`);
    if (APPLY) {
      const b64 = Buffer.from(JSON.stringify(aids), "utf8").toString("base64");
      await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
    }
  }
}

async function setMeyerhofer2() {
  // Byte-identical duplicate of "Herr Meyerhofer" (batch 10) -- reuse its
  // already-written content instead of re-deriving it.
  const src = await q(`select learning_aids from sb_exercises where title = 'Herr Meyerhofer' and teil = 1;`);
  if (src.length !== 1 || !src[0].learning_aids) { console.error("SKIP Meyerhofer 2: source 'Herr Meyerhofer' content not found"); return; }
  await setLearningAidsByTitle("Meyerhofer 2", src[0].learning_aids);
}

async function main() {
  await setLearningAidsByTitle("Jelena", JELENA);
  await setMariaLetters();
  await setMeyerhofer2();
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

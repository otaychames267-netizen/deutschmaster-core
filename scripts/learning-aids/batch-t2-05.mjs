/**
 * Batch T2 #5: "Silvia Schönenberger", "Silvia Schönenberger 2",
 * "Versicherungen", "Sahara-Länder". All had learning_aids = null. All 40
 * gap answers checked against their word banks -- clean, no defects
 * (unlike ADRIAN/ADRIAN 2 or Joggen). The two Silvia letters are near-twin
 * variants (like ADRIAN/ADRIAN 2) but analyzed independently since wording
 * differs meaningfully at several gaps (33/36/37).
 *
 * Usage: node scripts/learning-aids/batch-t2-05.mjs [--apply]
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

const SILVIA_SHARED_TRANSLATION_1 = "السيدة بورنر المحترمة،\n\nهناك الكثير جداً من النصائح حول كيفية التغذية، وماذا يجب أن يأكل المرء وماذا لا. لكن معظم التوصيات ليست مع شيء، بل ضد شيء ما، وغالباً ما تكون ضد شيء مختلف في كل مرة: ضد اللحوم مثلاً أو ضد السكر، وأيضاً ضد الحليب. فيُقال مثلاً إن من لا يأكل اللحوم يعيش حياة أكثر صحة فحسب، بل يشعر أيضاً بحال أفضل.\n\nلفت انتباهي إعلانكم أثناء تصفحي لإحدى المجلات، والآن لدي الأسئلة التالية لكم: أي الأطعمة يمكن للمرء تناولها بالكمية التي يريدها فعلياً؟ ماذا ينبغي أن يُؤكل كل يوم؟ وما رأيكم بالحليب؟ يقول البعض إن الحليب صحي جداً بسبب العناصر الغذائية المهمة الكثيرة فيه. ويرى آخرون أن من يشرب الكثير من الحليب قد يعاني من مشاكل في المعدة. كما يمكن للمرء أيضاً شرب المياه المعدنية بدلاً من الحليب. فماذا يجب أن أصدّق الآن؟\n\nأشكركم مسبقاً على الإجابة عن أسئلتي. هل يمكنكم أيضاً إرسال نشرة توضيحية لي؟ موضوع الغذاء والرياضة يثير اهتمامي بشكل خاص، لأنني أمارس الرياضة بنفسي كثيراً.\n\nمع أطيب التحيات\nسيلفيا شونينبرغر";

const SILVIA_SHARED_TRANSLATION_2 = "السيدة بورنر المحترمة،\n\nهناك الكثير جداً من النصائح حول كيفية التغذية، وماذا يجب أن يأكل المرء وماذا لا. لكن معظم التوصيات ليست مع شيء، بل ضد شيء ما، وغالباً ما تكون ضد شيء مختلف في كل مرة: ضد اللحوم مثلاً أو ضد الحليب. فيُقال مثلاً إن من لا يأكل اللحوم يعيش حياة أكثر صحة فحسب، بل يشعر أيضاً بحال أفضل.\n\nعندما كنتُ أتصفح إحدى المجلات، لفت انتباهي إعلانكم، والآن لدي الأسئلة التالية لكم: أي الأطعمة يمكن للمرء تناولها بالكمية التي يريدها فعلياً؟ ماذا ينبغي أن يُؤكل كل يوم؟ وما رأيكم بالحليب؟ يقول البعض إن الحليب صحي جداً بسبب العناصر الغذائية المهمة الكثيرة. ويرى آخرون أن من يشرب الكثير من الحليب قد يعاني من مشاكل في المعدة. كما يمكن للمرء أيضاً شرب المياه المعدنية بدلاً من الحليب. فماذا يجب أن أصدّق الآن؟\n\nأشكركم مسبقاً على الإجابة عن أسئلتي. هل يمكنكم أيضاً إرسال نشرة توضيحية لي؟ موضوع الغذاء والرياضة يثير اهتمامي بشكل خاص، لأنني أمارس الرياضة بنفسي كثيراً.\n\nمع أطيب التحيات\nسيلفيا شونينبرغر";

const SILVIA_1 = {
  items: {
    "31": {
      keyword: "nicht ... sondern (Gegensatz)",
      item_type: "conjunction",
      evidence_text: "Die meisten Empfehlungen sind aber nicht für etwas, **sondern** gegen etwas",
      explanation_correct: "\"nicht... sondern\" أداة ربط مزدوجة تنفي شيئاً وتستبدله بآخر مباشرة (ليست \"مع\" شيء، بل \"ضد\" شيء).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصلح بعد نفي مباشر (nicht) بهذا الشكل الاستبدالي.",
      grammar_example: "Das ist nicht meine Meinung, sondern die der Experten.",
    },
    "32": {
      keyword: "man sagt (unpersönlich)",
      item_type: "verb",
      evidence_text: "So **sagt** man etwa, wer kein Fleisch isst, lebt nicht nur gesünder",
      explanation_correct: "\"man sagt\" تعبير غير شخصي شائع بمعنى \"يُقال\"، فعل مضارع مطابق للفاعل العام \"man\".",
      explanation_wrong: "لا فعل آخر في القائمة يعني \"يُقال\" بهذا المعنى العام.",
      grammar_example: "Man sagt, regelmäßiger Sport hält gesund.",
    },
    "33": {
      keyword: "beim Durchsehen (bei+dem, Nominalisierung)",
      item_type: "preposition",
      evidence_text: "**Beim** Durchsehen einer Zeitschrift ist mir Ihre Anzeige aufgefallen",
      explanation_correct: "\"bei\" + \"dem\" تُدمجان إلزامياً في \"beim\"؛ تركيب ثابت \"beim + مصدر مُسمّى\" بمعنى \"أثناء فعل شيء\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح لهذا التركيب الثابت قبل اسم فعل مُسمّى.",
      grammar_example: "Beim Lesen der Zeitung ist mir dieser Artikel aufgefallen.",
    },
    "34": {
      keyword: "welchen (Frage, Dativ Plural)",
      item_type: "pronoun",
      evidence_text: "Von **welchen** Nahrungsmitteln darf man eigentlich so viel essen, wie man will?",
      explanation_correct: "\"von\" يحكم حالة الجر؛ أداة الاستفهام \"welche\" بحالة الجر الجمعية تسأل عن أنواع محددة من الأطعمة: welchen.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح أداة استفهام بحالة الجر الجمعية.",
      grammar_example: "Von welchen Lebensmitteln sollte man nicht zu viel essen?",
    },
    "35": {
      keyword: "sollte + Passiv-Infinitiv",
      item_type: "tense",
      evidence_text: "Was **sollte** jeden Tag gegessen werden?",
      explanation_correct: "الفعل الوجهي \"sollte\" يسبق مصدراً مجرداً في صيغة المبني للمجهول (gegessen werden) -- تركيب صحيح تماماً (بخلاف اقترانه بمصدر بـ\"zu\").",
      explanation_wrong: "لا فعل وجهي آخر في القائمة يناسب هذا السؤال عن التوصية الغذائية.",
      grammar_example: "Was sollte vor dem Sport gegessen werden?",
    },
    "36": {
      keyword: "wegen der Nährstoffe (Genitiv)",
      item_type: "preposition",
      evidence_text: "Milch ist sehr gesund **wegen** der vielen wichtigen Nährstoffe.",
      explanation_correct: "\"wegen\" حرف جر سببي يحكم حالة الملكية (Genitiv): wegen der Nährstoffe.",
      explanation_wrong: "لا حرف جر آخر في القائمة يصوغ سبباً بهذا الشكل قبل اسم بحالة الملكية.",
      grammar_example: "Das Gemüse ist wegen der Vitamine sehr gesund.",
    },
    "37": {
      keyword: "anstelle von (statt)",
      item_type: "preposition",
      evidence_text: "kann man anstelle **von** Milch auch Mineralwasser trinken.",
      explanation_correct: "\"anstelle von\" تركيب شائع بديل لـ\"anstelle + Genitiv\"، يعني \"بدلاً من\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل \"anstelle\" بهذا الشكل.",
      grammar_example: "Anstelle von Zucker kann man auch Honig verwenden.",
    },
    "38": {
      keyword: "Antwort auf (feste Wendung)",
      item_type: "preposition",
      evidence_text: "Für eine Antwort **auf** meine Fragen danke ich Ihnen im Voraus.",
      explanation_correct: "\"eine Antwort auf etwas\" تركيب ثابت (اسم + حرف جر) بمعنى \"رد على شيء\".",
      explanation_wrong: "لا حرف جر آخر في القائمة يقترن بـ\"Antwort\" بهذا المعنى الثابت.",
      grammar_example: "Ich freue mich auf eine Antwort auf meine Anfrage.",
    },
    "39": {
      keyword: "würde ... interessieren (Konjunktiv II)",
      item_type: "tense",
      evidence_text: "Das Thema Essen und Sport **würde** mich besonders interessieren",
      explanation_correct: "تركيب الحال الافتراضي المهذب \"würde + Infinitiv\" يعبّر عن اهتمام محتمل بأسلوب لطيف.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح فعلاً مساعداً لهذا التركيب الافتراضي.",
      grammar_example: "Dieses Thema würde mich sehr interessieren.",
    },
    "40": {
      keyword: "weil (Grund, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**weil** ich selber viel Sport treibe.",
      explanation_correct: "الفعل في نهاية الجملة (treibe) يدل على جملة ثانوية سببية؛ \"weil\" تفسر سبب الاهتمام بهذا الموضوع.",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ سبباً بهذا الترتيب النحوي.",
      grammar_example: "Ich interessiere mich für Ernährung, weil ich gesund leben möchte.",
    },
  },
  translation: { text: SILVIA_SHARED_TRANSLATION_1 },
};

const SILVIA_2 = {
  items: {
    "31": { ...SILVIA_1.items["31"] },
    "32": { ...SILVIA_1.items["32"] },
    "33": {
      keyword: "als (einmaliges Ereignis, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**Als** ich eine Zeitschrift durchsah, ist mir Ihre Anzeige aufgefallen",
      explanation_correct: "وصف حدث ماضٍ فريد (تصفح مجلة في مناسبة واحدة) يستدعي \"als\"؛ الفعل في النهاية (durchsah) يؤكد الجملة الثانوية.",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصف حدثاً ماضياً وحيداً بهذا الشكل.",
      grammar_example: "Als ich die Zeitung las, fiel mir dieser Artikel auf.",
    },
    "34": { ...SILVIA_1.items["34"] },
    "35": { ...SILVIA_1.items["35"] },
    "36": {
      keyword: "wichtigen Nährstoffe (Genitiv Plural)",
      item_type: "adjective_adverb",
      evidence_text: "Milch ist sehr gesund wegen der vielen **wichtigen** Nährstoffe.",
      explanation_correct: "بعد أداة التعريف \"der\" (حالة الملكية الجمعية) تأخذ الصفة نهاية التصريف الضعيف: -en. \"wichtig\" (مهم) تصف العناصر الغذائية.",
      explanation_wrong: "لا صفة أخرى في القائمة تصف \"مهم\" بهذا المعنى في هذا الموضع.",
      grammar_example: "Diese Frucht enthält viele wichtigen Vitamine.",
    },
    "37": {
      keyword: "statt Milch (anstelle)",
      item_type: "preposition",
      evidence_text: "kann man **statt** Milch auch Mineralwasser trinken.",
      explanation_correct: "\"statt\" حرف جر يعني \"بدلاً من\"، يحكم حالة الملكية (أو يُستخدم أحياناً مع اسم مجرد بلا تصريف ظاهر).",
      explanation_wrong: "لا كلمة أخرى في القائمة تعني \"بدلاً من\" بهذا الشكل المباشر.",
      grammar_example: "Statt Kaffee trinke ich morgens lieber Tee.",
    },
    "38": { ...SILVIA_1.items["38"] },
    "39": { ...SILVIA_1.items["39"] },
    "40": { ...SILVIA_1.items["40"] },
  },
  translation: { text: SILVIA_SHARED_TRANSLATION_2 },
};

const VERSICHERUNGEN = {
  items: {
    "31": {
      keyword: "dass (Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "wir möchten Sie darüber informieren, **dass** Ihre Versicherungen künftig von Herrn Max Kuhne bearbeitet werden.",
      explanation_correct: "الفعل في نهاية الجملة (werden، مبني للمجهول) يدل على جملة ثانوية؛ \"dass\" تُدخل جملة مفعول به بعد \"informieren\".",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تُدخل جملة مفعول به بهذا الشكل بعد \"informieren\".",
      grammar_example: "Wir informieren Sie darüber, dass sich unsere Öffnungszeiten ändern.",
    },
    "32": {
      keyword: "Ihre Unterlagen (Possessivpronomen)",
      item_type: "pronoun",
      evidence_text: "Ihm wurden **Ihre** Unterlagen übergeben.",
      explanation_correct: "\"Ihre\" ضمير ملكية رسمي يعود إلى مستندات المخاطَب (Herr Frankel)، بحالة الرفع الجمعية (فاعل المبني للمجهول).",
      explanation_wrong: "لا ضمير آخر في القائمة يشير إلى ملكية المخاطَب الرسمية بهذا الشكل.",
      grammar_example: "Ihre Unterlagen wurden bereits an die neue Abteilung weitergeleitet.",
    },
    "33": {
      keyword: "werden (Passiv, Präsens)",
      item_type: "tense",
      evidence_text: "Alle Kundendaten **werden** selbstverständlich streng vertraulich behandelt.",
      explanation_correct: "المبنى للمجهول في المضارع: \"werden\" + صيغة الفاعل الثاني (behandelt)، مطابق للفاعل الجمعي \"Kundendaten\".",
      explanation_wrong: "لا فعل آخر في القائمة يصوغ المبني للمجهول بهذا الشكل.",
      grammar_example: "Alle Anfragen werden innerhalb von 24 Stunden bearbeitet.",
    },
    "34": {
      keyword: "Fragen haben zu (feste Wendung)",
      item_type: "noun",
      evidence_text: "Wenn Sie also **Fragen** zu Ihren Versicherungen haben",
      explanation_correct: "\"Fragen haben zu etwas\" تعبير شائع بمعنى \"لديه أسئلة بخصوص شيء\"؛ \"Fragen\" مفعول به جمعي لـ\"haben\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح مفعولاً به جمعياً بهذا المعنى.",
      grammar_example: "Wenn Sie Fragen zu Ihrem Vertrag haben, rufen Sie uns an.",
    },
    "35": {
      keyword: "informiert (er, Präsens)",
      item_type: "verb",
      evidence_text: "Er berät und **informiert** Sie gern.",
      explanation_correct: "فعل مضارع مطابق للفاعل \"er\" (Herr Kuhne)، منسّق مع \"berät\" بواسطة \"und\".",
      explanation_wrong: "لا فعل آخر في القائمة يعني \"يُعلم/يُطلع\" بهذا المعنى المطابق للفاعل الغائب المفرد.",
      grammar_example: "Unser Team berät und informiert Sie jederzeit gern.",
    },
    "36": {
      keyword: "weiterhelfen (trennbares Verb)",
      item_type: "verb",
      evidence_text: "Auch im Schadensfall **hilft** er Ihnen schnell und zuverlässig weiter.",
      explanation_correct: "الفعل المنفصل \"weiterhelfen\" (يساعد/يتابع المساعدة) مطابق للفاعل \"er\"؛ البادئة \"weiter\" في نهاية الجملة.",
      explanation_wrong: "لا فعل آخر في القائمة يقترن بالبادئة \"weiter\" في نهاية الجملة بهذا المعنى.",
      grammar_example: "Bei technischen Problemen hilft Ihnen unser Support weiter.",
    },
    "37": {
      keyword: "sich entschuldigen für",
      item_type: "verb_prep",
      evidence_text: "möchten wir uns **für** einen Fehler in unserer letzten Beitragsrechnung entschuldigen.",
      explanation_correct: "الفعل الانعكاسي \"sich entschuldigen\" يرتبط ثابتاً بـ\"für\": sich für etwas entschuldigen.",
      explanation_wrong: "لا حرف جر آخر في القائمة يرتبط بهذا الفعل الانعكاسي.",
      grammar_example: "Wir entschuldigen uns für die entstandenen Unannehmlichkeiten.",
    },
    "38": {
      keyword: "dort (Rückverweis)",
      item_type: "adjective_adverb",
      evidence_text: "Leider ist **dort** die Adresse von Herrn Kuhne nicht korrekt.",
      explanation_correct: "\"dort\" ظرف مكاني/إشاري يشير إلى المستند المذكور سابقاً (فاتورة الاشتراك الأخيرة) حيث ورد الخطأ.",
      explanation_wrong: "لا ظرف آخر في القائمة يشير إلى موضع سابق الذكر بهذا المعنى.",
      grammar_example: "Im letzten Schreiben war dort ein Tippfehler.",
    },
    "39": {
      keyword: "richtige Anschrift (Adjektiv)",
      item_type: "adjective_adverb",
      evidence_text: "Seine **richtige** Anschrift und Telefonnummer finden Sie auf diesem Brief oben rechts.",
      explanation_correct: "\"richtig\" (صحيح) صفة تصف العنوان الصحيح المصحَّح، مقابل الخطأ المذكور سابقاً.",
      explanation_wrong: "لا صفة أخرى في القائمة تعني \"صحيح/سليم\" بهذا المعنى.",
      grammar_example: "Bitte notieren Sie sich die richtige Telefonnummer.",
    },
    "40": {
      keyword: "wir danken Ihnen (Dativ)",
      item_type: "pronoun",
      evidence_text: "Wir danken **Ihnen** für Ihr Vertrauen.",
      explanation_correct: "الفعل \"danken\" يحكم حالة الجر؛ صيغة المخاطب الرسمية بحالة الجر: Ihnen.",
      explanation_wrong: "لا ضمير آخر في القائمة يطابق حالة الجر لصيغة المخاطب الرسمية.",
      grammar_example: "Wir danken Ihnen für Ihre langjährige Treue.",
    },
  },
  translation: {
    text: "Frankfurter Allianz\nشارع بانشتراسه 99\nماكس كونه\n60322 فرانكفورت\nهاتف: 069-951670                                                          فرانكفورت، بتاريخ.......\n\nمستشار جديد لتأميناتكم\n\nالسيد فرانكل المحترم،\n\nنود إعلامكم بأن تأميناتكم سيتولاها مستقبلاً السيد ماكس كونه. تم تسليمه ملفاتكم.\n\nبالطبع تُعامَل جميع بيانات العملاء بسرية تامة. لذا إذا كانت لديكم أي أسئلة بخصوص تأميناتكم، يرجى التواصل مستقبلاً مع السيد كونه. سيقوم بإرشادكم وإعلامكم بكل سرور. وفي حال وقوع أي ضرر أيضاً، سيساعدكم بسرعة وموثوقية.\n\nكما نود الاعتذار عن خطأ حدث في فاتورة الاشتراك الأخيرة. للأسف كان عنوان السيد كونه غير صحيح هناك. تجدون عنوانه ورقم هاتفه الصحيحين في أعلى يمين هذه الرسالة.\n\nنشكركم على ثقتكم بنا.\n\nمع أطيب التحيات\nشركة Frankfurter Allianz",
  },
};

const SAHARA = {
  items: {
    "31": {
      keyword: "darin (bezieht sich auf die Anzeige)",
      item_type: "pronoun_adverb",
      evidence_text: "denn **darin** steht, dass Sie auf Erlebnisreisen in Wüstenregionen spezialisiert sind.",
      explanation_correct: "\"darin\" ضمير ظرفي يشير إلى \"die Anzeige\" (الإعلان) المذكورة سابقاً -- \"في\" + \"الإعلان\" = \"فيه\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح ضميراً ظرفياً يعود إلى الإعلان بهذا المعنى.",
      grammar_example: "Ich habe die Anzeige gelesen; darin steht alles Wichtige.",
    },
    "32": {
      keyword: "nämlich (Präzisierung)",
      item_type: "adjective_adverb",
      evidence_text: "haben Sie das richtige Angebot für uns – **nämlich** für mich und meine 17-jährige Tochter.",
      explanation_correct: "\"nämlich\" ظرف توضيح يحدد بدقة من يُقصد بـ\"uns\" (نحن): أنا وابنتي تحديداً.",
      explanation_wrong: "لا ظرف آخر في القائمة يقدّم توضيحاً دقيقاً بهذا المعنى.",
      grammar_example: "Wir suchen ein Angebot für zwei Personen, nämlich für meine Frau und mich.",
    },
    "33": {
      keyword: "danach (zeitliche Abfolge)",
      item_type: "adjective_adverb",
      evidence_text: "Zuerst eine Wanderreise... und **danach** ein Erholungsurlaub am Meer.",
      explanation_correct: "\"danach\" ظرف تتابع زمني يعني \"بعد ذلك\"، يربط بمرحلة \"Zuerst\" (أولاً) المذكورة سابقاً.",
      explanation_wrong: "لا ظرف آخر في القائمة يصف تتابعاً زمنياً بهذا المعنى بعد \"zuerst\".",
      grammar_example: "Zuerst arbeiten wir, und danach machen wir eine Pause.",
    },
    "34": {
      keyword: "wenn ja (feste Wendung)",
      item_type: "fixed_expression",
      evidence_text: "Bieten Sie solche Kombinationen an? Und **wenn** ja, zu welchem Preis?",
      explanation_correct: "\"wenn ja\" تعبير ثابت شائع بمعنى \"إذا كان الجواب نعم\"، يُستخدم لمتابعة سؤال بشرط إيجابي.",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل \"ja\" بهذا التركيب الشرطي الثابت.",
      grammar_example: "Haben Sie noch freie Plätze? Und wenn ja, ab wann?",
    },
    "35": {
      keyword: "hätte (Konjunktiv II, höflich)",
      item_type: "tense",
      evidence_text: "Zur Wanderreise **hätte** ich noch folgende Fragen:",
      explanation_correct: "صيغة مهذبة بالحال الافتراضي (Konjunktiv II) لفعل \"haben\" تقدّم أسئلة بأسلوب لطيف.",
      explanation_wrong: "لا فعل آخر في القائمة يصلح صيغة حال افتراضي لفعل \"haben\" هنا.",
      grammar_example: "Dazu hätte ich noch eine Frage.",
    },
    "36": {
      keyword: "unter freiem Himmel",
      item_type: "fixed_expression",
      evidence_text: "Schläft man immer **unter** freiem Himmel?",
      explanation_correct: "\"unter freiem Himmel\" تعبير ثابت شائع بمعنى \"في العراء/تحت السماء المفتوحة\" (دون خيمة/سقف).",
      explanation_wrong: "لا حرف جر آخر في القائمة يكوّن هذا التعبير الثابت بمعنى \"في العراء\".",
      grammar_example: "Im Sommer übernachten wir gern unter freiem Himmel.",
    },
    "37": {
      keyword: "möchte (Wunsch, ich)",
      item_type: "verb",
      evidence_text: "Ich **möchte** auch wissen, wie die Reisegruppen zusammengesetzt sind",
      explanation_correct: "الفعل الوجهي \"möchte\" (أودّ) يعبّر عن رغبة مهذبة في معرفة تفاصيل إضافية.",
      explanation_wrong: "لا فعل وجهي آخر في القائمة يعبّر عن رغبة بهذا الأسلوب المهذب.",
      grammar_example: "Ich möchte außerdem wissen, wie groß die Gruppen sind.",
    },
    "38": {
      keyword: "welche Sprache (Frage, Akkusativ feminin)",
      item_type: "pronoun",
      evidence_text: "**welche** Sprache die Reiseleiterin/der Reiseleiter spricht",
      explanation_correct: "أداة استفهام \"welche\" تسأل عن اسم مؤنث (Sprache) بحالة النصب (مفعول به لـ\"spricht\").",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح أداة استفهام بحالة النصب المؤنثة.",
      grammar_example: "Ich möchte wissen, welche Sprache dort gesprochen wird.",
    },
    "39": {
      keyword: "dabei sein (feste Wendung)",
      item_type: "fixed_expression",
      evidence_text: "ob ein Arzt **dabei** ist.",
      explanation_correct: "\"dabei sein\" تعبير ثابت شائع بمعنى \"يكون حاضراً/مرافقاً ضمن المجموعة\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل هذا التعبير الثابت مع \"ist\".",
      grammar_example: "Bei gefährlichen Touren ist immer ein Arzt dabei.",
    },
    "40": {
      keyword: "Ihr Angebot (Nomen)",
      item_type: "noun",
      evidence_text: "Ich freue mich auf Ihr **Angebot**.",
      explanation_correct: "\"Angebot\" (عرض) مفعول به لـ\"sich freuen auf\"، يشير إلى الرد المتوقع من الشركة.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصف \"عرضاً\" بهذا المعنى الختامي.",
      grammar_example: "Ich freue mich auf Ihr baldiges Angebot.",
    },
  },
  translation: {
    text: "السادة المحترمون،\n\nمنذ فترة طويلة أخطط لرحلة مشي إلى دول الصحراء. والآن لفت انتباهي إعلان شركة Geo-Tours أثناء قراءتي لمجلة Berge، إذ ورد فيه أنكم متخصصون في رحلات المغامرات في المناطق الصحراوية. ربما لديكم العرض المناسب لنا - أي لي ولابنتي البالغة من العمر 17 عاماً. تصوراتنا بالتفصيل هي كالتالي:\n\nأولاً رحلة مشي لمدة عشرة أيام تقريباً، يُفضّل أن تكون رحلات يومية خفيفة (حوالي 4-5 ساعات)، وبعدها عطلة استجمام على البحر. هل تقدمون تركيبات كهذه؟ وإذا كان الجواب نعم، فبأي سعر؟ ولدي بخصوص رحلة المشي الأسئلة التالية أيضاً: هل يُنقل الأمتعة من مكان مبيت إلى آخر؟ هل ينام المرء دائماً تحت السماء المفتوحة؟ كما أودّ معرفة كيفية تشكيل مجموعات السفر، وما اللغة التي يتحدثها المرشد/المرشدة السياحية، وهل يكون هناك طبيب مرافق.\n\nأتطلع إلى عرضكم.\n\nمع أطيب التحيات\nأنيته لوكسينغر",
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
  await setLearningAids("Silvia Schönenberger", SILVIA_1);
  await setLearningAids("Silvia Schönenberger 2", SILVIA_2);
  await setLearningAids("Versicherungen", VERSICHERUNGEN);
  await setLearningAids("Sahara-Länder", SAHARA);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

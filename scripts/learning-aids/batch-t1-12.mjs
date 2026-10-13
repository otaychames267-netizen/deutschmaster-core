/**
 * Batch T1 #12: "Olivia", "Samir", "Schmidt". All had learning_aids = null.
 *
 * "Samir" and "Schmidt" are parallel (near-template) flight-complaint
 * letters but genuinely different in grammatical number throughout
 * (Samir: plural "Tickets"; Schmidt: singular "Flug"/"der Flug"), so gaps
 * 22, 27 differ in both wording and answer -- analyzed separately, not
 * copy-pasted.
 *
 * One more genuine answer-key bug found, in "Olivia" gap 30: "Es hat sich
 * gelohnt, das Fahrrad {{30}}." -- "sich lohnen" obligatorily takes a
 * zu-Infinitiv complement clause ("es lohnt sich, etwas zu tun"), the same
 * rule already established for "es ist + Adj + zu + Infinitiv" earlier
 * this session. There is no modal verb here to license a bare infinitive,
 * so "mitnehmen" (bare) cannot be correct; "mitzunehmen" is the only
 * grammatical option. Fixed the answer key.
 *
 * Usage: node scripts/learning-aids/batch-t1-12.mjs [--apply]
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

const OLIVIA = {
  items: {
    "21": {
      keyword: "trotz des Windes (Genitiv)",
      item_type: "preposition",
      evidence_text: "Radfahren macht hier nämlich viel Spaß trotz **des** Windes.",
      answer_translation: "الرياح (بحالة الملكية)",
      explanation_correct: "\"trotz\" حرف جر يحكم حالة الملكية (Genitiv)؛ \"Wind\" مذكر أحادي المقطع فتأخذ اللاحقة -es: des Windes.",
      explanation_wrong: "\"den\" حالة نصب و\"der\" حالة رفع/جر مؤنثة -- لا تناسبان حالة الملكية المذكرة المطلوبة بعد \"trotz\".",
      grammar_example: "Wir sind spazieren gegangen trotz des Regens.",
    },
    "22": {
      keyword: "wie mich (Vergleich, Akkusativ)",
      item_type: "pronoun",
      evidence_text: "Und es gibt auch Angebote für Radfahrer wie **mich**",
      answer_translation: "مثلي",
      explanation_correct: "\"wie\" في المقارنة يتبعها ضمير بحالة النصب مطابق لدور \"Radfahrer\" (مفعول به لـ\"für\"): mich.",
      explanation_wrong: "\"mein\" ضمير ملكية لا شخصي، و\"mir\" حالة جر -- لا تناسب حالة النصب المطلوبة بعد \"für... wie\".",
      grammar_example: "Es gibt viele Angebote für Anfänger wie mich.",
    },
    "23": {
      keyword: "besondere Fahrkarten (Plural, unbestimmt)",
      item_type: "adjective_adverb",
      evidence_text: "kann man hier zum Beispiel **besondere** Fahrkarten kaufen",
      answer_translation: "خاصة",
      explanation_correct: "\"kaufen\" يحكم حالة النصب؛ \"Fahrkarten\" جمع بلا أداة تعريف، فتأخذ الصفة نهاية التصريف القوي: -e.",
      explanation_wrong: "\"besonderem\" نهاية حالة الجر المفردة، و\"besonderen\" نهاية حالة النصب/الجر المفردة المذكرة -- لا تناسبان الاسم الجمع هنا.",
      grammar_example: "Für Familien gibt es besondere Angebote.",
    },
    "24": {
      keyword: "für wenig Geld (Kosten)",
      item_type: "preposition",
      evidence_text: "Angebote mit Schiffen, die das Rad **für** wenig Geld transportieren.",
      answer_translation: "مقابل",
      explanation_correct: "\"für\" + مبلغ مال تعبير ثابت يعني \"مقابل مبلغ زهيد\".",
      explanation_wrong: "\"durch\" تصف وسيلة (عبر شيء) لا سعراً، و\"mit\" لا تصلح لوصف السعر بهذا الشكل.",
      grammar_example: "Man kann das Fahrrad für wenig Geld reparieren lassen.",
    },
    "25": {
      keyword: "beeindruckt (Perfekt, Partizip II)",
      item_type: "tense",
      evidence_text: "Besonders **beeindruckt** hat mich aber die Stadt Burg auf Fehmarn.",
      answer_translation: "أثارت إعجابي",
      explanation_correct: "\"hat\" الفعل المساعد موجود سلفاً؛ الماضي التام لفعل \"beeindrucken\" يستوجب صيغة الفاعل الثاني: beeindruckt.",
      explanation_wrong: "\"beeindrucken\" مصدر و\"beeindruckend\" صفة (مثير للإعجاب) -- لا تصلحان مع الفعل المساعد \"hat\" في هذا التركيب.",
      grammar_example: "Besonders beeindruckt hat uns die Altstadt von Lübeck.",
    },
    "26": {
      keyword: "am Hafen (an+dem)",
      item_type: "preposition",
      evidence_text: "Schon **am** Hafen sind mir die vielen Fahrräder aufgefallen.",
      answer_translation: "عند/في",
      explanation_correct: "\"an\" + \"dem\" تُدمجان إلزامياً في \"am\" لوصف موقع ثابت: am Hafen.",
      explanation_wrong: "\"im\" (in+dem) تصف موقعاً داخل حيّز مغلق لا عند حافة/ساحل، و\"zum\" تدل على اتجاه حركة لا تواجداً ساكناً.",
      grammar_example: "Am Bahnhof gibt es viele Fahrradständer.",
    },
    "27": {
      keyword: "Außerdem (zusätzliche Information)",
      item_type: "adjective_adverb",
      evidence_text: "**Außerdem** gibt es Markierungen auf den Straßen",
      answer_translation: "علاوة على ذلك",
      explanation_correct: "\"Außerdem\" ظرف إضافة يقدّم معلومة جديدة تُكمّل ما سبق (كثرة الدراجات + علامات الطرق)؛ يقلب ترتيب الفاعل والفعل عند بداية الجملة (gibt es).",
      explanation_wrong: "\"Aber\" تصوغ تبايناً لا إضافة، و\"Außer\" حرف جر (عدا) يحتاج اسماً مباشرة بعده، لا جملة كاملة.",
      grammar_example: "Die Stadt ist schön. Außerdem gibt es viele Radwege.",
    },
    "28": {
      keyword: "erlauben (die = Markierungen, Plural)",
      item_type: "verb",
      evidence_text: "Markierungen auf den Straßen, die den Radfahrern **erlauben**, sich bei roten Ampeln vor die Autos zu stellen.",
      answer_translation: "تسمح",
      explanation_correct: "الفاعل \"die\" يعود إلى \"Markierungen\" (جمع)، فيتفق الفعل بصيغة الجمع: erlauben.",
      explanation_wrong: "\"erlaubt\" تصريف مفرد لا يطابق الفاعل الجمعي، و\"erlaubte\" صيغة ماضٍ بسيط -- السياق هنا وصف حالة حاضرة مستمرة.",
      grammar_example: "Die neuen Regeln erlauben den Radfahrern mehr Freiheit.",
    },
    "29": {
      keyword: "Einige Ampeln (Nominativ Plural)",
      item_type: "adjective_adverb",
      evidence_text: "**Einige** Ampeln schalten für Radfahrer sogar früher auf Grün als für Autos.",
      answer_translation: "بعض",
      explanation_correct: "\"Einige\" (بعض) كمحدد كمّي جمعي يطابق الاسم الجمع \"Ampeln\" كفاعل بحالة الرفع.",
      explanation_wrong: "\"Einigen\" نهاية حالة الجر/النصب، و\"Einiges\" صيغة محايدة مفردة -- لا تناسبان الفاعل الجمعي \"Ampeln\".",
      grammar_example: "Einige Straßen sind nur für Radfahrer freigegeben.",
    },
    "30": {
      keyword: "sich lohnen + zu + Infinitiv",
      item_type: "grammar_structure",
      evidence_text: "Es hat sich gelohnt, das Fahrrad **mitzunehmen**.",
      answer_translation: "أن يُحضر",
      explanation_correct: "\"sich lohnen\" يستوجب دائماً جملة تكميلية بصيغة \"zu + Infinitiv\"؛ في الأفعال المنفصلة يُدرَج \"zu\" بين البادئة والجذر: mit-zu-nehmen.",
      explanation_wrong: "\"mitgenommen\" صيغة الفاعل الثاني لا تناسب هذا الموضع، و\"mitnehmen\" (مصدر مجرد بلا zu) غير صحيح نحوياً هنا لعدم وجود فعل وجهي يبرر حذف \"zu\".",
      grammar_example: "Es hat sich gelohnt, früh aufzustehen und den Sonnenaufgang zu sehen.",
    },
  },
  translation: {
    text: "عزيزتي أوليفيا،\n\nكما تعلمين، أقضي حالياً عطلة في جزيرة فيمارن. وقد كان إحضار دراجتي فكرة جيدة حقاً. فركوب الدراجات هنا ممتع جداً رغم الرياح. وهناك أيضاً عروض لراكبي الدراجات من أمثالي، ممن يريدون الاستجمام بشكل أساسي دون إجهاد أنفسهم كثيراً.\n\nفيمكن هنا مثلاً شراء تذاكر خاصة للسفر بالحافلة إلى مكان آخر والعودة بالدراجة. أو هناك عروض بواسطة السفن التي تنقل الدراجة مقابل مبلغ زهيد.\n\nلكن ما أعجبني بشكل خاص هو مدينة بورغ في فيمارن. لاحظتُ الدراجات الكثيرة منذ الميناء. كما توجد علامات على الشوارع تسمح لراكبي الدراجات بالوقوف أمام السيارات عند الإشارات الحمراء. بل إن بعض الإشارات الضوئية تتحول إلى الأخضر لراكبي الدراجات أبكر مما تتحول للسيارات.\n\nكما ترين إذن: كان يستحق إحضار الدراجة معي.\n\nمع تحياتي\nلوتس",
  },
};

const SAMIR = {
  items: {
    "21": {
      keyword: "bei Ihnen (Dativ, formell)",
      item_type: "pronoun",
      evidence_text: "im Mai habe ich bei **Ihnen** für mich und meine Familie Flugtickets nach Indien bestellt",
      answer_translation: "لديكم/منكم",
      explanation_correct: "\"bei jemandem bestellen\" (يطلب من جهة ما) يحكم حالة الجر؛ صيغة المخاطب الرسمية بحرف كبير: Ihnen.",
      explanation_wrong: "\"ihnen\" بحرف صغير تعني \"لهم\" (الغائبون، لا المخاطب)، و\"Sie\" حالة رفع/نصب لا جر.",
      grammar_example: "Wir haben die Tickets bei Ihnen online bestellt.",
    },
    "22": {
      keyword: "war ... ausgemacht worden (Plusquamperfekt Passiv)",
      item_type: "tense",
      evidence_text: "was zuvor bei der Buchung am Telefon ausgemacht worden **war**.",
      answer_translation: "كان قد",
      explanation_correct: "المبنى للمجهول في الماضي الأبعد يُصاغ بـ\"worden\" + \"war\" (الماضي البسيط لـ sein) -- يصف اتفاقاً سابقاً لحدث آخر ماضٍ (استلام التذاكر).",
      explanation_wrong: "\"hat\" لا يقترن بـ\"worden\" في هذا التركيب، و\"wäre\" صيغة حال افتراضي لا سرد واقعي لاتفاق فعلي جرى.",
      grammar_example: "Der Flug entsprach nicht dem, was vereinbart worden war.",
    },
    "23": {
      keyword: "Obwohl (Gegensatz, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**Obwohl** ich ausdrücklich einen Direktflug nach Mumbai bestellt hatte, haben Sie mir Tickets mit Zwischenstopp... ausgestellt.",
      answer_translation: "رغم أنّ",
      explanation_correct: "الفعل في نهاية الجملة (hatte) يدل على جملة ثانوية، و\"obwohl\" تصوغ التناقض بين ما طُلب وما تم تسليمه.",
      explanation_wrong: "\"Danach\" ظرف تتابع زمني لا يستدعي فعلاً في النهاية، و\"Nämlich\" أداة توضيح (أي/يعني) لا تصوغ تناقضاً.",
      grammar_example: "Obwohl ich pünktlich bestellt hatte, kam die Lieferung zu spät.",
    },
    "24": {
      keyword: "mit Zwischenstopp (Merkmal)",
      item_type: "preposition",
      evidence_text: "haben Sie mir Tickets **mit** Zwischenstopp in Delhi ausgestellt.",
      answer_translation: "مع/بها",
      explanation_correct: "\"mit\" هنا تصف خاصية مرافقة للتذاكر (تتضمن توقفاً)؛ \"Tickets mit Zwischenstopp\" = تذاكر بها توقف.",
      explanation_wrong: "\"für\" تصف الغرض/المستفيد لا خاصية مرفقة، و\"zu\" لا تناسب وصف خاصية بهذا الشكل.",
      grammar_example: "Ich hätte gern einen Flug ohne Zwischenstopp.",
    },
    "25": {
      keyword: "erst (verspätet, nicht früher)",
      item_type: "adjective_adverb",
      evidence_text: "kamen so **erst** einen Tag später als geplant in Mumbai an.",
      answer_translation: "لم يحدث إلا",
      explanation_correct: "\"erst\" هنا تؤكد التأخر (\"لم نصل إلا بعد يوم إضافي\") -- عكس التوقع الأصلي.",
      explanation_wrong: "\"jetzt\" (الآن) لا تصف تأخراً زمنياً، و\"schon\" (بالفعل) تعطي معنى معاكساً (الوصول أبكر من المتوقع).",
      grammar_example: "Wegen des Staus kamen wir erst zwei Stunden später an.",
    },
    "26": {
      keyword: "nicht nur ... sondern auch",
      item_type: "conjunction",
      evidence_text: "Die Tickets waren nämlich nicht nur anders als vereinbart, **sondern** auch noch viel teurer.",
      answer_translation: "بل",
      explanation_correct: "\"nicht nur... sondern auch\" أداة ربط مزدوجة ثابتة تضيف معلومة أقوى لما سبق نفيه جزئياً.",
      explanation_wrong: "\"besonders\" (خصوصاً) لا تصلح للربط بعد \"nicht nur\"، و\"sonst\" (وإلا/عادة) معنى مختلف تماماً.",
      grammar_example: "Das Hotel war nicht nur teuer, sondern auch schmutzig.",
    },
    "27": {
      keyword: "die Tickets (Nominativ Plural, bestimmt)",
      item_type: "noun",
      evidence_text: "Statt der erwarteten 640 Euro kosteten **die** Tickets 720 Euro.",
      answer_translation: "التذاكر",
      explanation_correct: "\"Tickets\" فاعل الفعل \"kosteten\" (جمع)، وتُعرَّف هنا بالإشارة إلى التذاكر المذكورة سابقاً: die (حالة الرفع الجمعية).",
      explanation_wrong: "\"den\" حالة نصب/جر لا رفع، و\"der\" أداة تعريف مذكرة أو حالة جر مؤنثة -- لا تناسبان الفاعل الجمعي هنا.",
      grammar_example: "Die Tickets kosteten am Ende deutlich mehr als geplant.",
    },
    "28": {
      keyword: "bitten um (feste Verb-Präposition)",
      item_type: "verb_prep",
      evidence_text: "Ich darf Sie daher **um** Rückzahlung der zu viel verrechneten Kosten... bitten.",
      answer_translation: "أطلب (استرداد)",
      explanation_correct: "الفعل \"bitten\" يرتبط ثابتاً بحرف الجر \"um\": jemanden um etwas bitten.",
      explanation_wrong: "\"für\" و\"zu\" لا ترتبطان بالفعل \"bitten\" بهذا المعنى إطلاقاً.",
      grammar_example: "Ich bitte Sie um eine schnelle Rückmeldung.",
    },
    "29": {
      keyword: "Konto bei der Bank (feste Wendung)",
      item_type: "preposition",
      evidence_text: "auf mein Konto **bei** der Bank of India in Mumbai bitten.",
      answer_translation: "لدى",
      explanation_correct: "\"ein Konto bei einer Bank haben\" تعبير ثابت شائع؛ \"bei\" هنا تعني \"لدى/في\" فيما يخص الجهة المصرفية.",
      explanation_wrong: "\"an\" و\"vor\" لا تقترنان بـ\"Konto\" بهذا المعنى -- التعبير الثابت يستخدم \"bei\" حصراً.",
      grammar_example: "Ich habe ein Konto bei der Sparkasse.",
    },
    "30": {
      keyword: "mir antworten (Dativ)",
      item_type: "pronoun",
      evidence_text: "Ich bitte Sie, die Angelegenheit bald zu klären und **mir** dann zu antworten.",
      answer_translation: "لي",
      explanation_correct: "الفعل \"antworten\" يستدعي مفعولاً به غير مباشر بحالة الجر (\"jemandem antworten\")؛ الكاتبة تتحدث عن نفسها: mir.",
      explanation_wrong: "\"mich\" حالة نصب لا تناسب \"antworten\"، و\"sich\" ضمير انعكاسي لا مرجع مباشر له هنا (الفاعل \"Sie\" مخاطب لا الكاتبة).",
      grammar_example: "Bitte antworten Sie mir so schnell wie möglich.",
    },
  },
  translation: {
    text: "السيد سمير المحترم،\n\nفي مايو طلبتُ منكم تذاكر طيران إلى الهند لي ولعائلتي، واستلمتها قبل يومين من الإقلاع في 27 يونيو. للأسف لم تتطابق التذاكر إطلاقاً مع ما تم الاتفاق عليه مسبقاً هاتفياً عند الحجز.\n\nرغم أنني طلبتُ صراحة رحلة مباشرة إلى مومباي، أصدرتم لي تذاكر بها توقف في دلهي. اضطررنا لقضاء ليلة في دلهي فوصلنا إلى مومباي متأخرين بيوم كامل عما كان مخططاً. ولم يكن هذا كل شيء. فالتذاكر لم تكن فقط مختلفة عما تم الاتفاق عليه، بل كانت أيضاً أغلى بكثير. فبدلاً من 640 يورو المتوقعة، كلفت التذاكر 720 يورو.\n\nلذا أرجو منكم إعادة المبلغ الزائد المُحتسب إلى حسابي لدى بنك الهند (Bank of India) في مومباي. تجدون بيانات حسابي المصرفي أدناه.\n\nأرجو منكم تسوية هذه المسألة قريباً والرد عليّ بعدها.\n\nمع أطيب التحيات\nلويزا مارتن",
  },
};

const SCHMIDT = {
  items: {
    "21": {
      keyword: "bei Ihnen (Dativ, formell)",
      item_type: "pronoun",
      evidence_text: "im Januar hatte ich bei **Ihnen** für mich und meine Familie einen Flug nach Indien gebucht.",
      answer_translation: "لديكم/منكم",
      explanation_correct: "\"bei jemandem buchen\" (يحجز لدى جهة ما) يحكم حالة الجر؛ صيغة المخاطب الرسمية بحرف كبير: Ihnen.",
      explanation_wrong: "\"ihnen\" بحرف صغير تعني \"لهم\" (الغائبون، لا المخاطب)، و\"Sie\" حالة رفع/نصب لا جر.",
      grammar_example: "Wir haben den Flug bei Ihnen online gebucht.",
    },
    "22": {
      keyword: "was (Relativpronomen nach dem)",
      item_type: "pronoun",
      evidence_text: "unser Flug überhaupt nicht dem, **was** bei der Buchung am Telefon ausgemacht worden war.",
      answer_translation: "ما (الذي)",
      explanation_correct: "بعد اسم إشارة محايد مجرد مثل \"dem\" (بمعنى \"ذلك الشيء\") يُستخدم الضمير الموصول \"was\" للإشارة إلى فكرة غير محددة، لا \"das\"/\"wie\".",
      explanation_wrong: "\"das\" يُستخدم كضمير موصول بعد اسم محدد (لا بعد \"dem\" التجريدية هنا)، و\"wie\" أداة مقارنة لا ضمير وصل.",
      grammar_example: "Es kam nicht so, wie wir es geplant hatten -- das ärgert mich.",
    },
    "23": {
      keyword: "Obwohl (Gegensatz, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**Obwohl** ich ausdrücklich einen Direktflug nach Mumbai bestellt hatte, haben Sie mir einen Flug mit Zwischenstopp... ausgestellt.",
      answer_translation: "رغم أنّ",
      explanation_correct: "الفعل في نهاية الجملة (hatte) يدل على جملة ثانوية، و\"obwohl\" تصوغ التناقض بين ما طُلب وما تم تسليمه.",
      explanation_wrong: "\"Danach\" ظرف تتابع زمني لا يستدعي فعلاً في النهاية، و\"Nämlich\" أداة توضيح (أي/يعني) لا تصوغ تناقضاً.",
      grammar_example: "Obwohl ich pünktlich gebucht hatte, kam die Bestätigung zu spät.",
    },
    "24": {
      keyword: "mit Zwischenstopp (Merkmal)",
      item_type: "preposition",
      evidence_text: "haben Sie mir einen Flug **mit** Zwischenstopp in Delhi ausgestellt.",
      answer_translation: "مع/بها",
      explanation_correct: "\"mit\" هنا تصف خاصية مرافقة للرحلة (تتضمن توقفاً)؛ \"ein Flug mit Zwischenstopp\" = رحلة بها توقف.",
      explanation_wrong: "\"für\" تصف الغرض/المستفيد لا خاصية مرفقة، و\"zu\" لا تناسب وصف خاصية بهذا الشكل.",
      grammar_example: "Ich hätte gern einen Flug ohne Zwischenstopp.",
    },
    "25": {
      keyword: "erst (verspätet, nicht früher)",
      item_type: "adjective_adverb",
      evidence_text: "kamen so **erst** einen Tag später als geplant in Mumbai an.",
      answer_translation: "لم يحدث إلا",
      explanation_correct: "\"erst\" هنا تؤكد التأخر (\"لم نصل إلا بعد يوم إضافي\") -- عكس التوقع الأصلي.",
      explanation_wrong: "\"nach\" حرف جر يحتاج اسماً بعده لا يقف بمفرده كظرف هنا، و\"seit\" (منذ) تصف نقطة بداية مستمرة لا تأخراً محدداً.",
      grammar_example: "Wegen des Staus kamen wir erst zwei Stunden später an.",
    },
    "26": {
      keyword: "nicht nur ... sondern auch",
      item_type: "conjunction",
      evidence_text: "Der Flug war nicht nur anders als vereinbart, **sondern** auch noch viel teurer.",
      answer_translation: "بل",
      explanation_correct: "\"nicht nur... sondern auch\" أداة ربط مزدوجة ثابتة تضيف معلومة أقوى لما سبق نفيه جزئياً.",
      explanation_wrong: "\"besonders\" (خصوصاً) لا تصلح للربط بعد \"nicht nur\"، و\"sonst\" (وإلا/عادة) معنى مختلف تماماً.",
      grammar_example: "Der Flug war nicht nur verspätet, sondern auch überbucht.",
    },
    "27": {
      keyword: "der erwarteten 640 Euro (Genitiv Plural nach statt)",
      item_type: "preposition",
      evidence_text: "Statt **der** erwarteten 640 Euro kostete der Flug 720 Euro.",
      answer_translation: "بدلاً من",
      explanation_correct: "\"statt\" حرف جر يحكم حالة الملكية (Genitiv)؛ أداة التعريف بحالة الملكية الجمعية دائماً: der.",
      explanation_wrong: "\"deren\" ضمير ملكية موصول لا أداة تعريف بسيطة، و\"die\" حالة رفع/نصب -- لا تناسبان حالة الملكية المطلوبة بعد \"statt\".",
      grammar_example: "Statt der üblichen 50 Euro zahlten wir 80 Euro.",
    },
    "28": {
      keyword: "bitten um (feste Verb-Präposition)",
      item_type: "verb_prep",
      evidence_text: "Ich darf Sie daher **um** Rückzahlung der zu viel verrechneten Kosten... bitten.",
      answer_translation: "أطلب (استرداد)",
      explanation_correct: "الفعل \"bitten\" يرتبط ثابتاً بحرف الجر \"um\": jemanden um etwas bitten.",
      explanation_wrong: "\"für\" و\"zu\" لا ترتبطان بالفعل \"bitten\" بهذا المعنى إطلاقاً.",
      grammar_example: "Ich bitte Sie um eine schnelle Rückmeldung.",
    },
    "29": {
      keyword: "Konto bei der Bank (feste Wendung)",
      item_type: "preposition",
      evidence_text: "auf mein Konto **bei** der Deutschen Bank in Mumbai bitten.",
      answer_translation: "لدى",
      explanation_correct: "\"ein Konto bei einer Bank haben\" تعبير ثابت شائع؛ \"bei\" هنا تعني \"لدى/في\" فيما يخص الجهة المصرفية.",
      explanation_wrong: "\"an\" و\"vor\" لا تقترنان بـ\"Konto\" بهذا المعنى -- التعبير الثابت يستخدم \"bei\" حصراً.",
      grammar_example: "Ich habe ein Konto bei der Deutschen Bank.",
    },
    "30": {
      keyword: "mir antworten (Dativ)",
      item_type: "pronoun",
      evidence_text: "Ich bitte Sie, die Angelegenheit bald zu klären und **mir** dann zu antworten.",
      answer_translation: "لي",
      explanation_correct: "الفعل \"antworten\" يستدعي مفعولاً به غير مباشر بحالة الجر (\"jemandem antworten\")؛ الكاتب يتحدث عن نفسه: mir.",
      explanation_wrong: "\"mich\" حالة نصب لا تناسب \"antworten\"، و\"sich\" ضمير انعكاسي لا مرجع مباشر له هنا (الفاعل \"Sie\" مخاطب لا الكاتب).",
      grammar_example: "Bitte antworten Sie mir so schnell wie möglich.",
    },
  },
  translation: {
    text: "السيد شميت المحترم،\n\nفي يناير كنتُ قد حجزتُ لدى سيادتكم رحلة طيران إلى الهند لي ولعائلتي. للأسف لم تتطابق رحلتنا إطلاقاً مع ما تم الاتفاق عليه هاتفياً عند الحجز.\n\nرغم أنني طلبتُ صراحة رحلة مباشرة إلى مومباي، أصدرتم لي رحلة بها توقف في دلهي. اضطررنا لقضاء ليلة في دلهي فوصلنا إلى مومباي متأخرين بيوم كامل عما كان مخططاً. ولم يكن هذا كل شيء. فالرحلة لم تكن فقط مختلفة عما تم الاتفاق عليه، بل كانت أيضاً أغلى بكثير. فبدلاً من 640 يورو المتوقعة، كلفت الرحلة 720 يورو.\n\nلذا أرجو منكم إعادة المبلغ الزائد المُحتسب إلى حسابي لدى البنك الألماني (Deutsche Bank) في مومباي. لديكم بالفعل بيانات حسابي المصرفي.\n\nأرجو منكم تسوية هذه المسألة قريباً والرد عليّ بعدها.\n\nمع أطيب التحيات\nهاريش كورانا",
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

async function fixOliviaAnswerKey() {
  const rows = await q(`select g.id from sb_t1_gaps g join sb_exercises e on e.id = g.exercise_id where e.title = 'Olivia' and e.teil = 1 and g.gap_number = 30;`);
  if (rows.length !== 1) { console.error("SKIP Olivia answer-key fix: gap not found"); return; }
  console.log(`Olivia gap 30 answer key: b (mitnehmen) -> c (mitzunehmen)`);
  if (APPLY) await q(`update sb_t1_gaps set correct = 'c' where id = '${rows[0].id}';`);
}

async function main() {
  await fixOliviaAnswerKey();
  await setLearningAids("Olivia", OLIVIA);
  await setLearningAids("Samir", SAMIR);
  await setLearningAids("Schmidt", SCHMIDT);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

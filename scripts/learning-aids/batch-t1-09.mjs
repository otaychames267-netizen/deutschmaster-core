/**
 * Batch T1 #9: "Beatrice", "Buschhaus", "Catherine" -- these 3 had
 * learning_aids = null entirely (zero explanation content shown to
 * students at all, not even the first-pass retrofit). Built full content
 * from scratch: fetched real passage + gap options from sb_t1_passages /
 * sb_t1_gaps, individually reasoned every gap.
 *
 * Also fixes a real answer-key bug in "Buschhaus" gap 26: options were
 * obwohl/trotz/trotzdem, DB had "trotz" marked correct. "trotz" is a
 * preposition requiring a following Genitiv/Dativ noun (e.g. "trotz der
 * Kündigung") -- it cannot grammatically sit as a bare Mittelfeld adverb
 * before a verb phrase ("CHIP trotz ... kaufen" does not parse). "obwohl"
 * is a subordinating conjunction that must open its own clause, also
 * impossible here. Only "trotzdem" (a free-standing adverb, placeable in
 * the Mittelfeld) actually parses and gives a sensible meaning ("we'd be
 * glad if you buy CHIP at the kiosk now and then nevertheless"). Fixed the
 * answer key itself (sb_t1_gaps.correct) in addition to the explanation.
 *
 * Usage: node scripts/learning-aids/batch-t1-09.mjs [--apply]
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

const BEATRICE = {
  items: {
    "21": {
      keyword: "am Mittelmeer (an + dem = am)",
      item_type: "preposition",
      evidence_text: "wie du ja weißt, sind meine Eltern seit Anfang Mai in einem Haus **am** Mittelmeer in Spanien.",
      answer_translation: "على/عند (البحر)",
      explanation_correct: "\"an\" + \"dem\" تُدمجان إلزامياً في \"am\" قبل اسم بحر أو ساحل (am Meer, am Mittelmeer).",
      explanation_wrong: "\"in\" تصف الموقع داخل حيّز مغلق، و\"zum\" تصف اتجاه حركة -- لا موقعاً ساكناً على الساحل.",
      grammar_example: "Meine Großeltern haben ein kleines Ferienhaus am Bodensee.",
    },
    "22": {
      keyword: "schon früher (trotz Plan)",
      item_type: "adjective_adverb",
      evidence_text: "Aber dann sind sie doch **schon** früher gefahren.",
      answer_translation: "بالفعل/مسبقاً",
      explanation_correct: "\"schon\" هنا تؤكد أن السفر حدث \"بالفعل\" قبل الموعد المخطَّط -- بالتوافق مع \"doch\" (رغم كل شيء).",
      explanation_wrong: "\"erst\" تعني \"لم يحدث إلا لاحقاً\" (عكس المعنى المطلوب)، و\"bloß\" (مجرد/فقط) لا تناسب سياق التبكير الزمني هنا.",
      grammar_example: "Wir wollten erst im Sommer umziehen, sind aber schon im Frühling umgezogen.",
    },
    "23": {
      keyword: "meinem älteren Bruder (Dativ nach mit)",
      item_type: "pronoun",
      evidence_text: "wollte ich mit **meinem** älteren Bruder zusammen eine kleine Wohnung mieten.",
      answer_translation: "أخي (بحالة الجر)",
      explanation_correct: "\"mit\" يحكم دائماً حالة الجر (Dativ)، و\"Bruder\" مذكر، فيصبح الضمير الملكي \"meinem\".",
      explanation_wrong: "\"mein\" هي صيغة حالة الرفع (Nominativ) وحدها، و\"meinen\" صيغة حالة النصب (Akkusativ) -- كلاهما لا يناسب \"mit\".",
      grammar_example: "Sie ist mit ihrem jüngeren Bruder ins Kino gegangen.",
    },
    "24": {
      keyword: "mir (Dativ, anbieten)",
      item_type: "pronoun",
      evidence_text: "Eine Freundin hat **mir** dann ein Zimmer in ihrer Wohngemeinschaft angeboten.",
      answer_translation: "لي",
      explanation_correct: "الفعل \"anbieten\" (يعرض على) يستدعي مفعولاً به غير مباشر بحالة الجر: \"jemandem etwas anbieten\" -- هنا \"mir\".",
      explanation_wrong: "\"mich\" حالة نصب (تصلح كمفعول مباشر فقط)، و\"ihr\" ضمير غائب (لها) لا يشير إلى المتكلمة.",
      grammar_example: "Der Chef hat ihm eine bessere Stelle angeboten.",
    },
    "25": {
      keyword: "drei Freundinnen (Plural nach Zahl)",
      item_type: "noun",
      evidence_text: "Ich wohne jetzt mit drei **Freundinnen** zusammen in der Innenstadt.",
      answer_translation: "صديقات",
      explanation_correct: "بعد عدد (drei) يجب أن يكون الاسم بصيغة الجمع؛ والسياق (صديقة عرضت عليها غرفة في سكن مشترك نسائي) يرجّح صيغة المؤنث \"Freundinnen\".",
      explanation_wrong: "\"Freund\"/\"Freundin\" بالمفرد لا تتفقان مع العدد \"drei\" الذي يستوجب جمعاً.",
      grammar_example: "Er teilt sich die Wohnung mit zwei Kollegen.",
    },
    "26": {
      keyword: "obwohl (Gegensatz, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Ich bin sehr zufrieden, **obwohl** mein Zimmer recht klein ist.",
      answer_translation: "رغم أنّ",
      explanation_correct: "الفعل في نهاية الجملة (ist) يدل على جملة ثانوية، و\"obwohl\" أداة الربط التي تصوغ تناقضاً (راضية رغم صغر الغرفة).",
      explanation_wrong: "\"aber\" أداة ربط بين جملتين رئيسيتين فقط (لا تدفع الفعل للنهاية)، و\"trotz\" حرف جر يسبق اسماً لا جملة كاملة.",
      grammar_example: "Er lacht viel, obwohl er gerade Probleme in der Arbeit hat.",
    },
    "27": {
      keyword: "daran denken (denken an + Akk.)",
      item_type: "pronoun_adverb",
      evidence_text: "Ich staune selbst über meine Noten, wenn ich **daran** denke, wie wenig Zeit ich mir für Hausaufgaben nehme.",
      answer_translation: "في ذلك (عندما أفكر في)",
      explanation_correct: "الفعل \"denken\" يرتبط ثابتاً بحرف الجر \"an\"؛ وعند الإشارة إلى فكرة (لا شخص) يتحول \"an + das\" إلى ضمير ظرفي \"daran\".",
      explanation_wrong: "\"darauf\" ترتبط بأفعال أخرى (warten auf, sich freuen auf)، و\"darüber\" ترتبط بـ sprechen über / sich freuen über -- وليس denken an.",
      grammar_example: "Ich muss unbedingt daran denken, meine Mutter anzurufen.",
    },
    "28": {
      keyword: "wenig Zeit (unveränderlich vor Nomen)",
      item_type: "adjective_adverb",
      evidence_text: "wie **wenig** Zeit ich mir für Hausaufgaben nehme.",
      answer_translation: "قليل (من الوقت)",
      explanation_correct: "\"wenig\" كمحدد كمّي أمام اسم مفرد غير معدود (Zeit) يبقى بلا نهاية تصريفية.",
      explanation_wrong: "\"wenigen\"/\"weniger\" صيغتان مصرَّفتان تُستخدمان مع أسماء بصيغة الجمع أو بعد أداة تعريف، لا مع اسم مفرد مباشرة هنا.",
      grammar_example: "Ich habe heute leider nur wenig Zeit für dich.",
    },
    "29": {
      keyword: "Oder (Alternative, neuer Satz)",
      item_type: "conjunction",
      evidence_text: "Manchmal schicken mir meine Eltern eine E-Mail. **Oder** sie rufen an.",
      answer_translation: "أو",
      explanation_correct: "أداة ربط تُقدّم بديلاً لما سبق: إمّا بريد إلكتروني أو اتصال هاتفي.",
      explanation_wrong: "\"Sondern\" تُستخدم فقط بعد نفي صريح (nicht... sondern)، و\"Damit\" أداة غرض (لكي) لا تناسب هذا السياق البديل.",
      grammar_example: "Wir treffen uns am Samstag. Oder hast du keine Zeit?",
    },
    "30": {
      keyword: "bis jetzt (bisher)",
      item_type: "fixed_expression",
      evidence_text: "**Bis** jetzt habe ich jede Woche von ihnen gehört.",
      answer_translation: "حتى الآن",
      explanation_correct: "\"bis jetzt\" تعبير ثابت شائع بمعنى \"حتى الآن/إلى حد الآن\"، يُستخدم غالباً مع زمن الحاضر التام (Perfekt).",
      explanation_wrong: "\"Ab jetzt\" تعني \"من الآن فصاعداً\" (اتجاه معاكس نحو المستقبل)، و\"Seit jetzt\" تركيب غير صحيح نحوياً في الألمانية.",
      grammar_example: "Bis jetzt hat mir das neue Handy keine Probleme gemacht.",
    },
  },
  translation: {
    text: "عزيزتي بياتريس،\n\nكما تعلمين، يعيش والداي منذ بداية مايو في بيت على البحر المتوسط في إسبانيا. في البداية أراد والداي الانتظار حتى أنهي المرحلة الثانوية. لكنهما سافرا مبكراً على أي حال.\n\nعندما بلغتُ الثامنة عشرة في الصيف، أردتُ استئجار شقة صغيرة مع أخي الأكبر. لكن ذلك لم ينجح. عرضت عليّ صديقة غرفة في شقتها السكنية المشتركة. أسكن الآن مع ثلاث صديقات معاً في وسط المدينة. أنا راضية جداً، رغم أن غرفتي صغيرة نوعاً ما.\n\nلا توجد لدي مشاكل في المدرسة. أنا نفسي أستغرب من علاماتي عندما أفكر في مدى قلة الوقت الذي أخصصه للواجبات المنزلية.\n\nأحياناً يرسل لي والداي بريداً إلكترونياً. أو يتصلان بي. حتى الآن كنت أسمع منهما كل أسبوع.\n\nهذا كل شيء لليوم، إلى اللقاء ومع تحياتي\nزاسكيا",
  },
};

const BUSCHHAUS = {
  items: {
    "21": {
      keyword: "schade, dass (Adjektiv + dass-Satz)",
      item_type: "conjunction",
      evidence_text: "schade, **dass** Sie CHIP nicht weiter beziehen möchten.",
      answer_translation: "أنّ (يؤسفنا أنّ)",
      explanation_correct: "\"schade\" صفة تقييمية تأخذ جملة مفعول بها بـ\"dass\"، لا سبباً -- الفعل في النهاية (möchten) يؤكد جملة ثانوية.",
      explanation_wrong: "\"weil\" تصوغ سبباً (\"يؤسفنا لأنّ...\"، وهذا ليس المعنى المقصود)، و\"darum\" ظرف نتيجة لا يبدأ جملة ثانوية بهذا الشكل.",
      grammar_example: "Schade, dass du am Wochenende keine Zeit hast.",
    },
    "22": {
      keyword: "möchten (Sie, formell)",
      item_type: "verb",
      evidence_text: "schade, dass Sie CHIP nicht weiter beziehen **möchten**.",
      answer_translation: "ترغبون",
      explanation_correct: "الفاعل \"Sie\" (صيغة المخاطب الرسمية) يستدعي تصريف الفعل الوجهي بصيغة الجمع/الرسمية \"möchten\".",
      explanation_wrong: "\"möchte\" تصريف الغائب/المتكلم المفرد، و\"möchtest\" تصريف المخاطب غير الرسمي (du) -- لا يناسبان \"Sie\".",
      grammar_example: "Möchten Sie noch einen Kaffee?",
    },
    "23": {
      keyword: "unserem nächsten Heft (Dativ nach mit)",
      item_type: "adjective_adverb",
      evidence_text: "Die Belieferung beenden wir mit unserem **nächsten** Heft.",
      answer_translation: "القادم",
      explanation_correct: "\"mit\" يحكم حالة الجر، و\"Heft\" محايد؛ بعد ضمير ملكية في حالة الجر تأخذ الصفة نهاية الوزن الضعيف \"-en\": nächsten.",
      explanation_wrong: "\"nächste\" و\"nächstes\" نهايتان لحالتي الرفع/النصب المحايد، لا تناسبان حالة الجر (Dativ) المطلوبة بعد \"mit\".",
      grammar_example: "Wir sehen uns wieder bei unserem nächsten Treffen.",
    },
    "24": {
      keyword: "nicht mehr",
      item_type: "fixed_expression",
      evidence_text: "Sie erhalten daher die darauf folgende Ausgabe nicht **mehr**.",
      answer_translation: "لم يعد",
      explanation_correct: "\"nicht mehr\" تركيب نفي ثابت شائع بمعنى \"لم يعد/لن يعد يحدث\".",
      explanation_wrong: "\"nicht noch\" تركيب غير مستخدم بهذا الترتيب، و\"nicht nur\" تعني \"ليس فقط\" -- معنى مختلف تماماً.",
      grammar_example: "Er wohnt nicht mehr in dieser Stadt.",
    },
    "25": {
      keyword: "verlieren (wir, Präsens)",
      item_type: "verb",
      evidence_text: "Wir **verlieren** Sie natürlich nur ungern als Abonnenten",
      answer_translation: "نخسر",
      explanation_correct: "الفاعل \"wir\" يستدعي تصريف المضارع بصيغة المتكلم الجمع (النهاية -en): verlieren.",
      explanation_wrong: "\"verliert\" تصريف الغائب المفرد أو المخاطب الرسمي، و\"verloren\" صيغة الماضي التام (Partizip II) -- لا تصريف مضارع صحيح مع \"wir\".",
      grammar_example: "Wir verlieren langsam die Geduld mit dieser Warteschlange.",
    },
    "26": {
      keyword: "trotzdem (freistehendes Adverb im Mittelfeld)",
      item_type: "adjective_adverb",
      evidence_text: "und würden uns freuen, wenn Sie CHIP **trotzdem** ab und zu am Kiosk kaufen.",
      answer_translation: "رغم ذلك",
      explanation_correct: "\"trotzdem\" ظرف مستقل يمكن وضعه داخل الجملة (لا يبدأ بالضرورة الجملة)؛ هنا يعني \"رغم إلغاء الاشتراك\".",
      explanation_wrong: "\"trotz\" حرف جر يستوجب اسماً بعده مباشرة (trotz der Kündigung)، لا فعلاً؛ و\"obwohl\" أداة ربط يجب أن تبدأ جملتها الثانوية الخاصة بها -- كلاهما مستحيل نحوياً هنا.",
      grammar_example: "Es regnet stark. Wir gehen trotzdem spazieren.",
    },
    "27": {
      keyword: "Sie (Akkusativ, formell)",
      item_type: "pronoun",
      evidence_text: "Vielleicht gelingt es uns, **Sie** wieder von der Qualität von CHIP zu überzeugen.",
      answer_translation: "إياكم (المخاطب الرسمي)",
      explanation_correct: "الفعل \"überzeugen\" يستدعي مفعولاً به مباشراً بحالة النصب؛ صيغة المخاطب الرسمية بحالة النصب تُكتب بحرف كبير \"Sie\".",
      explanation_wrong: "\"Ihnen\" حالة جر (تناسب أفعالاً مثل \"helfen\"، لا \"überzeugen\")، و\"sie\" بحرف صغير تعني \"هي/هم\" -- إشارة خاطئة للمخاطب.",
      grammar_example: "Wir möchten Sie herzlich zu unserer Veranstaltung einladen.",
    },
    "28": {
      keyword: "Falls (Bedingung, Satzanfang)",
      item_type: "conjunction",
      evidence_text: "**Falls** Sie noch Fragen haben oder sich wieder für ein Abonnement entscheiden, stehen wir Ihnen gerne... zur Verfügung.",
      answer_translation: "في حال",
      explanation_correct: "الفعلان في نهاية الجملتين الثانويتين (haben, entscheiden) يدلان على أداة ربط شرطية تابعة؛ \"falls\" تصوغ حالة محتملة.",
      explanation_wrong: "\"Wann\" أداة استفهام (متى؟) لا تصوغ شرطاً، و\"Aber\" أداة ربط تنسيقية لا تدفع الفعل للنهاية ولا تصوغ شرطاً.",
      grammar_example: "Falls du Hilfe brauchst, ruf mich einfach an.",
    },
    "29": {
      keyword: "unter der Nummer (Dativ, feminin)",
      item_type: "noun",
      evidence_text: "stehen wir Ihnen gerne unter **der** Nummer 0781/639 6259... zur Verfügung.",
      answer_translation: "الرقم (بحالة الجر)",
      explanation_correct: "\"unter\" في هذا التعبير الثابت \"unter einer Nummer erreichbar sein\" يحكم حالة الجر؛ \"Nummer\" مؤنثة، فأداة التعريف \"der\".",
      explanation_wrong: "\"das\" أداة تعريف محايدة، و\"die\" أداة تعريف حالة الرفع/النصب المؤنثة -- لا تناسبان حالة الجر المؤنثة (der) المطلوبة هنا.",
      grammar_example: "Sie erreichen uns unter der E-Mail-Adresse info@chip.de.",
    },
    "30": {
      keyword: "Mit freundlichen Grüßen",
      item_type: "fixed_expression",
      evidence_text: "Mit **freundlichen** Grüßen",
      answer_translation: "أطيب (التحيات)",
      explanation_correct: "\"Mit freundlichen Grüßen\" هي عبارة الختام الرسمية الثابتة في كل رسالة ألمانية رسمية -- تُحفظ ككتلة واحدة.",
      explanation_wrong: "\"freundlich\" بلا تصريف و\"freundlichem\" (حالة جر مفرد) لا يناسبان الاسم الجمع \"Grüßen\" الذي يستوجب نهاية \"-en\".",
      grammar_example: "Mit freundlichen Grüßen, Ihre Personalabteilung",
    },
  },
  translation: {
    text: "السيد ماتياس بوشهاوس\nAlte Gasse 19\n80344 ميونخ\n\nمجلة الكمبيوتر (COMPUTER-MAGAZIN)\nميونخ، 21 مايو....\n\nإلغاء اشتراككم بتاريخ 15 مايو\n\nالسيد بوشهاوس المحترم،\n\nيؤسفنا أنكم لا ترغبون في مواصلة الاشتراك في مجلة CHIP. سننهي التوصيل بدءاً من عددنا القادم. لذلك لن تستلموا العدد الذي يليه.\n\nبالطبع لا يسرّنا أن نفقدكم كمشترك، ويسعدنا لو واصلتم شراء CHIP بين الحين والآخر من الكشك رغم ذلك. ولعلنا ننجح في إقناعكم مجدداً بجودة مجلة CHIP.\n\nإذا كانت لديكم أي أسئلة أو قررتم الاشتراك مجدداً، يسعدنا خدمتكم على الرقم 0781/639 6259 من الاثنين إلى الجمعة من الساعة 8 حتى 18.\n\nمع أطيب التحيات\nفريق خدمة اشتراكات CHIP",
  },
};

const CATHERINE = {
  items: {
    "21": {
      keyword: "erzählt habe (Perfekt, Partizip II)",
      item_type: "tense",
      evidence_text: "seit ich dir letzte Mal von meinem Sprachaufenthalt in der Schweiz **erzählt** habe, ist viel passiert.",
      answer_translation: "أخبرتُ (فعل تام)",
      explanation_correct: "\"habe\" المساعد موجود سلفاً، فالفجوة تحتاج صيغة الفاعل الثاني (Partizip II) للفعل erzählen: erzählt.",
      explanation_wrong: "\"erzähle\"/\"erzählen\" صيغتا مضارع، لا تُستخدمان مع الفعل المساعد \"habe\" في تركيب الماضي التام (Perfekt).",
      grammar_example: "Seit ich dir davon erzählt habe, hat sich vieles verändert.",
    },
    "22": {
      keyword: "dieses Land (Akkusativ, neutral)",
      item_type: "pronoun",
      evidence_text: "Ich kenne **dieses** Land jetzt schon recht gut.",
      answer_translation: "هذا (البلد)",
      explanation_correct: "\"kennen\" يستدعي مفعولاً به بحالة النصب؛ \"Land\" محايد، وحالة النصب المحايدة مطابقة لحالة الرفع: dieses.",
      explanation_wrong: "\"diese\" صيغة مؤنثة أو جمع، و\"diesen\" صيغة مذكر بحالة النصب -- لا تناسبان الاسم المحايد \"Land\".",
      grammar_example: "Ich finde dieses Buch wirklich spannend.",
    },
    "23": {
      keyword: "Aber (Gegensatz, Hauptsatz)",
      item_type: "conjunction",
      evidence_text: "Die Schweiz ist ja wirklich nicht groß. **Aber** in jeder Gegend wird ein anderer Dialekt... gesprochen.",
      answer_translation: "لكن",
      explanation_correct: "الترتيب الفعلي الطبيعي (wird gesprochen بعد الظرف) يدل على جملة رئيسية جديدة؛ \"aber\" تصوغ تبايناً بسيطاً بين صغر سويسرا وتنوعها اللغوي.",
      explanation_wrong: "\"sondern\" لا تُستخدم إلا بعد نفي واستبدال مباشر (nicht klein, sondern...)، وهذا ليس استبدالاً بل مجرد تباين؛ \"obwohl\" أداة ربط تابعة تستوجب فعلاً في النهاية، غير موجود هنا.",
      grammar_example: "Das Zimmer ist klein. Aber es ist sehr gemütlich.",
    },
    "24": {
      keyword: "für mich (persönliche Sicht)",
      item_type: "preposition",
      evidence_text: "Das ist **für** mich fast unglaublich!",
      answer_translation: "بالنسبة لي",
      explanation_correct: "\"für mich\" تعبير شائع للتعبير عن وجهة نظر شخصية (\"من منظوري\")، ويحكم \"für\" دائماً حالة النصب.",
      explanation_wrong: "\"an mich\" تدل على اتجاه/إرسال شيء نحو المتكلم (لا رأياً شخصياً)، و\"vor mich\" لا تصلح لهذا المعنى إطلاقاً.",
      grammar_example: "Diese Entscheidung ist für mich sehr wichtig.",
    },
    "25": {
      keyword: "wenn...dann (allgemeine Bedingung)",
      item_type: "conjunction",
      evidence_text: "und **wenn** man ankommt, dann sprechen die Leute dort immer noch dieselbe Sprache.",
      answer_translation: "عندما/إذا",
      explanation_correct: "تركيب \"wenn... dann\" يصوغ شرطاً/حالة عامة متكررة في زمن الحاضر -- وهذا يختلف عن \"als\" (لحدث ماضٍ فريد) و\"wann\" (أداة استفهام فقط).",
      explanation_wrong: "\"als\" تُستخدم حصراً لحدث ماضٍ وحيد، و\"wann\" أداة سؤال (متى؟) لا تصوغ شرطاً في جملة خبرية كهذه.",
      grammar_example: "Wenn man in Australien ankommt, dann ist die Zeitumstellung enorm.",
    },
    "26": {
      keyword: "schon (zeitliche Verstärkung)",
      item_type: "adjective_adverb",
      evidence_text: "Am Anfang hat mich das Sprachgemisch **schon** sehr verwirrt",
      answer_translation: "بالفعل",
      explanation_correct: "\"schon\" هنا تؤكد أن الارتباك حدث \"منذ البداية فعلاً\" -- تكثيف زمني، لا مجرد شدة.",
      explanation_wrong: "\"denn\" أداة تلطيف في الأسئلة أو أداة ربط سببية -- لا تناسب جملة خبرية كهذه، و\"ganz\" (تماماً) لا تحمل البُعد الزمني المقصود هنا.",
      grammar_example: "Nach nur einer Woche hatte ich schon viele neue Wörter gelernt.",
    },
    "27": {
      keyword: "jetzt (Zeitadverb, Position 1)",
      item_type: "adjective_adverb",
      evidence_text: "aber **jetzt** verstehe ich fast alles, wenn jemand auf Schweizerdeutsch zu mir spricht.",
      answer_translation: "الآن",
      explanation_correct: "قلب الفعل والفاعل (verstehe ich) بعد الفجوة يدل على ظرف زمني في الموضع الأول؛ \"jetzt\" يصوغ التباين مع مرحلة \"Am Anfang\" السابقة.",
      explanation_wrong: "\"früher\" (سابقاً) يعاكس المعنى المقصود تماماً، و\"seit\" حرف جر يحتاج اسماً بعده، لا يقف بمفرده كظرف.",
      grammar_example: "Am Anfang war es schwer, aber jetzt klappt es richtig gut.",
    },
    "28": {
      keyword: "Unterschiede (Plural)",
      item_type: "noun",
      evidence_text: "gibt es einige **Unterschiede**:",
      answer_translation: "اختلافات",
      explanation_correct: "بعد \"einige\" (بعض) يجب أن يكون الاسم بصيغة الجمع: Unterschiede.",
      explanation_wrong: "\"unterschied\" صيغة مفرد لا تتفق مع \"einige\"، و\"unterschieden\" صيغة حالة الجر الجمع -- لكن هنا الفعل \"es gibt\" يستوجب حالة النصب لا الجر.",
      grammar_example: "Zwischen den beiden Städten gibt es einige interessante Unterschiede.",
    },
    "29": {
      keyword: "müssen + Infinitiv (Pflicht)",
      item_type: "verb",
      evidence_text: "die Schüler **müssen** Vieles im Kopf behalten oder aufschreiben.",
      answer_translation: "يجب على",
      explanation_correct: "الفعلان في نهاية الجملة (behalten, aufschreiben) بصيغة المصدر المجرد يستدعيان فعلاً وجهياً مباشراً؛ \"müssen\" (يجب) يتوافق مع مصدر مجرد دون \"zu\".",
      explanation_wrong: "\"brauchen\" و\"haben\" في معنى الواجب يستلزمان \"zu + Infinitiv\" (brauchen zu / haben zu)، لا مصدراً مجرداً كما هنا.",
      grammar_example: "Die Kinder müssen jeden Tag ihre Hausaufgaben machen.",
    },
    "30": {
      keyword: "auf dem Computer (Dativ, Wechselpräposition)",
      item_type: "preposition",
      evidence_text: "machen eigentlich alle Aufgaben auf **dem** Computer.",
      answer_translation: "على (الكمبيوتر)",
      explanation_correct: "\"auf\" حرف جر ثنائي الحالة؛ هنا يصف موقعاً ثابتاً لا حركة، فيحكم حالة الجر: \"Computer\" مذكر → dem.",
      explanation_wrong: "\"den\" حالة النصب (تصلح لوصف حركة/اتجاه نحو الكمبيوتر، لا للعمل \"عليه\" فعلياً)، و\"der\" أداة تعريف مؤنثة لا تناسب الاسم المذكر \"Computer\".",
      grammar_example: "Die Präsentation liegt schon fertig auf dem Computer.",
    },
  },
  translation: {
    text: "عزيزتي كاثرين،\n\nمنذ آخر مرة حدثتك فيها عن إقامتي اللغوية في سويسرا، حدث الكثير. أعرف هذا البلد الآن معرفة جيدة إلى حد ما.\n\nسويسرا حقاً ليست كبيرة. لكن في كل منطقة يُتحدث بلهجة مختلفة أو حتى بلغة مختلفة تماماً. هذا يكاد يكون غير معقول بالنسبة لي! عندنا في أستراليا يقود المرء السيارة 24 ساعة بشكل مستقيم، وعندما يصل، يجد الناس هناك ما زالوا يتحدثون نفس اللغة.\n\nفي البداية أربكني هذا المزيج اللغوي كثيراً، لكنني الآن أفهم كل شيء تقريباً عندما يتحدث معي أحدهم بالألمانية السويسرية. لكن لا يمكنني الإجابة إلا بالألمانية الفصحى (الرسمية).\n\nبين المدرسة هنا ونظامنا التعليمي في أستراليا بعض الاختلافات: في سويسرا يتحدث المعلمون كثيراً ويجب على الطلاب حفظ الكثير في الذهن أو كتابته. في أستراليا نعمل غالباً ضمن مشاريع وننجز كل المهام تقريباً على الكمبيوتر.\n\nمع تحياتي\nجاك",
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

async function fixBuschhausAnswerKey() {
  const rows = await q(`select g.id from sb_t1_gaps g join sb_exercises e on e.id = g.exercise_id where e.title = 'Buschhaus' and e.teil = 1 and g.gap_number = 26;`);
  if (rows.length !== 1) { console.error("SKIP Buschhaus answer-key fix: gap not found"); return; }
  console.log(`Buschhaus gap 26 answer key: b (trotz) -> c (trotzdem)`);
  if (APPLY) await q(`update sb_t1_gaps set correct = 'c' where id = '${rows[0].id}';`);
}

async function main() {
  await fixBuschhausAnswerKey();
  await setLearningAids("Beatrice", BEATRICE);
  await setLearningAids("Buschhaus", BUSCHHAUS);
  await setLearningAids("Catherine", CATHERINE);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

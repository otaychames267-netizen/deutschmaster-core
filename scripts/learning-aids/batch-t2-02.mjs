/**
 * Batch T2 #2: "Frau Bauer", "Computerviren", "Deutschkurs". All had
 * learning_aids = null. All 30 gaps checked against their word banks --
 * no grammatical defects found in this batch (unlike ADRIAN in batch-01).
 *
 * Usage: node scripts/learning-aids/batch-t2-02.mjs [--apply]
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

const FRAU_BAUER = {
  items: {
    "31": {
      keyword: "interessiert sein an (fest)",
      item_type: "verb_prep",
      evidence_text: "bin an dem Filmprojekt sehr **interessiert**.",
      explanation_correct: "\"an etwas interessiert sein\" تركيب ثابت (صفة + حرف جر) يعبّر عن الاهتمام بشيء معيّن.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصف \"الاهتمام\" بهذا المعنى الدقيق.",
      grammar_example: "Ich bin sehr an dieser Stelle interessiert.",
    },
    "32": {
      keyword: "schon öfter (mehrmals)",
      item_type: "adjective_adverb",
      evidence_text: "Ich war schon **öfter** für einige Wochen im Ausland.",
      explanation_correct: "\"schon öfter\" ظرف بمعنى \"عدة مرات سابقاً/غالباً\" -- يصف تكرار سفرها للخارج.",
      explanation_wrong: "لا ظرف آخر في القائمة يصف التكرار بهذا المعنى.",
      grammar_example: "Ich war schon öfter in dieser Stadt.",
    },
    "33": {
      keyword: "nur einmal (Einschränkung)",
      item_type: "adjective_adverb",
      evidence_text: "Länger als ein halbes Jahr habe ich **nur** einmal im Ausland gelebt",
      explanation_correct: "\"nur einmal\" (مرة واحدة فقط) يحصر الحدث الطويل (أكثر من نصف عام) في مناسبة وحيدة.",
      explanation_wrong: "لا ظرف آخر في القائمة يفيد الحصر بهذا المعنى قبل \"einmal\".",
      grammar_example: "So etwas ist mir nur einmal in meinem Leben passiert.",
    },
    "34": {
      keyword: "vor zwei Jahren (Zeitpunkt)",
      item_type: "preposition",
      evidence_text: "und zwar **vor** zwei Jahren.",
      explanation_correct: "\"vor\" + مدة زمنية تعبير ثابت يعني \"منذ [مدة] مضت\" لتحديد نقطة في الماضي.",
      explanation_wrong: "لا حرف جر آخر في القائمة يصف نقطة زمنية ماضية محددة بهذا الشكل.",
      grammar_example: "Wir haben uns vor drei Jahren kennengelernt.",
    },
    "35": {
      keyword: "zu arbeiten (zu-Infinitiv)",
      item_type: "verb",
      evidence_text: "acht Monate im Tochterunternehmen der Firma in Portugal zu **arbeiten**",
      explanation_correct: "\"das Angebot machen, ... zu tun\" يستوجب مصدراً بـ\"zu\"؛ \"arbeiten\" (يعمل) يكمل الجملة عن العرض الوظيفي.",
      explanation_wrong: "لا فعل آخر في القائمة يصف \"العمل\" في شركة بهذا المعنى.",
      grammar_example: "Man bot ihm an, ein Jahr im Ausland zu arbeiten.",
    },
    "36": {
      keyword: "neu und unbekannt (Adjektivpaar)",
      item_type: "adjective_adverb",
      evidence_text: "alles sehr neu und **unbekannt** für mich war.",
      explanation_correct: "\"unbekannt\" (مجهول/غير مألوف) صفة تكمّل \"neu\" لوصف شعور الغربة في البداية.",
      explanation_wrong: "لا صفة أخرى في القائمة تصف \"غير مألوف\" بهذا المعنى الدقيق.",
      grammar_example: "Die Stadt war für mich am Anfang völlig unbekannt.",
    },
    "37": {
      keyword: "so schnell wie möglich",
      item_type: "fixed_expression",
      evidence_text: "wollte ich so schnell wie **möglich** wieder zurück.",
      explanation_correct: "\"so ... wie möglich\" تركيب ثابت يعني \"بأقصى درجة ممكنة من...\"؛ \"so schnell wie möglich\" = بأسرع وقت ممكن.",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل هذا التركيب الثابت بعد \"wie\".",
      grammar_example: "Bitte antworten Sie so schnell wie möglich.",
    },
    "38": {
      keyword: "erzählt haben (Perfekt)",
      item_type: "tense",
      evidence_text: "die mir auch über die Kultur und das Leben in Portugal **erzählt** haben.",
      explanation_correct: "\"haben\" في نهاية الجملة الموصولة يستدعي صيغة الفاعل الثاني للفعل erzählen: erzählt.",
      explanation_wrong: "لا فعل آخر في القائمة يعني \"أخبر/حكى\" بهذا المعنى ويأخذ صيغة فاعل ثانٍ متوافقة.",
      grammar_example: "Die Kollegen haben mir viel über die Firma erzählt.",
    },
    "39": {
      keyword: "würde ... erzählen (Konjunktiv II)",
      item_type: "tense",
      evidence_text: "ich **würde** gerne auch vor der Kamera darüber erzählen.",
      explanation_correct: "تركيب الحال الافتراضي المهذب \"würde + Infinitiv\" يعبّر عن استعداد/رغبة مهذبة.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح فعلاً مساعداً لهذا التركيب الافتراضي.",
      grammar_example: "Ich würde gern mehr über dieses Thema erzählen.",
    },
    "40": {
      keyword: "Falls (Bedingung, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**Falls** Sie noch weitere Fragen an mich haben, können Sie mich gerne anrufen",
      explanation_correct: "الفعل في نهاية الجملة (haben) يدل على جملة ثانوية شرطية؛ \"falls\" تصوغ حالة محتملة (إن كان لديكم أسئلة).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ شرطاً بهذا الشكل في بداية الجملة.",
      grammar_example: "Falls Sie Fragen haben, melden Sie sich gerne bei mir.",
    },
  },
  translation: {
    text: "نويندورف، بتاريخ...\n\nالسيدة باور المحترمة،\n\nقرأتُ إعلانكم في صحيفة Neue Presse وأنا مهتمة جداً بمشروع الفيلم.\n\nكنتُ في الخارج لعدة أسابيع في أكثر من مناسبة سابقاً. خصوصاً في الصيف حضرتُ دورات لغة كثيرة أثناء دراستي الجامعية. لم أعش في الخارج لأكثر من نصف عام إلا مرة واحدة، وذلك قبل عامين. قدّم لي مديري حينها عرضاً للعمل ثمانية أشهر في الشركة التابعة في البرتغال، وهو ما فعلته بالفعل.\n\nفي البداية كان الأمر صعباً جداً، لأنني لم أكن أعرف أحداً وكان كل شيء جديداً ومجهولاً بالنسبة لي. في الواقع أردتُ العودة بأسرع وقت ممكن. لكنني بعدها تعرّفتُ على زملاء لطفاء أخبروني أيضاً عن الثقافة والحياة في البرتغال.\n\nأعتقد أن تجربتي قد تكون مثيرة للاهتمام لكثير من الأشخاص الآخرين الراغبين في العيش بالخارج أيضاً، وأودّ بكل سرور أن أتحدث عن ذلك أمام الكاميرا. إذا كانت لديكم أي أسئلة إضافية لي، يمكنكم الاتصال بي بكل سرور، رقم هاتفي هو 07612/64788980.\n\nيسعدني أن أسمع منكم قريباً.\n\nمع أطيب التحيات\nكارولينه بوينتنر",
  },
};

const COMPUTERVIREN = {
  items: {
    "31": {
      keyword: "die schnelle Zusendung (Akkusativ, feminin)",
      item_type: "adjective_adverb",
      evidence_text: "vielen Dank für die **schnelle** Zusendung der Informationsmaterialien.",
      explanation_correct: "بعد أداة التعريف \"die\" (حالة النصب المؤنثة) تأخذ الصفة نهاية التصريف الضعيف: -e. \"schnell\" (سريع) تصف الإرسال.",
      explanation_wrong: "لا صفة أخرى في القائمة تصف \"سريع\" بهذا المعنى المناسب هنا.",
      grammar_example: "Vielen Dank für die schnelle Bearbeitung meiner Anfrage.",
    },
    "32": {
      keyword: "sowohl ... als auch",
      item_type: "conjunction",
      evidence_text: "sowohl für das Seminar Schutz gegen Computerviren als **auch** für Einführung ins Internet.",
      explanation_correct: "\"sowohl... als auch\" أداة ربط مزدوجة ثابتة بمعنى \"كلٌّ من... و...\" تربط بين خيارين.",
      explanation_wrong: "\"sondern\" تحتاج نفياً سابقاً مباشراً لتصلح، وهذا غير موجود بعد \"sowohl\".",
      grammar_example: "Das Angebot richtet sich sowohl an Anfänger als auch an Fortgeschrittene.",
    },
    "33": {
      keyword: "einige Fragen (Plural)",
      item_type: "adjective_adverb",
      evidence_text: "Dazu habe ich noch **einige** Fragen:",
      explanation_correct: "\"einige\" (بعض) كمحدد كمّي جمعي يطابق الاسم الجمع \"Fragen\" بحالة النصب.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح كمحدد كمّي جمعي هنا.",
      grammar_example: "Ich hätte noch einige Fragen zum Vertrag.",
    },
    "34": {
      keyword: "schon jetzt (bereits)",
      item_type: "adjective_adverb",
      evidence_text: "möchte ich mich **schon** jetzt auf das Seminar vorbereiten.",
      explanation_correct: "\"schon jetzt\" يعزز الرغبة في البدء \"من الآن فعلاً\"، رغم أن الدورة لم تبدأ بعد.",
      explanation_wrong: "لا ظرف آخر في القائمة يعزز \"jetzt\" بهذا المعنى.",
      grammar_example: "Ich möchte mich schon jetzt für den Kurs anmelden.",
    },
    "35": {
      keyword: "Könnten Sie ... schicken? (Konjunktiv II, höflich)",
      item_type: "tense",
      evidence_text: "**Könnten** Sie mir die Schulungsunterlagen bereits vorher schicken?",
      explanation_correct: "سؤال مهذب بصيغة الحال الافتراضي (Konjunktiv II) لفعل \"können\": könnten.",
      explanation_wrong: "لا فعل وجهي آخر في القائمة يصوغ سؤالاً مهذباً بهذا الشكل.",
      grammar_example: "Könnten Sie mir bitte weitere Informationen zusenden?",
    },
    "36": {
      keyword: "die beiden Seminare (beide, bestimmt)",
      item_type: "adjective_adverb",
      evidence_text: "Gibt es für die **beiden** Seminare noch genügend freie Plätze?",
      explanation_correct: "\"beide\" تشير إلى الدورتين المذكورتين سابقاً معاً (كلتاهما)؛ بعد أداة تعريف جمعية تأخذ نهاية -en.",
      explanation_wrong: "لا كلمة أخرى في القائمة تعني \"كلاهما/الاثنان معاً\" بهذا المعنى.",
      grammar_example: "Für die beiden Kurse sind noch Plätze frei.",
    },
    "37": {
      keyword: "Bis wann? (Frage nach Frist)",
      item_type: "adjective_adverb",
      evidence_text: "Bis **wann** muss ich mich spätestens anmelden?",
      explanation_correct: "\"bis wann\" أداة استفهام مباشرة عن الموعد النهائي للتسجيل.",
      explanation_wrong: "لا أداة استفهام أخرى في القائمة تناسب \"bis\" بهذا المعنى.",
      grammar_example: "Bis wann kann ich meine Anmeldung noch ändern?",
    },
    "38": {
      keyword: "möchte wissen (höfliches Bedürfnis)",
      item_type: "verb",
      evidence_text: "daher **möchte** ich wissen, ob man im Voraus bezahlen muss",
      explanation_correct: "الفعل الوجهي \"möchte\" يعبّر عن رغبة مهذبة في معرفة المعلومة (طريقة الدفع).",
      explanation_wrong: "\"muss\" و\"soll\" في القائمة لا يناسبان صياغة رغبة مهذبة في المعرفة بهذا الشكل.",
      grammar_example: "Ich möchte wissen, wie die Anmeldung genau funktioniert.",
    },
    "39": {
      keyword: "ob (indirekte Ja/Nein-Frage)",
      item_type: "conjunction",
      evidence_text: "möchte ich wissen, **ob** man im Voraus bezahlen muss oder auch vor Ort bar bezahlen kann.",
      explanation_correct: "سؤال غير مباشر بنعم/لا (هل يجب الدفع مسبقاً؟) يُصاغ بأداة الربط \"ob\"، والفعل في النهاية (muss) يؤكد ذلك.",
      explanation_wrong: "\"sondern\" لا تصوغ سؤالاً غير مباشر إطلاقاً، ولا تناسب هذا الموضع.",
      grammar_example: "Ich weiß nicht, ob ich bar oder mit Karte bezahlen soll.",
    },
    "40": {
      keyword: "Werde ich ... erhalten? (Futur I)",
      item_type: "tense",
      evidence_text: "**Werde** ich auch eine Kursbestätigung am Ende des Seminars erhalten?",
      explanation_correct: "تركيب المستقبل البسيط (Futur I): \"werde\" + مصدر في النهاية (erhalten)، مقلوب هنا لصياغة سؤال.",
      explanation_wrong: "لا فعل مساعد آخر في القائمة يصوغ زمن المستقبل بهذا الشكل.",
      grammar_example: "Werde ich nach dem Kurs ein Zertifikat bekommen?",
    },
  },
  translation: {
    text: "السادة المحترمون،\n\nشكراً جزيلاً على الإرسال السريع للمواد المعلوماتية. أنا مهتم بكل من دورة الحماية من فيروسات الكمبيوتر وأيضاً دورة مقدمة في الإنترنت.\n\nلدي أيضاً بضعة أسئلة حول ذلك: هل الفعالية \"مقدمة في الإنترنت\" مخصصة فعلاً للمبتدئين؟ بما أنه ليس لدي أي خبرة بعد، أودّ أن أبدأ الاستعداد للدورة من الآن. هل يمكنكم إرسال المواد التدريبية لي مسبقاً؟\n\nهل ما زالت هناك أماكن شاغرة كافية للدورتين؟ حتى متى يجب أن أسجّل على أبعد تقدير؟\n\nوالآن سؤال بخصوص الدفع: التحويلات المصرفية من الخارج مكلفة جداً، لذا أودّ أن أعرف هل يجب الدفع مسبقاً أم يمكن الدفع نقداً في الموقع.\n\nهل سأحصل أيضاً على شهادة إتمام الدورة في نهاية البرنامج؟\n\nمع أطيب التحيات\nويلي غيتس",
  },
};

const DEUTSCHKURS = {
  items: {
    "31": {
      keyword: "in den Sommerferien (zeitlich)",
      item_type: "preposition",
      evidence_text: "möchte **in** den nächsten Sommerferien mein Deutsch verbessern.",
      explanation_correct: "\"in\" + فترة زمنية محددة (الإجازة الصيفية القادمة) تعبير ثابت لوصف \"أثناء\" فترة معينة.",
      explanation_wrong: "لا حرف جر آخر في القائمة يناسب \"أثناء فترة الإجازة\" بهذا المعنى.",
      grammar_example: "In den Winterferien möchte ich meine Familie besuchen.",
    },
    "32": {
      keyword: "weil (Grund, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Klagenfurt ist für mich der ideale Ort, **weil** das nicht so weit weg von meiner Heimatstadt Zagreb ist.",
      explanation_correct: "الفعل في نهاية الجملة (ist) يدل على جملة ثانوية سببية؛ \"weil\" تفسر سبب اختيار كلاغنفورت.",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ سبباً بهذا الترتيب النحوي.",
      grammar_example: "Ich mag diese Stadt, weil sie so ruhig ist.",
    },
    "33": {
      keyword: "manchmal (gelegentlich)",
      item_type: "adjective_adverb",
      evidence_text: "Da kann ich an den Wochenenden vielleicht auch **manchmal** nach Hause fahren.",
      explanation_correct: "\"manchmal\" ظرف تكرار غير منتظم بمعنى \"أحياناً/من حين لآخر\".",
      explanation_wrong: "لا ظرف آخر في القائمة يصف تكراراً غير منتظم بهذا المعنى.",
      grammar_example: "Am Wochenende fahre ich manchmal aufs Land.",
    },
    "34": {
      keyword: "schon ganz gut (bereits erreichter Stand)",
      item_type: "adjective_adverb",
      evidence_text: "Ich kann zwar **schon** ganz gut schreiben",
      explanation_correct: "\"schon\" هنا تؤكد مستوى مُنجَزاً بالفعل (\"بالفعل جيد جداً في الكتابة\")، بالتوافق مع \"zwar\" (صحيح أنّ).",
      explanation_wrong: "لا ظرف آخر في القائمة يعزز \"ganz gut\" بهذا المعنى.",
      grammar_example: "Er kann schon ganz gut Deutsch sprechen.",
    },
    "35": {
      keyword: "zwar ... aber (Gegensatz)",
      item_type: "conjunction",
      evidence_text: "Ich kann zwar schon ganz gut schreiben, **aber** ich habe immer wieder Probleme beim freien Sprechen.",
      explanation_correct: "\"zwar... aber\" أداة ربط مزدوجة ثابتة تعترف بحقيقة (الكتابة الجيدة) ثم تصوغ تحفظاً (صعوبات التحدث).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تكمّل \"zwar\" بهذا الشكل المتناقض الثابت.",
      grammar_example: "Ich verstehe zwar viel, aber ich spreche noch nicht fließend.",
    },
    "36": {
      keyword: "der (Relativpronomen, Nominativ maskulin)",
      item_type: "pronoun",
      evidence_text: "ein vierwöchiger Deutschkurs, **der** nur vormittags stattfindet",
      explanation_correct: "الضمير الموصول يعود إلى \"Deutschkurs\" (مذكر) ويكون فاعل جملته الخاصة (stattfindet)، فيأخذ صيغة حالة الرفع المذكرة: der.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح ضميراً موصولاً بحالة الرفع المذكرة هنا.",
      grammar_example: "Ich suche einen Kurs, der am Nachmittag endet.",
    },
    "37": {
      keyword: "damit (Zweck, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "der nur vormittags stattfindet, **damit** ich nachmittags etwas anderes machen kann.",
      explanation_correct: "الفعل في نهاية الجملة (kann) يدل على جملة ثانوية؛ \"damit\" تصوغ الغرض من كون الدورة صباحية فقط.",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ غرضاً بهذا الشكل.",
      grammar_example: "Ich lerne am Vormittag, damit ich nachmittags frei habe.",
    },
    "38": {
      keyword: "Wenn (Bedingung, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "**Wenn** Sie einen passenden Kurs für mich haben, schicken Sie mir bitte... Informationen zu.",
      explanation_correct: "الفعل في نهاية الجملة (haben) يدل على جملة ثانوية شرطية؛ \"wenn\" تصوغ الشرط (إن وُجدت دورة مناسبة).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ شرطاً بهذا الشكل في بداية الجملة.",
      grammar_example: "Wenn Sie noch Fragen haben, schreiben Sie mir gerne.",
    },
    "39": {
      keyword: "wie möglich (Vergleich)",
      item_type: "fixed_expression",
      evidence_text: "schicken Sie mir bitte sobald **wie** möglich nähere Informationen zu.",
      explanation_correct: "\"... wie möglich\" تركيب ثابت يعزز التعبير الزمني (sobald) بمعنى \"في أسرع وقت ممكن\".",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل هذا التركيب الثابت بعد \"sobald\".",
      grammar_example: "Bitte melden Sie sich sobald wie möglich zurück.",
    },
    "40": {
      keyword: "ein paar (ein wenig)",
      item_type: "fixed_expression",
      evidence_text: "empfehlen Sie mir auch ein **paar** gute Webseiten über Klagenfurt",
      explanation_correct: "\"ein paar\" تعبير ثابت بمعنى \"بضعة/عدد قليل من\" قبل اسم جمع.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح كمحدد كمّي بهذا المعنى هنا.",
      grammar_example: "Können Sie mir ein paar Tipps für die Stadt geben?",
    },
  },
  translation: {
    text: "السادة المحترمون،\n\nقرأتُ إعلانكم وأنا مهتم جداً بعرضكم. أنا من كرواتيا وأودّ تحسين لغتي الألمانية خلال عطلة الصيف القادمة. كلاغنفورت هي المكان المثالي بالنسبة لي، لأنها ليست بعيدة جداً عن مدينتي زغرب.\n\nهناك يمكنني أحياناً العودة إلى المنزل في عطلات نهاية الأسبوع.\n\nوالآن بخصوص نفسي: عمري 24 عاماً ودرستُ الألمانية في المدرسة لمدة أربع سنوات. أستطيع الكتابة بشكل جيد جداً بالفعل، لكن لا تزال لدي مشاكل في التحدث بطلاقة. في الخريف أودّ بدء دراستي الجامعية في هامبورغ، وهو ما يتطلب مني أيضاً معرفة جيدة باللغة الألمانية.\n\nالأفضل بالنسبة لي هو دورة ألمانية مدتها أربعة أسابيع، تُقام فقط في الصباح، لكي أتمكن من فعل شيء آخر بعد الظهر. لدي وقت من بداية أغسطس حتى منتصف سبتمبر.\n\nإذا كان لديكم دورة مناسبة لي، يرجى إرسال المعلومات التفصيلية لي في أقرب وقت ممكن. أنا مهتم أيضاً ببرامجكم الترفيهية والدورات الخاصة وخيارات السكن وبالطبع الأسعار.\n\nيرجى أيضاً أن تنصحوني ببعض المواقع الإلكترونية الجيدة عن كلاغنفورت وبحيرة فيرتر.\n\nشكراً جزيلاً مسبقاً ومع أطيب التحيات\nإيفيتسا باليتش",
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
  await setLearningAids("Frau Bauer", FRAU_BAUER);
  await setLearningAids("Computerviren", COMPUTERVIREN);
  await setLearningAids("Deutschkurs", DEUTSCHKURS);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

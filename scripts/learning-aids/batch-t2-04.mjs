/**
 * Batch T2 #4: "Physik", "Maier" -- both had learning_aids = null, all 20
 * gaps checked and sound, full content written.
 *
 * "Joggen: Mehr als nur Laufen" is NOT completed in this batch. Found 2
 * confirmed answer-key bugs there (fixed below, independent of the
 * explanation-writing decision):
 *  - gap 32: "Herz-Kreislauf-Erkrankungen {{32}} ... die Todesursache
 *    Nummer Eins" -- plural subject "Erkrankungen" needs plural "SIND",
 *    not "IST" (basic subject-verb agreement, not a judgment call).
 *  - gap 37: "Rund 40 Prozent {{37}} Deutschen bringen zu viel auf die
 *    Waage" -- the clause's finite verb is already "bringen" (plural,
 *    agreeing with "40 Prozent"); inserting another finite verb ("SIND")
 *    here is a double-finite-verb impossibility. "ALLER" (genitive
 *    plural, "40 Prozent ALLER Deutschen" = "40 percent of all Germans")
 *    is the only bank word that parses.
 * These two together strongly suggest a 3-way data-entry mixup between
 * IST / SIND / ALLER for this exercise.
 *
 * Gaps 33, 34, and 40 in the same passage remain UNRESOLVED -- multiple
 * readings were tried (see conversation) and none of the 15 word-bank
 * entries parses cleanly against the surrounding text for any of them
 * (e.g. gap 33's "SOLLTE" sits directly before a zu-Infinitiv, which is
 * categorically impossible for a finite modal in German; no alternative
 * bank word was defensible either). Writing confident individually-
 * reasoned explanations for those 3 isn't possible without guessing, so
 * this exercise's learning_aids is intentionally left unset for now,
 * flagged for a dedicated pass rather than shipped as a guess.
 *
 * Usage: node scripts/learning-aids/batch-t2-04.mjs [--apply]
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

const PHYSIK = {
  items: {
    "31": {
      keyword: "kann (ich, Präsens)",
      item_type: "verb",
      evidence_text: "Leider **kann** ich Sie im Moment nicht anrufen, da das Telefon immer belegt ist.",
      explanation_correct: "الفعل الوجهي \"kann\" (يستطيع) مطابق للفاعل \"ich\"، يصف عدم القدرة على الاتصال حالياً.",
      explanation_wrong: "\"darf\" (يُسمح لي) يصف إذناً لا قدرة تقنية -- ليس هذا السبب المذكور (الهاتف مشغول).",
      grammar_example: "Leider kann ich Sie gerade nicht erreichen.",
    },
    "32": {
      keyword: "Deshalb (Grund, Verbinversion)",
      item_type: "adjective_adverb",
      evidence_text: "**Deshalb** schreibe ich Ihnen diese Mail.",
      explanation_correct: "\"deshalb\" (لذلك) ظرف نتيجة يربط بالسبب المذكور (الهاتف مشغول)، ويقلب ترتيب الفاعل والفعل.",
      explanation_wrong: "لا ظرف آخر في القائمة يعني \"لذلك/لهذا السبب\" بهذا المعنى.",
      grammar_example: "Ich konnte nicht anrufen. Deshalb schreibe ich eine Mail.",
    },
    "33": {
      keyword: "in zwei Jahren (Zukunft)",
      item_type: "preposition",
      evidence_text: "Mein Sohn Matthias macht **in** zwei Jahren sein Abitur",
      explanation_correct: "\"in\" + مدة زمنية تعبير ثابت يشير إلى نقطة مستقبلية (\"بعد سنتين من الآن\").",
      explanation_wrong: "لا حرف جر آخر في القائمة يصف نقطة مستقبلية بهذا الشكل.",
      grammar_example: "Sie macht in einem Jahr ihren Schulabschluss.",
    },
    "34": {
      keyword: "aber (Gegensatz)",
      item_type: "conjunction",
      evidence_text: "**aber** seine Leistungen sind zurzeit nicht so gut.",
      explanation_correct: "\"aber\" أداة ربط تنسيقية تصوغ تبايناً بسيطاً (رغم قرب الامتحان، النتائج ليست جيدة).",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ تبايناً بسيطاً بهذا الترتيب.",
      grammar_example: "Er ist fleißig, aber seine Noten sind noch nicht gut.",
    },
    "35": {
      keyword: "sich Sorgen machen (Dativ)",
      item_type: "fixed_expression",
      evidence_text: "Ich mache **mir** vor allem bei den Fächern Physik und Mathematik große Sorgen.",
      explanation_correct: "\"sich Sorgen machen\" تعبير ثابت انعكاسي بمعنى \"يقلق\"، والضمير الانعكاسي يطابق الفاعل \"ich\": mir.",
      explanation_wrong: "لا ضمير آخر في القائمة يطابق حالة الجر لصيغة المتكلم هنا.",
      grammar_example: "Ich mache mir Sorgen um meine Zukunft.",
    },
    "36": {
      keyword: "diese Fächer (Demonstrativpronomen)",
      item_type: "pronoun",
      evidence_text: "er brauche **diese** Fächer nicht.",
      explanation_correct: "\"diese\" ضمير إشارة يعود إلى المواد المذكورة سابقاً (Physik und Mathematik)، بحالة النصب الجمعية.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح ضمير إشارة جمعياً بهذا المعنى.",
      grammar_example: "Er interessiert sich nicht für diese Fächer.",
    },
    "37": {
      keyword: "ob (indirekte Ja/Nein-Frage)",
      item_type: "conjunction",
      evidence_text: "Fragen wollte ich nun, **ob** es bei Ihnen auch individuelle Physik – und Mathematiknachhilfe gibt.",
      explanation_correct: "سؤال غير مباشر بنعم/لا (هل توجد دروس تقوية؟) يُصاغ بأداة الربط \"ob\"، والفعل في النهاية (gibt) يؤكد ذلك.",
      explanation_wrong: "\"obwohl\" أداة تناقض لا سؤال، ولا تناسب هذا السياق الاستفساري.",
      grammar_example: "Ich möchte wissen, ob es noch freie Plätze gibt.",
    },
    "38": {
      keyword: "Wann (direkte Frage, Zeitpunkt)",
      item_type: "adjective_adverb",
      evidence_text: "Und **wann** finden die Stunden statt?",
      explanation_correct: "\"wann\" أداة استفهام مباشرة تبدأ سؤالاً عن الموعد، وتقلب ترتيب الفاعل والفعل (finden die Stunden).",
      explanation_wrong: "\"ob\" تصوغ سؤالاً بنعم/لا لا سؤالاً عن التوقيت.",
      grammar_example: "Wann finden die nächsten Kurse statt?",
    },
    "39": {
      keyword: "könnten (Konjunktiv II, höflich)",
      item_type: "tense",
      evidence_text: "dass Sie meinem Sohn helfen **könnten**.",
      explanation_correct: "صيغة مهذبة بالحال الافتراضي (Konjunktiv II) لفعل \"können\" تعبّر عن أمل مؤدب في المساعدة.",
      explanation_wrong: "\"kann\" و\"darf\" صيغتا مضارع مباشر -- أقل تهذيباً من التركيب الافتراضي المطلوب هنا.",
      grammar_example: "Ich hoffe, dass Sie mir dabei helfen könnten.",
    },
    "40": {
      keyword: "unter der Nummer (feste Wendung)",
      item_type: "preposition",
      evidence_text: "bin ich telefonisch **unter** der Nummer 0428-1734 zu erreichen.",
      explanation_correct: "\"unter einer Nummer erreichbar sein\" تعبير ثابت شائع لوصف كيفية الوصول هاتفياً لشخص ما.",
      explanation_wrong: "لا حرف جر آخر في القائمة يقترن بـ\"Nummer\" بهذا المعنى الثابت.",
      grammar_example: "Sie erreichen mich unter der Nummer 030-1234567.",
    },
  },
  translation: {
    text: "السادة المحترمون،\n\nقرأتُ إعلانكم باهتمام كبير وبأمل أيضاً. للأسف لا يمكنني الاتصال بكم حالياً، لأن الهاتف مشغول دائماً. لذلك أكتب لكم هذه الرسالة. سيتقدم ابني ماتياس لامتحان البكالوريا (Abitur) بعد سنتين، لكن نتائجه ليست جيدة في الوقت الحالي. أشعر بقلق كبير خصوصاً بخصوص مادتي الفيزياء والرياضيات. ماتياس ليس غبياً، لكنه كسول بعض الشيء ويعتقد أنه لا يحتاج إلى هاتين المادتين.\n\nأردتُ الآن أن أسأل، هل لديكم أيضاً دروس تقوية فردية في الفيزياء والرياضيات؟ ومتى تُقام الحصص؟ في وقت متأخر بعد الظهر أم في وقت مبكر من المساء؟ من المهم جداً بالنسبة لي أن تتمكنوا من مساعدة ابني.\n\nمن الساعة 19:30 يمكنكم الوصول إليّ هاتفياً على الرقم 0428-1734.\n\nمع أطيب التحيات\nيوزف مارتينيل",
  },
};

const MAIER = {
  items: {
    "31": {
      keyword: "vom letzten Wochenende (Dativ)",
      item_type: "noun",
      evidence_text: "ich habe Ihre Anzeige in der Zeitung vom letzten **Wochenende** gelesen",
      explanation_correct: "\"vom\" (von+dem) يحكم حالة الجر؛ \"Wochenende\" اسم محايد يصف عطلة نهاية الأسبوع الماضية.",
      explanation_wrong: "لا كلمة أخرى في القائمة تعني \"عطلة نهاية الأسبوع\" بهذا المعنى.",
      grammar_example: "Ich habe die Zeitung vom letzten Wochenende noch nicht gelesen.",
    },
    "32": {
      keyword: "sich interessieren für (fest)",
      item_type: "verb_prep",
      evidence_text: "interessiere mich sehr **für** das Angebot.",
      explanation_correct: "الفعل الانعكاسي \"sich interessieren\" يرتبط ثابتاً بـ\"für\": sich für etwas interessieren.",
      explanation_wrong: "لا حرف جر آخر في القائمة يرتبط بهذا الفعل الانعكاسي.",
      grammar_example: "Ich interessiere mich sehr für Ihre Angebote.",
    },
    "33": {
      keyword: "möchte (Wunsch, ich)",
      item_type: "verb",
      evidence_text: "Ich **möchte** mit meiner Mutter und ihrer Schwester... ein paar Tage Urlaub machen",
      explanation_correct: "الفعل الوجهي \"möchte\" (أودّ) يعبّر عن رغبة مهذبة، ويسبق مصدراً في النهاية (machen).",
      explanation_wrong: "لا فعل وجهي آخر في القائمة يعبّر عن رغبة بهذا الأسلوب المهذب.",
      grammar_example: "Ich möchte im Sommer mit meiner Familie verreisen.",
    },
    "34": {
      keyword: "ein paar Tage (Plural)",
      item_type: "noun",
      evidence_text: "ein paar **Tage** Urlaub machen",
      explanation_correct: "\"ein paar\" + اسم جمع؛ \"Tage\" (أيام) جمع \"Tag\"، يصف مدة قصيرة من العطلة.",
      explanation_wrong: "لا كلمة أخرى في القائمة تصلح اسماً جمعياً بهذا المعنى بعد \"ein paar\".",
      grammar_example: "Wir möchten ein paar Tage am Meer verbringen.",
    },
    "35": {
      keyword: "müssen (wir, Präsens)",
      item_type: "verb",
      evidence_text: "Ist die Benutzung des Hallenbads und der Sauna im Preis enthalten oder **müssen** wir diese extra bezahlen?",
      explanation_correct: "الفعل الوجهي \"müssen\" (يجب) مطابق للفاعل \"wir\"، يسأل عن الإلزام بدفع رسوم إضافية.",
      explanation_wrong: "\"dürfen\" (يُسمح) يصف إذناً لا إلزاماً -- ليس هذا السؤال المقصود.",
      grammar_example: "Müssen wir die Kurtaxe extra bezahlen?",
    },
    "36": {
      keyword: "ob (indirekte Ja/Nein-Frage)",
      item_type: "conjunction",
      evidence_text: "würde mich noch interessieren, **ob** Pensionisten eine Ermäßigung bekommen.",
      explanation_correct: "سؤال غير مباشر بنعم/لا (هل يحصلون على تخفيض؟) يُصاغ بأداة الربط \"ob\"، والفعل في النهاية (bekommen) يؤكد ذلك.",
      explanation_wrong: "\"obwohl\" أداة تناقض لا سؤال، ولا تناسب هذا السياق الاستفساري.",
      grammar_example: "Ich möchte wissen, ob es eine Ermäßigung für Familien gibt.",
    },
    "37": {
      keyword: "nichts (Verneinung)",
      item_type: "pronoun",
      evidence_text: "Sie schreiben darüber leider **nichts** in Ihrer Anzeige.",
      explanation_correct: "\"nichts\" ضمير نفي بمعنى \"لا شيء\" -- يشير إلى غياب أي معلومة عن التخفيض في الإعلان.",
      explanation_wrong: "\"keines\" ضمير نفي يطابق اسماً محدداً سابقاً، لا يصلح بمفرده هنا كمفعول به عام.",
      grammar_example: "Über die Preise schreiben Sie leider nichts.",
    },
    "38": {
      keyword: "Außerdem (zusätzliche Frage)",
      item_type: "adjective_adverb",
      evidence_text: "**Außerdem** möchte ich wissen, ob man... einfache Wanderungen unternehmen kann.",
      explanation_correct: "\"außerdem\" (علاوة على ذلك) ظرف إضافة يقدّم سؤالاً جديداً، ويقلب ترتيب الفاعل والفعل (möchte ich).",
      explanation_wrong: "لا ظرف آخر في القائمة يعني \"علاوة على ذلك\" بهذا المعنى.",
      grammar_example: "Außerdem möchte ich wissen, ob Haustiere erlaubt sind.",
    },
    "39": {
      keyword: "wenn (Bedingung, Verb am Ende)",
      item_type: "conjunction",
      evidence_text: "Ich wäre Ihnen sehr dankbar, **wenn** Sie mir Bildmaterial... zukommen lassen könnten.",
      explanation_correct: "صيغة مهذبة ثابتة \"ich wäre dankbar, wenn Sie... könnten\"؛ الفعل في النهاية (könnten) يؤكد الجملة الشرطية.",
      explanation_wrong: "لا أداة ربط أخرى في القائمة تصوغ شرطاً بهذا الشكل بعد \"dankbar\".",
      grammar_example: "Ich wäre Ihnen dankbar, wenn Sie mir bald antworten könnten.",
    },
    "40": {
      keyword: "im Voraus (vorher)",
      item_type: "fixed_expression",
      evidence_text: "Ich bedanke mich im **Voraus** für die Informationen.",
      explanation_correct: "\"im Voraus\" تعبير ثابت شائع بمعنى \"مسبقاً\"، خصوصاً في نهايات الرسائل الرسمية.",
      explanation_wrong: "لا كلمة أخرى في القائمة تكمّل \"im\" بهذا المعنى الثابت.",
      grammar_example: "Vielen Dank im Voraus für Ihre Mühe.",
    },
  },
  translation: {
    text: "السيد ماير المحترم،\n\nقرأتُ إعلانكم في صحيفة نهاية الأسبوع الماضي وأنا مهتمة جداً بعرضكم. أودّ قضاء بضعة أيام من العطلة في سبتمبر مع والدتي وأختها، وكلتاهما سيدتان في عمر متقدم نوعاً ما، ولذلك أحتاج إلى بعض المعلومات.\n\nهل استخدام المسبح المغطى والساونا مشمول في السعر أم يجب علينا دفع رسوم إضافية؟ كما يهمني معرفة ما إذا كان المتقاعدون يحصلون على تخفيض. للأسف لم تذكروا شيئاً عن ذلك في إعلانكم. بالإضافة إلى ذلك، أودّ معرفة ما إذا كان بالإمكان القيام برحلات مشي بسيطة في المنطقة المحيطة بالفندق.\n\nسأكون ممتنة جداً لو تمكنتم من إرسال صور للفندق والمناظر الطبيعية بالإضافة إلى قائمة أسعار.\n\nأشكركم مسبقاً على المعلومات.\n\nمع أطيب التحيات\n\nآنيليزه شنيبرغر",
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

async function fixJoggenAnswerKey() {
  const rows = await q(`select g.id, g.gap_number from sb_t2_gaps g join sb_exercises e on e.id = g.exercise_id where e.title = 'Joggen: Mehr als nur Laufen' and e.teil = 2 and g.gap_number in (32, 37) order by g.gap_number;`);
  const fixes = { 32: "SIND", 37: "ALLER" };
  for (const row of rows) {
    console.log(`Joggen gap ${row.gap_number} answer key -> ${fixes[row.gap_number]}`);
    if (APPLY) await q(`update sb_t2_gaps set correct_word = '${fixes[row.gap_number]}' where id = '${row.id}';`);
  }
}

async function main() {
  await fixJoggenAnswerKey();
  await setLearningAids("Physik", PHYSIK);
  await setLearningAids("Maier", MAIER);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

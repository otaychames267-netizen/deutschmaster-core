/**
 * Batch T1 #13: "Schröder", "Vollzwinkler". Both had learning_aids = null.
 * This closes out the last 2 of the 14 Teil-1 exercises that had zero
 * explanation content.
 *
 * Usage: node scripts/learning-aids/batch-t1-13.mjs [--apply]
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

const SCHRODER = {
  items: {
    "21": {
      keyword: "in das neue Geschäftsjahr (Übergang)",
      item_type: "preposition",
      evidence_text: "zum Start **in** das neue Geschäftsjahr haben wir uns für Sie etwas ganz Besonderes ausgedacht",
      answer_translation: "إلى/في",
      explanation_correct: "\"der Start in etwas\" تعبير شائع يصف الدخول/الانتقال إلى فترة جديدة، ويحكم \"in\" هنا حالة النصب (حركة نحو مرحلة جديدة).",
      explanation_wrong: "\"auf\" لا تناسب الانتقال إلى فترة زمنية بهذا الشكل، و\"über\" (حول/عبر) معنى مختلف تماماً.",
      grammar_example: "Wir wünschen Ihnen einen guten Start in das neue Jahr.",
    },
    "22": {
      keyword: "Mit dem Beginn (zeitlich zusammenfallend)",
      item_type: "preposition",
      evidence_text: "**Mit** dem Beginn des neuen Geschäftsjahres feiern wir unsere erfolgreiche Buchidee.",
      answer_translation: "مع",
      explanation_correct: "\"mit\" هنا تصف تزامناً زمنياً (\"بالتزامن مع بداية...\")، وتحكم حالة الجر.",
      explanation_wrong: "\"Von\" تصف نقطة انطلاق لا تزامناً، و\"Zwischen\" (بين) تحتاج طرفين للمقارنة الزمانية -- غير موجودين هنا.",
      grammar_example: "Mit dem Beginn des Sommers starten die Rabattaktionen.",
    },
    "23": {
      keyword: "schöne Gewinne (Plural, unbestimmt)",
      item_type: "adjective_adverb",
      evidence_text: "Es warten auf Sie sehr **schöne** Gewinne im Wert von vielen Tausend Euro.",
      answer_translation: "رائعة",
      explanation_correct: "\"Gewinne\" فاعل الفعل \"warten\"، جمع بلا أداة تعريف، فتأخذ الصفة نهاية التصريف القوي للرفع الجمعي: -e.",
      explanation_wrong: "\"schönen\" نهاية حالة الجر/النصب، و\"schönes\" نهاية محايدة مفردة -- لا تناسبان الفاعل الجمعي \"Gewinne\".",
      grammar_example: "Bei diesem Gewinnspiel warten schöne Preise auf die Teilnehmer.",
    },
    "24": {
      keyword: "einfach (mildernd, Imperativ)",
      item_type: "adjective_adverb",
      evidence_text: "Senden Sie uns **einfach** das beigefügte Antwortschreiben zurück",
      answer_translation: "ببساطة",
      explanation_correct: "\"einfach\" هنا ظرف تلطيف يخفف من حدة طلب الأمر (\"فقط أرسلوا لنا... بكل بساطة\").",
      explanation_wrong: "\"immer\" (دائماً) و\"noch\" (لا يزال) لا يناسبان هذا السياق التحفيزي التسويقي.",
      grammar_example: "Rufen Sie uns einfach an, wenn Sie Fragen haben.",
    },
    "25": {
      keyword: "unserem Versprechen (Dativ nach mit)",
      item_type: "pronoun",
      evidence_text: "Sie erhalten dieses Buch mit **unserem** Versprechen, es nach 10 Tagen zurückgeben zu können",
      answer_translation: "وعدنا",
      explanation_correct: "\"mit\" يحكم حالة الجر، و\"Versprechen\" محايد، فيصبح الضمير الملكي: unserem.",
      explanation_wrong: "\"unsere\" حالة رفع/نصب مؤنثة أو جمعية، و\"unseren\" حالة نصب مذكرة -- لا تناسبان حالة الجر المحايدة المطلوبة بعد \"mit\".",
      grammar_example: "Wir schicken Ihnen das Paket mit unserem besten Service.",
    },
    "26": {
      keyword: "natürlich (selbstverständlich)",
      item_type: "adjective_adverb",
      evidence_text: "Behalten Sie das Buch, was wir **natürlich** hoffen",
      answer_translation: "بالطبع",
      explanation_correct: "\"natürlich\" ظرف بمعنى \"بالطبع/بديهياً\" -- يعبر عن أمل الشركة الواضح أن يحتفظ العميل بالكتاب.",
      explanation_wrong: "\"schön\" صفة/ظرف بمعنى \"جميل\" لا يناسب هذا الموضع، و\"viele\" (كثيرون) لا يصلح نحوياً هنا إطلاقاً.",
      grammar_example: "Wir hoffen natürlich, dass Ihnen unser Angebot gefällt.",
    },
    "27": {
      keyword: "teilnehmen an (trennbares Verb)",
      item_type: "verb_prep",
      evidence_text: "Gleichzeitig nehmen Sie an einem Preisausschreiben **teil**.",
      answer_translation: "تشاركون",
      explanation_correct: "الفعل المنفصل \"teilnehmen\" (يشارك في) يرتبط ثابتاً بـ\"an\"؛ البادئة المنفصلة \"teil\" تنتقل إلى نهاية الجملة الرئيسية.",
      explanation_wrong: "\"mit\" و\"zu\" لا تكمّلان الفعل \"nehmen... teil\" هنا -- الفعل المنفصل \"teilnehmen\" له بنية ثابتة واحدة فقط.",
      grammar_example: "Auch Sie nehmen automatisch an der Verlosung teil.",
    },
    "28": {
      keyword: "neben den richtigen Zahlen (räumlich, gedruckt)",
      item_type: "preposition",
      evidence_text: "sollte Ihre Kundennummer **neben** den richtigen Zahlen sein",
      answer_translation: "بجانب",
      explanation_correct: "\"neben\" هنا تصف الموقع المطبوع الفعلي لرقم العميل بجانب الأرقام الرابحة على النموذج -- استخدام مكاني حرفي، لا مجازي.",
      explanation_wrong: "\"unter\" (تحت/من بين) و\"vor\" (أمام) لا يصفان هذا الموقع المطبوع المحدد \"بجانب\" الأرقام على الورقة.",
      grammar_example: "Ihre Gewinnnummer steht direkt neben den Losnummern.",
    },
    "29": {
      keyword: "unbedingt (dringende Aufforderung)",
      item_type: "adjective_adverb",
      evidence_text: "Antworten Sie **unbedingt** noch diese Woche!",
      answer_translation: "حتماً",
      explanation_correct: "\"unbedingt\" ظرف تأكيد قوي يعني \"لا محالة/حتماً\" -- يعزز إلحاح طلب الرد هذا الأسبوع.",
      explanation_wrong: "\"bald\" (قريباً) لا تحمل نفس درجة الإلحاح، و\"bereits\" (بالفعل) لا تناسب طلباً مستقبلياً.",
      grammar_example: "Bitte melden Sie sich unbedingt bis Freitag zurück.",
    },
    "30": {
      keyword: "immer noch (weiterhin)",
      item_type: "fixed_expression",
      evidence_text: "nehmen Sie immer **noch** an unserer Gewinnverteilung teil",
      answer_translation: "ما زال",
      explanation_correct: "\"immer noch\" تعبير ثابت شائع بمعنى \"ما زال/لا يزال مستمراً\" -- التأهل للمشاركة يستمر خلال الأسابيع الأربعة.",
      explanation_wrong: "\"schon\" (بالفعل) و\"schnell\" (بسرعة) لا يقترنان بـ\"immer\" بهذا المعنى الثابت.",
      grammar_example: "Auch nach der Frist nehmen Sie immer noch an der Aktion teil.",
    },
  },
  translation: {
    text: "إلى جميع العملاء\n\nاربحوا\n\nالسيد شرودر المحترم،\n\nمع بداية السنة المالية الجديدة، أعددنا لكم شيئاً مميزاً جداً: جائزة مغرية! مع بداية السنة المالية الجديدة، نحتفل بفكرة كتابنا الناجحة. شاركونا! تنتظركم جوائز رائعة بقيمة آلاف اليوروهات. برقم عضويتكم يمكنكم المشاركة في سحب جوائز. أرسلوا لنا ببساطة نموذج الرد المرفق واطلبوا من خلاله - دون أي مخاطرة - كتاب الشهر. تستلمون هذا الكتاب مع وعدنا بإمكانية إعادته خلال 10 أيام إن لم يعجبكم، دون دفع أي شيء! احتفظوا بالكتاب - وهو ما نأمله بالطبع - وادفعوا فقط 50 بالمئة من السعر المعتاد في المكتبات. وفي الوقت نفسه تشاركون في سحب الجوائز.\n\nيرجى ملاحظة: إذا كان رقم عضويتكم بجانب الأرقام الصحيحة، فلديكم فرصة الحصول على سيارة ورحلة وجوائز أخرى كثيرة. ردّوا حتماً هذا الأسبوع! عندها ستحصلون على أي حال على فرصة الفوز بالجائزة الكبرى - سيارة مرسيدس فئة S. إذا رددتم خلال الأسابيع الأربعة القادمة، فستظلون تشاركون في توزيع الجوائز - شريطة أن يكون لديكم رقم العضوية الصحيح.\n\nمع أطيب التحيات\nبيترا أوبرموزر\nمديرة قسم التسويق",
  },
};

const VOLLZWINKLER = {
  items: {
    "21": {
      keyword: "seit sechs Wochen (andauernd)",
      item_type: "preposition",
      evidence_text: "wir wohnen jetzt schon **seit** sechs Wochen in unserer neuen Wohnung.",
      answer_translation: "منذ",
      explanation_correct: "\"seit\" + مدة تصف حالة مستمرة من الماضي حتى الآن (يسكنون منذ ستة أسابيع وما زالوا).",
      explanation_wrong: "\"ab\" تصف نقطة بداية مستقبلية، و\"vor\" تصف نقطة زمنية منتهية في الماضي -- لا استمراراً حتى الآن.",
      grammar_example: "Wir wohnen schon seit drei Jahren in dieser Stadt.",
    },
    "22": {
      keyword: "uns (reflexiv, wir)",
      item_type: "pronoun",
      evidence_text: "nicht alles so eingerichtet, wie wir **uns** das wünschen.",
      answer_translation: "لأنفسنا",
      explanation_correct: "الفعل \"sich etwas wünschen\" يطابق ضميره الانعكاسي مع الفاعل \"wir\": uns.",
      explanation_wrong: "\"ihnen\" يطابق فاعلاً غائباً جمعياً (لهم)، و\"sich\" يطابق فاعلاً بصيغة الغائب -- لا يناسبان \"wir\".",
      grammar_example: "Wir wünschen uns ein ruhiges Leben auf dem Land.",
    },
    "23": {
      keyword: "würde ... dauern (Konjunktiv II, würde+Infinitiv)",
      item_type: "tense",
      evidence_text: "dass das einige Zeit **dauern** würde, bis alles fertig ist.",
      answer_translation: "أن يستغرق",
      explanation_correct: "\"würde\" الفعل المساعد موجود سلفاً، فتركيب الحال الافتراضي (würde + Infinitiv) يستوجب صيغة المصدر: dauern.",
      explanation_wrong: "\"dauert\" صيغة مضارع و\"gedauert\" صيغة الفاعل الثاني -- لا تتوافقان مع \"würde\" في هذا التركيب.",
      grammar_example: "Wir wussten, dass der Umzug einige Wochen dauern würde.",
    },
    "24": {
      keyword: "aussuchen (Infinitiv nach durften)",
      item_type: "verb",
      evidence_text: "Unsere beiden Kinder durften sich die Farben für die Wände selbst **aussuchen**.",
      answer_translation: "أن يختارا",
      explanation_correct: "الفعل الوجهي \"durften\" (سُمح لهما) يحكم مصدراً مجرداً بعده: aussuchen.",
      explanation_wrong: "\"ausgesucht\" صيغة الفاعل الثاني و\"aussuchten\" صيغة ماضٍ بسيط -- لا تتوافقان مع الفعل الوجهي \"durften\" الذي يستوجب مصدراً.",
      grammar_example: "Die Kinder durften sich ihr Spielzeug selbst aussuchen.",
    },
    "25": {
      keyword: "hat ... gefallen (Perfekt mit haben)",
      item_type: "tense",
      evidence_text: "Meinem Mann **hat** das am Anfang gar nicht gefallen",
      answer_translation: "(لم) يعجب",
      explanation_correct: "الفعل \"gefallen\" (يعجب) يُصرَّف في الماضي التام دائماً مع \"haben\"، رغم كونه يصف حالة/انطباعاً.",
      explanation_wrong: "\"ist\" تُستخدم مع أفعال حركة أو تغيّر حالة أخرى لا \"gefallen\"، و\"wird\" صيغة مستقبل لا تناسب سرد ماضٍ.",
      grammar_example: "Der neue Film hat mir sehr gut gefallen.",
    },
    "26": {
      keyword: "sich gewöhnen an → daran",
      item_type: "pronoun_adverb",
      evidence_text: "aber jetzt hat er sich **daran** gewöhnt.",
      answer_translation: "عليه (اعتاد)",
      explanation_correct: "الفعل \"sich gewöhnen\" يرتبط ثابتاً بـ\"an\"؛ عند الإشارة إلى فكرة (اختيار الألوان) يتحول \"an + das\" إلى ضمير ظرفي: daran.",
      explanation_wrong: "\"darüber\" ترتبط بأفعال أخرى (sich freuen über)، و\"davon\" ترتبط بـ sprechen von -- ليس sich gewöhnen an.",
      grammar_example: "Am Anfang war es laut hier, aber ich habe mich daran gewöhnt.",
    },
    "27": {
      keyword: "die (Relativpronomen, Akkusativ Plural)",
      item_type: "pronoun",
      evidence_text: "Wir warten auf die neuen Möbel, **die** wir gekauft haben.",
      answer_translation: "الذي (اشتريناه)",
      explanation_correct: "\"gekauft haben\" يحكم مفعولاً به بحالة النصب؛ الضمير الموصول يعود إلى \"Möbel\" (جمع)، وحالة النصب الجمعية مطابقة لحالة الرفع: die.",
      explanation_wrong: "\"das\" صيغة محايدة مفردة، و\"den\" صيغة نصب مذكرة مفردة -- لا تناسبان الاسم الجمع \"Möbel\".",
      grammar_example: "Das sind die Möbel, die wir letzte Woche bestellt haben.",
    },
    "28": {
      keyword: "nächsten Woche (Dativ, nach der)",
      item_type: "adjective_adverb",
      evidence_text: "In der **nächsten** Woche kommen sie endlich.",
      answer_translation: "القادم",
      explanation_correct: "\"in\" يحكم حالة الجر، و\"Woche\" مؤنثة؛ بعد أداة تعريف في حالة الجر تأخذ الصفة نهاية التصريف الضعيف: -en.",
      explanation_wrong: "\"nächster\" نهاية حالة الرفع بلا أداة تعريف، و\"nächstes\" نهاية محايدة -- لا تناسبان \"Woche\" (مؤنثة) بعد أداة التعريف \"der\".",
      grammar_example: "In der nächsten Woche haben wir endlich Zeit für einen Ausflug.",
    },
    "29": {
      keyword: "würden (Konjunktiv II, Plural)",
      item_type: "tense",
      evidence_text: "wenn Sie und Ihr Mann uns sehr bald besuchen **würden**.",
      answer_translation: "لو تزورون",
      explanation_correct: "أمنية افتراضية مهذبة (لو تزورونا) تستدعي تركيب الحال الافتراضي \"würden + Infinitiv\"، بصيغة الجمع مطابقة للفاعل \"Sie und Ihr Mann\".",
      explanation_wrong: "\"worden\" جزء من صيغة المبني للمجهول (لا علاقة له هنا)، و\"wurden\" ماضٍ بسيط للمبني للمجهول -- لا يناسبان أمنية افتراضية مهذبة.",
      grammar_example: "Wir würden uns freuen, wenn Sie uns bald besuchen würden.",
    },
    "30": {
      keyword: "unserer schönen Wohnung (Genitiv nach trotz)",
      item_type: "pronoun",
      evidence_text: "Und trotz **unserer** schönen neuen Wohnung sind wir ein bisschen traurig",
      answer_translation: "شقتنا (بحالة الملكية)",
      explanation_correct: "\"trotz\" يحكم حالة الملكية (Genitiv)؛ \"Wohnung\" مؤنثة، فيصبح الضمير الملكي: unserer.",
      explanation_wrong: "\"unser\" حالة رفع/نصب محايدة، و\"unseres\" حالة ملكية محايدة -- لا تناسبان الاسم المؤنث \"Wohnung\" بحالة الملكية.",
      grammar_example: "Trotz unserer guten Vorbereitung war die Prüfung schwer.",
    },
  },
  translation: {
    text: "عزيزتي (السيدة) فولتسفينكلر،\n\nنسكن الآن منذ ستة أسابيع في شقتنا الجديدة. صحيح أن كل شيء لم يُرتَّب بعد كما نتمنى، لكننا كنا نعلم أن ذلك سيستغرق بعض الوقت حتى يكتمل كل شيء. بالطبع اهتممنا أولاً بغرفة الأطفال. سُمح لطفلينا باختيار ألوان الجدران بنفسيهما. اختارا اللون الأزرق والأصفر. لم يعجب ذلك زوجي في البداية إطلاقاً، لكنه الآن اعتاد عليه. الآن لم يتبقَّ فعلياً سوى غرفة المعيشة.\n\nننتظر الأثاث الجديد الذي اشتريناه. سيصل أخيراً الأسبوع القادم. عندها يمكن أن يأتي الضيوف إلينا مجدداً. سنكون جميعاً سعداء جداً لو زرتمونا أنتم وزوجكم قريباً جداً. فقد كنا جيراناً لمدة خمس سنوات في النهاية! ورغم شقتنا الجديدة الجميلة، نشعر بحزن قليل لأننا لم نعد نسكن بجانبكم.\n\nمع أطيب التحيات\nصديقتكم\nإيدلتراوت آوغنتالر",
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

async function main() {
  await setLearningAids("Schröder", SCHRODER);
  await setLearningAids("Vollzwinkler", VOLLZWINKLER);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });

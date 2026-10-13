/** learning_aids for the 8 Hören exercises that had statements but no aids (T1 "Die Backlette" + T2 Auslöser/David/Laura/Leo Berger/Martin/Nora/Tarek) — 2026-10-05.
 * These exercises have NO audio and NO transcript, so — exactly like the existing Hören aids — each item is a listening-strategy hint grounded ONLY in the wording of
 * the statement ("achte auf …") plus the verdict from the answer key (read from the DB, never retyped). Nothing is claimed about what the audio says.
 * translation.questions = Arabic translation of every statement.
 * Usage: node scripts/learning-aids/build-hoeren-missing8.mjs → hoeren_missing8.json (then apply-learning-aids.mjs hoeren_exercises …) */
import { readFileSync, writeFileSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t);
}

// per exercise title: statement number -> [Arabic translation, keyword, German hint]
const D = {
  "Die Backlette": {
    46: ["تفتتح سلسلة المخابز فروعاً جديدة في بعض الولايات الاتحادية.", "neue Filialen", "Eine konkrete Handlung wie „neue Filialen eröffnen“ muss im Hörtext genau so vorkommen – achte auf das Verb und den Ort („in einigen Bundesländern“)."],
    47: ["إجراءات مواجهة نقص المعلمين تُظهر أولى النجاحات.", "erste Erfolge", "„erste Erfolge“ ist eine Bewertung des Ergebnisses: Prüfe, ob im Hörtext wirklich von Erfolgen die Rede ist oder nur von Maßnahmen."],
    48: ["في المعرض توجد عروض للأطفال والكبار.", "Kinder und Erwachsene", "Aufzählungen von Zielgruppen („Kinder und Erwachsene“) sind meist ein Detail, das du im Hörtext direkt wiederfindest."],
    49: ["الأندية الرياضية الألمانية تخسر حالياً أعضاء كثيرين.", "verlieren zurzeit viele Mitglieder", "Eine Entwicklung mit Mengenangabe („viele Mitglieder verlieren“) muss zur Richtung der Meldung passen – achte auf Verlust oder Zuwachs."],
    50: ["لن يعمل رئيس البلدية بعد الآن سياسياً في المستقبل.", "nicht mehr als Politiker tätig", "Die Verneinung „nicht mehr“ in Verbindung mit einer Zukunftsangabe verändert die Aussage stark – höre genau auf die Zukunftspläne der Person."],
  },
  "Auslöser": {
    46: ["دخّن توماس لأول مرة في سن 14.", "mit 14", "Zahlenangaben wie „mit 14“ (Alter) sind klassische Prüfpunkte – achte auf die genaue Zahl."],
    47: ["كان يدخّن بكثرة خصوصاً في مواقف الضغط.", "in Stresssituationen", "„besonders oft in …“ nennt eine bestimmte Situation – prüfe, ob genau diese Situation im Hörtext vorkommt."],
    48: ["كان سبب الإقلاع عن التدخين هو دخوله المستشفى.", "Krankenhausaufenthalt", "Ein konkreter Auslöser (hier: Krankenhausaufenthalt) wird im Hörtext meist wörtlich genannt – ein anderer Grund macht die Aussage falsch."],
    49: ["خطط للإقلاع عن التدخين مع بداية العام.", "zum Jahresanfang", "Zeitangaben wie „zum Jahresanfang“ solltest du genau mit dem Hörtext vergleichen."],
    50: ["في اليوم الأول كانت رغبته في السجائر ضعيفة بالكاد.", "kaum Verlangen", "„kaum“ verneint fast vollständig – prüfe, ob der erste Tag im Hörtext wirklich als leicht oder als schwer beschrieben wird."],
    51: ["ساعده الزملاء على الإقلاع.", "Kollegen halfen", "Wer hilft? Die genannte Personengruppe („Kollegen“) muss mit dem Hörtext übereinstimmen."],
    52: ["امتنع عمداً عن استخدام الوسائل الرقمية المساعدة أثناء الإقلاع.", "bewusst auf digitale Hilfsmittel verzichtet", "„bewusst verzichten“ ist eine starke Behauptung über eine Absicht – achte darauf, ob im Hörtext digitale Hilfsmittel erwähnt werden."],
    53: ["كان الانسحاب النفسي أصعب من الجسدي.", "psychische Entzug schwieriger als körperliche", "Vergleiche mit „schwieriger als“ kippen, wenn die Reihenfolge vertauscht ist – prüfe, was als schwerer beschrieben wird."],
    54: ["يشعر توماس اليوم بانتظام برغبة قوية في التدخين.", "regelmäßig starke Rauchlust", "„regelmäßig“ und „stark“ sind verstärkende Wörter – schon eine abgeschwächte Aussage im Hörtext macht die Aussage falsch."],
    55: ["بالنسبة لابنته التدخين مفهوم غريب تماماً.", "völlig fremder Begriff", "Absolute Formulierungen wie „völlig fremd“ gelten nur, wenn der Hörtext sie klar bestätigt."],
  },
  "David": {
    46: ["عمل ديفيد شتاينر سابقاً في قطاع المطاعم والضيافة.", "früher in der Gastronomie", "Der frühere Beruf ist ein konkretes Detail – vergleiche den genannten Beruf wörtlich mit dem Hörtext."],
    47: ["نشأ قراره بالعمل لحسابه الخاص أثناء فترة تدريب.", "während eines Praktikums", "Der Zeitpunkt oder Anlass einer Entscheidung („während eines Praktikums“) muss genau stimmen."],
    48: ["ساعده والداه في تمويل المقهى.", "Eltern … Finanzierung", "Wer finanziert? Achte darauf, ob die genannte Quelle (Eltern) im Hörtext vorkommt."],
    49: ["عثر ديفيد على الموقع بالأحرى بالصدفة.", "eher zufällig", "„eher zufällig“ beschreibt, wie etwas entstand – achte auf Wörter wie Zufall oder gezielte Suche."],
    50: ["لم يكن الإعلان عبر وسائل التواصل الاجتماعي مهماً بالنسبة له في البداية.", "nicht relevant", "Die Verneinung „nicht relevant“ kehrt die Bedeutung von „Werbung über soziale Medien“ um – prüfe die Wichtigkeit im Hörtext."],
    51: ["يقدّر كثير من الزبائن الدائمين الأجواء الشخصية.", "Stammgäste … persönliche Atmosphäre", "Zwei Details (wer + was geschätzt wird) müssen beide stimmen."],
    52: ["بالكاد غطّت الإيرادات في الأشهر الأولى التكاليف الجارية.", "kaum die laufenden Kosten", "„kaum“ + Kostenangabe ist eine Mengenbeschreibung – prüfe, ob die Einnahmen als ausreichend oder als knapp beschrieben werden."],
    53: ["لدى ديفيد الآن موظفان بدوام كامل.", "zwei Vollzeitkräfte", "Zahlen und Beschäftigungsform („zwei Vollzeitkräfte“) sind typische Prüfpunkte."],
    54: ["يسمح لنفسه بانتظام بفترات استراحة أطول خلال الموسم.", "regelmäßig längere Pausen", "„regelmäßig“ ist ein Häufigkeitswort – prüfe, ob Pausen wirklich oft oder nur selten vorkommen."],
    55: ["افتتاح فرع ثانٍ وارد بالنسبة له بعد بضع سنوات.", "zweiter Standort in einigen Jahren", "Zukunftspläne mit Zeitangabe („in einigen Jahren“) solltest du genau mit dem Hörtext vergleichen."],
  },
  "Laura": {
    46: ["عملت لورا سابقاً في وكالة إعلانات.", "Werbeagentur", "Der frühere Arbeitgeber bzw. Beruf („Werbeagentur“) ist ein konkretes Detail – prüfe es wörtlich."],
    47: ["خطرت لها فكرة الحياة الريفية خلال إجازة.", "während eines Urlaubs", "Der Anlass der Idee („während eines Urlaubs“) muss genau mit dem Hörtext übereinstimmen."],
    48: ["رأى والداها قرارها جيداً على الفور.", "sofort gut", "„sofort“ ist ein starkes Zeitwort – eine zögerliche Reaktion im Hörtext macht die Aussage falsch."],
    49: ["دعمها شريكها في عملية التغيير.", "Partner unterstützte", "Wer unterstützt wen? Prüfe die genannte Person (Partner) und die Richtung der Unterstützung."],
    50: ["لم تستعد لورا قبل الانتقال.", "nicht vorbereitet", "Die Verneinung „nicht vorbereitet“ ist das Gegenteil von Planung – achte auf Hinweise zu Vorbereitungen."],
    51: ["كانت البداية في المزرعة مرهقة جسدياً.", "körperlich belastend", "Bewertungen wie „körperlich belastend“ beschreiben die Art der Schwierigkeit – achte auf körperlich, finanziell oder psychisch."],
    52: ["تمارس لورا في مزرعتها تربية الحيوانات.", "Tierhaltung", "Konkrete Tätigkeiten auf dem Hof (z. B. Tierhaltung) erscheinen im Hörtext meist als Aufzählung – achte auf jede genannte Tätigkeit."],
    53: ["تدير متجراً صغيراً في المزرعة يبيع أغذية محلية.", "kleinen Hofladen", "Bei Aussagen über ein bestimmtes Angebot („Hofladen“) musst du prüfen, ob es wirklich genannt wird."],
    54: ["إيراداتها الحالية تفوق راتبها السابق.", "Einnahmen übertreffen früheres Gehalt", "Vergleiche zwischen Einnahmen und früherem Gehalt („übertreffen“) sind Fallen – die Richtung des Vergleichs muss stimmen."],
    55: ["ترغب لورا في تقديم دورات تدريبية في مزرعتها.", "Schulungen anbieten", "Zukunftswünsche („möchte … anbieten“) werden im Hörtext oft mit „plant“ oder „möchte“ eingeleitet – achte auf das Angebot."],
  },
  "Leo Berger": {
    46: ["يغيّر ليو بيرغر موقعه بانتظام.", "regelmäßig seinen Standort", "„regelmäßig“ beschreibt die Häufigkeit – prüfe, ob der Wechsel des Standorts als Regelfall genannt wird."],
    47: ["يومه بالكاد يتأثر بالطقس.", "kaum vom Wetter abhängig", "„kaum abhängig“ verneint fast vollständig – prüfe, welche Rolle das Wetter im Tagesablauf spielt."],
    48: ["كان ليو بيرغر يعمل سابقاً كثيراً في الهواء الطلق في الطبيعة.", "früher viel draußen", "Vergleich „früher“ und „heute“: Achte darauf, wo die Person früher gearbeitet hat und wo heute."],
    49: ["يتطلب تأمين المياه والطاقة تخطيطاً.", "Wasser- und Energieversorgung erfordert Planung", "Sachliche Aussagen zur Alltagsorganisation („erfordert Planung“) sind häufig Detailfragen – achte auf Wasser und Energie."],
    50: ["يثير هذا النمط من الحياة جدلاً في شبكات التواصل الاجتماعي.", "polarisiert in sozialen Netzwerken", "„polarisiert“ heißt, dass es gegensätzliche Meinungen gibt – prüfe, ob der Hörtext Reaktionen im Netz erwähnt."],
    51: ["يشعر ليو بيرغر بأنه أكثر صحة منذ حياة الفان.", "gesünder", "Eine Veränderung der Gesundheit (besser oder schlechter) muss in dieselbe Richtung gehen wie im Hörtext."],
    52: ["يتلقى محيطه ردود فعل فيها عدم تفهّم جزئياً.", "teilweise mit Unverständnis", "„teilweise“ schränkt ein – prüfe, ob das Umfeld nur zum Teil oder ganz anders reagiert."],
    53: ["تخدمه الفان في الوقت نفسه كمسكن وكمكان عمل.", "gleichzeitig Wohnraum und Arbeitsplatz", "Aussagen mit „gleichzeitig“ verlangen, dass beide Funktionen (wohnen und arbeiten) im Hörtext vorkommen."],
    54: ["التنقل المستمر بين الأماكن لا يشكّل لليو بيرغر أي عبء.", "keinerlei Belastung", "„keinerlei“ ist absolut – schon eine einzige genannte Belastung macht die Aussage falsch."],
    55: ["لا يستبعد ليو بيرغر حالياً حياة مستقرة.", "schließt ein festes Leben nicht aus", "Doppelte Verneinung („schließt … nicht aus“) bedeutet „hält es für möglich“ – prüfe genau die Zukunftseinstellung."],
  },
  "Martin": {
    46: ["أنهى مارتن تدريبه الأول كخباز.", "Ausbildung als Bäcker", "Der erste Beruf ist ein konkretes Detail – vergleiche die genannte Ausbildung wörtlich."],
    47: ["عمل أكثر من عشر سنوات في فرع بنك.", "mehr als zehn Jahre", "Zeitangaben mit Zahl („mehr als zehn Jahre“) sind klassische Prüfpunkte – achte auf die Jahreszahl und auf „mehr als“."],
    48: ["كان سبب تغيير المهنة فصلاً بسبب ظروف الشركة.", "betriebsbedingte Kündigung", "Der Grund für den Berufswechsel („betriebsbedingte Kündigung“) ist spezifisch – ein anderer Grund im Hörtext macht die Aussage falsch."],
    49: ["تفاعلت شريكة مارتن في البداية بشكل انتقادي مع قراره.", "zunächst kritisch", "„zunächst“ beschreibt die erste Reaktion – prüfe, wie die Partnerin am Anfang reagiert hat."],
    50: ["وجد مارتن البداية في المخبز صعبة جسدياً.", "körperlich hart", "Beschreibungen der Schwierigkeit („körperlich hart“) müssen zur Art der Belastung passen."],
    51: ["استطاع البدء في المخبز دون دورة نظافة.", "ohne Hygieneschulung", "„ohne …“ verneint eine Voraussetzung – prüfe, ob eine Schulung verlangt wurde."],
    52: ["يقدّر مارتن بوجه خاص الاتصال الشخصي بالزبائن.", "persönlichen Kontakt zu den Kunden", "„besonders schätzt“ nennt genau ein Hauptmotiv – prüfe, ob der Kundenkontakt wirklich als Vorteil genannt wird."],
    53: ["دخله الآن أعلى مما كان في البنك.", "Einkommen höher als bei der Bank", "Einkommensvergleiche („höher als“) sind Fallen – die Richtung des Vergleichs muss stimmen."],
    54: ["افتتاح مخبز خاص به غير وارد بالنسبة لمارتن.", "eigene Bäckerei kommt nicht infrage", "Die Verneinung „nicht infrage“ bei Zukunftsplänen kann das Gegenteil des Gesagten sein – achte auf Pläne."],
    55: ["ينصح بتخطيط دقيق قبل تغيير الوظيفة.", "sorgfältige Planung", "Ratschläge am Ende („Er empfiehlt …“) fassen oft die Kernbotschaft zusammen – achte auf die Empfehlung."],
  },
  "Nora": {
    46: ["كانت نورا فايدليش سابقاً مهندسة معمارية.", "früher Architektin", "Der frühere Beruf ist ein konkretes Detail – prüfe, welchen Beruf der Hörtext nennt."],
    47: ["نشأت الفكرة فقط أثناء عملية البناء.", "erst während des Bauprozesses", "„erst während …“ nennt den Zeitpunkt der Idee – prüfe, ob die Idee früher oder später entstand."],
    48: ["يوفّر الأرض زوجان مسنّان.", "älteres Ehepaar", "Wer stellt etwas zur Verfügung? Die genannte Person bzw. Personengruppe muss genau stimmen."],
    49: ["سار البناء في الغالب دون مشاكل.", "weitgehend problemlos", "„weitgehend problemlos“ ist eine Gesamtbewertung – achte auf genannte Schwierigkeiten beim Bau."],
    50: ["تسير الحياة اليومية جيداً حتى في مساحة صغيرة.", "auf kleinem Raum", "Aussagen zum Alltag („funktioniert auch auf kleinem Raum“) sind meist Kernaussagen – achte auf Bewertungen."],
    51: ["كان التخلي عن الممتلكات تحدياً.", "Loslassen von Besitz", "Eine Herausforderung („herausfordernd“) wird oft ausdrücklich benannt – achte auf das Thema Besitz."],
    52: ["تثقل عليها القيود في الراحة بشكل دائم.", "dauerhaft belasten", "„dauerhaft“ macht die Aussage absolut – ein Hinweis auf gelegentliche Belastung genügt nicht."],
    53: ["كان المحيط في البداية ينتقد إلى حد ما.", "anfangs eher kritisch", "„anfangs“ und „eher kritisch“: prüfe die erste Reaktion des Umfelds."],
    54: ["الشقق الأكبر غير واردة بالنسبة لها حالياً.", "größere Wohnungen kommen nicht infrage", "Die Verneinung „nicht infrage“ zeigt die aktuelle Einstellung – achte auf Aussagen zur künftigen Wohnsituation."],
    55: ["تعني البساطة بالنسبة لها جودة حياة أكبر.", "mehr Lebensqualität", "Schlussaussagen („bedeutet mehr Lebensqualität“) fassen die persönliche Bilanz zusammen – achte auf das Fazit."],
  },
  "Tarek": {
    46: ["بدأ تارك هيسه مسيرته المهنية كمخطط مدن.", "Stadtplaner", "Der berufliche Anfang ist ein konkretes Detail – prüfe den genannten Beruf."],
    47: ["نشأ مشروع الحديقة الأول في أرض شركة.", "Firmengelände", "Orte von Projekten („auf einem Firmengelände“) müssen genau stimmen – achte auf den ersten Standort."],
    48: ["بعض الحدائق موجودة في مواقف سيارات سابقة.", "ehemaligen Parkplätzen", "Ortsangaben („ehemalige Parkplätze“) sind häufige Prüfpunkte – prüfe die genannten Flächen."],
    49: ["يسعى المشروع في المقام الأول إلى أهداف اقتصادية.", "vor allem wirtschaftliche Ziele", "„vor allem“ legt den Hauptzweck fest – prüfe, ob wirtschaftliche oder andere Ziele im Vordergrund stehen."],
    50: ["المشاركة بمقابل مادي لكن عليها طلب كبير.", "kostenpflichtig, aber stark nachgefragt", "Zwei Teile müssen beide stimmen (kostenpflichtig und stark nachgefragt) – ein falscher Teil macht die ganze Aussage falsch."],
    51: ["توجد قواعد ثابتة لمن يزرع ماذا.", "feste Regeln", "„feste Regeln“ ist eine starke Behauptung – prüfe, ob es Regeln oder Freiheit gibt."],
    52: ["تهتم المنظمة بأنشطة حصاد منتظمة.", "regelmäßige Ernteaktionen", "Organisatorische Details („regelmäßige Ernteaktionen“) werden im Hörtext konkret genannt – achte auf Häufigkeit und Aufgabe."],
    53: ["يُسمح للأطفال بالمشاركة في العمل فقط تحت الإشراف.", "nur unter Aufsicht", "„nur unter …“ ist eine Einschränkung – prüfe, ob Kinder wirklich nur mit Aufsicht mitarbeiten dürfen."],
    54: ["انسحب بعض المشاركين مرة أخرى بسبب الفوضى.", "wegen der Unordnung ausgestiegen", "Begründungen („wegen der Unordnung“) müssen zum genannten Grund passen – prüfe den Ausstiegsgrund."],
    55: ["يستطيع تارك هيسه تخيّل توسّع دولي.", "internationale Ausweitung", "Zukunftsvorstellungen („kann sich … vorstellen“) bedeuten eine Möglichkeit, keinen Plan – achte auf Formulierungen wie „denkbar“."],
  },
};

const ex = await q(`select e.id, e.title from hoeren_exercises e where e.level='TELC_B2' and e.is_hidden=false and e.learning_aids is null and (select count(*) from hoeren_statements s where s.exercise_id=e.id)>0 order by e.title`);
if (ex.length !== Object.keys(D).length) throw new Error(`DB has ${ex.length} candidate exercises, I wrote ${Object.keys(D).length}`);
const out = {};
for (const e of ex) {
  const spec = D[e.title];
  if (!spec) throw new Error(`no data for "${e.title}"`);
  const st = await q(`select statement_number n, statement_text t, correct_answer a from hoeren_statements where exercise_id='${e.id}' order by statement_number`);
  const questions = {}, items = {};
  for (const s of st) {
    const d = spec[s.n];
    if (!d) throw new Error(`${e.title}: statement ${s.n} has no entry`);
    const [ar, kw, hint] = d;
    if (!norm(s.t).toLowerCase().includes(norm(kw).split(" … ").join(" ").split(" ")[0].toLowerCase()) && !kw.includes("…")) {
      // soft check: the first word of the keyword should appear in the statement (typos are caught early)
      throw new Error(`${e.title} #${s.n}: keyword "${kw}" not found in statement "${s.t}"`);
    }
    const verdict = s.a ? "Diese Aussage ist Richtig." : "Diese Aussage ist Falsch.";
    const text = `${hint} ${verdict}`;
    questions[String(s.n)] = ar;
    items[String(s.n)] = { keyword: kw, explanation_correct: text, explanation_wrong: text };
  }
  if (Object.keys(spec).length !== st.length) throw new Error(`${e.title}: ${Object.keys(spec).length} entries vs ${st.length} statements`);
  out[e.id] = { translation: { questions }, items };
}
function norm(s) { return s.replace(/\s+/g, " ").trim(); }
writeFileSync("scripts/learning-aids/hoeren_missing8.json", JSON.stringify(out, null, 1));
console.log("OK —", Object.keys(out).length, "exercises,", Object.values(out).reduce((n, e) => n + Object.keys(e.items).length, 0), "items");

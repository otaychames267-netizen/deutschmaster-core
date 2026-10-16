// B2 Mündlich Teil 3 topic "Buchmesse" (exists on telccfree, was missing here) -> Tunisia list. Writes t3-buchmesse.sql. Task text + ideas taken from telccfree (owner's own platform), toolbox written in our schema_version 3.
import fs from "node:fs";
const body_text = "An einem Kulturzentrum in Ihrer Stadt wird eine Buchmesse stattfinden. Sie wollen bei der Planung helfen. Überlegen Sie, was Sie tun können. Denken Sie beispielsweise an Informationsmaterial oder Poster.";
// [key, asker(A|B), frage, antwort, reaktion?]
const S = [
  ["start", "A", "Wie du weißt, soll im Kulturzentrum unserer Stadt eine Buchmesse stattfinden, und wir möchten bei der Planung helfen. Wo fangen wir an?", "Ich denke, wir sollten zuerst überlegen, wie wir die Leute über die Messe informieren."],
  ["werbung", "A", "Wie könnten wir möglichst viele Besucher erreichen?", "Wir könnten Poster in Schulen, Bibliotheken und Buchhandlungen aufhängen und die Messe in sozialen Medien ankündigen.", "Das halte ich für sinnvoll, weil wir dadurch viele unterschiedliche Leute ansprechen."],
  ["informationsmaterial", "A", "Brauchen wir auch Informationsmaterial?", "Ja, ein Flyer mit Datum, Uhrzeit und den wichtigsten Programmpunkten wäre hilfreich.", "Gute Idee, dann wissen die Besucher sofort, was angeboten wird."],
  ["programm", "B", "Was für ein Programm könnten wir organisieren?", "Vielleicht Lesungen von verschiedenen Autoren und einen Kinderbereich, in dem man kurze Geschichten vorliest.", "Das finde ich gut, so ist für jede Altersgruppe etwas dabei."],
  ["experten", "A", "Sollten wir auch eine Signierstunde mit einem Autor organisieren?", "Das wäre attraktiv, aber wir müssten den Autor rechtzeitig kontaktieren.", "Stimmt, das sollten wir gleich als Erstes klären."],
  ["stände", "B", "Was ist mit den Ständen?", "Wir könnten lokale Buchhandlungen und einige Verlage einladen und einen kleinen Bereich für gebrauchte Bücher einrichten.", "Gute Idee, so gibt es für jedes Budget etwas."],
  ["orientierung", "A", "Woran sollten wir bei der Orientierung der Besucher denken?", "Ein Lageplan und kleine Wegweiser wären hilfreich, dazu ein Informationsstand am Eingang.", "Das halte ich für sehr praktisch."],
  ["helfer", "B", "Wie viele Helfer brauchen wir?", "Einige am Eingang, zwei am Informationsstand und zusätzliche Personen für das Kinderprogramm.", "Das klingt nach einer vernünftigen Lösung."],
  ["aufgabenverteilung", "A", "Wie könnten wir die Aufgaben möglichst effizient aufteilen?", "Ich kann Poster und Flyer vorbereiten. Würdest du dann das Kulturzentrum kontaktieren und nach dem Raumplan fragen?", "Ja, das übernehme ich gerne."],
  ["abschluss", "A", "Dann können wir festhalten, dass wir mit Werbung, Lesungen, Kinderbereich, Ständen und einem Lageplan planen.", "Genau. So haben wir Werbung, Programm, Stände und Organisation abgedeckt.", "Perfekt, dann haben wir einen guten Plan."],
];
const struktur = S.map(([key, , frage, antwort, reaktion]) => ({ key, demo: reaktion ? { frage, antwort, reaktion } : { frage, antwort } }));
const beispieldialog = [];
for (const [key, asker, frage, antwort, reaktion] of S) {
  const other = asker === "A" ? "B" : "A";
  beispieldialog.push({ text: frage, section: key, speaker: asker }, { text: antwort, section: key, speaker: other });
  if (reaktion) beispieldialog.push({ text: reaktion, section: key, speaker: asker });
}
const speaking_toolbox = {
  struktur,
  erklaerung: {
    worauf_achten: ["Werbung, Programm, Stände und Organisation sollten alle vorkommen.", "Denken Sie auch an Informationsmaterial wie Poster und Flyer, so wie in der Aufgabe genannt.", "Ein Kinderprogramm und ein Lageplan machen die Messe für mehr Besucher attraktiv."],
    worum_geht_es: "An einem Kulturzentrum in Ihrer Stadt wird eine Buchmesse stattfinden. Sie und Ihr Gesprächspartner / Ihre Gesprächspartnerin wollen bei der Planung helfen.",
    wichtige_punkte: ["Wie machen wir Werbung (Poster, Flyer, soziale Medien)?", "Welches Programm bieten wir an (Lesungen, Kinderbereich, Signierstunde)?", "Wer stellt aus (Buchhandlungen, Verlage, gebrauchte Bücher)?", "Wer übernimmt welche Aufgabe (Helfer, Technik, Kontakt zum Kulturzentrum)?"],
    worum_geht_es_ar: "ستُقام في مركز ثقافي بمدينتكم معرضٌ للكتاب. أنتم وشريككم في الحوار تريدان المساعدة في التخطيط له.",
    was_wird_erwartet: "Sie überlegen gemeinsam, was Sie tun können: Werbung, Informationsmaterial, Programm, Stände und Organisation, und einigen sich auf einen Plan.",
    wichtige_punkte_ar: ["كيف نُعلن عن المعرض (ملصقات، منشورات، وسائل التواصل)؟", "ما البرنامج الذي نقدّمه (قراءات، ركن للأطفال، جلسة توقيع)؟", "من سيشارك بأجنحة (مكتبات، دور نشر، كتب مستعملة)؟", "من يتولّى أي مهمة (مساعدون، تقنيات، الاتصال بالمركز الثقافي)؟"],
    was_wird_erwartet_ar: "تفكّران معًا فيما يمكنكما فعله: الإعلان، المواد المعلوماتية، البرنامج، الأجنحة والتنظيم، ثم تتفقان على خطة.",
  },
  wortschatz: { verben: ["ankündigen", "einladen", "vorlesen", "aufhängen", "organisieren"], woerter: ["die Buchmesse", "die Lesung", "die Signierstunde", "der Stand", "der Lageplan"], adjektive: ["abwechslungsreich", "attraktiv", "übersichtlich", "kinderfreundlich"] },
  wortschatz_ar: { verben: ["يُعلن عن", "يدعو", "يقرأ بصوت عالٍ", "يعلّق", "ينظّم"], woerter: ["معرض الكتاب", "جلسة قراءة", "جلسة توقيع", "الجناح", "مخطط الموقع"], adjektive: ["متنوّع", "جذّاب", "واضح ومنظّم", "مناسب للأطفال"] },
  beispieldialog,
  schema_version: 3,
  moegliche_fragen: ["Sollen die Besucher Eintritt zahlen?", "Wie lange sollte die Messe dauern?", "Was machen wir, wenn zu viele Besucher kommen?", "Sollten wir auch Bücher für Kinder anbieten?", "Wie finden wir genug Helfer?", "Sollten wir ein kleines Café einrichten?", "Brauchen wir Technik wie Mikrofon und Beamer?"],
  moegliche_antworten_ideen: ["Der Eintritt sollte frei sein, damit möglichst viele Menschen kommen.", "Am besten zwei Tage, zum Beispiel Samstag und Sonntag.", "Wir könnten Ordner am Eingang einsetzen und die Besucherzahl im Blick behalten.", "Ein Büchertausch oder ein Lesewettbewerb könnte ein zusätzlicher Anziehungspunkt sein.", "Wir könnten Freiwillige aus Schulen und Sprachkursen fragen.", "Ein kleines Café im Foyer lädt zum Bleiben und Lesen ein.", "Für Lesungen brauchen wir auf jeden Fall ein Mikrofon und genug Stühle."],
};
const title = "Buchmesse im Kulturzentrum mitplanen";
const q = (s) => "$q$" + s + "$q$";
const sql = `insert into public.muendlich_materials (teil, category, level, title, body_text, theme_category, difficulty_level, position, sort_order, source_pdf, is_unassigned_center, is_free_sample, speaking_toolbox)
select 3, 'themen', 'TELC_B2', ${q(title)}, ${q(body_text)}, 'Medien', 'B2', 59, 0, 'telccfree.com (B2 Sprechen Teil 3, b2-s3-buchmesse)', false, false, ${q(JSON.stringify(speaking_toolbox))}::jsonb
where not exists (select 1 from public.muendlich_materials where teil = 3 and level = 'TELC_B2' and title = ${q(title)})
returning id, title, is_unassigned_center, position;`;
fs.writeFileSync("t3-buchmesse.sql", "-- 2026-10-16 owner: B2 Muendlich Teil 3 'Buchmesse' (in telccfree, missing here) -> Tunisia list. ROLLBACK: delete from public.muendlich_materials where teil = 3 and level = 'TELC_B2' and title = '" + title + "';\n" + sql);
console.log("sections", struktur.length, "lines", beispieldialog.length, "sql written");

// builds the new B2 Mündlich Teil 3 topic (Tunisia list = is_unassigned_center false) and writes t3-new-topic.sql. usage: node t3-new-topic.mjs
import fs from "node:fs";
const body_text = "In einem Museum in Ihrer Stadt soll es eine Sonderausstellung zum Thema „Literatur der Welt“ geben. Sie sollen bei der Planung der Eröffnungsveranstaltung helfen. Überlegen Sie, wie das Programm der Eröffnung sein könnte und was Sie alles brauchen. Planen Sie gemeinsam, was zu tun ist.";
// [key, asker(A|B), frage, antwort, reaktion?]
const S = [
  ["start", "A", "Wir sollen ja bei der Eröffnung der Sonderausstellung „Literatur der Welt“ im Museum helfen. Wo fangen wir an?", "Ich würde sagen, wir überlegen zuerst, was bei der Eröffnung alles passieren soll."],
  ["ziel", "A", "Was sollte bei der Eröffnung das Hauptziel sein?", "Meiner Ansicht nach sollten wir möglichst viele Besucher für Bücher und Kulturen aus aller Welt begeistern.", "Das halte ich für ein überzeugendes Ziel."],
  ["zeitpunkt", "A", "Wann wäre der beste Zeitpunkt für die Eröffnung?", "Am sinnvollsten wäre wahrscheinlich ein Freitagabend, dann haben auch Berufstätige Zeit.", "Das klingt nach einer vernünftigen Lösung."],
  ["gaeste", "A", "Wen sollten wir zur Eröffnung einladen?", "Ich würde vorschlagen, neben Schulen und Buchhandlungen auch Autoren, Übersetzer und die lokale Presse einzuladen.", "Das finde ich gut, so erreichen wir ein breites Publikum."],
  ["programm", "B", "Wie könnte das Programm der Eröffnung aussehen?", "Eine Begrüßungsrede der Museumsleiterin, danach eine kurze Lesung aus Werken verschiedener Länder und zum Schluss ein Rundgang durch die Ausstellung.", "Das wäre sicher abwechslungsreich, so bleibt es nicht bei langen Reden."],
  ["experten", "A", "Sollten wir auch einen Autor oder eine Expertin als Gastredner einladen?", "Ja, das würde ich auf jeden Fall empfehlen, ein Autor könnte etwas über die Weltliteratur erzählen.", "Das halte ich für sinnvoll, so bekommen wir fundierte Informationen."],
  ["essen", "B", "Was sollten wir zu essen und trinken anbieten?", "Ich würde vorschlagen, kleine Snacks und Getränke aus verschiedenen Ländern anzubieten, passend zum Thema.", "Das wäre eine schöne Idee, das passt gut zum Motto."],
  ["materialien", "A", "Was brauchen wir alles für die Veranstaltung?", "Wir brauchen auf jeden Fall ein Mikrofon, Stühle, einen Beamer und Programmhefte für die Gäste.", "Vielleicht sollten wir auch Namensschilder und Plakate besorgen."],
  ["werbung", "A", "Wie könnten wir möglichst viele Besucher erreichen?", "Wir könnten Plakate in Bibliotheken und Schulen aufhängen und die Eröffnung in sozialen Medien bewerben.", "Das halte ich für sinnvoll, weil wir dadurch eine größere Zielgruppe ansprechen."],
  ["aufgabenverteilung", "A", "Wie könnten wir die Aufgaben möglichst effizient aufteilen?", "Ich könnte die Einladungen und die Werbung übernehmen. Würdest du dann die Technik und das Catering organisieren?", "Ja, das übernehme ich gerne."],
  ["abschluss", "A", "Dann können wir festhalten, dass wir die Eröffnung an einem Freitagabend mit Rede, Lesung und Rundgang veranstalten.", "Genau. So wird die Eröffnung ein gelungener Auftakt für die Sonderausstellung.", "Perfekt, dann haben wir einen guten Plan."],
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
    worauf_achten: ["Das Programm sollte abwechslungsreich sein und nicht zu lang dauern.", "Das Thema „Literatur der Welt“ sollte sich im Programm widerspiegeln, zum Beispiel durch Lesungen aus verschiedenen Ländern.", "Denken Sie an Technik, Einladungen, Werbung und die Aufgabenverteilung."],
    worum_geht_es: "In einem Museum in Ihrer Stadt soll es eine Sonderausstellung zum Thema „Literatur der Welt“ geben. Sie und Ihr Gesprächspartner / Ihre Gesprächspartnerin sollen bei der Planung der Eröffnungsveranstaltung helfen.",
    wichtige_punkte: ["Wie sieht das Programm der Eröffnung aus (Rede, Lesung, Rundgang)?", "Wer wird eingeladen (Gäste, Autoren, Presse)?", "Was brauchen wir (Technik, Stühle, Programmhefte, Essen und Getränke)?", "Wer übernimmt welche Aufgabe?"],
    worum_geht_es_ar: "ستُقام في متحف بمدينتكم معرضٌ خاص بعنوان «أدب العالم». المطلوب منكم ومن شريككم في الحوار المساعدة في التخطيط لحفل الافتتاح.",
    was_wird_erwartet: "Sie überlegen gemeinsam, wie das Programm der Eröffnung aussehen könnte und was Sie alles dafür brauchen, und einigen sich auf einen Plan.",
    wichtige_punkte_ar: ["كيف يبدو برنامج الافتتاح (كلمة، قراءة، جولة)؟", "من سيتم دعوته (ضيوف، كتّاب، صحافة)؟", "ماذا نحتاج (التقنيات، الكراسي، كتيّبات البرنامج، الطعام والمشروبات)؟", "من يتولّى أي مهمة؟"],
    was_wird_erwartet_ar: "تفكّران معًا في شكل برنامج الافتتاح وفي كل ما تحتاجانه لتنفيذه، ثم تتفقان على خطة.",
  },
  wortschatz: { verben: ["eröffnen", "einladen", "vorlesen", "begrüßen", "organisieren"], woerter: ["die Sonderausstellung", "die Eröffnungsveranstaltung", "die Lesung", "der Gastredner", "das Programmheft"], adjektive: ["abwechslungsreich", "festlich", "international", "kulturell"] },
  wortschatz_ar: { verben: ["يفتتح", "يدعو", "يقرأ بصوت عالٍ", "يرحّب", "ينظّم"], woerter: ["المعرض الخاص", "حفل الافتتاح", "القراءة الأدبية", "المتحدّث الضيف", "كتيّب البرنامج"], adjektive: ["متنوّع", "احتفالي", "دولي", "ثقافي"] },
  beispieldialog,
  schema_version: 3,
  moegliche_fragen: ["Wie lange sollte die Eröffnung dauern?", "Sollen die Gäste Eintritt zahlen oder ist die Eröffnung kostenlos?", "Brauchen wir eine Anmeldung, damit wir besser planen können?", "Was machen wir, wenn mehr Gäste kommen als erwartet?", "Sollten wir die Eröffnung auch fotografieren oder filmen?", "Wer hält die Begrüßungsrede?", "Sollten wir Bücher aus verschiedenen Ländern zum Anschauen auslegen?"],
  moegliche_antworten_ideen: ["Etwa eineinhalb bis zwei Stunden, damit es nicht zu lang wird.", "Die Eröffnung sollte kostenlos sein, damit möglichst viele Besucher kommen.", "Eine Anmeldeliste wäre sinnvoll, damit wir die Zahl der Gäste besser einschätzen können.", "Wir könnten zusätzliche Stühle bereitstellen und einen zweiten Raum öffnen.", "Ein Fotograf könnte die Eröffnung dokumentieren, das nutzen wir später für die Werbung.", "Die Museumsleiterin oder ein Vertreter der Stadt könnte die Rede halten.", "Ja, ausgewählte Bücher aus verschiedenen Ländern in Vitrinen auszustellen, wäre eine schöne Idee."],
};
console.log("sections:", struktur.map((s) => s.key).join(" "), "| dialog lines:", beispieldialog.length);
const title = "Eröffnungsveranstaltung für eine Sonderausstellung im Museum planen";
const q = (s) => "$q$" + s + "$q$";
const sql = `insert into public.muendlich_materials (teil, category, level, title, body_text, theme_category, difficulty_level, position, sort_order, source_pdf, is_unassigned_center, is_free_sample, speaking_toolbox)
select 3, 'themen', 'TELC_B2', ${q(title)}, ${q(body_text)}, 'Freizeit', 'B2', 58, 0, 'Aufgabentext vom Inhaber (2026-10-16)', false, false, ${q(JSON.stringify(speaking_toolbox))}::jsonb
where not exists (select 1 from public.muendlich_materials where teil = 3 and level = 'TELC_B2' and title = ${q(title)})
returning id, title, is_unassigned_center, position;`;
fs.writeFileSync("t3-new-topic.sql", "-- 2026-10-16 owner: B2 Muendlich Teil 3 topic 'Sonderausstellung im Museum' (Tunisia list). ROLLBACK: delete from public.muendlich_materials where teil = 3 and level = 'TELC_B2' and title = '" + title + "';\n" + sql);
console.log("sql written");

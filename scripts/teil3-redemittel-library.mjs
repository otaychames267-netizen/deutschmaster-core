// Shared category Redemittel library for Mündlich Teil 3, modeled directly on
// the owner-supplied reference structure (Start → Ziel → Zeit → Ort → Inhalte
// → Vorschläge → Material → Werbung → Aufgabenverteilung → Abschluss, with
// question-asking AND answer-giving Redemittel per category). Each topic picks
// an ordered subset of these category keys that actually fits its task (a
// party doesn't need "Werbung", a trip doesn't need "Gäste") — see per-topic
// `struktur` arrays, which reference these keys plus a topic-specific `demo`
// exchange. This library is deliberately reusable across topics; only the
// demo exchange, Mögliche Fragen/Antworten, dialogue and Wortschatz are
// topic-specific. Mirrored into MuendlichTeil3Themen.tsx (same duplication
// convention as GROUP_ORDER elsewhere in this codebase).

export const REDEMITTEL_LIBRARY = {
  start: {
    emoji: "🟢", label: "Start",
    frage: ["Dann lass uns gemeinsam überlegen, wie wir … organisieren können.", "Sollen wir gleich mit der Planung anfangen?", "Wo, meinst du, sollten wir anfangen?"],
    antwort: ["Ja, das ist eine gute Idee. Schließlich ist das Thema wirklich wichtig.", "Gerne, ich habe auch schon ein paar erste Gedanken dazu.", "Ja, fangen wir am besten gleich an."],
  },
  ziel: {
    emoji: "🎯", label: "Ziel / Zweck",
    frage: ["Was sollte deiner Meinung nach das Hauptziel sein?", "Was wollen wir mit … eigentlich erreichen?", "Was ist dir dabei besonders wichtig?"],
    antwort: ["Meiner Ansicht nach sollte das Hauptziel darin bestehen, …", "Ich denke, es geht vor allem darum, dass …", "Für mich steht im Vordergrund, dass …"],
  },
  zeit: {
    emoji: "⏰", label: "Zeitpunkt",
    frage: ["Wann wäre deiner Meinung nach der geeignetste Zeitpunkt dafür?", "Welcher Termin würde dir am besten passen?", "Wann wäre es deiner Meinung nach am sinnvollsten, …?"],
    antwort: ["Am sinnvollsten wäre es wahrscheinlich, …", "Ich würde vorschlagen, dass wir …", "Ich halte … für den geeignetsten Zeitpunkt, weil …"],
  },
  ort: {
    emoji: "📍", label: "Ort",
    frage: ["Welcher Ort wäre dafür am besten geeignet?", "Wo könnten wir das am besten organisieren?", "Was hältst du davon, wenn wir es in … machen?"],
    antwort: ["Ich halte … für die praktischste Lösung, weil …", "Ich würde eher … bevorzugen, da …", "Dort hätten wir den Vorteil, dass …"],
  },
  verkehrsmittel: {
    emoji: "🚌", label: "Verkehrsmittel",
    frage: ["Wie sollen wir am besten dorthin kommen?", "Was hältst du von … als Verkehrsmittel?", "Wäre es nicht praktischer, mit … zu fahren?"],
    antwort: ["Ich würde … vorschlagen, weil das günstiger/schneller ist.", "Am bequemsten wäre wahrscheinlich …", "Dadurch würden wir außerdem Kosten sparen."],
  },
  unterkunft: {
    emoji: "🏨", label: "Unterkunft",
    frage: ["Wo sollten wir übernachten?", "Was hältst du von einer Jugendherberge statt einem Hotel?", "Welche Unterkunft passt am besten zu unserem Budget?"],
    antwort: ["Ich würde … bevorzugen, weil es günstiger/zentraler ist.", "Das wäre sicher komfortabler, allerdings auch teurer.", "Dort hätten wir den Vorteil, dass …"],
  },
  anlass: {
    emoji: "🎉", label: "Anlass",
    frage: ["Was genau möchten wir mit dieser Feier eigentlich feiern?", "Wie groß soll die Feier werden?", "Soll es eher überraschend oder offiziell angekündigt sein?"],
    antwort: ["Ich finde, wir sollten vor allem …", "Meiner Meinung nach sollte der Fokus auf … liegen.", "Ich denke, es sollte eher … sein."],
  },
  gaeste: {
    emoji: "🙋", label: "Gäste",
    frage: ["Wen sollten wir alles einladen?", "Wie viele Gäste erwarten wir ungefähr?", "Sollen auch Familienmitglieder oder Partner eingeladen werden?"],
    antwort: ["Ich würde vorschlagen, dass wir …", "Am besten laden wir … ein, weil …", "Ich denke, wir sollten die Gästeliste auf … begrenzen."],
  },
  essen: {
    emoji: "🍽️", label: "Essen & Getränke",
    frage: ["Was sollten wir zu essen und trinken anbieten?", "Sollen wir selbst kochen oder etwas bestellen?", "Sollten wir auf besondere Ernährungsbedürfnisse achten?"],
    antwort: ["Ich würde vorschlagen, dass jeder etwas mitbringt.", "Am einfachsten wäre es, wenn wir …", "Wir sollten auch an vegetarische Optionen denken."],
  },
  programm: {
    emoji: "🎶", label: "Programm / Musik",
    frage: ["Was sollten wir für ein Programm planen?", "Was hältst du von Live-Musik statt einer Playlist?", "Sollten wir Spiele oder Aktivitäten einplanen?"],
    antwort: ["Ich hätte da eine Idee: Wir könnten …", "Das wäre sicher unterhaltsam, weil …", "Eine weitere Möglichkeit wäre …"],
  },
  inhalte: {
    emoji: "📚", label: "Inhalte",
    frage: ["Welche Themen sollten unbedingt behandelt werden?", "Was sollte inhaltlich im Mittelpunkt stehen?", "Welche Aspekte dürfen wir nicht vergessen?"],
    antwort: ["Meiner Meinung nach sollten wir vor allem … behandeln.", "Das halte ich ebenfalls für sinnvoll. Vielleicht könnten wir zusätzlich …", "Dadurch würden die Teilnehmer einen umfassenderen Überblick bekommen."],
  },
  aktivitaeten: {
    emoji: "🏞️", label: "Aktivitäten",
    frage: ["Welche Aktivitäten sollten wir einplanen?", "Was hältst du von …?", "Sollten wir eher etwas Ruhiges oder etwas Aktives einplanen?"],
    antwort: ["Ich würde vorschlagen, dass wir …", "Das wäre sicher interessant, weil …", "Wir könnten auch … einplanen, damit für jeden etwas dabei ist."],
  },
  vorschlaege: {
    emoji: "💡", label: "Vorschläge",
    frage: ["Hast du dazu schon eine konkrete Idee?", "Was hältst du davon, wenn wir …?", "Wie wäre es mit …?"],
    antwort: ["Ich würde vorschlagen, dass wir …", "Eine weitere Möglichkeit wäre, …", "Das klingt nach einer sehr guten Idee, vor allem weil …"],
  },
  material: {
    emoji: "🛠️", label: "Material",
    frage: ["Welche technischen Geräte und Materialien benötigen wir dafür?", "Glaubst du, dass wir noch etwas benötigen?", "Wer könnte das nötige Material besorgen?"],
    antwort: ["Wir brauchen auf jeden Fall …", "Ich könnte … besorgen, wenn du willst.", "Vielleicht sollten wir außerdem … einplanen."],
  },
  werbung: {
    emoji: "📢", label: "Werbung",
    frage: ["Wie könnten wir möglichst viele Besucher erreichen?", "Über welche Kanäle sollten wir werben?", "Wer könnte uns beim Bekanntmachen helfen?"],
    antwort: ["Wir könnten Werbung über … machen.", "Das halte ich für sinnvoll, weil wir dadurch eine größere Zielgruppe ansprechen.", "Vielleicht sollten wir auch … um Hilfe bitten."],
  },
  teilnehmer: {
    emoji: "🙋", label: "Teilnehmer",
    frage: ["An wen richtet sich das Angebot genau?", "Wie viele Teilnehmer erwarten wir?", "Sollten wir eine Anmeldung organisieren?"],
    antwort: ["Ich denke, vor allem … würden davon profitieren.", "Wir sollten eine ungefähre Teilnehmerzahl einplanen, um …", "Eine Anmeldeliste wäre sinnvoll, damit wir besser planen können."],
  },
  aufgabenverteilung: {
    emoji: "👥", label: "Aufgabenverteilung",
    frage: ["Wie könnten wir die Aufgaben möglichst effizient aufteilen?", "Was würdest du gerne übernehmen?", "Wer kümmert sich am besten um …?"],
    antwort: ["Ich könnte mich um … kümmern. Würdest du dann … übernehmen?", "Ja, das mache ich gerne. Außerdem könnte ich …", "Das teilen wir uns am besten je nach Stärken auf."],
  },
  kosten: {
    emoji: "💰", label: "Kosten",
    frage: ["Wie hoch sollte das Budget insgesamt sein?", "Wie teilen wir die Kosten am besten auf?", "Sollten wir versuchen, Kosten zu sparen?"],
    antwort: ["Ich würde vorschlagen, dass wir die Kosten gleich aufteilen.", "Wir sollten ein realistisches Budget von … einplanen.", "Vielleicht können wir bei … sparen, indem wir …"],
  },
  ablauf: {
    emoji: "🔄", label: "Ablauf / Durchführung",
    frage: ["Wie sollte der genaue Ablauf aussehen?", "Was passiert zuerst, was danach?", "Sollten wir das in mehreren Schritten organisieren?"],
    antwort: ["Ich würde vorschlagen, dass wir zuerst … und danach …", "Am sinnvollsten wäre eine klare Reihenfolge: zuerst …, dann …", "Wir sollten genug Zeit für jeden Schritt einplanen."],
  },
  abschluss: {
    emoji: "✅", label: "Abschluss",
    frage: ["Können wir das so festhalten?", "Sind wir uns bei allen Punkten einig?", "Passt das so für dich?"],
    antwort: ["Dann können wir festhalten, dass …", "Perfekt, dann haben wir einen guten Plan.", "Genau, ich denke, das wird gut funktionieren."],
  },
};

// Universal, topic-independent reaction Redemittel (agreement / polite
// disagreement) — shown once as a fixed reference block, reused everywhere.
export const ZUSTIMMUNG_WIDERSPRUCH = {
  zustimmen: ["Das sehe ich genauso.", "Das halte ich ebenfalls für sinnvoll.", "Da stimme ich dir zu.", "Das klingt nach einer guten Lösung."],
  widersprechen: ["Ich verstehe deinen Punkt, aber ich würde eher …", "Das könnte schwierig sein, weil …", "Ich sehe das etwas anders, denn …", "Das ist ein guter Gedanke, allerdings sollten wir auch bedenken, dass …"],
  meinung_erfragen: ["Was meinst du dazu?", "Wie siehst du das?", "Wie findest du diese Idee?", "Wäre das auch für dich passend?"],
};

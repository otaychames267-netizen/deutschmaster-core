/**
 * Full Teil 3 topic content — everything that used to live only in the PDF
 * (owner decision 2026-08-10: PDF removed entirely, all content native).
 * Rendered inside TopicModalShell once the parent has already fetched the
 * row (RLS-gated has_plan_access read) — this component is purely
 * presentational and never fetches on its own.
 */
import { useState } from "react";
import { ClipboardList, MessagesSquare, GraduationCap, HelpCircle, Lightbulb } from "lucide-react";
import { TopicModalShell, type ModalTab } from "./MuendlichTopicModalShell";

interface StrukturSection { key: string; demo: { frage: string; antwort: string; reaktion?: string } }
interface DialogLine { speaker: "A" | "B"; text: string; section?: string }
interface Erklaerung {
  worum_geht_es: string; worum_geht_es_ar?: string;
  was_wird_erwartet: string; was_wird_erwartet_ar?: string;
  wichtige_punkte: string[]; wichtige_punkte_ar?: string[];
  worauf_achten: string[];
}
interface Wortschatz { verben: string[]; woerter: string[]; adjektive: string[] }
interface WortschatzAr { verben: string[]; woerter: string[]; adjektive: string[] }

export interface SpeakingToolboxT3V2 {
  schema_version: 2 | 3;
  erklaerung: Erklaerung;
  struktur: StrukturSection[];
  moegliche_fragen: string[];
  moegliche_antworten_ideen: string[];
  beispieldialog: DialogLine[];
  wortschatz: Wortschatz;
  wortschatz_ar?: WortschatzAr;
}

export interface Teil3TopicRow {
  id: string; title: string; body_text: string | null;
  theme_category: string | null; difficulty_level: string | null;
  speaking_toolbox: SpeakingToolboxT3V2 | { schema_version?: number } | null;
}

const REDEMITTEL_LIBRARY: Record<string, { emoji: string; label: string; frage: string[]; antwort: string[] }> = {
  start: { emoji: "🟢", label: "Start", frage: ["Dann lass uns gemeinsam überlegen, wie wir … organisieren können.", "Sollen wir gleich mit der Planung anfangen?", "Wo, meinst du, sollten wir anfangen?"], antwort: ["Ja, das ist eine gute Idee. Schließlich ist das Thema wirklich wichtig.", "Gerne, ich habe auch schon ein paar erste Gedanken dazu.", "Ja, fangen wir am besten gleich an."] },
  ziel: { emoji: "🎯", label: "Ziel / Zweck", frage: ["Was sollte deiner Meinung nach das Hauptziel sein?", "Was wollen wir mit … eigentlich erreichen?", "Was ist dir dabei besonders wichtig?"], antwort: ["Meiner Ansicht nach sollte das Hauptziel darin bestehen, …", "Ich denke, es geht vor allem darum, dass …", "Für mich steht im Vordergrund, dass …"] },
  zeit: { emoji: "⏰", label: "Zeitpunkt", frage: ["Wann wäre deiner Meinung nach der geeignetste Zeitpunkt dafür?", "Welcher Termin würde dir am besten passen?", "Wann wäre es deiner Meinung nach am sinnvollsten, …?"], antwort: ["Am sinnvollsten wäre es wahrscheinlich, …", "Ich würde vorschlagen, dass wir …", "Ich halte … für den geeignetsten Zeitpunkt, weil …"] },
  ort: { emoji: "📍", label: "Ort", frage: ["Welcher Ort wäre dafür am besten geeignet?", "Wo könnten wir das am besten organisieren?", "Was hältst du davon, wenn wir es in … machen?"], antwort: ["Ich halte … für die praktischste Lösung, weil …", "Ich würde eher … bevorzugen, da …", "Dort hätten wir den Vorteil, dass …"] },
  verkehrsmittel: { emoji: "🚌", label: "Verkehrsmittel", frage: ["Wie sollen wir am besten dorthin kommen?", "Was hältst du von … als Verkehrsmittel?", "Wäre es nicht praktischer, mit … zu fahren?"], antwort: ["Ich würde … vorschlagen, weil das günstiger/schneller ist.", "Am bequemsten wäre wahrscheinlich …", "Dadurch würden wir außerdem Kosten sparen."] },
  unterkunft: { emoji: "🏨", label: "Unterkunft", frage: ["Wo sollten wir übernachten?", "Was hältst du von einer Jugendherberge statt einem Hotel?", "Welche Unterkunft passt am besten zu unserem Budget?"], antwort: ["Ich würde … bevorzugen, weil es günstiger/zentraler ist.", "Das wäre sicher komfortabler, allerdings auch teurer.", "Dort hätten wir den Vorteil, dass …"] },
  anlass: { emoji: "🎉", label: "Anlass", frage: ["Was genau möchten wir mit dieser Feier eigentlich feiern?", "Wie groß soll die Feier werden?", "Soll es eher überraschend oder offiziell angekündigt sein?"], antwort: ["Ich finde, wir sollten vor allem …", "Meiner Meinung nach sollte der Fokus auf … liegen.", "Ich denke, es sollte eher … sein."] },
  gaeste: { emoji: "🙋", label: "Gäste", frage: ["Wen sollten wir alles einladen?", "Wie viele Gäste erwarten wir ungefähr?", "Sollen auch Familienmitglieder oder Partner eingeladen werden?"], antwort: ["Ich würde vorschlagen, dass wir …", "Am besten laden wir … ein, weil …", "Ich denke, wir sollten die Gästeliste auf … begrenzen."] },
  essen: { emoji: "🍽️", label: "Essen & Getränke", frage: ["Was sollten wir zu essen und trinken anbieten?", "Sollen wir selbst kochen oder etwas bestellen?", "Sollten wir auf besondere Ernährungsbedürfnisse achten?"], antwort: ["Ich würde vorschlagen, dass jeder etwas mitbringt.", "Am einfachsten wäre es, wenn wir …", "Wir sollten auch an vegetarische Optionen denken."] },
  programm: { emoji: "🎶", label: "Programm / Musik", frage: ["Was sollten wir für ein Programm planen?", "Was hältst du von Live-Musik statt einer Playlist?", "Sollten wir Spiele oder Aktivitäten einplanen?"], antwort: ["Ich hätte da eine Idee: Wir könnten …", "Das wäre sicher unterhaltsam, weil …", "Eine weitere Möglichkeit wäre …"] },
  inhalte: { emoji: "📚", label: "Inhalte", frage: ["Welche Themen sollten unbedingt behandelt werden?", "Was sollte inhaltlich im Mittelpunkt stehen?", "Welche Aspekte dürfen wir nicht vergessen?"], antwort: ["Meiner Meinung nach sollten wir vor allem … behandeln.", "Das halte ich ebenfalls für sinnvoll. Vielleicht könnten wir zusätzlich …", "Dadurch würden die Teilnehmer einen umfassenderen Überblick bekommen."] },
  aktivitaeten: { emoji: "🏞️", label: "Aktivitäten", frage: ["Welche Aktivitäten sollten wir einplanen?", "Was hältst du von …?", "Sollten wir eher etwas Ruhiges oder etwas Aktives einplanen?"], antwort: ["Ich würde vorschlagen, dass wir …", "Das wäre sicher interessant, weil …", "Wir könnten auch … einplanen, damit für jeden etwas dabei ist."] },
  vorschlaege: { emoji: "💡", label: "Vorschläge", frage: ["Hast du dazu schon eine konkrete Idee?", "Was hältst du davon, wenn wir …?", "Wie wäre es mit …?"], antwort: ["Ich würde vorschlagen, dass wir …", "Eine weitere Möglichkeit wäre, …", "Das klingt nach einer sehr guten Idee, vor allem weil …"] },
  material: { emoji: "🛠️", label: "Material", frage: ["Welche technischen Geräte und Materialien benötigen wir dafür?", "Glaubst du, dass wir noch etwas benötigen?", "Wer könnte das nötige Material besorgen?"], antwort: ["Wir brauchen auf jeden Fall …", "Ich könnte … besorgen, wenn du willst.", "Vielleicht sollten wir außerdem … einplanen."] },
  werbung: { emoji: "📢", label: "Werbung", frage: ["Wie könnten wir möglichst viele Besucher erreichen?", "Über welche Kanäle sollten wir werben?", "Wer könnte uns beim Bekanntmachen helfen?"], antwort: ["Wir könnten Werbung über … machen.", "Das halte ich für sinnvoll, weil wir dadurch eine größere Zielgruppe ansprechen.", "Vielleicht sollten wir auch … um Hilfe bitten."] },
  teilnehmer: { emoji: "🙋", label: "Teilnehmer", frage: ["An wen richtet sich das Angebot genau?", "Wie viele Teilnehmer erwarten wir?", "Sollten wir eine Anmeldung organisieren?"], antwort: ["Ich denke, vor allem … würden davon profitieren.", "Wir sollten eine ungefähre Teilnehmerzahl einplanen, um …", "Eine Anmeldeliste wäre sinnvoll, damit wir besser planen können."] },
  aufgabenverteilung: { emoji: "👥", label: "Aufgabenverteilung", frage: ["Wie könnten wir die Aufgaben möglichst effizient aufteilen?", "Was würdest du gerne übernehmen?", "Wer kümmert sich am besten um …?"], antwort: ["Ich könnte mich um … kümmern. Würdest du dann … übernehmen?", "Ja, das mache ich gerne. Außerdem könnte ich …", "Das teilen wir uns am besten je nach Stärken auf."] },
  kosten: { emoji: "💰", label: "Kosten", frage: ["Wie hoch sollte das Budget insgesamt sein?", "Wie teilen wir die Kosten am besten auf?", "Sollten wir versuchen, Kosten zu sparen?"], antwort: ["Ich würde vorschlagen, dass wir die Kosten gleich aufteilen.", "Wir sollten ein realistisches Budget von … einplanen.", "Vielleicht können wir bei … sparen, indem wir …"] },
  ablauf: { emoji: "🔄", label: "Ablauf / Durchführung", frage: ["Wie sollte der genaue Ablauf aussehen?", "Was passiert zuerst, was danach?", "Sollten wir das in mehreren Schritten organisieren?"], antwort: ["Ich würde vorschlagen, dass wir zuerst … und danach …", "Am sinnvollsten wäre eine klare Reihenfolge: zuerst …, dann …", "Wir sollten genug Zeit für jeden Schritt einplanen."] },
  abschluss: { emoji: "✅", label: "Abschluss", frage: ["Können wir das so festhalten?", "Sind wir uns bei allen Punkten einig?", "Passt das so für dich?"], antwort: ["Dann können wir festhalten, dass …", "Perfekt, dann haben wir einen guten Plan.", "Genau, ich denke, das wird gut funktionieren."] },
  zeitpunkt: { emoji: "⏰", label: "Zeitpunkt", frage: ["Wann wäre deiner Meinung nach der geeignetste Zeitpunkt dafür?", "Welcher Termin würde dir am besten passen?", "Wann wäre es deiner Meinung nach am sinnvollsten, …?"], antwort: ["Am sinnvollsten wäre es wahrscheinlich, …", "Ich würde vorschlagen, dass wir …", "Ich halte … für den geeignetsten Zeitpunkt, weil …"] },
  materialien: { emoji: "🛠️", label: "Materialien", frage: ["Was benötigen wir dafür?", "Welche Materialien brauchen wir noch?", "Sollten wir noch etwas Bestimmtes besorgen?"], antwort: ["Wir brauchen auf jeden Fall …", "Vielleicht sollten wir auch … besorgen.", "Ja, das wäre sicherlich hilfreich."] },
  vorschlag1: { emoji: "💡", label: "Vorschlag 1", frage: ["Ich würde vorschlagen, dass wir …", "Hast du dazu schon eine Idee?", "Was hältst du davon, wenn wir …?"], antwort: ["Das halte ich für eine ausgezeichnete Idee.", "Ja, das könnte gut funktionieren, weil …", "Das klingt vielversprechend."] },
  vorschlag2: { emoji: "💭", label: "Vorschlag 2", frage: ["Eine weitere Möglichkeit wäre, …", "Was würdest du von … halten?", "Wir könnten außerdem …"], antwort: ["Das finde ich sinnvoll.", "Das wäre eine gute Ergänzung.", "Ja, das würde die Sache noch abrunden."] },
  vorschlag3: { emoji: "✨", label: "Vorschlag 3", frage: ["Wie wäre es außerdem mit …?", "Sollten wir nicht auch … einplanen?", "Ein weiterer Gedanke wäre …"], antwort: ["Das wäre eine gute Ergänzung.", "Das finde ich eine schöne Idee.", "Ja, das rundet unseren Plan gut ab."] },
  vorschlag4: { emoji: "🌟", label: "Vorschlag 4", frage: ["Was hältst du außerdem von …?", "Könnten wir zusätzlich … einplanen?", "Ein letzter Gedanke wäre noch …"], antwort: ["Das wäre eine sinnvolle Ergänzung.", "Das finde ich eine gute Idee.", "Ja, damit wäre unser Plan vollständig."] },
  vorschlag5: { emoji: "🔆", label: "Vorschlag 5", frage: ["Sollten wir darüber hinaus noch etwas bedenken?", "Was hältst du zusätzlich von …?", "Gibt es noch einen weiteren Punkt?"], antwort: ["Das ist ein guter zusätzlicher Punkt.", "Das würde unseren Plan noch abrunden.", "Ja, damit haben wir alles abgedeckt."] },
  probleme: { emoji: "⚠️", label: "Mögliche Probleme", frage: ["Was könnten wir tun, wenn ein Problem auftritt?", "Was, wenn etwas nicht wie geplant läuft?", "Sollten wir für Notfälle vorsorgen?"], antwort: ["Dann sollten wir vorsichtshalber eine Alternative bereithalten.", "Wir sollten das vorher unbedingt einplanen.", "Das wäre wahrscheinlich die beste Lösung."] },
  bedarf: { emoji: "📝", label: "Bedarf", frage: ["Was genau benötigen wir noch?", "Sollten wir den Bedarf vorher genau klären?", "Was fehlt uns noch für die Planung?"], antwort: ["Wir sollten das vorher genau abklären.", "Ich denke, wir brauchen noch …", "Das sollten wir rechtzeitig organisieren."] },
  experten: { emoji: "👨‍🏫", label: "Experten", frage: ["Welche Experten oder Redner sollten wir einladen?", "Wen könnten wir als Fachperson dazu holen?", "Kennst du jemanden, der sich damit gut auskennt?"], antwort: ["Ich würde vorschlagen, … einzuladen.", "Wir könnten jemanden von … fragen.", "Das halte ich für sinnvoll, so bekommen wir fundierte Informationen."] },
  route: { emoji: "🗺️", label: "Route", frage: ["Welche Sehenswürdigkeiten sollten wir unbedingt einplanen?", "Wie sollten wir die Route gestalten?", "Was darf auf der Route auf keinen Fall fehlen?"], antwort: ["Ich würde vorschlagen, … zu besuchen.", "Am sinnvollsten wäre eine Route, die … verbindet.", "Das halte ich für eine gute Auswahl."] },
  reiseziel: { emoji: "✈️", label: "Reiseziel", frage: ["Wohin sollten wir reisen?", "Welches Reiseziel würdest du vorschlagen?", "Was spricht deiner Meinung nach für dieses Ziel?"], antwort: ["Ich würde … vorschlagen, weil …", "Das wäre sicher ein interessantes Ziel.", "Falls uns nichts Besseres einfällt, könnten wir … wählen."] },
  rahmen: { emoji: "🗓️", label: "Zeitlicher Rahmen", frage: ["Wie sollten wir den zeitlichen Rahmen planen?", "Wie lange sollte die Veranstaltung dauern?", "Wann sollte sie am besten stattfinden?"], antwort: ["Am sinnvollsten wäre es wahrscheinlich, …", "Ich würde einen halben Tag dafür einplanen.", "Das klingt nach einer vernünftigen Lösung."] },
  zeitplan: { emoji: "🗓️", label: "Zeitplan", frage: ["Wie sollten wir den Zeitplan gestalten?", "Wann sollten wir mit den Vorbereitungen beginnen?", "Bis wann muss alles erledigt sein?"], antwort: ["Am sinnvollsten wäre es, rechtzeitig mit … zu beginnen.", "Wir sollten uns genug Zeit für … einplanen.", "Ich würde vorschlagen, dass wir einen klaren Zeitplan erstellen."] },
  transport: { emoji: "🚚", label: "Transport", frage: ["Wie sollten wir den Transport organisieren?", "Brauchen wir einen Umzugswagen?", "Wer könnte uns beim Tragen helfen?"], antwort: ["Ich würde vorschlagen, einen Transporter zu mieten.", "Wir könnten außerdem ein paar Freunde um Hilfe bitten.", "Das wäre sicherlich eine praktische Lösung."] },
  fuehrung: { emoji: "🧑‍🏫", label: "Führung", frage: ["Sollten wir eine Führung buchen?", "Wäre eine Führung sinnvoll?", "Wer könnte uns durch die Ausstellung führen?"], antwort: ["Ja, das würde ich auf jeden Fall empfehlen.", "Das halte ich für sinnvoll, so verstehen wir mehr von den Werken.", "Das sehe ich genauso."] },
  inhalt: { emoji: "📖", label: "Inhalt", frage: ["Welche Themen sollten wir dabei ansprechen?", "Was sollte inhaltlich im Mittelpunkt stehen?", "Worauf sollten wir uns konzentrieren?"], antwort: ["Wir könnten über … sprechen.", "Das halte ich für sehr nützlich.", "Meiner Meinung nach sollten wir vor allem … behandeln."] },
  geschenk: { emoji: "🎁", label: "Geschenk", frage: ["Sollten wir auch ein gemeinsames Geschenk besorgen?", "Was könnten wir ihr schenken?", "Wie viel sollten wir dafür ausgeben?"], antwort: ["Ja, das würde ich empfehlen, vielleicht etwas Kleines und Persönliches.", "Das halte ich für eine gute Idee.", "Wir könnten das Geld für das Geschenk gemeinsam sammeln."] },
  gerichte: { emoji: "🍲", label: "Gerichte", frage: ["Welche Gerichte sollten wir kochen?", "Was würdest du gerne zubereiten?", "Sollte jeder ein eigenes Gericht mitbringen?"], antwort: ["Ich würde vorschlagen, dass jeder ein typisches Gericht mitbringt.", "Das halte ich für eine schöne Idee.", "So lernen wir auch etwas über andere Kulturen."] },
  argumente: { emoji: "💬", label: "Argumente", frage: ["Welche Argumente sollten wir sammeln?", "Was spricht deiner Meinung nach dafür?", "Welchen Punkt sollten wir zuerst nennen?"], antwort: ["Wir könnten über … sprechen.", "Das halte ich für ein sehr überzeugendes Argument.", "Ein weiterer wichtiger Punkt wäre …"] },
  erfahrung: { emoji: "🙋", label: "Eigene Erfahrung", frage: ["Sollten wir auch von unseren eigenen Erfahrungen berichten?", "Hast du dazu ein persönliches Beispiel?", "Was hast du selbst dabei erlebt?"], antwort: ["Ja, das würde es persönlicher und glaubwürdiger machen.", "Das finde ich eine gute Idee.", "Ich könnte von meiner eigenen Erfahrung mit … erzählen."] },
  zeitraum: { emoji: "📅", label: "Zeitraum", frage: ["Für welchen Zeitraum brauchen wir einen Plan?", "Wie lange wird sie voraussichtlich ausfallen?", "Wie sollten wir die Zeit einteilen?"], antwort: ["Wir sollten vorsichtshalber mit … Wochen rechnen.", "Am besten teilen wir uns die Zeit gleichmäßig auf.", "Das klingt nach einer vernünftigen Einschätzung."] },
  kinderbetreuung: { emoji: "🧒", label: "Kinderbetreuung", frage: ["Wer kümmert sich um die Kinderbetreuung?", "Wie sollten wir uns dabei abwechseln?", "Was müssen wir dabei beachten?"], antwort: ["Ich könnte mich an … Tagen darum kümmern.", "Wir sollten uns möglichst gleichmäßig abwechseln.", "Das halte ich für eine faire Lösung."] },
  schule: { emoji: "🏫", label: "Schule", frage: ["Wer bringt die Kinder zur Schule?", "Wie regeln wir den Schulweg?", "Müssen wir uns auch um Hausaufgaben kümmern?"], antwort: ["Ich könnte sie morgens zur Schule bringen.", "Das würde ich gerne übernehmen.", "Wir sollten auch an die Hausaufgabenbetreuung denken."] },
  einkaufen: { emoji: "🛒", label: "Einkaufen", frage: ["Wer übernimmt das Einkaufen?", "Sollten wir gemeinsam einkaufen gehen?", "Was müssen wir alles besorgen?"], antwort: ["Ich könnte das Einkaufen übernehmen.", "Das würde ich gerne machen.", "Wir sollten vorher eine Einkaufsliste erstellen."] },
  uebernachtung: { emoji: "🛏️", label: "Übernachtung", frage: ["Sollte jemand über Nacht bei ihr bleiben?", "Wer könnte an welchem Abend übernachten?", "Ist eine Übernachtung überhaupt nötig?"], antwort: ["Ich könnte an ein paar Abenden übernachten.", "Das wäre sicher hilfreich für sie.", "Wir sollten das je nach Bedarf flexibel handhaben."] },
  kontakt_mutter: { emoji: "☎️", label: "Kontakt zur Mutter", frage: ["Wie sollten wir mit der Mutter in Kontakt bleiben?", "Sollten wir sie täglich informieren?", "Worüber sollten wir sie auf dem Laufenden halten?"], antwort: ["Wir sollten sie täglich kurz anrufen.", "Das halte ich für wichtig, damit sie sich keine Sorgen macht.", "Ich könnte ihr jeden Abend eine kurze Nachricht schicken."] },
  stueckwahl: { emoji: "🎭", label: "Stückwahl", frage: ["Welches Theaterstück sollten wir aufführen?", "Was für ein Stück würde gut zu unserem Anlass passen?", "Sollten wir etwas Bekanntes oder etwas Eigenes wählen?"], antwort: ["Ich würde ein bekanntes, kurzes Stück vorschlagen.", "Das halte ich für eine gute Wahl.", "Falls uns nichts Besseres einfällt, könnten wir … aufführen."] },
  themen: { emoji: "📋", label: "Themen", frage: ["Welche Themen sollten wir unbedingt behandeln?", "Was interessiert die Besucher am meisten?", "Worauf sollten wir den Schwerpunkt legen?"], antwort: ["Meiner Meinung nach sollten wir über … sprechen.", "Das halte ich für sehr wichtig.", "Wir könnten außerdem … thematisieren."] },
  besuche: { emoji: "🏥", label: "Besuche", frage: ["Wie sollten wir die Besuche über die Woche verteilen?", "Wer besucht ihn an welchem Tag?", "Wie oft sollten wir ihn besuchen?"], antwort: ["Ich würde vorschlagen, dass wir uns abwechseln.", "Das halte ich für eine gute Idee.", "So bekommt er jeden Tag Besuch, ohne überfordert zu werden."] },
  buchwahl: { emoji: "📕", label: "Buchwahl", frage: ["Welches Buch sollten wir vorstellen?", "Was für ein Buch würde der Klasse gefallen?", "Sollten wir ein bekanntes oder ein weniger bekanntes Buch wählen?"], antwort: ["Ich würde … vorschlagen.", "Das halte ich für eine gute Wahl.", "Falls uns nichts Besseres einfällt, könnten wir … nehmen."] },
  struktur: { emoji: "🗂️", label: "Struktur der Vorstellung", frage: ["Wie sollten wir die Vorstellung aufbauen?", "Was sollte zuerst kommen?", "Wie strukturieren wir unseren Vortrag am besten?"], antwort: ["Ich würde vorschlagen, zuerst … und dann … zu machen.", "Das klingt nach einem klaren Aufbau.", "So bleibt es für die Zuhörer übersichtlich."] },
  aufteilung: { emoji: "⚖️", label: "Aufteilung", frage: ["Wie sollten wir die Aufgaben untereinander aufteilen?", "Wer übernimmt welchen Teil?", "Sollten wir das nach Interessen aufteilen?"], antwort: ["Ich könnte den Teil zu … übernehmen.", "Das würde ich gerne machen.", "Wir sollten das nach unseren Stärken aufteilen."] },
  kleidung: { emoji: "👔", label: "Kleidung", frage: ["Was sollte man bei der Kleidung beachten?", "Welche Kleidung ist für ein Vorstellungsgespräch angemessen?", "Sollte man sich eher formell kleiden?"], antwort: ["Ich würde eher zu … raten.", "Das halte ich für einen wichtigen Punkt.", "Am besten wählt man etwas Ordentliches, aber nicht zu Auffälliges."] },
  vorbereitung: { emoji: "📝", label: "Vorbereitung", frage: ["Wie sollte man sich am besten vorbereiten?", "Was sollte man vorher recherchieren?", "Worauf sollte man sich konzentrieren?"], antwort: ["Ich würde empfehlen, sich vorher über … zu informieren.", "Das halte ich für sehr wichtig.", "Man sollte sich außerdem ein paar typische Fragen überlegen."] },
  verhalten: { emoji: "🤝", label: "Verhalten", frage: ["Wie sollte man sich während des Gesprächs verhalten?", "Worauf sollte man beim Auftreten achten?", "Was sollte man auf keinen Fall tun?"], antwort: ["Man sollte vor allem ruhig und selbstbewusst auftreten.", "Das halte ich für einen entscheidenden Punkt.", "Außerdem sollte man aufmerksam zuhören und höflich bleiben."] },
  software: { emoji: "💻", label: "Software", frage: ["Welche Software sollten wir vorstellen?", "Was für Programme wären für die Teilnehmer nützlich?", "Sollten wir uns auf ein Programm konzentrieren?"], antwort: ["Ich würde vorschlagen, … zu zeigen.", "Das halte ich für sinnvoll, weil das viele im Alltag brauchen.", "Das wäre sicher hilfreich für die Teilnehmer."] },
  organisation: { emoji: "🗃️", label: "Organisation", frage: ["Wie sollten wir den Ablauf organisieren?", "Was müssen wir im Voraus klären?", "Wer kümmert sich um die Absprache?"], antwort: ["Ich könnte vorher mit ihnen sprechen.", "Das halte ich für notwendig.", "Wir sollten uns vorher genau abstimmen."] },
  sportarten: { emoji: "⚽", label: "Sportarten", frage: ["Welche Sportarten sollten wir anbieten?", "Was für Spiele könnten wir einplanen?", "Sollten wir auch weniger bekannte Sportarten vorstellen?"], antwort: ["Ich würde vorschlagen, sowohl bekannte als auch neue Sportarten anzubieten.", "Das halte ich für eine schöne Idee.", "So lernt man auch etwas Neues kennen."] },
  spiele: { emoji: "🎲", label: "Spiele", frage: ["Welche Spiele sollten wir anbieten?", "Was für Spiele kommen bei den Besuchern gut an?", "Sollten wir klassische oder neue Spiele wählen?"], antwort: ["Ich würde eine Mischung aus beidem vorschlagen.", "Das halte ich für sinnvoll, so ist für jeden etwas dabei.", "Das wäre sicher eine gute Auswahl."] },
  sammelstelle: { emoji: "📦", label: "Sammelstelle", frage: ["Wo sollten wir eine Sammelstelle einrichten?", "Wo könnten die Leute ihre Spenden abgeben?", "Sollten wir mehrere Sammelstellen einrichten?"], antwort: ["Wir könnten eine Sammelstelle im Kursraum einrichten.", "Das halte ich für eine praktische Lösung.", "So können die Leute ihre Bücher einfach vorbeibringen."] },
  sehenswuerdigkeiten: { emoji: "🏛️", label: "Sehenswürdigkeiten", frage: ["Welche Sehenswürdigkeiten sollten wir ihm unbedingt zeigen?", "Was darf er auf keinen Fall verpassen?", "Welche Orte würdest du empfehlen?"], antwort: ["Meiner Meinung nach sollten wir ihm … zeigen.", "Das halte ich für sinnvoll.", "Vielleicht könnten wir zusätzlich … besuchen."] },
  kultur_essen: { emoji: "🍽️", label: "Kultur & Essen", frage: ["Welche deutschen Spezialitäten sollte er probieren?", "Sollten wir ihm auch etwas über die Kultur zeigen?", "Was wäre ein gutes kulinarisches Erlebnis für ihn?"], antwort: ["Ich denke, dass er … probieren sollte.", "Das klingt überzeugend.", "Außerdem könnten wir ihm regionale Bräuche zeigen."] },
  ursachen: { emoji: "❓", label: "Ursachen", frage: ["Was könnten die Ursachen dafür sein?", "Woran könnte es liegen?", "Sollten wir zuerst die Gründe herausfinden?"], antwort: ["Es könnte zum Beispiel an … liegen.", "Das halte ich für einen wichtigen ersten Schritt.", "Wir sollten das vorsichtig besprechen."] },
  kanaele: { emoji: "📢", label: "Kanäle", frage: ["Über welche Kanäle sollten wir werben?", "Wo erreichen wir die meisten Leute?", "Sollten wir soziale Medien nutzen?"], antwort: ["Ich würde vorschlagen, soziale Medien und Plakate zu nutzen.", "Das halte ich für sinnvoll, so erreichen wir unterschiedliche Zielgruppen.", "Das wäre sicher wirkungsvoll."] },
  kontakt: { emoji: "📞", label: "Kontakt", frage: ["Wie sollten wir Kontakt aufnehmen?", "Wer kümmert sich um die Kontaktaufnahme?", "Was müssen wir mit ihnen klären?"], antwort: ["Ich könnte sie per E-Mail kontaktieren.", "Das würde ich gerne übernehmen.", "Wir sollten vorher genau klären, wie die Zusammenarbeit aussehen soll."] },
  saenger: { emoji: "🎤", label: "Der Sänger", frage: ["Was sollten wir über ihn im Voraus wissen?", "Worauf sollten wir bei der Recherche achten?", "Was macht ihn besonders interessant?"], antwort: ["Wir sollten uns vorher über seine Karriere informieren.", "Das halte ich für wichtig, um gute Fragen zu stellen.", "Das würde uns beim Interview sicher helfen."] },
  beruf: { emoji: "💼", label: "Beruflicher Werdegang", frage: ["Welche Fragen sollten wir zu seinem Beruf stellen?", "Was interessiert die Zuhörer an seiner Karriere?", "Sollten wir nach seinen Anfängen fragen?"], antwort: ["Wir könnten fragen, wie alles angefangen hat.", "Das halte ich für eine interessante Frage.", "Das würde den Zuhörern sicher gefallen."] },
  privat: { emoji: "🏠", label: "Privates", frage: ["Sollten wir auch private Fragen stellen?", "Was möchten die Fans über sein Privatleben wissen?", "Wie persönlich dürfen unsere Fragen sein?"], antwort: ["Wir sollten dabei taktvoll bleiben.", "Das halte ich für einen sensiblen Punkt.", "Vielleicht nur eine oder zwei Fragen dazu."] },
  interessen: { emoji: "🎭", label: "Unterschiedliche Interessen", frage: ["Welche Interessen sollten wir berücksichtigen?", "Wie bringen wir die verschiedenen Wünsche unter einen Hut?", "Wie stellen wir sicher, dass niemand zu kurz kommt?"], antwort: ["Wir sollten für jede Interessengruppe etwas einplanen.", "Das halte ich für einen wichtigen Punkt.", "Am besten teilen wir das Programm entsprechend auf."] },
};

function humanizeStrukturKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ZUSTIMMUNG_WIDERSPRUCH = {
  meinung_erfragen: ["Was meinst du dazu?", "Wie siehst du das?", "Wie findest du diese Idee?", "Wäre das auch für dich passend?"],
  zustimmen: ["Das sehe ich genauso.", "Das halte ich ebenfalls für sinnvoll.", "Da stimme ich dir zu.", "Das klingt nach einer guten Lösung."],
  widersprechen: ["Ich verstehe deinen Punkt, aber ich würde eher …", "Das könnte schwierig sein, weil …", "Ich sehe das etwas anders, denn …", "Das ist ein guter Gedanke, allerdings sollten wir auch bedenken, dass …"],
};

function isReady(tb: Teil3TopicRow["speaking_toolbox"]): tb is SpeakingToolboxT3V2 {
  return !!tb && ((tb as any).schema_version === 2 || (tb as any).schema_version === 3);
}

function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
          <span className="text-foreground">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function PlainListBilingual({ items, itemsAr }: { items: string[]; itemsAr?: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
          <div>
            <span className="text-foreground">{it}</span>
            {itemsAr?.[i] && <p dir="rtl" className="mt-0.5 text-right text-sm text-indigo-600 dark:text-indigo-400">{itemsAr[i]}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RedemittelCols({ frage, antwort }: { frage: string[]; antwort: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Fragen stellen</h5>
        <ul className="space-y-1">{frage.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
      </div>
      <div>
        <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Antworten geben</h5>
        <ul className="space-y-1">{antwort.map((a, i) => <li key={i} className="text-sm italic text-muted-foreground">„{a}“</li>)}</ul>
      </div>
    </div>
  );
}

function StrukturCard({ sec }: { sec: StrukturSection }) {
  const lib = REDEMITTEL_LIBRARY[sec.key] ?? { emoji: "•", label: humanizeStrukturKey(sec.key), frage: [], antwort: [] };
  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.02] p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-black text-sky-700 dark:text-sky-400">
        <span className="text-base">{lib.emoji}</span> {lib.label}
      </h4>
      <RedemittelCols frage={lib.frage} antwort={lib.antwort} />
      <div className="mt-3 space-y-1 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
        <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-sky-600/70 dark:text-sky-400/70">
          <MessagesSquare className="h-3 w-3" /> Beispiel
        </p>
        <p className="text-sm"><span className="font-black text-sky-600 dark:text-sky-400">A:</span> {sec.demo.frage}</p>
        <p className="text-sm"><span className="font-black text-rose-600 dark:text-rose-400">B:</span> {sec.demo.antwort}</p>
        {sec.demo.reaktion && <p className="text-sm"><span className="font-black text-sky-600 dark:text-sky-400">A:</span> {sec.demo.reaktion}</p>}
      </div>
    </div>
  );
}

const TABS: ModalTab<"erklaerung" | "vorstellung" | "wortschatz">[] = [
  { key: "erklaerung", label: "Erklärung & Überblick", icon: ClipboardList },
  { key: "vorstellung", label: "Vorstellung & Dialog", icon: MessagesSquare },
  { key: "wortschatz", label: "Wortschatz", icon: GraduationCap },
];

export function Teil3TopicModal({ topic, onClose }: { topic: Teil3TopicRow; onClose: () => void }) {
  const [page, setPage] = useState<"erklaerung" | "vorstellung" | "wortschatz">("erklaerung");
  const tb = isReady(topic.speaking_toolbox) ? topic.speaking_toolbox : null;
  const opening = tb?.beispieldialog?.[0];

  return (
    <TopicModalShell
      title={topic.title}
      badges={[topic.theme_category, topic.difficulty_level]}
      tabs={TABS}
      activeTab={page}
      onTabChange={setPage}
      onClose={onClose}
    >
      {page === "erklaerung" && (
        <div className="space-y-6">
          {topic.body_text && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 text-sm font-black text-foreground">Aufgabe</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{topic.body_text}</p>
            </div>
          )}
          {tb && (
            <>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Worum geht es?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{tb.erklaerung.worum_geht_es}</p>
                {tb.erklaerung.worum_geht_es_ar && (
                  <p dir="rtl" className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-right text-sm leading-loose text-indigo-700 dark:text-indigo-300">{tb.erklaerung.worum_geht_es_ar}</p>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Was wird erwartet?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{tb.erklaerung.was_wird_erwartet}</p>
                {tb.erklaerung.was_wird_erwartet_ar && (
                  <p dir="rtl" className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-right text-sm leading-loose text-indigo-700 dark:text-indigo-300">{tb.erklaerung.was_wird_erwartet_ar}</p>
                )}
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 text-sm font-black text-foreground">Wichtige Punkte</h3>
                  <PlainListBilingual items={tb.erklaerung.wichtige_punkte} itemsAr={tb.erklaerung.wichtige_punkte_ar} />
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 text-sm font-black text-foreground">Worauf achten?</h3>
                  <PlainList items={tb.erklaerung.worauf_achten} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {page === "vorstellung" && tb && (
        <div className="space-y-6">
          {opening && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-sky-700 dark:text-sky-400">
                <MessagesSquare className="h-4 w-4" /> Vorstellung des Themas (Eröffnung)
              </h3>
              <p className="text-sm leading-relaxed">
                <span className="font-black text-sky-600 dark:text-sky-400">A:</span>{" "}
                <span className="text-foreground">{opening.text}</span>
              </p>
              <p className="mt-2 text-xs italic text-muted-foreground">
                Kandidat/in A präsentiert das Szenario, bevor die Diskussion beginnt — so sollte jedes Gespräch in Teil 3 eröffnet werden.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs italic text-muted-foreground">Fragen stellen → Antworten geben → reagieren. Für jeden Punkt ein Beispiel:</p>
            {tb.struktur.map((sec, i) => <StrukturCard key={i} sec={sec} />)}
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-black text-violet-700 dark:text-violet-400">
                <span className="text-base">🔁</span> Zustimmen &amp; höflich widersprechen
              </h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Nach Meinung fragen</h5>
                  <ul className="space-y-1">{ZUSTIMMUNG_WIDERSPRUCH.meinung_erfragen.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
                </div>
                <div>
                  <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Zustimmen</h5>
                  <ul className="space-y-1">{ZUSTIMMUNG_WIDERSPRUCH.zustimmen.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
                </div>
                <div>
                  <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Höflich widersprechen</h5>
                  <ul className="space-y-1">{ZUSTIMMUNG_WIDERSPRUCH.widersprechen.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-black text-foreground">Vollständiger Beispieldialog</h3>
            <div className="space-y-1 rounded-xl border border-border bg-muted/20 p-4">
              {(() => {
                let lastSection: string | undefined;
                return tb.beispieldialog.map((l, i) => {
                  const showHeader = l.section && l.section !== lastSection;
                  if (l.section) lastSection = l.section;
                  const lib = l.section ? (REDEMITTEL_LIBRARY[l.section] ?? { emoji: "•", label: humanizeStrukturKey(l.section), frage: [], antwort: [] }) : null;
                  return (
                    <div key={i}>
                      {showHeader && lib && (
                        <p className="mb-1 mt-4 text-xs font-black uppercase tracking-wide text-sky-600 first:mt-0 dark:text-sky-400">{lib.emoji} {lib.label}</p>
                      )}
                      <p className="text-sm leading-relaxed">
                        <span className={`font-black ${l.speaker === "A" ? "text-sky-600 dark:text-sky-400" : "text-rose-600 dark:text-rose-400"}`}>{l.speaker}:</span>{" "}
                        <span className="text-foreground">{l.text}</span>
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
                <HelpCircle className="h-3.5 w-3.5" /> Weitere mögliche Fragen
              </h4>
              <div className="space-y-2">
                {tb.moegliche_fragen.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
                    <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-foreground">{f}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <Lightbulb className="h-3.5 w-3.5" /> Antwortideen
              </h4>
              <div className="space-y-2">
                {tb.moegliche_antworten_ideen.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm text-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {page === "wortschatz" && tb && (
        <div className="grid gap-6 sm:grid-cols-3">
          {([
            ["Wichtige Verben", tb.wortschatz.verben, tb.wortschatz_ar?.verben],
            ["Wichtige Wörter", tb.wortschatz.woerter, tb.wortschatz_ar?.woerter],
            ["Wichtige Adjektive", tb.wortschatz.adjektive, tb.wortschatz_ar?.adjektive],
          ] as [string, string[], string[] | undefined][]).map(([label, items, itemsAr]) => (
            <div key={label}>
              <h3 className="mb-2 text-sm font-black text-foreground">{label}</h3>
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 border-b border-dotted border-border pb-1 text-sm">
                    <span className="font-medium text-foreground">{it}</span>
                    {itemsAr?.[i] && <span dir="rtl" className="text-muted-foreground">{itemsAr[i]}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!tb && page !== "erklaerung" && (
        <p className="text-sm text-muted-foreground">Weitere Inhalte für dieses Thema folgen in Kürze.</p>
      )}
    </TopicModalShell>
  );
}

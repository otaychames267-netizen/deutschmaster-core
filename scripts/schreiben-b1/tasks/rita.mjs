// v2 (B2-style): Rita erzählt von ihrer Hochzeit mit Karl. Points: Ihre neue Arbeitsstelle · wie man in Ihrem Land heiratet · ein Vorschlag für Ritas Hochzeitsreise ·
// ob Sie Rita und Karl besuchen möchten — plus: "Schade, dass du nicht dabei sein konntest", Kleid/Anzug/Festessen, Geschenke/Geld, "Wie läuft's bei dir?".
export const kw = [/Arbeit|Stelle|Job|Kollegen|Firma|Chef/i, /bei uns|in meinem Land|Heimat|Brauch|Bräuche|Tradition|traditionell/i, /Hochzeitsreise|Insel|Meer|Reise|Urlaub|Flitter/i, /besuch/i, /Hochzeit|gratul|Glückwunsch/i, /Karl/, /schade|leider|konnte|Entschuldig|tut mir leid|verpasst/i, /Kleid|Anzug|Festessen|Essen|Tanz|getanzt|Geschenk/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Rita]],

vielen Dank für deine Mail, ich habe mich sehr darüber gefreut! Zuerst herzlichen Glückwunsch zur Hochzeit, dir und Karl. [[Bedauern über die Abwesenheit|Es tut mir leid, dass ich nicht kommen konnte, ich musste arbeiten]]. Ich hätte euch so gern gesehen.

Dein Hochzeitskleid stelle ich mir wunderschön vor, und Karl im schwarzen Anzug, das hätte ich zu gern gesehen. [[Reaktion auf die Beschreibung|Dass es ein Festessen und Tanz gab, klingt nach einem unvergesslichen Tag]].

Du fragst nach meiner Arbeit: Ich habe [[Neue Stelle|vor drei Monaten als Verkäuferin in einem Modegeschäft angefangen]]. Die Arbeit gefällt mir, weil [[Grund für die Zufriedenheit|die Kollegen nett sind und ich viel mit Kunden spreche]].

In meinem Land feiert man Hochzeiten so: [[Hochzeitsbrauch|Die Feier dauert drei Tage, und die Familie tanzt und isst gemeinsam]]. Besonders schön ist [[Besonderer Brauch|die Henna-Nacht vor der Hochzeit]].

Für eure Hochzeitsreise schlage ich [[Reiseziel|eine Woche auf Mallorca]] vor, weil [[Grund für das Reiseziel|man dort Strand, Natur und gutes Essen hat]].

Euch zu besuchen, wäre wunderbar. Ich komme gern [[Zeitpunkt des Besuchs|im Frühjahr für ein langes Wochenende]].

Zu den Geschenken habe ich noch eine Frage: [[Frage zu den Geschenken|Was hat euch am meisten gefreut?]] Ich möchte euch auch etwas schenken, vielleicht [[Geschenkidee|ein Fotoalbum oder einen Gutschein für ein schönes Abendessen]]. Das bringe ich mit, wenn ich euch besuche.

Schreib mir bitte, [[Frage an die Freundin|wann es euch am besten passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samira]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name der Freundin|Rita]],

na, du Frischverheiratete! Glückwunsch zur Hochzeit mit Karl, das ist ja toll. [[Bedauern über die Abwesenheit|Ich wäre so gern gekommen, aber leider hatte ich genau an dem Wochenende Dienst]]. Das tut mir echt leid.

Karl im Anzug statt in Jeans, das hätte ich zu gern gesehen! [[Reaktion auf die Beschreibung|Festessen, Tanz und viele Geschenke klingen nach einem super Tag]].

Meine neue Stelle? [[Neue Stelle|Ich arbeite jetzt in einer Werbeagentur und mache Grafiken]]. Es gefällt mir richtig gut, denn [[Grund für die Zufriedenheit|die Aufgaben sind abwechslungsreich und mein Chef ist locker]].

Bei uns heiratet man so: [[Hochzeitsbrauch|Erst eine kleine Zeremonie, dann feiert die ganze Familie bis in die Nacht]]. Was bei euch üblich ist, kenne ich ja jetzt auch.

Zur Hochzeitsreise: Fahrt doch [[Reiseziel|nach Kroatien, an die Adria]]! Da gibt es [[Grund für das Reiseziel|Sonne, Meer und kleine Inseln]].

Besuchen komme ich euch gern, vielleicht [[Zeitpunkt des Besuchs|im Sommer, wenn ich Urlaub habe]].

Und noch ein Gedanke: Ich schicke euch als Nachträgliches [[Geschenkidee|ein kleines Hochzeitsgeschenk aus meinem Land]], und ich schreibe [[Karte|eine ganz persönliche Karte dazu]]. Ich freue mich schon darauf, [[Fotos|Bilder von der Feier zu sehen]].

Ich freue mich schon sehr auf ein Wiedersehen mit euch beiden. Melde dich, [[Frage an die Freundin|ob ihr dann Zeit habt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Rita]],

wow, eine Hochzeit mit über fünfzig Gästen, wie wunderbar! Herzlichen Glückwunsch dir und Karl. [[Bedauern über die Abwesenheit|Ich bin traurig, dass ich nicht dabei sein konnte]].

Dein langes weißes Kleid und Karls schwarzer Anzug, das muss großartig ausgesehen haben! [[Reaktion auf die Beschreibung|Festessen, Tanz und viele Geschenke, das klingt wie ein Märchen]].

Bei mir gibt es auch Neuigkeiten: Ich habe eine neue Arbeit! [[Neue Stelle|Ich arbeite jetzt als Krankenschwester in einem großen Krankenhaus]]. Sie gefällt mir sehr, weil [[Grund für die Zufriedenheit|ich Menschen helfen kann und tolle Kollegen habe]].

In meinem Land wird so geheiratet: [[Hochzeitsbrauch|Mit Musik, Umzug durch die Straßen und einem riesigen Buffet]]. Besonders [[Besonderer Brauch|der Tanz der Braut mit allen Gästen]] ist wunderschön.

Für eure Hochzeitsreise habe ich einen Traum: [[Reiseziel|Italien, Rom und die Amalfiküste]]! Dort [[Grund für das Reiseziel|gibt es Kultur, Meer und das beste Eis]].

Besuchen möchte ich euch auf jeden Fall, [[Zeitpunkt des Besuchs|am liebsten im Herbst]].

Ich möchte euch außerdem sagen, wie sehr ich mich für euch freue: [[Wunsch an das Paar|Ich wünsche euch Gesundheit, Glück und viel Liebe]]. Zur Erinnerung an diesen Tag schicke ich euch [[Geschenkidee|eine kleine Silberkette für Rita]]. Karl bekommt [[Geschenk für Karl|ein schönes Buch über Reisen]].

Ich freue mich so sehr für euch. Erzähl mir, [[Frage an die Freundin|wie ihr die Hochzeitsreise plant]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Rita]],

vielen Dank für deine Nachricht und herzlichen Glückwunsch zur Hochzeit. [[Bedauern über die Abwesenheit|Ich bedaure sehr, dass ich nicht teilnehmen konnte, da ich beruflich verhindert war]]. Auf deine Fragen antworte ich der Reihe nach, und ich wünsche euch beiden, dir und Karl, viel Glück für die gemeinsame Zukunft.

Erstens, meine Arbeit: [[Neue Stelle|Ich arbeite seit zwei Monaten als Sachbearbeiterin in einer Versicherung]]. Die Stelle gefällt mir, weil [[Grund für die Zufriedenheit|sie gut organisiert ist und ich Verantwortung habe]].

Zweitens, die Hochzeit in meinem Land: [[Hochzeitsbrauch|Zuerst gibt es eine standesamtliche Trauung, danach feiert die Familie mit einem Festessen]]. Üblich ist außerdem, dass [[Besonderer Brauch|die Gäste Geld oder Gold schenken]].

Drittens, die Hochzeitsreise: Ich empfehle [[Reiseziel|eine Rundreise durch die Toskana]]. Dafür spricht, dass [[Grund für das Reiseziel|sie romantisch ist und das Geld gut reicht]].

Viertens, der Besuch: Ich komme euch gern besuchen, [[Zeitpunkt des Besuchs|am besten im Mai]].

Außerdem finde ich es schön, dass ihr das Geld der Gäste für die Hochzeitsreise nutzt. Mein Tipp für die Planung: [[Reisetipp|Bucht früh, dann ist es günstiger]]. Und für das Wetter empfehle ich [[Reisezeit|den Frühling oder den Herbst]], weil [[Grund für die Reisezeit|es dann nicht zu heiß und nicht zu voll ist]].

Bitte teile mir mit, [[Frage an die Freundin|ob dir dieser Zeitpunkt passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Rita]],

danke für deine Mail und herzlichen Glückwunsch zur Hochzeit! [[Bedauern über die Abwesenheit|Es tut mir leid, dass ich nicht kommen konnte, ich hatte keinen Urlaub]]. Dafür helfe ich dir und Karl jetzt gern bei der Planung der Hochzeitsreise.

Das Fest mit Festessen und Tanz klingt wunderbar. [[Reaktion auf die Beschreibung|Ich hoffe, ihr habt viele schöne Fotos gemacht]].

Zu meiner Arbeit: [[Neue Stelle|Ich arbeite jetzt in einem Hotel an der Rezeption]]. Das ist praktisch, denn [[Grund für die Zufriedenheit|ich kann euch gute Hotel-Tipps für die Reise geben]].

In meinem Land heiratet man [[Hochzeitsbrauch|mit einer großen Familienfeier und einem langen Festessen]]. Wenn ihr wollt, [[Hilfsangebot|schicke ich euch Fotos von unserem Hochzeitsfest zum Vergleichen]].

Für die Hochzeitsreise empfehle ich [[Reiseziel|eine Woche in Portugal]], weil [[Grund für das Reiseziel|es günstig ist und tolle Strände hat]]. Ich suche euch gern [[Praktische Hilfe|passende Unterkünfte im Internet heraus]].

Zum Besuch: Ich komme gern, [[Zeitpunkt des Besuchs|vielleicht im Oktober]].

Zum Gegenbesuch habe ich noch einen Gedanken: Wenn ihr zu mir kommt, [[Programm für den Besuch|zeige ich euch meine Stadt und koche für euch]]. Platz habe ich [[Übernachtung|in meinem Gästezimmer]], und ich freue mich schon sehr darauf, euch [[Wiedersehen|nach so langer Zeit wiederzusehen]].

Sag mir bitte, [[Frage an die Freundin|ob ich euch bei der Reise helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Rita]],

ich gratuliere dir herzlich zur Hochzeit, denn [[Begründung für den Glückwunsch|ihr zwei passt wirklich gut zusammen]]. [[Bedauern über die Abwesenheit|Ich bedaure sehr, dass ich nicht dabei sein konnte, ich musste verreisen]].

Dein Bericht über das Fest gefällt mir, weil [[Grund für die Freude|man spürt, wie glücklich ihr wart]]. Karl in einem schwarzen Anzug hätte ich gern gesehen.

Meine neue Stelle gefällt mir, weil [[Grund für die Zufriedenheit|ich selbstständig arbeiten kann]]. [[Neue Stelle|Ich bin jetzt Buchhalterin in einer kleinen Firma]], und die Kollegen sind sehr nett.

Hochzeiten in meinem Land laufen so ab: [[Hochzeitsbrauch|Eine große Feier mit Familie und Nachbarn, bei der alle mittanzen]]. Das ist wichtig, da [[Grund für den Brauch|die Gemeinschaft bei uns einen hohen Stellenwert hat]].

Als Hochzeitsreise empfehle ich [[Reiseziel|eine Kreuzfahrt im Mittelmeer]], weil [[Grund für das Reiseziel|ihr dann mehrere Länder sehen könnt]].

Besuchen würde ich euch gern, [[Zeitpunkt des Besuchs|im Herbst, da habe ich Urlaub]]. Ich freue mich sehr für euch beide und für Karl, denn er ist ein sehr netter Mann.

Ein Wort noch zu den Kollegen: Mit ihnen verstehe ich mich [[Verhältnis zu den Kollegen|sehr gut, wir gehen oft zusammen Mittag essen]]. Das ist mir wichtig, denn [[Grund für die Zufriedenheit|ein gutes Team macht die Arbeit leichter]]. Mein Chef ist [[Eindruck vom Chef|freundlich und fair]].

Schreib mir, [[Frage an die Freundin|ob ihr meine Reiseidee gut findet]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Rita]],

danke für deine Mail, hier kurz meine Antworten. Glückwunsch zur Hochzeit! [[Bedauern über die Abwesenheit|Schade, dass ich nicht dabei sein konnte, ich musste arbeiten]].

Hochzeit: [[Reaktion auf die Beschreibung|Dein Kleid, Karls Anzug und das Festessen klingen wundervoll]].

Neue Arbeit: [[Neue Stelle|Ich arbeite jetzt als Lehrerin an einer Grundschule]]. Sie gefällt mir, [[Grund für die Zufriedenheit|weil die Kinder lebendig sind]].

Heiraten in meinem Land: [[Hochzeitsbrauch|Große Feier mit der ganzen Familie, Musik und traditionellem Essen]].

Hochzeitsreise: Mein Vorschlag ist [[Reiseziel|Griechenland mit den Inseln]], weil [[Grund für das Reiseziel|es dort warm und romantisch ist]].

Besuch: Ich komme gern, [[Zeitpunkt des Besuchs|im Sommer]].

Dazu noch eine Frage an euch: Wo möchtet ihr nach der Reise wohnen, und [[Frage zur Wohnung|habt ihr schon eine Wohnung gefunden?]] Ich helfe euch gern, wenn ihr [[Hilfsangebot|Möbel tragen oder streichen müsst]]. Das mache ich wirklich gern.

Ich freue mich sehr für euch beide. Karl ist ein netter Mann, und ich glaube, dass ihr [[Wunsch an das Paar|sehr glücklich miteinander werdet]]. Denkt bitte daran, [[Bitte an das Paar|mir ein paar Fotos zu schicken]]. Ich bin schon neugierig auf alle Geschichten von dem Fest und werde mir viel Zeit nehmen, sie zu lesen. Ich freue mich, bald von euch zu hören. Gib mir kurz Bescheid, [[Frage an die Freundin|wann ihr Zeit habt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Rita]],

Glückwunsch zur Hochzeit! Karl im Anzug, das ist ja fast ein Wunder, und ich hätte Beweisfotos gebraucht. [[Bedauern über die Abwesenheit|Ich konnte leider nicht kommen, mein Chef hatte kein Herz]].

Dein Kleid klingt wie aus dem Märchen, und das Festessen [[Reaktion auf die Beschreibung|hätte ich gern probiert, das gehört zur Hochzeit]].

Meine Arbeit: [[Neue Stelle|Ich arbeite jetzt in einem Restaurant als Kellnerin und trage täglich fünf Teller]]. Es gefällt mir, denn [[Grund für die Zufriedenheit|ich bekomme viel Trinkgeld und lerne nette Leute kennen]].

In meinem Land heiratet man mit [[Hochzeitsbrauch|vierhundert Gästen und Musik, die man noch drei Straßen weiter hört]]. Ihr hattet fünfzig, das ist fast intim.

Für die Hochzeitsreise empfehle ich [[Reiseziel|eine Insel ohne Handyempfang]], weil [[Grund für das Reiseziel|man dort endlich Zeit füreinander hat]].

Besuchen komme ich euch gern, [[Zeitpunkt des Besuchs|sobald ihr Platz für einen Gast habt]].

Ein kleiner Tipp noch, falls ihr eine Reise plant: [[Reisetipp|Nehmt ein Reisebuch mit Karten mit]], damit ihr unterwegs nichts verpasst. Und vergesst nicht, [[Reiseaufgabe|ganz viele Fotos zu machen und sie mir zu schicken]]. Ich bin schon neugierig darauf.

Ich bin schon gespannt auf [[Vorfreude|eure Fotos]] und freue mich auf eure Geschichten. Schreib mir bald, [[Frage an die Freundin|ob ich Karl in Jeans oder im Anzug erwarten soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Rita]],

als ich deine Mail gelesen habe, musste ich an unsere gemeinsame Zeit denken. [[Bedauern über die Abwesenheit|Ich wäre so gern gekommen, aber leider lag ich mit Grippe im Bett]]. Dafür gratuliere ich dir jetzt von ganzem Herzen.

Ich kann mir dein Kleid und Karls Anzug gut vorstellen. [[Reaktion auf die Beschreibung|Ich habe sofort das Festessen und die Musik vor Augen gehabt]].

Du fragst, wie es bei mir läuft: [[Neue Stelle|Ich habe vor kurzem in einem Verlag angefangen]]. Die Arbeit gefällt mir, weil [[Grund für die Zufriedenheit|ich den ganzen Tag mit Büchern zu tun habe]].

Bei meiner Schwester gab es eine Hochzeit nach den Bräuchen meines Landes: [[Hochzeitsbrauch|Sie hat drei Tage gefeiert, mit Tanz und viel Essen]]. Ich erinnere mich gern daran.

Für eure Hochzeitsreise hätte ich einen Vorschlag: [[Reiseziel|Nordspanien mit Meer und Bergen]]. Ich war selbst dort, [[Grund für das Reiseziel|und es war traumhaft]].

Besuchen möchte ich euch gern, [[Zeitpunkt des Besuchs|am liebsten im Frühling]].

Mit meiner Familie war es bei meiner eigenen Feier anders: [[Eigene Erfahrung|Wir haben zu Hause gefeiert und das Essen selbst gekocht]]. Ich erinnere mich gern daran, denn [[Grund für die Erinnerung|alle haben mitgeholfen und es war sehr herzlich]]. So eine Feier wünsche ich euch auch.

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit euch beiden]]. Erzähl mir, [[Frage an die Freundin|ob ihr schon Pläne für die Reise habt]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Rita]],

danke für deine Mail und Glückwunsch zur Hochzeit mit Karl! [[Bedauern über die Abwesenheit|Schade, dass ich nicht kommen konnte, aber ich hatte einen wichtigen Termin]]. Ich habe gleich mehrere Vorschläge für euch.

Mein erster Vorschlag betrifft die Hochzeitsreise: [[Reiseziel|Fahrt nach Sizilien]], denn [[Grund für das Reiseziel|dort gibt es Strand, Kultur und gutes Essen]]. Mein zweiter Vorschlag: [[Reisezeit|Fahrt im September, wenn es nicht mehr so heiß ist]].

Mein dritter Vorschlag: Besucht mich! Ich lade euch ein, [[Zeitpunkt des Besuchs|im Frühling für eine Woche zu kommen]].

Zu meiner Arbeit: [[Neue Stelle|Ich arbeite jetzt als Ingenieurin bei einer Baufirma]]. Das gefällt mir, [[Grund für die Zufriedenheit|weil ich viel draußen bin]].

Und wie man in meinem Land heiratet? [[Hochzeitsbrauch|Mit einem langen Fest und vielen Gästen]]. Mein vierter Vorschlag: Wenn ihr Lust habt, [[Vorschlag für eine Feier|feiern wir bei meinem Besuch noch einmal im kleinen Kreis]].

Außerdem möchte ich noch erwähnen, dass ich euch beim nächsten Treffen [[Mitbringsel|eine Spezialität aus meiner Heimat]] mitbringe. Und ich zeige euch [[Fotos aus der Heimat|Fotos von Hochzeiten in meinem Land]], damit ihr die Unterschiede seht. Das wird bestimmt spannend für euch beide.

Was hältst du davon? Ich freue mich auf deine Antwort und auf ein Wiedersehen mit dir und Karl. Schreib mir, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Rita]],

danke für deine Mail und herzlichen Glückwunsch zur Hochzeit! [[Bedauern über die Abwesenheit|Dass ich nicht dabei sein konnte, tut mir leid, es ging leider nicht anders]]. Ich möchte einiges antworten, damit du alles weißt.

Das Fest klingt wunderbar. [[Reaktion auf die Beschreibung|Das Kleid sah bestimmt wunderschön aus]].

Meine neue Arbeit: [[Neue Stelle|Ich arbeite jetzt als Pflegerin in einem Altenheim]]. Einerseits [[Vorteil der Stelle|macht sie mir viel Freude]], andererseits [[Nachteil der Stelle|ist sie manchmal anstrengend]]. Insgesamt bin ich zufrieden.

In meinem Land feiert man Hochzeiten [[Hochzeitsbrauch|meist sehr groß und mit viel Tradition]], aber das ist von Familie zu Familie verschieden.

Für die Hochzeitsreise wäre vielleicht [[Reiseziel|ein ruhiger Ort am Meer]] gut, wenn ihr Erholung sucht. Ihr könnt natürlich auch [[Alternative Reiseidee|eine Städtereise machen]].

Ich würde euch gern besuchen, [[Zeitpunkt des Besuchs|aber ich muss noch klären, wann ich Urlaub bekomme]].

Zum Schluss noch eine Bitte: Schick mir [[Bitte um Fotos|ein paar Fotos von der Hochzeit]], wenn du Zeit hast. Ich möchte [[Wunsch|dein Kleid und Karls Anzug endlich sehen]]. Und erzähl mir doch, [[Frage zur Feier|wer alles getanzt hat und welche Musik gespielt wurde]].

Ich freue mich sehr für euch beide und wünsche euch einen guten Start in die Ehe, auch wenn wir uns länger nicht gesehen haben. Schreib mir bitte, [[Frage an die Freundin|ob dir meine Gedanken helfen]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Rita]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: Herzlichen Glückwunsch zur Hochzeit! [[Bedauern über die Abwesenheit|Es tut mir leid, dass ich nicht dabei sein konnte]].

Als Nächstes zu deinem Bericht: [[Reaktion auf die Beschreibung|Dein Kleid, das Festessen und der Tanz klingen toll]].

Dann zu meiner Arbeit: [[Neue Stelle|Ich arbeite jetzt als Köchin in einem Hotel]]. Sie gefällt mir, [[Grund für die Zufriedenheit|weil ich kreativ sein darf]].

Danach zum Heiraten in meinem Land: [[Hochzeitsbrauch|Zuerst die Trauung, dann ein Festessen und am Abend ein großes Tanzfest]].

Dann zur Hochzeitsreise: Ich schlage [[Reiseziel|die Türkei vor, am besten die Südküste]], weil [[Grund für das Reiseziel|das Wetter schön ist und es nicht teuer ist]].

Zuletzt zum Besuch: Ich komme gern, [[Zeitpunkt des Besuchs|im Juni]].

Falls ihr noch eine Wohnung sucht oder umziehen wollt, sage ich Bescheid, [[Hilfsangebot|wenn ich einen Tipp für euch habe]]. Ich arbeite ja jetzt in der Nähe, und [[Hilfe vor Ort|ich kenne einige Vermieter]]. Das ist vielleicht eine Hilfe für euch zwei.

Ich freue mich sehr für dich und Karl. Das war bestimmt ein schöner Tag, und ich wünsche euch viel Glück. Ich denke oft an [[Erinnerung|unsere gemeinsame Zeit damals]] zurück und bin gespannt auf [[Vorfreude|eure Fotos und Geschichten]]. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|ob dieser Plan passt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Rita]],

deine Mail hat mich sehr gefreut, und von Herzen: Glückwunsch zur Hochzeit! [[Bedauern über die Abwesenheit|Ich bin traurig, dass ich nicht dabei sein konnte]]. Ich habe an euch gedacht.

Das Fest hat sich so schön angehört. [[Reaktion auf die Beschreibung|Ich wünsche Karl und dir ein glückliches Leben, das Kleid war sicher traumhaft]].

Du fragst nach meiner Arbeit: [[Neue Stelle|Ich arbeite jetzt als Erzieherin in einem Kindergarten]]. Ich fühle mich dort wohl, denn [[Grund für die Zufriedenheit|die Kinder sind herzlich und die Kolleginnen unterstützen mich]].

Wie man bei uns heiratet? [[Hochzeitsbrauch|Mit vielen Segenswünschen der Familie und einem Fest, an dem alle teilnehmen]]. Das ist uns sehr wichtig.

Für eure Hochzeitsreise wünsche ich euch [[Reiseziel|eine ruhige Insel mit Sonne und Zeit füreinander]]. Ich denke, [[Grund für das Reiseziel|dort könnt ihr euch richtig erholen]].

Euch zu besuchen, würde mich freuen, [[Zeitpunkt des Besuchs|gern im Herbst]].

Und wenn ich euch besuche, möchte ich [[Wunsch beim Besuch|mit euch einen langen Spaziergang machen]], und ich möchte [[Plan beim Besuch|euer neues Zuhause sehen]]. Für diesen Besuch spare ich schon [[Sparplan|ein paar Euro jeden Monat]], damit ich euch nicht mit leeren Händen besuche.

Ich denke oft an euch und freue mich auf ein Wiedersehen. Erzähl mir, [[Frage an die Freundin|wie es euch als Ehepaar geht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Rita]],

Glückwunsch zur Hochzeit! [[Bedauern über die Abwesenheit|Schade, dass ich nicht dabei war, ich hatte keine Chance freizubekommen]]. Dafür gibt es jetzt viele Fragen von mir.

Kleid, Anzug, Festessen, Tanz: [[Reaktion auf die Beschreibung|Das klingt nach einem perfekten Tag]]. Karl in Schwarz, ich hätte lachen müssen.

Meine Arbeit: [[Neue Stelle|Ich bin jetzt in einem Büro und mache Terminplanung]]. Mir gefällt's, [[Grund für die Zufriedenheit|weil die Kollegen locker sind]].

Heiraten bei uns: [[Hochzeitsbrauch|Viel Essen, viel Musik, viele Gäste]]. Mehr braucht man nicht.

Hochzeitsreise: Macht doch [[Reiseziel|eine Städtereise nach Lissabon]], weil [[Grund für das Reiseziel|es dort günstig und schön ist]].

Besuch: Klar, [[Zeitpunkt des Besuchs|irgendwann im Sommer]].

Ach ja, noch etwas zum Fest: Habt ihr [[Frage zur Feier|ein Hochzeitsvideo gemacht?]] Das würde ich gern sehen. Ich freue mich auch auf [[Vorfreude|Bilder von Karl im Anzug]], denn das ist bestimmt ein seltener Anblick. Und ich schicke euch [[Gruß|zwei liebe Grüße von meiner ganzen Familie]].

Ich freue mich so für dich und Karl und denke gern an unsere gemeinsame Zeit zurück. Wenn ihr zurück seid, erzählt ihr mir bestimmt alles ganz genau, und ich kann es kaum erwarten, eure Fotos zu sehen. Das wird bestimmt ein richtig toller Abend für uns.

Meld dich, [[Frage an die Freundin|sobald ihr wisst, wohin ihr fahrt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

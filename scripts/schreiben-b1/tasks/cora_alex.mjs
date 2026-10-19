// v2 (B2-style): Cora und Alex (Marseille) wollen im Sommer zu Besuch kommen (höchstens drei Tage, ohne Auto). Points: die beste Zeit für den Besuch, warum · wie die Freunde am besten anreisen ·
// was Sie gern zusammen mit den Freunden machen möchten · Fragen zu Marseille — plus: Ende Juni oder Ende August, höchstens drei Tage, bitte bald melden.
export const kw = [/Juni|August|Sommer|Termin|Zeit/i, /Zug|Bus|Flug|anreisen|Bahnhof|Flughafen|Fernbus|fahren/i, /zusammen|gemeinsam|unternehmen|machen/i, /Marseille/, /drei Tage|bleiben|Übernacht|schlafen|Gästezimmer|Sofa/i, /Auto/, /Frankreich|Jahr/i, /\?/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Cora]], lieber [[Name des Freundes|Alex]],

vielen Dank für eure Mail, ich habe mich riesig gefreut! Entschuldigt bitte, dass ich mich so lange nicht gemeldet habe. [[Grund für die Pause|Bei mir war viel los, aber ich habe oft an euch gedacht]].

Dass ihr schon fast ein Jahr in Frankreich lebt, klingt wunderbar. Wie gefällt euch Marseille am meisten? [[Frage zu Marseille|Ist das Leben dort teuer, und kommt ihr mit der Sprache zurecht]]?

Euer Besuch ist eine schöne Idee. Am besten passt mir [[Zeitraum|Ende August]], weil [[Grund für den Zeitraum|ich dann Urlaub habe und viel Zeit für euch]]. Ende Juni habe ich [[Einschränkung im Juni|leider wichtige Termine bei der Arbeit]].

Zur Anreise ohne Auto empfehle ich [[Verkehrsmittel|den Zug bis zum Hauptbahnhof]]. Von dort [[Weg vom Bahnhof|fahrt ihr mit der Straßenbahn bis zu meiner Haltestelle]].

Drei Tage sind genau richtig. Ihr könnt bei mir [[Schlafplatz|im Gästezimmer übernachten]]. Zusammen können wir [[Aktivität 1|die Altstadt erkunden]] und [[Aktivität 2|abends in meinem Lieblingsrestaurant essen]].

Ich habe mir auch schon Gedanken zum Programm gemacht: Am ersten Abend [[Programm Abend 1|gehen wir gemütlich essen und reden über alles]]. Am zweiten Tag [[Programm Tag 2|machen wir einen Ausflug an einen See in der Nähe]]. Dazu packe ich [[Proviant|Obst, Brote und kalte Getränke]] ein, damit niemand Hunger hat.

Es freut mich besonders, dass ihr nach einem Jahr in Frankreich an uns Freunde denkt. Ohne Auto ist die Reise zwar etwas umständlicher, aber [[Vorteil der Bahnfahrt|ihr könnt im Zug entspannen und die Landschaft genießen]]. Zusammen werden wir [[Wunsch|über alte Zeiten lachen und neue Pläne machen]].

Schreibt mir bitte bald, [[Frage an die Freunde|welche Tage euch am besten passen]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Namen der Freunde|ihr beiden]],

schön, von euch zu hören! Sorry, dass ich so lange nichts habe von mir hören lassen. [[Grund für die Pause|Der Alltag hat mich fest im Griff gehabt]].

Marseille klingt ja super! Wie ist das Wetter dort im Sommer? [[Frage zu Marseille|Und stimmt es, dass man dort fast nur Fisch isst]]? Das würde mich echt interessieren.

Euer Besuch? Gern! [[Zeitraum|Ende Juni]] passt bei mir, [[Grund für den Zeitraum|da ist das Wetter schön und mein Chef gönnt mir freie Tage]]. Ende August wäre auch noch okay.

Ohne Auto kommt ihr am besten [[Verkehrsmittel|mit dem Fernbus]], das ist günstig. Vom Busbahnhof [[Weg vom Bahnhof|holt euch am besten die U-Bahn ab]].

Drei Tage sind ideal. Schlafen könnt ihr [[Schlafplatz|auf dem Sofa und auf einer Luftmatratze]]. Wir könnten [[Aktivität 1|zusammen grillen]] und [[Aktivität 2|am See baden gehen]].

Weil ihr kein Auto habt, kann ich [[Fahrangebot|euch am Bahnhof abholen und zu euren Ausflügen fahren]]. Ich leihe mir [[Auto|das Auto meines Bruders]], dann sind wir flexibel. So könnt ihr euch entspannen, und ich zeige euch [[Ausflugsziel|die schönsten Orte in der Umgebung]].

Ihr lebt jetzt ein Jahr in Frankreich, und ich bin gespannt, [[Neugier|wie sich euer Alltag verändert hat]]. Weil ihr kein Auto habt, [[Hilfe bei der Anreise|schicke ich euch einen Plan mit allen Umstiegen]]. Zusammen machen wir bestimmt [[Programmidee|einen langen Spaziergang am Fluss]].

Meldet euch, [[Frage an die Freunde|ob der Termin klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Namen der Freunde|Cora und Alex]],

wow, was für eine tolle Überraschung in meinem Postfach! Entschuldigt, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Ich war in Arbeit und Umzug fast ertrunken, aber jetzt bin ich wieder da]].

Ihr lebt schon ein Jahr in Marseille, unglaublich! Was ist euer Lieblingsplatz dort? [[Frage zu Marseille|Und wie schmeckt die echte Bouillabaisse]]? Ich bin so neugierig!

Euer Besuch ist die beste Idee des Jahres. Mein Favorit für den Termin ist [[Zeitraum|Ende Juni]], weil [[Grund für den Zeitraum|dann der Sommer anfängt und ich noch viele freie Abende habe]].

Wie ihr anreist, ganz ohne Auto? Am besten [[Verkehrsmittel|mit dem Flugzeug und danach mit dem Zug]], das ist schnell und bequem. Vom Flughafen [[Weg vom Bahnhof|fährt ein Shuttlebus zum Hauptbahnhof]].

Drei Tage? Wunderbar! Schlafen könnt ihr [[Schlafplatz|in meinem Gästezimmer mit Blick auf den Garten]]. Zusammen möchte ich [[Aktivität 1|mit euch in die Berge fahren]] und [[Aktivität 2|ein großes Fest für alle Freunde machen]].

Außerdem möchte ich noch einige Freunde einladen, damit es ein richtiges Wiedersehen wird: [[Weitere Gäste|Markus, Aylin und meine Nachbarin]] würden sich sicher freuen. Wir könnten [[Gemeinsamer Abend|einen Spieleabend im Garten machen]], falls das Wetter gut ist.

Nach einem Jahr in Frankreich habt ihr bestimmt viel zu erzählen. Ich mache gern [[Angebot|für alle Abendessen und Frühstück]], damit wir zusammen Zeit zum Reden haben. Ohne Auto seid ihr [[Mobilität vor Ort|bei Ausflügen auf mich angewiesen, aber das mache ich gern]].

Schreibt mir bald, [[Frage an die Freunde|ob ihr Lust darauf habt]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Namen der Freunde|Cora und Alex]],

vielen Dank für eure Nachricht. Zu euren Fragen nehme ich der Reihe nach Stellung. Entschuldigt bitte meine lange Pause: [[Grund für die Pause|Ich hatte beruflich viel zu tun]].

Erstens, der Termin: Für den Besuch ist [[Zeitraum|Ende August]] am besten, weil [[Grund für den Zeitraum|ich dann Urlaub habe]]. Ende Juni passt mir weniger, denn [[Einschränkung im Juni|ich arbeite in dieser Zeit viel]].

Zweitens, die Anreise ohne Auto: Ich empfehle [[Verkehrsmittel|den Zug bis zum Hauptbahnhof]]. Von dort [[Weg vom Bahnhof|nehmt ihr die Straßenbahn Linie 3 in Richtung Stadtmitte]].

Drittens, die Aufenthaltsdauer: Drei Tage sind in Ordnung. Übernachten könnt ihr [[Schlafplatz|bei mir im Gästezimmer]].

Viertens, das Programm: Wir können [[Aktivität 1|die Altstadt besichtigen]] und [[Aktivität 2|eine Bootsfahrt machen]].

Fünftens, meine Fragen: Wie lebt es sich in Marseille? [[Frage zu Marseille|Wie viel kostet eine Wohnung in der Stadt]]?

Zur Planung vor eurem Besuch: Ich schaue [[Information|nach den besten Zugverbindungen und den Preisen]] und schicke euch [[Material|eine kleine Karte mit meinen Lieblingsorten]]. Wenn ihr wollt, buche ich [[Reservierung|einen Tisch in einem guten Restaurant für den Samstagabend]].

Ich bin neugierig, wie es euch nach einem Jahr in Frankreich geht: [[Neugier|Habt ihr schon Freunde gefunden und die Sprache gelernt]]? Da ihr kein Auto habt, [[Tipp zur Mobilität|sind die Zug- und Busverbindungen bei mir ziemlich gut]]. Zusammen können wir [[Ausflug|die Region erkunden]].

Bitte gebt mir Bescheid, [[Frage an die Freunde|welcher Termin für euch passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Hallo [[Namen der Freunde|Cora und Alex]],

danke für eure Mail! Entschuldigt, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Ich hatte ein stressiges halbes Jahr]], aber jetzt helfe ich euch gern bei der Planung.

Marseille interessiert mich sehr. Wie ist die Wohnungssuche dort? [[Frage zu Marseille|Und könnt ihr mir ein paar Tipps für eine Reise dorthin geben]]?

Für euren Besuch schlage ich [[Zeitraum|Ende Juni]] vor, weil [[Grund für den Zeitraum|ich dann zwei Tage freinehmen kann]]. Ich kann [[Praktische Hilfe|die Zugverbindungen heraussuchen und die Tickets für euch reservieren]].

Da ihr kein Auto habt, würde ich [[Verkehrsmittel|den Zug empfehlen]], denn [[Grund für das Verkehrsmittel|er ist günstig und kommt direkt in die Stadtmitte]]. Ich hole euch [[Abholung|am Bahnhof ab]], wenn ich Zeit habe.

Drei Tage reichen. Übernachten könnt ihr [[Schlafplatz|in meiner Wohnung]]. Wir können zusammen [[Aktivität 1|ein Fahrrad leihen und die Stadt anschauen]].

Ich freue mich schon darauf, euch alles zu zeigen: [[Sehenswürdigkeit|das alte Rathaus, den Markt und die kleinen Gassen]]. Und natürlich [[Besonderheit|meine Lieblingsbäckerei mit dem besten Kuchen]]. Das ist für mich der schönste Teil, wenn Freunde zu Besuch kommen.

Dass ihr schon fast ein Jahr in Frankreich lebt, beeindruckt mich. Ohne Auto zu reisen, ist [[Einstellung zum Reisen|umweltfreundlich und gar nicht schwer]], und ich helfe euch dabei. Wenn wir zusammen sind, machen wir [[Programmidee|das, worauf ihr Lust habt]].

Sagt mir, [[Frage an die Freunde|ob ich noch etwas vorbereiten soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Liebe [[Namen der Freunde|Cora und Alex]],

ich habe mich lange nicht gemeldet, weil [[Grund für die Pause|bei mir viel Arbeit war und ich abends müde war]]. Das tut mir leid. Dafür freue ich mich jetzt umso mehr über eure Mail.

Marseille interessiert mich aus mehreren Gründen. Wie ist das Leben dort? [[Frage zu Marseille|Gibt es viele Touristen, und wie ist die Stimmung im Alltag]]?

Euer Besuch passt am besten [[Zeitraum|Ende August]], denn [[Grund für den Zeitraum|ich habe dann Urlaub, und das Wetter ist stabil]]. Im Juni [[Einschränkung im Juni|habe ich Prüfungen]], deshalb ist es schwierig.

Zur Anreise: Ich empfehle [[Verkehrsmittel|den Zug]], weil [[Grund für das Verkehrsmittel|ihr kein Auto braucht und die Bahnhöfe zentral liegen]].

Drei Tage sind gut, [[Grund für die Dauer|damit ihr genug seht und nicht erschöpft seid]]. Ihr könnt [[Schlafplatz|bei mir schlafen]].

Wir könnten [[Aktivität 1|ein Museum besuchen]] und [[Aktivität 2|am Abend gemeinsam kochen]].

Für den Fall, dass es regnet, habe ich einen Plan B: Wir gehen [[Regenplan|ins Museum und danach in ein Café]], oder wir bleiben zu Hause und [[Alternativprogramm|schauen alte Fotos und kochen zusammen]]. So ist jeder Tag schön, egal wie das Wetter wird.

Nach einem Jahr in Frankreich seid ihr bestimmt echte Marseille-Experten. Ich würde gern [[Wunsch|mehr über die Stadt, die Märkte und das Essen]] erfahren. Weil ihr kein Auto habt, [[Hilfe|hole ich euch am Bahnhof ab]], und zusammen fahren wir dann zu mir.

Schreibt mir, [[Frage an die Freunde|ob meine Gründe überzeugend sind]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Hallo [[Namen der Freunde|Cora und Alex]],

danke für eure Mail, hier kurz meine Antworten. Sorry für die lange Pause, [[Grund für die Pause|ich hatte viel zu tun]].

Marseille: Wie gefällt euch das Leben in Frankreich? [[Frage zu Marseille|Was kostet das Wohnen dort]]?

Termin: [[Zeitraum|Ende August]] ist gut für mich, [[Grund für den Zeitraum|da habe ich Urlaub]]. Ende Juni geht auch, aber [[Einschränkung im Juni|nur am Wochenende]].

Anreise: [[Verkehrsmittel|Zug bis zum Hauptbahnhof]], danach [[Weg vom Bahnhof|Straßenbahn Linie 5]].

Aufenthalt: Drei Tage passen. Schlafen: [[Schlafplatz|Gästezimmer]].

Programm: [[Aktivität 1|Altstadt-Rundgang]] und [[Aktivität 2|Abendessen im Garten]].

Eine Frage noch zum Gepäck: Ihr braucht nicht viel, denn ich [[Leihangebot|kann euch Handtücher, Bettwäsche und einen Regenschirm leihen]]. Bringt einfach [[Wunsch|gute Laune und bequeme Schuhe]] mit. Das reicht völlig für ein langes, schönes Wochenende.

Ihr lebt ein Jahr in Frankreich, und ich bin schon gespannt auf eure Fotos. Wir können zusammen [[Programmidee|einen Abend mit Bildern und Geschichten machen]]. Da ihr kein Auto habt, [[Tipp|plane ich alles so, dass wir zu Fuß oder mit dem Bus hinkommen]]. Das wird ein schönes Wochenende.

Ich freue mich sehr auf euren Besuch und auf viele schöne Stunden mit euch, und ich hoffe, dass das Wetter mitspielt und wir viel draußen sein können. Gebt mir bitte kurz Bescheid, [[Frage an die Freunde|welche Tage ihr nehmt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Namen der Freunde|Cora und Alex]],

na, ihr lebt also seit einem Jahr in Marseille und habt mich noch nicht eingeladen? Dafür meldet ihr euch jetzt, perfekt. Entschuldigt meine lange Funkstille. [[Grund für die Pause|Mein Chef dachte, ich sei eine Maschine]].

Fragen zu Marseille: Stimmt es, dass man dort jeden Tag Fisch isst? [[Frage zu Marseille|Und wie viele Kilo habt ihr schon zugenommen]]?

Euer Besuch: Ende [[Zeitraum|Juni]] ist ideal, [[Grund für den Zeitraum|da haben wir Sommer, und ich habe Urlaub]]. Ende August wäre ebenfalls möglich, wenn es mich nicht zu sehr trifft.

Ohne Auto kommt ihr am besten [[Verkehrsmittel|mit dem Zug und mit guter Laune]]. Im Gepäck bitte [[Mitbringsel|Käse und Baguette]], nur als Tipp.

Drei Tage sind perfekt, danach [[Folge für den Besuch|brauche ich Urlaub vom Urlaub]]. Schlafen könnt ihr [[Schlafplatz|auf meinem Sofa und der Luftmatratze]].

Wir machen [[Aktivität 1|einen langen Spaziergang]] und [[Aktivität 2|ein riesiges Barbecue]].

Ich möchte euch auch ein bisschen verwöhnen: Zum Frühstück gibt es [[Frühstück|frisches Brot, Marmelade und Rührei]], und abends koche ich [[Gericht|mein Lieblingsgericht, eine große Gemüsepfanne]]. Dann fühlt ihr euch bei mir gleich wie zu Hause.

Ihr habt ein Jahr in Frankreich gelebt und ich noch nicht, deshalb ist euer Besuch für mich besonders spannend, denn [[Grund|ich lerne viel Neues über Marseille]]. Ohne Auto [[Reisetipp|reist ihr am besten mit leichtem Gepäck]]. Zusammen machen wir [[Programmidee|einen Stadtrundgang]].

Schreibt bald, [[Frage an die Freunde|ob ihr ein Vegetarieressen braucht]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Namen der Freunde|Cora und Alex]],

als ich eure Mail gelesen habe, musste ich an unseren letzten Abend zusammen denken. [[Erinnerung an das letzte Treffen|Wir haben auf der Terrasse gesessen und bis spät in die Nacht geredet]]. Entschuldigt, dass ich mich so lange nicht gemeldet habe.

Warum ich so lange nichts von mir hören ließ: [[Grund für die Pause|Ich war krank, danach hatte ich viel nachzuholen]]. Jetzt geht es mir wieder gut.

Ihr lebt seit einem Jahr in Marseille. Wie war der Anfang? [[Frage zu Marseille|Und habt ihr schon Freunde gefunden]]?

Euer Besuch freut mich sehr, am liebsten [[Zeitraum|Ende August]], weil [[Grund für den Zeitraum|ich dann Zeit habe, und der Sommer noch warm ist]].

Ohne Auto empfehle ich [[Verkehrsmittel|den Zug]]. Vom Bahnhof [[Weg vom Bahnhof|geht es mit der U-Bahn direkt zu mir]].

Ihr bleibt drei Tage, und wir können [[Aktivität 1|zusammen am Fluss spazieren gehen]] und [[Aktivität 2|bei mir zu Hause kochen]]. Schlafen könnt ihr [[Schlafplatz|im Wohnzimmer]].

Falls ihr noch etwas Besonderes sehen wollt, sagt es mir. Wir könnten [[Wunschprogramm|ein Konzert besuchen oder einen Tag am Fluss verbringen]], je nachdem, was euch Freude macht. Ich bin da ganz flexibel, denn wichtig ist, dass [[Hauptsache|wir viel Zeit zum Reden haben]].

Nach einem Jahr in Frankreich vermisst ihr bestimmt auch ein paar Dinge von hier: [[Heimatdinge|ein gutes Vollkornbrot oder deutsche Wurst]]. Ich besorge sie, damit ihr euch bei mir wie zu Hause fühlt. Und ohne Auto machen wir alles zusammen zu Fuß.

Erzählt mir, [[Frage an die Freunde|wie es euch dort wirklich geht]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Namen der Freunde|Cora und Alex]],

danke für eure Mail, und entschuldigt meine lange Pause. [[Grund für die Pause|Ich hatte viel Arbeit]]. Ich habe gleich mehrere Vorschläge für euren Besuch.

Mein erster Vorschlag betrifft die Zeit: Kommt [[Zeitraum|Ende August]], weil [[Grund für den Zeitraum|ich dann Urlaub habe]]. Mein zweiter Vorschlag: Reist [[Verkehrsmittel|mit dem Fernbus]] an, das ist günstig.

Mein dritter Vorschlag: Ihr bleibt drei Tage und schlaft [[Schlafplatz|bei mir im Gästezimmer]]. Mein vierter Vorschlag zum Programm: Wir machen [[Aktivität 1|eine Radtour]] und [[Aktivität 2|besuchen ein Konzert]].

Wie ist es in Marseille? [[Frage zu Marseille|Welche Sehenswürdigkeit empfehlt ihr mir, wenn ich euch einmal besuche]]?

Euer Besuch ist für mich auch deshalb schön, weil [[Grund für die Freude|ich in letzter Zeit nur gearbeitet habe]]. Ein paar Tage mit alten Freunden tun mir gut, und ich freue mich, [[Wunsch|über alte Zeiten zu lachen und neue Pläne zu schmieden]]. Danke, dass ihr an mich gedacht habt.

Ich freue mich, dass ihr in Frankreich ein neues Zuhause gefunden habt. Jetzt, nach einem Jahr, wollt ihr Freunde besuchen, und ohne Auto ist [[Reiseidee|ein Zug mit Aussicht eine schöne Lösung]]. Wir machen zusammen [[Programmidee|einen Abend am Fluss mit Musik]], das wird bestimmt unvergesslich.

Was haltet ihr davon? Schreibt mir, [[Frage an die Freunde|welcher Vorschlag euch am besten gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Namen der Freunde|Cora und Alex]],

danke für eure Mail, und entschuldigt bitte, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Es lag nicht an euch, sondern an meinem vollen Kalender]].

Marseille klingt nach einem Abenteuer. Wie fühlt ihr euch dort? [[Frage zu Marseille|Gibt es Probleme mit der Sprache oder mit dem Wohnen]]?

Bei der Terminfrage bin ich unsicher. Einerseits [[Vorteil von Juni|ist Ende Juni schön, weil es noch nicht so heiß ist]], andererseits [[Vorteil von August|habe ich Ende August mehr Zeit]]. Ich würde eher [[Zeitraum|Ende August]] vorschlagen.

Ohne Auto ist die Anreise vielleicht kompliziert. Ich empfehle [[Verkehrsmittel|den Zug, auch wenn er etwas länger dauert]].

Drei Tage sind gut. [[Schlafplatz|Wenn es euch nichts ausmacht, schlaft ihr bei mir im Wohnzimmer]]. Wir könnten [[Aktivität 1|zusammen die Stadt erkunden]], falls das Wetter gut ist.

Wenn ihr ankommt, bekommt ihr von mir [[Begrüßung|einen kleinen Willkommensgruß und einen Stadtplan]]. Außerdem habe ich [[Vorbereitung|eine Liste mit Cafés und Läden für euch gemacht]]. So findet ihr euch auch allein gut zurecht, wenn ich bei der Arbeit bin.

In einem Jahr Frankreich habt ihr sicher viel erlebt, und ich möchte alles hören: [[Neugier|wie ihr euch eingelebt habt und was euch schwerfällt]]. Da ihr kein Auto habt, [[Hilfe|leihe ich mir eins für die Ausflüge]]. Zusammen machen wir [[Programmidee|eine Fahrt zum nächsten See]].

Schreibt mir bitte, [[Frage an die Freunde|ob euch das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Namen der Freunde|Cora und Alex]],

danke für eure Nachricht, ich antworte Schritt für Schritt. Als Erstes: Entschuldigt meine lange Pause. [[Grund für die Pause|Ich war beruflich stark eingespannt]].

Als Nächstes zu Marseille: Wie gefällt euch die Stadt? [[Frage zu Marseille|Wie sind die Menschen dort]]?

Dann zum Termin: [[Zeitraum|Ende August]] passt mir gut, weil [[Grund für den Zeitraum|ich dann Urlaub habe]].

Danach zur Anreise: Ohne Auto nehmt ihr am besten [[Verkehrsmittel|den Zug]]. Ich schicke euch [[Information|die Abfahrtszeiten per Mail]].

Dann zum Aufenthalt: Drei Tage sind okay. Schlafen könnt ihr [[Schlafplatz|bei mir]]. Zuletzt zum Programm: [[Aktivität 1|Altstadt]], [[Aktivität 2|Essen gehen]].

Ich schlage außerdem vor, dass wir uns am Abend vor eurer Abreise [[Abschiedsidee|noch einmal in einem gemütlichen Lokal treffen]]. Dann können wir in Ruhe über alles sprechen, was wir nicht geschafft haben, und [[Weiterer Plan|schon den nächsten Besuch planen]].

Dass ihr fast ein Jahr in Frankreich lebt, macht mich neugierig auf Marseille: [[Neugier|das Meer, die Altstadt und die Märkte]]. Ohne Auto [[Reisetipp|empfehle ich einen Fernbus, der direkt in meine Stadt fährt]]. Zusammen sehen wir uns [[Programmidee|die Sehenswürdigkeiten bei mir an]].

Ich freue mich schon sehr auf euch beide und auf alles, was wir erleben werden. Wie geht es weiter? Schreibt mir, [[Frage an die Freunde|ob ihr einverstanden seid]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Namen der Freunde|Cora und Alex]],

eure Mail hat mich so gefreut! Entschuldigt, dass ich mich lange nicht gemeldet habe. [[Grund für die Pause|Ich war oft in Gedanken bei euch, aber der Alltag war stärker]]. Ich hoffe, ihr verzeiht mir.

Marseille klingt nach einem schönen neuen Zuhause. Wie geht es euch dort? [[Frage zu Marseille|Vermisst ihr manchmal etwas von hier]]?

Euren Besuch erwarte ich mit großer Freude, [[Zeitraum|am liebsten Ende August]], denn [[Grund für den Zeitraum|dann kann ich mir ganz viel Zeit für euch nehmen]].

Ohne Auto kommt ihr bequem [[Verkehrsmittel|mit dem Zug]] zu mir. Ich helfe euch gern bei der Verbindung und [[Hilfsangebot|hole euch vom Bahnhof ab]].

Drei Tage sind ein schöner Rahmen. Ihr schlaft [[Schlafplatz|in meinem Gästebett]]. Wir können [[Aktivität 1|gemütlich frühstücken und spazieren gehen]].

Ich hoffe, ihr habt auch Lust, meine Nachbarschaft kennenzulernen: Hier gibt es [[Besonderheit der Gegend|einen kleinen Markt mit frischem Obst und Gemüse]]. Wir könnten dort [[Aktivität am Markt|am Samstagvormittag einkaufen und etwas Leckeres kochen]], das macht bestimmt Spaß.

Ein Jahr in Frankreich ist eine lange Zeit, und deshalb ist unser Wiedersehen etwas Besonderes. Weil ihr ohne Auto kommt, bin ich [[Gastgeberrolle|euer Fahrer, Stadtführer und Koch in einer Person]]. Zusammen [[Programmidee|erleben wir ein Wochenende voller Überraschungen]].

Erzählt mir, [[Frage an die Freunde|was ihr euch am meisten wünscht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Namen der Freunde|Cora und Alex]],

schön, von euch zu lesen! Sorry für die lange Funkstille, [[Grund für die Pause|ich war total im Stress]].

Marseille klingt cool! Wie ist es da? [[Frage zu Marseille|Gibt es dort gutes Eis und ein Strandcafé]]?

Besuch: [[Zeitraum|Ende August]], das passt gut. [[Grund für den Zeitraum|Ich habe dann Urlaub]].

Ohne Auto: [[Verkehrsmittel|Zug oder Fernbus]], beides geht. Ich schicke euch Tipps.

Drei Tage? Super. Schlafen: [[Schlafplatz|Sofa, Luftmatratze, was ihr wollt]]. Zusammen machen wir [[Aktivität 1|einen Stadtbummel]] und [[Aktivität 2|ein Picknick am Fluss]].

Auch an das Ende des Besuchs denke ich schon: Ich bringe euch [[Abreise|am letzten Tag zum Bahnhof und gebe euch Proviant mit]]. Und ich hoffe, dass ihr bald wiederkommt, denn [[Grund für den Wunsch|so ein Wochenende vergisst man nicht]].

Ich bin froh, dass ihr nach einem Jahr in Frankreich noch an mich denkt. Eure Reise ohne Auto ist für mich kein Problem, denn [[Hilfe|ich plane alles genau, damit ihr bequem ankommt]]. Zusammen werden wir [[Programmidee|viel lachen und gut essen]].

Ich freue mich echt auf euch, das wird bestimmt super, und wir haben so viel zu erzählen, dass die drei Tage kaum reichen werden. Und keine Sorge wegen der Anreise, wir kriegen das schon hin. Meldet euch, [[Frage an die Freunde|sobald ihr wisst, wann]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Liebe [[Namen der Freunde|Cora und Alex]],

ich danke euch von Herzen für eure Mail. Entschuldigt bitte, dass ich mich so lange nicht gemeldet habe. [[Grund für die Pause|Ich war oft überfordert, habe aber immer an euch gedacht]]. Eure Einladung zum Wiedersehen bedeutet mir viel.

Marseille ist bestimmt wunderbar. Wie geht es euch dort? [[Frage zu Marseille|Welche Orte soll ich unbedingt sehen, wenn ich euch einmal besuche]]?

Für euren Besuch bin ich dankbar. Mir passt [[Zeitraum|Ende August]] am besten, weil [[Grund für den Zeitraum|ich dann frei habe]].

Dass ihr nicht mit dem Auto kommt, ist kein Problem. [[Verkehrsmittel|Der Zug ist eine gute Lösung]], und [[Hilfsangebot|ich helfe euch bei den Tickets]].

Drei Tage sind genau richtig. Ihr schlaft [[Schlafplatz|bei mir im Gästezimmer]]. Zusammen [[Aktivität 1|besuchen wir die Altstadt]] und [[Aktivität 2|essen ein feines Dessert]].

Mir fällt noch etwas ein: Wenn ihr wollt, können wir [[Ausflugsidee|einen Tag in der nächsten größeren Stadt verbringen]], zum Beispiel [[Stadt|in der Altstadt mit den vielen Läden]]. Dort gibt es [[Besonderheit|ein tolles Museum und ein gutes Café]]. Das könnte euch gefallen.

Ihr wohnt jetzt seit einem Jahr in Frankreich, und ich hoffe, dass ihr dort glücklich seid. Weil ihr kein Auto habt, schlage ich vor, dass [[Vorschlag|wir die Ausflüge zusammen mit Bus und Bahn planen]]. Das ist günstig und [[Vorteil|man lernt unterwegs nette Leute kennen]].

Danke für alles, schreibt mir bald, [[Frage an die Freunde|wann ihr kommen möchtet]].

[[Grußformel|Dankbare Grüße]]
[[Dein Name|Nina]]` },
];

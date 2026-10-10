// v2 (B2-style): Thomas organisiert wieder einen Ausflug mit Bus und Schiff (Ziel geheim, übernächster Samstag, 9:30 Uhr bei ihm); er hat sich beim Basketball das Bein gebrochen.
// Points: Alternativvorschlag für schlechtes Wetter · Einladung annehmen · was Sie noch über den Ausflug wissen wollen · auf den Sportunfall reagieren.
export const kw = [/Wetter|Regen|regnet/i, /komm|dabei|zusage|gern/i, /\?/, /Bein|Unfall|gebrochen|Besserung|Basketball/i, /Samstag|9[:.]30|halb zehn|Treffpunkt/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Thomas]],

vielen Dank für deine Einladung, ich habe mich riesig darüber gefreut! Dass du dir beim Basketball das Bein gebrochen hast, tut mir aufrichtig leid. [[Wunsch für die Genesung|Gute Besserung]], und [[Hoffnung|ich hoffe, die Schmerzen sind nicht mehr so stark]]. Du musst dich jetzt viel ausruhen und geduldig sein.

Natürlich komme ich gern mit. [[Zusage|Ich freue mich schon sehr auf den Ausflug]], denn es ist lange her, dass wir alle zusammen unterwegs waren. Um [[Uhrzeit|9:30 Uhr]] bin ich pünktlich bei dir, [[Treffpunkt|mit Rucksack und guter Laune]].

Falls das Wetter schlecht wird, habe ich einen Vorschlag: [[Alternative bei Regen|Wir besuchen das Schifffahrtsmuseum, dort kannst du bequem sitzen]]. Danach könnten wir [[Zweite Idee|in einem Café Kaffee trinken und Kuchen essen]]. Das ist für dein Bein sicher angenehmer, [[Begründung|weil du kaum laufen musst]]. Ich drücke die Daumen, dass [[Wetterwunsch|die Sonne scheint]], damit die Schifffahrt klappt.

Eine Frage habe ich noch: [[Frage zum Ausflug|Wie lange dauert die Schifffahrt]]? Außerdem möchte ich wissen, [[Zweite Frage|wann wir am Abend wieder zurück sind]]. Ich bin sehr gespannt auf die Überraschung und rate schon seit Tagen, [[Vermutung zum Ziel|wohin es wohl gehen wird]].

Ich muss auch sagen, dass [[Erinnerung|unser Ausflug im letzten Jahr einer der schönsten Tage war]]. Wir haben so viel gelacht, und ich habe die Fotos noch immer auf meinem Handy. Ich freue mich darauf, [[Wiedersehen|alle anderen endlich wiederzusehen]], besonders [[Person|Anna und Jakob]].

Schreib mir bitte kurz, [[Bitte an den Freund|ob ich dir vorher beim Einkaufen helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Thomas]],

hey, danke für die Einladung! Aua, das mit deinem Bein klingt echt übel. [[Reaktion auf den Unfall|Basketball ist eben gefährlich, aber du bist bald wieder fit]]. Wie kommst du mit den Krücken klar, nerven die schon? Ich hoffe, [[Wunsch|dir fällt zu Hause nicht die Decke auf den Kopf]].

Klar bin ich beim Ausflug dabei, [[Zusage|bei Bus und Schiff kann ich mich gleich mal entspannen]]. Übernächsten Samstag um [[Uhrzeit|halb zehn]] bei dir, das kriege ich locker hin. Ich bringe [[Mitbringsel|ein paar Snacks und gute Musik]] mit, versprochen.

Und wenn es regnet? Dann hätte ich eine Idee: [[Alternative bei Regen|Wir gehen zusammen ins Kino]] und danach [[Zweite Idee|essen wir eine große Pizza]]. Da sitzt du sowieso bequem, und wir können in Ruhe quatschen.

Verrätst du mir wenigstens einen Tipp: [[Frage zum Ausflug|Welche Kleidung soll ich mitnehmen, falls es auf dem Schiff windig wird]]? Und was kostet der Spaß ungefähr, [[Zweite Frage|brauche ich Bargeld für die Tickets]]?

Übrigens, bei mir ist gerade [[Neuigkeit|ziemlich viel los auf der Arbeit]], da kommt ein freier Tag wie dieser genau richtig. Letztes Mal war ich nach dem Ausflug so müde, dass ich [[Folge|schon im Bus eingeschlafen bin]]. Diesmal bleibe ich wach, [[Versprechen|und ich passe auf dich auf]].

Sag einfach Bescheid, wenn ich noch etwas besorgen soll.

[[Grußformel|Bis bald]]
[[Dein Name|Karim]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Thomas]],

wow, was für eine tolle Idee, schon wieder ein gemeinsamer Ausflug! Ich habe mich beim Lesen sofort gefreut, [[Erinnerung an letztes Jahr|an unseren Tag am See denke ich noch heute gern]]. Natürlich bin ich dabei, [[Zusage|ich trage mir den Termin gleich in den Kalender ein]]. Samstag, [[Uhrzeit|halb zehn]], bei dir!

Dass du dir das Bein gebrochen hast, ist allerdings ein Schock. [[Reaktion auf den Unfall|Der arme Kerl, drei Wochen sind lang, aber es wird bald besser]]! Ein gemütlicher Ausflug ist da die perfekte Lösung, [[Lob|das ist wirklich eine super Idee von dir]].

Die Überraschung macht mich ganz kribbelig! Ich rate mal: [[Tipp zum Ziel|vielleicht fahren wir auf eine kleine Insel mit Schloss]]? Verrätst du mir nur, [[Erste Frage|wie lange die Fahrt dauert]] und [[Zweite Frage|ob es unterwegs ein Restaurant gibt]]?

Sollte das Wetter nicht mitspielen, dann [[Alternative bei Regen|bauen wir bei dir ein riesiges Spieleturnier mit Brettspielen auf]] und [[Zweite Idee|bestellen Pizza für alle]]. Das wäre auch ein super Tag!

Ich liebe Überraschungen, und noch mehr liebe ich Schiffe! Als Kind habe ich [[Kindheitserinnerung|jeden Sommer auf einem Boot am Fluss verbracht]], deshalb freue ich mich so. Ich packe [[Mitbringsel|meine Kamera und einen großen Hut]] ein, [[Ziel des Mitbringsels|damit wir tolle Fotos machen können]].

Schreib mir bald, [[Bitte an den Freund|ob ich etwas Leckeres mitbringen soll]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Hallo [[Name des Freundes|Thomas]],

vielen Dank für deine E-Mail. Ich antworte dir in der Reihenfolge deiner Fragen.

Zum Unfall: Es tut mir leid, dass du dir beim Basketball das Bein gebrochen hast. [[Reaktion auf den Unfall|Ich wünsche dir eine schnelle Genesung und viel Geduld]]. Bitte schone dich, [[Rat|auch wenn es schwerfällt]].

Zur Einladung: [[Zusage|Ich nehme sie gern an und komme am übernächsten Samstag]]. Ich bin um [[Uhrzeit|9:30 Uhr]] bei dir, und [[Begleitung|ich bringe meine Schwester mit, wenn das in Ordnung ist]].

Zum Wetter: Für den Fall von Regen schlage ich eine Alternative vor. [[Alternative bei Regen|Wir besuchen das Stadtmuseum]] und essen anschließend [[Zweite Idee|gemeinsam in einem Restaurant zu Mittag]]. Das ist gut erreichbar, und du kannst oft sitzen.

Zu meinen Fragen: [[Erste Frage|Welche Kosten entstehen pro Person]]? [[Zweite Frage|Wann kommen wir am Abend voraussichtlich zurück]]? Eine kurze Antwort genügt mir, denn die Überraschung möchte ich dir nicht verderben.

Zur Organisation weise ich noch auf Folgendes hin: [[Hinweis|Ich habe seit Kurzem ein Monatsticket für den Bus]], sodass für mich keine Extrakosten entstehen. Außerdem [[Zusatzinfo|habe ich am Samstag keine anderen Termine]], und ich kann den ganzen Tag bleiben, [[Folge|auch wenn es etwas später wird]].

Ich freue mich auf deine Nachricht.

[[Grußformel|Viele Grüße]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Thomas]],

danke für deine Einladung, ich komme sehr gern mit! [[Zusage|Samstag um 9:30 Uhr bei dir passt mir gut]].

Das mit deinem Bein tut mir leid. [[Reaktion auf den Unfall|Gute Besserung, und sag mir, wenn du etwas brauchst]]. Ich kann zum Beispiel für dich [[Hilfsangebot|einkaufen gehen oder deinen Rucksack am Samstag tragen]]. Beim Einsteigen in Bus und Schiff helfe ich dir selbstverständlich auch.

Falls es regnet, wäre es praktisch, einen Plan B zu haben: [[Alternative bei Regen|Wir fahren mit dem Bus in die Therme]] und [[Zweite Idee|entspannen im warmen Wasser]]. Dort gibt es bestimmt Liegen, auf denen du dein Bein ausruhen kannst.

Noch ein paar praktische Fragen: [[Erste Frage|Müssen wir die Tickets vorher kaufen]]? Und [[Zweite Frage|brauchen wir Regenjacken und etwas zu trinken]]? Ich kann auch [[Mitbringsel|Brötchen und Obst für alle]] einpacken.

Wenn du möchtest, [[Hilfe|rufe ich dir vorher ein Taxi zum Bahnhof]], damit du nicht so weit laufen musst. Ich habe außerdem [[Hilfsmittel|eine kleine Tasche mit Pflastern und Wasser]] zu Hause, die ich gern mitnehme. Dann sind wir für alle Fälle vorbereitet, [[Folge|und du musst dir keine Sorgen machen]].

Ich schaue außerdem noch einmal in den Fahrplan, [[Hinweis|damit wir den richtigen Bus erwischen]], und schicke dir die Abfahrtszeiten per Nachricht. Wenn du Fragen zur Strecke hast, sage ich dir gern Bescheid.

Schreib mir, [[Bitte an den Freund|was ich sonst noch übernehmen soll]].

[[Grußformel|Bis Samstag]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Thomas]],

ich sage sehr gern zu, denn [[Grund für die Zusage|ein Ausflug mit Freunden ist genau das, was ich gerade brauche]]. Außerdem finde ich es gut, dass du ihn trotz deines Beins organisierst. [[Reaktion auf den Unfall|Gute Besserung, ich hoffe, du bist bald wieder fit]].

Dass du Bus und Schiff gewählt hast, ist vernünftig, weil [[Begründung|du dich so kaum anstrengen musst]]. Wenn das Wetter schlecht ist, würde ich vorschlagen: [[Alternative bei Regen|Wir gehen ins Kino und sehen uns einen guten Film an]]. Das passt, weil [[Grund für die Alternative|man dort trocken und bequem sitzen kann]].

Ich habe noch zwei Fragen, weil ich mich gut vorbereiten will: [[Erste Frage|Wie lange sind wir insgesamt unterwegs]]? [[Zweite Frage|Soll ich Essen mitbringen oder essen wir unterwegs]]? Danach kann ich planen, was ich einpacke, und ich komme pünktlich um [[Uhrzeit|9:30 Uhr]].

Ich bin sicher, dass es ein schöner Tag wird, weil [[Grund für die Vorfreude|wir alle zusammen sind und die Überraschung spannend ist]].

Ich nenne dir noch einen Grund, warum ich mich so freue: [[Grund|Ich war in den letzten Wochen kaum draußen]]. Frische Luft und Wasser tun mir gut, [[Folge|und mit netten Menschen macht es doppelt Spaß]]. Deshalb ist dein Ausflug die richtige Idee zur richtigen Zeit.

Schreib mir bitte kurz zurück, [[Bitte an den Freund|ob du noch Hilfe beim Planen brauchst]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Thomas]],

danke für deine E-Mail, hier meine Antworten.

Dein Bein: [[Reaktion auf den Unfall|Das tut mir sehr leid, gute Besserung]]! Ruh dich aus und [[Rat|schone das Bein, so gut du kannst]].

Der Ausflug: [[Zusage|Ich bin gern dabei]]. Ich komme am übernächsten Samstag um [[Uhrzeit|9:30 Uhr]] zu dir und freue mich schon auf alle anderen.

Schlechtes Wetter: [[Alternative bei Regen|Dann gehen wir in das Technikmuseum]]. Das ist trocken, interessant und hat [[Begründung|Sitzplätze für dich]]. Danach essen wir etwas zusammen.

Meine Fragen: [[Erste Frage|Wie hoch sind die Kosten]]? [[Zweite Frage|Wann sind wir zurück]]? [[Dritte Frage|Muss ich etwas mitbringen]]? Mehr will ich nicht wissen, denn die Überraschung soll ja eine bleiben.

Noch ein Punkt: Meine Kamera [[Mitbringsel|nehme ich selbstverständlich mit]]. Außerdem [[Hinweis|bringe ich eine Decke und Wasser für alle]] mit, falls wir irgendwo Pause machen. Wir sehen uns [[Zeit|am übernächsten Samstag]], und ich freue mich schon sehr darauf.

Falls du Hilfe beim Packen brauchst, [[Angebot|komme ich am Freitag kurz vorbei]]. Das ist kein Problem für mich, denn dein Haus liegt auf meinem Weg, und ich sehe dich gern. Ich bringe auch [[Mitbringsel|ein kleines Gesellschaftsspiel]] für die Fahrt mit.

Ich hoffe, dass dir die Fahrt mit dem Bus nicht zu unbequem wird. Beim Einsteigen helfe ich dir gern, und wir finden bestimmt einen guten Platz für dein Bein. Melde dich einfach, wenn sich etwas ändert.

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Thomas]],

Basketball und Bein gebrochen, das klingt nach einem Fall für die Sportschau! [[Reaktion auf den Unfall|Im Ernst, gute Besserung, ich hoffe, es tut nicht mehr so weh]]. Dass du trotzdem einen Ausflug planst, nenne ich echte Sportlerehre.

Natürlich komme ich mit. [[Zusage|Ein Tag mit Bus, Schiff und euch klingt wunderbar]], und mit dir als Reiseleiter auf einem Bein wird es bestimmt nie langweilig. Samstag, [[Uhrzeit|9:30 Uhr]] bei dir, ich komme pünktlich, versprochen.

Sollte das Wetter schlecht sein, hätte ich diesen Vorschlag: [[Alternative bei Regen|Wir besuchen ein Schokoladenmuseum]] und [[Zweite Idee|probieren alles, was dort herumsteht]]. Dann haben wir wenigstens trockene Füße und volle Bäuche.

Zwei Fragen habe ich noch: [[Erste Frage|Fährt ein Kapitän, der schon einmal ein Schiff gesteuert hat]]? Und [[Zweite Frage|gibt es auf dem Schiff genug Platz für uns alle und dein Bein]]?

Ich verspreche dir außerdem, [[Versprechen|keine Witze über dein Gipsbein zu machen]]. Na gut, höchstens zwei. Und [[Scherz|ich trage deine Krücken, wenn du mir dafür die Überraschung verrätst]]. Das ist doch ein fairer Deal, oder?

Und falls du dich fragst, warum ich so viele Fragen habe: [[Grund|Ich plane gern, und Überraschungen machen mich nervös]]. Ich werde bis Samstag [[Gefühl|vor Neugier kaum schlafen können]], das garantiere ich dir. Aber ich halte durch, [[Folge|für dich und die Überraschung]].

Schreib mir bitte, [[Bitte an den Freund|was ich für die Überraschung anziehen soll]], damit ich nicht im Bademantel erscheine.

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Thomas]],

als ich deine E-Mail gelesen habe, musste ich sofort an unseren Ausflug im letzten Jahr denken. [[Erinnerung an letztes Jahr|Wir saßen den ganzen Nachmittag am Wasser und haben nur gelacht]]. Deshalb sage ich ohne Zögern zu, ich komme sehr gern mit.

Dass du dir das Bein gebrochen hast, hat mich traurig gemacht. Ich habe gestern erst meiner Mutter davon erzählt. [[Reaktion auf den Unfall|Sie lässt dich grüßen und wünscht dir gute Besserung]]. Ich hoffe, dass du dich nicht zu sehr langweilst.

Für den Fall, dass es regnet, habe ich schon nachgedacht. [[Alternative bei Regen|Wir könnten bei mir zu Hause kochen]] und danach [[Zweite Idee|einen Film schauen]]. Meine Wohnung hat einen Aufzug, das wäre also für dein Bein bequem.

Was ich noch wissen möchte: [[Erste Frage|Wie viele Leute kommen eigentlich mit]]? Ich kenne nicht alle, und ich bin neugierig, [[Zweite Frage|ob auch Jakob und seine Freundin dabei sind]]. Der Samstag um [[Uhrzeit|9:30 Uhr]] ist für mich fest eingeplant.

Ich selbst habe mir mit zwölf auch einmal den Arm gebrochen. [[Erinnerung|Damals durfte ich zwei Monate nicht Fußball spielen]], und ich war so unglücklich. Aber meine Freunde haben mich oft besucht, [[Folge|und das hat mir sehr geholfen]]. Vielleicht besuche ich dich deshalb bald einmal, [[Angebot|mit Kuchen und einem guten Buch]].

Ich schreibe dir das alles, weil [[Grund|du mir wirklich wichtig bist]], auch wenn wir uns zuletzt nur selten sehen konnten. Dafür freue ich mich jetzt umso mehr, [[Vorfreude|dich bald wieder in den Arm zu nehmen]], natürlich vorsichtig wegen deines Beins.

Ich freue mich auf dich und auf die Überraschung.

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Thomas]],

danke für die Einladung, ich bin dabei! Zuerst aber eine Bitte: [[Reaktion auf den Unfall|Schone dein Bein und werde schnell gesund]]. Ich habe zu deinem Ausflug gleich mehrere Vorschläge.

Mein erster Vorschlag: [[Vorschlag zur Anfahrt|Wir treffen uns schon um 9:15 Uhr, damit du in Ruhe einsteigen kannst]]. Dann haben wir keinen Stress, und niemand muss rennen.

Mein zweiter Vorschlag betrifft das Wetter. Wenn es richtig regnet, [[Alternative bei Regen|besuchen wir ein Aquarium]], denn [[Begründung|dort ist es trocken und man kann viel sitzen]]. Und wenn es nur etwas nass ist, [[Zweite Alternative|nehmen wir Regenschirme und fahren trotzdem mit dem Schiff]].

Mein dritter Vorschlag: [[Vorschlag für den Tag|Wir machen unterwegs ein Gruppenfoto]] und [[Zweiter Vorschlag für den Tag|kochen abends gemeinsam bei mir]]. Was hältst du davon?

Ich hätte nur eine Frage: [[Frage zum Ausflug|Wie lange dauert die Schifffahrt, und gibt es dort ein Café]]? Dann weiß ich, wie ich den Samstag plane.

Mein vierter Vorschlag: [[Vorschlag|Jeder bringt eine Kleinigkeit zum Essen mit]], dann müssen wir kein Restaurant suchen. Ich übernehme [[Aufgabe|die Getränke und das Obst]]. Und wenn du magst, [[Angebot|trage ich dein Gepäck und halte im Bus einen Platz frei]].

Mein letzter Vorschlag: [[Vorschlag|Wir sammeln schon vorher Ideen für den nächsten Ausflug]], damit es eine kleine Tradition wird. Wenn jeder einen Wunsch nennt, [[Folge|findet sich bestimmt etwas für alle]]. Das fände ich schön, und du hättest [[Vorteil|schon eine Liste für das nächste Mal]].

Antworte mir gern bald.

[[Grußformel|Bis bald]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Thomas]],

vielen Dank für deine Einladung. Ich würde sehr gern mitkommen, [[Zusage mit Bedingung|wenn ich den Termin mit meiner Arbeit vereinbaren kann]]. Ich glaube aber, dass das klappt, und sage dir spätestens morgen endgültig zu.

Das mit deinem Bein tut mir leid. [[Reaktion auf den Unfall|Hoffentlich heilt es gut, und die Schmerzen lassen bald nach]]. Einerseits ist ein ruhiger Ausflug sicher gut für dich, andererseits solltest du dich nicht überanstrengen.

Beim Wetter bin ich noch unsicher. Einerseits ist eine Schifffahrt bei Sonne schön, andererseits ist sie bei starkem Regen unangenehm. Als Alternative würde ich vorschlagen: [[Alternative bei Regen|Wir besuchen ein Museum]] und gehen danach [[Zweite Idee|in ein Restaurant]]. Vielleicht gefällt das aber nicht allen.

Ich hätte noch eine Frage, falls das nicht zu viel verrät: [[Frage zum Ausflug|Müssen wir viel laufen, oder ist alles gut erreichbar]]? Das wäre für dein Bein wichtig. Treffpunkt ist doch [[Treffpunkt|bei dir um 9:30 Uhr]], oder?

Ich möchte dich auch nicht drängen. Wenn dir der Ausflug zu anstrengend wird, [[Alternative|können wir ihn um eine Woche verschieben]], und ich hätte volles Verständnis. Andererseits bin ich überzeugt, dass [[Überzeugung|du dich über den Tag mit uns freuen wirst]]. Es kommt eben darauf an, [[Bedingung|wie du dich am Samstag fühlst]].

Ich wollte das nur ehrlich sagen, [[Grund|damit du weißt, woran du bist]]. Wenn du mir bis Donnerstag Bescheid gibst, [[Plan|kann ich mir den Samstag freihalten]]. Und falls mir doch etwas dazwischenkommt, [[Folge|rufe ich dich sofort an]].

Sag mir bitte, [[Bitte an den Freund|ob du bis Samstag noch jemanden brauchst, der dich fährt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Hallo [[Name des Freundes|Thomas]],

danke für deine Einladung! Ich gehe der Reihe nach auf deine E-Mail ein.

Zuerst zu deinem Bein: [[Reaktion auf den Unfall|Das tut mir sehr leid, ich wünsche dir gute Besserung]]. Dann zur Einladung: [[Zusage|Ich komme natürlich gern mit]]. Der Samstag ist frei, und um [[Uhrzeit|9:30 Uhr]] bin ich bei dir.

Als Nächstes zum Wetter. Falls es regnet, [[Alternative bei Regen|gehen wir ins Kino]] und danach [[Zweite Idee|in eine Pizzeria]]. Dann kommen wir trocken durch den Tag, und du sitzt bequem.

Zum Schluss meine Fragen. Erstens: [[Erste Frage|Was soll die Fahrt ungefähr kosten]]? Zweitens: [[Zweite Frage|Wo genau fährt der Bus ab]]? Drittens: [[Dritte Frage|Bleiben wir den ganzen Tag zusammen]]? Eine Antwort auf alle drei würde mir schon reichen.

Noch ein letzter Schritt, bevor ich Schluss mache: [[Plan|Ich packe meinen Rucksack schon am Freitag]]. Das mache ich, [[Grund|damit ich am Samstag nichts vergesse]]. Danach lege ich mich früh ins Bett, [[Folge|um morgens fit zu sein]].

Zum Abschluss fasse ich es noch einmal zusammen: Ich komme am Samstag, ich bringe [[Mitbringsel|Obst und Wasser]] mit, und ich helfe dir, wenn du Hilfe brauchst. Falls sich etwas ändert, [[Rückmeldung|schreibe ich dir sofort eine kurze Nachricht]]. So hast du alles Wichtige auf einen Blick.

Wenn du alles beantwortet hast, plane ich meinen Tag und komme pünktlich, [[Hinweis|auch wenn ich vorher noch einkaufen muss]].

[[Grußformel|Bis Samstag]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Thomas]],

deine E-Mail hat mich gefreut und gleichzeitig traurig gemacht. [[Reaktion auf den Unfall|Du Armer, ein gebrochenes Bein ist wirklich nicht schön]]. Ich denke an dich und wünsche dir von Herzen, dass alles gut verheilt. Wenn du Gesellschaft brauchst, komme ich gern vorbei.

Dass du uns trotzdem einlädst, finde ich lieb. [[Zusage|Natürlich komme ich mit, ich freue mich auf alle]]. Mach dir bitte keine Sorgen um mich, ich bin am Samstag [[Uhrzeit|um halb zehn]] bei dir.

Falls das Wetter nicht gut ist, mach dir bitte keinen Stress. [[Alternative bei Regen|Wir können auch bei dir zu Hause bleiben]] und [[Zweite Idee|zusammen kochen]]. Hauptsache, wir sind zusammen und du fühlst dich wohl.

Ich bin neugierig, aber ich möchte dir nicht die Überraschung verderben. Nur eine Frage: [[Frage zum Ausflug|Sollen wir etwas mitbringen, damit du weniger Arbeit hast]]?

Ich weiß, wie schwer es ist, still zu sitzen, wenn man eigentlich Sport machen möchte. [[Mitgefühl|Du bist sonst so aktiv, das fehlt dir bestimmt]]. Ich bewundere, dass du trotzdem [[Lob|so positiv bleibst und an uns denkst]]. Das zeigt, was für ein Mensch du bist.

Ich habe auch ein kleines Geschenk für dich: [[Geschenk|ein neues Buch und deine Lieblingsschokolade]]. Es ist nichts Großes, aber ich möchte, dass du dich [[Wunsch|gesehen und gut aufgehoben fühlst]]. Du musst nicht danken, [[Folge|es kommt von Herzen]].

Schone dich bitte und denk daran, dass du nichts allein organisieren musst, [[Angebot|ich helfe dir sehr gern dabei]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Thomas]],

danke für die Mail! Klar bin ich dabei. [[Zusage|Samstag, halb zehn bei dir, das passt]]. Ich freue mich schon auf alle, [[Reaktion auf die Einladung|das wird bestimmt wieder ein richtig schöner Tag]].

Oh Mann, dein Bein! [[Reaktion auf den Unfall|Das ist echt Pech, aber du kriegst das hin]]. Mach langsam und gönn dir Ruhe, [[Rat|der Ausflug läuft ja nicht weg]].

Und wenn das Wetter schlecht ist? Ganz einfach: [[Alternative bei Regen|Wir gehen in die Bowlinghalle]], da kannst du sogar sitzen. Danach [[Zweite Idee|essen wir einen Burger]]. Das wäre auch lustig.

Eine kleine Frage hätte ich noch: [[Frage zum Ausflug|Wie lange dauert das Ganze, und wann sind wir zurück]]? Dann kann ich abends noch etwas planen. Ich bin schon so gespannt auf deine Überraschung!

Bei mir ist übrigens [[Neuigkeit|alles ruhig, nur etwas viel Arbeit]]. Ich freue mich echt auf den freien Tag. Wir haben uns ja [[Zeit|lange nicht gesehen]], da gibt es bestimmt viel zu erzählen, [[Folge|und ich bin gespannt auf alles]].

Ach ja, bevor ich es vergesse: [[Hinweis|Ich bringe auch Sonnencreme mit]], falls es doch warm wird. Und ein paar Ersatzbatterien für die Kamera, [[Zusatz|man weiß ja nie]]. Das wird ein cooler Tag, ich spüre es schon jetzt.

Ich bringe [[Mitbringsel|gute Laune und Musik]] mit. Sag Bescheid, wenn du noch etwas brauchst.

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Lieber [[Name des Freundes|Thomas]],

ich danke dir von Herzen für deine Einladung. [[Dank für die Einladung|Es bedeutet mir viel, dass du uns wieder zusammenbringst]]. Und dass du das trotz deines gebrochenen Beins organisierst, bewundere ich.

[[Reaktion auf den Unfall|Gute Besserung, ich hoffe, du hast nicht zu viele Schmerzen]]. Du bist ein guter Freund und denkst immer an alle.

Ich nehme deine Einladung sehr gern an. [[Zusage|Der übernächste Samstag um 9:30 Uhr ist für mich fest eingeplant]]. Ich freue mich auf Bus, Schiff und vor allem auf [[Vorfreude|euch alle]].

Beim Wetter habe ich eine kleine Idee: Sollte es regnen, [[Alternative bei Regen|besuchen wir das Naturkundemuseum]] und trinken danach [[Zweite Idee|heiße Schokolade]]. So bleibt es trotzdem ein schöner Tag, und du kannst dich zwischendurch hinsetzen.

Mich würde noch interessieren: [[Frage zum Ausflug|Wie viele Stunden sind wir unterwegs, und was sollen wir anziehen]]? Dann bereite ich mich gut vor.

Ich bin dankbar, dass es solche Freunde gibt. [[Dank|Du organisierst immer alles so liebevoll]], und man merkt, dass dir die Gemeinschaft wichtig ist. Ich werde [[Beitrag|einen kleinen Kuchen backen]], [[Folge|als Dankeschön für den schönen Tag]].

Auch deshalb freue ich mich so auf den Tag: [[Grund|Man fühlt sich bei euch einfach aufgehoben]]. Danke, dass es dich gibt, und dass du uns immer wieder zusammenbringst.

Vielen Dank noch einmal für alles, was du für uns tust, [[Zusatz|ich weiß das wirklich zu schätzen]].

[[Grußformel|Herzliche Grüße]]
[[Dein Name|Nina]]` },
];

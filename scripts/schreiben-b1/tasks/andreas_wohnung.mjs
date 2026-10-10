// v2 (B2-style): Andreas ist in eine neue Wohnung gezogen (Arbeitszimmer, Computer) und lädt im Sommer ein. Points: Ihre Erfahrungen mit dem Computer · etwas über Ihre Wohnung ·
// ob Sie Andreas besuchen möchten · was es bei Ihnen Neues gibt — plus: Entschuldigung ("so lange nicht geschrieben"), Umzug/Einrichtung, "Machst du viel am Computer?".
export const kw = [/Computer|Laptop|PC|Internet|Rechner/i, /Wohnung|Zimmer|Küche|Balkon|Miete|wohne/i, /besuch/i, /Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /Wohnung|Umzug|Möbel|Zimmer|Bücher/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Bekannten|Andreas]],

vielen Dank für deinen Brief, ich habe mich sehr gefreut! Mach dir bitte keine Sorgen, dass du lange nicht geschrieben hast. [[Reaktion auf die Entschuldigung|Ich weiß, wie viel bei einem Umzug zu tun ist]]. Glückwunsch zur neuen Wohnung, sie klingt wunderbar.

Dein Arbeitszimmer mit den Büchern und dem Schreibtisch gefällt mir sehr. Zum Computer kann ich dir sagen: [[Erfahrung mit dem Computer|Ich arbeite jeden Tag mehrere Stunden am Rechner, im Büro und zu Hause]]. Am liebsten benutze ich ihn zum [[Nutzung des Computers|Schreiben, Lernen und für Videoanrufe mit meiner Familie]].

Meine eigene Wohnung ist [[Größe der Wohnung|klein, mit zwei Zimmern und einem Balkon]]. Besonders gern mag ich [[Lieblingsplatz|die Küche, weil sie so hell ist]].

Deinen Vorschlag, dich im Sommer zu besuchen, nehme ich gern an. [[Zeitpunkt des Besuchs|Im Juli habe ich zwei Wochen Urlaub]], und ich komme gern für ein verlängertes Wochenende.

Bei mir gibt es folgende Neuigkeit: [[Neuigkeit|Ich habe angefangen, Spanisch zu lernen]].

Dein Arbeitszimmer interessiert mich besonders: Ich möchte gern wissen, [[Frage zum Arbeitszimmer|wie du den Schreibtisch und die Regale aufgestellt hast]]. Bei mir steht der Computer [[Platz des Computers|auf einem kleinen Tisch am Fenster]], und das ist zwar eng, aber gemütlich. Ich lerne gern von deinen Ideen.

Bei mir ist auch einiges passiert, was ich dir erzählen möchte: [[Weitere Neuigkeit|Ich habe mit einem Kollegen ein kleines Projekt gestartet]]. Das macht mir viel Freude, aber auch viel Arbeit. Ich berichte dir beim Besuch gern genauer, wenn du neugierig bist.

Zum Schluss noch eine Bitte: Schick mir bitte [[Bitte|ein paar Fotos von deinem Arbeitszimmer]], wenn du Zeit hast. Ich möchte mir schon vor dem Besuch ein Bild machen, und vielleicht [[Idee|bekomme ich eine Idee für meine Wohnung]]. Das wäre sehr nett von dir.

Schreib mir bitte, [[Frage an den Bekannten|welcher Termin dir am besten passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name des Bekannten|Andreas]],

schön, wieder von dir zu hören! Kein Problem mit der Pause, [[Reaktion auf die Entschuldigung|ich schreibe auch nicht viel besser]]. Glückwunsch zur neuen Wohnung, die Bücher-Ecke klingt super.

Zum Thema Computer: Ich bin ziemlich viel dran, [[Erfahrung mit dem Computer|im Job den ganzen Tag und abends manchmal zum Spielen oder für Serien]]. Ohne Computer geht bei mir nicht viel.

Meine Wohnung? [[Größe der Wohnung|Ein Zimmer, Küche und Bad]], nichts Großes, aber [[Besonderheit der Wohnung|der Balkon ist toll und die Lage super]].

Besuch im Sommer? Gern! [[Zeitpunkt des Besuchs|Ich könnte im August für ein Wochenende kommen]].

Was bei mir los ist? [[Neuigkeit|Ich habe ein neues Fahrrad und fahre jetzt täglich zur Arbeit]].

Zum Umzug noch ein Gedanke: Ich weiß, wie schwer das ist, denn ich bin [[Eigene Erfahrung|vor zwei Jahren selbst umgezogen]]. Am schlimmsten waren [[Schwierigkeit|die vielen Kartons und das Auf- und Abbauen der Möbel]]. Jetzt ist es geschafft, und du kannst dich entspannen.

Seit einiger Zeit [[Veränderung|stehe ich früher auf und lese vor der Arbeit zwanzig Minuten]]. Das hat meinen Alltag verändert, und ich bin zufriedener. Vielleicht ist das auch etwas für dich in der neuen Wohnung, mit deinem schönen Arbeitszimmer.

Wenn ich komme, möchte ich nicht nur drinnen sitzen: [[Wunsch|Ein Spaziergang durch dein Viertel und ein Eis]] gehören dazu. Danach können wir [[Plan|im Arbeitszimmer über Bücher reden]]. So haben wir beides, Bewegung und Gespräch.

Meld dich, [[Frage an den Bekannten|wann es bei dir passt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Bekannten|Andreas]],

wow, eine neue Wohnung, das ist fantastisch! Mach dir keine Gedanken wegen der langen Pause. [[Reaktion auf die Entschuldigung|Ich freue mich einfach, dass du dich meldest]]. Dein Arbeitszimmer mit den vielen Büchern klingt traumhaft.

Du fragst nach dem Computer: [[Erfahrung mit dem Computer|Ich liebe ihn! Ich schreibe damit, recherchiere und lerne Sprachen]]. Ohne ihn könnte ich mir meinen Alltag nicht vorstellen.

Meine Wohnung ist [[Größe der Wohnung|gemütlich und hell, mit zwei Zimmern]], und [[Besonderheit der Wohnung|ich habe viele Pflanzen auf dem Fensterbrett]].

Dein Vorschlag, dich zu besuchen, macht mich glücklich! [[Zeitpunkt des Besuchs|Im Sommer komme ich sehr gern, am liebsten im Juli]].

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich habe eine neue Stelle bekommen]].

Computer und Wohnung gehören bei mir zusammen: Ich habe [[Technik in der Wohnung|einen Drucker, einen Laptop und schnelles Internet]] zu Hause. Das ist praktisch, aber [[Nachteil der Technik|man sitzt zu oft davor]]. Deshalb mache ich bewusst Pausen und gehe spazieren, das empfehle ich auch dir.

Außerdem war ich [[Erlebnis|vor Kurzem bei einem Konzert und habe alte Freunde getroffen]]. Das war ein schöner Abend, und ich habe oft an dich gedacht. Wir müssen uns wirklich wiedersehen, damit wir all diese Geschichten austauschen können.

Ich hoffe, dass du dich in der neuen Wohnung schnell einlebst: [[Wunsch|mit netten Nachbarn und einem schönen Wohnumfeld]]. Das ist nicht selbstverständlich. Ich drücke dir die Daumen, dass alles gut klappt, und freue mich auf deinen nächsten Brief.

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit dir]]. Schreib mir bald, [[Frage an den Bekannten|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Bekannten|Andreas]],

vielen Dank für deinen Brief. Zu jeder deiner Fragen sage ich etwas.

Erstens, die Pause: [[Reaktion auf die Entschuldigung|Du musst dich nicht entschuldigen, bei einem Umzug hat man viel zu tun]]. Ich gratuliere dir zur neuen Wohnung.

Zweitens, der Computer: [[Erfahrung mit dem Computer|Ich nutze ihn täglich bei der Arbeit und privat zum Lesen von Nachrichten]].

Drittens, meine Wohnung: Sie hat [[Größe der Wohnung|zwei Zimmer und einen Balkon]], und [[Besonderheit der Wohnung|sie liegt zentral]].

Viertens, dein Vorschlag: Ich besuche dich gern, [[Zeitpunkt des Besuchs|am liebsten im August]].

Fünftens, meine Neuigkeiten: [[Neuigkeit|Ich bin im Büro befördert worden]].

Für deine neue Wohnung wünsche ich dir viel Freude. Wenn du magst, schicke ich dir [[Geschenkidee|ein kleines Einweihungsgeschenk, zum Beispiel eine Pflanze]]. Und beim Besuch bringe ich [[Mitbringsel|etwas Leckeres aus meiner Stadt]] mit. Ich glaube, das macht jedem Freude.

In letzter Zeit habe ich [[Hobby|angefangen, Fotos zu bearbeiten]], und es macht mir Spaß. Dafür brauche ich natürlich den Computer, und deshalb habe ich ihn [[Computerupdate|neu eingerichtet und ein paar Programme gekauft]]. Ich zeige dir bei meinem Besuch gern meine Ergebnisse.

Weil du so viel am Schreibtisch sitzt, empfehle ich dir [[Rat|regelmäßige Pausen und einen guten Stuhl]], denn [[Grund|der Rücken ist wichtig]]. Ich habe selbst Probleme gehabt und kenne das. Eine kleine Pause pro Stunde hilft mir sehr.

Bitte teile mir mit, [[Frage an den Bekannten|welcher Termin dir passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deinen Brief! [[Reaktion auf die Entschuldigung|Es ist ganz in Ordnung, dass du länger nicht geschrieben hast]]. Glückwunsch zur Wohnung, und wenn du beim Einrichten Hilfe brauchst, sag Bescheid.

Zum Computer: [[Erfahrung mit dem Computer|Ich nutze ihn jeden Tag und kenne mich mit Programmen und Internet gut aus]]. Wenn du ein Problem hast, [[Hilfsangebot|helfe ich dir gern per Telefon]].

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer mit Balkon]], und [[Besonderheit der Wohnung|ich habe viele praktische Möbel]].

Deine Einladung, dich im Sommer zu besuchen, gefällt mir. [[Zeitpunkt des Besuchs|Ich komme gern im Juli]], und ich bringe [[Mitbringsel|ein kleines Regal-Set für deine Bücher]] mit.

Bei mir gibt es [[Neuigkeit|eine neue Aufgabe im Büro]].

Weil du nach dem Computer fragst: Ich nutze ihn auch für [[Weitere Nutzung|Online-Kurse und das Planen von Reisen]]. Das spart mir viel Zeit. Wenn du Tipps zu Programmen brauchst, [[Hilfsangebot|zeige ich dir bei meinem Besuch gern ein paar nützliche Seiten]].

Was mich im Moment beschäftigt: [[Beschäftigung|Ich überlege, im Herbst meine Arbeitszeit zu verkürzen]], damit ich mehr Zeit für Familie und Freunde habe. Das wäre ein großer Schritt, und ich möchte mit dir darüber reden, denn du bist immer ein guter Zuhörer.

Wenn du magst, können wir auch zusammen [[Idee|etwas am Computer spielen oder einen Film schauen]], falls das Wetter schlecht ist. Das ist eine gute Alternative zum Spaziergang. Ich bringe auch [[Mitbringsel|ein paar Spiele]] mit, die wir zu zweit spielen können.

Sag mir bitte, [[Frage an den Bekannten|ob ich dir noch etwas mitbringen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Bekannten|Andreas]],

du brauchst dich nicht zu entschuldigen, denn [[Begründung für die Nachsicht|ich schreibe auch selten und weiß, wie anstrengend ein Umzug ist]]. Glückwunsch zur Wohnung.

Beim Computer habe ich viele Erfahrungen, weil [[Grund für die Erfahrung|ich damit arbeite und lerne]]. [[Erfahrung mit dem Computer|Ich schreibe E-Mails, erledige Rechnungen und sehe mir Dokumentarfilme an]].

Meine Wohnung ist [[Größe der Wohnung|klein, aber praktisch]], weil [[Grund für die Praktik|alles in der Nähe ist]].

Ich besuche dich gern, denn [[Grund für den Besuch|wir haben uns lange nicht gesehen]]. [[Zeitpunkt des Besuchs|Der August wäre ideal]].

Bei mir gibt es [[Neuigkeit|eine neue Hobbygruppe]].

Außerdem finde ich es schön, dass du ein eigenes Arbeitszimmer hast, weil [[Grund|man dort in Ruhe lesen und schreiben kann]]. Ich habe [[Meine Situation|nur eine Ecke im Wohnzimmer]], und das stört manchmal. Du bist zu beneiden, und ich freue mich, es zu sehen.

Ich war übrigens [[Reise|am Wochenende kurz bei meiner Schwester]] und habe ihr beim Umzug geholfen. Dabei habe ich viel gelernt über Kisten, Möbel und Geduld. Deshalb verstehe ich gut, wie du dich gefühlt hast, und ich wünsche dir noch viele ruhige Tage.

Bei meinem Besuch möchte ich nicht zur Last fallen: Ich [[Angebot|kaufe gern für uns ein und koche an einem Abend]]. Das ist für mich selbstverständlich, und ich mache es gern. Du musst dir also keine Sorgen machen, dass es zu viel Arbeit wird.

Schreib mir, [[Frage an den Bekannten|ob dir der August passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deinen Brief, hier kurz meine Antworten.

Pause: [[Reaktion auf die Entschuldigung|Kein Problem]]. Glückwunsch zur neuen Wohnung!

Computer: [[Erfahrung mit dem Computer|Ich nutze ihn täglich für die Arbeit]].

Meine Wohnung: [[Größe der Wohnung|Zwei Zimmer, Balkon]].

Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Juli]].

Neues: [[Neuigkeit|Neue Stelle]].

Zum Besuch: Ich schlage vor, dass ich [[Anreise|mit dem Zug am Freitagabend ankomme und bis Sonntag bleibe]]. Dann haben wir Zeit zum Reden. Wenn du am Wochenende arbeiten musst, [[Alternative|sage mir bitte Bescheid, dann komme ich lieber später]].

Meine Neuigkeit ist ein bisschen komisch: [[Neuigkeit|Ich habe angefangen, Schach im Verein zu spielen]]. Ich dachte, das wäre langweilig, aber es macht Spaß. Vielleicht kannst du mir beim Besuch ein paar Tipps geben, wenn du Schach magst, und wir spielen eine Partie.

Ich glaube, dass wir viel Spaß haben werden: [[Vorfreude|Wir kennen uns schon lange und haben denselben Humor]]. Deshalb freue ich mich so auf unsere Gespräche. Ich glaube, dass uns die Zeit viel zu kurz vorkommen wird, denn es gibt viel zu erzählen.

Ich freue mich sehr auf unser Wiedersehen in deiner neuen Wohnung und auf [[Vorfreude|ein langes, gemütliches Wochenende]]. Auch ich habe [[Eigene Wohnsituation|in letzter Zeit viel umgeräumt]], und das hat mich zum Nachdenken gebracht. Gib mir bitte kurz Bescheid, [[Frage an den Bekannten|wann es dir passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Bekannten|Andreas]],

du hast so lange nicht geschrieben, dass ich schon Suchmeldungen aufgeben wollte! [[Reaktion auf die Entschuldigung|Aber ein Umzug ist eine gute Ausrede, ich verzeihe dir]]. Glückwunsch zur neuen Wohnung.

Computer? [[Erfahrung mit dem Computer|Ich verbringe mit ihm mehr Zeit als mit meiner Familie]]. Ich nutze ihn für fast alles.

Meine Wohnung: [[Größe der Wohnung|Zwei Zimmer, ein Balkon und ein Kühlschrank, der laut brummt]].

Besuchen? [[Zeitpunkt des Besuchs|Im Sommer, wenn dein Arbeitszimmer nicht zu voll mit Büchern ist]].

Neues: [[Neuigkeit|Ich habe versucht, ein Regal aufzubauen, und es steht sogar gerade]].

Bei meinem Besuch möchte ich gern [[Wunsch|dein Arbeitszimmer und deine Bücher ansehen]], und wir könnten [[Programm|zusammen kochen und einen Spaziergang machen]]. Ich kenne deine Stadt noch nicht, deshalb freue ich mich auf alles, was du mir zeigst.

In der Arbeit [[Arbeitsnachricht|haben wir ein neues System bekommen]], mit dem ich nun jeden Tag zu tun habe. Anfangs war es schwer, aber jetzt ist es gut. Das zeigt wieder, wie wichtig der Computer geworden ist, auch für dich mit deinem Schreibtisch.

Falls du am Besuchswochenende noch Termine hast, sag es mir bitte früh: [[Hinweis|Dann kann ich mir den Zug schon rechtzeitig buchen]]. Das ist günstiger, und ich muss mich nicht kurz vorher entscheiden. Ich bin da flexibel und passe mich gern deinen Plänen an.

Ich freue mich auf [[Vorfreude|ein Wochenende voller Lachen]] und auf [[Wunsch an den Gastgeber|dein berühmtes Frühstück]]. Schreib bald, [[Frage an den Bekannten|ob dein Sofa einen Gast aushält]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Bekannten|Andreas]],

als ich deinen Brief gelesen habe, musste ich an unsere Zeit im Urlaub denken. [[Erinnerung an die gemeinsame Zeit|Wir haben damals stundenlang über Bücher geredet]]. Dass du lange nicht geschrieben hast, ist nicht schlimm.

Der Computer ist bei mir ein wichtiger Teil des Alltags: [[Erfahrung mit dem Computer|Ich habe meinen ersten mit zehn Jahren bekommen und bin seitdem fasziniert]].

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer in einem alten Haus]], und [[Besonderheit der Wohnung|ich habe viele Erinnerungsstücke darin]].

Deinen Besuch-Vorschlag nehme ich gern an: [[Zeitpunkt des Besuchs|Ich komme im Juli]].

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Ich habe mir überlegt, was ich dir Praktisches mitbringen kann: [[Praktisches Geschenk|ein Set Notizbücher und einen kleinen Lampenschirm für den Schreibtisch]]. So kannst du abends gemütlich arbeiten. Ich hoffe, das gefällt dir, und ich helfe auch beim Aufstellen.

Eine schöne Nachricht aus meiner Familie: [[Familiennachricht|Meine Nichte hat die Schule abgeschlossen]], und wir haben zusammen gefeiert. Ich war richtig stolz auf sie. Beim Besuch zeige ich dir Fotos, wenn du magst, und erzähle von dem Tag.

Ich wollte dir noch sagen, wie viel mir deine Briefe bedeuten: [[Dank|Sie sind persönlich und lustig, und ich freue mich jedes Mal]]. Vielleicht können wir künftig regelmäßiger schreiben, zum Beispiel [[Vorschlag|einmal im Monat per E-Mail oder per Video]].

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit dir]]. Erzähl mir, [[Frage an den Bekannten|wie dir die neue Umgebung gefällt]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Bekannten|Andreas]],

danke für deinen Brief, und Glückwunsch zur neuen Wohnung! [[Reaktion auf die Entschuldigung|Die Pause ist kein Problem]]. Ich habe gleich mehrere Vorschläge.

Mein erster Vorschlag: Ich besuche dich [[Zeitpunkt des Besuchs|im Juli, für ein langes Wochenende]]. Mein zweiter Vorschlag: Wir telefonieren vorher, [[Vorschlag zum Anruf|damit wir alles absprechen können]].

Zum Computer: [[Erfahrung mit dem Computer|Ich benutze ihn jeden Tag für die Arbeit]]. Mein dritter Vorschlag: Wir machen zusammen [[Gemeinsame Aktivität|einen Videoabend mit alten Filmen]].

Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer]].

Bei mir gibt es [[Neuigkeit|eine neue Stelle]].

In meiner Freizeit sitze ich gern am Computer und [[Hobby am Computer|schreibe Blog-Beiträge über meine Reisen]]. Es macht mir Spaß, und ich habe dadurch viele nette Menschen kennengelernt. Vielleicht hast du auch Lust, [[Idee|etwas Ähnliches auszuprobieren]].

Ich habe vor Kurzem [[Veränderung|meine Wohnung umgestellt und ein neues Regal aufgebaut]]. Ich fühle mich seitdem noch wohler. Wenn du bei der Einrichtung Fragen hast, helfe ich dir gern mit Ideen, auch ohne dass ich dich besuche.

In deinem Brief schreibst du, dass du dich wohlfühlst, und das freut mich sehr: [[Freude|Ein schönes Zuhause ist wichtig für das Wohlbefinden]]. Ich hoffe, dass du dort viel Ruhe findest. Beim Besuch bin ich besonders gespannt auf deine Lieblingsecke.

Was hältst du davon? Schreib mir, [[Frage an den Bekannten|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deinen Brief. [[Reaktion auf die Entschuldigung|Du brauchst dich nicht zu entschuldigen, ich verstehe das gut]]. Glückwunsch zur Wohnung.

Beim Computer habe ich gemischte Erfahrungen: Einerseits [[Vorteil des Computers|erleichtert er mir die Arbeit]], andererseits [[Nachteil des Computers|sitze ich zu viel davor]].

Meine Wohnung ist [[Größe der Wohnung|klein]], aber [[Besonderheit der Wohnung|ich fühle mich wohl]].

Ich würde dich gern besuchen, muss aber prüfen, ob es klappt. [[Zeitpunkt des Besuchs|Vielleicht im August]].

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

Weil du meinst, dass du dich wohlfühlst, vermute ich, dass [[Vermutung|deine Wohnung hell und ruhig ist]]. Das ist wichtig, besonders wenn man viel zu Hause arbeitet. Ich hoffe, dass du dort viele schöne Stunden verbringst und bald Besuch hast.

Bei mir gab es zuletzt [[Neuigkeit|eine kleine Erkältung]], aber jetzt bin ich wieder fit. Deshalb war ich vielleicht etwas ruhig in letzter Zeit. Ich freue mich, dass es dir gut geht, und ich hoffe, dass wir bald mehr Kontakt haben.

Falls es dir lieber ist, besuche ich dich auch gern [[Alternative|im September, wenn es nicht mehr so heiß ist]]. Sag mir einfach, was dir besser passt. Ich plane ohnehin, [[Plan|im Herbst noch einmal zu verreisen]], also bin ich zeitlich flexibel.

Schreib mir bitte, [[Frage an den Bekannten|ob dir August passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deinen Brief, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Entschuldigung|Entschuldige dich bitte nicht]]. Glückwunsch zur Wohnung.

Als Nächstes zum Computer: [[Erfahrung mit dem Computer|Ich nutze ihn täglich]].

Dann zu meiner Wohnung: [[Größe der Wohnung|Zwei Zimmer, Balkon]].

Danach zum Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Juli]].

Zuletzt zu meinen Neuigkeiten: [[Neuigkeit|Neue Arbeit]].

Was die Möbel betrifft: Ich habe mir [[Möbel|ein altes Sofa und einen Holztisch]] gekauft, die ich liebe. Du hast bestimmt auch [[Vermutung|neue schöne Stücke]], die du mir zeigen willst. Ich bin schon gespannt und freue mich auf deinen Rundgang.

Zum Schluss ein Neues: [[Neues Projekt|Ich plane einen Sprachkurs im Herbst]], damit ich bei meinen Reisen besser zurechtkomme. Ich bin gespannt, wie es wird, und ich erzähle dir beim Treffen davon. Und du? Planst du auch etwas Neues?

Ich habe noch eine Frage zur Wohnung: [[Frage|Ist sie ruhig oder hört man viel von draußen]]? Das ist wichtig, wenn man zu Hause arbeitet. Und gibt es in der Nähe [[Frage 2|einen Park oder ein Café, in dem man lesen kann]]? Beim Besuch möchte ich das gern sehen.

Ich freue mich sehr auf [[Vorfreude|deine Wohnung und unsere Gespräche]], und ich bin gespannt auf alles Neue. Wie geht es weiter? Schreib mir, [[Frage an den Bekannten|wann du Zeit hast]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Bekannten|Andreas]],

dein Brief hat mich sehr gefreut. [[Reaktion auf die Entschuldigung|Mach dir keine Gedanken wegen der Pause, Hauptsache, es geht dir gut]]. Ich freue mich für dich über die neue Wohnung.

Zum Computer: [[Erfahrung mit dem Computer|Er hilft mir, mit meiner Familie in Kontakt zu bleiben]].

Meine Wohnung ist [[Größe der Wohnung|klein und gemütlich]].

Ich besuche dich sehr gern, [[Zeitpunkt des Besuchs|am liebsten im Sommer]].

Bei mir gibt es [[Neuigkeit|ein schönes neues Hobby]].

Ich habe noch eine Idee für unser Treffen: Wir könnten [[Idee|zusammen ein Foto von deiner neuen Wohnung machen]] und es an gemeinsame Freunde schicken. Das ist eine nette Überraschung für alle, und ich bin sicher, dass sie sich freuen, von dir zu hören.

Mir ist eingefallen, dass ich dir noch von meinem Wochenende erzählen wollte: [[Wochenende|Ich war wandern und habe eine schöne Hütte entdeckt]]. Dort gab es [[Besonderheit|die beste Suppe der Gegend]]. Vielleicht gehen wir zusammen hin, wenn ich dich besuche und du Lust hast.

Ich freue mich auch darauf, dich in deinem neuen Zuhause zu erleben: [[Vorfreude|wie du kochst, wie du lachst und wie du dich eingerichtet hast]]. Das sagt oft mehr über einen Menschen als jedes Telefongespräch. Ich glaube, es wird ein schönes Wochenende.

Ich freue mich auf [[Vorfreude|ein langes Wiedersehen]] und auf [[Wunsch|ein gutes Gespräch bei einer Tasse Tee]]. Erzähl mir, [[Frage an den Bekannten|wie du dich in der Wohnung fühlst]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Bekannten|Andreas]],

neue Wohnung, cool! [[Reaktion auf die Entschuldigung|Kein Stress wegen der Pause]].

Computer? [[Erfahrung mit dem Computer|Ständig dran, Arbeit und Freizeit]].

Meine Wohnung: [[Größe der Wohnung|klein, aber fein]].

Besuch? [[Zeitpunkt des Besuchs|Gern, im Sommer]].

Neues: [[Neuigkeit|Nichts Besonderes]].

Falls du noch Bücher brauchst, habe ich einige, die ich [[Angebot|dir leihen oder schenken kann]]. Ich lese gern [[Lesevorlieben|Krimis und Reisebeschreibungen]], und vielleicht hast du ähnliche Vorlieben. Beim Besuch können wir über unsere Lieblingsbücher reden.

Sonst gibt es bei mir [[Neuigkeit|nichts Aufregendes]], und genau das mag ich im Moment. Ich genieße die ruhigen Tage und freue mich auf den Sommer. Bei dir ist bestimmt mehr los mit der neuen Wohnung, und ich bin neugierig auf deine Geschichten.

Bevor ich schließe, möchte ich dir noch einmal herzlich zur Wohnung gratulieren. [[Wunsch|Ich wünsche dir viele schöne Abende am Schreibtisch und mit deinen Büchern]]. Und ich hoffe, dass wir bald wieder öfter voneinander hören, und dass du bald wieder schreibst.

Ich freue mich echt auf den Besuch bei dir und auf alles, was wir zusammen machen können, denn wir haben uns [[Zeit seit dem letzten Treffen|zu lange nicht gesehen]] und es gibt bestimmt [[Gesprächsstoff|viel zu erzählen und zu lachen]]. Wenn du Fragen zu meiner Anreise hast, sag einfach Bescheid, ich bin da sehr flexibel. Meld dich, [[Frage an den Bekannten|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

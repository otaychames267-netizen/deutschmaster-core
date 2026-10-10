// v2 (B2-style): Emilia hat bald Uni-Prüfungen, lernt abends fleißig und bittet um Lerntipps; sie möchte wissen, wo man wohnt, und überlegt, nach den Prüfungen (Ende Juli oder August) zu Besuch zu kommen — mit Frage nach Übernachtungsmöglichkeit.
// Points: Wann Sie Zeit haben · Tipps für das Lernen · Vorschlag für eine gemeinsame Unternehmung · Übernachtungsmöglichkeit.
export const kw = [/Zeit|Juli|August|Woche|Wochenende|Termin/i, /Tipp|lernen|Pausen|Lernplan|Karteikarten|Gruppe|Wiederhol|Schlaf/i, /unternehm|Ausflug|Kino|Stadt|Museum|Café|Park|Wanderung|Schwimmen|gemeinsam|Fahrradtour|Picknick|Flohmarkt/i, /übernacht|schlafen|Sofa|Gästezimmer|Hotel|Platz|Matratze|Zimmer/i, /wohne|lebe|Stadt|Wohnort/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Emilia]],

vielen Dank für deine E-Mail, ich habe mich sehr gefreut, von dir zu hören! Ich wünsche dir viel Erfolg bei deinen Uni-Prüfungen. [[Zuspruch|Du bist so fleißig, das wird bestimmt klappen]].

Du fragst nach Lerntipps: [[Lerntipp 1|Mach nach jeder Stunde eine kurze Pause]], denn [[Begründung|dein Kopf braucht Zeit, um alles zu speichern]]. Außerdem hilft es mir, [[Lerntipp 2|Karteikarten zu schreiben und sie abends zu wiederholen]].

Ich wohne in [[Wohnort|Leipzig]], und ich würde mich sehr freuen, wenn du mich besuchst. [[Zeit|Ende Juli und im August habe ich viel Zeit]], am besten passt mir [[Wunschtermin|die erste Augustwoche]].

Zum Übernachten: [[Übernachtung|Du kannst gern im Gästezimmer schlafen, ich habe genug Platz]].

Unternehmen könnten wir [[Vorschlag|zusammen einen Ausflug an den See machen]].

Zu deiner Anreise: Du kannst [[Anreise|mit dem Zug bis zum Hauptbahnhof]] fahren, und ich hole dich dort ab. Dann zeige ich dir [[Stadt zeigen|meine Lieblingsstraßen und den schönen Stadtpark]]. Bring [[Hinweis|nur bequeme Schuhe und gute Laune]] mit, mehr brauchst du nicht.

Ich schicke dir rechtzeitig vor deiner Reise noch einen kleinen Plan für die Tage, die du bei mir verbringst, damit du dich schon jetzt darauf freuen kannst. Es wird bestimmt sehr schön, und wir beide haben uns lange nicht gesehen.

Lass mich bitte wissen, was du davon hältst.

[[Grußformel|Alles Liebe]]
[[Dein Name|Samira]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Emilia]],

schön, dass du dich meldest! Viel Erfolg bei den Prüfungen, [[Zuspruch|du rockst das]].

Tipps zum Lernen? Klar: [[Lerntipp 1|Lern in kleinen Blöcken, nicht den ganzen Abend am Stück]]. Und [[Lerntipp 2|schlaf genug, sonst bleibt nichts hängen]].

Ich wohne in [[Wohnort|Dresden]]. Besuch mich gern, [[Zeit|Ende Juli oder im August geht bei mir]]. Sag einfach, wann es dir passt.

Zum Schlafen: [[Übernachtung|Du kannst auf meinem Sofa pennen, das ist ziemlich bequem]]. Im Ernst, Platz ist genug da.

Und was machen wir? [[Vorschlag|Ich zeige dir die Stadt, wir gehen in ein Café und abends ins Kino]].

Noch ein Tipp zum Lernen: [[Lerntipp 3|Leg dein Handy in ein anderes Zimmer]], sonst klaut es dir die Konzentration. Ich mache das auch, [[Folge|und ich schaffe viel mehr in kürzerer Zeit]]. Und am Wochenende [[Pause|gönn dir einen freien Tag, ohne schlechtes Gewissen]].

Wenn du kommst, hole ich dich ab, [[Anreise|am Bahnhof, wenn du mir deinen Zug schickst]]. Ich zeige dir [[Stadt zeigen|die coolen Ecken, die Touristen nicht kennen]], und wir kochen abends zusammen. Ich freue mich echt schon, [[Gefühl|dich endlich wiederzusehen]], und wir haben bestimmt viel zu erzählen.

Mach dir nicht zu viel Stress, das wird schon, und wenn du Lust hast, können wir vorher noch telefonieren.

Melde dich bald!

[[Grußformel|Bis bald]]
[[Dein Name|Lea]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Emilia]],

wie schön, dass du mich besuchen möchtest! Ich freue mich riesig darauf. [[Zuspruch|Für deine Prüfungen drücke ich dir ganz fest die Daumen]].

Meine Lerntipps: [[Lerntipp 1|Mach dir einen Lernplan und hake jeden Tag etwas ab]], das gibt ein tolles Gefühl! [[Lerntipp 2|Belohne dich nach jedem Kapitel mit etwas Leckerem]].

Ich lebe in [[Wohnort|Hamburg]], und Ende Juli oder im August habe ich [[Zeit|jede Menge Zeit für dich]]. Wir können [[Vorschlag|den Hafen besuchen, eine Bootsfahrt machen und viel Eis essen]].

Zum Übernachten: [[Übernachtung|Mein Gästezimmer wartet schon auf dich]].

Noch ein Tipp: [[Lerntipp 3|Erkläre den Stoff laut deinem Kuschelbär oder einer Pflanze]]. Das klingt verrückt, aber es funktioniert wirklich! Wenn du etwas erklären kannst, [[Folge|hast du es auch verstanden]].

Ich kann es kaum erwarten, dich bei mir zu haben. Ich werde [[Vorbereitung|das Gästezimmer mit frischen Blumen schmücken]] und [[Vorbereitung 2|deine Lieblingsschokolade besorgen]]. Du sollst dich gleich wie zu Hause fühlen, [[Wunsch|und zwischen den Prüfungen richtig entspannen]]. Wir machen auch einen Mädelsabend, [[Plan|mit Pizza und lustigen Filmen]].

Wir können auch einen Ausflug in die Stadt machen, und ich zeige dir mein Lieblingscafé, wo es den besten Kuchen gibt. Danach laufen wir gemütlich am Wasser entlang, und du erzählst mir alles über deine Uni. Das wird ein toller Tag.

Ich freue mich so!

[[Grußformel|Alles Liebe]]
[[Dein Name|Mina]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Emilia]],

vielen Dank für deine E-Mail. Ich beantworte deine Punkte der Reihe nach.

Zum Termin: [[Zeit|Ende Juli passt mir gut, im August habe ich eine Woche Urlaub]]. Ich schlage vor, dass du [[Wunschtermin|vom 28. Juli bis zum 3. August]] kommst.

Zum Lernen: [[Lerntipp 1|Erstelle einen Wochenplan mit festen Lernzeiten]]. [[Lerntipp 2|Wiederhole den Stoff nach einem Tag, nach drei Tagen und nach einer Woche]].

Zur Unternehmung: [[Vorschlag|Wir könnten das Stadtmuseum besichtigen und danach im Park spazieren gehen]].

Zur Unterkunft: [[Übernachtung|Du kannst in meinem Gästezimmer übernachten, ein Bett ist vorhanden]]. Ich wohne in [[Wohnort|München]].

Zur Anreise: Du kannst [[Anreise|mit dem Zug anreisen]], die Fahrt dauert etwa drei Stunden. Ich hole dich am Bahnhof ab. Bitte teile mir die Ankunftszeit mit, [[Hinweis|damit ich rechtzeitig dort bin]].

Zum Lernen noch ein Hinweis: [[Lerntipp 3|Löse alte Prüfungsaufgaben unter Zeitdruck]]. So lernst du, [[Folge|dir die Zeit richtig einzuteilen]]. Während deines Besuchs richten wir dir einen ruhigen Arbeitsplatz ein, [[Angebot|falls du noch etwas wiederholen möchtest]]. Wir können die Tage so planen, dass genug Zeit für die Erholung bleibt.

Ich helfe dir gern bei allen Vorbereitungen, die du brauchst, und freue mich schon darauf, dich wiederzusehen.

Deine Antwort erwarte ich mit Vorfreude.

[[Grußformel|Viele Grüße]]
[[Dein Name|Daria]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Emilia]],

danke für deine Nachricht! Ich helfe dir gern, soweit ich kann. [[Zuspruch|Du schaffst deine Prüfungen sicher]].

Meine Tipps: [[Lerntipp 1|Schreib alle wichtigen Begriffe auf Zettel und hänge sie in der Wohnung auf]]. Wenn du willst, [[Hilfsangebot|frage ich dich am Telefon ab]], das mache ich gern.

Besuch: [[Zeit|Im August habe ich frei]], dann kannst du jederzeit kommen. Ich wohne in [[Wohnort|Hannover]] und hole dich am Bahnhof ab, [[Hilfsangebot 2|damit du dich nicht verläufst]].

Übernachten: [[Übernachtung|Ich habe ein ausklappbares Sofa und eine zusätzliche Matratze]], das reicht für dich.

Noch ein praktischer Tipp: [[Lerntipp 3|Stell dir beim Lernen einen Wecker für die Pausen]], dann vergisst du sie nicht. Ich kann dir auch [[Hilfsmittel|einen Lernplan als Vorlage schicken]], wenn du das möchtest.

Für deinen Besuch besorge ich [[Besorgung|frische Handtücher und Bettwäsche]]. Wenn du eine Allergie hast, [[Frage|sag mir bitte Bescheid]], dann kaufe ich das passende Essen. Ich kann dir auch [[Hilfsangebot 3|einen Stadtplan und eine Fahrkarte für den Bus]] bereitlegen. So kommst du ohne Probleme überall hin und musst dich um nichts kümmern.

Sag mir einfach, was du brauchst, dann kümmere ich mich darum, damit du in Ruhe lernen kannst.

Und tagsüber [[Vorschlag|zeige ich dir meine Lieblingsorte in der Stadt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Ayse]]` },

  // 6
  { label: "begründend, argumentativ", t: `Liebe [[Name der Freundin|Emilia]],

ich freue mich über deine E-Mail, weil [[Grund für die Freude|ich dich lange nicht gesehen habe]]. Viel Erfolg bei den Prüfungen, [[Zuspruch|du hast ja so fleißig gelernt]].

Mein wichtigster Tipp ist, regelmäßig Pausen zu machen, weil [[Begründung|man dann mehr behält]]. [[Lerntipp 1|Lerne vierzig Minuten und mache zehn Minuten Pause]]. Außerdem [[Lerntipp 2|schlafe genug, denn Schlaf festigt das Gelernte]].

Ende Juli passt mir gut, weil [[Grund für den Termin|ich dann Urlaub habe]]. [[Zeit|Auch im August kannst du kommen]]. Ich wohne in [[Wohnort|Kiel]].

Du kannst bei mir schlafen, denn [[Grund für die Unterkunft|ich habe ein freies Zimmer]]. [[Übernachtung|Das Bett steht schon bereit]].

Ich erkläre dir noch, warum ich dir die Pausen so ans Herz lege: [[Begründung 2|Das Gehirn lernt in Wellen und braucht Zeit zum Verarbeiten]]. Deshalb ist es klüger, [[Rat|öfter kurz zu lernen als einmal lange]]. Außerdem sinkt die Nervosität, [[Folge|wenn du ausgeruht in die Prüfung gehst]].

Ich freue mich auf deinen Besuch, weil [[Grund|wir uns bestimmt viel zu erzählen haben]]. Ich bin überzeugt, dass dir die Abwechslung guttun wird, denn nach den Prüfungen verdienst du eine richtige Belohnung.

Ich hoffe, dass dir meine Tipps helfen, und ich bin gespannt, wie die Prüfungen laufen.

Ich schlage [[Vorschlag|eine Fahrradtour vor]], weil [[Grund für den Vorschlag|man so die Stadt am besten kennenlernt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Emilia]],

danke für deine E-Mail, hier meine Antworten.

Zeit: [[Zeit|Ende Juli und August]].

Lerntipps: [[Lerntipp 1|Pausen machen]] und [[Lerntipp 2|Karteikarten schreiben]].

Unternehmung: [[Vorschlag|Stadtbesichtigung und Eis essen]].

Übernachten: [[Übernachtung|Gästezimmer, kein Problem]].

Noch ein paar Gedanken zum Lernen: [[Lerntipp 3|Sprich mit anderen über den Stoff]], das hilft enorm. Wenn du nicht weiterkommst, [[Angebot|rufe mich einfach an]]. Mein Vorschlag ist außerdem, [[Rat|am Tag vor der Prüfung nur noch kurz zu wiederholen]].

Zu deinem Besuch: Ich hole dich am Bahnhof ab, [[Anreise|wenn du mir die Ankunftszeit schickst]]. Wir könnten [[Stadt zeigen|durch die Altstadt gehen und alte Brücken ansehen]] und abends in einem kleinen Lokal essen. Danach sitzen wir auf dem Balkon und erzählen, [[Plan|was in den letzten Monaten passiert ist]].

Bring bitte nicht viel mit, ich habe alles da. Wichtig ist nur, dass du dich auf die Tage freust und die Prüfungen gut hinter dich bringst.

Ich hoffe, dass dir meine Gedanken helfen, und ich freue mich, wenn wir bald telefonieren. Du kannst mich jederzeit anrufen, auch am Abend, wenn du eine Pause brauchst und etwas Ablenkung möchtest. Sonst bin ich meistens zu Hause, und wir können dann ganz in Ruhe reden.

Ich wohne in [[Wohnort|Köln]]. Ich freue mich auf deinen Besuch, und bis dahin wünsche ich dir viel Erfolg.

[[Grußformel|Bis dann]]
[[Dein Name|Elif]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Emilia]],

Uni-Prüfungen, das klingt nach wenig Schlaf und viel Kaffee! [[Zuspruch|Aber du schaffst das, du bist ein Genie]].

Meine Lerntipps: [[Lerntipp 1|Iss ein Stück Schokolade pro gelerntem Kapitel]]. Und [[Lerntipp 2|stell dir vor, die Prüfer tragen Clownsnasen]]. Das hilft gegen Nervosität.

Zum Besuch: [[Zeit|Ende Juli und August sind perfekt]]. Ich wohne in [[Wohnort|Stuttgart]], und Platz habe ich genug, [[Übernachtung|mein Sofa wartet schon auf dich]].

Ernsthaft noch ein Tipp: [[Lerntipp 3|Lerne nie mit leerem Magen und ohne Wasser]]. Das Gehirn braucht Energie! Und wenn du genervt bist, [[Rat|geh kurz rennen oder tanze durch die Wohnung]], das macht den Kopf frei.

Zu deinem Besuch: Ich habe [[Besorgung|genug Kaffee und Kekse]] für ein ganzes Regiment. Du kannst jeden Morgen ausschlafen, [[Folge|solange du mir beim Kochen hilfst]]. Das ist ein fairer Deal, oder? Ich zeige dir [[Stadt zeigen|das Stadtzentrum, die Märkte und das beste Eiscafé]], denn ich kenne mich dort sehr gut aus.

Außerdem verspreche ich dir, dass ich nicht über deine Noten lache, egal wie sie ausfallen. Wir feiern einfach den Sommer, und das ist das Wichtigste. Du bekommst von mir auch ein Handtuch mit deinem Namen, wie ein richtiger Hotelgast!

Wir könnten [[Vorschlag|ein Picknick im Park machen und die Enten füttern]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Fatma]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Emilia]],

als ich deine E-Mail gelesen habe, habe ich an meine eigenen Prüfungen gedacht. [[Erinnerung|Ich habe damals jede Nacht bis um zwei Uhr gelernt]], und das war ein Fehler. Deshalb möchte ich dir helfen.

Mein Rat: [[Lerntipp 1|Geh abends noch eine halbe Stunde spazieren]]. [[Lerntipp 2|Lerne lieber morgens, wenn dein Kopf frisch ist]].

Ich wohne in [[Wohnort|Bremen]], und ich freue mich, dich zu sehen. [[Zeit|Ende Juli bin ich noch da, im August fahre ich zwei Wochen weg]].

Du kannst [[Übernachtung|im Zimmer meiner Schwester übernachten, sie ist gerade im Ausland]].

Ich habe damals von meiner Mutter einen guten Rat bekommen: [[Rat 3|Nicht alles auf einmal lernen wollen]]. Das habe ich leider erst zu spät verstanden. Heute sage ich dir, [[Rat 4|dass du dir kleine Ziele setzen sollst]], zum Beispiel ein Kapitel pro Tag.

Ich kann dir zeigen, wo ich studiert habe, [[Stadt zeigen|die alte Bibliothek und das Café daneben]]. Wir können dort sitzen und über früher reden. Ich freue mich darauf, [[Gefühl|dich in meinem Zuhause zu haben]]. Abends kochen wir [[Plan|etwas Leckeres aus meiner Heimat]], und ich erzähle dir von meinem neuen Job.

Ich bin ganz sicher, dass du das schaffst, und ich freue mich auf dich.

Und wir [[Vorschlag|gehen am Wochenende auf den Flohmarkt]].

[[Grußformel|Herzlich]]
[[Dein Name|Sophie]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Liebe [[Name der Freundin|Emilia]],

danke für deine E-Mail, komm gern! [[Zuspruch|Ich wünsche dir viel Erfolg bei den Prüfungen]]. Ich habe einige Vorschläge.

Mein Vorschlag zum Lernen: [[Lerntipp 1|Lerne in einer kleinen Gruppe, dann erklärt jeder etwas]]. Und [[Lerntipp 2|belohne dich jeden Abend mit einer Serie]].

Mein Vorschlag zum Termin: [[Zeit|Du kommst Anfang August, dann ist das Wetter am besten]]. Ich wohne in [[Wohnort|Nürnberg]].

Mein Vorschlag zur Unterkunft: [[Übernachtung|Du schläfst im Gästezimmer, und wir frühstücken zusammen]].

Mein Vorschlag zur Unternehmung: [[Vorschlag|Wir fahren mit dem Zug an die Küste und gehen schwimmen]].

Noch ein Vorschlag: Wenn du die erste Prüfung hinter dir hast, [[Vorschlag 2|rufst du mich an, und wir besprechen, wie es gelaufen ist]]. Das ist gut für die Motivation, denn dann weißt du, dass jemand an dich denkt.

Mein letzter Vorschlag betrifft die Anreise: [[Anreise|Wir treffen uns am Bahnhof, und wir fahren zusammen mit der Straßenbahn zu mir]]. So musst du keinen Fahrplan studieren. Wenn du ankommst, gibt es zuerst einen Kaffee, [[Plan|und danach machen wir einen kleinen Spaziergang]], damit du dich einlebst. Das ist für mich die schönste Art, einen Besuch zu beginnen.

Ich nehme mir [[Zeit für dich|zwei Tage frei]], damit wir [[Plan 3|alles in Ruhe besprechen können]].

Was hältst du davon?

[[Grußformel|Bis bald]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Emilia]],

besten Dank für deine E-Mail. Ich würde mich sehr freuen, wenn du mich besuchst, [[Bedingung|wenn deine Prüfungen gut verlaufen]].

Für das Lernen habe ich einige Tipps, aber jeder lernt anders. [[Lerntipp 1|Mir hilft ein fester Zeitplan]], andererseits [[Lerntipp 2|brauchst du vielleicht mehr Abwechslung]]. Probiere aus, was für dich passt.

Zum Termin: [[Zeit|Ende Juli wäre möglich, aber im August habe ich mehr Zeit]]. Ich weiß noch nicht genau, wann mein Chef mir freigibt. Ich wohne in [[Wohnort|Rostock]].

Zur Unterkunft: [[Übernachtung|Das Gästezimmer ist klein, aber es reicht für eine Person]].

Ich möchte dich nicht unter Druck setzen. [[Sorge|Wenn du lieber erst nach den Prüfungen planen möchtest]], ist das für mich in Ordnung. Wir können auch später entscheiden, [[Vorschlag 2|wann der Besuch am besten passt]].

Das Gästezimmer ist nicht luxuriös, aber [[Hinweis|es ist ruhig und hell]]. Ich glaube, du wirst dich dort wohlfühlen. Falls du lieber mehr Abstand möchtest, [[Alternative|gibt es auch ein günstiges Hotel in der Nähe]]. Sag mir einfach, was dir lieber ist.

Ich bin [[Gefühl|ganz sicher]], dass wir etwas Passendes finden, und ich freue mich, dich bald zu sehen.

Eine Unternehmung? [[Vorschlag|Vielleicht eine kleine Wanderung, wenn das Wetter gut ist]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Emilia]],

danke für deine E-Mail! Ich gehe der Reihe nach auf deine Fragen ein.

Zuerst zum Termin: [[Zeit|Ende Juli ist für mich ideal]]. Dann zum Lernen: [[Lerntipp 1|Plane jeden Tag feste Pausen ein]] und [[Lerntipp 2|wiederhole alles am nächsten Morgen]].

Als Nächstes zur Unternehmung: [[Vorschlag|Wir machen eine Stadtführung und gehen danach ins Café]]. Ich wohne in [[Wohnort|Freiburg]].

Zum Schluss zur Unterkunft: [[Übernachtung|Du kannst bei mir im Gästezimmer wohnen]].

Danach die Anreise: [[Anreise|Du kommst mit dem Zug, und ich hole dich ab]]. Ich schicke dir die genaue Adresse, [[Hinweis|sobald du mir den Termin bestätigt hast]].

Zum Schluss noch ein Hinweis zu deinem Programm: Am ersten Tag ruhen wir uns aus und [[Plan 1|essen gemütlich zu Hause]]. Am zweiten Tag [[Plan 2|besichtigen wir die Altstadt]], und am dritten [[Plan 3|machen wir einen Ausflug in die Umgebung]]. So hast du genug Zeit für alles, und niemand muss sich stressen.

Ich hoffe, du hast keine Fragen mehr offen. Falls doch, schreib mir einfach, dann antworte ich sofort. Ich freue mich [[Vorfreude|schon sehr auf die Zeit mit dir]], denn wir haben uns lange nicht gesehen. Gemeinsam machen wir aus den Tagen etwas Schönes, und du kannst nach den Prüfungen endlich durchatmen.

Wenn du antwortest, plane ich alles Weitere.

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Emilia]],

deine E-Mail hat mich sehr gefreut. [[Zuspruch|Ich weiß, wie anstrengend Prüfungen sind, und ich denke an dich]]. Du schaffst das, da bin ich ganz sicher.

Mein Tipp: [[Lerntipp 1|Sei nicht zu streng mit dir, auch Pausen sind wichtig]]. [[Lerntipp 2|Trink genug Wasser und geh an die frische Luft]].

Du kannst gern zu mir kommen, [[Zeit|Ende Juli oder im August, wie es dir passt]]. Ich wohne in [[Wohnort|Münster]]. Bei mir ist immer Platz, [[Übernachtung|das Gästezimmer gehört dir]].

Ich möchte dir noch sagen, dass du dir keine Sorgen machen musst, [[Beruhigung|wenn nicht alles perfekt läuft]]. Wichtig ist, dass du dein Bestes gibst. Danach feiern wir, [[Plan|egal wie das Ergebnis aussieht]].

Für deinen Besuch bereite ich [[Vorbereitung|dein Lieblingsessen und einen Tee]] vor. Ich möchte, dass du dich bei mir geborgen fühlst, [[Wunsch|und dass du die Prüfungen endlich vergessen kannst]]. Wenn du mitten in der Nacht reden möchtest, bin ich da, und wir sitzen zusammen und erzählen.

Wir machen auch einen gemeinsamen Ausflug in die Stadt, [[Plan 2|wenn du Lust darauf hast]]. Du musst nichts entscheiden, ich schlage nur vor, und du sagst Ja oder Nein. Ich möchte, dass du dich ganz frei fühlst.

Wir [[Vorschlag|machen es uns gemütlich und kochen zusammen]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Emilia]],

cool, dass du mich besuchen willst! [[Zuspruch|Viel Glück bei den Prüfungen]].

Lerntipps: [[Lerntipp 1|Mach Pausen]] und [[Lerntipp 2|schlaf genug]].

Zeit: [[Zeit|Ende Juli oder August, beides geht]].

Schlafen: [[Übernachtung|Gästezimmer ist frei]]. Ich wohne in [[Wohnort|Berlin]].

Und wir? [[Vorschlag|Kino und Eis essen]].

Noch mehr Tipps: [[Lerntipp 3|Schreib Zusammenfassungen von Hand]], das hilft beim Merken. Und [[Lerntipp 4|trink nicht zu viel Kaffee]], sonst kannst du nachts nicht schlafen. Ich hab das alles schon ausprobiert, und es funktioniert.

Zu deinem Besuch: Ich wohne [[Wohnlage|nur zehn Minuten vom Bahnhof entfernt]], also kein Problem. Frische Bettwäsche liegt schon bereit, und wir können [[Plan|am Abend zusammen grillen]]. Wenn das Wetter schlecht ist, bleiben wir drin und quatschen.

Du musst nicht viel mitbringen, nur dich und gute Laune. Alles andere findet sich, und ich freue mich riesig auf den Besuch.

Ich freue mich so, dass du kommst! Wir haben bestimmt viel zu lachen, und nach den Prüfungen hast du dir das auch verdient. Ich zeige dir die Stadt, wir sitzen abends im Café, und [[Folge|du vergisst die Uni für ein paar Tage]]. Schreib mir einfach, wann du ankommst, dann hole ich dich ab und wir legen sofort los.

Meld dich!

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

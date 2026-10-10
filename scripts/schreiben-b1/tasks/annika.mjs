// v2 (B2-style): Annika (Wochenende verregnet, zuhause geblieben) will im Sommer mit Ihnen verreisen: Meer oder Städtereise, etwas Sport, nicht zu teuer. Points: was Sie am Wochenende unternommen haben ·
// wohin Sie gerne reisen würden · was Sie im Urlaub gerne machen · wie man beim Reisen Geld sparen kann — plus: "Hattest du ein schönes Wochenende?", "An welches Reiseziel denkst du?", kein Luxushotel.
export const kw = [/Wochenende/, /Meer|Stadt|reisen|Reise|Italien|Spanien|Türkei|Berlin|Urlaub|Ziel/i, /gern|Schwimmen|Wandern|Sport|besichtigen|Museum|Strand|Essen|entspannen/i, /sparen|günstig|billig|Preis|Jugendherberge|Camping|Sonderangebot|Ferienwohnung|Bus|Zug/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Annika]],

vielen Dank für deinen Brief, ich habe mich sehr gefreut! Mir geht es gut. Schade, dass es bei dir am Wochenende so geregnet hat. [[Mein Wochenende|Am Samstag war ich im Schwimmbad, am Sonntag bei meiner Familie]].

Dass du meine Idee mit der gemeinsamen Reise gut findest, freut mich sehr. Ich würde gern [[Reiseziel|an die Adria nach Italien]] fahren, weil [[Grund für das Reiseziel|man dort Meer, Städte und gutes Essen verbinden kann]].

Im Urlaub mache ich gern [[Aktivität 1|schwimmen und lange Spaziergänge]], und ich besichtige auch gern [[Aktivität 2|alte Gebäude und kleine Museen]]. Für den Sport findest du bestimmt etwas, [[Sportangebot|zum Beispiel Radfahren oder Joggen am Strand]].

Wie wir Geld sparen können? Ich habe mehrere Ideen: [[Spartipp 1|Wir übernachten in einer Jugendherberge oder in einer günstigen Ferienwohnung]]. Außerdem [[Spartipp 2|fahren wir mit dem Zug oder mit dem Bus statt mit dem Auto]]. Und [[Spartipp 3|wir kochen manchmal selbst, statt immer im Restaurant zu essen]].

Dass du vor Kurzem viel Geld für die Autoreparatur ausgeben musstest, tut mir leid: [[Mitgefühl|Das ist ärgerlich, aber es passiert jedem einmal]]. Deshalb ist es klug, dass wir günstig verreisen. Mit etwas Planung [[Zuversicht|wird der Urlaub trotzdem schön und bezahlbar]].

Wenn es um das Reiseziel geht, möchte ich noch hinzufügen: [[Wunsch|Ich wollte schon immer das Meer im Sonnenaufgang sehen]]. Vielleicht [[Idee|buchen wir ein Zimmer mit Blick aufs Wasser]], falls das Budget es erlaubt. Auch ein kleines Zimmer reicht, Hauptsache, wir sind zusammen.

Zu meinem Wochenende noch eine Ergänzung: [[Detail|Am Sonntag habe ich eine Liste mit Reisezielen geschrieben]]. Das hat Spaß gemacht, und ich bin bereit, die Liste mit dir zu vergleichen. Vielleicht haben wir [[Folge|mehr gemeinsame Wünsche, als wir denken]].

Schreib mir bitte, [[Frage an die Freundin|wann du Zeit hast, damit wir planen können]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Annika]],

ich habe mich wirklich über dein Lebenszeichen gefreut! Bei mir war das Wochenende okay, [[Mein Wochenende|ich war joggen, habe Freunde getroffen und abends Serie geguckt]]. Bei dir hat es nur geregnet? Schade!

Eure Reise? Unbedingt! Ich wäre für [[Reiseziel|Spanien, irgendwo an der Küste]], weil [[Grund für das Reiseziel|es dort warm und günstig ist]]. Städtereise wäre auch cool, zum Beispiel [[Zweites Reiseziel|Lissabon]].

Im Urlaub liebe ich [[Aktivität 1|Strand, Eis und Faulenzen]], aber [[Aktivität 2|ein bisschen Sport muss auch sein, zum Beispiel Volleyball]].

Geld sparen: [[Spartipp 1|Hostel statt Hotel, Mehrbettzimmer sind super günstig]]. [[Spartipp 2|Flug oder Fernbus früh buchen]]. Und [[Spartipp 3|Supermarkt statt Restaurant, mit Picknick am Strand]].

Wenn wir ein Budget festlegen, [[Idee|zum Beispiel höchstens 500 Euro pro Person]], haben wir ein klares Ziel. Dann suchen wir alles danach aus. Das ist ein Trick, der sich bewährt hat, [[Erfahrung|bei meiner letzten Reise war ich damit sehr zufrieden]].

Für mich ist wichtig, dass der Urlaub [[Wunsch|abwechslungsreich ist, ein Tag am Strand, ein Tag in der Stadt]]. Dazu passt Italien, aber auch Spanien oder Kroatien. Du hast doch schon [[Frage|an ein bestimmtes Land gedacht]]? Wenn nicht, finden wir sicher etwas, das uns beiden gefällt.

Am Wochenende habe ich auch [[Aktivität|meinen Rucksack geprüft und neue Wanderschuhe gekauft]], falls wir wandern. Das war schon eine kleine Vorfreude. Und du? Hast du am regnerischen Wochenende [[Frage|etwas Schönes zu Hause gemacht]]?

Meld dich, [[Frage an die Freundin|wann du verreisen kannst]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Annika]],

wie schön, dass ich von dir höre! Mir geht es richtig gut. [[Mein Wochenende|Am Wochenende war ich wandern und habe abends mit Freunden gegrillt]]. Dass es bei dir nur geregnet hat, tut mir leid!

Die gemeinsame Reise ist eine großartige Idee! Ich träume von [[Reiseziel|der Türkei, mit Strand und Städten]], weil [[Grund für das Reiseziel|dort alles zusammenkommt und es nicht teuer ist]]. Auch [[Zweites Reiseziel|Barcelona]] würde mir gefallen.

Im Urlaub liebe ich [[Aktivität 1|schwimmen, tauchen und Sonne]], und [[Aktivität 2|abends bummeln und lecker essen]]. Sport kommt nicht zu kurz, [[Sportangebot|wir können jeden Morgen laufen oder Kajak fahren]].

Geld sparen: [[Spartipp 1|Wir buchen eine Ferienwohnung zusammen, dann teilen wir die Kosten]]. [[Spartipp 2|Wir reisen in der Nebensaison]]. Und [[Spartipp 3|wir nutzen Sonderangebote]].

Wegen des Sports habe ich noch eine Idee: [[Idee|Wir buchen eine Unterkunft in der Nähe eines Fahrradverleihs]], dann können wir Touren machen. Radfahren ist günstig und gesund. Oder [[Alternative|wir suchen einen kostenlosen Yogakurs am Strand]], wenn es sowas gibt.

Als Reisezeit schlage ich [[Zeitraum|Anfang September]] vor, weil [[Grund|es dann günstiger ist und das Meer noch warm]]. Wenn du lieber im Juli oder August fahren möchtest, [[Alternative|passe ich mich an]], aber es wird dann teurer. Sag mir, was für dich möglich ist.

Mein Wochenende war ereignisreich: [[Detail|Samstag Schwimmbad, Sonntag Familientreffen mit Grillen]]. Das hat mir gutgetan. Ich hoffe, du hattest wenigstens [[Wunsch|ein gutes Buch oder einen schönen Film]], als es geregnet hat.

Lass mich einfach wissen, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Annika]],

vielen Dank für deinen Brief. Zu allem, was du angesprochen hast, äußere ich mich nacheinander.

Erstens, mein Wochenende: [[Mein Wochenende|Ich habe eine Radtour gemacht und am Sonntag meine Wohnung aufgeräumt]]. Dein Wochenende war leider verregnet.

Zweitens, das Reiseziel: Ich würde gern [[Reiseziel|nach Kroatien an die Küste]] reisen, weil [[Grund für das Reiseziel|es dort Meer und Städte gibt]].

Drittens, was ich im Urlaub gern mache: [[Aktivität 1|Schwimmen, wandern und besichtigen]].

Viertens, Spartipps: [[Spartipp 1|Günstige Unterkunft, zum Beispiel Camping]], [[Spartipp 2|Zug statt Flug]] und [[Spartipp 3|Selbstverpflegung]].

Ergänzend schlage ich vor, [[Vorschlag|die Reise in der Nebensaison zu machen, zum Beispiel Anfang Juni oder September]]. Dann sind Unterkünfte billiger und die Strände weniger voll. Wir hätten mehr Ruhe, [[Folge|und das Wetter ist oft noch sehr schön]].

Ich bin gespannt, ob wir uns bei dem Ziel einig werden: [[Neugier|Du magst ja Meer und Städte, ich auch]]. Das macht es einfach. Eine Küstenstadt wäre vielleicht ideal, zum Beispiel [[Beispiel|Triest, Split oder Valencia]]. Dort gibt es beides und man kann viel zu Fuß erreichen.

Zum Wochenende kann ich sagen, dass es [[Beschreibung|ruhig und erholsam]] war. Ich habe viel geschlafen und ein bisschen aufgeräumt. Danach fühlte ich mich bereit für neue Pläne, [[Folge|zum Beispiel für unsere gemeinsame Reise]].

Bitte teile mir mit, [[Frage an die Freundin|wann du Urlaub nehmen kannst]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Annika]],

danke für deinen Brief! [[Mein Wochenende|Ich war am Wochenende bei meiner Schwester und habe ihr beim Umzug geholfen]]. Schade, dass es bei dir geregnet hat. Bei der Reiseplanung helfe ich dir gern.

Mein Vorschlag: [[Reiseziel|eine Woche an der Ostsee]], weil [[Grund für das Reiseziel|es dort Meer, Sport und kleine Städte gibt, und alles ist günstig]]. Ich kann [[Praktische Hilfe|passende Angebote im Internet heraussuchen]].

Im Urlaub mache ich gern [[Aktivität 1|Radfahren und Schwimmen]].

Spartipps: [[Spartipp 1|Vergleiche Preise auf mehreren Seiten]], [[Spartipp 2|buche früh]] und [[Spartipp 3|nimm Proviant mit]].

Praktisch ist auch, [[Tipp|eine Reiseapp zu nutzen, die Preise vergleicht]]. Ich nutze eine, und sie hat mir schon viel Geld gespart. Wenn du willst, [[Hilfsangebot|zeige ich dir, wie das geht, und wir suchen zusammen]].

Wenn du magst, mache ich einen Vorschlag für die Route: [[Route|Hinfahrt mit dem Zug, drei Tage in einer Stadt, dann eine Woche am Meer]]. Das ist abwechslungsreich und gut zu bezahlen. Ich lasse mich aber gern von deinen Ideen überzeugen, [[Offenheit|denn dein Wunsch zählt genauso]].

Am Wochenende war ich [[Ort|bei einer Freundin, die gerade umgezogen ist]]. Ich habe ihr geholfen und dabei gemerkt, wie schön es ist, Freunden zu helfen. Das gilt auch für dich, [[Angebot|bei der Planung unserer Reise stehe ich gern bereit]].

Sag mir bitte, [[Frage an die Freundin|ob ich schon etwas buchen soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Annika]],

ich freue mich über deinen Brief, denn [[Begründung für die Freude|ich habe Lust auf eine gemeinsame Reise]]. Schade, dass das Wetter bei dir schlecht war. [[Mein Wochenende|Bei mir war ich viel draußen und habe Sport gemacht]].

Als Reiseziel schlage ich [[Reiseziel|Italien]] vor, weil [[Grund für das Reiseziel|man dort Meer und Städte kombinieren kann]].

Im Urlaub mache ich gern [[Aktivität 1|schwimmen und besichtigen]], weil [[Grund für die Aktivität|ich dabei entspanne und Neues sehe]].

Sparen können wir, indem wir [[Spartipp 1|eine günstige Unterkunft buchen]], da [[Grund für den Tipp|das den größten Teil der Kosten ausmacht]]. Außerdem [[Spartipp 2|reisen wir mit dem Bus]].

Die Wahl zwischen Meer und Stadt ist schwierig. Wenn wir [[Idee|einige Tage am Meer und zwei Tage in einer Stadt]] verbringen, haben wir beides. Das ist nicht teurer, solange wir [[Hinweis|die Fahrten günstig halten]]. Was meinst du dazu?

Ich habe schon überlegt, welche Sehenswürdigkeiten mich interessieren: [[Interesse|alte Kirchen, Altstädte und kleine Märkte]]. Dafür muss man kein Geld ausgeben, und es ist oft das Schönste. Aber natürlich [[Hinweis|wollen wir auch Zeit zum Ausruhen haben]].

Mein Wochenende begann mit [[Aktivität|einem langen Spaziergang]], und das Wetter war schön. Ich dachte an dich, weil bei dir der Regen so lange gedauert hat. Dafür sind wir jetzt im Sommer bestimmt [[Hoffnung|doppelt so sonnig unterwegs]].

Schreib mir, [[Frage an die Freundin|ob dir meine Gründe einleuchten]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Annika]],

danke für deinen Brief, hier kurz meine Antworten.

Wochenende: [[Mein Wochenende|Schwimmbad und Freunde]].

Reiseziel: [[Reiseziel|Italien, Küste]].

Im Urlaub: [[Aktivität 1|Schwimmen, Spazieren, Museum]].

Sparen: [[Spartipp 1|Jugendherberge]], [[Spartipp 2|Zug]], [[Spartipp 3|Selbstverpflegung]].

Bei den Mahlzeiten können wir viel sparen: [[Tipp|Frühstück in der Unterkunft und mittags ein Picknick]], und abends essen wir in einem einfachen Lokal. So haben wir trotzdem etwas Besonderes, [[Folge|ohne dass das Budget leidet]].

Zum Thema Unterkunft: Es muss kein Luxushotel sein, [[Wunsch|ein sauberes Zimmer mit Bad reicht mir völlig]]. Ich bin da nicht anspruchsvoll. Wichtig ist nur, dass [[Bedingung|wir in der Nähe von Strand oder Altstadt wohnen]], damit wir nicht viel fahren müssen.

Am Wochenende habe ich [[Aktivität|Freunde besucht und alte Fotos von Reisen angeschaut]]. Das hat mich auf die Reise mit dir eingestimmt. Wenn du magst, zeige ich dir die Fotos, [[Idee|vielleicht gibt es Orte, die dir auch gefallen]].

Ich freue mich sehr auf unsere Reise und hoffe, dass wir ein schönes Ziel finden, das auch für dich bezahlbar ist, denn Urlaub soll Spaß machen und keine Sorgen bringen. Ich bin offen für alle deine Ideen und lasse mich gern überraschen. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Annika]],

bei dir hat es die ganze Zeit geregnet? Dann brauchst du dringend Sonne! [[Mein Wochenende|Ich war bei meinen Eltern und habe zu viel Kuchen gegessen]]. Die Reise ist die beste Idee des Jahres.

Als Reiseziel schlage ich [[Reiseziel|Spanien]] vor, [[Grund für das Reiseziel|dort scheint die Sonne mehr, als man verträgt]].

Im Urlaub mache ich gern [[Aktivität 1|schwimmen, essen und noch einmal essen]]. Sport? [[Sportangebot|Ich tue so, als würde ich joggen]].

Geld sparen: [[Spartipp 1|Wir schlafen in einem Zelt, das spart Geld und Komfort]]. [[Spartipp 2|Wir nehmen Bus statt Taxi]]. Und [[Spartipp 3|Eis nur einmal am Tag]], zumindest theoretisch.

Wenn es regnet wie am letzten Wochenende bei dir, [[Hinweis|brauchen wir einen Plan B]]. Zum Beispiel Museen mit günstigem Eintritt oder ein Besuch in einer Therme. Das kostet wenig und macht Spaß, [[Folge|und der Urlaub ist trotzdem gerettet]].

Beim Strand mag ich es, wenn [[Wunsch|er sauber ist und nicht zu überfüllt]]. Deshalb wäre die Nebensaison für mich ideal. Aber auch im Hochsommer gibt es ruhige Plätze, [[Hinweis|man muss sie nur kennen]]. Wir suchen zusammen im Internet nach Tipps.

Wochenende war okay, [[Beschreibung|ich bin zu Hause geblieben, bei mir schien aber die Sonne]]. Ich habe gekocht und gelesen. Schade, dass wir uns nicht gesehen haben, [[Wunsch|vielleicht klappt es nächstes Mal]].

Schreib bald, [[Frage an die Freundin|wann wir packen]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Annika]],

als ich deinen Brief gelesen habe, musste ich an unseren letzten Urlaub denken. [[Erinnerung an die letzte Reise|Wir sind damals im Regen am Strand spazieren gegangen und haben gelacht]]. Dein Wochenende klingt ruhig.

[[Mein Wochenende|Ich habe am Wochenende gekocht und eine Freundin besucht]].

Als Reiseziel schlage ich [[Reiseziel|Portugal]] vor, weil [[Grund für das Reiseziel|ich dort schon einmal war und mich verliebt habe]].

Im Urlaub mache ich gern [[Aktivität 1|lange Strandspaziergänge]].

Spartipps: [[Spartipp 1|Ich übernachte gern in kleinen Pensionen]], [[Spartipp 2|fahre mit dem Zug]].

Ich erinnere mich an unsere erste gemeinsame Fahrt: [[Erinnerung|Wir haben nur Brot und Käse gegessen und waren trotzdem glücklich]]. So ein Urlaub ist oft der schönste. Deshalb sehe ich der Reise sehr positiv entgegen, [[Folge|auch wenn wir nicht viel Geld haben]].

Ich erinnere mich an einen schönen Urlaub in meiner Kindheit: [[Erinnerung|Wir waren in einem kleinen Haus am Meer]]. Seitdem liebe ich das Meer. Es wäre schön, dieses Gefühl mit dir zu teilen.

Mein Wochenende erinnerte mich an unseren Urlaub: [[Erinnerung|Ich habe Eis gegessen und am See gesessen]]. Es war herrlich ruhig. So ein Gefühl wünsche ich uns auch im Sommer, [[Wunsch|ohne Hektik und mit viel Zeit füreinander]].

Ich freue mich sehr auf unseren Sommer und auf viele schöne Tage mit dir. Erzähl mir, [[Frage an die Freundin|woran du bei dem Wort Urlaub zuerst denkst]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Annika]],

danke für deinen Brief. [[Mein Wochenende|Mein Wochenende war ruhig, ich habe Freunde getroffen]]. Ich habe gleich mehrere Vorschläge für unsere Reise.

Mein erster Vorschlag: Wir fahren [[Reiseziel|an die Küste nach Kroatien]]. Mein zweiter: [[Zweites Reiseziel|Wir verbinden das mit einem Tag in einer Stadt]].

Mein dritter Vorschlag: Im Urlaub machen wir [[Aktivität 1|Sport am Morgen und Besichtigungen am Nachmittag]].

Mein vierter Vorschlag zum Sparen: [[Spartipp 1|Wir buchen eine Ferienwohnung zu zweit]]. Mein fünfter: [[Spartipp 2|Wir reisen im Juni, wenn es günstiger ist]].

Mein sechster Vorschlag: [[Vorschlag|Wir fahren mit dem Zug und kaufen ein Sparticket für zwei]]. Mein siebter: [[Vorschlag 2|Wir packen nur Handgepäck, dann sparen wir die Gebühren]]. So bleibt alles einfach und günstig.

Mein achter Vorschlag: [[Vorschlag|Wir machen jeden Abend einen kleinen Spaziergang am Wasser]]. Das ist umsonst, entspannend und gesund. Mein neunter: [[Vorschlag 2|Wir suchen uns jeden Tag ein anderes Eis aus]], das gehört zum Urlaub.

Zu meinem Wochenende ein kurzer Vorschlag: [[Vorschlag|Nächstes Wochenende könnten wir uns treffen und gemeinsam Reiseführer durchblättern]]. Das ist günstig und macht Spaß. Dabei finden wir bestimmt ein Ziel, [[Folge|das uns beiden gefällt]].

Was hältst du davon? Ich freue mich auf deine Antwort. Erzähl mir doch, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Annika]],

danke für deinen Brief. [[Mein Wochenende|Mein Wochenende war ruhig, ich war spazieren und habe gelesen]]. Zur Reise möchte ich vorsichtig antworten.

Einerseits [[Vorteil des Meeres|ist das Meer entspannend]], andererseits [[Vorteil einer Städtereise|bieten Städte mehr Kultur]]. Ich würde eher [[Reiseziel|eine Küstenstadt]] vorschlagen, damit beides möglich ist.

Im Urlaub mache ich gern [[Aktivität 1|ruhige Dinge, Lesen und Schwimmen]].

Beim Geld wäre ich vorsichtig und würde sparen: [[Spartipp 1|Eine einfache, günstige Unterkunft reicht]], und [[Spartipp 2|wir sollten früh buchen]].

Wir sollten auch an eine Reserve denken: [[Hinweis|Ein bisschen Geld für unvorhergesehene Ausgaben]]. Nach deiner Autoreparatur wissen wir, wie wichtig das ist. Aber das ist kein Grund, auf den Urlaub zu verzichten, [[Folge|sondern nur, ihn gut zu planen]].

Ich möchte noch erwähnen, dass ich bei Reisen gern [[Eigenschaft|flexibel und ohne Stress]] bin. Wenn etwas nicht klappt, finden wir eine Lösung. Das hat auf meinen Reisen bisher immer geholfen, [[Folge|und die meisten Pannen wurden zu guten Geschichten]].

Mein Wochenende war ganz in Ordnung, [[Beschreibung|ein bisschen Arbeit, ein bisschen Erholung]]. Ich war nicht so aktiv wie sonst, aber das war gut. Für die Reise will ich fit sein, [[Folge|und ich werde bald wieder mehr Sport machen]].

Ich freue mich auf deine Antwort und möchte wissen, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Annika]],

danke für deinen Brief, ich antworte Schritt für Schritt. Als Erstes: [[Mein Wochenende|Mein Wochenende war schön, ich war bei Freunden]].

Als Nächstes zum Reiseziel: [[Reiseziel|Italien, an der Küste]].

Dann zu meinen Urlaubswünschen: [[Aktivität 1|Schwimmen und Städte ansehen]].

Danach zum Sparen: Erstens [[Spartipp 1|Hostel]], zweitens [[Spartipp 2|Zug]], drittens [[Spartipp 3|Picknick]].

Zum Schluss ein Schritt: [[Schritt|Wir legen zusammen fest, wie viel wir ausgeben wollen, und schreiben es auf]]. Dann gibt es später keinen Streit. Das ist ein einfacher, aber wirkungsvoller Plan, [[Folge|und er hat bei mir immer geholfen]].

Als zweiten Schritt sollten wir ein Datum festlegen: [[Schritt|Wir suchen eine Woche, in der wir beide frei haben]]. Danach buchen wir. Je früher wir das tun, desto günstiger wird es, [[Folge|und desto mehr Auswahl haben wir]].

Ich habe am Wochenende [[Aktivität|zwei Stunden an unserer Reiseplanung gesessen]]. Das war ein erster Schritt. Ich schicke dir meine Notizen, wenn du magst, [[Angebot|und wir besprechen alles am Telefon]].

Ich freue mich sehr auf die Reise mit dir und hoffe, dass wir ein Ziel finden, das uns beiden gefällt und nicht zu teuer ist, denn Urlaub soll vor allem Freude machen. Wie geht es weiter? Gib mir einfach Bescheid, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Annika]],

dein Brief hat mich sehr gefreut. Es tut mir leid, dass es bei dir so geregnet hat. [[Mein Wochenende|Ich habe an dich gedacht und mir mit Freunden einen gemütlichen Abend gemacht]].

Die gemeinsame Reise wird bestimmt schön. Ich wünsche mir [[Reiseziel|ein ruhiges Küstendorf]], weil [[Grund für das Reiseziel|wir dort Zeit füreinander haben]].

Im Urlaub mache ich gern [[Aktivität 1|Spaziergänge und gemeinsames Kochen]].

Wegen deiner Autoreparatur verstehe ich, dass du sparen musst. [[Spartipp 1|Ich helfe dir gern, eine günstige Unterkunft zu finden]], und [[Spartipp 2|wir teilen uns alles fair]].

Es freut mich besonders, dass wir zusammen verreisen: [[Gefühl|Mit dir macht jeder Urlaub Spaß, auch ein einfacher]]. Du bist eine tolle Reisebegleiterin, und deshalb bin ich zuversichtlich. Ich zahle auch gern mal [[Angebot|ein Eis oder einen Kaffee]], wenn das Geld knapp ist.

Mit dir zu verreisen, ist für mich ein Highlight: [[Gefühl|Wir verstehen uns gut und können über alles lachen]]. Das ist die beste Voraussetzung für einen schönen Urlaub, [[Folge|egal, wohin wir fahren]]. Ich freue mich riesig darauf.

Am Wochenende habe ich oft an dich gedacht: [[Gefühl|Ich hoffe, dass du dich bei dem Regen nicht gelangweilt hast]]. Wenn es dir schlecht ging, tut mir das leid. Du kannst mich jederzeit anrufen, [[Angebot|ich höre gern zu]].

Erzähl mir, [[Frage an die Freundin|wie ich dich bei der Planung unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Annika]],

Wochenende? [[Mein Wochenende|Chillen, Freunde, Eis]]. Bei dir Regen, schade!

Reiseziel: [[Reiseziel|Italien]].

Im Urlaub: [[Aktivität 1|Strand, Sport, Essen]].

Sparen: [[Spartipp 1|Hostel]], [[Spartipp 2|Bus]].

Ein Spartipp noch: [[Tipp|Wasserflasche mitnehmen und kostenlos auffüllen]]. Das spart viel Geld im Lauf des Urlaubs. Und [[Tipp 2|Sehenswürdigkeiten ohne Eintritt anschauen]], zum Beispiel Parks, Strände, Plätze. Das sind oft die schönsten Orte.

Wenn du lieber in die Berge möchtest statt ans Meer, [[Alternative|sage es einfach]], ich bin offen. Hauptsache, wir verbringen eine schöne Zeit. Und vielleicht [[Idee|können wir auch zwei Orte verbinden]], das wäre abwechslungsreich.

Wochenende kurz: [[Beschreibung|Sonne, Eis, Freunde]]. Bei dir Regen, schade. Aber wir holen das im Sommer nach, [[Folge|mit viel Sonne am Strand]]. Ich freue mich schon sehr auf unsere gemeinsame Reise.

Ich freue mich echt auf unsere Reise und bin für fast alles offen, Hauptsache, es ist nicht zu teuer und wir haben genug Zeit zum Entspannen. Wir finden bestimmt etwas, das uns beiden gefällt, und wenn nicht, suchen wir einfach weiter, bis wir ein schönes Ziel haben. Ich schicke dir gern ein paar Ideen zum Anschauen, dann können wir zusammen entscheiden, und danach bald buchen, bevor die Preise steigen. Lass mich einfach wissen, [[Frage an die Freundin|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

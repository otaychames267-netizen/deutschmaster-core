// v2 (B2-style): Nora ist umgezogen (große helle Wohnung, kleiner Garten, nette Nachbarn), hat aber noch keine neuen Freunde. Points: wie man neue Leute kennenlernen kann – ein Tipp ·
// ein Vorschlag zum Treffen · eine Frage zu Noras Wohnung · was es Neues bei Ihnen gibt — plus: "Hoffentlich ist bei dir alles in Ordnung", "Wir sollten uns bald wiedersehen".
export const kw = [/Tipp|Verein|Kurs|Sportverein|Gruppe|Treffpunkt|App|Fitness|Chor|Sprachkurs|Nachbar/i, /treff/i, /Wohnung|Garten|Zimmer|Miete|Balkon/i, /Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /\?/, /Freund|Leute|kennenlern/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Nora]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Mir geht es gut, es ist alles in Ordnung bei mir. Mach dir keine Gedanken, dass du erst jetzt schreibst. [[Reaktion auf die Pause|Nach einem Umzug hat man viel zu tun]], und es freut mich, dass du dich in der neuen Wohnung wohlfühlst.

Zu deinem Problem, neue Leute kennenzulernen, habe ich einen Tipp: [[Tipp 1|Melde dich in einem Verein an, zum Beispiel im Chor]]. Dort triffst du regelmäßig dieselben Menschen. Außerdem kannst du [[Tipp 2|deine netten Nachbarn zu einem Kaffee in deinem Garten einladen]].

Eine Frage zu deiner Wohnung: [[Frage zur Wohnung|Wie viele Zimmer hat sie, und was ist dein Lieblingsplatz im Garten]]?

Bei mir gibt es folgende Neuigkeit: [[Neuigkeit|Ich habe einen neuen Job in einem Reisebüro angefangen]].

Wir sollten uns bald wiedersehen. Ich schlage vor, [[Treffvorschlag|dass wir uns am Samstag in einem Café treffen]].

Zu deinem Garten habe ich noch eine Idee: Du könntest [[Idee|ein kleines Beet mit Kräutern anlegen]], damit du abends frische Zutaten hast. Wenn du Nachbarn einlädst, [[Wirkung|freuen sie sich bestimmt über selbstgemachte Limonade mit Minze]]. So entsteht schnell ein netter Kontakt, und der Garten wird zum Treffpunkt.

Zu deiner Wohnung noch eine Frage: [[Frage|Hast du schon ein Gästezimmer eingerichtet]]? Dann könnte ich bei meinem Besuch auch über Nacht bleiben. Ich bringe [[Mitbringsel|eine Pflanze für deinen Garten und ein Gläschen Honig]] mit. Das ist ein kleines Einweihungsgeschenk von mir.

Bei mir passiert gerade noch mehr: [[Neuigkeit|Ich habe angefangen, einen Fotokurs zu besuchen]]. Dort habe ich schon [[Ergebnis|zwei nette Leute kennengelernt]], wir gehen am Wochenende zusammen fotografieren. Das zeigt dir, dass es wirklich funktioniert, wenn man sich traut.

Schreib mir bitte, [[Frage an die Freundin|ob dir der Samstag passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Nora]],

schön, von dir zu hören! Bei mir ist alles okay. Kein Stress wegen der Pause, [[Reaktion auf die Pause|nach einem Umzug ist man ewig beschäftigt]]. Deine neue Wohnung mit Garten klingt super.

Neue Leute? Mein Tipp: [[Tipp 1|Geh zu einem Sprachkurs oder Fitnessstudio, da kommt man schnell ins Gespräch]]. Oder [[Tipp 2|nutze eine App, mit der man Leute für Hobbys findet]]. Und deine Nachbarn sind doch nett, [[Tipp 3|lade sie mal zum Grillen ein]].

Zu deiner Wohnung: [[Frage zur Wohnung|Wie groß ist der Garten, und kann man da grillen]]?

Was bei mir los ist? [[Neuigkeit|Ich habe angefangen, Klettern zu lernen]].

Treffen wir uns bald? [[Treffvorschlag|Wie wäre es nächstes Wochenende bei dir im Garten]]?

Mein Tipp zu neuen Kontakten noch genauer: Beim Sprachkurs oder in der Gruppe [[Tipp|bring ruhig einen Kuchen mit]], dann kommen die Leute von selbst zu dir. Ich habe das so gemacht, und [[Ergebnis|nach zwei Wochen kannte ich fast alle]]. Das ist ein einfacher Trick, der fast immer funktioniert.

Deine Wohnung muss großartig sein: Groß, hell, mit Garten! Ich frage mich, [[Frage|wie du das mit dem Rasenmähen machst]] und ob [[Frage 2|du einen Nachbarn hast, der dir einen Mäher leiht]]. Ich möchte das bei meinem Besuch gern sehen, wenn du Zeit hast.

In meinem Alltag gibt es eine Änderung: [[Neuigkeit|Ich stehe jetzt früher auf und laufe vor der Arbeit eine kleine Runde]]. Dabei treffe ich oft dieselben Menschen. Das ist vielleicht auch ein Tipp für dich, im Garten oder im Park, [[Idee|ein bisschen Bewegung und ein Gruß]].

Meld dich, [[Frage an die Freundin|wann es klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Nora]],

wow, schön, von dir zu lesen! Mir geht es richtig gut. Mach dir keine Sorgen wegen der Pause. [[Reaktion auf die Pause|Hauptsache, du hast alles gut geschafft]]. Deine neue Wohnung klingt traumhaft.

Du suchst neue Freunde? Das klappt bestimmt! Mein Tipp: [[Tipp 1|Such dir einen Kurs, der dir Spaß macht, zum Beispiel Tanzen oder Kochen]]. Dort lernst du viele nette Leute kennen. Und [[Tipp 2|geh zu Veranstaltungen in deiner Stadt]].

Eine Frage zu deiner Wohnung: [[Frage zur Wohnung|Hast du schon eine Einweihungsparty geplant]]?

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich bin im Sommer drei Wochen in Italien]].

Treffen wir uns bald! [[Treffvorschlag|Ich komme gern am Wochenende zu dir und bringe Kuchen mit]].

Du kannst auch [[Idee|ein Schild an deine Gartentür hängen, auf dem steht, dass jeder willkommen ist]]. Das ist eine tolle Geste, und viele Leute freuen sich darüber. Dann [[Folge|bleiben sie stehen und fangen ein Gespräch an]]. Ich finde, das ist mutig und sympathisch.

Bei deiner Wohnung interessiert mich besonders, [[Frage|wie du sie eingerichtet hast]]. Hast du viele Möbel selbst gebaut oder nur gekauft? Ich liebe es, neue Wohnungen anzusehen, und freue mich darauf, [[Wunsch|deine Lieblingsecke kennenzulernen]].

Außerdem habe ich vor Kurzem [[Erlebnis|bei einem Straßenfest mitgeholfen]], und es war toll. Ich habe viele neue Gesichter gesehen, und manche davon sind jetzt Bekannte. Vielleicht gibt es auch in deiner Straße so etwas, frag mal [[Frage|bei deinen Nachbarn oder im Rathaus]].

Schreib mir bald, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Nora]],

vielen Dank für deine Nachricht. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, deine Wohnung: [[Reaktion auf die Wohnung|Ich freue mich, dass du dich wohlfühlst, ein Garten ist ein großer Vorteil]]. Dazu habe ich eine Frage: [[Frage zur Wohnung|Wie viele Zimmer hat die Wohnung, und wie lange ist der Weg zur Arbeit]]?

Zweitens, neue Leute: Ich empfehle, [[Tipp 1|einem Verein beizutreten]] und [[Tipp 2|einen Kurs zu besuchen]].

Drittens, ein Treffen: Ich schlage [[Treffvorschlag|Samstag, 15 Uhr in einem Café in deiner Nähe]] vor.

Viertens, meine Neuigkeiten: [[Neuigkeit|Ich habe eine neue Aufgabe im Büro übernommen]].

Ergänzend schlage ich vor, [[Idee|im Internet nach Gruppen in deiner Stadt zu suchen]]. Dort sind meist viele Neue, die auch Anschluss suchen. Das ist der einfachste Weg, und [[Vorteil|man muss keinen Beitrag zahlen]].

Eine weitere Frage zu deiner Wohnung: [[Frage|Wie hoch ist die Miete im Vergleich zu deiner alten Wohnung]]? Das hilft mir bei meinen eigenen Überlegungen, denn ich denke auch über einen Umzug nach. Wenn du magst, [[Angebot|erzähle ich dir beim Treffen mehr darüber]].

Eine Neuigkeit noch: [[Neuigkeit|Ich bin im Sommer drei Wochen verreist und habe viel gesehen]]. Ich zeige dir bei einem Treffen die Fotos, wenn du magst. Es war eine schöne Zeit, und ich habe viel über mich gelernt, [[Erkenntnis|vor allem, wie wichtig Freunde sind]].

Ich freue mich auf ein Wiedersehen und hoffe, dass du dich bald richtig wohlfühlst. Bitte teile mir mit, [[Frage an die Freundin|ob dir der Termin passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Nora]],

danke für deine Mail! [[Reaktion auf die Pause|Es ist völlig in Ordnung, dass du erst jetzt schreibst]]. Zu deinem Wunsch, neue Leute kennenzulernen, helfe ich dir gern.

Praktische Tipps: [[Tipp 1|Schau im Internet nach Vereinen und Kursen in deiner Stadt]]. Ich kann [[Praktische Hilfe|dir eine Liste mit Ideen zusammenstellen]]. Und [[Tipp 2|nutze die Nachbarschaft, ein Zettel im Hausflur mit einer Einladung hilft]].

Zu deiner Wohnung habe ich eine Frage: [[Frage zur Wohnung|Wie groß ist der Garten, und kann ich dir beim Einrichten helfen]]?

Bei mir gibt es [[Neuigkeit|eine neue Hobbygruppe, in der ich mitmache]].

Wir sollten uns bald treffen. [[Treffvorschlag|Ich komme gern am Sonntag zu dir und helfe im Garten]].

Ich helfe dir auch gern bei der Suche nach einem passenden Angebot: [[Hilfsangebot|Schick mir einfach deine Interessen, dann suche ich dir drei Gruppen aus]]. Ich kenne mich mit solchen Seiten gut aus. Und [[Zusatzhilfe|ich kann dir auch beim Schreiben der ersten Nachricht helfen]].

Weil du viel Platz hast, habe ich eine Idee: Du könntest [[Idee|einen Spieleabend mit Nachbarn organisieren]]. Ich bringe [[Mitbringsel|ein paar Brettspiele]] mit, wenn ich komme. Dann haben wir sofort eine Möglichkeit, neue Leute einzuladen.

In meiner Familie gibt es auch Veränderungen: [[Neuigkeit|Meine Schwester hat geheiratet, und wir haben groß gefeiert]]. Ich war sehr glücklich, und ich habe viele Verwandte wiedergesehen. Bei einem Treffen erzähle ich dir alles ganz genau, wenn du Lust hast.

Sag mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Nora]],

du brauchst dich nicht zu entschuldigen, denn [[Begründung für die Nachsicht|nach einem Umzug hat jeder viel zu tun]]. Dass du dich in deiner Wohnung wohlfühlst, freut mich.

Neue Leute lernt man am besten über gemeinsame Interessen kennen, weil [[Begründung für den Tipp|man sofort ein Gesprächsthema hat]]. Deshalb rate ich: [[Tipp 1|Tritt einem Verein oder Kurs bei]]. Außerdem [[Tipp 2|sprich mit Nachbarn, die schon nett zu dir sind]].

Zu deiner Wohnung habe ich eine Frage, weil ich neugierig bin: [[Frage zur Wohnung|Wie sieht der Garten aus, und was baust du an]]?

Bei mir gibt es [[Neuigkeit|eine kleine Veränderung im Beruf]].

Ein Treffen schlage ich vor, denn [[Grund für das Treffen|wir haben uns lange nicht gesehen]]: [[Treffvorschlag|am Samstag in einem Café]].

Ein weiterer Grund, einen Verein zu wählen: [[Grund|Man trifft sich regelmäßig, und Freundschaften wachsen langsam]]. Das ist wichtiger als ein einmaliges Treffen. Du hast Zeit, und deine Nachbarn sind schon freundlich, das ist eine gute Basis, auf der du aufbauen kannst.

Eine Frage zu deinem Garten habe ich noch: [[Frage|Gibt es dort Obstbäume oder nur Rasen]]? Ich frage das, weil ich Gärten liebe und gern etwas lernen würde. Wenn du Hilfe brauchst, [[Hilfsangebot|komme ich gern und packe mit an]].

Seit ein paar Wochen [[Hobby|male ich wieder und besuche einen kleinen Kurs]]. Das hat mir gutgetan, und ich habe dort nette Leute gefunden. Genau das empfehle ich dir, [[Empfehlung|such dir ein Hobby, das du schon lange machen wolltest]].

Schreib mir, [[Frage an die Freundin|ob dir der Samstag passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Nora]],

danke für deine Mail, hier kurz meine Antworten.

Pause: [[Reaktion auf die Pause|Kein Problem]].

Tipp: [[Tipp 1|Verein oder Kurs besuchen]]. [[Tipp 2|Nachbarn einladen]].

Wohnung: [[Frage zur Wohnung|Wie viele Zimmer hat sie, und wie groß ist der Garten]]?

Neues bei mir: [[Neuigkeit|Neue Stelle]].

Treffen: [[Treffvorschlag|Samstag im Café]].

Weitere Tipps: [[Tipp|Gehe regelmäßig zum selben Bäcker oder Supermarkt]], dann kennt man dich schnell. Und [[Tipp 2|sag im Büro, dass du Leute suchst]], oft haben Kollegen gute Ideen. Das hat mir sehr geholfen, als ich neu in der Stadt war.

Zur Wohnung: [[Frage|Ist sie ruhig gelegen, oder hört man viel von der Straße]]? Das ist für mich wichtig, weil ich viel Ruhe brauche. Vielleicht [[Idee|machen wir bei meinem Besuch einen Spaziergang durch dein Viertel]], dann sehe ich alles.

Mein Alltag hat sich in letzter Zeit verändert: [[Neuigkeit|Ich arbeite jetzt zwei Tage von zu Hause]]. Das ist praktisch, aber manchmal auch einsam. Ich verstehe also, wie du dich fühlst, und [[Folge|ich gehe jetzt öfter in ein Café, um unter Menschen zu sein]].

Ich freue mich auf unser Wiedersehen und wünsche dir, dass du bald viele nette Menschen kennenlernst, denn du hast es verdient. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|ob es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Nora]],

dass du lange nicht geschrieben hast, verzeihe ich dir, [[Reaktion auf die Pause|ein Umzug ist ein guter Grund]]. Dein Garten klingt ja fast wie ein kleines Paradies, ich bin neidisch.

Neue Freunde? Mein Tipp: [[Tipp 1|Melde dich beim Chor an, dort wird gesungen, und alle sind glücklich]]. Oder [[Tipp 2|lade deine Nachbarn zum Kaffee ein und biete Kuchen an]], denn Kuchen verbindet.

Zu deiner Wohnung: [[Frage zur Wohnung|Hast du schon Gartenzwerge, oder bist du noch normal]]?

Neues bei mir: [[Neuigkeit|Ich habe versucht, einen Kuchen zu backen, und die Feuerwehr war nicht nötig]].

Treffen? [[Treffvorschlag|Gern bei dir im Garten mit Limonade und Sonnenhut]].

Wenn du Hunde magst, gibt es noch einen Tipp: [[Tipp|Geh mit einem Hund aus dem Tierheim spazieren]], dabei sprechen dich viele Leute an. Das ist lustig und gut für die Seele. Außerdem [[Nebeneffekt|hast du Bewegung und tust etwas Gutes]].

Zu deiner neuen Wohnung habe ich viele Fragen: [[Frage|Wie lange hast du gebraucht, bis du alle Kisten ausgepackt hattest]]? Bei mir hat es drei Wochen gedauert, und manche stehen noch. Das ist wohl bei jedem Umzug so, oder?

Neu bei mir ist [[Neuigkeit|ein Hund, den ich aus dem Tierheim geholt habe]]. Er heißt Max und ist sehr lieb. Durch ihn spreche ich jeden Tag mit anderen Hundebesitzern, das ist ein schöner Nebeneffekt. Ich zeige dir Max gern, wenn wir uns treffen.

Ich freue mich auf [[Vorfreude|ein Wochenende voller Lachen]]. Schreib bald, [[Frage an die Freundin|ob dein Sofa einen Gast aushält]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Nora]],

als ich deine Mail gelesen habe, musste ich an meinen eigenen Umzug denken. [[Erinnerung an den eigenen Umzug|Ich kannte damals niemanden und habe mich oft einsam gefühlt]]. Schön, dass du dich wohlfühlst.

Mein Tipp aus eigener Erfahrung: [[Tipp 1|Ich habe damals einen Sprachkurs besucht und dort meine besten Freunde gefunden]]. Das kann ich dir sehr empfehlen. Und [[Tipp 2|rede mit den Nachbarn, die schon nett sind]].

Zu deiner Wohnung: [[Frage zur Wohnung|Wie lange hast du nach ihr gesucht, und was gefällt dir am meisten]]?

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Ich schlage ein Treffen vor: [[Treffvorschlag|am Wochenende bei dir im Garten]].

Zu meinem eigenen Umzug fällt mir noch ein: [[Erinnerung|Am Anfang habe ich jeden Abend ferngesehen und mich allein gefühlt]]. Erst als ich mich überwunden habe, [[Wendepunkt|einen Kochkurs zu besuchen]], wurde es besser. Ich wünsche dir, dass du den Mut auch findest.

Von meiner Wohnung kann ich dir sagen: [[Beschreibung|Sie ist klein, aber hell, mit Balkon und Parkblick]]. Wenn du mich besuchst, [[Angebot|kochen wir zusammen]], und ich zeige dir meine Lieblingsorte. Das wäre auch ein Gegenbesuch für dein Angebot.

Seit meinem Umzug habe ich mich verändert: [[Veränderung|Ich bin mutiger geworden und spreche mehr mit fremden Menschen]]. Das hat mir viele schöne Begegnungen gebracht. Ich glaube, du schaffst das auch, und ich freue mich darauf, es zu sehen.

Ich bin sicher, dass du bald Freunde findest, und freue mich auf unser Treffen. Erzähl mir, [[Frage an die Freundin|wie du dich in der Stadt fühlst]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Nora]],

danke für deine Mail. [[Reaktion auf die Pause|Die Pause ist kein Problem]]. Ich habe gleich mehrere Vorschläge für dich.

Mein erster Vorschlag, um neue Leute kennenzulernen: [[Tipp 1|Tritt einem Verein bei]]. Mein zweiter Vorschlag: [[Tipp 2|Besuche einen Kurs, zum Beispiel Kochen oder Fotografie]]. Mein dritter: [[Tipp 3|Lade deine Nachbarn zu einem kleinen Gartenfest ein]].

Zu deiner Wohnung habe ich eine Frage: [[Frage zur Wohnung|Wie groß ist der Garten]]?

Mein vierter Vorschlag: Wir treffen uns [[Treffvorschlag|am Wochenende, ich besuche dich]].

Bei mir gibt es [[Neuigkeit|eine neue Radtour-Gruppe]].

Als fünften Vorschlag empfehle ich dir, [[Idee|einmal im Monat ein Treffen mit Nachbarn im Garten zu organisieren]]. Daraus wird schnell eine kleine Tradition. Das macht deine Wohnung zu einem echten Zuhause, [[Folge|und du hast regelmäßig Gesellschaft]].

Mein sechster Vorschlag ist: Bei meinem Besuch bringe ich [[Mitbringsel|ein kleines Gartenwerkzeug als Einzugsgeschenk]] mit. Du kannst es sicher gut gebrauchen. Und ich helfe dir, [[Hilfsangebot|ein Beet anzulegen]], wenn du magst. Das ist mein Beitrag.

Bei mir gibt es auch eine Veränderung: [[Neuigkeit|Ich habe meine Wohnung neu gestrichen]], und jetzt ist sie viel heller. Wenn du uns besuchst oder ich dich besuche, [[Wunsch|zeige ich dir Fotos davon]]. Eine neue Farbe hat mich auch glücklicher gemacht.

Was hältst du davon? Schreib mir, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Nora]],

danke für deine Mail. [[Reaktion auf die Pause|Du brauchst dich nicht zu entschuldigen]]. Neue Freunde zu finden braucht Zeit, das ist normal.

Einerseits [[Vorteil von Vereinen|kann ein Verein viele Kontakte bringen]], andererseits [[Nachteil von Vereinen|braucht man Geduld]]. Ich würde [[Tipp 1|einen Kurs besuchen]] und [[Tipp 2|die Nachbarn freundlich ansprechen]].

Zu deiner Wohnung habe ich eine Frage: [[Frage zur Wohnung|Fühlst du dich im Garten wohl, oder ist er viel Arbeit]]?

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

Ein Treffen finde ich schön. [[Treffvorschlag|Vielleicht am Samstag, wenn du Zeit hast]].

Ich möchte auch betonen, dass du nicht gleich viele Freunde brauchst: [[Hinweis|Ein oder zwei gute Kontakte reichen oft schon]]. Gib dir Zeit und sei nicht zu streng mit dir. Ich bin sicher, dass es bald besser wird, und dann denkst du an die ersten Wochen gar nicht mehr.

Zur Wohnung habe ich noch eine Frage: [[Frage|Ist sie eine Mietwohnung oder gehört sie dir]]? Ich frage, weil ich mich frage, ob ich einmal das Gleiche versuchen sollte. Du musst nicht antworten, wenn es zu persönlich ist.

In letzter Zeit habe ich [[Erlebnis|oft an unsere gemeinsame Zeit gedacht]]. Deshalb hat mich deine Mail so gefreut. Ich möchte, dass wir den Kontakt halten und uns öfter sehen. [[Plan|Vielleicht könnten wir einmal im Monat telefonieren]], was meinst du?

Schreib mir bitte, [[Frage an die Freundin|ob dir das hilft]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Nora]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Pause|Entschuldige dich nicht für die Pause]].

Als Nächstes zu neuen Leuten: [[Tipp 1|Melde dich in einem Verein an]]. Dann [[Tipp 2|besuche einen Kurs]]. Zuletzt [[Tipp 3|lade die Nachbarn ein]].

Dann zu deiner Wohnung: [[Frage zur Wohnung|Wie viele Zimmer hat sie]]?

Danach zu mir: [[Neuigkeit|Neue Arbeit]].

Zuletzt zum Treffen: [[Treffvorschlag|Samstag im Café]].

Der Garten kann auch ein Thema sein, um Leute kennenzulernen: Frage deine Nachbarn nach [[Frage|Tipps für Pflanzen und Gartenarbeit]]. Wer ein Hobby teilt, spricht schnell miteinander. Ich habe das mit [[Beispiel|meinem Nachbarn und seinen Tomaten]] erlebt, und wir sind heute gute Freunde.

Du schreibst, dass die Nachbarn nett sind, das ist ein großes Plus. Ich frage mich, [[Frage|ob es auch Kinder im Haus gibt]]. Das macht ein Haus lebendig. Wenn ja, könntest du [[Idee|ein Sommerfest im Garten organisieren]], bei dem alle mitmachen.

Neu bei mir: [[Neuigkeit|Ich habe angefangen, Spanisch zu lernen]], und ich übe jeden Tag zwanzig Minuten. Das macht mir Spaß, und der Kurs ist voller netter Leute. Ich glaube, das wäre auch etwas für dich, [[Empfehlung|ein Sprachkurs ist ein guter Ort für neue Kontakte]].

Wie geht es weiter? Schreib mir, [[Frage an die Freundin|ob das klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Nora]],

deine Mail hat mich sehr gefreut, und mach dir keine Gedanken wegen der Pause. [[Reaktion auf die Pause|Ein Umzug kostet viel Kraft]]. Es tut mir leid, dass du noch keine Freunde gefunden hast, aber das kommt bestimmt.

Mein Tipp von Herzen: [[Tipp 1|Such dir etwas, das dir Freude macht, einen Chor oder einen Malkurs]]. Dort findest du Menschen mit denselben Interessen. Und [[Tipp 2|sprich weiter mit deinen netten Nachbarn]].

Zu deiner Wohnung: [[Frage zur Wohnung|Wie fühlst du dich in deinem Garten, hast du schon Blumen gepflanzt]]?

Bei mir gibt es [[Neuigkeit|ein neues Hobby, das mir viel Freude macht]].

Ich würde mich freuen, wenn wir uns bald sehen: [[Treffvorschlag|am Wochenende bei dir]].

Ich glaube fest daran, dass du bald nette Menschen findest: [[Zuversicht|Du bist freundlich und offen, das merkt man sofort]]. Der Anfang ist immer schwer, aber danach wird es leichter. Du musst nur den ersten Schritt tun, und ich unterstütze dich dabei, so gut ich kann.

Zur Wohnung: [[Frage|Hast du schon deinen Lieblingsplatz gefunden, vielleicht am Fenster oder im Garten]]? Mir ist das immer wichtig, ich brauche einen Ort, an dem ich abschalten kann. Ich bin neugierig, wie du dich dort wohlfühlst.

Bei mir hat sich einiges getan: [[Neuigkeit|Ich bin befördert worden und habe jetzt mehr Verantwortung]]. Das freut mich, aber es ist auch anstrengend. Ich erzähle dir gern mehr, wenn wir uns treffen oder telefonieren, dann haben wir viel zu bereden.

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit dir]] und auf [[Wunsch|einen Tag in deinem Garten]]. Erzähl mir, [[Frage an die Freundin|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Nora]],

alles gut bei mir. [[Reaktion auf die Pause|Kein Stress wegen der Pause]].

Neue Leute: [[Tipp 1|Verein oder Kurs]], das klappt immer. [[Tipp 2|Und die Nachbarn zum Kaffee einladen]].

Deine Wohnung: [[Frage zur Wohnung|Wie groß ist der Garten]]?

Neues bei mir: [[Neuigkeit|Nichts Besonderes]].

Treffen: [[Treffvorschlag|Wochenende, bei dir]].

Falls du keine Lust auf große Gruppen hast: [[Alternative|Such dir einen Lesekreis oder einen Spieleabend mit nur fünf oder sechs Leuten]]. Das ist gemütlicher und für viele einfacher. Ich war auch lieber in kleinen Runden, und das hat bei mir wunderbar funktioniert.

Eine kleine Frage zu deiner Wohnung: [[Frage|Hast du genug Platz für Besuch]]? Falls ja, würde ich dich gern einmal besuchen und [[Wunsch|ein ganzes Wochenende bleiben]]. Wenn nicht, suche ich mir ein Zimmer in der Nähe, das ist für mich kein Problem.

Nichts Großes bei mir, aber [[Neuigkeit|ich habe einen schönen neuen Schreibtisch gekauft]], und das macht mir Freude. Manchmal sind es die kleinen Dinge, die den Alltag besser machen, und das wünsche ich dir auch, ein paar kleine Freuden im neuen Zuhause.

Ich freue mich echt auf [[Vorfreude|ein Treffen bei dir im Garten]] und hoffe, dass du bald viele nette Leute kennenlernst, das wäre toll für dich. Meld dich, [[Frage an die Freundin|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Liebe [[Name der Freundin|Nora]],

ich danke dir für deine Mail. [[Reaktion auf die Pause|Es ist wunderbar, dass du dich meldest, egal wann]]. Danke, dass du mir von deinem Umzug erzählst.

Dein Vertrauen, mir von deiner Einsamkeit zu schreiben, schätze ich sehr. Mein Tipp: [[Tipp 1|Besuche einen Verein oder einen Kurs]]. Und [[Tipp 2|lade deine netten Nachbarn ein]].

Zu deiner Wohnung: [[Frage zur Wohnung|Wie gefällt dir der Garten, und was ist dein Lieblingszimmer]]?

Bei mir gibt es [[Neuigkeit|eine schöne Nachricht aus der Familie]].

Ich würde mich über ein Treffen freuen: [[Treffvorschlag|Samstag, bei dir im Garten]].

Ich möchte dir noch sagen, wie viel mir dein Vertrauen bedeutet: [[Dank|Dass du mir von deinen Sorgen erzählst, zeigt, wie nah wir uns sind]]. Ich helfe dir gern, so gut ich kann. Und wenn du jemanden zum Reden brauchst, [[Angebot|bin ich jederzeit für dich da]].

Zu deiner Wohnung möchte ich dir noch gratulieren: [[Glückwunsch|Eine große, helle Wohnung mit Garten zu finden, ist heute selten]]. Ich freue mich so für dich, und ich hoffe, dass du dort glücklich wirst. Wenn du mir Fotos schickst, [[Bitte|sehe ich schon vorab, wie es aussieht]].

Bei mir gibt es eine schöne Nachricht: [[Neuigkeit|Ich werde im Herbst Tante]], meine Schwester erwartet ein Baby. Ich freue mich riesig darauf. Wenn wir uns treffen, zeige ich dir das erste Ultraschallbild, und wir stoßen auf das Kleine an.

Ich wünsche dir, dass du bald neue Freunde findest. Danke für alles, schreib mir bald, [[Frage an die Freundin|ob es klappt]].

[[Grußformel|Dankbare Grüße]]
[[Dein Name|Nina]]` },
];

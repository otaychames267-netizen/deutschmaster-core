// v2 (B2-style): Jakob hat Ärger mit einem lauten Nachbarn, fragt nach Tipps und will sich treffen. Points: ein Problem mit dem Nachbarn – ein Tipp · etwas über Ihre Wohnung ·
// ein Vorschlag für ein Treffen · wie Ihre Nachbarn sind — plus: "Hattest du auch schon mal solche Schwierigkeiten?", "Worauf hast du Lust?".
export const kw = [/Nachbar/, /Tipp|Rat|vorschlagen|sprich|Gespräch|Vermieter|Hausverwaltung|Zettel|Ohrstöpsel|Lärm|laut|Ruhezeit/i, /Wohnung|Zimmer|wohne|Haus/i, /treff|unternehmen|Kino|Café|Wochenende|Zeit/i, /schlage|Lust|Vorschlag|Idee|Treffen|treffen/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Jakob]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Mach dir keine Gedanken, dass du länger nicht geschrieben hast. [[Reaktion auf die Pause|Nach dem Urlaub liegt immer viel Arbeit auf dem Tisch]]. Es tut mir leid, dass dich dein Nachbar so stört.

Mein Tipp zum Lärm: [[Tipp 1|Sprich ihn freundlich an und erkläre, dass die Musik dich stört]]. Wenn das nicht hilft, [[Tipp 2|schreib einen kurzen Zettel oder sprich mit dem Vermieter]]. Ich hatte vor Jahren ein ähnliches Problem und habe [[Eigene Erfahrung|mit einem netten Gespräch alles gelöst]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|ruhig und freundlich, wir grüßen uns jeden Tag]]. Mit der Nachbarin im ersten Stock [[Verhältnis zu einer Nachbarin|trinke ich manchmal Kaffee]].

Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer und einen kleinen Balkon]]. Ich mag [[Lieblingsplatz|das Sofa am Fenster, wo ich lese]].

Für ein Treffen schlage ich vor, dass wir [[Treffpunkt|am Samstag ins Kino gehen]]. Danach [[Programm nach dem Kino|essen wir etwas in meinem Lieblingsrestaurant]].

Beim Lärm kommt es auch auf die Uhrzeit an: In Deutschland gelten [[Ruhezeiten|ab 22 Uhr und mittags zwischen 13 und 15 Uhr]] meist Ruhezeiten, auf die du dich berufen kannst. Du kannst auch [[Protokoll|ein kleines Lärmprotokoll mit Datum und Uhrzeit führen]], falls es später Streit gibt.

Ich lade dich gern zu mir ein, damit du meine Wohnung selbst siehst: [[Einladung|Komm zum Abendessen, ich koche etwas Einfaches]]. Du kannst auch [[Übernachtung|bei mir schlafen]], wenn es spät wird. Und vielleicht [[Zusatzidee|spielen wir ein paar Runden Karten]], das entspannt dich nach dem Ärger.

Ich hoffe wirklich, dass sich das Problem bald löst: [[Wunsch|Du verdienst Ruhe und einen guten Schlaf]]. Wenn du mir berichtest, wie das Gespräch gelaufen ist, [[Bitte|freue ich mich über eine kurze Nachricht]]. Ich drücke dir die Daumen.

Schreib mir bitte, [[Frage an den Freund|ob dir der Samstag passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Jakob]],

schön, dass du dich meldest! Kein Stress wegen der Pause, [[Reaktion auf die Pause|nach dem Urlaub ist immer Chaos]]. Dein lauter Nachbar nervt, das kenne ich.

Mein Tipp: [[Tipp 1|Klingel einfach bei ihm und sag locker, dass du abends Ruhe brauchst]]. Und wenn das nichts bringt, [[Tipp 2|rede mit der Hausverwaltung oder kauf dir gute Ohrstöpsel]]. Ich hatte auch mal [[Eigene Erfahrung|einen Nachbarn, der um Mitternacht Gitarre gespielt hat]].

Meine Nachbarn? [[Beschreibung der Nachbarn|Eigentlich total entspannt, nur der Hund unten bellt manchmal]].

Meine Wohnung: [[Größe der Wohnung|ein Zimmer mit Küche, nicht groß, aber gemütlich]]. Die Lage ist [[Lage der Wohnung|super, direkt am Park]].

Treffen? Klar! [[Treffpunkt|Wie wäre es mit einem Abend im Biergarten]]? Ich hätte Lust auf [[Programmidee|ein bisschen Quatschen und ein kaltes Getränk]].

Wenn du Musik magst, könntest du vielleicht ein Angebot machen: [[Kompromiss|Er darf bis zehn Uhr abends laut hören, danach nur noch leise]]. Das ist ein fairer Vorschlag, und viele Nachbarn sind dafür offen. Wichtig ist, [[Ton|ruhig und höflich zu bleiben, auch wenn du genervt bist]].

Wenn du magst, zeige ich dir meine Wohnung bei einem Videoanruf: [[Idee|Ich gehe mit dem Handy durch alle Zimmer und zeige dir die schönsten Ecken]]. Dann siehst du, wie ich wohne, und wir können gleich [[Plan|ein Treffen für das Wochenende planen]]. Ich freue mich darauf.

Du kannst dich gern jederzeit bei mir melden: [[Angebot|Ich habe fast jeden Abend ab acht Uhr Zeit]]. Zwischen Arbeit und Freizeit gibt es immer Gelegenheit zu reden. Und wenn du lieber schreibst, [[Alternative|antworte ich gern per E-Mail]].

Meld dich, [[Frage an den Freund|wann es bei dir klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Jakob]],

wow, schön, von dir zu hören! Mach dir keine Sorgen wegen der Pause. [[Reaktion auf die Pause|Hauptsache, du hast einen schönen Urlaub gehabt]]. Dass dein Nachbar so laut Musik hört, tut mir leid.

Ich habe einen Tipp: [[Tipp 1|Gehe zu ihm, stell dich freundlich vor und bitte ihn, abends leiser zu sein]]. Das funktioniert oft besser, als man denkt. [[Tipp 2|Wenn nicht, zeig ihm die Hausordnung mit den Ruhezeiten]]. Ich hatte auch einmal [[Eigene Erfahrung|einen sehr lauten Nachbarn und habe ihn zum Kaffee eingeladen]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|wunderbar, wir feiern manchmal zusammen im Hof]].

Meine Wohnung ist [[Größe der Wohnung|hell und hat zwei Zimmer]], und [[Besonderheit der Wohnung|ich habe einen kleinen Garten]].

Ein Treffen? Super! [[Treffpunkt|Wir könnten am Wochenende wandern gehen]], und danach [[Programm danach|grillen wir bei mir im Garten]]. Ich habe richtig Lust darauf!

Ein Vorschlag aus meiner Erfahrung: Lade ihn [[Einladung|zu einem Kaffee oder zu einem kleinen Grillabend ein]], dann lernt ihr euch kennen. Wer sich kennt, [[Wirkung|nimmt viel mehr Rücksicht aufeinander]]. Bei mir hat das schon einmal geklappt, und es war überraschend einfach.

Meine Wohnung liegt [[Lage|im dritten Stock, mit Blick auf einen kleinen Park]]. Es ist ruhig, weil [[Grund|die Straße nicht stark befahren ist]]. Im Sommer sitze ich auf dem Balkon und lese. Wenn du kommst, [[Angebot|trinken wir dort einen Tee, und du kannst dich ausruhen]].

Übrigens habe ich auch gute Nachrichten: [[Neuigkeit|Ich habe nächsten Monat eine Woche Urlaub und könnte dich besuchen]]. Dann hätten wir viel Zeit zum Reden und Unternehmen. Das ist eine Idee, über die du nachdenken kannst, wenn es dir passt.

Schreib mir bald, [[Frage an den Freund|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Jakob]],

besten Dank für deine Zeilen. Deine Fragen gehe ich jetzt der Reihe nach durch.

Erstens, die Pause: [[Reaktion auf die Pause|Du musst dich nicht entschuldigen, nach dem Urlaub ist viel zu tun]].

Zweitens, dein Problem: Ich empfehle, [[Tipp 1|zuerst freundlich mit deinem Nachbarn zu sprechen]]. Falls das nicht hilft, [[Tipp 2|solltest du den Vermieter oder die Hausverwaltung informieren]]. Ich selbst hatte [[Eigene Erfahrung|einmal Probleme mit nächtlichem Lärm]].

Drittens, meine Nachbarn: [[Beschreibung der Nachbarn|Sie sind ruhig und hilfsbereit]].

Viertens, meine Wohnung: Sie hat [[Größe der Wohnung|zwei Zimmer und einen Balkon]].

Fünftens, ein Treffen: Ich schlage [[Treffpunkt|Samstag, 15 Uhr in einem Café in der Innenstadt]] vor.

Sollte der Lärm bis nachts anhalten, rate ich dir, [[Schritt|Datum, Uhrzeit und Dauer aufzuschreiben]] und dem Vermieter eine kurze E-Mail zu senden. Bleib dabei [[Ton|sachlich und höflich]], dann wird die Beschwerde ernst genommen. Mit einem Anwalt musst du erst bei großen Problemen rechnen.

Zur Wohnung noch ein Detail: Sie ist [[Zustand|frisch gestrichen und mit wenigen Möbeln eingerichtet]]. Ich mag es einfach und hell. Das wirkt auf mich beruhigend, und das empfehle ich auch dir, [[Rat|falls du dein Zuhause gemütlicher machen möchtest]].

Zum Thema Treffen: Ich finde es gut, wenn wir [[Vorschlag|uns regelmäßig sehen, zum Beispiel einmal im Monat]]. Das gibt uns beiden Halt. Wir könnten abwechselnd [[Plan|bei dir und bei mir treffen]], dann lernt jeder die Umgebung des anderen kennen.

Bitte teile mir mit, [[Frage an den Freund|ob dir der Termin passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Jakob]],

danke dir für deine ausführliche Nachricht. [[Reaktion auf die Pause|Es ist ganz in Ordnung, dass du länger nicht geschrieben hast]]. Zu deinem Problem helfe ich dir gern.

Praktische Tipps gegen den Lärm: [[Tipp 1|Sprich den Nachbarn freundlich an und bitte ihn, nach 22 Uhr leiser zu sein]]. Außerdem [[Tipp 2|hilft ein Zettel im Hausflur und notfalls ein Gespräch mit dem Vermieter]]. Wenn du willst, [[Praktische Hilfe|formuliere ich mit dir einen höflichen Brief]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|nett, wir helfen uns gegenseitig]].

Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer]], und [[Besonderheit der Wohnung|ich habe einiges selbst gebaut]].

Zum Treffen: Ich schlage [[Treffpunkt|ein gemeinsames Mittagessen am Sonntag]] vor.

Ich kann dir auch einen kleinen Brief vorschlagen: [[Textidee|Lieber Nachbar, könntest du bitte nach 22 Uhr etwas leiser sein?]] Das klingt freundlich und klar. Du kannst ihn unter seine Tür legen, wenn du ihn nicht persönlich treffen magst.

Ich habe vor einiger Zeit [[Veränderung|ein neues Regal gebaut und ein paar Pflanzen aufgestellt]], seitdem fühle ich mich noch wohler. Wenn du Ideen für deine Wohnung brauchst, [[Hilfsangebot|helfe ich dir gern beim Einrichten]]. Das wäre eine schöne Beschäftigung, wenn wir uns treffen.

Wenn du noch weitere Fragen zu meiner Wohnung oder zu meinem Wohnort hast, [[Angebot|schicke ich dir gern ein paar Fotos]]. Ich mache gern Bilder von den schönsten Ecken, und vielleicht [[Idee|bekommst du eine Idee für deine eigene Wohnung]]. Das wäre ein schöner Nebeneffekt.

Sag mir bitte, [[Frage an den Freund|ob ich noch helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Jakob]],

du brauchst dich nicht zu entschuldigen, denn [[Begründung für die Nachsicht|nach einem Urlaub hat jeder viel zu tun]]. Dein lauter Nachbar ist ein echtes Problem, deshalb helfe ich dir gern.

Mein Tipp: Sprich zuerst mit ihm, denn [[Grund für das Gespräch|oft weiß er gar nicht, dass er stört]]. [[Tipp 1|Bitte ihn freundlich, abends leiser zu sein]]. Wenn das nicht hilft, [[Tipp 2|wende dich an die Hausverwaltung]], weil [[Grund für die Hausverwaltung|sie für Ruhezeiten zuständig ist]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|angenehm und rücksichtsvoll]], weil [[Grund|im Haus klare Regeln gelten]].

Meine Wohnung ist [[Größe der Wohnung|klein, aber praktisch]].

Ich schlage ein Treffen [[Treffpunkt|am Samstag im Café]] vor, weil [[Grund für das Treffen|wir uns lange nicht gesehen haben]].

Außerdem würde ich überlegen, [[Überlegung|ob du selbst etwas gegen den Lärm tun kannst, zum Beispiel mit Ohrstöpseln]]. Das ist keine Lösung, aber es hilft zwischendurch. Das Wichtigste ist, dass du dich in deiner Wohnung wohlfühlst und gut schläfst.

Mit meinen Nachbarn habe ich eine besondere Regel: [[Hausregel|Wir grüßen uns immer und helfen einander, zum Beispiel beim Tragen von Einkäufen]]. Das schafft Vertrauen, und Probleme lassen sich so leichter lösen. Vielleicht gibt es bei dir auch [[Idee|jemanden im Haus, mit dem du dich gut verstehst]].

Ich muss noch erwähnen, dass ich im Moment [[Beschäftigung|viel Sport mache und abends müde bin]], deshalb melde ich mich vielleicht etwas später. Aber ich antworte immer, versprochen. Du kannst dich auf mich verlassen, auch wenn es mal ein paar Tage dauert.

Schreib mir, [[Frage an den Freund|ob dir der Samstag passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Jakob]],

ich danke dir für deine Zeilen und antworte dir kurz.

Pause: [[Reaktion auf die Pause|Kein Problem]].

Tipp: [[Tipp 1|Freundlich mit dem Nachbarn sprechen]]. [[Tipp 2|Sonst Hausverwaltung informieren]].

Meine Nachbarn: [[Beschreibung der Nachbarn|Ruhig und nett]].

Meine Wohnung: [[Größe der Wohnung|Zwei Zimmer, Balkon]].

Treffen: [[Treffpunkt|Samstag im Café]].

Falls du Lust auf ein Gespräch mit jemandem hast, der dasselbe erlebt hat: [[Angebot|Ruf mich einfach abends an]]. Ich höre gern zu, und manchmal tut es gut, sich auszusprechen. Wir können auch gemeinsam überlegen, [[Plan|was du als Nächstes machst]].

Für unser Treffen schlage ich außerdem vor, [[Programm|dass wir nach dem Kino noch einen Spaziergang am Fluss machen]]. Dann können wir in Ruhe reden und alles besprechen, was dich beschäftigt. Das tut dir bestimmt gut, und mir macht es Freude, dich wiederzusehen.

Was du in deiner Wohnung auch tun kannst, um dich wohler zu fühlen: [[Tipp|Hänge dicke Vorhänge auf und stelle Möbel an die Wand zum Nachbarn]]. Das dämpft den Schall ein bisschen. Es ist keine perfekte Lösung, aber es hilft schon etwas.

Ich freue mich sehr auf unser Wiedersehen und auf [[Vorfreude|einen entspannten gemeinsamen Nachmittag]], denn wir haben uns lange nicht gesehen und bestimmt viel zu erzählen. Gib mir bitte kurz Bescheid, [[Frage an den Freund|ob das passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Jakob]],

nach dem Urlaub ist man ja erst mal erschöpft, [[Reaktion auf die Pause|deshalb verzeihe ich dir die Funkstille]]. Dass dein Nachbar laut Musik hört, finde ich nicht lustig, aber ich helfe dir.

Mein Tipp: [[Tipp 1|Lade ihn zum Kaffee ein und lass die Musik leiser drehen]]. Oder [[Tipp 2|spiel zurück und höre abends deine Lieblingsoper in voller Lautstärke]]. Ich hatte mal [[Eigene Erfahrung|einen Nachbarn mit Schlagzeug, und ich habe geweint]].

Meine Nachbarn: [[Beschreibung der Nachbarn|Der Mann unten spricht nur mit seiner Katze]].

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer und ein sprechender Kühlschrank]].

Treffen? [[Treffpunkt|Gern bei einem Pizza-Abend mit viel Käse]]. Ich habe Lust auf alles, [[Programmidee|was keine Nachbarn stört]].

Du hast gefragt, ob ich auch schon solche Schwierigkeiten hatte: Ja, [[Eigene Erfahrung|vor drei Jahren, als über mir jemand eingezogen ist, der abends getanzt hat]]. Damals habe ich [[Lösung|nach zwei Wochen mit ihm gesprochen]], und es wurde besser. Seitdem sage ich lieber früh etwas.

Falls du am Wochenende keine Zeit hast, passt mir auch [[Alternative|ein Abend unter der Woche]]. Ich bin da flexibel und freue mich, wenn wir uns bald sehen. Du kannst auch [[Vorschlag|zu mir kommen, ich koche gern für dich]], dann musst du nicht lange planen.

Ich überlege außerdem, [[Plan|im Sommer einen kleinen Ausflug mit Freunden zu organisieren]]. Wenn du Lust hast, bist du natürlich herzlich eingeladen. Dann hast du Abstand vom Alltag, und wir können gemeinsam lachen und entspannen.

Schreib bald, [[Frage an den Freund|wann du kommst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Jakob]],

als ich deine Mail gelesen habe, musste ich an meine erste Wohnung denken. [[Erinnerung an die erste Wohnung|Ich hatte damals einen Nachbarn, der morgens um sechs Staub gesaugt hat]]. Dass du länger nicht geschrieben hast, ist nicht schlimm.

Mein Tipp zu deinem Nachbarn: [[Tipp 1|Rede ruhig mit ihm, ohne Vorwurf]]. Bei mir hat damals [[Eigene Erfahrung|ein freundliches Gespräch im Treppenhaus geholfen]].

Meine Nachbarn heute sind [[Beschreibung der Nachbarn|sehr nett, wir haben ein Haustreffen im Sommer]].

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer in einem alten Haus]].

Ein Treffen schlage ich [[Treffpunkt|am Wochenende in meinem Lieblingscafé]] vor.

Ich würde dir raten, nicht zu lange zu warten, denn [[Grund|der Ärger wird sonst größer]]. Ein kurzes, freundliches Gespräch ist meist das Beste. Falls du dich nicht traust, [[Hilfsangebot|komme ich gern vorbei und wir klingeln zusammen]]. Dann bist du nicht allein.

Worauf ich Lust habe? [[Lust|Auf alles, wo man sich unterhalten kann, ein Café, ein Spaziergang, ein Kinofilm]]. Hauptsache, wir haben Zeit für uns. Und ich bringe [[Mitbringsel|eine kleine Überraschung]] mit, damit der Tag etwas Besonderes wird.

Weil du nach meinen Nachbarn gefragt hast: Mit einer Nachbarin habe ich [[Verhältnis|oft kleine Gespräche am Gartenzaun]], und mit einem anderen Nachbarn [[Weiteres Verhältnis|tausche ich manchmal Bücher]]. So fühlt man sich im Haus zu Hause und nicht allein.

Erzähl mir, [[Frage an den Freund|wie du den Lärm aushältst]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Jakob]],

deine E-Mail hat mir den Tag verschönert! [[Reaktion auf die Pause|Die Pause ist kein Problem]]. Ich habe gleich mehrere Vorschläge für dein Nachbar-Problem.

Mein erster Vorschlag: [[Tipp 1|Sprich freundlich mit ihm]]. Mein zweiter Vorschlag: [[Tipp 2|Schreib einen kurzen Zettel mit den Ruhezeiten]]. Mein dritter Vorschlag: [[Tipp 3|Wende dich an die Hausverwaltung, falls es nicht besser wird]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|angenehm]]. Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer]].

Mein vierter Vorschlag: Wir treffen uns [[Treffpunkt|am Wochenende zum Wandern]], damit du abschalten kannst.

Für den Fall, dass er schwerhörig ist oder es nicht merkt, [[Tipp|bring ihm freundlich ein kleines Geschenk, zum Beispiel Kopfhörer]]. Das klingt lustig, aber es zeigt, dass du es nett meinst. Ich glaube, das hilft mehr als jeder ernste Brief und löst die Situation entspannt.

Ich habe noch eine Idee für das Wochenende: [[Idee|ein Ausflug mit dem Fahrrad zu einem See]]. Wir können [[Programm|dort baden und grillen]], das lenkt dich vom Ärger ab. Und wir lernen auf dem Weg die Gegend kennen, wenn du magst.

Ich bin sicher, dass du das Problem bald im Griff hast. Du bist [[Eigenschaft|ein geduldiger und freundlicher Mensch]], das hilft. Und falls du noch Unterstützung brauchst, [[Hilfsangebot|sprechen wir am Telefon darüber]]. Du bist nicht allein, das möchte ich dir sagen.

Was hältst du davon? Schreib mir, [[Frage an den Freund|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Jakob]],

vielen Dank für deine Rückmeldung. [[Reaktion auf die Pause|Du brauchst dich nicht zu entschuldigen]]. Zu deinem Problem möchte ich vorsichtig antworten.

Einerseits [[Vorteil des Gesprächs|kann ein freundliches Gespräch helfen]], andererseits [[Nachteil des Gesprächs|kann es zu Streit führen]]. Ich würde zuerst [[Tipp 1|einen höflichen Zettel schreiben]] und danach [[Tipp 2|die Hausverwaltung fragen]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|meist ruhig, aber nicht immer]].

Meine Wohnung ist [[Größe der Wohnung|nicht groß]].

Ein Treffen finde ich schön. [[Treffpunkt|Vielleicht am Samstag, wenn es bei dir passt]].

Ich verstehe gut, dass dich das stört, [[Mitgefühl|besonders, wenn man nach der Arbeit Ruhe braucht]]. Wichtig ist, dass du nicht wütend wirst. Ein ruhiger Ton bringt dich weiter, [[Rat|auch wenn es dir schwerfällt]]. Du hast das Recht auf Ruhe und kannst darauf bestehen.

Zu deiner Frage nach meiner Wohnung: Sie ist [[Beschreibung|klein, aber ich habe alles, was ich brauche]]. Besonders wichtig sind mir [[Wichtiges|ein bequemes Bett und ein Schreibtisch am Fenster]]. Mehr brauche ich nicht, und ich bin froh damit.

Ich bin gespannt, wie dein Gespräch mit dem Nachbarn verläuft: [[Neugier|Wirst du ihn heute noch ansprechen oder wartest du bis zum Wochenende]]? Egal, wie du dich entscheidest, ich unterstütze dich. Und wenn es nicht klappt, überlegen wir zusammen weiter, ohne Druck.

Schreib mir bitte, [[Frage an den Freund|ob dir das hilft]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Jakob]],

danke für deine Zeilen, ich antworte dir in der richtigen Reihenfolge. Als Erstes: [[Reaktion auf die Pause|Entschuldige dich nicht]].

Als Nächstes zu deinem Problem: [[Tipp 1|Sprich zuerst freundlich mit dem Nachbarn]]. Dann [[Tipp 2|schreib einen Zettel]]. Zuletzt [[Tipp 3|informiere die Hausverwaltung]].

Dann zu meinen Nachbarn: [[Beschreibung der Nachbarn|Sie sind nett]].

Danach zu meiner Wohnung: [[Größe der Wohnung|zwei Zimmer]].

Zuletzt zum Treffen: [[Treffpunkt|Samstag im Café]].

Wenn dein Nachbar sich nicht ändert, kannst du auch [[Alternative|deine Wohnung mit einer Schallschutzdecke etwas ruhiger machen]]. Das ist zwar nur eine Notlösung, aber es hilft. Vielleicht fragst du auch im Haus, [[Frage|ob andere Nachbarn dasselbe Problem haben]], dann habt ihr mehr Gewicht.

Die Nachbarn bei mir sind insgesamt [[Eindruck|rücksichtsvoll und freundlich]], und deshalb ist es so ruhig. Natürlich gibt es auch mal [[Kleines Problem|ein Baby, das nachts schreit]], aber das gehört dazu. Man gewöhnt sich daran, wenn man verständnisvoll bleibt.

Wie du siehst, habe ich viele Gedanken zu deinem Problem. Das zeigt, dass es mir nicht egal ist, wie es dir geht. [[Gefühl|Ich mache mir ein bisschen Sorgen, weil du so gestresst klingst]]. Gib bitte Bescheid, wenn du Hilfe brauchst oder einfach reden möchtest.

Wie geht es weiter? Schreib mir, [[Frage an den Freund|ob das klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Jakob]],

deine Mail hat mich gefreut, und mach dir keine Gedanken wegen der Pause. [[Reaktion auf die Pause|Nach dem Urlaub braucht man Zeit]]. Es tut mir leid, dass dich der Lärm stört, das ist wirklich belastend.

Ich wünsche dir, dass du [[Tipp 1|in Ruhe mit deinem Nachbarn sprechen kannst]]. Ich glaube, das hilft. Falls nicht, [[Tipp 2|bist du nicht allein, die Hausverwaltung hilft dir]].

Meine Nachbarn sind [[Beschreibung der Nachbarn|freundlich und rücksichtsvoll]].

Meine Wohnung ist [[Größe der Wohnung|klein und gemütlich]].

Ich würde mich freuen, wenn wir uns [[Treffpunkt|bald auf einen Kaffee treffen]].

Du solltest dir auch etwas Gutes tun: [[Tipp|Geh abends spazieren oder höre selbst Musik mit Kopfhörern]]. Das beruhigt und gibt dir Abstand von dem Lärm. Ich weiß, dass das keine Lösung ist, aber es erleichtert dir den Alltag, bis sich alles geklärt hat.

Für ein Treffen empfehle ich auch [[Alternative|ein Picknick im Park]], falls das Wetter gut ist. Ich bringe [[Mitbringsel|Brot, Käse und Obst]] mit. So können wir lange draußen sitzen und reden, und du kommst auf andere Gedanken. Das wird dir bestimmt guttun.

Ich wünsche dir viel Erfolg und gute Nerven: [[Wunsch|Hoffentlich versteht dein Nachbar dich schnell]]. Und wenn alles geregelt ist, [[Plan|feiern wir das mit einem schönen Essen]]. Das haben wir uns dann verdient, und ich freue mich schon darauf.

Erzähl mir, [[Frage an den Freund|wie es dir gerade geht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Jakob]],

kein Stress wegen der Pause. [[Reaktion auf die Pause|Nach dem Urlaub ist immer viel los]].

Laute Musik, nervig! Mein Tipp: [[Tipp 1|Sprich ihn an, locker und freundlich]]. Wenn nicht, [[Tipp 2|Hausverwaltung]].

Meine Nachbarn: [[Beschreibung der Nachbarn|entspannt]].

Meine Wohnung: [[Größe der Wohnung|klein, aber fein]].

Treffen: [[Treffpunkt|Samstag, Café]].

Falls es hilft, schreibe ich dir gern ein paar Sätze auf, [[Hilfsangebot|die du deinem Nachbarn sagen kannst]]. Du musst sie nur ablesen, wenn du unsicher bist. Es ist wichtig, dass du freundlich bleibst und klar sagst, was dich stört. So hast du die besten Chancen.

Ich freue mich besonders auf unser Treffen, weil [[Grund|wir uns schon so lange nicht gesehen haben]]. Du kannst mir alles in Ruhe erzählen, [[Wunsch|auch das, was dich sonst bedrückt]]. Ich höre dir gern zu und hoffe, dass dir das hilft. Dafür sind Freunde da.

Zum Abschluss möchte ich dir sagen: Du kannst dich immer auf mich verlassen. [[Zusage|Wenn du Hilfe beim Umziehen, Streiten oder Zuhören brauchst, bin ich da]]. Das ist für mich selbstverständlich, denn Freundschaft heißt, auch in schwierigen Zeiten füreinander da zu sein.

Ich freue mich echt auf [[Vorfreude|ein Wiedersehen mit dir]] und hoffe, dass wir bald [[Wunsch|einen schönen Abend zusammen verbringen]]. Meld dich, [[Frage an den Freund|wann es klappt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

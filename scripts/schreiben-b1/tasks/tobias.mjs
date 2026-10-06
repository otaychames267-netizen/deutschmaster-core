// v2 (B2-style): Tobias (Wien) lädt zur Einzugsparty am Samstag, 5. September, ein. Points: dass Sie gern kommen · ob Sie jemanden mitbringen können ·
// was Sie mitbringen (Musik? Sonst etwas?) · wie Sie sich auf einen Besuch in Wien vorbereiten — plus: Glückwunsch (Studium, Wohnung), länger bleiben/Schlafen/Sonntag, Bodensee.
export const kw = [/Wohnung|Studium|gratul|Glückwunsch/i, /komm/, /mitbring|Begleit|mitkomm|Freund|Freundin|Bruder|Schwester|allein/i, /Musik|Lieder|CD|Playlist/i, /Wien/, /Samstag|September|5\./, /Sonntag|länger|bleiben|übernacht|schlafen|Platz/i, /Bodensee|Urlaub|erinner/i, /vorbereit|bereite|Reiseführer|informier|Stadtplan|Sehenswürdig|recherch|lesen|anschau|Internet/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Tobias]],

herzlichen Glückwunsch zum Studienabschluss und zur neuen Wohnung! [[Reaktion auf die Neuigkeiten|Ich freue mich sehr für dich, du hast so lange darauf hingearbeitet]]. Ich bin sicher, dass du bald eine passende Arbeit findest.

Natürlich komme ich gern zu deiner Party am Samstag, dem 5. September. [[Grund für die Zusage|Ich habe dich schon so lange nicht mehr gesehen]], und ein Wiedersehen in Wien ist eine tolle Gelegenheit. Ich habe mir [[Zeitraum für den Besuch|das ganze Wochenende]] freigehalten.

Du fragst nach Musik aus meinem Land: Ich bringe [[Musik aus meinem Land|ein paar CDs mit traditionellen Liedern und moderner Popmusik]] mit. Außerdem habe ich [[Mitbringsel|eine Packung Gebäck aus meiner Heimatstadt]] für euch.

Darf ich noch jemanden mitbringen? [[Begleitung|Meine Schwester ist gerade bei mir zu Besuch]], und sie würde sich sehr über die Einladung freuen. Sie ist [[Eigenschaft der Begleitung|sehr nett und tanzt für ihr Leben gern]].

Auf den Besuch bereite ich mich gut vor: [[Vorbereitung auf Wien|Ich lese einen Reiseführer und suche im Internet nach Sehenswürdigkeiten]]. So kann ich am Sonntag [[Wunsch für den Sonntag|das Schloss Schönbrunn und den Prater]] besuchen.

Dein Angebot zu übernachten nehme ich gern an, denn [[Grund für die Übernachtung|dann können wir bis spät in die Nacht reden]]. Bis dahin denke ich oft an unseren Urlaub am Bodensee zurück.

Zur Anreise: Ich komme [[Anreise|mit dem Nachtzug und bin um acht Uhr am Westbahnhof]]. Deine Adresse in der Linzer Straße finde ich bestimmt, aber [[Frage zur Anreise|schreibst du mir noch die Straßenbahnlinie]]? Danach gehe ich [[Plan nach der Ankunft|zuerst frühstücken und dann zu dir]].

Schreib mir bitte, [[Frage an den Freund|wie ich am besten zu deiner Wohnung komme]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name des Freundes|Tobias]],

na klar erinnere ich mich an den Bodensee, das war [[Erinnerung an den Bodensee|der schönste Urlaub seit Jahren]]! Schön, dass du dich meldest. Mir geht es [[Wie es mir geht|richtig gut, nur etwas gestresst bei der Arbeit]].

Glückwunsch zum Studium und zur größeren Wohnung! [[Reaktion auf die Neuigkeiten|Das muss natürlich gefeiert werden, und ich bin dabei]]. Ich komme am Samstag, dem 5. September, und bleibe [[Aufenthaltsdauer|bis Montagfrüh]].

Musik aus meinem Land? Aber sicher, ich bringe [[Musik aus meinem Land|meine Lieblingsplaylist mit Salsa und Hip-Hop]] mit. Dann wird auf jeden Fall getanzt! Sonst brauche ich laut dir nichts mitzubringen, aber [[Mitbringsel|eine kleine Pflanze für die neue Wohnung]] geht immer.

Kann ich einen Freund mitbringen? [[Begleitung|Mein Kumpel Ali wohnt in Graz und würde gern kommen]]. Er ist [[Eigenschaft der Begleitung|echt lustig und kann super tanzen]].

Zur Vorbereitung: Ich [[Vorbereitung auf Wien|schaue mir Videos über Wien an und lade mir einen Stadtplan]]. Dann finde ich alles.

Das Angebot mit dem Schlafplatz bei dir nehme ich gern an. Und am Sonntag [[Wunsch für den Sonntag|zeigst du mir die Altstadt und das beste Eis]], oder?

Und noch was: Ich komme [[Anreise|mit dem Bus, das ist günstiger]], und am Samstag [[Plan am Samstag|helfe ich dir beim Aufräumen, bevor die Gäste kommen]]. Danach [[Plan nach der Party|bleibe ich noch eine Weile bei dir sitzen]], wenn es dir recht ist. Das wird ein schönes Wochenende.

Schreib bald, [[Frage an den Freund|ob ich vorher noch etwas besorgen soll]].

[[Grußformel|Bis dann]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Tobias]],

wow, was für tolle Neuigkeiten! [[Reaktion auf die Neuigkeiten|Studium fertig, größere Wohnung, das ist wirklich ein Grund zum Feiern]]. Ich habe beim Lesen deiner Mail laut gejubelt und gratuliere dir von ganzem Herzen.

Natürlich komme ich zu deiner Party am Samstag, dem 5. September! [[Grund für die Zusage|Ich vermisse unsere gemeinsamen Abende]], und eine Reise nach Wien wollte ich schon lange machen. Ich freue mich [[Freude auf das Wiedersehen|riesig darauf, dich und deine neue Wohnung zu sehen]].

Musik aus meinem Land bringe ich selbstverständlich mit: [[Musik aus meinem Land|schnelle Lieder zum Tanzen und ein paar romantische Balladen]]. Dazu [[Mitbringsel|ein Gastgeschenk aus meiner Heimat]], als Dankeschön für die Einladung.

Darf ich jemanden mitbringen? [[Begleitung|Mein Bruder hätte große Lust, mit nach Wien zu kommen]]. Er [[Eigenschaft der Begleitung|spielt Gitarre und bringt gute Laune mit]].

Auf Wien bereite ich mich mit großer Vorfreude vor: [[Vorbereitung auf Wien|Ich lese Blogs und kaufe mir einen Reiseführer mit Tipps]]. Auf meiner Liste steht [[Wunsch für den Sonntag|ein Spaziergang durch den Stadtpark am Sonntag]].

Schlafen bei dir ist perfekt, [[Grund für die Übernachtung|dann sparen wir uns die Heimfahrt]]. Ich bleibe sehr gern länger.

Ach ja, an den Bodensee denke ich auch sofort: [[Erinnerung an den Bodensee|Die Fahrt mit dem Fahrrad um den See war traumhaft]]. Zur Anreise: [[Anreise|Ich nehme den Zug und komme am Freitagabend an]], und am Sonntag [[Plan für die Rückfahrt|fahre ich mit schönen Erinnerungen im Gepäck zurück]].

Sag mir bitte, [[Frage an den Freund|ob du Pläne für Sonntag hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Tobias]],

vielen Dank für deine Einladung und für die Neuigkeiten. [[Reaktion auf die Neuigkeiten|Zum Studienabschluss und zur größeren Wohnung gratuliere ich dir herzlich]]. Zu deinen Fragen nehme ich der Reihe nach Stellung.

Erstens, die Zusage: Ich komme gern zur Party am Samstag, dem 5. September. [[Zeitraum für den Besuch|Ich reise am Freitagabend an und fahre am Montag zurück]].

Zweitens, die Begleitung: Ich möchte [[Begleitung|meine Freundin Laila]] gern mitbringen, wenn das für dich in Ordnung ist. Sie [[Eigenschaft der Begleitung|ist sehr zuverlässig und kommt gut mit neuen Menschen aus]].

Drittens, die Mitbringsel: Ich nehme [[Musik aus meinem Land|zwei Musik-CDs aus meiner Heimat]] mit, damit wir tanzen können. Zusätzlich bringe ich [[Mitbringsel|eine Kleinigkeit für die Wohnung]] mit.

Viertens, die Vorbereitung auf Wien: Ich [[Vorbereitung auf Wien|informiere mich im Internet über Sehenswürdigkeiten und die öffentlichen Verkehrsmittel]]. Am Sonntag würde ich gern [[Wunsch für den Sonntag|das Naschmarkt-Viertel besuchen]].

Fünftens, die Anreise: Ich [[Anreise|fahre mit dem Zug und komme am Freitag um 18 Uhr an]]. Sechstens, die Kleidung: Ich bringe [[Kleidung|ein schickes Hemd und bequeme Schuhe zum Tanzen]] mit. Siebtens, die Erinnerung: Wir haben [[Erinnerung an den Bodensee|am Bodensee viel erlebt und gelacht]], und ich freue mich auf neue Erlebnisse in Wien.

Die Übernachtung bei dir nehme ich dankend an. Bitte teile mir noch mit, [[Frage an den Freund|ab wann ich am Freitag bei dir sein darf]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Tobias]],

schön, von dir zu hören, und Glückwunsch zur größeren Wohnung und zum Studium! [[Reaktion auf die Neuigkeiten|Ich helfe dir gern bei der Suche nach der passenden Stelle]].

Zu deiner Party am Samstag, dem 5. September: Ich komme sehr gern! Wenn du möchtest, [[Hilfsangebot|helfe ich dir schon am Freitag beim Aufbauen und beim Einkaufen]]. Dafür [[Zeitraum für den Besuch|reise ich einen Tag früher an]].

Bei der Musik habe ich eine Idee: Ich bringe [[Musik aus meinem Land|einen USB-Stick mit Liedern aus meiner Heimat]] mit und kann [[Musikaufgabe|den DJ für den Abend spielen]]. Praktisch ist auch, dass ich [[Mitbringsel|ein paar Gläser und Servietten]] mitbringen kann.

Kann ich jemanden mitbringen? [[Begleitung|Mein Mitbewohner Karim kann gut Möbel tragen]] und würde gern helfen. Er ist [[Eigenschaft der Begleitung|handwerklich begabt und sehr hilfsbereit]].

Zur Vorbereitung auf Wien: Ich [[Vorbereitung auf Wien|kaufe mir ein Ticket und lerne die wichtigsten Stationen der U-Bahn kennen]]. Am Sonntag [[Wunsch für den Sonntag|machen wir einen Spaziergang an der Donau]], wenn du Zeit hast.

Außerdem kann ich [[Weitere Hilfe|das Geschirr spülen und die Gäste an der Tür begrüßen]]. Wenn du willst, bringe ich [[Zusätzliches Mitbringsel|zwei Sitzkissen und eine Lichterkette]] mit. Mit der Anreise habe ich [[Anreise|keine Probleme, ich nehme den Frühzug]].

Schlafen bei dir klingt super, und ich denke noch oft an unseren Bodensee-Urlaub.

Sag mir bitte, [[Frage an den Freund|ob ich dir noch etwas mitbringen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Tobias]],

deine Neuigkeiten freuen mich, und zwar aus gutem Grund: [[Begründung für die Freude|Du hast das Studium geschafft und eine größere Wohnung gefunden]]. Dafür gratuliere ich dir herzlich.

Ich komme gern zur Party am Samstag, dem 5. September, denn [[Grund für die Zusage|ich möchte dich wiedersehen und deine neue Wohnung kennenlernen]]. Außerdem [[Zusätzlicher Grund|habe ich schon lange nicht mehr gefeiert]].

Weil du dir Musik aus meinem Land wünschst, bringe ich [[Musik aus meinem Land|ein paar Lieder aus meiner Heimat auf einem USB-Stick]] mit. Das passt, da [[Grund für die Musikwahl|man zu diesen Rhythmen sehr gut tanzen kann]]. Zusätzlich nehme ich [[Mitbringsel|ein kleines Geschenk]] mit.

Ich möchte gern jemanden mitbringen, weil [[Grund für die Begleitung|ich dir meine neue Freundin vorstellen möchte]]. Sie [[Eigenschaft der Begleitung|ist freundlich und neugierig auf Wien]].

Damit ich Wien gut kennenlerne, [[Vorbereitung auf Wien|lese ich einen Stadtführer und informiere mich über die Sehenswürdigkeiten]]. Am Sonntag [[Wunsch für den Sonntag|würde ich gern das Museumsquartier besuchen]].

Zur Anreise: Ich [[Anreise|fahre mit dem Zug, weil das am bequemsten ist]]. Ich erinnere mich übrigens noch gut an den Bodensee, [[Erinnerung an den Bodensee|da haben wir viel über unsere Zukunft gesprochen]]. Dieses Gespräch möchte ich in Wien fortsetzen.

Ich übernachte gern bei dir, weil [[Grund für die Übernachtung|das praktisch ist und wir mehr Zeit haben]]. Erinnerst du dich an den Bodensee? Das war eine tolle Zeit.

Gib mir bitte Bescheid, [[Frage an den Freund|ob du meine Vorschläge gut findest]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Tobias]],

Glückwunsch zu Studium und Wohnung! [[Reaktion auf die Neuigkeiten|Das ist eine tolle Nachricht für dich]]. Danke für die Einladung, hier meine Antworten.

Zusage: Ich komme gern zur Party am Samstag, dem 5. September. [[Zeitraum für den Besuch|Ich bleibe bis Sonntagabend]].

Begleitung: Ich bringe [[Begleitung|meinen Bruder Yusuf]] mit, wenn es für dich passt. Er [[Eigenschaft der Begleitung|ist ruhig und ein guter Tänzer]].

Mitbringsel: Ich nehme [[Musik aus meinem Land|Musik aus meiner Heimat]] mit, außerdem [[Mitbringsel|selbstgebackene Süßigkeiten]]. Mehr brauchst du nicht zu besorgen.

Vorbereitung: Ich [[Vorbereitung auf Wien|suche mir im Internet die wichtigsten Sehenswürdigkeiten heraus]]. Am Sonntag möchte ich gern [[Wunsch für den Sonntag|das Rathaus und den Stephansdom sehen]].

Wien kenne ich noch nicht, deshalb freue ich mich besonders auf die Stadt und auf ein Wochenende mit dir. Ankunft: [[Anreise|Mit dem Zug am Freitagabend]]. Kleidung: [[Kleidung|etwas Bequemes zum Tanzen]].

Schlafen bei dir ist perfekt, danke für das Angebot. Wir haben uns seit dem Bodensee nicht mehr gesehen, das wird ein schönes Wochenende.

Ich freue mich besonders auf die Party, weil [[Grund für die Vorfreude|ich endlich deine neuen Freunde kennenlernen kann]]. Außerdem [[Wunsch an den Abend|möchte ich mit dir bis spät in die Nacht tanzen]].

Gib mir bitte kurz Bescheid, [[Frage an den Freund|wann ich bei dir ankommen kann]]. Dann plane ich meine Reise.

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Tobias]],

na, wer hätte gedacht, dass du das Studium doch noch schaffst? Ich natürlich! [[Reaktion auf die Neuigkeiten|Glückwunsch, und jetzt eine größere Wohnung, da sind ja endlich alle meine Besuche möglich]]. Eine Party? Da sage ich nie nein.

Ich komme also am Samstag, dem 5. September, [[Zeitraum für den Besuch|mit meiner Reisetasche und viel Hunger]]. An den Bodensee erinnere ich mich noch gut, besonders an [[Erinnerung an den Bodensee|deinen Sonnenbrand und den verlorenen Schuh]].

Musik aus meinem Land? Ich bringe [[Musik aus meinem Land|ein paar Lieder mit, bei denen sogar Tischlampen tanzen]]. Sonst nehme ich nur [[Mitbringsel|meine gute Laune]] mit, das reicht.

Darf ich jemanden mitbringen? [[Begleitung|Meinen Nachbarn, er ist ein exzellenter Tänzer]]. Ich verspreche, er [[Eigenschaft der Begleitung|stolpert nur selten über die Möbel]].

Als Vorbereitung auf Wien [[Vorbereitung auf Wien|lese ich einen Stadtführer und lerne drei Wörter Wienerisch]]. Am Sonntag will ich dann [[Wunsch für den Sonntag|Kaffee, Kuchen und Kultur, in genau dieser Reihenfolge]].

Anreise: [[Anreise|per Zug, mit sehr viel Reiselust]]. Und Wien? Wien wird mich lieben, und ich Wien. Außerdem bringe ich [[Zusätzliches Mitbringsel|eine Flasche Saft und Chips für die Party]], damit wir nie Hunger haben.

Schlafen bei dir ist ein Traum, danke! Hast du ein Sofa oder gleich ein Bett?

Schreib bald, [[Frage an den Freund|ob der Kühlschrank für alle Gäste reicht]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Tobias]],

als ich deine Mail gelesen habe, musste ich sofort an den Bodensee denken. [[Erinnerung an den Bodensee|Wir sind jeden Morgen schwimmen gegangen und abends lange am Ufer gesessen]]. Schön, dass du dich meldest!

Dass du mit dem Studium fertig bist und eine größere Wohnung hast, freut mich sehr. [[Reaktion auf die Neuigkeiten|Ich habe mich gleich gefragt, wann wir das gemeinsam feiern können]]. Ich gratuliere dir!

Deine Party am Samstag, dem 5. September, möchte ich nicht verpassen. [[Zeitraum für den Besuch|Ich nehme mir den Freitag frei und komme mit dem Zug]]. Dann haben wir viel Zeit zum Reden.

Die Musik aus meinem Land habe ich schon im Kopf: [[Musik aus meinem Land|die Lieder, die wir damals im Auto gehört haben]]. Ich bringe sie auf einem USB-Stick mit, dazu [[Mitbringsel|eine Kleinigkeit zum Essen]].

Eine Person möchte ich gern mitbringen: [[Begleitung|meine Cousine, die in Salzburg studiert]]. Sie [[Eigenschaft der Begleitung|kennt Wien ein bisschen und kann mir viel zeigen]].

Zur Vorbereitung auf Wien [[Vorbereitung auf Wien|suche ich im Netz nach Cafés und schaue mir einen Stadtplan an]]. Am Sonntag [[Wunsch für den Sonntag|würde ich gern mit dir durch den Prater spazieren]].

Zur Anreise: [[Anreise|Ich komme mit dem Zug und lese unterwegs ein Buch]]. Dazu habe ich mir [[Plan für die Fahrt|Kopfhörer und einen langen Podcast]] eingepackt, damit die Fahrt schnell vergeht. Ich freue mich darauf, bei dir anzukommen.

Bei dir zu schlafen, nehme ich gern an.

Erzähl mir doch, [[Frage an den Freund|wie lange deine Wohnungssuche gedauert hat]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Tobias]],

danke für deine Einladung und herzlichen Glückwunsch zum Studium und zur Wohnung! [[Reaktion auf die Neuigkeiten|Das sind zwei Gründe zum Feiern auf einmal]]. Ich habe gleich mehrere Vorschläge für dich.

Mein erster Vorschlag: Ich komme am Samstag, dem 5. September, schon [[Zeitraum für den Besuch|am Vormittag und helfe dir bei den letzten Vorbereitungen]]. Mein zweiter Vorschlag: Ich bringe [[Musik aus meinem Land|zwei Playlists mit, eine zum Tanzen und eine zum Zuhören]].

Mein dritter Vorschlag: Ich bringe jemanden mit, wenn du erlaubst. [[Begleitung|Meine Freundin Sofia macht tolle Fotos von der Party]]. Sie [[Eigenschaft der Begleitung|ist sehr unterhaltsam und hilft gern]].

Mein vierter Vorschlag: Wir überlegen schon heute, wie ich mich auf Wien vorbereite. Ich würde [[Vorbereitung auf Wien|einen Reiseführer lesen und eine Liste mit Sehenswürdigkeiten machen]].

Mein fünfter Vorschlag: Am Sonntag [[Wunsch für den Sonntag|fahren wir gemeinsam mit der Straßenbahn durch die Stadt]]. Dazu bringe ich [[Mitbringsel|ein kleines Picknick]] mit.

Mein sechster Vorschlag: Wir erinnern uns bei einem Fotoabend an den Bodensee, ich bringe [[Fotos vom Bodensee|ein paar alte Bilder]] mit. Bei der Anreise [[Anreise|komme ich mit dem Zug und rufe dich an]]. Und mein siebter Vorschlag: [[Plan für den Montag|Am Montag frühstücken wir noch gemütlich zusammen]].

Bei dir schlafe ich sehr gern. Das spart Zeit.

Was hältst du von diesen Ideen? Schreib mir, [[Frage an den Freund|ob dir das alles recht ist]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Tobias]],

danke für deine Mail und herzlichen Glückwunsch zum Studium und zur Wohnung! [[Reaktion auf die Neuigkeiten|Ich glaube, dass du dir das alles wirklich verdient hast]]. Zur Party möchte ich einiges klären, damit alles gut klappt.

Ich komme sehr gern am Samstag, dem 5. September. Einerseits [[Vorteil des Besuchs|freue ich mich auf unser Wiedersehen]], andererseits [[Einschränkung|muss ich am Montag früh wieder arbeiten]]. Deshalb [[Lösung für den Zeitplan|fahre ich am Sonntagabend zurück]].

Bei der Musik bin ich unsicher, was dir gefällt. Ich würde [[Musik aus meinem Land|ein paar Lieder aus meiner Heimat auf einem Stick]] mitbringen, aber du sagst mir, wenn du etwas anderes magst. Sonst bringe ich [[Mitbringsel|nur etwas Kleines zum Essen]] mit.

Darf ich jemanden mitbringen? [[Begleitung|Meine Freundin Dina würde sich freuen, aber nur, wenn du genug Platz hast]]. Sie [[Eigenschaft der Begleitung|ist unkompliziert und höflich]].

Auf Wien bereite ich mich so vor: [[Vorbereitung auf Wien|Ich lese ein paar Artikel und schaue mir einen Plan der Innenstadt an]]. Falls du am Sonntag Zeit hast, [[Wunsch für den Sonntag|würde ich gern das Belvedere sehen]].

Bei der Anreise [[Anreise|nehme ich lieber den Zug, weil er zuverlässig ist]]. Falls ich zu früh komme, [[Alternative bei früher Ankunft|warte ich in einem Café in deiner Nähe]]. Gern erinnere ich mich auch an den Bodensee.

Dein Schlafplatz wäre wunderbar, aber ich möchte dir keine Umstände machen.

Schreib mir bitte, [[Frage an den Freund|ob das alles für dich passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Tobias]],

danke für deine Nachricht, ich beantworte sie Schritt für Schritt. Als Erstes: Glückwunsch zum Studium und zur größeren Wohnung! [[Reaktion auf die Neuigkeiten|Ich freue mich sehr und bin stolz auf dich]].

Danach zur Einladung: Ich komme gern zur Party am Samstag, dem 5. September. [[Zeitraum für den Besuch|Ich fahre am Freitagmittag los und bin abends bei dir]].

Dann zur Begleitung: [[Begleitung|Ich würde gern meinen Freund Hasan mitbringen]], wenn das für dich okay ist. Er [[Eigenschaft der Begleitung|ist sehr offen und mag Partys]].

Dann zu den Mitbringseln: [[Musik aus meinem Land|Ich bringe Lieder aus meiner Heimat mit]], und zusätzlich [[Mitbringsel|eine Süßigkeit für alle Gäste]].

Als Nächstes zur Vorbereitung auf Wien: [[Vorbereitung auf Wien|Ich lade einen Stadtplan herunter und suche Sehenswürdigkeiten im Internet]]. Zum Schluss mein Plan für Sonntag: [[Wunsch für den Sonntag|ich möchte die Altstadt zu Fuß erkunden]].

Zuletzt zur Anreise: [[Anreise|Ich komme mit dem Zug und rufe dich vom Bahnhof an]]. Danach die Frage, was ich anziehen soll: [[Kleidung|etwas Schickes, aber Bequemes]]. Und vom Bodensee erinnere ich mich besonders an [[Erinnerung an den Bodensee|die Abende am Ufer]]. Das waren richtig schöne Stunden.

Das Angebot, bei dir zu schlafen, nehme ich dankend an. An den Bodensee denke ich gern zurück.

Wie gehen wir weiter vor? Schreib mir, [[Frage an den Freund|ab wann ich am Freitag kommen kann]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Tobias]],

deine Mail hat mich sehr gefreut, und von Herzen: Glückwunsch zum Studium und zur Wohnung! [[Reaktion auf die Neuigkeiten|Du hast so viel dafür getan, und jetzt wird alles gut]]. Ich glaube fest daran, dass du bald eine Arbeit findest.

Natürlich komme ich zu deiner Party am Samstag, dem 5. September. [[Grund für die Zusage|Du bist ein wichtiger Freund für mich]], und ich möchte diesen Tag mit dir teilen. Es ist schön, dass du [[Grund für die Freude|mich nach so langer Zeit wieder einlädst]].

Musik aus meinem Land bringe ich gern mit: [[Musik aus meinem Land|sanfte Lieder zum Zuhören und fröhliche zum Tanzen]]. Dazu [[Mitbringsel|ein kleines Geschenk für deine neue Wohnung]], weil man eine Wohnung immer segnen sollte.

Darf ich jemanden mitbringen? [[Begleitung|Meine Mutter ist gerade zu Besuch und würde dich gern kennenlernen]]. Sie [[Eigenschaft der Begleitung|ist herzlich und ruhig]].

Für Wien bereite ich mich vor, indem ich [[Vorbereitung auf Wien|mir Bücher über die Stadt aus der Bibliothek hole]]. Am Sonntag [[Wunsch für den Sonntag|möchte ich mir mit dir ein ruhiges Café suchen]].

Zur Anreise: [[Anreise|Ich nehme den Zug und melde mich bei dir, sobald ich ankomme]]. Und an den Bodensee denke ich mit warmen Gefühlen, [[Erinnerung an den Bodensee|wir haben uns dort so gut verstanden]]. Ich hoffe, dass das in Wien genauso wird.

Dein Angebot, bei dir zu schlafen, rührt mich. Ich nehme es gern an.

Erzähl mir, [[Frage an den Freund|wie du dich in der neuen Wohnung fühlst]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Tobias]],

Studium fertig, neue Wohnung, Glückwunsch! [[Reaktion auf die Neuigkeiten|Das ist ja großartig, ich freue mich total für dich]]. Klar komme ich zur Party, Samstag, der 5. September, steht schon im Kalender.

Wann ich ankomme? [[Zeitraum für den Besuch|Freitagabend mit dem Zug, und bleiben tue ich bis Sonntag]]. Schlafen bei dir passt perfekt, danke!

Musik: Ich bringe [[Musik aus meinem Land|meine besten Lieder von zu Hause]] mit. Dazu [[Mitbringsel|ein paar Snacks und eine Flasche]].

Kann ich jemanden mitbringen? [[Begleitung|Meine Freundin Nora hat Lust auf Wien]]. Sie ist [[Eigenschaft der Begleitung|entspannt und kann gut zuhören]].

Zur Vorbereitung: [[Vorbereitung auf Wien|Ich google ein bisschen, was man in Wien machen muss]]. Mein Sonntagswunsch: [[Wunsch für den Sonntag|ein gemütlicher Stadtbummel und danach Kaffee]].

Anreise: [[Anreise|Zug, Freitagabend]]. Kleidung: [[Kleidung|Jeans und ein schickes Hemd]]. Mehr brauche ich nicht, oder? Ach ja, ich freue mich auf deine Nachbarn und auf die neue Straße, wenn du sie mir zeigst.

An den Bodensee denke ich auch oft, das war eine super Zeit. Damals haben wir [[Erinnerung an den Bodensee|jede Nacht am See gesessen und geredet]].

Und weißt du was? Ich freue mich besonders auf [[Vorfreude|die Wohnung, die Leute und die Musik]] und auf [[Weitere Vorfreude|ein langes Gespräch auf dem Balkon]]. Das wird richtig gut.

Schreib mir kurz, [[Frage an den Freund|ob ich vorher anrufen soll]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

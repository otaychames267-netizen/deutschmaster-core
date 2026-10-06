// v2 (B2-style): Moritz schickt Urlaubsgrüße aus San Diego (Mietwagen, Architektur, Strände, Club, in zwei Tagen zurück, Treffen nächste Woche?). Points: Ihr Lieblingsland · was Sie an fremden Orten interessiert ·
// welche Musik Sie gern hören · ein Vorschlag für ein Treffen mit Moritz — plus: Reaktion auf die Grüße ("Du weißt ja, wie sehr ich Kalifornien mag"), "Welches Land ist dein Lieblingsland?".
export const kw = [/Lieblingsland|Land/i, /interessier|fremd|Orten|Kultur|Essen|Menschen|Architektur|Sehenswürdig|Natur|Sprache/i, /Musik|Lieder|Band|Rock|Pop|Konzert|Jazz|Klassik|Songs|Playlist|DJ/i, /treff/i, /San Diego|Kalifornien|Grüße|Strand|Urlaub/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Moritz]],

vielen Dank für deine Grüße aus San Diego, ich habe mich sehr gefreut! [[Reaktion auf die Grüße|Mietwagen, Architektur und Strände klingen nach einem wunderbaren Urlaub]].

Du fragst nach meinem Lieblingsland: [[Lieblingsland|Das ist für mich Italien]], weil [[Grund für das Lieblingsland|das Essen, die Städte und die Menschen so herzlich sind]].

An fremden Orten interessieren mich besonders [[Interesse 1|die Menschen und ihre Geschichten]] und [[Interesse 2|die Küche und die Märkte]]. Ich probiere gern etwas Neues.

Musik höre ich am liebsten [[Musikstil|Pop und Soul]], und für Partys [[Party-Musik|elektronische Musik]]. Deine Club-Musik würde mich auch reizen.

Für ein Treffen schlage ich vor, [[Treffvorschlag|dass wir uns am Dienstag in der Stadt auf einen Kaffee treffen]]. Dann erzählst du mir alles genauer.

Dass du dir ein Auto gemietet hast, finde ich eine gute Idee: [[Kommentar|So ist man flexibel und kann an jedem Strand halten]]. In Kalifornien sind die Straßen breit und die Aussicht grandios. Ich habe davon [[Quelle|in Filmen und Reiseberichten]] gehört, und es klingt nach einem Abenteuer.

An fremden Orten gefällt mir auch, [[Vorliebe|abends durch die Straßen zu gehen und das Leben zu beobachten]]. Das sagt mehr über eine Stadt als jede Sehenswürdigkeit. Außerdem [[Zweite Vorliebe|probiere ich gern die Spezialitäten der Region]], und ich lerne ein paar Wörter der Sprache.

Zur Musik: Ich höre gern, [[Anlass|beim Kochen, beim Joggen und abends zum Entspannen]]. Mein Lieblingskünstler ist [[Künstler|ein Soulsänger aus den Siebzigern]], dessen Lieder mir immer gute Laune machen. Vielleicht erzähle ich dir beim Treffen mehr, [[Folge|und wir tauschen Playlists]].

Dein Vorschlag, uns nächste Woche zu treffen, gefällt mir sehr. [[Wunsch|Ich freue mich darauf, deine Geschichten zu hören]], und ich bringe [[Mitbringsel|etwas zu trinken]] mit. Das wird ein schöner Abend.

Schreib mir bitte, [[Frage an den Freund|wann du wieder in Deutschland landest]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Moritz]],

danke für die Grüße aus San Diego! [[Reaktion auf die Grüße|Auto, Strand, Hochhäuser und Club, das klingt nach einem krassen Urlaub]]. Ich bin ein bisschen neidisch.

Mein Lieblingsland? [[Lieblingsland|Spanien]], [[Grund für das Lieblingsland|wegen Sonne, Meer und Tapas]].

An fremden Orten interessiert mich [[Interesse 1|das Essen]] und [[Interesse 2|wie die Leute leben]].

Musik: [[Musikstil|Ich höre alles Mögliche, Hip-Hop, Pop und Indie]].

Treffen? Klar! [[Treffvorschlag|Wie wäre es am Mittwochabend auf ein Bier]]?

Zu den Hochhäusern und der Architektur: [[Frage|Welches Gebäude hat dich am meisten beeindruckt]]? Ich mag moderne Architektur, [[Vorliebe|vor allem Glas und Stahl am Meer]]. Wenn du Fotos gemacht hast, zeig sie mir unbedingt.

Besonders interessieren mich [[Interesse|die Märkte und kleinen Läden]], denn dort spürt man das echte Leben. In einem großen Einkaufszentrum ist überall dasselbe. Deshalb suche ich [[Ziel|immer die Orte, an denen auch Einheimische einkaufen]].

Musik gehört für mich zum Alltag: [[Beschreibung|Im Bus höre ich Podcasts, zu Hause Musik]]. Gern gehe ich auch auf Konzerte. Dein Club klingt spannend, [[Frage|was für eine Musik wurde dort gespielt, House, Hip-Hop oder etwas anderes]]?

Wenn wir uns treffen, könnten wir [[Idee|in meiner Lieblingspizzeria essen und danach noch spazieren gehen]]. Das ist gemütlich, und du kannst erzählen, ohne Lärm im Hintergrund. Ich freue mich schon darauf, [[Folge|dich wiederzusehen]].

Meld dich, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Moritz]],

wow, Grüße aus San Diego, wie toll! [[Reaktion auf die Grüße|Kalifornien mit Strand, Architektur und Mietwagen, das ist ein Traum]]. Ich freue mich riesig für dich.

Mein Lieblingsland: [[Lieblingsland|Kanada]], weil [[Grund für das Lieblingsland|die Natur so riesig und die Menschen so freundlich sind]].

An fremden Orten interessiert mich [[Interesse 1|die Natur]], [[Interesse 2|die Kultur und die Sprache]].

Musik: Ich liebe [[Musikstil|Rock und Pop]], und [[Party-Musik|auf Partys auch Tanzmusik]].

Ein Treffen? Unbedingt! [[Treffvorschlag|Ich schlage Dienstagabend vor, wir gehen essen]].

Die Strände in Kalifornien sind berühmt: [[Wissen|lange Sandstrände, Surfer und Sonnenuntergänge]]. Ich war noch nie dort, aber es steht auf meiner Liste. Vielleicht [[Plan|reise ich in zwei Jahren selbst dorthin]], und dann kannst du mir Tipps geben.

Mich fasziniert, [[Interesse|wie unterschiedlich Menschen leben und feiern]]. Wenn ich verreise, besuche ich gern ein lokales Fest, [[Beispiel|zum Beispiel ein Straßenfest oder ein Konzert im Park]]. Das ist für mich der beste Weg, ein Land zu verstehen.

Ich liebe Musik, die [[Eigenschaft|Geschichten erzählt und Emotionen weckt]]. Deshalb höre ich oft Singer-Songwriter. Für den Urlaub habe ich eine eigene Playlist, [[Folge|damit ich unterwegs gute Stimmung habe]].

Für das Treffen hätte ich [[Idee|Lust auf einen Abend mit Fotos und Musik]], bei dem du deine Bilder zeigst. Ich spiele dazu deine Lieder. So kommt Kalifornien zu uns, [[Folge|ganz ohne Flug]].

Schreib mir bald, [[Frage an den Freund|wann dein Flug landet]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Moritz]],

vielen Dank für deine Grüße. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, dein Urlaub: [[Reaktion auf die Grüße|Ich freue mich, dass dir Kalifornien so gut gefällt]].

Zweitens, mein Lieblingsland: [[Lieblingsland|Italien]], weil [[Grund für das Lieblingsland|es Kultur und Natur verbindet]].

Drittens, was mich an fremden Orten interessiert: [[Interesse 1|Kultur und Architektur]].

Viertens, die Musik: [[Musikstil|Ich höre Pop und Jazz]].

Fünftens, ein Treffen: Ich schlage [[Treffvorschlag|Dienstag, 18 Uhr in einem Café]] vor.

Ergänzend interessiert mich, [[Frage|wie die Menschen in San Diego sind, eher locker oder eher reserviert]]. Ich habe gehört, [[Vorurteil|dass Kalifornier sehr entspannt sind]]. Stimmt das, oder ist das nur ein Klischee?

Ergänzend interessiert mich [[Interesse|die Geschichte eines Ortes]], etwa alte Gebäude und Museen. Ich lese vorher viel darüber, [[Folge|damit ich vor Ort mehr verstehe]]. Auf diese Weise bleibt die Reise länger im Gedächtnis.

Ergänzend höre ich gern [[Musikstil|Gitarrenmusik und alte Rocksongs]], besonders auf Autofahrten. Du hast bestimmt im Mietwagen Radio gehört, [[Frage|welcher Sender war gut]]? Ich suche immer nach neuen Entdeckungen.

Ergänzend schlage ich vor, das Treffen [[Terminvorschlag|am Mittwochabend um 19 Uhr]] zu machen, weil [[Grund|du dann ausgeruht bist und noch viel zu erzählen hast]]. Ich reserviere, [[Angebot|wenn du magst, einen Tisch in einem schönen Lokal]].

Bitte teile mir mit, [[Frage an den Freund|ob dir der Termin passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Moritz]],

danke für deine Grüße aus San Diego! [[Reaktion auf die Grüße|Schön, dass du so viel erlebst, und ich helfe dir gern bei der Rückreise]].

Mein Lieblingsland: [[Lieblingsland|Portugal]], [[Grund für das Lieblingsland|wegen Meer und Menschen]].

An fremden Orten interessiert mich [[Interesse 1|Geschichte]], und ich sammle [[Interesse 2|gern Karten und Reiseführer]]. Wenn du magst, [[Praktische Hilfe|leihe ich dir meine Reiseführer für deine nächste Reise]].

Musik: [[Musikstil|Pop und Soul]].

Ein Treffen? Gern! [[Treffvorschlag|Ich hole dich am Flughafen ab, dann gehen wir essen]].

Praktisch wäre es, wenn du mir ein paar Tipps aufschreibst: [[Wunsch|die besten Restaurants, Strände und Orte, die man gesehen haben muss]]. Ich sammle solche Tipps für später, [[Folge|und ich revanchiere mich mit Tipps für Deutschland]].

Praktisch gesagt interessiere ich mich für [[Interesse|Verkehrsmittel, Preise und gute Unterkünfte]], denn das macht eine Reise einfach. Ich schreibe mir alles auf, [[Folge|und das hilft mir bei der nächsten Reise]]. Wenn du magst, gebe ich dir meine Liste.

Ich kann dir gern eine Playlist zusammenstellen: [[Angebot|mit zwanzig Liedern, die gut zu Reisen passen]]. Das mache ich sehr gern, und du kannst sie für deine nächste Fahrt nutzen. [[Hinweis|Schick mir einfach deine Lieblingsrichtung]].

Ich helfe dir gern, [[Hilfsangebot|nach der Landung nach Hause zu kommen]], wenn du magst. Ich hole dich am Flughafen ab, das ist kein Problem. Danach können wir kurz essen, [[Folge|und du kannst alles erzählen]].

Sag mir bitte, [[Frage an den Freund|wann du landest]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Moritz]],

ich danke dir für deine Grüße, denn [[Begründung für die Freude|ich habe lange nichts von dir gehört]]. [[Reaktion auf die Grüße|San Diego ist ein toller Ort für einen Urlaub]].

Mein Lieblingsland ist [[Lieblingsland|Griechenland]], weil [[Grund für das Lieblingsland|man dort Meer, Geschichte und gutes Essen hat]].

An fremden Orten interessiert mich [[Interesse 1|die Kultur]], da [[Grund für das Interesse|man dort viel lernt]].

Ich höre [[Musikstil|Rock und Pop]], weil [[Grund für die Musik|sie mich motivieren]].

Ich schlage ein Treffen vor, weil [[Grund für das Treffen|wir uns lange nicht gesehen haben]]: [[Treffvorschlag|Dienstagabend]].

Dass du nach zwei Tagen zurückfliegst, tut mir leid, denn [[Grund|man will immer länger bleiben, wenn es schön ist]]. Aber vielleicht ist es gut, dass es bei diesem schönen Eindruck bleibt, [[Folge|und du freust dich auf die nächste Reise]].

Fremde Orte interessieren mich, weil [[Grund|ich gern über den Tellerrand schaue und andere Sichtweisen kennenlerne]]. Das macht mich offener und gelassener. Außerdem [[Zweiter Grund|lerne ich dabei immer etwas über mich selbst]].

Ich höre Pop und Soul, weil [[Grund|sie gute Laune machen und meinen Alltag leichter machen]]. Und manchmal höre ich Klassik, [[Zweiter Grund|zum Beispiel beim Lesen oder Lernen]]. Beides hat seinen Platz in meinem Leben.

Ich schlage ein Treffen vor, weil [[Grund|ich neugierig auf deine Erlebnisse bin und wir viel zu bereden haben]]. Außerdem [[Zweiter Grund|habe ich eine Überraschung für dich]]. Das wird ein guter Abend, da bin ich sicher.

Schreib mir, [[Frage an den Freund|ob dir das passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Moritz]],

danke für deine Grüße, hier kurz meine Antworten.

San Diego: [[Reaktion auf die Grüße|Klingt toll]].

Lieblingsland: [[Lieblingsland|Italien]].

Fremde Orte: [[Interesse 1|Essen und Menschen]].

Musik: [[Musikstil|Pop und Jazz]].

Treffen: [[Treffvorschlag|Dienstag, Café]].

Beim Fliegen empfehle ich dir, [[Tipp|viel zu trinken und dir vorher Kopfhörer einzupacken]]. So ist der lange Flug erträglich. Ich habe das bei meiner letzten Reise gemerkt, [[Erfahrung|nachdem ich zehn Stunden nicht schlafen konnte]].

Ich bin gern an Orten, an denen [[Beschreibung|Natur und Stadt zusammentreffen]], wie in San Diego. Dort kann man am Morgen am Strand laufen und am Nachmittag ins Museum gehen. Diese Mischung gefällt mir, [[Folge|und ich kann mich gut erholen]].

Mein letztes Konzert war [[Konzert|ein kleines Open-Air in einem Park]], und es war wunderbar. Die Stimmung war entspannt, und alle haben mitgesungen. Ich denke, du wirst in San Diego ähnliche Erlebnisse gehabt haben, [[Folge|vielleicht mit lauteren Bässen]].

Das Treffen muss nicht lang sein: [[Hinweis|Eine Stunde reicht, wenn du müde bist]]. Hauptsache, wir sehen uns. Ich bin da flexibel, [[Folge|und passe mich deinem Rhythmus an]].

Ich freue mich auf deine Geschichten und hoffe, dass du gut nach Hause kommst und dich schnell wieder einlebst. Gib mir bitte kurz Bescheid, [[Frage an den Freund|wann du landest]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Moritz]],

Strand, Mietwagen und Club in Kalifornien, und ich sitze hier im Regen! [[Reaktion auf die Grüße|Ich bin neidisch, aber ich verzeihe dir]].

Mein Lieblingsland: [[Lieblingsland|Italien, wegen der Pizza und der Eisdielen]].

An fremden Orten interessiert mich [[Interesse 1|das Essen, ich bin eine Touristen-Spürnase für Bäckereien]].

Musik: [[Musikstil|Ich höre alles, nur nicht um sechs Uhr morgens]].

Treffen? [[Treffvorschlag|Gern, wenn du Souvenirs mitbringst]].

San Diego ist für sein Wetter bekannt: [[Wissen|fast immer Sonne und milde Temperaturen]]. Ich beneide dich um das Klima. Bei uns ist es gerade [[Wetter|kalt und nass]], und ich hätte auch gern etwas Sonne.

In fremden Ländern achte ich besonders auf [[Beobachtung|Kleinigkeiten, wie Menschen sich begrüßen oder was sie zum Frühstück essen]]. Das sind spannende Unterschiede. Ich schreibe sie manchmal in ein kleines Heft, [[Folge|und lese sie später gern wieder]].

Musik ist für mich auch ein Weg, Menschen kennenzulernen: [[Beobachtung|Auf Konzerten kommt man schnell ins Gespräch]]. Das schätze ich sehr. Deshalb freue ich mich, wenn wir bald ein Konzert besuchen, [[Idee|vielleicht gleich nächsten Monat]].

Wir können uns auch [[Idee|in einem Café mit Blick auf den Fluss treffen]], dort ist es entspannt. Du erzählst mir von San Diego, ich zeige dir meine neuen Bilder, [[Folge|und wir lachen viel]].

Schreib bald, [[Frage an den Freund|ob der Jetlag schon zuschlägt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Moritz]],

als ich deine Grüße gelesen habe, musste ich an unseren Roadtrip denken. [[Erinnerung an früher|Wir sind damals durch die Berge gefahren und haben laut Musik gehört]]. Kalifornien passt zu dir.

Mein Lieblingsland: [[Lieblingsland|Schweden]], weil [[Grund für das Lieblingsland|ich dort die schönsten Sommer erlebt habe]].

Fremde Orte: [[Interesse 1|Ich liebe es, kleine Cafés zu entdecken]].

Musik: [[Musikstil|Ich höre gern Lieder, die mich an früher erinnern]].

Ein Treffen? [[Treffvorschlag|Sehr gern, vielleicht beim Italiener]].

Ich erinnere mich an unsere gemeinsame Reise: [[Erinnerung|Wir haben nachts an einem Strand gesessen und den Sternenhimmel angeschaut]]. Das war einer der schönsten Abende. Ich denke, du hast Ähnliches erlebt, [[Folge|und das macht deinen Urlaub so besonders]].

Ich habe als Kind einmal [[Erinnerung|eine Reise nach Frankreich gemacht, und seitdem liebe ich Reisen]]. Damals habe ich zum ersten Mal ein fremdes Land erlebt. Dieses Gefühl suche ich bis heute, [[Folge|bei jeder neuen Reise]].

Als Kind habe ich Klavier gespielt: [[Erinnerung|Meine Mutter hat mich jeden Tag zum Üben ermahnt]]. Heute bin ich ihr dankbar, denn [[Folge|ich verstehe Musik viel besser]]. Ich spiele manchmal noch, wenn ich allein bin.

Ich erinnere mich an unser letztes Treffen: [[Erinnerung|Wir haben bis nach Mitternacht geredet]]. So einen Abend wünsche ich uns wieder, [[Wunsch|mit vielen Geschichten und noch mehr Humor]].

Erzähl mir, [[Frage an den Freund|wie der Club war]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Moritz]],

danke für deine Grüße. [[Reaktion auf die Grüße|Schön, dass dir Kalifornien gefällt]]. Ich habe gleich mehrere Vorschläge.

Mein Lieblingsland: [[Lieblingsland|Italien]]. Mein erster Vorschlag: Wir reisen [[Vorschlag|nächstes Jahr zusammen dorthin]].

Fremde Orte: [[Interesse 1|Kultur und Essen]]. Musik: [[Musikstil|Pop und Rock]].

Mein zweiter Vorschlag: [[Treffvorschlag|Wir treffen uns nächste Woche zum Abendessen]]. Mein dritter: [[Vorschlag 2|Du zeigst mir deine Fotos]].

Mein vierter Vorschlag: [[Vorschlag|Wir planen irgendwann zusammen eine Reise in die USA]]. Mein fünfter: [[Vorschlag 2|Wir fangen schon einmal an, Geld zu sparen]]. Das wäre ein schönes Ziel für uns beide.

Mein sechster Vorschlag: [[Vorschlag|Wir machen ein Reisebuch mit allem, was wir an fremden Orten entdecken]]. Mein siebter: [[Vorschlag 2|Wir verabreden uns zu einem Reiseabend, an dem jeder Fotos zeigt]]. Das wäre schön.

Mein achter Vorschlag: [[Vorschlag|Wir gehen nach deiner Rückkehr zusammen auf ein Konzert]]. Mein neunter: [[Vorschlag 2|Wir erstellen gemeinsam eine Playlist für unsere nächste Reise]]. Das macht Spaß und verbindet.

Mein zehnter Vorschlag: [[Vorschlag|Wir kochen zusammen etwas Kalifornisches, zum Beispiel Fischtacos]]. Mein elfter: [[Vorschlag 2|Du bringst ein Souvenir mit, ich bringe den Nachtisch]]. Das wäre ein schöner Abend.

Was hältst du davon? Ich freue mich auf deine Antwort und auf ein baldiges Wiedersehen mit dir, denn es gibt bestimmt viel zu erzählen. Schreib mir, [[Frage an den Freund|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Moritz]],

danke für deine Grüße. [[Reaktion auf die Grüße|Kalifornien klingt wunderbar, auch wenn der Urlaub bald endet]].

Mein Lieblingsland zu nennen, ist schwer. Einerseits [[Vorteil eines Landes|mag ich Italien wegen der Kultur]], andererseits [[Vorteil eines anderen Landes|liebe ich Kanada wegen der Natur]]. Ich sage [[Lieblingsland|Italien]].

An fremden Orten interessiert mich [[Interesse 1|vieles, vor allem Menschen]].

Musik: [[Musikstil|Je nach Stimmung Pop oder Klassik]].

Ein Treffen finde ich schön, [[Treffvorschlag|vielleicht am Wochenende]].

Ich verstehe, dass der Urlaub dich erschöpft hat: [[Hinweis|Viele Eindrücke, viel Autofahren und kurze Nächte]]. Plane am besten einen Tag zum Ausruhen ein, [[Folge|bevor die Arbeit wieder beginnt]]. Das tut gut.

Ich bin an fremden Orten eher vorsichtig, [[Einschränkung|weil ich mich zuerst orientieren möchte]]. Aber nach einigen Stunden werde ich mutiger. Das ist mein Rhythmus, [[Folge|und er hat sich bewährt]].

Bei der Musik bin ich nicht kompromisslos: [[Einschränkung|Ich mag nicht alles, aber ich probiere gern Neues]]. Wenn du mir etwas empfiehlst, höre ich es mir an, [[Folge|und sage dir ehrlich, was ich davon halte]].

Ich würde mich freuen, wenn wir uns treffen, [[Bedingung|sobald du dich vom Jetlag erholt hast]]. Es hat keine Eile, [[Folge|wir haben Zeit]]. Hauptsache, du kommst gesund nach Hause.

Schreib mir bitte, [[Frage an den Freund|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Moritz]],

danke für deine Grüße, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Grüße|Schön, dass dir Kalifornien gefällt]].

Als Nächstes zu meinem Lieblingsland: [[Lieblingsland|Italien]].

Dann zu fremden Orten: [[Interesse 1|Menschen und Essen]].

Danach zur Musik: [[Musikstil|Pop, Jazz]].

Zuletzt zum Treffen: [[Treffvorschlag|Dienstag im Café]].

Als ersten Schritt nach deiner Rückkehr empfehle ich, [[Schritt|die Fotos zu sortieren und die besten auszusuchen]]. Dann können wir sie beim Treffen anschauen. Ich bringe [[Mitbringsel|etwas zu trinken und Snacks]] mit, damit wir es uns gemütlich machen.

Als zweiten Schritt auf Reisen nehme ich mir vor, [[Schritt|jeden Tag ein neues Wort der Landessprache zu lernen]]. Das macht Spaß, und die Leute freuen sich darüber. Mit der Zeit [[Folge|wird aus den Wörtern ein kleiner Wortschatz]].

Als dritten Schritt schlage ich vor, [[Schritt|dass wir einander jeden Monat drei Lieder empfehlen]]. So entdecken wir Neues, ohne viel Aufwand. Das ist ein einfaches Ritual, [[Folge|und es hält die Freundschaft lebendig]].

Als vierten Schritt schlage ich vor, [[Schritt|dass du mir nach der Landung kurz schreibst]]. Dann weiß ich, dass alles gut ist, [[Folge|und wir können den Termin festlegen]]. Das ist einfach und entspannt.

Wie geht es weiter? Schreib mir, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Moritz]],

deine Grüße haben mich sehr gefreut. [[Reaktion auf die Grüße|Ich freue mich, dass du so einen schönen Urlaub hast, du hast ihn verdient]].

Mein Lieblingsland: [[Lieblingsland|Italien]], [[Grund für das Lieblingsland|weil ich mich dort zu Hause fühle]].

An fremden Orten interessieren mich [[Interesse 1|die Herzlichkeit der Menschen]].

Musik: [[Musikstil|Ich höre gern ruhige Lieder]].

Ich würde mich freuen, dich zu treffen: [[Treffvorschlag|am Wochenende bei einem Spaziergang]].

Ich freue mich, dass du an mich gedacht hast, [[Gefühl|obwohl du viel erlebt hast]]. Das zeigt, wie viel dir unsere Freundschaft bedeutet. Und ich bin sicher, [[Folge|dass du viel zu erzählen hast]].

Ich mag es, wenn Menschen mich willkommen heißen: [[Gefühl|Ein Lächeln und eine freundliche Geste reichen]]. In vielen Ländern habe ich das erlebt, und es hat mich berührt. Das macht eine Reise für mich wertvoll, [[Folge|mehr als jede Sehenswürdigkeit]].

Musik tut mir gut, [[Wirkung|besonders nach einem langen Tag]]. Ein ruhiges Lied, ein Tee und ein bisschen Ruhe, mehr brauche ich nicht. Vielleicht kennst du das auch, [[Frage|oder bist du eher der Typ für laute Clubs]]?

Ich freue mich so auf unser Treffen: [[Gefühl|Du fehlst mir, und ich bin gespannt auf deine Erzählungen]]. Komm gut heim, und genieße die letzten Tage. Danach sehen wir uns, [[Folge|bei einem schönen Abendessen]].

Erzähl mir, [[Frage an den Freund|wie es dir geht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Moritz]],

San Diego, krass! [[Reaktion auf die Grüße|Klingt nach Sonne pur]].

Lieblingsland: [[Lieblingsland|Spanien]].

Fremde Orte: [[Interesse 1|Essen und Leute]].

Musik: [[Musikstil|Alles, Hauptsache laut]].

Treffen? [[Treffvorschlag|Klar, nächste Woche]].

Ein kurzer Wunsch: [[Wunsch|Bring mir ein Souvenir mit, ein T-Shirt oder einen Magneten]]. Das muss nicht teuer sein. Es soll nur eine Erinnerung an deine Reise sein, [[Folge|und ich freue mich darüber]].

An fremden Orten gefällt mir [[Beschreibung|alles, was anders ist]]. Auch wenn nicht alles einfach ist, es macht Spaß. Und die schönsten Geschichten entstehen, [[Folge|wenn etwas schiefgeht]].

Musik: Ich höre alles, [[Beschreibung|was Rhythmus hat und mich bewegt]]. Und wenn mir etwas gefällt, tanze ich auch allein in der Küche. Das ist mein kleines Geheimnis, [[Folge|aber dir verrate ich es]].

Ein Treffen nächste Woche? [[Zusage|Klar, ich bin dabei]]. Sag mir einfach, wann du Zeit hast. Ich freue mich riesig, [[Folge|dich zu sehen und alles zu hören]]. Bis dahin gute Reise!

Ich freue mich echt auf dein Wiedersehen und deine Geschichten aus Kalifornien, denn das klingt nach einem tollen Urlaub. Bring gern ein paar Fotos mit, dann schauen wir sie zusammen an und trinken etwas Kühles dazu. Bis bald und guten Flug! Meld dich, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

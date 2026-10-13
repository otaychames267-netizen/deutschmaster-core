// v2 (B2-style): Jennifer kündigt die Hochzeit ihrer Schwester Janine (Oktober) an. Points: Reaktion auf die Neuigkeit · Übernachtungsmöglichkeit ·
// dass Sie zur Hochzeit kommen möchten · ein Hochzeitsgeschenk — plus: Entschuldigung ("erst jetzt gemeldet"), Eddi (Koch im Hotel), "ob du kommst und mit wem".
export const kw = [/Entschuldig|kein Problem|macht nichts|melde|schreib|Zeit/i, /Janine|Schwester|Hochzeit|heirat/i, /Oktober/, /Eddi|Koch|Hotel|Bräutigam|Mann/i, /komm/, /mit wem|mitbring|bringe|Begleit|allein|Partner|Freund|Freundin|Mann|Frau/i, /übernacht|schlafen|Hotel|Unterkunft|Zimmer|Pension|Platz/i, /Geschenk|schenk/i, /gratul|Glückwunsch|freu/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Jennifer]],

vielen Dank für deine Nachricht, und mach dir wegen der späten Antwort bitte keine Gedanken. [[Reaktion auf die Verspätung|Ich weiß, wie viel im Leben manchmal los ist, mir geht es genauso]]. Umso mehr freue ich mich, von dir zu hören.

Die Neuigkeit über die Hochzeit deiner Schwester Janine hat mich riesig gefreut. [[Reaktion auf die Neuigkeit|Bitte gratuliere ihr und Eddi ganz herzlich von mir]]. Dass Eddi Koch in einem Hotel ist, finde ich [[Eindruck von Eddi|spannend und passt bestimmt gut zu eurer Familie]].

Natürlich komme ich gern zur Hochzeit im Oktober. [[Grund für die Zusage|Ich habe Janine schon lange nicht gesehen und freue mich auf euch alle]]. Ich reise [[Anreise|mit dem Zug am Freitagabend]] an.

Zu deiner Frage, mit wem ich komme: [[Begleitung|Ich bringe meinen Freund Daniel mit, wenn das für euch in Ordnung ist]]. Er [[Eigenschaft der Begleitung|ist sehr nett und tanzt gern]].

Wegen der Übernachtung habe ich eine Frage: [[Frage zur Übernachtung|Kennst du ein günstiges Hotel oder eine Pension in der Nähe der Feier]]? Wenn nicht, suche ich selbst eine und buche früh.

Als Geschenk denke ich an [[Geschenkidee|ein gemeinsames Fotoalbum und etwas für den Haushalt]]. Ich möchte gern wissen, [[Frage zum Geschenk|ob sich die beiden etwas Bestimmtes wünschen]].

Für den Tag selbst habe ich noch zwei Ideen: Ich schreibe [[Kartenidee|eine persönliche Glückwunschkarte, die alle Gäste unterschreiben können]], und ich trage [[Kleidung|ein festliches Kleid in Blau]]. Ich freue mich schon auf das Wiedersehen mit [[Wiedersehen|deiner ganzen Familie]].

Gib mir bitte Bescheid, [[Frage an die Freundin|wann und wo die Feier genau stattfindet]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name der Freundin|Jennifer]],

na, du Verschwundene! Keine Sorge, ich habe auch lange nicht geschrieben. [[Reaktion auf die Verspätung|Hauptsache, wir hören jetzt wieder voneinander]]. Schön, dass du dich meldest.

Eine Hochzeit im Oktober, wie toll! [[Reaktion auf die Neuigkeit|Sag Janine, dass ich mich riesig für sie freue und ihr alles Gute wünsche]]. Eddi ist Koch? Dann [[Eindruck von Eddi|gibt es bei der Feier bestimmt ein Super-Essen]].

Ich komme gern zur Hochzeit, das ist doch klar. [[Anreise|Ich nehme das Auto und fahre schon am Freitag]]. Dann haben wir Zeit zum Quatschen.

Mit wem? [[Begleitung|Ich komme allein, aber vielleicht lerne ich dort jemanden kennen]]. Falls sich das ändert, sage ich dir sofort Bescheid, versprochen.

Schlafen: [[Übernachtung|Ich suche mir ein Zimmer in einer Pension, ein Sofa wäre noch besser]]. Sag mir ruhig, was möglich ist, ich bin da flexibel.

Geschenk: [[Geschenkidee|Ich denke an einen schönen Kochkurs für die beiden, weil Eddi doch Koch ist]]. Was meinst du dazu?

Und noch was: Ich nehme mir [[Urlaubstage|den Freitag und den Montag]] frei, dann müssen wir nicht hetzen. Falls ihr Hilfe braucht, [[Hilfsangebot|schleppe ich Stühle, hänge Girlanden auf und fahre Gäste zum Bahnhof]]. Das mache ich wirklich gern für euch.

Ich freue mich auf [[Vorfreude|ein richtig tolles Fest mit viel Tanz]] und auf [[Wiedersehen|ein Wiedersehen mit allen]]. Meld dich bald, [[Frage an die Freundin|wann wir telefonieren können]].

[[Grußformel|Bis dann]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Jennifer]],

wow, was für eine tolle Nachricht! Mach dir bitte keine Gedanken wegen der späten Meldung. [[Reaktion auf die Verspätung|Ich freue mich einfach, dass du an mich denkst]]. Deine Mail hat mir den Tag verschönert.

Deine Schwester heiratet im Oktober, das ist wunderbar! [[Reaktion auf die Neuigkeit|Ich gratuliere Janine und Eddi von ganzem Herzen und freue mich mit euch]]. Dass Eddi Koch ist, [[Eindruck von Eddi|klingt nach köstlichen Hochzeitsmenüs]].

Ich komme sehr gern zur Hochzeit! [[Grund für die Zusage|Das möchte ich um keinen Preis verpassen, schon wegen der Stimmung]]. Ich reise [[Anreise|mit dem Flugzeug und miete mir ein Auto]].

Und mit wem ich komme? [[Begleitung|Meine Schwester Lina ist dabei, sie liebt Hochzeiten]]. Sie [[Eigenschaft der Begleitung|bringt immer gute Laune mit]].

Für die Übernachtung hätte ich gern [[Übernachtung|zwei Betten in einem kleinen Hotel in eurer Nähe]]. Hast du einen Tipp?

Als Geschenk habe ich schon eine Idee: [[Geschenkidee|ein Wochenende in einem Wellness-Hotel für das Brautpaar]]. Ich finde, das passt wunderbar.

Für die Feier habe ich mir schon Gedanken gemacht: Ich ziehe [[Kleidung|mein bestes Kleid und neue Schuhe]] an und lerne [[Tanzvorbereitung|vorher ein paar Tanzschritte, damit ich auf der Tanzfläche gut aussehe]]. Ich freue mich so sehr auf dieses [[Vorfreude|wunderbare Fest]].

Schreib mir bald, [[Frage an die Freundin|ob ich bei den Vorbereitungen helfen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Jennifer]],

vielen Dank für deine Mail. [[Reaktion auf die Verspätung|Es ist kein Problem, dass du dich erst jetzt meldest]]. Auf deine Fragen antworte ich der Reihe nach.

Erstens, die Neuigkeit: Zur Hochzeit deiner Schwester Janine im Oktober gratuliere ich herzlich. [[Eindruck von Eddi|Dass Eddi Koch in einem Hotel ist, hört sich sehr interessant an]].

Zweitens, die Zusage: Ich komme gern zur Hochzeit. [[Anreise|Ich reise am Freitag mit dem Zug an und fahre am Sonntag zurück]].

Drittens, die Begleitung: [[Begleitung|Ich komme mit meiner Frau Nadia]]. Wir bitten dich, das bei der Planung zu berücksichtigen.

Viertens, die Übernachtung: Wir würden gern [[Übernachtung|in einem Hotel in der Nähe übernachten]]. Bitte nenne uns [[Frage zur Übernachtung|zwei oder drei Hotels mit fairen Preisen]].

Fünftens, das Geschenk: Ich schlage [[Geschenkidee|einen Gutschein für ein Restaurant und ein Fotobuch]] vor. Bitte sag mir, [[Frage zum Geschenk|ob dir das gefällt]].

Dazu noch einige Hinweise: Als Dresscode nehme ich [[Kleidung|einen dunklen Anzug und eine Krawatte]], und ich besorge noch [[Blumen|einen schönen Strauß für die Braut]]. Bitte sag mir, [[Frage zum Dresscode|ob ich etwas Bestimmtes anziehen soll]].

Ich danke dir für die Einladung und freue mich auf ein Wiedersehen mit euch allen. Gib mir bitte Bescheid, [[Frage an die Freundin|bis wann ich die Hotelbuchung machen sollte]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Jennifer]],

danke für deine Nachricht, und keine Sorge wegen der späten Antwort. [[Reaktion auf die Verspätung|Ich weiß, wie stressig die Planung einer Hochzeit ist]]. Wenn ich dir helfen kann, sag Bescheid.

Zur Hochzeit deiner Schwester Janine gratuliere ich herzlich! [[Reaktion auf die Neuigkeit|Das sind wunderbare Nachrichten für die ganze Familie]]. Dass Eddi Koch ist, finde ich [[Eindruck von Eddi|großartig, dann ist das Essen in guten Händen]].

Ich komme natürlich im Oktober. [[Anreise|Ich fahre mit dem Auto und kann andere Gäste mitnehmen]]. Praktisch ist, dass ich [[Praktische Hilfe|eine Anfahrtsbeschreibung für alle Freunde zusammenstellen kann]].

Mitbringen möchte ich [[Begleitung|meinen Bruder Karim]], er kann beim Aufbauen helfen. Er [[Eigenschaft der Begleitung|ist handwerklich begabt und sehr hilfsbereit]].

Wegen der Übernachtung: [[Übernachtung|Ich suche mir ein Hotel und teile das Zimmer mit meinem Bruder]]. Hast du eine Liste mit Hotels in der Nähe?

Mein Geschenk: [[Geschenkidee|Ich schenke einen Gutschein für ein schönes Abendessen]]. Wenn du möchtest, [[Hilfe beim Geschenk|organisiere ich ein gemeinsames Geschenk aller Freunde]].

Ich helfe dir gern vor der Hochzeit: Ich kann [[Hilfsangebot|Einladungen verpacken, Tischkarten schreiben oder Dekoration besorgen]]. Auch bei der Feier selbst [[Hilfe bei der Feier|passe ich auf die Kinder auf, wenn ihr das möchtet]]. Sag einfach, was dir am meisten hilft.

Sag mir bitte, [[Frage an die Freundin|was ich vor der Hochzeit noch vorbereiten soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Jennifer]],

ich danke dir für deine Mail, und die späte Antwort verstehe ich gut, weil [[Begründung für das Verständnis|auch bei mir in letzter Zeit viel los war]]. Deshalb ist alles in Ordnung.

Zur Hochzeit deiner Schwester Janine im Oktober gratuliere ich dir. [[Reaktion auf die Neuigkeit|Ich freue mich, weil ich weiß, wie wichtig euch die Familie ist]]. Dass Eddi Koch ist, [[Eindruck von Eddi|ist ein gutes Zeichen, denn er versteht etwas von Gastfreundschaft]].

Ich komme gern zur Hochzeit, denn [[Grund für die Zusage|ich möchte dabei sein, wenn ein so wichtiger Tag gefeiert wird]]. Ich reise [[Anreise|mit dem Zug, weil das umweltfreundlich und entspannt ist]].

Ich möchte jemanden mitbringen, weil [[Grund für die Begleitung|ich meine Freundin Sofia gern vorstellen würde]]. Sie [[Eigenschaft der Begleitung|ist freundlich und passt gut zu der Gesellschaft]].

Bei der Übernachtung wäre ein Hotel für uns am besten, da [[Grund für das Hotel|wir nach der Feier lange wach sind und niemanden stören wollen]]. [[Frage zur Übernachtung|Kannst du uns eines empfehlen]]?

Als Geschenk schlage ich [[Geschenkidee|ein Kochbuch mit persönlicher Widmung]] vor, weil [[Grund für das Geschenk|Eddi ja Koch ist und es bestimmt benutzt]].

Außerdem sollten wir nicht vergessen, dass Anfang Oktober [[Wetter im Oktober|das Wetter schon kühl sein kann]]. Deshalb packe ich [[Kleidung|eine warme Jacke und feste Schuhe]] ein. Falls es etwas im Freien gibt, [[Wunsch für die Feier|hoffe ich auf einen sonnigen Tag]].

Ich bin sehr gespannt auf deine Meinung und danke dir noch einmal für die Einladung zu diesem schönen Fest. Teile mir bitte mit, [[Frage an die Freundin|ob du mit meinen Vorschlägen einverstanden bist]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Jennifer]],

danke für deine Mail, hier kurz meine Antworten. [[Reaktion auf die Verspätung|Kein Problem, dass du dich erst jetzt meldest]].

Neuigkeit: [[Reaktion auf die Neuigkeit|Glückwunsch zur Hochzeit deiner Schwester Janine, ich freue mich sehr]]. Eddi als Koch im Hotel [[Eindruck von Eddi|klingt vielversprechend]].

Zusage: Ich komme gern im Oktober. [[Anreise|Ich nehme den Zug und bin am Freitagabend da]].

Begleitung: [[Begleitung|Ich komme allein]], vielleicht bringe ich eine Freundin mit. Das sage ich dir rechtzeitig.

Übernachtung: [[Übernachtung|Ich suche ein einfaches Hotel in der Nähe]]. Falls du eine Idee hast, [[Frage zur Übernachtung|schreib mir bitte die Adresse]].

Geschenk: [[Geschenkidee|Ich schenke eine Reise für zwei und etwas Persönliches]]. Gibt es einen Wunschzettel?

Ich freue mich besonders auf [[Vorfreude|den Moment, wenn Janine ihr Kleid trägt und alle strahlen]]. Dazu bringe ich [[Kleinigkeit|ein paar Taschentücher und eine Kamera]] mit. Und ich möchte [[Redewunsch|ein paar nette Worte für das Brautpaar sagen]], wenn es passt.

Ich freue mich auf die Feier und auf ein Wiedersehen mit dir. Außerdem habe ich mir schon überlegt, wie ich dir helfen kann, denn bei einer Hochzeit gibt es immer viel zu tun, und ich bin gern dabei. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|ob du noch Helfer für den Tag brauchst]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Jennifer]],

kein Problem mit der späten Antwort, ich habe schon befürchtet, du hast mich vergessen! [[Reaktion auf die Verspätung|Zum Glück war es nur der Alltag, der uns beide im Griff hat]]. Schön, dass du schreibst.

Deine Schwester heiratet, und ein Koch kommt in die Familie, was für eine Kombination! [[Reaktion auf die Neuigkeit|Ich gratuliere und melde mich freiwillig als Hochzeitstester]]. Eddi, [[Eindruck von Eddi|ich hoffe, du kochst auch für die Gäste ein Vier-Gänge-Menü]].

Natürlich komme ich im Oktober, mit [[Anreise|dem Zug, dem Koffer und großem Hunger]]. Ich lasse mir doch diese Feier nicht entgehen.

Mit wem? [[Begleitung|Mit meiner Tante Gisela, die jede Hochzeit mit Tränen und Tanz feiert]]. Du siehst, es wird nicht langweilig.

Schlafen: [[Übernachtung|Ein Zimmer in einem Hotel, mit Frühstück und ohne Wecker]]. Ich bin da genügsam. Hast du einen Tipp?

Geschenk: [[Geschenkidee|Ein Set Kochlöffel mit eingravierten Namen, damit Eddi sich nicht streiten muss]]. Alternativ [[Alternative Geschenkidee|ein Gutschein für eine Hochzeitsreise]].

Ein paar praktische Dinge: Ich kann [[Fahrangebot|zwei weitere Gäste im Auto mitnehmen]], falls jemand ohne Auto kommt. Außerdem bringe ich [[Mitbringsel|Süßigkeiten für den Tisch der Kinder]] mit, damit die Kleinen beschäftigt sind. Das erleichtert euch den Tag bestimmt.

Ich bin schon gespannt auf [[Vorfreude|Eddis berühmtes Dessert]]. Schreib mir bald, [[Frage an die Freundin|ob es einen Dresscode gibt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Jennifer]],

als ich deine Mail gelesen habe, musste ich lächeln, weil ich gerade an dich gedacht hatte. [[Reaktion auf die Verspätung|Mach dir keine Sorgen wegen der späten Antwort, wir haben beide viel zu tun]]. Es tut gut, wieder von dir zu hören.

Dass Janine im Oktober heiratet, hat mich sehr bewegt. [[Reaktion auf die Neuigkeit|Ich erinnere mich, wie sie als kleines Mädchen mit Puppen Hochzeit gespielt hat]]. Eddi als Koch im Hotel [[Eindruck von Eddi|ist bestimmt ein toller Mann]].

Selbstverständlich komme ich zur Hochzeit. [[Anreise|Ich nehme den Zug und lese unterwegs ein Buch]]. Ich freue mich schon sehr.

Mitbringen möchte ich [[Begleitung|meinen Mann Ali]], er kennt Janine noch nicht. Er [[Eigenschaft der Begleitung|ist sehr herzlich und wird sich gut verstehen]].

Zur Übernachtung: [[Übernachtung|Wir nehmen ein Hotelzimmer, wenn du uns eines empfehlen kannst]]. Sonst suche ich im Internet.

Mein Geschenk ist ein besonderes: [[Geschenkidee|Ein Album mit Fotos aus Janines Kindheit, das ich zusammenstelle]]. Ich hoffe, es gefällt ihr.

Zur Vorbereitung auf die Feier: Ich lerne [[Vorbereitung|das Lied, das Janine so gern mag, damit ich mitsingen kann]]. Zur Hochzeit trage ich [[Kleidung|einen eleganten Anzug]], und ich freue mich schon darauf, [[Wiedersehen|alte Freunde wiederzusehen]].

Erzähl mir, [[Frage an die Freundin|wie die Vorbereitungen laufen]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Jennifer]],

danke für deine Mail, und mach dir keine Sorgen wegen der späten Antwort. [[Reaktion auf die Verspätung|Das passiert uns allen]]. Ich habe gleich mehrere Vorschläge für die Hochzeit.

Zuerst gratuliere ich dir und Janine zur Hochzeit im Oktober! [[Reaktion auf die Neuigkeit|Ich freue mich schon sehr auf den großen Tag]]. Mein erster Vorschlag: [[Eindruck von Eddi|Eddi kocht doch im Hotel, vielleicht kann das Brautpaar dort feiern]].

Mein zweiter Vorschlag betrifft die Anreise: [[Anreise|Wir bilden eine Fahrgemeinschaft ab dem Hauptbahnhof]]. Ich komme auf jeden Fall.

Mein dritter Vorschlag: Ich bringe [[Begleitung|meine Freundin Mia]] mit. Sie [[Eigenschaft der Begleitung|ist sehr hilfsbereit und schreibt gern Karten]].

Mein vierter Vorschlag ist die Übernachtung: [[Übernachtung|Wir buchen zusammen mit anderen Gästen ein Gruppenzimmer im Hotel]]. Das spart Geld.

Mein fünfter Vorschlag: Als Geschenk [[Geschenkidee|sammeln wir alle gemeinsam für eine Hochzeitsreise]]. Bitte sag mir, [[Frage zum Geschenk|wie viel jeder ungefähr geben soll]].

Auch an die Planung habe ich gedacht: Ich würde gern [[Hilfsangebot|die Fahrgemeinschaften der Gäste organisieren]], weil das viel Stress spart. Für den Abend schlage ich [[Programmpunkt|eine kleine Fotoshow mit Bildern aus Janines Leben]] vor. Das kommt bestimmt gut an.

Ich bin gespannt, wie dir das gefällt, und freue mich auf die Feier. Schreib mir, [[Frage an die Freundin|welche Vorschläge du gut findest]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Jennifer]],

danke für deine Mail. [[Reaktion auf die Verspätung|Du brauchst dich nicht zu entschuldigen, ich verstehe das gut]]. Zur Hochzeit deiner Schwester Janine möchte ich einiges klären, damit alles passt.

Zuerst: Ich gratuliere herzlich zur Hochzeit im Oktober. [[Reaktion auf die Neuigkeit|Ich bin gespannt, wie die Feier wird]]. Dass Eddi Koch ist, [[Eindruck von Eddi|stimmt mich zuversichtlich, was das Essen betrifft]].

Ich würde sehr gern kommen, möchte aber vorher sicher sein, dass es klappt. [[Voraussetzung für die Zusage|Ich muss noch meinen Urlaub einreichen, rechne aber fest damit]]. Die Anreise [[Anreise|plane ich mit dem Zug]].

Ob ich jemanden mitbringe, hängt davon ab, [[Bedingung für die Begleitung|ob mein Freund Zeit hat]]. Das sage ich dir bald.

Bei der Übernachtung wäre ich froh über einen Rat. Einerseits [[Vorteil einer Pension|ist eine Pension günstiger]], andererseits [[Vorteil eines Hotels|ist ein Hotel bequemer]]. Was würdest du empfehlen?

Beim Geschenk bin ich unsicher, was dem Paar gefällt. Vielleicht [[Geschenkidee|ein Gutschein, über den sie selbst entscheiden können]]?

Zur Feier selbst möchte ich noch sagen: Ich komme [[Ankunftszeit|am Freitagabend und bleibe bis Sonntagmittag]]. Falls ihr am Samstag früh Hilfe braucht, [[Hilfsangebot|stehe ich ab acht Uhr bereit]]. Bitte zögere nicht, mich zu fragen.

Ich freue mich sehr auf die Feier und auf dich. Schreib mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Jennifer]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Verspätung|Du musst dich nicht entschuldigen, ich verstehe das]].

Als Nächstes zur Neuigkeit: Herzlichen Glückwunsch zur Hochzeit deiner Schwester Janine im Oktober! [[Reaktion auf die Neuigkeit|Das ist eine wunderbare Nachricht]]. Dass Eddi Koch ist, [[Eindruck von Eddi|finde ich toll]].

Dann zur Zusage: Ich komme gern zur Hochzeit. [[Anreise|Ich fahre mit dem Zug und komme am Freitag an]].

Danach zur Begleitung: [[Begleitung|Ich bringe meinen Freund Hasan mit]]. Er [[Eigenschaft der Begleitung|ist sehr freundlich und mag Hochzeiten]].

Dann zur Übernachtung: [[Übernachtung|Wir würden gern in einem Hotel schlafen]]. Bitte nenne uns [[Frage zur Übernachtung|ein paar Namen mit den Preisen]].

Zuletzt zum Geschenk: [[Geschenkidee|Ich schenke ein Fotobuch und einen Gutschein]]. Möchtest du lieber etwas anderes?

Ich überlege außerdem, was ich anziehe: Vielleicht [[Kleidung|ein helles Kleid mit passenden Schuhen]], aber ich möchte nicht heller als die Braut sein. Darum frage ich dich: [[Frage zur Kleidung|Welche Farbe trägt Janine?]] Zum Schluss [[Vorfreude|freue ich mich einfach auf einen schönen Tag]].

Ich freue mich sehr auf die Feier und auf das Wiedersehen mit dir. Danke noch einmal für deine Einladung, sie bedeutet mir viel, und ich helfe dir gern bei allem, was noch zu tun ist. Wie geht es nun weiter? Schreib mir, [[Frage an die Freundin|wann die offizielle Einladung kommt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Jennifer]],

deine Nachricht hat mich sehr berührt, und mach dir keine Gedanken wegen der späten Antwort. [[Reaktion auf die Verspätung|Ich weiß, dass du für alle da bist und selten Zeit für dich hast]]. Schön, dass du dich gemeldet hast.

Dass deine Schwester Janine im Oktober heiratet, freut mich von Herzen. [[Reaktion auf die Neuigkeit|Ich wünsche den beiden ein langes, glückliches Leben]]. Eddi klingt wie ein [[Eindruck von Eddi|herzlicher Mensch, der gut in die Familie passt]].

Ich komme sehr gern zur Hochzeit. [[Grund für die Zusage|Du bist mir wichtig, und ich möchte diesen Tag mit euch teilen]]. Ich reise [[Anreise|mit dem Zug an]].

Ich bringe [[Begleitung|meine Mutter]] mit, wenn es dir recht ist. Sie [[Eigenschaft der Begleitung|ist herzlich und freut sich auf die Feier]].

Zur Übernachtung wären wir dankbar für [[Übernachtung|ein ruhiges Hotelzimmer in der Nähe]]. Mach dir bitte keinen Stress damit.

Als Geschenk wünsche ich mir, [[Geschenkidee|etwas Persönliches zu schenken, vielleicht ein Bild von den beiden]]. Sag mir, wenn das nicht passt.

Außerdem möchte ich dir etwas versprechen: Ich helfe [[Hilfsangebot|beim Aufbauen und Aufräumen]], damit du den Tag ohne Stress genießen kannst. Ich trage [[Kleidung|ein festliches, aber bequemes Kleid]], und ich lerne [[Vorbereitung|vorher ein bisschen Walzer]]. Das wird bestimmt lustig.

Erzähl mir, [[Frage an die Freundin|wie ich euch bei der Planung helfen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Jennifer]],

alles gut, kein Problem mit der späten Antwort! [[Reaktion auf die Verspätung|Hauptsache, wir schreiben jetzt wieder]]. Hochzeit im Oktober, Glückwunsch! Das ist wirklich eine tolle Nachricht für eure ganze Familie, und ich freue mich riesig für euch alle.

Zu Janine: [[Reaktion auf die Neuigkeit|Richte ihr bitte liebe Grüße aus und sag, dass ich mich riesig freue]]. Eddi ist Koch? [[Eindruck von Eddi|Cool, dann gibt es sicher was Leckeres]].

Ich komme natürlich. [[Anreise|Zug oder Auto, ich schaue noch]]. Das lasse ich mir nicht entgehen.

Begleitung? [[Begleitung|Ich bringe vielleicht meine Freundin Nora mit]]. Ich sage dir rechtzeitig Bescheid.

Schlafen: [[Übernachtung|Hotel oder Pension, ich suche selbst, aber eine Empfehlung ist willkommen]]. Gibt es etwas in der Nähe?

Geschenk: [[Geschenkidee|Ein schönes Fotoalbum und ein kleiner Gutschein]]. Reicht das?

Ich freue mich schon sehr auf die Feier und auf das Wiedersehen mit dir und deiner Familie, und ich helfe auch gern, wenn ihr noch Hände braucht, zum Beispiel [[Hilfsangebot|beim Dekorieren oder Fahren]].

Kurz noch zur Organisation: Ich komme [[Ankunftszeit|am Freitag um 17 Uhr]], und ich trage [[Kleidung|Jeans und ein schickes Hemd]], falls ihr nichts Besonderes wollt. Und weißt du was? Ich freue mich [[Vorfreude|auf ein langes Wochenende mit der ganzen Familie]].

Melde dich, [[Frage an die Freundin|sobald die Einladung fertig ist]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Liebe [[Name der Freundin|Jennifer]],

ich danke dir von Herzen für deine Mail. [[Reaktion auf die Verspätung|Natürlich ist alles in Ordnung, ich schätze es sehr, dass du dich meldest]]. Du bist eine wunderbare Freundin.

Danke, dass du mir die Hochzeit deiner Schwester Janine im Oktober als Erstes erzählst. [[Reaktion auf die Neuigkeit|Ich fühle mich geehrt und gratuliere allen herzlich]]. Dass Eddi Koch in einem Hotel ist, [[Eindruck von Eddi|finde ich bewundernswert]].

Ich komme mit großer Freude. [[Grund für die Zusage|Eine Einladung zu so einem Fest ist ein großes Geschenk für mich]]. Ich reise [[Anreise|mit dem Zug an]].

Dankbar nehme ich auch an, jemanden mitzubringen: [[Begleitung|meinen Freund Daniel]]. Er [[Eigenschaft der Begleitung|ist sehr dankbar für die Einladung]].

Für die Übernachtung bin ich dir dankbar, wenn du mir [[Übernachtung|ein Hotel oder eine Pension empfehlen kannst]]. Du musst dich nicht um mehr kümmern.

Als Dank für die Einladung möchte ich [[Geschenkidee|dem Brautpaar ein schönes Geschenk machen, zum Beispiel ein gemeinsames Fotobuch]]. Hast du eine Idee?

Auch die Anreise habe ich schon geplant: Ich komme [[Ankunftszeit|am Freitagabend]], und ich bringe [[Kleinigkeit|eine Kleinigkeit für die Familie]] mit. Außerdem trage ich [[Kleidung|ein schönes Kleid, das ich extra gekauft habe]]. Das freut mich so sehr, und es zeigt, wie wichtig mir euer Fest ist.

Danke für alles, schreib mir bald, [[Frage an die Freundin|wann ich die Einladung erwarten kann]].

[[Grußformel|Dankbare Grüße]]
[[Dein Name|Nina]]` },
];

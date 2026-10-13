// v2 (B2-style): Claudia lädt zum Zoobesuch ein (Jonas wird fünf). Points: Reaktion auf den Vorschlag · Zoos in Ihrem Heimatland · Ihr Lieblingstier im Zoo ·
// was es bei Ihnen Neues gibt — plus: "länger nicht geschrieben", Jonas' Geburtstag, "Gehst du gern in den Zoo?".
export const kw = [/Vorschlag|Idee|gern|Lust|treffen|zusammen/i, /Heimat|in meinem Land|bei uns|Hauptstadt|in meiner Stadt|zu Hause/i, /Lieblingstier|Tier|Affe|Elefant|Löwe|Pinguin|Giraffe|Tiger|Bär|Delfin|Panda|Papagei|Eisbär/i, /Neues|Neuigkeit|bei mir|in letzter Zeit|erlebt|passiert/i, /Zoo/, /Jonas/, /Geburtstag|fünf/i, /geschrieben|gemeldet|leider|Entschuldig|tut mir leid/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Claudia]],

vielen Dank für deine Mail, ich habe mich sehr darüber gefreut! Du hast recht, wir haben uns lange nicht mehr geschrieben. [[Grund für die Pause|Bei mir war viel zu tun, und die Zeit verging schnell]].

Bei mir gibt es folgende Neuigkeiten: [[Neuigkeiten|Ich habe eine neue Arbeit gefunden und bin in eine größere Wohnung gezogen]]. Das hat mich sehr beschäftigt, aber jetzt bin ich glücklich.

Dass Jonas schon fünf wird, kann ich kaum glauben. [[Glückwunsch an Jonas|Bitte gratuliere ihm herzlich und gib ihm einen Kuss von mir]]. Euer Plan, mit vier Freunden in den Zoo zu gehen, klingt wunderbar.

Ich gehe sehr gern in den Zoo, und mein Lieblingstier ist [[Lieblingstier|der Elefant]], weil [[Grund für das Lieblingstier|er so ruhig und klug ist]].

In meinem Heimatland gibt es auch Zoos: [[Zoo in der Heimat|Der größte liegt in der Hauptstadt und hat über tausend Tiere]]. Besonders [[Besonderheit des Zoos|die Löwen und die Papageien]] sind dort beliebt.

Dein Vorschlag, gemeinsam einen Zoo zu besuchen, gefällt mir sehr. Ich hätte Zeit [[Termin für das Treffen|am ersten Samstag im nächsten Monat]].

Für Jonas' Geburtstag habe ich noch eine Idee: Ich schicke ihm [[Geschenk für Jonas|ein Tierpuzzle mit einem großen Affen]], und für die Kinder im Zoo [[Mitbringsel für die Kinder|kleine Tüten mit Obst und Keksen]]. Das ist nicht viel, aber ich hoffe, es macht ihm Freude. Zu Hause können sie damit [[Spiel|noch einmal alle Tiere suchen]].

Außerdem würde ich mich freuen, wenn wir uns bald wiedersehen: Ich möchte [[Wunsch beim Treffen|mit dir einen langen Spaziergang machen und alles erzählen]]. Bei mir ist [[Neuigkeit|vieles passiert, seit wir uns zuletzt gesehen haben]], und ich bin gespannt auf deine Geschichten.

Schreib mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name der Freundin|Claudia]],

na, das stimmt, wir haben uns ewig nicht geschrieben! [[Grund für die Pause|Ich war ständig unterwegs und habe die Zeit total vergessen]]. Schön, dass du dich meldest.

Neues bei mir? [[Neuigkeiten|Ich habe angefangen, Gitarre zu spielen, und war zweimal im Urlaub]]. Sonst ist alles beim Alten.

Jonas wird fünf, wow! [[Glückwunsch an Jonas|Sag ihm bitte alles Gute, ich bringe ihm einen Plüschaffen mit]]. Ein Zoobesuch mit vier Freunden klingt nach einem tollen Geburtstag.

Ob ich gern in den Zoo gehe? Und wie! Mein Lieblingstier ist [[Lieblingstier|der Pinguin]], denn [[Grund für das Lieblingstier|er watschelt so lustig]].

Bei uns gibt es auch Zoos: [[Zoo in der Heimat|In der Hauptstadt gibt es einen großen mit vielen Tieren]]. Aber [[Besonderheit des Zoos|der ist nicht so modern wie eure Zoos hier]].

Ein gemeinsamer Zoobesuch? Gern! [[Termin für das Treffen|Wie wäre es mit dem Wochenende nach Jonas' Geburtstag]]?

Zum Zoobesuch selbst habe ich auch Gedanken: Am besten gehen wir morgens hin, weil [[Grund für die Uhrzeit|die Tiere dann noch ganz munter sind]]. Wir sollten [[Zeitplan|um zehn Uhr am Eingang anfangen]] und [[Pause|mittags eine lange Pause mit Picknick machen]]. So bleiben die Kinder gut gelaunt.

Übrigens: Ich habe in letzter Zeit [[Hobby|angefangen zu malen]], und für Jonas male ich [[Geschenkidee|ein Bild von seinem Lieblingstier]]. Ich bringe es mit, wenn wir uns treffen. Das ist zwar klein, aber es kommt von Herzen.

Melde dich, [[Frage an die Freundin|ob das klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Claudia]],

wow, was für ein schöner Brief! Entschuldige bitte, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Der Alltag hatte mich im Griff, jetzt freue ich mich umso mehr]].

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeiten|Ich habe endlich meinen Führerschein bestanden und plane eine große Reise]]. Das war ein langer Weg.

Jonas wird fünf, das ist fantastisch! [[Glückwunsch an Jonas|Ich wünsche ihm einen Tag voller Staunen, Eis und Tiere]]. Mit vier Freunden im Zoo, das wird bestimmt unvergesslich.

Und ob ich gern in den Zoo gehe! Mein Lieblingstier ist [[Lieblingstier|der Eisbär]], weil [[Grund für das Lieblingstier|er so mächtig und gleichzeitig verspielt ist]].

In meinem Heimatland gibt es einen wunderschönen Zoo: [[Zoo in der Heimat|Er liegt am Rand der Hauptstadt und hat einen riesigen Park]]. Besonders [[Besonderheit des Zoos|die Giraffen sind dort ein Highlight]].

Deine Idee, zusammen in einen Zoo zu gehen, finde ich großartig! [[Termin für das Treffen|Wie wäre es mit einem Sonntag im Frühling]]?

Ich freue mich schon auf den Tag im Zoo: [[Vorfreude|Die Fütterungen und die Streichelwiese]] sind bestimmt das Schönste für die Kinder. Du kannst [[Aufgabe der Freundin|die Eintrittskarten für alle besorgen]], und ich kümmere mich um [[Aufgabe von mir|Getränke und Obst]]. Dann teilen wir die Arbeit gerecht.

Ein Wort noch zu den Zoos: Der Zoo in meiner Stadt hat [[Besonderheit|ein großes Elefantenhaus und einen Streichelzoo]]. Ich glaube, das würde Jonas gefallen. Vielleicht können wir [[Vorschlag|einen Ausflug dorthin planen, wenn ihr mich einmal besucht]].

Schreib mir bald, [[Frage an die Freundin|was du davon hältst]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Claudia]],

vielen Dank für deine Nachricht. Zu deinen Fragen nehme ich der Reihe nach Stellung.

Erstens, die Pause: Es stimmt, dass wir uns lange nicht geschrieben haben. [[Grund für die Pause|Ich hatte beruflich viel zu tun und wenig Freizeit]].

Zweitens, die Neuigkeiten: [[Neuigkeiten|Ich habe eine Weiterbildung begonnen und bin befördert worden]].

Drittens, Jonas: Zu seinem fünften Geburtstag gratuliere ich herzlich. [[Glückwunsch an Jonas|Ich wünsche ihm einen schönen Tag im Zoo]].

Viertens, der Zoo: Ich gehe gern in den Zoo. Mein Lieblingstier ist [[Lieblingstier|das Zebra]], weil [[Grund für das Lieblingstier|seine Streifen so einzigartig sind]]. Zoos in meinem Heimatland gibt es auch: [[Zoo in der Heimat|Der bekannteste liegt in der Hauptstadt]].

Fünftens, dein Vorschlag: Ich besuche gern mit dir einen Zoo, [[Termin für das Treffen|am liebsten am Wochenende im nächsten Monat]].

Falls es regnet, habe ich einen Plan: Wir gehen [[Regenplan|in das Tropenhaus und in das Aquarium]], weil dort alles überdacht ist. Ich bringe [[Regenschutz|Regenjacken für die Kinder]] mit. Das ist praktisch und vorsorglich, und die Kinder haben trotzdem viel Freude.

Falls es euch passt, könnte ich auch [[Angebot|einen Tag früher kommen und beim Vorbereiten helfen]]. Dann hätten wir noch Zeit zum Reden, und Jonas könnte mir [[Wunsch von Jonas|seine Lieblingstiere zeigen]]. Das wäre ein schöner Anfang für das Wochenende.

Bitte teile mir mit, [[Frage an die Freundin|ob dir dieser Termin passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Claudia]],

danke für deine Mail! Es tut mir leid, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Ich hatte eine anstrengende Zeit bei der Arbeit]], aber jetzt bin ich wieder da.

Bei mir gibt es [[Neuigkeiten|ein paar Veränderungen, ich habe die Abteilung gewechselt]].

Für Jonas' fünften Geburtstag habe ich eine praktische Idee: [[Hilfsangebot|Ich kann ein Spiel für die Kinder im Zoo vorbereiten, zum Beispiel eine Tiersuche]]. Gern auch [[Weitere Hilfe|belegte Brote für alle Kinder mitbringen]].

Ich gehe gern in den Zoo, mein Lieblingstier ist [[Lieblingstier|der Löwe]], weil [[Grund für das Lieblingstier|er so majestätisch aussieht]].

In meinem Heimatland gibt es Zoos, zum Beispiel [[Zoo in der Heimat|in der Hauptstadt mit einem großen Tierpark]]. Dort [[Besonderheit des Zoos|gibt es auch Fütterungen für Kinder]].

Einen gemeinsamen Zoobesuch finde ich praktisch und schön. [[Termin für das Treffen|Passt dir ein Wochenende im Mai]]?

Dazu noch eine Kleinigkeit: Für Jonas packe ich [[Geschenk für Jonas|ein Buch über Affen mit großen Bildern]] ein, und für dich [[Geschenk für die Freundin|eine kleine Spezialität aus meiner Heimat]]. Es ist schön, dass wir uns endlich wiedersehen, denn [[Grund für die Freude|ich habe dich wirklich vermisst]].

Zum Schluss noch ein persönlicher Gedanke: Ich finde es schön, dass [[Dank|du mich nach so langer Zeit nicht vergessen hast]]. Das bedeutet mir viel, denn [[Grund|Freundschaft ist mir wichtig]]. Ich verspreche, in Zukunft regelmäßig zu schreiben.

Sag mir bitte, [[Frage an die Freundin|wann ich euch helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Claudia]],

ich habe so lange nicht geschrieben, weil [[Grund für die Pause|ich viel arbeiten musste und abends müde war]]. Das tut mir leid. Dafür freue ich mich jetzt über deine Mail.

Bei mir gibt es folgende Neuigkeiten: [[Neuigkeiten|Ich habe die Stelle gewechselt, weil ich mehr Verantwortung wollte]].

Jonas wird fünf, deshalb möchte ich ihm gratulieren: [[Glückwunsch an Jonas|Fünf ist ein tolles Alter, in dem Kinder viel entdecken]]. Ein Zoo ist ideal, da [[Grund für den Zoo|Kinder dort lernen und spielen können]].

Ich gehe gern in den Zoo, mein Lieblingstier ist [[Lieblingstier|der Panda]], weil [[Grund für das Lieblingstier|er so friedlich und süß ist]].

In meinem Heimatland gibt es Zoos, [[Zoo in der Heimat|vor allem in großen Städten]], weil [[Grund für Zoos|viele Familien Ausflüge machen möchten]].

Dein Vorschlag, gemeinsam einen Zoo zu besuchen, überzeugt mich, [[Termin für das Treffen|besonders an einem Sonntag im Sommer]].

Meine Erfahrung mit Kindern im Zoo: Sie wollen [[Wunsch der Kinder|alles anfassen und alles fragen]]. Deshalb bringe ich [[Hilfsmittel|ein kleines Notizbuch mit Tierstickern]] mit, damit sie sich beschäftigen können. Ich denke, das lenkt sie ab und macht Spaß.

Ich möchte dir auch noch sagen, dass ich oft an euch gedacht habe: Wenn ich [[Anlass|im Fernsehen einen Tierfilm sehe]], denke ich sofort an Jonas. Und [[Weiterer Anlass|bei Zoobildern im Internet]] muss ich lächeln. Es wird schön sein, euch wiederzusehen.

Schreib mir, [[Frage an die Freundin|ob meine Idee gut klingt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Claudia]],

danke für deine Mail, hier kurz meine Antworten.

Pause: Entschuldige, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Ich hatte viel zu tun]].

Neues: [[Neuigkeiten|Ich habe einen neuen Job in einem Reisebüro]].

Jonas: Alles Gute zum fünften Geburtstag! [[Glückwunsch an Jonas|Viel Spaß mit den Affen und den Freunden]].

Zoo: Ich gehe gern in den Zoo. Lieblingstier: [[Lieblingstier|der Tiger]], weil [[Grund für das Lieblingstier|er so elegant ist]]. In meinem Heimatland: [[Zoo in der Heimat|Es gibt einen großen Zoo in der Hauptstadt]].

Dein Vorschlag: Ja, gern! [[Termin für das Treffen|Wie wäre es mit dem 10. Mai]]?

Ich schlage außerdem vor, dass wir [[Vorschlag für den Zoobesuch|ein gemeinsames Foto bei den Affen machen]], damit Jonas später ein schönes Andenken hat. Danach [[Plan nach dem Zoo|trinken wir zusammen einen Kakao und essen Kuchen]]. Das wird sicher ein gelungener Tag.

Für den Fall, dass das Wetter schlecht ist, habe ich [[Alternative|ein Spiel mit Tierkarten]] dabei, das wir drinnen spielen können. Außerdem kenne ich [[Weitere Idee|ein Kindermuseum in der Nähe]], falls ihr Lust habt. Dann geht es bestimmt auch bei Regen lustig zu.

Ich freue mich sehr auf euch und auf einen schönen Tag mit den Kindern, und ich bin gespannt auf alle Geschichten. Schreib mir bitte kurz, [[Frage an die Freundin|ob das geht]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Claudia]],

wir haben uns lange nicht geschrieben, ich weiß, ich war quasi im Winterschlaf wie ein Bär. [[Grund für die Pause|Die Arbeit hat mich gefressen, aber jetzt bin ich wach]]. Verzeih mir bitte.

Neues bei mir? [[Neuigkeiten|Ich habe versucht zu kochen, und mein Rauchmelder kennt mich jetzt persönlich]]. Sonst läuft alles gut.

Jonas wird fünf, das ist ein Grund zum Feiern! [[Glückwunsch an Jonas|Sag ihm, dass er ab jetzt offiziell Zoobesuch auf Expertenniveau machen darf]]. Mit vier Freunden wird das ein lautes Fest.

Ob ich gern in den Zoo gehe? Ich gehe sogar freiwillig. Mein Lieblingstier ist [[Lieblingstier|das Faultier]], weil [[Grund für das Lieblingstier|es mich an mich am Sonntag erinnert]].

Zoos in meinem Heimatland gibt es auch, [[Zoo in der Heimat|aber die Tiere sind dort angeblich entspannter]].

Deine Idee, zusammen in einen Zoo zu gehen, nehme ich sofort an. [[Termin für das Treffen|Wie wäre es mit einem Wochenende, an dem die Affen gute Laune haben]]?

Zum Thema Zoo muss ich dir noch etwas erzählen: [[Erlebnis im Zoo|Ein Affe hat mir als Kind ein Futterpaket aus der Hand genommen]]. Seitdem [[Folge des Erlebnisses|achte ich immer gut auf meine Taschen]]. Das erzähle ich auch den Kindern, die werden lachen.

Du fragst, ob ich gern in den Zoo gehe: Ja, besonders weil [[Grund|ich die Ruhe bei den Tieren mag]]. Beim Beobachten [[Erlebnis|vergesse ich Zeit und Stress]]. Mit Jonas zusammen wird es doppelt schön, denn Kinder sehen alles mit neuen Augen.

Schreib mir bald, [[Frage an die Freundin|ob ich Bananen mitbringen soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Claudia]],

als ich deine Mail gelesen habe, musste ich an unsere Studienzeit denken. [[Erinnerung an früher|Wir haben damals jede freie Minute zusammen verbracht]]. Dass wir uns so lange nicht geschrieben haben, tut mir leid.

Warum ich nicht geschrieben habe? [[Grund für die Pause|Ich war lange krank und musste mich erholen]]. Jetzt geht es mir wieder gut. Bei mir gibt es [[Neuigkeiten|außerdem eine neue Wohnung und neue Nachbarn]].

Dass Jonas schon fünf wird, hat mich gerührt. [[Glückwunsch an Jonas|Ich erinnere mich noch an die Fotos, als er ein Baby war]]. Ein Zoobesuch ist die perfekte Idee.

Ich gehe gern in den Zoo. Als Kind war ich oft dort, und mein Lieblingstier ist [[Lieblingstier|die Giraffe]], [[Grund für das Lieblingstier|weil ich als Kind so staunen musste]].

In meinem Heimatland gibt es auch einen Zoo: [[Zoo in der Heimat|Ich war als Kind jeden Sommer dort]]. Er ist [[Besonderheit des Zoos|kleiner als die Zoos in Deutschland]].

Gemeinsam einen Zoo zu besuchen, wäre wunderbar. [[Termin für das Treffen|Wann hast du Zeit]]?

Ich überlege außerdem, was ich anziehe: [[Kleidung|bequeme Schuhe und eine leichte Jacke]], weil wir viel laufen. Und ich bringe [[Mitbringsel|eine Kamera und Sonnencreme]] mit. Außerdem habe ich vor, [[Plan|ganz viele Fotos für Jonas zu machen]].

Außerdem wollte ich fragen, [[Frage|wie es deinem Mann und dem Rest der Familie geht]]. Ich hoffe, dass bei euch [[Wunsch|alles gesund und gut ist]]. Wenn ihr Hilfe braucht, [[Hilfsangebot|sagt mir bitte Bescheid]], ich unterstütze euch gern.

Erzähl mir, [[Frage an die Freundin|was Jonas sich zum Geburtstag wünscht]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Claudia]],

danke für deine Mail, und entschuldige, dass wir uns so lange nicht geschrieben haben. [[Grund für die Pause|Ich hatte viel Arbeit und kaum freie Tage]]. Ich habe gleich mehrere Vorschläge.

Zuerst zu Jonas: [[Glückwunsch an Jonas|Alles Gute zum Geburtstag und viel Freude im Zoo]]. Mein erster Vorschlag: Nehmt [[Vorschlag für den Zoobesuch|kleine Brotzeiten und eine Decke für ein Picknick mit]].

Mein zweiter Vorschlag: Wir besuchen den Zoo zusammen, [[Termin für das Treffen|an einem Samstag im Juni]]. Ich bringe auch [[Mitbringsel|ein kleines Geschenk für Jonas]] mit.

Zu mir: Ich gehe gern in den Zoo. Mein Lieblingstier ist [[Lieblingstier|der Delfin]]. Bei mir gibt es [[Neuigkeiten|außerdem eine Reise, die ich plane]].

In meinem Heimatland gibt es Zoos, zum Beispiel [[Zoo in der Heimat|in der Hauptstadt mit einem großen Affenhaus]].

Ich möchte auch noch erwähnen, wie sehr ich mich auf Jonas freue: Ich habe ihn [[Zeit seit dem letzten Treffen|seit zwei Jahren nicht gesehen]], und er ist bestimmt [[Veränderung|schon so groß geworden]]. Es wird schön sein, [[Wunsch|mit ihm zusammen die Tiere anzuschauen]].

Mein Vorschlag für den Ablauf: Wir treffen uns [[Treffpunkt|vor dem Haupteingang]], gehen zuerst zu [[Erstes Ziel|den Affen]] und machen danach [[Pause|eine Pause bei den Pinguinen]]. Am Ende können die Kinder [[Abschluss|einen Spielplatz im Zoo besuchen]].

Was hältst du von meinen Vorschlägen? Schreib mir, [[Frage an die Freundin|welcher dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Claudia]],

danke für deine Mail. Ich habe mich lange nicht gemeldet, und das tut mir leid. [[Grund für die Pause|Es lag nicht an dir, sondern an meinem Terminkalender]]. Zu deinen Fragen möchte ich vorsichtig antworten.

Bei mir gibt es [[Neuigkeiten|einige Veränderungen, die noch nicht ganz sicher sind]]. Das erzähle ich dir lieber persönlich.

Jonas wird fünf, das ist schön. [[Glückwunsch an Jonas|Ich gratuliere ihm herzlich und wünsche ihm einen schönen Tag]]. Ein Zoo ist einerseits wunderbar für Kinder, andererseits [[Nachteil des Zoos|kann es dort sehr voll sein]].

Ich gehe gern in den Zoo, mein Lieblingstier ist [[Lieblingstier|das Nashorn]], obwohl ich [[Einschränkung|nicht alle Tiere gleich gern mag]].

In meinem Heimatland gibt es Zoos, [[Zoo in der Heimat|allerdings nicht in jeder Stadt]].

Ich würde gern mit dir den Zoo besuchen, [[Termin für das Treffen|wenn ich an dem Tag Zeit habe, am liebsten im Frühling]].

Falls du Hilfe beim Planen brauchst, sag Bescheid: Ich kann [[Hilfsangebot|die Einladungen für die vier Freunde schreiben]] und [[Weitere Hilfe|für alle Kinder kleine Geschenktüten packen]]. Das mache ich wirklich gern, denn Jonas ist mir wichtig.

Ich merke, dass ich mich sehr auf den Zoo freue. Seit meiner Kindheit [[Erinnerung|habe ich Tiere geliebt]], und [[Weitere Erinnerung|ich wollte sogar einmal Tierärztin werden]]. Das erzähle ich Jonas gern, vielleicht hört er mir zu.

Schreib mir bitte, [[Frage an die Freundin|ob dir das recht ist]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Claudia]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: Es tut mir leid, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Ich war beruflich sehr eingespannt]].

Als Nächstes zu meinen Neuigkeiten: [[Neuigkeiten|Ich habe eine neue Aufgabe im Team übernommen]].

Dann zu Jonas: [[Glückwunsch an Jonas|Herzlichen Glückwunsch zum fünften Geburtstag]]!

Danach zum Zoo: Ich gehe gern in den Zoo. Mein Lieblingstier ist [[Lieblingstier|der Gorilla]]. In meinem Heimatland gibt es [[Zoo in der Heimat|einige Zoos, der größte in der Hauptstadt]].

Zuletzt zu deinem Vorschlag: Ich besuche gern mit dir einen Zoo, [[Termin für das Treffen|im Mai oder Juni]].

Ich freue mich besonders auf die Kinder: Sie sind [[Eigenschaft der Kinder|so offen und neugierig]], und ich möchte [[Wunsch|ihnen einige Wörter in meiner Sprache beibringen]]. Das wird bestimmt ein Spaß, und Jonas lernt gleich etwas Neues über [[Thema|die Tiere in meiner Heimat]].

Noch etwas Praktisches: Ich kann [[Fahrangebot|mit dem Zug oder mit dem Bus kommen]], je nachdem, was bei euch besser passt. Gib mir [[Information|die Adresse und den Weg zum Eingang]], dann finde ich mich zurecht. Ich bin pünktlich da, versprochen.

Ich freue mich auf das Wiedersehen mit dir und auf Jonas. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Claudia]],

deine Mail hat mich sehr gefreut. Es tut mir leid, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Ich wollte mich oft melden, aber der Alltag war stärker]]. Ich hoffe, dir und deiner Familie geht es gut.

Bei mir gibt es [[Neuigkeiten|gute Neuigkeiten, ich habe mich beruflich neu orientiert]]. Ich bin glücklich damit.

Dass Jonas fünf wird, freut mich von Herzen. [[Glückwunsch an Jonas|Ich wünsche ihm alles Liebe und einen unvergesslichen Tag]]. Ein Zoobesuch mit seinen Freunden ist ein wunderschönes Geschenk.

Ich gehe gern in den Zoo. Mein Lieblingstier ist [[Lieblingstier|das Känguru]], weil [[Grund für das Lieblingstier|es so freundlich aussieht]].

In meinem Heimatland gibt es Zoos, [[Zoo in der Heimat|in denen Familien gern Zeit verbringen]].

Euren Vorschlag, gemeinsam einen Zoo zu besuchen, nehme ich dankbar an. [[Termin für das Treffen|Gern an einem Wochenende, das euch passt]].

Zum Schluss noch ein Plan: Nach dem Zoo könnten wir [[Plan nach dem Zoo|in ein Café gehen oder auf einem Spielplatz bleiben]]. Ich lade die Kinder [[Einladung|zu einem Eis ein]], als Geburtstagsgeschenk. Ich hoffe, dass dir das recht ist.

Und wenn wir wieder zu Hause sind, erzähle ich dir von meiner neuen Arbeit: [[Thema|die Kollegen, die Aufgaben und meine Wünsche für die Zukunft]]. Dann können wir bei einem Kaffee [[Wunsch|noch lange über alles reden]], während Jonas spielt.

Erzähl mir, [[Frage an die Freundin|wie es euch geht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Claudia]],

ja, stimmt, wir haben ewig nicht geschrieben. Sorry! [[Grund für die Pause|Ich hatte viel um die Ohren]]. Jetzt bin ich wieder da.

Neues? [[Neuigkeiten|Neuer Job, neue Stadt, alles gut]].

Jonas wird fünf, krass! [[Glückwunsch an Jonas|Alles Gute und viel Spaß im Zoo]]!

Ich gehe gern in den Zoo. Lieblingstier: [[Lieblingstier|der Wolf]], weil [[Grund für das Lieblingstier|er so wild ist]]. Bei uns gibt es [[Zoo in der Heimat|einen Zoo in der Hauptstadt]].

Zusammen in den Zoo? Gern! [[Termin für das Treffen|Irgendwann im Sommer, wenn du Zeit hast]].

Und wenn wir uns treffen, erzähle ich dir ausführlich von meinem Leben: [[Thema der Erzählung|die neue Stadt, die Arbeit und meine Pläne]]. Ich bin gespannt, [[Neugier|was bei dir und Jonas alles passiert ist]]. Wir haben bestimmt viel zu erzählen und viel zu lachen.

Eine letzte Sache: Ich habe mir überlegt, dass wir die Kinder [[Idee für die Kinder|ein Tierquiz machen lassen, bei dem jedes Kind eine Aufgabe bekommt]]. Dazu bringe ich [[Material|bunte Karten und kleine Preise]] mit. So wird der Geburtstag zu einem Abenteuer, das alle Kinder lange in Erinnerung behalten.

Ich freue mich echt auf euch und auf den Zoo, das wird bestimmt ein toller Tag mit den Kindern und viel Eis. Meld dich, [[Frage an die Freundin|wann es bei dir passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

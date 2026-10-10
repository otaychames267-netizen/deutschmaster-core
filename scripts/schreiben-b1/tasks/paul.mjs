// v2 (B2-style): Paul schlägt einen mehrtägigen Wanderausflug nach Südtirol vor (Anfang Juni) und fragt nach Meinung, Termin, Begleitung. Points: ob der Termin für Sie in Ordnung ist · Reaktion auf Pauls Vorschlag ·
// ob Sie jemanden mitbringen möchten · was Sie noch von Paul wissen wollen — plus: "Was hältst du davon?", Anfang Juni wegen der Hitze, Berge wunderschön.
export const kw = [/Termin|Juni|Zeit|passt/i, /Südtirol|Vorschlag|Idee|Wandern|Berge/i, /mitbring|mitkomm|jemand|allein|Freund|Bruder|Schwester/i, /Unterkunft|Hütte|Hotel|Wetter|Ausrüstung|Schuhe|kosten|Kosten|Route|wie viele|wie lange|Anreise/i, /\?/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Paul]],

endlich habe ich wieder etwas von dir gehört! Dein Vorschlag, nach Südtirol zu fahren, gefällt mir. [[Reaktion auf den Vorschlag|Die Berge dort sind wunderschön, mehrere Tage wandern ist mein Wunsch]]. Ich bin sofort dabei.

Der Termin Anfang Juni ist für mich in Ordnung. [[Grund für den Termin|Ich habe in der ersten Juniwoche Urlaub, und das Wetter ist dann noch angenehm]]. Wenn es dir lieber ist, passt mir auch [[Alternativtermin|das Wochenende danach]].

Du fragst, ob ich jemanden mitbringe: [[Begleitung|Ja, meine Schwester würde gern mitkommen, sie wandert sehr gern]]. Ich hoffe, das ist für dich in Ordnung.

Ich habe noch einige Fragen: [[Frage zur Unterkunft|Wo übernachten wir, in Hütten oder in einem Hotel]]? Und [[Frage zu den Kosten|wie viel kostet das ungefähr pro Person]]? Außerdem möchte ich wissen, [[Frage zur Route|wie lang die Tagesetappen sind und wie anstrengend die Strecken]].

Zur Vorbereitung [[Vorbereitung|laufe ich schon jetzt jeden Abend eine Stunde und kaufe mir feste Wanderschuhe]].

Zur Ausrüstung habe ich noch eine Frage: [[Frage zur Ausrüstung|Was packen wir ein, und brauchen wir Stöcke oder Regenkleidung]]? Ich besitze [[Besitz|Wanderschuhe und einen kleinen Rucksack]], aber vielleicht fehlt noch etwas. Wenn du mir eine Liste schickst, besorge ich alles rechtzeitig und gehe nichts vergessen.

Dass du Südtirol vorschlägst, ist mutig und gut: [[Lob|Du hast sicher schon viel gelesen und die richtigen Orte im Kopf]]. Ich vertraue deiner Wahl, und ich freue mich, [[Gefühl|dass wir wieder gemeinsam etwas erleben]]. Es ist lange her, dass wir zuletzt gewandert sind.

Zum Termin noch ein Gedanke: [[Hinweis|Anfang Juni sind Feiertage, deshalb sollten wir schnell buchen]]. Falls du die Reise etwas verschieben möchtest, [[Alternative|passe ich mich an, ich habe flexible Arbeitszeiten]]. Aber der erste Termin gefällt mir am besten.

Schreib mir bitte, [[Frage an den Freund|ob du die Unterkünfte schon reserviert hast]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Paul]],

cool, dass du dich meldest! Südtirol? Mega Idee! [[Reaktion auf den Vorschlag|Berge, frische Luft und mehrere Tage wandern, da bin ich sofort dabei]].

Anfang Juni passt super, [[Grund für den Termin|dann ist es nicht zu heiß und der Chef ist gnädig]]. Falls nicht, [[Alternativtermin|geht auch Mitte Juni]].

Mitbringen? [[Begleitung|Ich komme allein, vielleicht bringe ich meinen Bruder mit, ich frage ihn noch]]. Ist das okay?

Was ich noch wissen will: [[Frage zur Unterkunft|Schlafen wir in Berghütten, und gibt es Frühstück]]? [[Frage zu den Kosten|Wie teuer wird der Spaß]]? [[Frage zur Route|Wie viele Kilometer laufen wir pro Tag]]?

Vorbereitung: [[Vorbereitung|Ich besorge mir neue Schuhe und gehe vorher ein paarmal wandern]].

Ich wollte noch fragen, [[Frage|wie wir hinkommen und was wir mit dem Gepäck machen]]. Mit dem Zug nach Bozen ist bequem, und von dort geht es [[Anreise|mit dem Bus weiter]]. Wenn du ein Auto hast, [[Alternative|können wir uns die Kosten teilen]].

Ich weiß, dass Südtirol für seine Dolomiten bekannt ist: [[Wissen|schroffe Felsen, grüne Almen und kleine Dörfer mit Kirchen]]. Das macht die Gegend so besonders. Ich würde gern [[Wunsch|einmal den Sonnenaufgang auf einer Hütte erleben]], falls das möglich ist.

Falls Anfang Juni doch nicht klappt, wäre [[Alternativtermin|die zweite Juniwoche eine gute Alternative]]. Dann sind die Hütten ebenfalls offen, und das Wetter ist ähnlich. Sag mir bitte, ob du lieber früher oder später fährst, [[Frage|damit ich meinen Urlaub rechtzeitig einreiche]].

Meld dich, [[Frage an den Freund|wann wir die Route planen]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Paul]],

wow, was für ein toller Vorschlag! Südtirol ist ein Traum. [[Reaktion auf den Vorschlag|Ich freue mich riesig auf die Berge, die Hütten und das gemeinsame Wandern]]. Danke, dass du an mich gedacht hast.

Anfang Juni ist perfekt, [[Grund für den Termin|dann blühen die Wiesen, und es ist angenehm kühl]]. Ich habe schon [[Urlaubsplan|zwei Wochen vorher freigenommen]].

Mitbringen möchte ich [[Begleitung|meine Freundin Lea, sie liebt Berge und ist sehr nett]].

Ich habe noch Fragen: [[Frage zur Unterkunft|Gibt es schon eine Unterkunft, vielleicht eine Hütte mit Aussicht]]? [[Frage zu den Kosten|Wie hoch sind die Kosten]]? [[Frage zur Route|Welche Tour planst du für den ersten Tag]]?

Ich bereite mich vor mit [[Vorbereitung|langen Spaziergängen und einem neuen Rucksack]].

Mich interessiert auch das Wetter: [[Frage|Ist es Anfang Juni in den Bergen noch kalt]]? Davon hängt ab, was ich einpacke. Ich lese vorher die Wettervorhersage und [[Plan|packe zur Sicherheit eine warme Jacke ein]].

Mehrere Tage zu wandern, [[Gedanke|ist für mich eine Gelegenheit, abzuschalten]]. Im Alltag ist so viel los, dass ich oft vergesse, durchzuatmen. Mit dir und den Bergen wird das gelingen, da bin ich sicher, [[Folge|und ich komme erholt zurück]].

Ich habe in meinem Kalender nachgesehen: [[Termin|In der ersten Juniwoche habe ich keine Termine]]. Das passt also bestens. Wenn du mir sagst, welche Tage genau du meinst, [[Folge|trage ich sie sofort ein und halte sie frei]].

Schreib mir bald, [[Frage an den Freund|wann wir buchen]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Paul]],

danke dir für deine schnelle Antwort. Ich antworte dir auf jeden Punkt einzeln.

Erstens, der Termin: Anfang Juni ist für mich in Ordnung. [[Grund für den Termin|Ich habe in dieser Zeit Urlaub]].

Zweitens, dein Vorschlag: [[Reaktion auf den Vorschlag|Ich finde die Idee gut, Südtirol ist ein beliebtes Wandergebiet]].

Drittens, die Begleitung: [[Begleitung|Ich bringe meinen Bruder mit, wenn das für dich passt]].

Viertens, meine Fragen: [[Frage zur Unterkunft|Welche Unterkünfte hast du geplant]]? [[Frage zu den Kosten|Mit welchen Kosten müssen wir rechnen]]? [[Frage zur Route|Wie viele Tage und Kilometer sind vorgesehen]]?

Fünftens, die Vorbereitung: [[Vorbereitung|Ich besorge Wanderschuhe und trainiere vorher]].

Ergänzend frage ich mich, [[Frage|ob wir einen Ruhetag einplanen, falls jemand Blasen bekommt oder müde ist]]. Das ist bei mehrtägigen Touren sinnvoll. Ich habe selbst [[Erfahrung|einmal eine Wanderung abbrechen müssen, weil ich zu schnell los bin]]. Das möchte ich vermeiden.

Dein Vorschlag passt zu meinen Plänen: [[Plan|Ich wollte dieses Jahr ohnehin etwas Aktives machen]]. Eine Bergtour ist ideal, [[Grund|weil sie Körper und Kopf guttut]]. Ich bin gespannt, welche Route du aussuchst, und freue mich auf deine Ideen.

Der Termin Anfang Juni ist auch deshalb gut, weil [[Grund|die Wege nach dem Winter meist schon frei von Schnee sind]]. Das hilft bei der Planung. Allerdings [[Einschränkung|sollte man auf Hochwasser achten]], also auf Bäche, die im Frühling viel Wasser führen.

Bitte teile mir mit, [[Frage an den Freund|ob du eine Route schon ausgesucht hast]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Paul]],

ich habe dein Schreiben gelesen und antworte dir gern. [[Reaktion auf den Vorschlag|Südtirol ist eine tolle Idee, und ich helfe dir gern bei der Planung]]. Mehrere Tage wandern, das möchte ich schon lange.

Der Termin Anfang Juni passt mir. [[Grund für den Termin|Ich kann mir die Woche freihalten]].

Mitbringen möchte ich [[Begleitung|einen Freund, der Erfahrung mit Bergtouren hat]]. Er kann [[Praktische Hilfe|uns bei der Navigation helfen]].

Fragen: [[Frage zur Unterkunft|Brauchen wir Reservierungen für die Hütten]]? [[Frage zu den Kosten|Was kosten Übernachtung und Verpflegung]]? [[Frage zur Route|Welche Strecke ist geplant]]?

Praktisch: [[Vorbereitung|Ich kann eine Packliste schreiben und Wanderkarten besorgen]].

Praktisch wäre es, wenn wir [[Idee|eine gemeinsame Packliste erstellen]], damit nicht jeder alles doppelt mitnimmt. Ich kann [[Hilfsangebot|ein Dokument anlegen, das wir beide bearbeiten]]. So bleibt der Rucksack leicht, und wir vergessen nichts Wichtiges.

Ich finde, dass Südtirol [[Meinung|ein ideales Ziel für alle Sinne ist: gutes Essen, tolle Aussichten und freundliche Menschen]]. Ich habe schon viel Positives gehört, [[Quelle|von Kollegen und aus Reiseberichten]]. Jetzt möchte ich es endlich selbst erleben.

Praktisch ist, dass ich zu Hause schon [[Vorrat|Landkarten von Südtirol habe]], die ich dir gern leihe oder fotografiere. Wir können [[Plan|die Route gemeinsam auf der Karte durchgehen]], bevor wir buchen. So sehen wir, welche Tour passt.

Sag mir bitte, [[Frage an den Freund|was ich noch vorbereiten soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Paul]],

dein Vorschlag gefällt mir, weil [[Grund für die Zustimmung|ich gern in den Bergen bin und mehrere Tage am Stück Zeit brauche]]. [[Reaktion auf den Vorschlag|Südtirol ist ein perfektes Ziel]].

Der Termin passt mir, denn [[Grund für den Termin|Anfang Juni habe ich Urlaub, und es ist nicht zu heiß]].

Ich bringe [[Begleitung|meine Schwester]] mit, weil [[Grund für die Begleitung|sie gern wandert und gute Laune mitbringt]].

Ich habe Fragen, weil ich gut vorbereitet sein möchte: [[Frage zur Unterkunft|Wo übernachten wir]]? [[Frage zu den Kosten|Was kostet es]]? [[Frage zur Route|Wie lang sind die Etappen]]?

Zur Vorbereitung [[Vorbereitung|trainiere ich meine Kondition]], da [[Grund für das Training|die Berge anstrengend sein können]].

Mich würde interessieren, [[Frage|wie viele Leute noch mitkommen]]. Das beeinflusst die Unterkunft und die Kosten. Ich bin mir sicher, dass je mehr, desto lustiger, aber [[Hinweis|in den Hütten braucht man früh Reservierungen]]. Es lohnt sich, bald zu planen.

Die Frage, was ich von deinem Vorschlag halte, ist leicht zu beantworten: [[Antwort|Ich halte ihn für ausgezeichnet]]. Er ist nicht zu teuer, nicht zu weit und trotzdem ein Abenteuer. Ich glaube, [[Erwartung|dass wir viel Spaß haben werden]].

Zum Begleiter: Ich frage noch [[Frage|bei zwei Freunden nach, ob sie Zeit haben]]. Wenn mehrere mitkommen, wird es günstiger und lustiger. Aber es ist deine Reise, und [[Hinweis|du entscheidest, wie groß die Gruppe sein soll]].

Schreib mir, [[Frage an den Freund|ob meine Gründe für dich nachvollziehbar sind]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Paul]],

herzlichen Dank für deine E-Mail, meine Antworten findest du unten.

Termin: Anfang Juni passt. [[Grund für den Termin|Ich habe Urlaub]].

Vorschlag: [[Reaktion auf den Vorschlag|Südtirol, gute Idee]].

Begleitung: [[Begleitung|Ich bringe meinen Bruder mit]].

Fragen: [[Frage zur Unterkunft|Unterkunft]]? [[Frage zu den Kosten|Kosten]]? [[Frage zur Route|Route]]?

Eine weitere Frage: [[Frage|Gibt es auf der Strecke Einkehrmöglichkeiten oder müssen wir Proviant mitnehmen]]? Ich esse gern warm, [[Vorliebe|vor allem Suppe und Knödel nach einem langen Tag]]. Das gehört für mich zu einer Wanderung in Südtirol.

Gern würde ich auch mit dir über [[Thema|unsere Ziele für die nächsten Jahre]] sprechen, wenn wir abends auf der Hütte sitzen. Solche Gespräche sind in den Bergen besonders gut möglich. Ich freue mich darauf, [[Wunsch|dich wieder einmal richtig kennenzulernen]].

Zum Thema Kosten möchte ich sagen, [[Budget|dass ich bis zu 400 Euro für die Reise einplane]]. Das sollte für Übernachtung, Essen und Bahnfahrt reichen. Wenn es mehr wird, [[Anpassung|überlege ich, wo ich sparen kann]]. Sag mir einfach, mit welcher Summe du rechnest.

Ich freue mich sehr auf die Tage in Südtirol und hoffe, dass wir eine schöne Route finden, die nicht zu schwer ist und trotzdem schöne Aussichten bietet. Ich passe mich gern deinen Wünschen an. Gib mir bitte kurz Bescheid, [[Frage an den Freund|wann wir buchen]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Paul]],

mehrere Tage wandern in Südtirol, ich bin begeistert, meine Waden weniger! [[Reaktion auf den Vorschlag|Aber die Aussicht ist es wert, ich komme gern mit]].

Anfang Juni passt, [[Grund für den Termin|dann ist es noch nicht so heiß, dass ich auf halber Strecke aufgebe]].

Mitbringen? [[Begleitung|Meinen Cousin, er trägt gern Rucksäcke, ich frage ihn noch]].

Meine Fragen: [[Frage zur Unterkunft|Gibt es Betten, oder schlafen wir auf Steinen]]? [[Frage zu den Kosten|Was kostet der Spaß]]? [[Frage zur Route|Wie viele Berge sind es, und wie hoch]]?

Vorbereitung: [[Vorbereitung|Ich gehe jetzt täglich Treppen steigen und tue so, als wäre es der Berg]].

Ich bin neugierig, [[Frage|ob es auf der Tour Gipfel gibt, auf die wir steigen]]. Ich liebe den Blick von oben, auch wenn der Weg anstrengend ist. Ich könnte [[Idee|am letzten Tag einen kleinen Gipfel als Belohnung einplanen]]. Wie siehst du das?

Ich habe mir überlegt, dass wir [[Idee|jeden Abend ein kleines Ritual machen, zum Beispiel einen Kräutertee oder ein Kartenspiel]]. Das gibt dem Tag einen schönen Abschluss. Wenn du magst, bringe ich [[Mitbringsel|ein Kartenspiel]] mit.

Bei der Anreise [[Vorschlag|wäre eine Fahrt am Vorabend praktisch]], dann starten wir am ersten Tag früh. Ich könnte [[Plan|am Freitagabend schon in Bozen ankommen]] und eine Pension nehmen. Dann sind wir am Samstag rechtzeitig am Start.

Ich freue mich trotz aller Scherze wirklich auf die Tage mit dir und werde alles tun, damit wir einen schönen Urlaub haben. Schreib bald, [[Frage an den Freund|ob es dort Kuchen gibt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Paul]],

als ich deine Mail gelesen habe, musste ich an unsere erste Wanderung denken. [[Erinnerung an die erste Wanderung|Wir hatten damals falsche Schuhe und haben trotzdem viel gelacht]]. Südtirol klingt wunderbar.

[[Reaktion auf den Vorschlag|Ich habe schon lange davon geträumt, einmal dort zu wandern]]. Anfang Juni passt, [[Grund für den Termin|ich habe dann Urlaub]].

Ich möchte meine [[Begleitung|Freundin Julia]] mitbringen, wenn du nichts dagegen hast.

Fragen: [[Frage zur Unterkunft|Wie übernachten wir]]? [[Frage zu den Kosten|Was wird es kosten]]? [[Frage zur Route|Wie lang geht jede Etappe]]?

Vorbereitung: [[Vorbereitung|Ich will vorher ein paar Tagestouren machen]].

Ich erinnere mich, wie schön es auf unserer letzten Tour war: [[Erinnerung|Wir haben auf einer Almwiese Brotzeit gemacht und die Kühe beobachtet]]. Das war einer der schönsten Tage. Ich hoffe, in Südtirol wird es genauso, [[Wunsch|nur mit besseren Schuhen]].

Weißt du noch, wie wir vor Jahren auf dem Gipfel standen? [[Erinnerung|Du hast gesagt, das sei der schönste Moment deines Jahres]]. Ich hoffe, dass wir diesen Moment wieder erleben, [[Wunsch|diesmal in Südtirol mit Blick auf die Dolomiten]].

Ich erinnere mich, dass du gern früh aufstehst: [[Erinnerung|Bei unserer letzten Tour hast du mich um fünf Uhr geweckt]]. Das war damals anstrengend, aber der Sonnenaufgang war es wert. Ich bin bereit, es wieder zu versuchen, [[Bedingung|wenn wir danach Kaffee bekommen]].

Erzähl mir, [[Frage an den Freund|wie du auf Südtirol gekommen bist]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Paul]],

wie toll, von dir zu lesen! [[Reaktion auf den Vorschlag|Südtirol ist ein tolles Ziel]]. Ich habe gleich mehrere Ergänzungen.

Mein erster Vorschlag: Wir fahren [[Anreise|mit dem Zug nach Bozen]]. Mein zweiter: Wir starten [[Termin|am Montag der ersten Juniwoche]]. Mein dritter: Ich bringe [[Begleitung|noch eine Freundin mit]].

Meine Fragen: [[Frage zur Unterkunft|Welche Unterkunft hast du im Kopf]]? [[Frage zu den Kosten|Wie teuer wird es]]? [[Frage zur Route|Welche Route planst du]]?

Vorbereitung: [[Vorbereitung|Wir trainieren vorher zusammen]].

Mein vierter Vorschlag: [[Vorschlag|Wir machen eine Fotoliste mit allen Orten, die wir sehen wollen]]. Mein fünfter: [[Vorschlag 2|Wir führen ein kleines Reisetagebuch]]. Das ist eine schöne Erinnerung, und wir können später darin blättern.

Mein sechster Vorschlag: [[Vorschlag|Wir lernen vorher ein paar Wörter Italienisch]]. Das ist nett für die Wirte. Mein siebter: [[Vorschlag 2|Wir bringen den Gastgebern ein kleines Geschenk mit]].

Mein achter Vorschlag: [[Vorschlag|Wir treffen uns eine Woche vorher kurz und gehen die Packliste durch]]. Mein neunter: [[Vorschlag 2|Wir machen eine kleine Probe-Wanderung in der Nähe, um die Schuhe zu testen]].

Was hältst du davon? Ich freue mich auf deine Antwort und auf viele gemeinsame Pläne für diese Tage in den Bergen, denn ich glaube, dass wir eine Menge Spaß haben werden. Ich freue mich auf deine Antwort und möchte wissen, [[Frage an den Freund|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Paul]],

besten Dank für deine Nachricht. [[Reaktion auf den Vorschlag|Südtirol klingt schön, aber ich möchte vorher einiges klären]].

Anfang Juni ist einerseits [[Vorteil des Termins|angenehm kühl]], andererseits [[Nachteil des Termins|kann es in den Bergen noch Schnee geben]]. Ich bin trotzdem dafür, [[Grund für den Termin|wenn ich den Urlaub bekomme]].

Ob ich jemanden mitbringe, entscheide ich noch. [[Begleitung|Vielleicht meine Schwester, aber sie hat noch keine feste Zusage gegeben]].

Fragen: [[Frage zur Unterkunft|Gibt es Alternativen, falls das Wetter schlecht ist]]? [[Frage zu den Kosten|Mit welchen Kosten rechnest du]]? [[Frage zur Route|Ist die Strecke für Anfänger geeignet]]?

Ich möchte vorsichtig fragen, [[Frage|wie fit du im Moment bist und ob du Erfahrung mit Bergtouren hast]]. Ich bin nicht der Schnellste, [[Hinweis|aber ich halte durch]]. Gemeinsam finden wir bestimmt ein Tempo, das für uns beide passt.

Bei aller Vorfreude denke ich auch an die Sicherheit: [[Hinweis|Wir sollten den Wetterbericht beachten und nicht zu spät aufbrechen]]. Berge sind schön, aber auch gefährlich, wenn man leichtsinnig ist. Deshalb [[Vorschlag|schlage ich vor, dass wir immer vorsichtig planen]].

Ich bin gespannt, ob der Termin für dich auch fest ist: [[Frage|Hast du schon frei genommen, oder musst du erst fragen]]? Ich denke, dass es gut wäre, bald Bescheid zu wissen. Aber ich verstehe, wenn [[Hinweis|du erst noch klären musst, was möglich ist]].

Lass mich einfach wissen, [[Frage an den Freund|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Paul]],

herzlichen Dank für deine Nachricht, ich antworte dir ordentlich der Reihe nach. Als Erstes: [[Reaktion auf den Vorschlag|Südtirol ist eine gute Idee]].

Als Nächstes zum Termin: [[Grund für den Termin|Anfang Juni passt]].

Dann zur Begleitung: [[Begleitung|Ich bringe meine Schwester mit]].

Danach zu meinen Fragen: [[Frage zur Unterkunft|Unterkunft]]? [[Frage zu den Kosten|Kosten]]? [[Frage zur Route|Route]]?

Zuletzt zur Vorbereitung: [[Vorbereitung|Schuhe und Training]].

Zuletzt noch ein Schritt: [[Schritt|Wir sollten schnell die Hütten buchen, weil sie im Juni oft ausgebucht sind]]. Ich helfe dir gern beim Recherchieren, [[Angebot|ich suche heute Abend im Internet nach Angeboten]]. Dann haben wir bald Klarheit.

Als dritten Schritt sollten wir uns [[Schritt|noch einmal telefonisch absprechen]], sobald du weißt, welche Hütten frei sind. Dann können wir den Zeitplan genau festlegen. Ich bin da sehr flexibel und richte mich nach den Verfügbarkeiten.

Als vierten Schritt schlage ich vor, [[Schritt|dass wir einen genauen Tagesplan erstellen, mit Start, Pause und Ziel]]. Das gibt Sicherheit, und wir können flexibel reagieren, falls etwas anders kommt. Ich schicke dir gern einen Entwurf, [[Angebot|wenn du magst]].

Ich freue mich sehr auf die gemeinsame Reise und bin sicher, dass wir gut zusammen planen können, damit nichts schiefgeht und wir den Urlaub richtig genießen. Wie geht es weiter? Schreib mir, [[Frage an den Freund|wann wir planen]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Paul]],

danke, dass du mir so schnell geschrieben hast! [[Reaktion auf den Vorschlag|Es ist schön, dass du an mich gedacht hast, und Südtirol klingt wunderbar]].

Anfang Juni passt, [[Grund für den Termin|und ich freue mich auf die gemeinsame Zeit]].

Ich bringe [[Begleitung|meine Mutter mit, sie wandert gern und ist sehr herzlich]], wenn es dir recht ist.

Fragen: [[Frage zur Unterkunft|Wo ist unsere Unterkunft]]? [[Frage zu den Kosten|Was kostet es]]? [[Frage zur Route|Ist die Strecke auch für ältere Wanderer machbar]]?

Vorbereitung: [[Vorbereitung|Ich gehe jeden Tag spazieren, um fit zu werden]].

Ich freue mich besonders darauf, mit dir [[Wunsch|in Ruhe zu reden, während wir wandern]]. Das ist für mich die beste Art, Zeit zu verbringen. Wir haben uns lange nicht gesehen, [[Folge|und eine Wanderung ist ideal zum Nachholen]].

Ich freue mich wirklich auf diese Reise: [[Gefühl|Seit langer Zeit habe ich mich auf nichts so gefreut]]. Ich glaube, dass uns die Berge guttun werden. Und ich bin froh, dass ich nicht allein fahre, [[Dank|sondern mit einem Freund wie dir]].

Es wäre schön, wenn wir uns vor der Reise noch einmal sehen: [[Vorschlag|Bei einem gemeinsamen Abendessen könnten wir alles besprechen]]. Das ist entspannter als Telefonate. Ich lade dich gern ein, [[Angebot|bei mir zu Hause, ich koche etwas Leckeres]].

Schreib mir einfach, [[Frage an den Freund|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Paul]],

Südtirol, cool! [[Reaktion auf den Vorschlag|Klingt super]].

Termin: [[Grund für den Termin|Anfang Juni passt]].

Mitbringen: [[Begleitung|Vielleicht meinen Bruder]].

Fragen: [[Frage zur Unterkunft|Unterkunft]]? [[Frage zu den Kosten|Kosten]]? [[Frage zur Route|Route]]?

Vorbereitung: [[Vorbereitung|Schuhe kaufen]].

Eine kurze Frage: [[Frage|Welche Kamera nimmst du mit, oder reicht das Handy]]? Ich mache gern Fotos von Blumen und Bergen. Ich bringe auch [[Mitbringsel|eine kleine Powerbank]] mit, falls wir keinen Strom haben.

Eine Kleinigkeit noch: Ich nehme [[Mitbringsel|ein paar Müsliriegel und Schokolade]] mit, damit wir immer Energie haben. Wenn du magst, packe ich etwas für dich mit ein. Das ist keine große Sache, aber es macht den Weg bergauf leichter.

Wenn ich ehrlich bin, kann ich es kaum erwarten: [[Gefühl|Ich zähle die Tage bis Anfang Juni]]. Ich packe schon jetzt meinen Rucksack in Gedanken. Danke für den tollen Vorschlag, [[Dank|er hat meine Laune sofort verbessert]].

Ich freue mich echt auf Südtirol und auf die Tage mit dir, das wird bestimmt super. Wir müssen nur noch klären, wo wir schlafen und wie viel das alles kostet, aber das kriegen wir hin. Ich bin flexibel und lasse mich gern von deinen Ideen überraschen, Hauptsache, wir wandern zusammen und haben Spaß, das ist alles, was zählt. Meld dich, [[Frage an den Freund|wann wir planen]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

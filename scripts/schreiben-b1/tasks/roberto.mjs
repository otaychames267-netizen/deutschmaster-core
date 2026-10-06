// v2 (B2-style): Andreas hat einen neuen Kollegen Roberto (aus Spanien, kennt niemanden) und fragt, ob er ihn einladen soll. Points: Vorschlag, wie Andreas seinem Arbeitskollegen helfen kann ·
// wie Sie am liebsten arbeiten (alleine oder mit Kollegen) · was Sie nach dem Urlaub gemacht haben · was es bei Ihnen Neues gibt — plus: "Denkst du, dass ich ihn einladen sollte? Was würdest du tun?"
export const kw = [/einladen|Essen|Mittagessen|Abendessen|Kaffee|zeigen|Stadt|Verein|vorstell|Ausflug|Roberto/i, /alleine|allein|Kollegen|Team|zusammen/i, /Urlaub|zurück/i, /Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /Roberto/, /Büro|Arbeit/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Bekannten|Andreas]],

vielen Dank für deine Zeilen, ich habe mich sehr gefreut! Schön, dass dir der Urlaub so gut gefallen hat. [[Reaktion auf die Arbeit nach dem Urlaub|Dass du jetzt viel Arbeit hast, kenne ich gut, mir ging es auch so]].

Zu Roberto: Ich finde es toll, dass du dir Gedanken über ihn machst. Mein Vorschlag: [[Vorschlag 1|Lade ihn zu einem Abendessen bei dir ein und bitte noch zwei Kollegen dazu]]. Außerdem [[Vorschlag 2|kannst du ihm die Stadt zeigen und ihn einem Verein vorstellen]]. Wenn ich du wäre, würde ich [[Eigene Meinung|so schnell wie möglich etwas planen]].

Wie ich am liebsten arbeite? [[Arbeitsweise|Mit Kollegen im Team, denn so kann man sich austauschen und gemeinsam Lösungen finden]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|zuerst meine Wohnung aufgeräumt und dann viele E-Mails beantwortet]].

Bei mir gibt es folgende Neuigkeit: [[Neuigkeit|Ich habe angefangen, Spanisch zu lernen]].

Wenn Roberto aus Spanien kommt, könnte er sich besonders über [[Idee|ein Essen mit spanischen Gerichten oder Musik]] freuen. Du kannst ihn auch fragen, [[Frage|welche Spezialitäten er vermisst]], und gemeinsam etwas kochen. Das ist ein schöner Weg, ihn zu zeigen, dass er willkommen ist, und ihr habt sofort Gesprächsstoff.

Zu meiner Arbeitsweise noch etwas: Ich habe gemerkt, dass [[Erkenntnis|ich mit Kollegen kreativer bin und schneller Lösungen finde]]. Deshalb freut es mich, dass du jetzt jemanden im Büro hast. Allein arbeite ich nur, wenn [[Ausnahme|ich einen Bericht schreibe und volle Konzentration brauche]].

Nach dem Urlaub habe ich auch einiges erlebt: [[Erlebnis|Ich habe meine Eltern besucht und mit ihnen einen Ausflug gemacht]]. Das war schön und entspannt. Danach [[Folge|fiel mir der Wiedereinstieg im Büro leichter]]. Ich hoffe, dass es dir auch bald besser geht.

Melde dich bald, [[Frage an den Bekannten|wie das Treffen mit Roberto gelaufen ist]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Bekannten|Andreas]],

schön, von dir zu hören! Dass der Urlaub schön war, freut mich. [[Reaktion auf die Arbeit nach dem Urlaub|Das Büro nach dem Urlaub kenne ich, da hilft nur Kaffee]].

Zu Roberto: Lad ihn doch ein! [[Vorschlag 1|Mach einen Grillabend mit ein paar Kollegen im Garten]]. Oder [[Vorschlag 2|geh mit ihm mittags essen und zeig ihm die besten Läden in der Stadt]]. Ich würde das sofort machen.

Wie ich am liebsten arbeite? [[Arbeitsweise|Im Team, allein werde ich schnell müde]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|erst mal ausgeschlafen und dann die Wäscheberge besiegt]].

Neues bei mir? [[Neuigkeit|Ich habe einen neuen Mitbewohner]].

Ein praktischer Tipp für Roberto: Er sollte [[Tipp|einen Sprachkurs oder einen Tandempartner suchen]], damit er sein Deutsch verbessert und neue Leute trifft. Du könntest ihn [[Hilfsangebot|zum Kurs begleiten oder die Anmeldung für ihn ausfüllen]]. Das wäre eine große Hilfe, denn Formulare sind in einer fremden Sprache schwer.

Ich arbeite am liebsten in einer Mischung: [[Mischung|vormittags allein, nachmittags im Team]]. So habe ich Ruhe für schwierige Aufgaben und Austausch für Ideen. Das empfehle ich auch Roberto, denn [[Grund|man lernt in der Gruppe die Sprache schneller]].

In der ersten Woche nach dem Urlaub habe ich [[Tätigkeit|Berge von E-Mails beantwortet]]. Das war anstrengend, aber danach hatte ich wieder Ordnung. Mein Tipp für dich: [[Tipp|Plane in den ersten Tagen nur halbe Arbeitstage ein]], dann bist du nicht so erschöpft.

Meld dich, [[Frage an den Bekannten|wie es mit Roberto läuft]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Bekannten|Andreas]],

wow, schön, von dir zu lesen! Ich freue mich, dass dir der Urlaub so gefallen hat. [[Reaktion auf die Arbeit nach dem Urlaub|Dass jetzt im Büro viel los ist, gehört dazu]].

Zu Roberto: Eine tolle Gelegenheit! Mein Vorschlag: [[Vorschlag 1|Lade ihn und ein paar Kollegen zu einem Spanischen Abend mit Tapas ein]]. Und [[Vorschlag 2|zeig ihm deine Lieblingsorte in der Stadt]]. Ich würde keine Minute warten.

Wie ich am liebsten arbeite? [[Arbeitsweise|Mit Kollegen, ich liebe den Austausch]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|Freunde getroffen und viele Fotos sortiert]].

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich habe eine Reise nach Spanien gebucht]].

Bei den Kollegen könntest du [[Vorschlag|eine kleine Willkommensrunde in der Teeküche organisieren]], mit Kuchen und Kaffee. Das kostet kaum Zeit und zeigt, dass das Team ihn gern hat. Ich habe das einmal für einen neuen Kollegen gemacht, und [[Ergebnis|er hat es nie vergessen]].

Mit Kollegen zu arbeiten, macht mir Freude, weil [[Grund|ich gern lache und Probleme gemeinsam löse]]. Wenn wir ein schwieriges Projekt haben, [[Beispiel|setzen wir uns zusammen und teilen die Aufgaben auf]]. Das spart viel Zeit und Stress.

Seit meinem Urlaub habe ich [[Erlebnis|mich viel mit Freunden getroffen und alte Fotos angeschaut]]. Das hat mir gutgetan. Ich wünsche dir, dass du auch bald wieder Zeit für deine Freunde findest, [[Wunsch|auch wenn die Arbeit viel ist]].

Schreib mir bald, [[Frage an den Bekannten|ob Roberto Lust hat]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Bekannten|Andreas]],

vielen Dank für deine Nachricht. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, Roberto: Ich empfehle, [[Vorschlag 1|ihn mit zwei oder drei Kollegen zum Essen einzuladen]]. Zusätzlich [[Vorschlag 2|kannst du ihm einen Verein oder einen Sprachkurs empfehlen]].

Zweitens, meine Arbeitsweise: [[Arbeitsweise|Ich arbeite lieber im Team als allein]], weil [[Grund für die Arbeitsweise|das schneller geht]].

Drittens, nach dem Urlaub: [[Tätigkeit nach dem Urlaub|Ich habe liegengebliebene Aufgaben erledigt]].

Viertens, meine Neuigkeiten: [[Neuigkeit|Ich bin befördert worden]].

Zusätzlich empfehle ich, [[Vorschlag|ihm am Wochenende die Stadt zu zeigen, vor allem die Orte, die du magst]]. Das gibt ihm Orientierung, und er fühlt sich schneller wohl. Wenn du magst, [[Hilfsangebot|komme ich mit und mache Fotos]], dann haben wir alle eine schöne Erinnerung.

Im Team zu arbeiten, ist für mich effektiver, weil [[Grund|jeder seine Stärken einbringen kann]]. Allein dauert vieles länger und ist öfter fehlerhaft. Das ist meine Erfahrung der letzten Jahre, und ich würde jedem Neuen raten, [[Rat|Anschluss im Team zu suchen]].

Nach dem Urlaub war ich [[Ort|zwei Tage bei meinen Eltern]] und habe ihnen im Garten geholfen. Das hat mich erdet. Danach bin ich in den Alltag zurückgekehrt, [[Erkenntnis|mit mehr Energie als vorher]]. So ein Urlaub tut dem Kopf gut.

Bitte teile mir mit, [[Frage an den Bekannten|wie sich Roberto einlebt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deine Zeilen! [[Reaktion auf die Arbeit nach dem Urlaub|Dass du viel Arbeit hast, verstehe ich, melde dich, wenn du Hilfe brauchst]].

Zu Roberto habe ich praktische Vorschläge: [[Vorschlag 1|Lade ihn zum Kaffee ein und frage, was ihm in der Stadt fehlt]]. Du kannst ihm [[Vorschlag 2|eine Liste mit Ärzten, Läden und Vereinen zusammenstellen]]. Ich helfe dir gern beim Schreiben, wenn du möchtest.

Wie ich am liebsten arbeite: [[Arbeitsweise|Im Team, aber mit klaren Aufgaben]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|meinen Schreibtisch sortiert und einen Plan gemacht]].

Bei mir gibt es [[Neuigkeit|eine neue Kollegin, die mir viel abnimmt]].

Ich kann dir auch bei der Planung helfen: [[Hilfsangebot|Ich suche dir passende Lokale heraus und reserviere einen Tisch]]. Wenn du willst, [[Zusatzhilfe|schreibe ich eine Einladung, die du an Roberto und die anderen Kollegen schickst]]. Dann hast du weniger Arbeit.

Wenn ich allein arbeite, brauche ich [[Bedürfnis|Kopfhörer, Tee und möglichst wenig Unterbrechungen]]. Im Team brauche ich [[Zweites Bedürfnis|klare Absprachen]]. Beides funktioniert, und ich wechsle je nach Aufgabe, das ist für mich am angenehmsten.

Nach dem Urlaub habe ich [[Erlebnis|meine Wohnung neu eingerichtet und endlich das Regal aufgebaut]]. Es ist ein schönes Gefühl, wenn alles an seinem Platz ist. Wenn du magst, [[Angebot|helfe ich dir bei deinem Büro oder deiner Wohnung]], ich habe viel Erfahrung.

Sag mir bitte, [[Frage an den Bekannten|ob ich noch etwas für Roberto tun kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Bekannten|Andreas]],

ich freue mich über deine Zeilen, denn [[Begründung für die Freude|ich habe lange nichts von dir gehört]]. Dass du viel Arbeit hast, ist normal nach dem Urlaub.

Roberto solltest du einladen, weil [[Begründung für die Einladung|er niemanden kennt und sich bestimmt freut]]. [[Vorschlag 1|Lade ihn mit ein paar Kollegen zum Essen ein]]. Außerdem [[Vorschlag 2|zeig ihm die Stadt]], da [[Grund für den Vorschlag 2|er sich so schneller zu Hause fühlt]].

Ich arbeite am liebsten [[Arbeitsweise|mit Kollegen]], weil [[Grund für die Arbeitsweise|man voneinander lernt]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|mich erholt und Dinge geordnet]].

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Er sollte nicht zu lange allein bleiben, denn [[Grund|man fühlt sich in einer neuen Stadt schnell einsam]]. Du bist für ihn der erste Kontakt, und das ist wichtig. Ich glaube, dass er dir sehr dankbar sein wird, auch wenn er es nicht sofort zeigt.

Ich arbeite am liebsten mit Kollegen, weil [[Grund|ich so schneller neue Ideen bekomme]]. Natürlich braucht man auch Zeit für sich, aber das ist die Ausnahme. Roberto wird das auch merken, [[Folge|wenn er sich im Team wohlfühlt]].

Ich war nach dem Urlaub [[Erlebnis|zum ersten Mal beim Tanzkurs]], und es hat Spaß gemacht. Dort lernt man schnell neue Leute kennen. Vielleicht wäre das auch etwas für Roberto, [[Idee|ein Tanzkurs ist ein lockerer Einstieg]].

Schreib mir, [[Frage an den Bekannten|ob du meinen Rat gut findest]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deine Zeilen, hier kurz meine Antworten.

Urlaub: [[Reaktion auf die Arbeit nach dem Urlaub|Schön, dass er dir gefallen hat]].

Roberto: [[Vorschlag 1|Zum Essen einladen]]. [[Vorschlag 2|Stadt zeigen]].

Arbeiten: [[Arbeitsweise|Lieber im Team]].

Nach dem Urlaub: [[Tätigkeit nach dem Urlaub|Aufgaben erledigt]].

Neues: [[Neuigkeit|Neue Stelle]].

Noch ein Gedanke: Vielleicht freut sich Roberto über [[Idee|ein kleines Fußballspiel mit den Kollegen nach der Arbeit]], falls er Fußball mag. Spanier lieben ja meist Fußball. Das ist eine gute Gelegenheit, ins Team zu kommen, [[Folge|ohne viele Worte zu brauchen]].

Beim Arbeiten bin ich ein Teamplayer, [[Eigenschaft|ich frage gern nach und teile mein Wissen]]. Ich glaube, das ist auch für Roberto wichtig, [[Tipp|er sollte viel fragen und sich nicht schämen]]. Fehler sind normal, wenn man in einer neuen Sprache arbeitet.

Seit dem Urlaub sortiere ich [[Tätigkeit|meine Fotos und mache ein Album]]. Das ist eine schöne Erinnerung. Wenn du magst, schicke ich dir ein paar Bilder, [[Angebot|und wir erzählen beim Telefonieren, was wir erlebt haben]].

Ich hoffe, dass Roberto sich bald wohlfühlt und dass ihr beide viel Spaß im Büro habt, denn ein gutes Team macht die Arbeit viel leichter. Ich freue mich auf deine Antwort und auf alle Geschichten aus dem Büro. Melde dich bald, [[Frage an den Bekannten|wie es läuft]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Bekannten|Andreas]],

endlich ein Büropartner, mit dem man sich unterhalten kann, das war überfällig! [[Reaktion auf die Arbeit nach dem Urlaub|Dass du nach dem Urlaub sofort wieder Urlaub brauchst, kenne ich]].

Zu Roberto: Lade ihn ein, bevor er aus Spanien Heimweh nach der Siesta bekommt! [[Vorschlag 1|Mach einen Abend mit Tapas, auch wenn sie bei dir aus der Dose kommen]]. Und [[Vorschlag 2|zeig ihm, wo es das beste Bier gibt]].

Ich arbeite am liebsten [[Arbeitsweise|im Team, allein rede ich sonst mit dem Drucker]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|vier Tage lang Koffer ausgepackt]].

Bei mir gibt es [[Neuigkeit|einen neuen Bürostuhl, der nur rollt, wenn er will]].

Wenn ich du wäre, würde ich ihm auch [[Idee|die Lieblingsorte für die Mittagspause zeigen]]. Das ist ein einfaches Zeichen von Freundschaft, und man kommt gleich ins Gespräch. Außerdem [[Folge|lernt er die Kollegen in lockerer Atmosphäre kennen]].

Wenn ich ehrlich bin, arbeite ich lieber mit Kollegen, aber [[Einschränkung|nur mit denen, die zuverlässig sind]]. Mit unzuverlässigen Kollegen arbeite ich lieber allein. Ich hoffe, dass Roberto ein guter Kollege für dich ist, [[Hoffnung|damit du dich im Büro wohlfühlst]].

Nach dem Urlaub war ich [[Erlebnis|bei einer Hochzeit eingeladen]], das war ein wunderbarer Abend. Ich habe viele Menschen getroffen und [[Folge|neue Kontakte geknüpft]]. Das zeigt wieder, wie wichtig Begegnungen sind.

Schreib bald, [[Frage an den Bekannten|was Roberto zum Essen sagt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Bekannten|Andreas]],

als ich deine Zeilen gelesen habe, musste ich an unseren Urlaub denken. [[Erinnerung an den Urlaub|Wir haben damals bis spät in die Nacht geredet]]. Schön, dass du dich meldest.

Zu Roberto: Ich war auch einmal der Neue in einer Firma, [[Eigene Erfahrung|und ich war froh, als mich ein Kollege zum Mittagessen mitgenommen hat]]. Das würde ich dir raten: [[Vorschlag 1|Lade ihn zum Essen ein]], und [[Vorschlag 2|zeig ihm die Stadt]].

Ich arbeite am liebsten [[Arbeitsweise|mit anderen zusammen]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|Fotos angeschaut und Freunde besucht]].

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Auch ich war einmal in einer fremden Stadt: [[Erinnerung|Mein Kollege hat mich damals zu seiner Familie eingeladen]], und das war der schönste Moment. Du könntest Roberto [[Idee|ebenfalls zu dir nach Hause einladen]], dann fühlt er sich wie bei Freunden.

Bei der Arbeit hatte ich zuletzt [[Erlebnis|ein Projekt mit drei Kollegen, bei dem wir viel gelacht haben]]. Das hat mir gezeigt, wie schön Teamarbeit sein kann. Deshalb ist Roberto für dich ein Gewinn, [[Folge|auch wenn er anfangs still ist]].

Mein erster Tag zurück im Büro war [[Beschreibung|ein bisschen chaotisch, aber auch nett, weil mich alle begrüßt haben]]. Das hat mich daran erinnert, wie wichtig Kollegen sind. Und deshalb ist Roberto für dich bestimmt eine Bereicherung.

Erzähl mir, [[Frage an den Bekannten|wie Roberto auf deine Einladung reagiert]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Bekannten|Andreas]],

danke für deine Zeilen. [[Reaktion auf die Arbeit nach dem Urlaub|Schön, dass der Urlaub so gut war]]. Ich habe gleich mehrere Vorschläge für Roberto.

Mein erster Vorschlag: [[Vorschlag 1|Lade ihn zu einem gemeinsamen Mittagessen mit Kollegen ein]]. Mein zweiter: [[Vorschlag 2|Zeig ihm am Wochenende die Stadt]]. Mein dritter: [[Vorschlag 3|Stell ihn einem Sportverein vor]].

Ich arbeite am liebsten [[Arbeitsweise|im Team]]. Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|zuerst Termine sortiert]].

Bei mir gibt es [[Neuigkeit|eine neue Radtour-Gruppe]].

Als vierten Vorschlag empfehle ich, [[Vorschlag|eine Gruppe im Büro zu gründen, die sich einmal im Monat zum Essen trifft]]. Dort bekommt Roberto einen festen Termin, und alle lernen sich besser kennen. Das ist nachhaltiger als eine einmalige Einladung.

Mein fünfter Vorschlag: Besprecht gemeinsam [[Idee|einmal pro Woche in Ruhe, was gut lief und was nicht]]. So wächst das Team zusammen, und Roberto bekommt Feedback. Das hat bei uns in der Firma sehr gut funktioniert.

Nach dem Urlaub habe ich [[Tätigkeit|mich bei einem Sportverein angemeldet]], damit ich mehr Bewegung habe. Das ist auch ein guter Tipp für Roberto, [[Folge|dort lernt man Leute kennen, ohne viel reden zu müssen]].

Was hältst du davon? Ich freue mich auf deine Meinung. Schreib mir, [[Frage an den Bekannten|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deine Zeilen. [[Reaktion auf die Arbeit nach dem Urlaub|Nach dem Urlaub ist das Büro immer ein Schock]]. Zu Roberto möchte ich vorsichtig antworten.

Einerseits [[Vorteil der Einladung|freut er sich sicher über eine Einladung]], andererseits [[Nachteil der Einladung|ist er vielleicht schüchtern]]. Ich würde ihn [[Vorschlag 1|zuerst zum Kaffee einladen]] und später [[Vorschlag 2|mit mehreren Kollegen essen gehen]].

Ich arbeite am liebsten [[Arbeitsweise|abwechselnd allein und mit Kollegen]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|mich langsam wieder eingearbeitet]].

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

Ich möchte noch erwähnen, dass es wichtig ist, ihn nicht zu überfordern: [[Hinweis|Lass ihm Zeit und dräng ihn nicht]]. Manche Menschen brauchen länger, um sich zu öffnen. Wenn du ihn freundlich einlädst und er absagt, ist das auch in Ordnung, [[Folge|er weiß dann, dass du da bist]].

Zu meiner Arbeitsweise noch: [[Eigenschaft|Ich brauche Struktur und feste Zeiten für Absprachen]]. Dann arbeite ich gern mit anderen. Ohne Struktur werde ich nervös, deshalb wünsche ich dir und Roberto [[Wunsch|klare Aufgaben und gegenseitiges Verständnis]].

Ich habe nach dem Urlaub [[Erlebnis|meinen Schreibtisch aufgeräumt und eine Liste mit Aufgaben gemacht]]. Das hat mir geholfen, nicht den Überblick zu verlieren. Vielleicht hilft dir das auch, [[Rat|schreib dir jeden Morgen drei Prioritäten auf]].

Schreib mir bitte, [[Frage an den Bekannten|was du von meinem Rat hältst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Bekannten|Andreas]],

danke für deine Zeilen, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Arbeit nach dem Urlaub|Schön, dass dir der Urlaub gefallen hat]].

Als Nächstes zu Roberto: Erstens [[Vorschlag 1|laden wir ihn zum Essen ein]], zweitens [[Vorschlag 2|zeigen wir ihm die Stadt]].

Dann zu meiner Arbeit: [[Arbeitsweise|Ich arbeite lieber im Team]].

Danach zum Urlaub: [[Tätigkeit nach dem Urlaub|Ich habe Aufgaben nachgeholt]].

Zuletzt meine Neuigkeiten: [[Neuigkeit|Neue Arbeit]].

Zum Schluss noch ein Schritt: [[Schritt|Frag ihn, ob er etwas Bestimmtes vermisst, und biete Hilfe an]]. Dann weißt du, was er braucht, und kannst besser helfen. Ein Gespräch kostet nichts, aber es kann viel bewirken, und er wird es zu schätzen wissen.

Zum Thema Arbeiten noch ein Punkt: [[Beobachtung|Kollegen sind oft die ersten Freunde in einer neuen Stadt]]. Das war bei mir so, und es war schön. Deshalb ist es gut, dass du mit Roberto im selben Büro sitzt, [[Folge|ihr könnt euch jeden Tag austauschen]].

Nach dem Urlaub habe ich [[Tätigkeit|angefangen, jeden Abend zu spazieren]]. Das entspannt mich nach der Arbeit. Es ist eine kleine Gewohnheit, die viel bewirkt, und ich empfehle sie dir [[Empfehlung|besonders bei viel Stress]].

Wie geht es weiter? Schreib mir, [[Frage an den Bekannten|wie es mit Roberto läuft]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Bekannten|Andreas]],

deine Zeilen haben mich sehr gefreut. [[Reaktion auf die Arbeit nach dem Urlaub|Es tut gut zu hören, dass du so einen schönen Urlaub hattest]].

Zu Roberto: Ich finde es herzlich, dass du dich um ihn kümmerst. [[Vorschlag 1|Lade ihn ein, er wird sich sehr freuen]]. Und [[Vorschlag 2|zeig ihm, dass er willkommen ist, mit einer Kleinigkeit]]. Ich glaube, das bedeutet ihm viel.

Ich arbeite am liebsten [[Arbeitsweise|mit netten Kollegen zusammen]].

Nach dem Urlaub habe ich [[Tätigkeit nach dem Urlaub|mich gut erholt und viel geschlafen]].

Bei mir gibt es [[Neuigkeit|ein neues Hobby, das mir Freude macht]].

Ich glaube, dass du ein guter Kollege für Roberto sein wirst: [[Eigenschaft|Du bist freundlich, offen und hilfsbereit]]. Das braucht ein Neuer am meisten. Und wenn er sich eingelebt hat, [[Folge|wird er euch bestimmt auch zu sich einladen]]. Das ist der schönste Lohn.

Ich arbeite am liebsten mit Kollegen, die [[Eigenschaft|ehrlich, humorvoll und hilfsbereit sind]]. Dann geht jede Aufgabe leichter von der Hand. Ich wünsche dir, dass Roberto so ein Kollege wird, und ich glaube, das wird er auch.

Ich habe nach dem Urlaub [[Erlebnis|zwei alte Freunde angerufen und mich für Samstag verabredet]]. Das war ein schöner Moment. Man vergisst manchmal, wie gut es tut, einfach zu reden, und deshalb freue ich mich auf deine nächste Nachricht.

Ich freue mich auf [[Vorfreude|deine nächste Nachricht]]. Erzähl mir, [[Frage an den Bekannten|wie sich Roberto fühlt]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Bekannten|Andreas]],

schön, von dir zu hören! [[Reaktion auf die Arbeit nach dem Urlaub|Urlaub vorbei, Büro läuft, kenn ich]].

Roberto: [[Vorschlag 1|Lade ihn zum Essen ein]], [[Vorschlag 2|zeig ihm die Stadt]].

Arbeiten: [[Arbeitsweise|Lieber im Team]].

Nach dem Urlaub: [[Tätigkeit nach dem Urlaub|Erstmal ausschlafen]].

Neues: [[Neuigkeit|Nichts Besonderes]].

Ein schneller Tipp noch: [[Tipp|Gib ihm deine Handynummer, damit er dich auch abends erreichen kann]]. Viele Neue trauen sich nicht zu fragen. Wenn er weiß, dass er dich anrufen darf, [[Folge|fühlt er sich sicherer in der neuen Stadt]].

Für mich zählt bei der Arbeit [[Wert|ein gutes Klima, nicht nur gute Ergebnisse]]. Mit freundlichen Kollegen macht alles mehr Spaß. Ich bin sicher, dass es mit Roberto ähnlich wird, [[Folge|wenn ihr euch gegenseitig unterstützt]].

Nach dem Urlaub bin ich [[Tätigkeit|früh ins Bett gegangen und habe viel geschlafen]]. Das war wohl nötig. Jetzt geht es mir besser, und ich hoffe, dass auch du dich bald erholst, [[Wunsch|auch wenn das Büro dich fordert]].

Ich hoffe, dass Roberto sich bald einlebt und ihr beide viel Spaß habt, denn ein netter Kollege macht den Arbeitstag um einiges leichter. Wenn ich dir helfen kann, sag einfach Bescheid, ich bin gern für dich da, versprochen. Meld dich, [[Frage an den Bekannten|wie es läuft]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

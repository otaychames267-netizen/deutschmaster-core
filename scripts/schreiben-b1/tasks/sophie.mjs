// v2 (B2-style): Sophie ist seit zwei Monaten in Würzburg, kennt dort nur Kollegen und fragt nach Tipps; sie lädt zu einem Wochenendbesuch ein. Points: was es Neues bei Ihnen gibt ·
// was Sie selbst gern in Ihrer Freizeit machen · Tipps für Sophie · Reaktion auf den Vorschlag — plus: "Gibt es bei dir Neuigkeiten?", Würzburg hat viele Sehenswürdigkeiten, Job gefällt ihr.
export const kw = [/Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /Freizeit|Hobby|Sport|Kino|Musik|lese|schwimm|koche|spiele|Fußball|tanze|wandere|fotografiere/i, /Tipp|Verein|Kurs|Gruppe|Sportverein|Chor|Treff|App|Stammtisch/i, /besuch/i, /Würzburg|Wochenende|Stadt/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Sophie]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Es tut mir leid, dass wir so lange nichts voneinander gehört haben. [[Reaktion auf Sophies Nachricht|Schön, dass dir der Job in Würzburg gefällt]].

Bei mir gibt es folgende Neuigkeiten: [[Neuigkeit|Ich habe in meiner Firma eine neue Aufgabe bekommen und lerne gerade viel Neues]]. Das macht mir Spaß.

In meiner Freizeit [[Hobby|gehe ich gern schwimmen und treffe mich mit Freunden zum Kochen]]. Außerdem [[Zweites Hobby|lese ich viel und höre Musik]].

Zu deinem Problem, dass du niemanden kennst, habe ich Tipps: [[Tipp 1|Melde dich in einem Verein an, zum Beispiel für Sport oder Chor]]. Außerdem [[Tipp 2|kannst du einen Kurs besuchen, der dich interessiert]]. Und [[Tipp 3|nutze eine App, mit der man Leute für Freizeit findet]].

Dein Vorschlag, dich an einem Wochenende zu besuchen, gefällt mir sehr. [[Zeitpunkt des Besuchs|Ich komme gern im Juni]], und wir schauen uns die Sehenswürdigkeiten von Würzburg an.

Dass du in Würzburg viele Sehenswürdigkeiten hast, finde ich toll: Ich möchte unbedingt [[Sehenswürdigkeit 1|die Residenz und die Festung Marienberg]] sehen. Außerdem hast du dort [[Besonderheit|Weinberge und schöne Spazierwege am Main]]. Das ist genau das Richtige, wenn man abends allein ist und Luft schnappen möchte.

In letzter Zeit habe ich auch viel erlebt: [[Weitere Neuigkeit|Ich war auf einem Konzert und habe eine alte Freundin getroffen]]. Das hat mich daran erinnert, wie wichtig Menschen sind. Ich erzähle dir beim Besuch ausführlich davon, mit Fotos und lustigen Geschichten.

Zu unserem Treffen habe ich schon eine Idee: [[Plan Samstag|Am Samstag besichtigen wir die Residenz, und abends essen wir in einem fränkischen Gasthaus]]. Am Sonntag [[Plan Sonntag|machen wir einen Spaziergang durch die Weinberge]]. Das wäre ein schönes Programm, und du kannst es natürlich ändern.

Schreib mir bitte, [[Frage an die Freundin|welches Wochenende dir am besten passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Sophie]],

schön, von dir zu hören! Ja, wir haben uns ewig nicht geschrieben. [[Reaktion auf Sophies Nachricht|Klasse, dass dir der Job und die Kollegen gefallen]].

Neues bei mir? [[Neuigkeit|Ich habe angefangen, Gitarre zu lernen, und war zweimal wandern]]. Sonst alles beim Alten.

Freizeit: [[Hobby|Ich gehe gern ins Kino und spiele Fußball mit Freunden]]. Und [[Zweites Hobby|abends koche ich oft was Neues]].

Tipps für dich? Klar: [[Tipp 1|Geh in einen Sportverein, da lernt man schnell Leute kennen]]. Oder [[Tipp 2|such dir einen Stammtisch oder eine Spielegruppe]]. Und [[Tipp 3|sag deinen Kollegen, dass du Anschluss suchst]], die haben bestimmt Ideen.

Besuchen? Gern! [[Zeitpunkt des Besuchs|Ich könnte im Mai für ein Wochenende kommen]]. Würzburg klingt cool.

Zu deinem Job habe ich noch eine Frage: [[Frage|Was genau machst du dort, und wie sind die Arbeitszeiten]]? Ich bin neugierig, weil ich selbst [[Eigene Arbeit|gerade den Beruf wechseln möchte]]. Vielleicht kannst du mir erzählen, wie du dich beworben hast und was dir wichtig war.

Seit einigen Wochen [[Veränderung|stehe ich früher auf und gehe vor der Arbeit eine halbe Stunde spazieren]]. Das hat meinen Tag verändert, und ich fühle mich ausgeglichener. Vielleicht ist das auch eine gute Idee für dich, [[Idee|an freien Abenden am Main entlangzulaufen]].

Wenn ich komme, bringe ich [[Mitbringsel|ein kleines Gastgeschenk und etwas Leckeres aus meiner Stadt]] mit. Ich möchte, dass du dich freust, und ich weiß, wie schön es ist, wenn jemand an einen denkt. Du hast mir ja auch eine nette Einladung geschickt.

Meld dich, [[Frage an die Freundin|wann es bei dir klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Sophie]],

wow, schön, von dir zu lesen! Ich hoffe, dir geht es gut. [[Reaktion auf Sophies Nachricht|Dass dir der neue Job so viel Spaß macht, freut mich riesig]].

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich fahre im Sommer drei Wochen nach Italien]]. Ich freue mich so darauf!

In meiner Freizeit [[Hobby|tanze ich leidenschaftlich gern und gehe auf Konzerte]]. Auch [[Zweites Hobby|fotografiere ich gern, besonders auf Reisen]].

Meine Tipps für dich: [[Tipp 1|Such dir einen Tanzkurs, das macht Spaß und man kommt sofort ins Gespräch]]. Oder [[Tipp 2|tritt einem Chor bei, Singen verbindet]]. Und [[Tipp 3|besuche Stadtfeste, da sind viele Menschen]].

Dein Vorschlag, dich zu besuchen, macht mich glücklich! [[Zeitpunkt des Besuchs|Ich komme am liebsten im Herbst]], und wir erkunden Würzburg zusammen.

Wenn deine Kollegen nett sind, kannst du sie [[Idee|zu einem Spieleabend oder zu einem gemeinsamen Essen einladen]]. Das ist oft der beste Weg, um aus Kollegen Freunde zu machen. Ich habe das in meiner Firma gemacht, und [[Ergebnis|heute treffe ich zwei davon jedes Wochenende]].

Bei mir hat sich im Beruf etwas getan: [[Neuigkeit|Ich arbeite jetzt in einem kleinen Team und habe mehr Verantwortung]]. Das macht mir Freude, ist aber auch anstrengend. Ich verstehe also, dass du manchmal müde bist, und ich freue mich auf unser Gespräch über Arbeit und Freizeit.

Falls du am Besuchswochenende noch etwas vorhast, sag es mir bitte früh: [[Hinweis|Dann ändere ich meinen Plan und komme einfach eine Woche später]]. Ich bin da sehr flexibel. Wichtig ist nur, dass wir uns sehen und genug Zeit zum Reden haben.

Schreib mir bald, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Sophie]],

vielen Dank für deine Nachricht. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, meine Neuigkeiten: [[Neuigkeit|Ich habe beruflich eine neue Aufgabe übernommen]].

Zweitens, meine Freizeit: [[Hobby|Ich gehe regelmäßig schwimmen und lese gern]].

Drittens, Tipps für dich: Ich empfehle, [[Tipp 1|einem Sportverein beizutreten]], [[Tipp 2|einen Kurs zu besuchen]] und [[Tipp 3|an Stammtischen teilzunehmen]].

Viertens, dein Vorschlag: Ich besuche dich gern in Würzburg, [[Zeitpunkt des Besuchs|am liebsten im Juni]].

Ergänzend noch einige praktische Hinweise: Frage im Büro, [[Frage|ob jemand einen Verein oder eine Gruppe empfehlen kann]]. Kollegen kennen die Stadt, und viele Vereine suchen neue Mitglieder. Auch [[Tipp|am schwarzen Brett im Supermarkt hängen oft Angebote für Kurse]].

Meine Freizeit verbringe ich auch gern draußen: [[Aktivität|Radtouren am Fluss und kleine Wanderungen im Wald]]. Wenn ich dich besuche, könnten wir das gemeinsam machen. Würzburg hat ja so viele schöne Wege, [[Vorfreude|dass ich mich schon sehr darauf freue]].

Ich wäre auch gern bereit, dir [[Hilfsangebot|bei Behördengängen oder beim Einrichten der Wohnung zu helfen]], wenn du das noch nicht geschafft hast. Das mache ich wirklich gern. Mit zwei Händen mehr geht alles schneller, und vielleicht macht es sogar Spaß.

Bitte teile mir mit, [[Frage an die Freundin|welches Wochenende dir passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Sophie]],

danke für deine Mail! [[Reaktion auf Sophies Nachricht|Ich freue mich, dass dir der Job gefällt]].

Bei mir gibt es [[Neuigkeit|eine neue Stelle in einer größeren Abteilung]].

In meiner Freizeit [[Hobby|spiele ich Volleyball und gehe wandern]].

Praktische Tipps für dich: [[Tipp 1|Schau im Internet nach Vereinen in Würzburg]]. Ich kann [[Praktische Hilfe|dir eine Liste mit Ideen zusammenstellen]]. Außerdem [[Tipp 2|hilft eine Nachbarschafts-App]].

Zum Besuch: [[Zeitpunkt des Besuchs|Ich komme gern im Juli]], und ich bringe [[Mitbringsel|ein Spiel für den Abend]] mit.

Ich helfe dir gern bei der Suche: [[Hilfsangebot|Schick mir deine Interessen, dann suche ich drei Angebote in Würzburg heraus]]. Ich kenne mich mit solchen Seiten ganz gut aus. Und wenn du magst, [[Zusatzhilfe|rufen wir uns am Sonntag an und planen deine nächsten Schritte]].

Seit Kurzem habe ich ein neues Hobby, [[Hobby|ich mache Töpfern in einem kleinen Kurs]]. Es entspannt mich sehr, und ich habe viele nette Leute getroffen. Vielleicht gibt es so etwas auch in deiner Stadt, [[Idee|ein Kunstkurs wäre ein guter Weg, um neue Leute kennenzulernen]].

Wenn du Lust hast, laden wir beim Besuch auch [[Gäste|ein oder zwei Kolleginnen aus deinem Büro]] zum Abendessen ein. Dann lerne ich sie kennen, und du hast gleich eine Gelegenheit, [[Folge|mit ihnen auch privat ins Gespräch zu kommen]]. Das könnte der Anfang einer Freundschaft sein.

Ich helfe dir gern, auch Freunde zu finden, das verspreche ich dir. Sag mir bitte, [[Frage an die Freundin|ob ich noch etwas mitbringen soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Sophie]],

ich freue mich über deine Mail, denn [[Begründung für die Freude|ich habe lange nichts von dir gehört]]. Dass dir der Job gefällt, ist ein gutes Zeichen.

Bei mir gibt es [[Neuigkeit|eine Veränderung im Büro]].

In meiner Freizeit [[Hobby|mache ich viel Sport]], weil [[Grund für das Hobby|es mir hilft abzuschalten]].

Meine Tipps: [[Tipp 1|Tritt einem Verein bei]], weil [[Grund für den Tipp 1|man dort regelmäßig dieselben Leute trifft]]. Außerdem [[Tipp 2|besuche einen Kurs]], denn [[Grund für den Tipp 2|dort hat man ein gemeinsames Thema]].

Ich besuche dich gern, weil [[Grund für den Besuch|ich Würzburg noch nicht kenne]]. [[Zeitpunkt des Besuchs|Der September passt mir gut]].

Ich weiß, wie schwer der Anfang in einer neuen Stadt ist: [[Eigene Erfahrung|Ich war in meinem ersten Jahr oft allein und habe viel ferngesehen]]. Aber es wird besser, [[Hoffnung|sobald man seinen Rhythmus gefunden hat]]. Gib dir Zeit, und mach dir keine Vorwürfe.

Am Wochenende war ich [[Erlebnis|bei meinen Eltern und habe mit ihnen gegrillt]]. Es war schön, aber auch anstrengend, weil ich so viele Fragen beantworten musste. Du kennst das bestimmt, und ich hoffe, du hast auch Familie oder Freunde, die dich anrufen.

Ich habe schon überlegt, wie ich anreise: [[Anreise|Ich nehme den Zug und komme am Freitagabend an]]. Ich bleibe bis Sonntag, wenn das für dich in Ordnung ist. Und ich brauche kein Bett, [[Übernachtung|ein Sofa reicht völlig]], oder ich buche eine kleine Pension.

Schreib mir, [[Frage an die Freundin|ob dir der September passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Sophie]],

danke für deine Mail, hier kurz meine Antworten.

Neues: [[Neuigkeit|Neue Aufgabe im Job]].

Freizeit: [[Hobby|Schwimmen, Lesen, Kochen]].

Tipps: [[Tipp 1|Verein]], [[Tipp 2|Kurs]], [[Tipp 3|Stammtisch]].

Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Juni]].

Weitere Tipps: [[Tipp|Besuche Veranstaltungen in der Stadt, Konzerte, Stadtführungen oder Märkte]], dort sind viele Leute, die offen für Gespräche sind. Und [[Tipp 2|geh öfter zum selben Café oder zur selben Bäckerei]], dann kennt man dich bald. So fängt vieles an.

Neu ist auch, dass [[Neuigkeit|ich einen Sprachkurs für Spanisch angefangen habe]]. Es macht mir Spaß, und die Lehrerin ist wunderbar. Ich lerne jeden Tag fünfzehn Minuten, und [[Ergebnis|nach einem Monat verstehe ich schon die ersten Sätze]].

Ich freue mich besonders darauf, mit dir [[Wunsch|einen Abend in einem Weinlokal zu verbringen]], denn Würzburg ist für seinen Wein bekannt. Wenn du magst, probieren wir [[Spezialität|ein paar fränkische Weine]]. Natürlich nur, wenn es dir recht ist, sonst nehmen wir auch einen Saft.

Ich freue mich sehr auf Würzburg und auf unser Wiedersehen, und ich hoffe, dass du bald viele nette Menschen kennenlernst, denn du hast es wirklich verdient. Wir haben bestimmt viel zu erzählen und zu lachen. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|welches Wochenende passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Sophie]],

zwei Monate Würzburg und nur Kollegen als Bekannte, das ist wirklich ein Anfang! [[Reaktion auf Sophies Nachricht|Immerhin verstehst du dich prima mit ihnen, das ist schon die halbe Miete]].

Neues bei mir: [[Neuigkeit|Ich habe versucht zu backen, und der Kuchen war ein Mahnmal]].

In meiner Freizeit [[Hobby|spiele ich Karten und gehe wandern, solange es nicht regnet]].

Meine Tipps: [[Tipp 1|Tritt einem Verein bei, dort wird dich keiner mehr allein lassen]]. Oder [[Tipp 2|geh zum Stammtisch, da lernt man Leute beim Reden kennen]]. Sag [[Tipp 3|einfach laut, dass du Gesellschaft suchst]].

Besuchen? [[Zeitpunkt des Besuchs|Gern im Sommer, wenn du die Sehenswürdigkeiten schon alle kennst]].

Du schreibst, dass du in deiner Freizeit oft allein bist: Was würdest du gern machen, wenn du Gesellschaft hättest? [[Frage|Ins Kino gehen, wandern, kochen oder Sport treiben]]? Wenn du mir das sagst, kann ich dir gezielter Tipps geben, und vielleicht [[Idee|finden wir eine Gruppe, die zu dir passt]].

In meiner Freizeit sehe ich auch gern [[Hobby|Filme und lese Krimis]], aber ich merke, dass mir echte Treffen mit Menschen fehlen. Deshalb habe ich mir vorgenommen, [[Vorsatz|jeden Monat etwas mit Freunden zu planen]]. Wir könnten das auch zusammen tun, wenn ich dich besuche.

Ich schlage vor, dass wir uns einen Tag nur für uns nehmen: [[Idee|ohne Handy, ohne Termine, nur Spaziergang und Gespräche]]. Das ist selten geworden, und ich glaube, wir brauchen beide so einen Tag. Du kannst mir dann alles erzählen, was dich bewegt.

Schreib bald, [[Frage an die Freundin|ob dein Sofa einen Gast aushält]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Sophie]],

als ich deine Mail gelesen habe, musste ich an meinen ersten Job in einer neuen Stadt denken. [[Erinnerung an den eigenen Neuanfang|Ich kannte damals auch niemanden und fühlte mich abends oft allein]]. Schön, dass du dich wohlfühlst.

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

In meiner Freizeit [[Hobby|gehe ich gern spazieren und lese]].

Mein Tipp aus eigener Erfahrung: [[Tipp 1|Ich habe damals einen Sprachkurs besucht und dort Freunde gefunden]]. Das kann ich dir empfehlen. Und [[Tipp 2|trinke regelmäßig Kaffee im selben Café]].

Dein Besuchsangebot nehme ich gern an: [[Zeitpunkt des Besuchs|Ich komme im Herbst]].

Weil du neu in der Stadt bist, ist auch [[Idee|ein Sprachtandem eine gute Möglichkeit]]: Man trifft jemanden, übt eine Sprache und lernt sich kennen. Ich habe das einmal gemacht und [[Ergebnis|dabei eine gute Freundin gefunden]]. Vielleicht gibt es so etwas an der Uni oder im Internet.

Ich war in letzter Zeit häufiger [[Erlebnis|im Fitnessstudio und habe dort einige nette Leute kennengelernt]]. Das ist eine gute Möglichkeit, regelmäßig jemanden zu sehen. Ich glaube, das wäre auch etwas für dich, [[Empfehlung|besonders ein Kurs mit festen Terminen]].

Ich habe die Hoffnung, dass wir bei dem Besuch auch [[Hoffnung|andere Menschen kennenlernen, die dir sympathisch sind]]. Vielleicht gibt es einen Stadtrundgang, bei dem man nette Leute trifft. Wir können uns anmelden, [[Idee|das ist eine schöne Möglichkeit für uns beide]].

Erzähl mir, [[Frage an die Freundin|wie dir Würzburg gefällt]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Sophie]],

danke für deine Mail. [[Reaktion auf Sophies Nachricht|Ich freue mich, dass dir der Job gefällt]]. Ich habe gleich mehrere Vorschläge für dich.

Mein erster Vorschlag: [[Tipp 1|Tritt einem Sportverein bei]]. Mein zweiter: [[Tipp 2|Besuche einen Kochkurs]]. Mein dritter: [[Tipp 3|Lade zwei Kollegen zum Grillen ein]].

Bei mir gibt es [[Neuigkeit|eine neue Radtour-Gruppe]]. In meiner Freizeit [[Hobby|fahre ich Rad und spiele Schach]].

Mein vierter Vorschlag: Ich besuche dich [[Zeitpunkt des Besuchs|im Juli für ein Wochenende]], und wir gehen zusammen aus.

Mein fünfter Vorschlag: [[Idee|Mach eine Liste mit fünf Dingen, die du in Würzburg ausprobieren möchtest]], und setze dir ein Ziel für jede Woche. So hast du immer etwas vor, und [[Folge|nach einigen Wochen kennst du viele Orte und Menschen]]. Das hilft gegen das Alleinsein.

Ich habe vor Kurzem [[Erlebnis|bei einem Straßenfest mitgeholfen und viele neue Gesichter gesehen]]. Das war ein schöner Tag, und ich habe mich gleich wohler gefühlt. Vielleicht gibt es in Würzburg auch so ein Fest, das sich lohnt, wenn du Zeit hast.

Mein sechster Vorschlag: Ich komme [[Zeitpunkt|an einem Wochenende, an dem es ein Fest in der Stadt gibt]]. Dann sind viele Leute da, und wir haben Programm. Schau doch bitte nach, [[Bitte|welche Veranstaltungen im Sommer stattfinden]], und schick mir die Termine.

Was hältst du davon? Schreib mir, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Sophie]],

danke für deine Mail. [[Reaktion auf Sophies Nachricht|Ich freue mich, dass dir der Job gefällt]]. Neue Kontakte in einer neuen Stadt brauchen Zeit.

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

In meiner Freizeit [[Hobby|mache ich Yoga und lese]].

Einerseits [[Vorteil von Vereinen|bringt ein Verein viele Kontakte]], andererseits [[Nachteil von Vereinen|braucht man Geduld]]. Ich würde [[Tipp 1|zuerst einen Kurs besuchen]] und danach [[Tipp 2|einem Verein beitreten]].

Ich würde dich gern besuchen, muss aber prüfen, ob es klappt. [[Zeitpunkt des Besuchs|Vielleicht im Frühjahr]].

Ich möchte dir noch Mut machen: Du hast schon [[Anerkennung|einen Job, der dir gefällt, und nette Kollegen]], das ist viel. Der Rest kommt von selbst, wenn man offen bleibt. Es gibt viele Menschen, die [[Hoffnung|genau wie du Anschluss suchen]], du musst sie nur finden.

Bei mir gibt es nichts Aufregendes, [[Neuigkeit|nur kleine Veränderungen im Alltag, zum Beispiel ein neues Regal in der Wohnung]]. Aber gerade diese Kleinigkeiten machen mich glücklich. Ich wünsche dir auch, dass du dich in deiner Wohnung wohlfühlst und kleine Freuden findest.

Mir ist wichtig, dass du dich nicht zu sehr unter Druck setzt: [[Hinweis|Neue Freunde findet man nicht über Nacht]]. Dein Besuch bei mir oder meiner bei dir zeigt, dass du schon Freunde hast, die an dich denken. Das ist ein gutes Gefühl, und das wünsche ich dir.

Ich freue mich auf ein Wiedersehen und hoffe, dass wir bald einen Termin finden. Schreib mir bitte, [[Frage an die Freundin|ob dir das hilft]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Sophie]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf Sophies Nachricht|Glückwunsch zum neuen Job]].

Als Nächstes zu den Neuigkeiten bei mir: [[Neuigkeit|Neue Aufgabe im Büro]].

Dann zu meiner Freizeit: [[Hobby|Schwimmen und Lesen]].

Danach zu den Tipps: Erstens [[Tipp 1|Verein]], zweitens [[Tipp 2|Kurs]], drittens [[Tipp 3|Stammtisch]].

Zuletzt zum Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Juni]].

Zu Würzburg habe ich auch eine Frage: [[Frage|Gibt es dort einen schönen Park oder Fluss, wo man abends spazieren gehen kann]]? Das ist für mich beim Besuch wichtig, denn ich liebe lange Spaziergänge. Und wenn du Lust hast, [[Idee|nehmen wir uns einen Abend nur für uns zwei]].

Mein Alltag hat sich geändert, seit ich [[Veränderung|jeden Abend eine Stunde Zeit für mich nehme, zum Lesen oder Musikhören]]. Das tut mir gut, und ich bin weniger gestresst. Vielleicht kann ich dir bei meinem Besuch zeigen, wie ich das mache, wenn dich das interessiert.

Bei meinem Besuch möchte ich dir gern ein Geschenk machen: [[Geschenk|ein Buch über deine neue Stadt und eine kleine Pflanze für die Wohnung]]. So hast du etwas, das dich an unser Wiedersehen erinnert. Ich hoffe, dass dir das gefällt, und freue mich auf dein Gesicht.

Wie geht es weiter? Schreib mir, [[Frage an die Freundin|welches Wochenende passt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Sophie]],

deine Mail hat mich sehr berührt. [[Reaktion auf Sophies Nachricht|Es tut mir leid, dass du dich abends allein fühlst]]. Du bist nicht allein.

Bei mir gibt es [[Neuigkeit|ein neues Hobby, das mir Freude macht]].

In meiner Freizeit [[Hobby|gehe ich spazieren und treffe Freundinnen]].

Mein Tipp von Herzen: [[Tipp 1|Such dir einen Verein, der dir Freude macht]]. Auch [[Tipp 2|ein Kurs kann ein guter Anfang sein]]. Und [[Tipp 3|sprich ruhig mit Nachbarn]].

Ich besuche dich sehr gern, [[Zeitpunkt des Besuchs|am liebsten im Sommer]].

Falls du magst, rufe ich dich in den nächsten Wochen öfter an, damit du dich weniger allein fühlst. [[Angebot|Jeden Mittwochabend um acht Uhr zum Beispiel]]. Das ist keine große Sache, aber ich glaube, es hilft dir. Und [[Zusatzidee|wir können auch Videoanrufe machen]], wenn du magst.

Ich habe mir vorgenommen, [[Vorsatz|in diesem Jahr mehr zu reisen und neue Städte kennenzulernen]]. Würzburg steht auf meiner Liste ganz oben, deshalb freue ich mich so über deine Einladung. Wir können viel unternehmen und endlich wieder lange reden, wie früher.

Falls du lieber zu mir kommst, bin ich auch dafür offen: [[Alternative|Du bist jederzeit willkommen, und ich zeige dir meine Lieblingsorte]]. Das wäre eine schöne Abwechslung für dich. Wir können das auch im Wechsel machen, einmal bei dir, einmal bei mir.

Es freut mich, dass dir der Job gefällt, und ich bin sicher, dass der Rest bald kommt. Erzähl mir, [[Frage an die Freundin|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Sophie]],

schön, von dir zu hören! [[Reaktion auf Sophies Nachricht|Freut mich, dass der Job passt]].

Neues bei mir: [[Neuigkeit|Nichts Besonderes]].

Freizeit: [[Hobby|Sport und Serien]].

Tipps: [[Tipp 1|Verein]], [[Tipp 2|Kurs]], [[Tipp 3|Stammtisch]].

Besuch? [[Zeitpunkt des Besuchs|Gern, im Sommer]].

Dein Job macht dir Spaß, das ist das Wichtigste. Alles andere findet sich. [[Rat|Bleib neugierig und sag zu, wenn dich jemand einlädt]]. Auch wenn es dir anfangs schwerfällt, [[Folge|dein Kalender füllt sich schneller, als du denkst]]. Das habe ich selbst so erlebt.

Zum Schluss noch eine Neuigkeit: [[Neuigkeit|Ich habe mir ein neues Fahrrad gekauft und fahre jetzt täglich damit]]. Das macht mir Spaß, und es ist gesund. Wenn du magst, leihe ich mir auch eins für den Besuch, dann fahren wir gemeinsam durch die Stadt.

Danke noch einmal für deine Einladung: [[Dank|Sie hat mich sehr gefreut, und ich nehme sie gern an]]. Schreib mir bitte bald, welches Wochenende dir am besten passt, und ich buche gleich meine Fahrkarte. Ich bin schon richtig aufgeregt und freue mich darauf, dich zu sehen.

Ich freue mich echt auf ein Wochenende in Würzburg und hoffe, dass wir viel unternehmen, denn ich habe seit Langem keinen Kurzurlaub gemacht. Meld dich, [[Frage an die Freundin|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

// v2 (B2-style): Nicoles Bruder ist zwei Monate zu Besuch und sitzt stundenlang vor Sportsendungen; sie fragt "Was würdest du machen?" und will Tipps. Points: eigene Erfahrungen mit Geschwistern oder Freunden ·
// Tipps für Nicole · was Sie über den Bruder denken · was Sie selbst gern gemeinsam mit anderen machen — plus: Entschuldigung ("so lange nicht geschrieben"), "Überhaupt nichts sagen oder streiten?".
export const kw = [/Bruder/, /Tipp|Rat|solltest|könntest|vorschlagen|Gespräch|reden|sprechen/i, /Geschwister|Schwester|Freund|Freunden|Erfahrung/i, /gern|gemeinsam|zusammen|mit Freunden|mit meiner|mit meinem/i, /Fernseher|Sport|Sendung/i, /Schwimmbad|Kino|Ausflug|Wetter|draußen|Spaziergang|Spiel/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Nicole]],

wie super, von dir zu hören! Du musst dich nicht entschuldigen, dass du lange nicht geschrieben hast. [[Reaktion auf die Entschuldigung|Mit deinem Bruder zu Besuch hast du bestimmt viel zu tun]]. Es freut mich, dass ihr so viel unternehmt.

Zu deinem Problem: Ich kenne es von meiner Schwester. [[Eigene Erfahrung|Sie hat als Teenager auch stundenlang Fußball geschaut, während ich raus wollte]]. Mein Tipp: [[Tipp 1|Sprich ruhig und freundlich mit ihm und sag, was dir wichtig ist]]. Außerdem [[Tipp 2|schlag ihm vor, dass ihr einen Ausflug macht, bevor das Spiel beginnt]]. Streiten würde ich nicht.

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er liebt Sport und will wohl nach der langen Zeit im Ausland abschalten]].

Ich selbst mache gern gemeinsam mit anderen [[Gemeinsame Aktivität|Wanderungen, Kochabende und Spieleabende]], weil [[Grund für die Aktivität|ich dabei viel lache und mich wohlfühle]].

Wenn dein Bruder erst in zwei Monaten wieder wegfährt, [[Hinweis|solltest du die Zeit mit ihm bewusst nutzen]]. Ihr könnt zum Beispiel [[Idee|jeden Samstag einen besonderen Ausflug planen]], an den er sich später gern erinnert. Das ist für Geschwister, die weit voneinander leben, doppelt wertvoll.

Von meinen Geschwistern habe ich gelernt: [[Lehre|Man muss sich Zeit füreinander ausdrücklich nehmen, sonst vergeht sie]]. Als meine Schwester im Ausland lebte, haben wir [[Gewohnheit|jeden Sonntag eine Stunde telefoniert]]. Das war uns beiden wichtig, und es hat unsere Beziehung gestärkt.

Was ich selbst gern gemeinsam mache, möchte ich noch ergänzen: [[Aktivität|Ich gehe am Sonntag oft mit meiner Familie wandern und koche abends zusammen]]. Das schafft Nähe, und niemand schaut aufs Handy. Ich glaube, das wäre auch für dich und deinen Bruder ideal, [[Idee|ein gemeinsames Kochen mit seiner Lieblingsspeise]].

Schreib mir bitte, [[Frage an die Freundin|wie ihr das gelöst habt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Nicole]],

wie wunderbar, dass ich von dir höre! Kein Stress wegen der Pause, [[Reaktion auf die Entschuldigung|dein Bruder ist doch zu Besuch]]. Klingt nach einer schönen Zeit mit Schwimmbad und Kino.

Fernseher und Sport, das kenn ich! [[Eigene Erfahrung|Mein Kumpel hat bei der Fußball-WM nur noch auf dem Sofa gesessen]]. Mein Tipp: [[Tipp 1|Sag ihm ganz locker, dass du mit ihm rausgehen willst]]. Oder [[Tipp 2|schau das Spiel einfach mit, dann hast du Zeit mit ihm]]. Streiten bringt nichts.

Was ich über ihn denke? [[Meinung über den Bruder|Er ist wohl ein großer Sportfan, nett, aber ein bisschen sturköpfig]].

Gemeinsam mit anderen mache ich gern [[Gemeinsame Aktivität|Grillen, Radfahren und Brettspiele]].

Ich würde ihm ehrlich sagen, [[Gefühl|dass du dich manchmal übergangen fühlst]]. Meistens merken Männer das gar nicht. Wenn du es ruhig und ohne Vorwurf sagst, [[Folge|wird er bestimmt zuhören]]. Das habe ich selbst erlebt, und es hat besser funktioniert als alles andere.

Mit Freunden habe ich Ähnliches erlebt: [[Erlebnis|Einer von ihnen hat jedes Wochenende nur gespielt]]. Wir haben ihm offen gesagt, dass wir ihn vermissen, und [[Folge|er hat seine Gewohnheiten geändert]]. Ehrlichkeit hilft fast immer, wenn sie freundlich vorgetragen wird.

Gemeinsam mit anderen spiele ich gern [[Spiel|Volleyball im Park oder Karten am Abend]]. Das ist unkompliziert und macht gute Laune. Vielleicht kannst du deinen Bruder zu einem Spiel mitnehmen, [[Folge|Sport ist ja sein Thema]], und er macht sicher gern mit.

Meld dich, [[Frage an die Freundin|was er dazu gesagt hat]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Nicole]],

wow, dein Bruder ist zwei Monate bei euch, das ist wunderbar! Entschuldige dich bitte nicht für die Pause. [[Reaktion auf die Entschuldigung|Ich freue mich einfach, dass es euch gut geht]]. Schwimmbad und Kino klingen nach einem tollen Sommer.

Dein Problem kenne ich: [[Eigene Erfahrung|Mein Bruder ist bei jedem Spiel wie versteinert]]. Mein Tipp: [[Tipp 1|Mach ihm einen Vorschlag, der ihn reizt, zum Beispiel eine Radtour mit anschließendem Eis]]. Oder [[Tipp 2|schau mit ihm ein Spiel an und frag ihn danach etwas über die Regeln]]. So habt ihr beide etwas davon.

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er ist bestimmt ein toller Mensch, der nur Sport liebt]].

Gemeinsam mit anderen mache ich am liebsten [[Gemeinsame Aktivität|Tanzen, Wandern und Picknicken]].

Du kannst ihm auch einen kleinen Deal vorschlagen: [[Deal|Eine Stunde Sport, danach eine Stunde mit dir]]. Das ist fair, und er kann beides genießen. Wenn er ein guter Bruder ist, [[Folge|wird er sich darauf einlassen]]. Ich glaube, dass ihr einen guten Kompromiss findet.

Mit meinem Bruder hatte ich als Kind viel Streit, [[Erinnerung|meist über das Fernsehprogramm]]. Heute lache ich darüber. Wir haben gelernt, [[Lehre|Absprachen zu treffen, wer wann bestimmen darf]]. Das klingt streng, aber es funktioniert.

In meiner Freizeit gehe ich gern [[Aktivität|mit Freunden ins Schwimmbad und danach ein Eis essen]]. Das ist ein einfacher Plan, den fast jeder mag. Dein Bruder und du macht das ja auch schon, [[Wunsch|ich hoffe, ihr habt dabei viel Spaß]].

Schreib mir bald, [[Frage an die Freundin|ob mein Tipp geholfen hat]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Nicole]],

danke für deine schnelle Antwort. Deine Punkte beantworte ich nacheinander.

Erstens, die Pause: [[Reaktion auf die Entschuldigung|Du musst dich nicht entschuldigen, dein Bruder ist ja zu Besuch]].

Zweitens, meine Erfahrung: [[Eigene Erfahrung|Ich hatte ein ähnliches Problem mit einem Freund, der nur Sportsendungen sah]].

Drittens, meine Tipps: Ich empfehle, [[Tipp 1|ihn freundlich anzusprechen und einen Kompromiss zu finden]]. Außerdem [[Tipp 2|solltet ihr feste Zeiten für Fernsehen und Ausflüge vereinbaren]].

Viertens, dein Bruder: [[Meinung über den Bruder|Ich finde, er ist wahrscheinlich entspannt, aber vielleicht nicht aufmerksam genug]].

Fünftens, gemeinsame Aktivitäten: Ich mache gern [[Gemeinsame Aktivität|Sport und Spieleabende mit anderen]].

Ein Gespräch am besten [[Zeitpunkt|am Abend bei einem gemütlichen Essen]], nicht während eines Spiels. Dann ist er entspannt und hört dir besser zu. Sag ihm, [[Aussage|dass du gern mehr Zeit mit ihm hättest]], und frage, was er sich wünscht. Das zeigt, dass du ihn ernst nimmst.

In meiner Familie war es ähnlich: [[Erlebnis|Mein Vater saß jeden Samstag vor der Sportschau]]. Meine Mutter hat dann einfach [[Reaktion|einen Kaffee gebracht und sich dazugesetzt]]. Das war ihr Weg, Zeit mit ihm zu verbringen, ohne zu streiten, und es hat funktioniert.

Gemeinsam mit anderen mache ich am liebsten [[Aktivität|Kochen und Musik hören]]. Es entsteht eine schöne Stimmung, und man kann sich unterhalten. Ihr könntet [[Idee|einen Abend lang zusammen kochen]], während im Hintergrund ein Spiel läuft, das ist ein guter Kompromiss.

Bitte teile mir mit, [[Frage an die Freundin|ob dir das hilft]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Nicole]],

danke dir für deine Rückmeldung. [[Reaktion auf die Entschuldigung|Es ist völlig in Ordnung, dass du länger nicht geschrieben hast]]. Zu deinem Problem helfe ich dir gern.

Praktische Tipps: [[Tipp 1|Plan mit ihm feste Ausflüge, zum Beispiel jeden Nachmittag eine Stunde]]. Außerdem [[Tipp 2|kauf Tickets für etwas, das er mag, zum Beispiel ein Fußballspiel im Stadion]]. Ich kann [[Praktische Hilfe|dir einen Plan für die zwei Monate zusammenstellen]].

Meine Erfahrung: [[Eigene Erfahrung|Ich habe mit meiner Schwester feste Zeiten für Fernsehen und Spaziergänge vereinbart]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er liebt Sport und kann das wohl nicht abstellen]].

Ich mache gern gemeinsam mit anderen [[Gemeinsame Aktivität|Kochen und Wandern]].

Praktisch wäre auch, [[Idee|einen gemeinsamen Kalender für seine Besuchszeit zu machen]], in dem ihr Termine für Sport und für Ausflüge eintragt. So gibt es keine Überraschungen, und er weiß, was ihn erwartet. Das hilft vielen Menschen, besonders wenn sie aus dem Ausland kommen.

Mit meiner besten Freundin habe ich auch Erfahrungen: [[Erlebnis|Sie ist ein Serienfan, ich bin lieber draußen]]. Wir haben einen Rhythmus gefunden, [[Lösung|ein Abend Serie, ein Abend Spaziergang]]. Seitdem gibt es keinen Streit mehr, und beide sind zufrieden.

Ich mag [[Aktivität|Gesellschaftsspiele mit der ganzen Familie]], besonders [[Spiel|ein Quiz oder ein Kartenspiel]]. Das ist spannend, und niemand sitzt vor dem Fernseher. Vielleicht gefällt das auch deinem Bruder, [[Folge|er ist ja bestimmt wettbewerbsfreudig]].

Sag mir bitte, [[Frage an die Freundin|ob ich noch etwas tun kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Nicole]],

du brauchst dich nicht zu entschuldigen, denn [[Begründung für die Nachsicht|dein Bruder ist zu Besuch, und das braucht Zeit]]. Zu deinem Problem habe ich eine klare Meinung.

Ich würde nicht streiten, weil [[Grund gegen Streit|das die kurze Zeit mit ihm belasten würde]]. Mein Tipp: [[Tipp 1|Sprich ihn freundlich an und erkläre, was dir wichtig ist]]. Außerdem [[Tipp 2|biete ihm Alternativen an, die ihm auch Spaß machen]], da [[Grund für Alternativen|er dann eher mitkommt]].

Eigene Erfahrung: [[Eigene Erfahrung|Mit meinem Freund hat ein ruhiges Gespräch alles gelöst]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er ist sicher kein schlechter Mensch, er hat nur eine Leidenschaft]].

Ich mache gern gemeinsam mit anderen [[Gemeinsame Aktivität|Sport und Musik]], weil [[Grund|man dabei Gemeinschaft erlebt]].

Falls das Wetter schön ist, [[Idee|hole ihn vor dem Spiel ab und sag, dass er es später sehen kann]]. Heute gibt es Wiederholungen und Zusammenfassungen. Das ist ein starkes Argument, denn [[Begründung|so verpasst er nichts und hat trotzdem Zeit für dich]].

Als Kind habe ich oft allein gespielt, weil meine Geschwister [[Grund|nur Bildschirmspiele mochten]]. Ich habe damals nichts gesagt, und das war ein Fehler. Heute rate ich dir, [[Rat|offen zu sprechen]], damit du nicht später bereust, nichts getan zu haben.

Zusammen mit anderen fotografiere ich gern, [[Aktivität|vor allem auf Ausflügen und Festen]]. Das ist eine schöne Aktivität, weil jeder seinen Teil beiträgt. Ihr könntet [[Idee|gemeinsam ein Fotoalbum von seinem Besuch machen]], das wäre ein schönes Andenken.

Schreib mir, [[Frage an die Freundin|ob dir meine Gründe einleuchten]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Nicole]],

ich habe deine Mail gelesen, hier ist meine knappe Antwort.

Pause: [[Reaktion auf die Entschuldigung|Kein Problem]].

Erfahrung: [[Eigene Erfahrung|Ähnliches mit meiner Schwester erlebt]].

Tipps: [[Tipp 1|Freundlich reden]]. [[Tipp 2|Ausflüge vorschlagen]].

Dein Bruder: [[Meinung über den Bruder|Sportfan, vermutlich entspannt]].

Gemeinsam mache ich gern: [[Gemeinsame Aktivität|Wandern, Kochen]].

Ich würde auch überlegen, ob du [[Idee|nicht selbst ein bisschen Interesse an seinem Sport zeigst]]. Frag ihn, was daran so spannend ist. Vielleicht [[Folge|erzählt er dir gern mehr und freut sich über dein Interesse]]. So habt ihr ein gemeinsames Thema, und der Fernseher stört weniger.

Von Freunden weiß ich: [[Beobachtung|Wenn man sich länger nicht sieht, verändern sich die Gewohnheiten]]. Dein Bruder hat im Ausland vielleicht neue Vorlieben bekommen. Deshalb ist Verständnis wichtig, [[Rat|und ein Gespräch, in dem jeder erzählt]].

Mit Freunden gehe ich oft [[Aktivität|zum Fußball im Park]], als Zuschauerin und manchmal als Spielerin. Dort verstehe ich, warum Sport so fesselt. Vielleicht verstehst du deinen Bruder besser, wenn du [[Idee|einmal mit ihm ein Spiel live anschaust]].

Ich wünsche dir viel Erfolg bei dem Gespräch und hoffe, dass ihr einen guten Weg findet, denn die Zeit mit deinem Bruder ist kostbar und sollte nicht im Streit enden. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|was er sagt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Nicole]],

dein Bruder und der Fernseher, das ist wohl eine Liebesgeschichte! [[Reaktion auf die Entschuldigung|Entschuldigung angenommen, du hattest ja Besuch]]. Mein Tipp: Nicht streiten, sonst gewinnt am Ende der Sport.

Meine Erfahrung: [[Eigene Erfahrung|Mein Onkel hat bei der Weltmeisterschaft drei Wochen nicht mit uns geredet]]. Ich schlage vor: [[Tipp 1|Bring Snacks und setz dich mit hin, dann wird es zum Familienabend]]. Oder [[Tipp 2|schlag eine Wette vor: Wer das Spiel verliert, geht mit spazieren]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er ist offenbar der geborene Kommentator]].

Ich mache gern gemeinsam mit anderen [[Gemeinsame Aktivität|Karten spielen und Grillen]].

Zwei Monate sind lang, aber auch schnell vorbei: [[Hinweis|Nutze jede Woche, um etwas Besonderes zu zweit zu machen]]. Wenn er wieder weg ist, sind es diese Erinnerungen, die zählen. Ich bin sicher, dass ihr es schafft, die Zeit zu genießen, trotz Fernseher.

Bei einem Besuch meines Cousins habe ich Folgendes gemacht: [[Idee|Ich habe ihn jeden Morgen zum Frühstücken in ein Café mitgenommen]]. Dort war der Fernseher kein Thema, und wir haben viel geredet. Vielleicht ist das für dich ein Vorbild, [[Folge|einfach neue Orte für gemeinsame Zeit zu finden]].

In meiner Familie machen wir gern [[Aktivität|jedes Jahr einen Ausflug in die Berge]], das ist unser Ritual. Es verbindet uns, auch wenn wir weit auseinander wohnen. Das wäre vielleicht ein Plan für euch beide, [[Idee|ein Ausflug, bevor er wieder abreist]].

Schreib bald, [[Frage an die Freundin|wer das Spiel gewonnen hat]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Nicole]],

als ich deine Mail gelesen habe, musste ich an meinen Bruder denken. [[Erinnerung an den Bruder|Er war früher auch nur vor dem Fernseher zu finden]]. Dass du lange nicht geschrieben hast, ist nicht schlimm.

Meine Erfahrung: [[Eigene Erfahrung|Ich habe ihn eines Tages einfach zu einem Spaziergang abgeholt, und er kam mit]]. Mein Tipp: [[Tipp 1|Lade ihn zu etwas ein, das er liebt, ohne Fernsehen]]. Und [[Tipp 2|sprich ehrlich mit ihm, ohne Vorwurf]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er freut sich bestimmt auch auf die Zeit mit dir]].

Ich mache am liebsten gemeinsam mit anderen [[Gemeinsame Aktivität|lange Spaziergänge und Abendessen]].

Wenn du magst, rufe ich euch an und lade euch beide zu mir ein: [[Angebot|Ein Wochenende bei mir, mit Grillen und einem Ausflug an den See]]. Dann hat er einen Anlass, vom Fernseher wegzukommen, und ihr habt Zeit zu dritt. Ich freue mich, euch beide wiederzusehen.

Mit meiner Schwester habe ich ein Ritual: [[Ritual|Jeden Abend ein kurzer Spaziergang nach dem Essen]]. Das ist unsere Zeit, und niemand darf Fernseher oder Handy anmachen. Vielleicht kannst du so etwas auch mit deinem Bruder vereinbaren, [[Folge|dann habt ihr einen festen Moment]].

Ich bin gern mit anderen [[Aktivität|beim Tanzen oder bei Konzerten]], weil Musik Menschen zusammenbringt. Ich glaube, dass dein Bruder auch Musik mag. Vielleicht gibt es ein Konzert, [[Idee|zu dem ihr beide gehen könnt]], das wäre eine schöne Abwechslung.

Erzähl mir, [[Frage an die Freundin|wie es euch geht]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Nicole]],

ich habe mich wirklich über deine Nachricht gefreut! [[Reaktion auf die Entschuldigung|Die Pause ist kein Problem]]. Ich habe gleich mehrere Tipps und Vorschläge für dich.

Mein erster Vorschlag: [[Tipp 1|Sprich freundlich mit ihm]]. Mein zweiter: [[Tipp 2|Plane gemeinsame Ausflüge für die Zeiten ohne Sport]]. Mein dritter: [[Tipp 3|Schaut zusammen ein Spiel an und macht danach etwas Gemeinsames]].

Meine Erfahrung: [[Eigene Erfahrung|Ein Kompromiss hat bei uns immer geholfen]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er ist ein Sportfan, aber kein schlechter Mensch]].

Mein vierter Vorschlag: Mach [[Gemeinsame Aktivität|einen Spieleabend mit Freunden]], da kann er auch mitmachen.

Als vierten Vorschlag empfehle ich, [[Vorschlag|ihn mit Freunden bekannt zu machen]]. Er ist lange weg gewesen und kennt vielleicht kaum noch jemanden. Wenn er neue Leute trifft, [[Folge|vergisst er den Fernseher von selbst]]. Und du hast mehr Zeit für schöne Abende.

Mein fünfter Vorschlag nach meiner Erfahrung mit Geschwistern: [[Vorschlag|Mach ein kleines Fotoprojekt mit ihm, zum Beispiel ein Album über seine Zeit hier]]. Das macht Spaß und bringt euch zusammen. Außerdem [[Folge|hast du später ein schönes Andenken]].

Mein sechster Vorschlag: Macht [[Idee|einen Familienabend mit Spielen und Snacks]], an dem alle mitmachen. Das ist oft besser als jeder Streit, und [[Folge|am Ende lachen alle zusammen]]. Ich habe das mit meiner Familie schon oft gemacht.

Was hältst du davon? Gib mir einfach Bescheid, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Nicole]],

danke für deine Rückmeldung. [[Reaktion auf die Entschuldigung|Du brauchst dich nicht zu entschuldigen]]. Zu deinem Problem möchte ich vorsichtig antworten.

Einerseits [[Vorteil eines Gesprächs|kann ein ruhiges Gespräch helfen]], andererseits [[Nachteil eines Gesprächs|könnte er sich angegriffen fühlen]]. Ich würde [[Tipp 1|zuerst einen kleinen Vorschlag machen]] und danach [[Tipp 2|offen mit ihm reden]].

Meine Erfahrung: [[Eigene Erfahrung|Mit meinem Cousin hat das so geklappt]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er will sich wahrscheinlich entspannen]].

Ich mache gern gemeinsam mit anderen [[Gemeinsame Aktivität|ruhige Spiele und Spaziergänge]].

Man muss aber auch Geduld haben: [[Hinweis|Er braucht nach der langen Reise vielleicht erst einmal Ruhe]]. Der Fernseher ist für ihn ein Stück Zuhause. Gib ihm ein paar Tage, [[Folge|dann will er bestimmt rausgehen]]. Und wenn nicht, sprichst du es an.

Bei Streit unter Geschwistern habe ich gelernt, [[Lehre|nicht sofort zu reagieren, wenn man sich ärgert]]. Ich schlafe eine Nacht darüber und sage am nächsten Tag etwas. Dann ist der Ton ruhiger, und [[Folge|man findet leichter eine Lösung]].

Ich kann mir vorstellen, dass ihr gemeinsam [[Aktivität|Rad fahren oder schwimmen]] könnt, das habt ihr ja schon. Nutzt diese Dinge, denn sie tun gut. Und [[Idee|plant lieber mehr kleine Ausflüge als wenige große]], dann bleibt er in Bewegung.

Schreib mir doch kurz, [[Frage an die Freundin|ob dir das hilft]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Nicole]],

danke für deine E-Mail, ich nehme mir deine Punkte nacheinander vor. Als Erstes: [[Reaktion auf die Entschuldigung|Entschuldige dich nicht]].

Als Nächstes zu meiner Erfahrung: [[Eigene Erfahrung|Ähnliches mit meiner Schwester]].

Dann zu den Tipps: Erstens [[Tipp 1|freundlich reden]], zweitens [[Tipp 2|Ausflüge anbieten]], drittens [[Tipp 3|gemeinsam schauen]].

Danach zu deinem Bruder: [[Meinung über den Bruder|Er liebt Sport]].

Zuletzt zu mir: Ich mache gern [[Gemeinsame Aktivität|Spaziergänge und Spiele]].

Zum Schluss ein Schritt für dich: [[Schritt|Schreib auf, was du dir von der gemeinsamen Zeit wünschst]]. Dann weißt du genau, was du sagen willst, und kannst es ihm ruhig erklären. Ein Plan hilft, wenn Gefühle im Spiel sind, und deine Bitte klingt dann klar.

Als ich meinen Freund lange nicht gesehen hatte, [[Erlebnis|war er zuerst sehr müde und wollte nur fernsehen]]. Nach drei Tagen wurde er wieder aktiv, und wir haben viel unternommen. Vielleicht ist es bei deinem Bruder genauso, [[Hoffnung|und die ersten Tage sind nur eine Eingewöhnung]].

Zum Schluss noch eine Idee: [[Idee|Macht eine kleine Liste mit zehn Dingen, die ihr zusammen erleben wollt]], bevor er abreist. Jeder darf fünf Wünsche aufschreiben. So kommt jeder zu seinem Recht, und ihr habt eine schöne Aufgabe, [[Folge|die euch verbindet]].

Wie geht es weiter? Schreib mir, [[Frage an die Freundin|was er sagt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Nicole]],

deine Mail hat mich berührt, und mach dir keine Gedanken wegen der Pause. [[Reaktion auf die Entschuldigung|Die Zeit mit deinem Bruder ist kostbar]]. Ich verstehe, dass dich der Fernseher stört, du möchtest ja Zeit mit ihm verbringen.

Meine Erfahrung: [[Eigene Erfahrung|Ich war einmal in derselben Lage und habe mit meiner Schwester gesprochen]]. Mein Tipp: [[Tipp 1|Sag ihm, dass du ihn vermisst und gern mehr Zeit mit ihm hättest]]. Und [[Tipp 2|schlag eine kleine gemeinsame Aktivität vor]].

Über deinen Bruder denke ich: [[Meinung über den Bruder|Er hat dich lieb, auch wenn er es nicht zeigt]].

Ich mache gern gemeinsam mit anderen [[Gemeinsame Aktivität|Kochen und Spazierengehen]].

Du bist eine liebe Schwester, und dein Bruder kann froh sein, dich zu haben: [[Anerkennung|Du denkst an die gemeinsame Zeit, nicht nur an dich]]. Das ist nicht selbstverständlich. Ich bin sicher, dass er das irgendwann auch merkt und sich bedankt, [[Folge|spätestens beim Abschied]].

Mit Geschwistern ist es oft so, dass man [[Beobachtung|einander gern hat, aber nicht weiß, wie man es zeigt]]. Ich habe das bei mir und meinem Bruder erlebt. Ein kleines Zeichen reicht, [[Beispiel|zum Beispiel ein Brief oder ein gemeinsames Foto]].

Wenn ich Zeit mit meinen Liebsten verbringe, mag ich es [[Vorliebe|ruhig und ohne Hektik]]. Ein Tee, ein Gespräch und ein Spaziergang reichen mir. Das wäre auch ein gutes Angebot für deinen Bruder, [[Folge|er kann dabei sicher gut abschalten]].

Erzähl mir, [[Frage an die Freundin|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Nicole]],

kein Stress wegen der Pause. [[Reaktion auf die Entschuldigung|Dein Bruder ist ja da]].

Erfahrung: [[Eigene Erfahrung|Mein Kumpel war genauso]].

Tipps: [[Tipp 1|Locker mit ihm reden]]. [[Tipp 2|Ausflug vorschlagen]].

Dein Bruder: [[Meinung über den Bruder|Sportfan, ganz nett]].

Gemeinsam mache ich gern: [[Gemeinsame Aktivität|Grillen, Kino]].

Ein schneller Tipp noch: [[Tipp|Bring ihm einen Kaffee und frag, ob er mit raus kommt]]. Fünfzehn Minuten reichen oft schon, und er fühlt sich nicht gedrängt. [[Folge|Oft wird daraus ein längerer Spaziergang]], und der Fernseher ist vergessen.

Aus meiner Erfahrung hilft auch Humor: [[Idee|Schlag ihm vor, dass ihr gegeneinander wetten, wer mehr Elfmeter hält]]. Wenn man lacht, ist der Fernseher plötzlich nicht mehr so wichtig. Es entsteht Nähe, [[Folge|ganz ohne Streit]].

Gemeinsam mit anderen mache ich am liebsten [[Aktivität|Unternehmungen, die spontan entstehen]]. Das ist oft schöner als geplante Termine. Vielleicht [[Idee|klopfst du einfach an seine Tür und sagst: Komm mit auf ein Eis]]. Das wirkt oft Wunder.

Ich drücke dir die Daumen, dass ihr noch viele schöne Tage zusammen habt, denn so eine Zeit mit dem Bruder ist selten und wertvoll, und er fährt ja bald wieder weg. Ich glaube fest an euch beide und freue mich, wenn du mir erzählst, wie es weitergeht. Meld dich, [[Frage an die Freundin|wie es lief]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

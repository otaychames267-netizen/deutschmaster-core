// v2 (B2-style): Tamara hat die Stelle gewechselt, muss bald in Ihre Gegend reisen und möchte sich abends treffen (und Ihre Familie kennenlernen). Points: Vorschlag zum Treffen ·
// jemanden mitbringen · Frage zur neuen Arbeitsstelle · warum Sie nicht geschrieben haben — plus: "Sorgen gemacht", "Wie findest du meine Idee?" (Frage zurück).
export const kw = [/treff/i, /mitbring|Familie|Mann|Frau|Freund|Freundin|Kinder|Partner|Begleit/i, /Stelle|Arbeit|Job|Firma|Kollegen|Chef|anstrengend/i, /geschrieben|gemeldet|leider|Entschuldig|tut mir leid|Sorgen/i, /Abend|Gegend|unternehmen|Restaurant|Kino|Essen/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Tamara]],

vielen Dank für deinen Brief, ich habe mich riesig gefreut! Es tut mir wirklich leid, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Bei uns war viel los, ich kam kaum zum Schreiben]]. Bei uns ist aber alles in Ordnung.

Dein Vorschlag, dass wir uns bei deinem Besuch am Abend treffen, gefällt mir sehr. Ich würde vorschlagen, [[Treffpunkt und Zeit|dass wir am Freitag um 19 Uhr in dem kleinen Restaurant am Marktplatz essen]]. Danach können wir [[Programm nach dem Essen|noch einen Spaziergang durch die Altstadt machen]].

Gern bringe ich jemanden mit: [[Begleitung|Meinen Mann und unsere beiden Kinder]] würden dich gern kennenlernen. Sie [[Eigenschaft der Familie|sind neugierig und freuen sich schon sehr auf dich]].

Du schreibst, dass deine neue Stelle interessant, aber anstrengend ist. [[Frage zur Arbeit|Was genau machst du dort, und wie sind deine Kollegen]]? Ich bin gespannt, wie es dir bei der Arbeit geht.

Ich freue mich besonders darauf, dass wir uns nach so langer Zeit wiedersehen: Wir haben uns [[Zeit seit dem letzten Treffen|über ein Jahr nicht mehr gesehen]], und es gibt bestimmt viel zu erzählen. Ich bin gespannt, [[Neugier|wie dein Alltag jetzt aussieht und wie du dich verändert hast]]. Bei mir ist auch einiges passiert.

Bei mir gibt es übrigens auch Neuigkeiten, über die ich gern persönlich erzähle: [[Neuigkeit|Ich habe in diesem Jahr einen Sprachkurs angefangen und neue Freunde gefunden]]. Außerdem [[Weitere Neuigkeit|haben wir einen kleinen Hund bekommen]], den du unbedingt kennenlernen musst. Er freut sich auf jeden Gast.

Treffen werden wir uns [[Treffpunkt|direkt vor dem Restaurant]], und ich warte dort auf dich, wenn du [[Ankunft|pünktlich um 19 Uhr kommst]]. Ich trage [[Erkennungszeichen|eine rote Jacke]], damit du mich sofort siehst.

Schreib mir bitte, [[Frage an die Freundin|an welchem Tag du genau bei uns bist]]. Wie findest du meine Idee mit dem Abendessen?

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name der Freundin|Tamara]],

oh je, tut mir leid, dass du dir Sorgen gemacht hast! [[Grund für die Pause|Ich bin einfach nicht zum Schreiben gekommen, der Alltag hat mich total geschluckt]]. Bei uns ist alles gut.

Ein Treffen am Abend? Unbedingt! Wie wäre es [[Treffpunkt und Zeit|mit einem Abendessen am Donnerstag in meiner Lieblingspizzeria]]? Danach [[Programm nach dem Essen|gehen wir noch auf ein Eis in die Stadt]].

Ich bringe gern jemanden mit: [[Begleitung|Meine Freundin Lena und mein Bruder]] sind dabei. Und meine Familie lernst du auch kennen, [[Plan mit der Familie|am Wochenende, wenn du noch da bist]].

Deine neue Stelle klingt spannend! [[Frage zur Arbeit|Wie viele Stunden arbeitest du, und reist du gern]]? Erzähl mir alles beim Essen.

Für den Abend selbst habe ich schon etwas im Kopf: Wir könnten [[Programmidee|zuerst gemütlich essen und danach in einem Café noch lange reden]]. Wenn du möchtest, [[Zusatzidee|zeige ich dir meine neue Wohnung]], sie liegt ganz in der Nähe. Dann lernst du auch meine Nachbarn kennen.

Ich schlage vor, dass wir uns schon vor dem Abend kurz telefonieren: [[Telefonvorschlag|am Sonntag um 18 Uhr, wenn du Zeit hast]]. Dann können wir die Details besprechen und [[Planung|noch einmal alles genau abstimmen]]. So gibt es keine Überraschungen, außer den schönen.

Wenn du Lust hast, treffen wir uns schon [[Zeit|eine Stunde früher auf einen Kaffee]], bevor die anderen kommen. Dann haben wir Zeit, [[Gesprächsthema|über die alten Zeiten zu reden]], nur wir zwei. Das fände ich sehr schön.

Meld dich, [[Frage an die Freundin|wann genau du kommst]]. Wie findest du meinen Plan?

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Tamara]],

wow, was für eine tolle Überraschung! Entschuldige bitte, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich hatte so viel um die Ohren, dass ich ganz vergessen habe zu schreiben]]. Bei uns ist alles wunderbar.

Dass du in unsere Gegend kommst, ist großartig! Wir treffen uns [[Treffpunkt und Zeit|am Mittwochabend in einem schönen Restaurant am Fluss]], und danach [[Programm nach dem Essen|gehen wir ins Kino oder auf eine Bar]]. Das wird ein toller Abend!

Ich bringe [[Begleitung|meinen Freund Jan und meine Schwester]] mit, sie wollen dich unbedingt kennenlernen. Meine Familie ist [[Eigenschaft der Familie|herzlich und lebendig]].

Deine neue Stelle klingt spannend! [[Frage zur Arbeit|Welche Aufgaben hast du, und gefällt dir das Reisen]]? Ich bin so neugierig.

Falls es regnet, habe ich einen Plan B: Wir gehen [[Regenplan|ins Kino und danach auf einen heißen Tee]], oder wir bleiben in einem Café, wo es warm ist. So wird der Abend auf jeden Fall schön. Ich [[Vorbereitung|reserviere vorher einen Tisch, damit wir nicht warten müssen]].

Wenn du magst, lade ich noch [[Gäste|zwei alte Freunde aus unserer Studienzeit]] ein, damit der Abend noch lustiger wird. Natürlich nur, wenn dir das recht ist. Ich weiß, dass du [[Eigenschaft|gern in kleiner Runde sitzt]], deshalb frage ich vorher.

Zur Verabredung noch ein Hinweis: Das Lokal liegt [[Lage|nur zehn Minuten vom Hauptbahnhof entfernt]], du kannst es zu Fuß erreichen. Falls du dich verirrst, [[Hilfe|ruf mich einfach an]], ich komme dir entgegen. Ein Treffen mit dir ist mir wichtig.

Schreib mir bald, [[Frage an die Freundin|wann du ankommst]]. Wie findest du meine Idee?

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Tamara]],

vielen Dank für deinen Brief. Zu deinen Fragen nehme ich der Reihe nach Stellung.

Erstens, die Pause: Es tut mir leid, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich hatte beruflich viel zu tun und wenig Freizeit]].

Zweitens, dein Vorschlag: Ein Treffen am Abend finde ich gut. Ich schlage [[Treffpunkt und Zeit|Donnerstag um 19.30 Uhr im Restaurant am Bahnhof]] vor.

Drittens, die Begleitung: Ich bringe [[Begleitung|meine Frau und meinen Sohn]] mit, damit du unsere Familie kennenlernst.

Viertens, deine Stelle: [[Frage zur Arbeit|Welche Aufgaben hast du, und wie viel bist du unterwegs]]?

Ich kann dich gern vom Hotel oder vom Bahnhof abholen: [[Abholung|Ich komme mit dem Auto und warte vor dem Eingang]]. Dann sparst du Zeit und musst dich nicht um den Weg kümmern. Gib mir einfach [[Information|deine Ankunftszeit und die Adresse]], dann klappt alles.

Für deine Arbeit wünsche ich dir viel Erfolg, und ich hoffe, dass du [[Wunsch|bald weniger Stress hast und mehr Zeit für dich]]. Ich weiß, wie schwer es ist, wenn man den Job wechselt und sich alles neu einrichten muss. Wenn du darüber reden möchtest, [[Angebot|bin ich jederzeit für dich da]].

Beim Treffen möchte ich dir auch [[Mitbringsel|ein kleines Geschenk überreichen]], damit du dich willkommen fühlst. Wenn du etwas Bestimmtes brauchst, [[Hilfsangebot|besorge ich es vorher gern für dich]]. Sag mir einfach Bescheid.

Ich freue mich auf [[Vorfreude|ein Wiedersehen nach so langer Zeit]]. Bitte teile mir mit, [[Frage an die Freundin|ob dir der Termin passt]]. Wie findest du meinen Vorschlag?

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Tamara]],

danke für deinen Brief! Entschuldige, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich hatte eine stressige Zeit und bin nicht zum Schreiben gekommen]]. Jetzt helfe ich dir gern bei der Planung.

Für unser Treffen schlage ich [[Treffpunkt und Zeit|Dienstag um 19 Uhr in einem Restaurant in der Nähe deines Hotels]] vor. Ich kann [[Praktische Hilfe|einen Tisch reservieren und dich vom Hotel abholen]].

Ich bringe [[Begleitung|meine Frau und meine Tochter]] mit. Wenn du magst, [[Weitere Hilfe|zeigen wir dir danach die Stadt]].

Zu deiner Arbeit: [[Frage zur Arbeit|Brauchst du in Deutschland ein Auto, oder reist du mit dem Zug]]? Ich helfe dir gern, falls du Tipps brauchst.

Zu deiner neuen Stelle habe ich noch eine Idee: Wenn du viel reist, ist es wichtig, [[Rat|genug zu schlafen und regelmäßig zu essen]]. Ich habe selbst [[Eigene Erfahrung|einmal viel Stress im Job gehabt]] und weiß, wie anstrengend das ist. Wir können beim Essen darüber reden, wenn du magst.

Ich möchte dir noch sagen, dass du dir wirklich keine Sorgen um uns machen musst: [[Beruhigung|Wir sind alle gesund und gut gelaunt]]. Die Kinder gehen gern in die Schule, mein Mann arbeitet viel, aber es geht ihm gut. Ich freue mich, dass du an uns denkst.

Ich schlage vor, dass wir uns nach dem Essen [[Programm|noch ein Stück durch die Altstadt treiben lassen]], weil es abends dort besonders schön ist. Wir können dabei [[Gesprächsthema|über Familie und Arbeit sprechen]], wie früher. Dann wird es ein richtiger Treffen-Abend.

Schreib mir, [[Frage an die Freundin|wann du ankommst]]. Wie findest du meinen Plan?

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Tamara]],

es tut mir leid, dass du dir Sorgen gemacht hast, denn [[Grund für die Pause|ich habe so viel gearbeitet, dass ich abends nur noch müde war]]. Das war keine Absicht.

Dein Vorschlag, dass wir uns am Abend treffen, ist gut, weil [[Grund für den Abend|wir dann in Ruhe reden können]]. Ich schlage [[Treffpunkt und Zeit|Mittwoch um 19 Uhr in einem ruhigen Restaurant]] vor.

Ich bringe [[Begleitung|meine Familie]] mit, weil [[Grund für die Begleitung|du sie unbedingt kennenlernen sollst]].

Deine neue Stelle interessiert mich, deshalb frage ich: [[Frage zur Arbeit|Was gefällt dir an der Arbeit und was ist anstrengend]]?

Weißt du, ich habe dich in den letzten Monaten oft vermisst: [[Gefühl|Mir fehlen unsere Gespräche und dein Humor]]. Deshalb freue ich mich besonders auf unser Treffen. Wenn du länger bleiben kannst, [[Angebot|bist du bei uns jederzeit zum Kaffee willkommen]].

Falls du abends müde bist, können wir auch früher aufhören: [[Alternative|Wir treffen uns schon um 17 Uhr und essen früh zu Abend]]. Das ist für dich vielleicht angenehmer, wenn du den ganzen Tag gearbeitet hast. Sag mir einfach, was dir lieber ist, ich bin flexibel.

Falls du lieber zu uns nach Hause kommst, ist das auch möglich: [[Alternative|Wir kochen zusammen und essen gemütlich im Wohnzimmer]]. So lernst du meine Familie gleich besser kennen. Ein Treffen im kleinen Kreis hat auch seinen Reiz, das finde ich.

Schreib mir, [[Frage an die Freundin|ob dir mein Vorschlag gefällt]]. Ich freue mich auf [[Vorfreude|einen schönen Abend]]. Wie findest du meine Gründe?

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Tamara]],

danke für deinen Brief, hier kurz meine Antworten.

Pause: Entschuldige, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich hatte viel zu tun]].

Treffen: [[Treffpunkt und Zeit|Donnerstag um 19 Uhr im Restaurant am Markt]].

Begleitung: [[Begleitung|Ich bringe meine Frau und meine Kinder mit]].

Frage zur Arbeit: [[Frage zur Arbeit|Wie viele Kollegen hast du, und wie ist dein Chef]]?

Meine Familie kennt dich schon aus meinen Erzählungen: [[Erzählung|Ich habe oft erzählt, wie wir uns kennengelernt haben]]. Deshalb sind sie sehr neugierig auf dich. Besonders [[Person|meine kleine Nichte]] freut sich darauf, dich zu sehen.

Ich habe schon überlegt, was wir essen: Vielleicht [[Essensidee|etwas Leichtes wie Salat und Fisch]], falls du nach der Reise nicht zu schwer essen möchtest. Wenn du lieber [[Alternative|etwas Warmes und Herzhaftes]] möchtest, finden wir das auch. Hauptsache, es schmeckt dir und wir haben Spaß.

Zur Uhrzeit: Mir passt [[Zeit|alles ab 18 Uhr]], weil ich bis dahin im Büro bin. Wenn du früher Zeit hast, [[Alternative Zeit|nehme ich mir frei]]. Das ist kein Problem, denn mir bedeutet ein Treffen mit dir viel.

Ich freue mich auf [[Vorfreude|ein Wiedersehen]]. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|ob das passt]]. Wie findest du die Idee?

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Tamara]],

du hast dir Sorgen gemacht? Keine Sorge, ich lebe noch! [[Grund für die Pause|Ich war so beschäftigt, dass ich fast keinen Stift mehr fand]]. Verzeih mir bitte.

Ein Abend mit dir? Aber gern! Ich schlage [[Treffpunkt und Zeit|Freitag um 20 Uhr in einem Restaurant mit gutem Nachtisch]] vor, und danach [[Programm nach dem Essen|ein Spaziergang, bei dem wir uns alles erzählen]].

Ich bringe [[Begleitung|meine Familie]] mit, aber ich warne dich: [[Warnung|Mein Sohn stellt zehn Fragen pro Minute]].

Deine neue Stelle klingt anstrengend, aber spannend. [[Frage zur Arbeit|Ist dein Chef so streng wie meiner]]?

Als Geschenk bringe ich dir [[Geschenk|eine Kleinigkeit aus unserer Gegend]] mit, weil du so weit gereist bist. Ich hoffe, dass dir [[Wunsch|der Abend gefällt und du dich bei uns wohlfühlst]]. Das ist für mich das Wichtigste, wenn Freunde zu Besuch kommen.

Ein Wort zu meiner Familie: Mein Mann [[Eigenschaft des Mannes|ist ruhig und hat viel Humor]], und meine Kinder [[Eigenschaft der Kinder|spielen gern Fußball und Karten]]. Ich glaube, ihr werdet euch alle sofort verstehen. Mach dir keine Gedanken, dass du dich fremd fühlen könntest.

Ich freue mich auch darauf, dir zu erzählen, [[Thema|wie wir die Wohnung eingerichtet haben]]. Außerdem möchte ich [[Wunsch|ein Treffen mit euch allen am Sonntag planen]], wenn du noch bleiben kannst. Das wäre ein schöner Abschluss.

Schreib mir, [[Frage an die Freundin|wann du eintriffst]]. Wie findest du meine Idee?

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Tamara]],

als ich deinen Brief gelesen habe, musste ich an unsere gemeinsame Zeit denken. [[Erinnerung an früher|Wir haben damals jeden Abend zusammen gekocht und gelacht]]. Dass du dir Sorgen gemacht hast, tut mir leid.

Warum ich nicht geschrieben habe? [[Grund für die Pause|Ich hatte eine schwere Zeit mit einer Erkältung und viel Arbeit]]. Jetzt geht es mir wieder gut.

Ein Treffen am Abend finde ich schön. [[Treffpunkt und Zeit|Wir könnten uns am Dienstag in dem kleinen Café treffen, wo wir früher saßen]].

Ich bringe [[Begleitung|meinen Mann und meine Tochter]] mit, du wirst sie mögen.

Erzähl mir von deiner neuen Stelle: [[Frage zur Arbeit|Was machst du genau, und wie läuft der Alltag]]?

Weil du mich nach meiner Familie gefragt hast: [[Familie|Meine Kinder sind jetzt sechs und neun Jahre alt und gehen in die Schule]]. Sie sind [[Eigenschaft der Kinder|lebhaft, höflich und sehr neugierig]]. Ich glaube, sie werden dich mit vielen Fragen löchern.

Ich würde dir auch gern [[Wunsch|unsere Stadt bei Nacht zeigen, mit den schönsten Plätzen und Lichtern]]. Wenn das Wetter gut ist, ist das ein besonderes Erlebnis. Danach [[Abschluss|setzen wir uns noch auf eine Bank und reden über früher]]. Das wäre ein schöner Abschluss.

Wenn dir der Abend zu spät ist, können wir uns auch [[Alternative Zeit|am Nachmittag in einem Café treffen]]. Dort gibt es [[Besonderheit|den besten Apfelkuchen der Stadt]]. Das wäre eine entspannte Alternative und ein ebenso schönes Treffen.

Schreib mir, [[Frage an die Freundin|wie du den Abend findest]]. Wie findest du meine Idee?

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Tamara]],

danke für deinen Brief, und entschuldige bitte, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich hatte viel Arbeit]]. Ich habe gleich mehrere Vorschläge für unser Treffen.

Mein erster Vorschlag: Wir treffen uns [[Treffpunkt und Zeit|am Mittwochabend in einem Restaurant in der Stadtmitte]]. Mein zweiter Vorschlag: Danach [[Programm nach dem Essen|besuchen wir eine Bar oder gehen noch spazieren]].

Mein dritter Vorschlag: Ich bringe [[Begleitung|meine Familie]] mit, damit du sie kennenlernst. Mein vierter Vorschlag: Wenn du Zeit hast, [[Zusatzvorschlag|laden wir dich am nächsten Tag zum Kaffee zu uns ein]].

Zu deiner Stelle: [[Frage zur Arbeit|Wie oft musst du reisen, und wie gefällt dir das]]?

Wenn du magst, können wir auch am Tag danach etwas unternehmen: Ich kenne [[Ausflugsziel|einen schönen See in der Nähe]], an dem man gut spazieren gehen kann. Danach [[Programm|essen wir ein Eis und fahren nach Hause]]. Das wäre ein schöner Abschluss deines Besuchs.

Wenn du das nächste Mal in der Gegend bist, bleibst du am besten länger: [[Einladung|Bei uns gibt es ein Gästezimmer, das auf dich wartet]]. Ich würde mich freuen, wenn wir uns dann mehrere Tage sehen könnten. Das Treffen am Abend ist nur der Anfang.

Wegen deiner vielen Termine plane ich flexibel: [[Planung|Du sagst mir einfach den Tag, und ich richte mich nach dir]]. Notfalls treffen wir uns [[Notfallplan|nur auf einen kurzen Kaffee]], aber ich möchte dich auf jeden Fall sehen. Ein Treffen ist mir wichtig.

Was hältst du von meinen Vorschlägen? Schreib mir, [[Frage an die Freundin|welcher dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Tamara]],

danke für deinen Brief, und es tut mir leid, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Es lag nicht an dir, ich hatte nur sehr viel zu tun]].

Ein Treffen am Abend finde ich schön, aber ich muss prüfen, ob es klappt. Einerseits [[Vorteil des Abends|haben wir dann am meisten Zeit zum Reden]], andererseits [[Nachteil des Abends|müssen einige von uns am nächsten Morgen früh raus]]. Ich würde [[Treffpunkt und Zeit|Donnerstag um 19 Uhr in einem ruhigen Restaurant]] vorschlagen.

Ob ich jemanden mitbringe, entscheide ich noch. [[Begleitung|Meine Familie würde dich gern kennenlernen, aber vielleicht ist es zu viel]].

Zu deiner Stelle: [[Frage zur Arbeit|Ist die Arbeit körperlich oder geistig anstrengend]]?

Ich hoffe sehr, dass es dir gesundheitlich gut geht: [[Frage|Hast du dich mit der vielen Arbeit nicht übernommen]]? Du hast dir vorher Sorgen um mich gemacht, jetzt mache ich mir ein bisschen Sorgen um dich. Aber beim Treffen reden wir in Ruhe darüber.

Was deine Frage zu meiner Familie angeht: Alle freuen sich auf dich, und [[Reaktion der Familie|meine Mutter hat sogar gefragt, ob du Kuchen magst]]. Ich glaube, sie backt dir einen. Das zeigt, wie sehr du bei uns geschätzt wirst, auch nach so langer Zeit.

Falls du mit Kollegen unterwegs bist, bring sie gern mit: [[Einladung|Wir haben genug Platz und freuen uns über neue Gesichter]]. Ein gemeinsamer Abend mit allen wäre auch ein tolles Treffen, [[Wunsch|und wir lernen gleich deine Kollegen kennen]].

Schreib mir bitte, [[Frage an die Freundin|ob dir das passt]]. Ich freue mich auf [[Vorfreude|ein Wiedersehen]]. Wie findest du meine Gedanken?

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Tamara]],

danke für deinen Brief, ich antworte Schritt für Schritt. Als Erstes: Entschuldige, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich war beruflich eingespannt]].

Als Nächstes zu deinem Vorschlag: Wir treffen uns [[Treffpunkt und Zeit|am Freitag um 19 Uhr in einem Restaurant]].

Dann zur Begleitung: [[Begleitung|Ich bringe meine Familie mit]].

Zuletzt zu deiner Arbeit: [[Frage zur Arbeit|Was gefällt dir an der neuen Stelle]]?

Falls du Hilfe bei der Organisation brauchst, sag es mir: Ich kann [[Hilfsangebot|dir ein Hotel empfehlen oder die Fahrt vom Bahnhof planen]]. Das mache ich gern, denn ich möchte, dass du dich bei uns wohlfühlst. Außerdem [[Zusatzhilfe|kenne ich gute Restaurants mit fairen Preisen]].

Ich wollte dir noch sagen, wie stolz ich auf dich bin, dass du den Mut hattest, [[Anerkennung|die Stelle zu wechseln und etwas Neues zu wagen]]. Das ist nicht leicht, besonders wenn man [[Besonderheit|viel unterwegs ist]]. Ich bewundere das und freue mich auf deine Geschichten.

Ich möchte dir noch sagen, wie sehr ich mich freue: [[Gefühl|Du bist eine meiner ältesten Freundinnen]], und ein Treffen nach so langer Zeit ist etwas Besonderes. Wir müssen [[Versprechen|unbedingt öfter voneinander hören]], das nehme ich mir fest vor.

Wie geht es weiter? Ich freue mich auf [[Vorfreude|ein Wiedersehen]]. Schreib mir, [[Frage an die Freundin|ob dir das gefällt]]. Wie findest du meinen Plan?

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Tamara]],

dein Brief hat mich sehr berührt, und es tut mir leid, dass du dir Sorgen gemacht hast. [[Grund für die Pause|Ich habe oft an dich gedacht, aber der Alltag war stärker]]. Bei uns ist alles in Ordnung.

Ein Treffen am Abend wünsche ich mir sehr. [[Treffpunkt und Zeit|Wir könnten uns am Samstag in einem gemütlichen Restaurant treffen]], damit wir in Ruhe reden können.

Ich bringe [[Begleitung|meine Familie]] mit, denn sie freut sich schon auf dich. Sie ist [[Eigenschaft der Familie|herzlich und offen]].

Zu deiner neuen Stelle: [[Frage zur Arbeit|Wie geht es dir mit dem vielen Reisen, brauchst du Ruhe]]? Ich möchte, dass es dir gut geht.

Ich überlege schon, was ich anziehe und ob ich dir etwas Besonderes mitbringen soll: [[Idee|vielleicht ein kleines Foto aus unserer Studienzeit]]. Ich habe es noch gefunden, und es hat mich zum Lachen gebracht. Du erinnerst dich bestimmt an den Tag, [[Erinnerung|als wir im Regen nach Hause gelaufen sind]].

Ein kleiner praktischer Hinweis: Das Wetter ist hier [[Wetter|im Moment ziemlich wechselhaft]], also pack am besten [[Kleidung|eine warme Jacke und einen kleinen Schirm]] ein. Dann bist du für alles gewappnet, und wir können auch bei Regen draußen sein, wenn du magst.

Bring bitte [[Wunsch|ein paar Fotos von deinen Reisen]] mit, ich möchte alles sehen. Ich zeige dir dafür [[Gegenleistung|Fotos von den Kindern und unserem Urlaub]]. So gibt es beim Treffen auch etwas zum Anschauen und viel zu lachen.

Erzähl mir, [[Frage an die Freundin|ob dir der Abend gefällt]]. Wie findest du meine Idee?

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Tamara]],

sorry, dass du dir Sorgen gemacht hast! [[Grund für die Pause|Ich hatte total viel um die Ohren]]. Alles gut bei uns.

Treffen am Abend? Klar! [[Treffpunkt und Zeit|Donnerstag, 19 Uhr, Pizzeria am Markt]].

Ich bring [[Begleitung|meine Familie]] mit.

Deine neue Stelle? [[Frage zur Arbeit|Wie ist es so, und was machst du den ganzen Tag]]?

Zum Schluss möchte ich dir sagen, dass ich wirklich froh bin, dass du dich gemeldet hast: [[Dank|Dein Brief hat mir den Tag verschönert]]. Und ich verspreche, dass ich in Zukunft öfter schreibe, damit du dir keine Sorgen mehr machen musst. [[Versprechen|Ich rufe dich auch zwischendurch an]].

Und noch etwas: Wenn du Zeit hast, zeige ich dir gern das neue Einkaufszentrum und [[Ort|das Café, das gerade eröffnet hat]]. Dort gibt es [[Besonderheit|das beste Eis der Stadt]]. Das ist auf jeden Fall einen Besuch wert, und danach sind wir alle glücklich.

Zum Schluss noch eine Bitte: Gib mir [[Bitte|deine Handynummer und deine Ankunftszeit]], dann plane ich alles genau. Das Treffen soll [[Wunsch|ein ruhiger, schöner Abend werden]], ohne Stress und mit viel Zeit zum Reden. Ich bin schon sehr gespannt.

Ich freue mich echt auf [[Vorfreude|einen entspannten Abend mit dir und einem guten Essen]]. Meld dich, [[Frage an die Freundin|wann du kommst]]. Wie findest du die Idee?

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

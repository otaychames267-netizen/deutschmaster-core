// v2 (B2-style): Anna muss im Juli eine Woche nach Dänemark und braucht jemanden für Katze und Blumen (und fragt, ob Sie Urlaubspläne haben, warum Sie sich nicht gemeldet haben). Points: Reaktion auf Annas Bitte ·
// Ihre Pläne für den Sommer · warum Sie sich nicht gemeldet haben · Fragen zur Katze — plus: "Ist alles in Ordnung bei dir?", Einladung zum Abendessen beim Lieblingsitaliener.
export const kw = [/Bitte|gern|kann|kümmer|helfen|Katze/i, /Sommer|Juli|Urlaub|Pläne|verreise|fahre/i, /geschrieben|gemeldet|leider|Entschuldig|tut mir leid|viel zu tun/i, /Katze/, /Blumen/, /Italiener|Abendessen|Dänemark|Woche/i, /\?/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Anna]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Entschuldige bitte, dass ich mich so lange nicht gemeldet habe. [[Grund für die Pause|Ich hatte viel zu tun, aber bei mir ist alles in Ordnung]]. Schön, dass du dich gemeldet hast.

Deine Bitte erfülle ich sehr gern. Ich kümmere mich im Juli eine Woche um deine Katze und deine Blumen. [[Reaktion auf die Bitte|Das ist für mich kein Problem, und ich freue mich, dir helfen zu können]].

Zu deiner Frage nach meinen Plänen: [[Sommerpläne|Ich fahre im August für zwei Wochen mit meiner Familie ans Meer]]. Im Juli bin ich also zu Hause.

Zur Katze habe ich einige Fragen: [[Frage zur Katze|Wie heißt sie, was frisst sie, und wie oft muss ich sie füttern]]? Außerdem möchte ich wissen, [[Frage zu den Blumen|wie oft ich die Blumen gießen soll]].

Dein Angebot mit dem Abendessen beim Italiener nehme ich gern an. [[Termin für das Essen|Wie wäre es am Freitag nach deiner Rückkehr]]?

Praktisch habe ich schon geplant: Ich komme [[Besuchsplan|morgens vor der Arbeit und abends nach dem Feierabend]], füttere die Katze und gieße die Blumen. Wenn sie [[Besonderheit|gern spielt oder gekrault werden möchte]], nehme ich mir etwas länger Zeit. So fühlt sie sich nicht allein, und du kannst beruhigt reisen.

Weitere Fragen zur Katze: [[Frage|Hat sie einen Lieblingsplatz, und mag sie Streicheleinheiten]]? Und wie [[Frage 2|verhält sie sich, wenn sie allein ist]]? Ich möchte sie gut kennen, damit ich merke, wenn etwas nicht stimmt. Außerdem [[Frage 3|wo kann ich das Katzenklo reinigen]]?

Mein Sommer wird schön: [[Detail|Neben dem Urlaub am Meer habe ich ein Konzert geplant]]. Ich freue mich darauf, [[Vorfreude|nach der anstrengenden Zeit endlich zu entspannen]]. Wir können uns danach alles erzählen.

Schreib mir bitte, [[Frage an die Freundin|wann ich den Schlüssel bekomme]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Anna]],

schön, von dir zu hören! Sorry, dass ich mich so lange nicht gemeldet habe. [[Grund für die Pause|Die Arbeit hat mich total gefressen]], aber bei mir ist alles okay.

Katze und Blumen? Klar, mache ich! [[Reaktion auf die Bitte|Eine Woche im Juli passt super, und ich mag deine Katze]].

Sommerpläne? [[Sommerpläne|Im Juli bleibe ich hier, im August geht es in die Berge]].

Fragen zur Katze: [[Frage zur Katze|Wie heißt sie noch mal, was mag sie am liebsten]]? Und die Blumen: [[Frage zu den Blumen|Brauchen alle gleich viel Wasser]]?

Abendessen beim Italiener? Auf jeden Fall! [[Termin für das Essen|Ich schlage einen Freitag vor, ich habe Hunger auf Pasta]].

Weil du fragst, ob ich selbst verreisen möchte: [[Antwort|Im Juli habe ich nichts vor, also passt es perfekt]]. Ich bin froh, dass du an mich gedacht hast. Dänemark klingt spannend, [[Frage|fährst du beruflich, oder gibt es auch Freizeit]]?

Mich würde interessieren, ob die Katze [[Frage|schon einmal krank war]] und ob ich etwas wissen muss, falls sie nicht frisst. Außerdem: [[Frage 2|Wie heißt dein Tierarzt, und hat er eine Notfallnummer]]? Ich schreibe mir alles genau auf, damit ich vorbereitet bin.

Ich habe vor, im Sommer [[Plan|jedes Wochenende etwas anderes zu unternehmen]], zum Beispiel wandern, radeln und schwimmen. Das tut mir gut. Wenn du aus Dänemark zurück bist, hast du bestimmt Lust auf einen Ausflug, [[Einladung|dann kommst du einfach mit]].

Meld dich, [[Frage an die Freundin|wann ich den Schlüssel abhole]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Anna]],

wow, schön, von dir zu lesen! Entschuldige bitte die Funkstille. [[Grund für die Pause|Ich war mit Prüfungen und Umzug im Dauerstress]], aber jetzt bin ich wieder da.

Deine Bitte erfülle ich mit Freude! [[Reaktion auf die Bitte|Deine Katze ist ein Schatz, und eine Woche mit ihr wird mir Spaß machen]]. Die Blumen bekommen von mir Liebe und Wasser.

Meine Sommerpläne: [[Sommerpläne|Im August fliege ich nach Spanien, im Juli bin ich noch hier]].

Fragen zur Katze: [[Frage zur Katze|Was ist ihr Lieblingsspielzeug, und wie oft darf sie Leckerlis bekommen]]? Und zu den Blumen: [[Frage zu den Blumen|Welche stehen draußen, welche drinnen]]?

Das Abendessen beim Italiener ist ein wunderbares Angebot! [[Termin für das Essen|Wir gehen gleich nach deiner Reise]].

Ich habe schon Ideen, wie ich der Katze die Zeit verschönern kann: [[Idee|Ich bringe ein neues Spielzeug mit und sitze abends ein bisschen bei ihr]]. Du musst dir keine Sorgen machen, [[Zusage|sie wird bei mir sehr verwöhnt]]. Und die Blumen bekommen Musik, wenn du willst.

Zur Katze habe ich noch zwei Fragen: [[Frage|Wie viel Futter bekommt sie morgens, und wie viel abends]]? Und [[Frage 2|gibt es Dinge, die sie nicht fressen darf]]? Ich frage lieber einmal zu viel als einmal zu wenig, denn ich will, dass es ihr gut geht.

Im August plane ich [[Reiseziel|eine Woche an der Nordsee]], und im September [[Zweites Ziel|einen Städtetrip nach Hamburg]]. Das sind keine großen Reisen, aber sie reichen mir. Und du? Bist du nach Dänemark auch noch unterwegs, [[Frage|oder bleibst du den Sommer über zu Hause]]?

Schreib mir bald, [[Frage an die Freundin|wann du abreist]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Anna]],

vielen Dank für deine Nachricht. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, die Pause: Entschuldige, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Ich hatte beruflich viel zu tun]]. Bei mir ist alles in Ordnung.

Zweitens, deine Bitte: Ich kümmere mich gern im Juli um Katze und Blumen. [[Reaktion auf die Bitte|Eine Woche lässt sich gut organisieren]].

Drittens, meine Sommerpläne: [[Sommerpläne|Im August mache ich Urlaub an der Ostsee]].

Viertens, meine Fragen zur Katze: [[Frage zur Katze|Wie viel Futter bekommt sie, und wo ist die Tierarztnummer]]? Zu den Blumen: [[Frage zu den Blumen|Welche brauchen täglich Wasser]]?

Fünftens, dein Angebot: Das Abendessen nehme ich gern an.

Ergänzend schlage ich vor, [[Vorschlag|vor deiner Abreise kurz die wichtigsten Dinge gemeinsam durchzugehen]]. Dann bin ich sicher, dass ich nichts falsch mache. Außerdem hinterlasse ich dir nach der Woche [[Rückmeldung|einen kurzen Bericht über die Katze und die Blumen]].

Weitere Fragen zur Pflege: [[Frage|Wie oft soll ich das Katzenklo säubern]], und [[Frage 2|wo steht das Streu]]? Und noch etwas: [[Frage 3|soll ich die Fenster geschlossen lassen]]? So gehe ich auf Nummer sicher und mache alles genau nach deinen Wünschen.

Mein Sommer ist noch nicht ganz geplant, aber [[Plan|ich will auf jeden Fall viel draußen sein]], sowie im Garten sitzen und lesen. Das ist für mich die beste Erholung. Wenn sich etwas ändert, sage ich dir Bescheid, damit wir uns treffen können.

Bitte teile mir mit, [[Frage an die Freundin|wann ich den Schlüssel bekomme]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Anna]],

danke für deine Mail! Entschuldige, dass ich mich lange nicht gemeldet habe. [[Grund für die Pause|Ich hatte eine stressige Zeit]], aber jetzt helfe ich dir gern.

Deine Bitte erfülle ich: [[Reaktion auf die Bitte|Ich kümmere mich im Juli um deine Katze und die Blumen, ganz zuverlässig]]. Ich komme [[Praktischer Plan|jeden Tag morgens und abends vorbei]].

Meine Sommerpläne: [[Sommerpläne|Im August verreise ich, im Juli bin ich zu Hause]].

Praktische Fragen zur Katze: [[Frage zur Katze|Wo sind Futter, Katzenstreu und Tierarzt-Nummer]]? Zu den Blumen: [[Frage zu den Blumen|Gibt es eine Gießliste]]? Ich schreibe mir alles auf.

Das Abendessen beim Italiener nehme ich gern an, [[Termin für das Essen|am besten an einem Freitagabend]].

Ich schreibe mir am besten [[Notiz|eine Liste mit Futtermenge, Gießplan und Notfallnummer]] und hänge sie an den Kühlschrank. So vergesse ich nichts. Wenn du magst, [[Angebot|schicke ich dir jeden zweiten Tag ein Foto]], dann siehst du, dass alles gut ist.

Zu den Blumen habe ich auch Fragen: [[Frage|Welche stehen in der Sonne, welche im Schatten]]? Und [[Frage 2|wie viel Wasser bekommt jede Pflanze]]? Wenn du magst, mache ich ein kleines Schild für jede Pflanze, [[Idee|damit ich nichts durcheinanderbringe]].

Zu meinen Sommerplänen: [[Plan|Ich möchte einen Kurs besuchen und in den Ferien ein Praktikum machen]]. Das klingt nach Arbeit, macht aber Spaß. Ich kann dir danach viel erzählen, und du kannst mir von Dänemark berichten.

Sag mir bitte, [[Frage an die Freundin|ob ich noch etwas besorgen soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Anna]],

ich habe mich lange nicht gemeldet, weil [[Grund für die Pause|ich viel arbeiten musste und abends erschöpft war]]. Das tut mir leid. Umso mehr freue ich mich über deine Mail.

Deine Bitte erfülle ich gern, denn [[Begründung für die Zusage|ich mag deine Katze, und im Juli habe ich Zeit]]. [[Reaktion auf die Bitte|Eine Woche ist gut machbar]].

Meine Sommerpläne: [[Sommerpläne|Ich fahre im August in den Urlaub]], weil [[Grund für die Reise|ich im Juli noch arbeiten muss]].

Zur Katze habe ich Fragen, weil ich alles richtig machen möchte: [[Frage zur Katze|Was frisst sie, und braucht sie Medikamente]]? Zu den Blumen: [[Frage zu den Blumen|Wie oft muss ich gießen]]?

Das Abendessen nehme ich gern an, denn [[Grund für die Annahme|ich liebe italienisches Essen]].

Ich möchte noch ergänzen, dass ich Erfahrung habe: [[Erfahrung|Ich habe schon oft bei Freunden Katzen und Pflanzen gehütet]]. Das hat immer gut geklappt. Deshalb bin ich zuversichtlich, [[Zuversicht|dass auch deine Katze und deine Blumen die Woche gut überstehen]].

Zur Katze noch ein paar Fragen: [[Frage|Ist sie schreckhaft oder zutraulich]]? Und [[Frage 2|spielt sie gern mit einer Angel oder mit Bällen]]? Ich möchte, dass sie sich bei mir wohlfühlt, und deshalb frage ich vorsichtshalber nach ihren Vorlieben.

Weil du nach Urlaubsplänen fragst: [[Antwort|Ich habe noch nichts gebucht, aber ich denke an eine Radtour am Rhein]]. Das ist günstig und schön. Vielleicht hast du Lust, [[Einladung|ein paar Tage mitzufahren, wenn du zurück bist]].

Schreib mir, [[Frage an die Freundin|wann ich den Schlüssel bekomme]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Anna]],

danke für deine Mail, hier kurz meine Antworten.

Pause: Entschuldige, [[Grund für die Pause|ich hatte viel zu tun]].

Bitte: [[Reaktion auf die Bitte|Ich kümmere mich gern um Katze und Blumen]].

Sommer: [[Sommerpläne|August am Meer]].

Katze: [[Frage zur Katze|Futter, Tierarzt, Medikamente]]? Blumen: [[Frage zu den Blumen|Wie oft gießen]]?

Abendessen: [[Termin für das Essen|Gern, am Freitag]].

Mich interessiert, ob die Katze [[Frage|Freigang hat oder nur in der Wohnung lebt]]. Davon hängt ab, wie oft ich schauen muss. Und ob [[Frage 2|noch jemand im Haus einen Schlüssel hat]], falls etwas ist. Ich möchte alles richtig machen.

Ich bin neugierig, ob die Katze [[Frage|auch nachts aktiv ist und dann vielleicht mauzt]]. Das wäre gut zu wissen, falls ich über Nacht bleibe. Und [[Frage 2|darf sie auf mein Bett]]? Ich frage das nur, damit wir keine Überraschungen erleben.

Meine Sommerpläne sind ruhig: [[Plan|Arbeit, Familie und ein paar Tage Urlaub zu Hause]]. Das klingt langweilig, aber ich mag es so. Ich brauche keine Ferne, um mich zu erholen, [[Begründung|ich genieße einfach die Zeit mit meinen Liebsten]].

Ich freue mich, dir helfen zu können, und hoffe, dass du in Dänemark eine schöne und erfolgreiche Woche hast, denn du hast bestimmt viel Arbeit vor dir. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|wann ich den Schlüssel bekomme]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Anna]],

endlich schreibst du, ich dachte schon, du hast mich vergessen! Entschuldige meine lange Funkstille. [[Grund für die Pause|Ich war so beschäftigt, dass selbst mein Handy genervt war]].

Deine Bitte erfülle ich gern, [[Reaktion auf die Bitte|Katzen sind die besseren Mitbewohner, und Blumen lassen sich nicht beschweren]].

Meine Sommerpläne: [[Sommerpläne|Im August gehe ich ans Meer und tue so, als würde ich schwimmen]].

Fragen zur Katze: [[Frage zur Katze|Wie heißt sie, und darf sie auf dem Sofa schlafen]]? Zu den Blumen: [[Frage zu den Blumen|Welche sind gefährlich für Katzen]]?

Das Abendessen beim Italiener ist die beste Bezahlung der Welt! [[Termin für das Essen|Ich komme mit großem Hunger]].

Wenn die Katze wählerisch ist, [[Hinweis|musst du mir sagen, welches Futter sie mag]], sonst streikt sie vielleicht. Ich bringe auch [[Mitbringsel|ein paar Leckerlis mit]], falls du nichts dagegen hast. Ich will, dass sie mich mag, und ich liebe Katzen sowieso.

Zur Katze habe ich auch eine Frage zur Gesundheit: [[Frage|Ist sie geimpft, und gibt es irgendetwas, auf das ich achten muss]]? Außerdem: [[Frage 2|Wie viel Wasser soll sie trinken]]? Ich bin gern gut informiert, damit alles reibungslos läuft.

Im Sommer möchte ich [[Wunsch|schwimmen gehen, so oft es geht]], und [[Zweiter Wunsch|abends mit Freunden grillen]]. Das ist mein Plan, und er ist einfach. Du bist herzlich eingeladen, mitzumachen, wenn du Lust hast.

Schreib bald, [[Frage an die Freundin|wann ich den Schlüssel abholen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Anna]],

als ich deine Mail gelesen habe, musste ich an unsere Studienzeit denken. [[Erinnerung an früher|Damals haben wir zusammen deine erste Katze gefüttert]]. Entschuldige, dass ich mich lange nicht gemeldet habe.

Warum ich nicht geschrieben habe? [[Grund für die Pause|Ich war eine Weile krank und musste mich erholen]]. Jetzt geht es mir wieder gut.

Deine Bitte erfülle ich mit Freude: [[Reaktion auf die Bitte|Ich passe im Juli gern auf deine Katze und die Blumen auf]].

Meine Sommerpläne: [[Sommerpläne|Im August fahre ich zu meinen Eltern]].

Fragen zur Katze: [[Frage zur Katze|Ist sie noch so verschmust wie früher, und was braucht sie?]] Zu den Blumen: [[Frage zu den Blumen|Hast du noch den Kaktus?]]

Das Abendessen nehme ich gern an.

Ich erinnere mich, wie wir deine Katze zum ersten Mal gesehen haben: [[Erinnerung|Sie war winzig und hat sich in meiner Jacke versteckt]]. Daran muss ich oft denken. Deshalb freue ich mich, dass ich sie jetzt wieder betreuen darf, [[Folge|auch wenn sie schon groß ist]].

Ich habe noch zwei Fragen: [[Frage|Hat die Katze ein Lieblingslied oder eine besondere Eigenheit]]? Meine Tante hatte eine, die immer beim Staubsauger mitgetanzt hat. Und [[Frage 2|wie heißt sie noch einmal]]? Ich möchte sie beim Namen rufen.

Ich habe mir für den Sommer etwas vorgenommen: [[Vorsatz|jeden Tag spazieren zu gehen und weniger am Handy zu sein]]. Es tut mir gut, und ich will das beibehalten. Ich hoffe, dass ich es schaffe, und du kannst mich gern daran erinnern.

Erzähl mir, [[Frage an die Freundin|wann du fliegst]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Anna]],

danke für deine Mail, und entschuldige meine lange Pause. [[Grund für die Pause|Ich hatte viel Arbeit]]. Ich habe gleich mehrere Vorschläge für die Woche im Juli.

Mein erster Vorschlag: [[Reaktion auf die Bitte|Ich komme vorher zu dir, damit du mir alles zeigen kannst]]. Mein zweiter: [[Vorschlag 2|Du schreibst eine Liste für die Katze und die Blumen]]. Mein dritter: [[Vorschlag 3|Ich schicke dir jeden Tag ein Foto von der Katze]].

Meine Sommerpläne: [[Sommerpläne|Im August bin ich in den Bergen]].

Fragen zur Katze: [[Frage zur Katze|Futter, Spielzeug und Tierarzt]]? Zu den Blumen: [[Frage zu den Blumen|Gießzeiten]]?

Das Essen beim Italiener nehme ich gern an.

Mein vierter Vorschlag: [[Vorschlag|Du lässt mir einen Zettel mit dem Namen des Tierarztes da]]. Mein fünfter: [[Vorschlag 2|Ich schreibe dir täglich eine kurze Nachricht]]. So bist du immer informiert und kannst deine Reise genießen.

Als dritte Frage zur Katze: [[Frage|Wo sind das Futter und der Dosenöffner]]? Und [[Frage 2|wann ist die beste Zeit zum Füttern]]? Ich plane meinen Tag um sie herum, damit sie sich geborgen fühlt.

Mein sechster Vorschlag zu deiner Reise: [[Vorschlag|Bring mir ein kleines Souvenir aus Dänemark mit]], wenn du magst. Ich bin nicht anspruchsvoll, [[Wunsch|ein Magnet oder eine Postkarte reicht völlig]]. Ich freue mich über jede Kleinigkeit.

Was hältst du davon? Schreib mir, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Anna]],

danke für deine Mail. Es tut mir leid, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Es lag nicht an dir, ich hatte nur sehr viel zu tun]].

Deine Bitte würde ich gern erfüllen, möchte aber vorher klären, ob alles klappt. [[Reaktion auf die Bitte|Ich habe im Juli einen Termin, aber das lässt sich organisieren]].

Meine Sommerpläne: [[Sommerpläne|Ich bin noch nicht sicher, vielleicht fahre ich im August weg]].

Einerseits [[Vorteil der Aufgabe|ist die Katzenpflege einfach]], andererseits [[Nachteil der Aufgabe|braucht sie viel Aufmerksamkeit]]. Fragen zur Katze: [[Frage zur Katze|Wie oft füttere ich, und was mache ich im Notfall]]? Zu den Blumen: [[Frage zu den Blumen|Wie viel Wasser brauchen sie]]?

Das Abendessen nehme ich gern an.

Ich würde die Aufgabe gern übernehmen, möchte aber vorher klären, [[Klärung|ob es Dinge gibt, die ich nicht tun darf]]. Zum Beispiel [[Beispiel|fremde Räume betreten oder Fenster öffnen]]. Ich möchte nichts falsch machen und respektiere deine Wohnung.

Zur Sicherheit frage ich noch: [[Frage|Gibt es eine Haftpflichtversicherung, falls ich einmal etwas kaputt mache]]? Das ist hoffentlich nicht nötig, aber man weiß ja nie. Und [[Frage 2|soll ich Nachbarn Bescheid sagen]]?

Ich bin mir mit meinen Sommerplänen noch unsicher, [[Unsicherheit|weil ich nicht weiß, wann ich Urlaub bekomme]]. Sobald ich es weiß, melde ich mich. Auf jeden Fall kümmere ich mich im Juli um deine Katze, das steht fest.

Schreib mir bitte, [[Frage an die Freundin|ob das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Anna]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: Entschuldige, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Ich war beruflich eingespannt]].

Als Nächstes zu deiner Bitte: [[Reaktion auf die Bitte|Ich kümmere mich gern um Katze und Blumen]].

Dann zu meinen Sommerplänen: [[Sommerpläne|August am Meer]].

Danach zu meinen Fragen: [[Frage zur Katze|Futter, Tierarzt, Medikamente]]? [[Frage zu den Blumen|Gießen]]?

Zuletzt zum Abendessen: Gern, [[Termin für das Essen|am Freitag]].

Zum Schluss ein Schritt: [[Schritt|Gib mir bitte eine Telefonnummer, unter der ich dich im Notfall erreiche]]. Ich hoffe, dass es nicht nötig ist. Aber es ist gut, vorbereitet zu sein, [[Folge|dann habe ich ein sicheres Gefühl]].

Als dritten Schritt hätte ich gern von dir: [[Schritt|eine kurze Liste mit allem, was ich wissen sollte]], inklusive Tierarzt, Futter und Gießplan. Dann bin ich bestens vorbereitet, und du kannst die Reise ohne Sorgen genießen.

Zuletzt zu meinen Sommerplänen: [[Plan|Ich fahre im August in die Berge]], und danach bin ich wieder zu Hause. Wir können uns also im September treffen, wenn du magst. Das wäre ein schöner Abschluss des Sommers.

Ich freue mich auf [[Vorfreude|unser Abendessen]] und wünsche dir eine gute Reise nach Dänemark. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|wann ich den Schlüssel bekomme]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Anna]],

deine Mail hat mich sehr gefreut. Es tut mir leid, dass ich mich lange nicht gemeldet habe. [[Grund für die Pause|Ich habe oft an dich gedacht, aber der Alltag war stärker]]. Bei mir ist alles in Ordnung, danke der Nachfrage.

Deine Bitte erfülle ich von Herzen gern. [[Reaktion auf die Bitte|Deine Katze und deine Blumen sind bei mir in guten Händen]]. Mach dir keine Sorgen.

Meine Sommerpläne: [[Sommerpläne|Im August fahre ich zu Freunden an den See]].

Fragen zur Katze: [[Frage zur Katze|Gibt es etwas, das sie besonders liebt oder fürchtet]]? Zu den Blumen: [[Frage zu den Blumen|Welche sind dir besonders wichtig]]?

Das Abendessen nehme ich dankend an.

Du kannst dich wirklich auf mich verlassen: [[Zusage|Ich behandle deine Wohnung wie meine eigene]]. Die Katze bekommt Liebe, und die Blumen bekommen Wasser. Und wenn du zurückkommst, [[Folge|ist alles so, wie du es verlassen hast]].

Zur Katze habe ich noch eine Frage: [[Frage|Hat sie Angst vor Besuch oder lässt sie jeden herein]]? Ich möchte sie nicht erschrecken, und deshalb [[Plan|besuche ich sie vor deiner Abreise einmal]], damit wir uns kennenlernen. Das macht es für alle leichter.

Mein Sommer wird [[Beschreibung|ruhig und erholsam]], und das brauche ich. Ich freue mich, dass ich dir einen Gefallen tun kann, [[Gefühl|denn Freunde helfen einander]]. Und ich freue mich schon aufs Abendessen mit dir beim Italiener.

Erzähl mir, [[Frage an die Freundin|wie ich dir sonst noch helfen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Anna]],

sorry, dass ich mich nicht gemeldet habe! [[Grund für die Pause|Ich hatte viel um die Ohren]], aber alles gut.

Katze und Blumen? [[Reaktion auf die Bitte|Klar, kein Problem]].

Sommer: [[Sommerpläne|August, Meer]].

Katze: [[Frage zur Katze|Futter, Tierarzt?]] Blumen: [[Frage zu den Blumen|Wie oft gießen?]]

Italiener? Gern!

Ein schneller Hinweis: [[Hinweis|Hinterlass mir bitte genug Futter]], damit ich nichts kaufen muss. Und [[Hinweis 2|den Schlüssel gib mir vor Freitag]], dann kann ich testen, ob er passt. Alles andere regeln wir kurz am Telefon.

Noch zwei kurze Fragen: [[Frage|Wie heißt sie?]] Und [[Frage 2|hat sie einen Chip oder ein Halsband]]? Ich möchte sicher sein, dass ich sie erkenne und im Notfall finde. Danke dir, und gute Reise schon einmal.

Mein Sommer: [[Plan|Sonne, Arbeit und ein bisschen Urlaub]]. Mehr brauche ich nicht. Und das Wichtigste, [[Wichtigste|Zeit für Freunde und für gutes Essen]]. Dein Angebot passt also perfekt in meinen Plan.

Ich freue mich, dir helfen zu können, und ich mache das wirklich gern, denn Freunde sind mir wichtig. Die Katze wird es bei mir gut haben, und die Blumen auch, das verspreche ich. Und das Abendessen beim Italiener lasse ich mir natürlich nicht entgehen, ich freue mich schon darauf. Meld dich, [[Frage an die Freundin|wann ich den Schlüssel bekomme]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Liebe [[Name der Freundin|Anna]],

ich danke dir für deine Mail. Entschuldige, dass ich mich so lange nicht gemeldet habe. [[Grund für die Pause|Ich war oft überfordert, habe aber immer an dich gedacht]]. Bei mir ist alles in Ordnung.

Deine Bitte ehrt mich. [[Reaktion auf die Bitte|Ich kümmere mich sehr gern um deine Katze und deine Blumen]]. Danke für dein Vertrauen.

Meine Sommerpläne: [[Sommerpläne|Im August fahre ich in den Urlaub]].

Fragen zur Katze: [[Frage zur Katze|Was soll ich unbedingt beachten]]? Zu den Blumen: [[Frage zu den Blumen|Wie oft gießen]]?

Für das Abendessen bin ich dankbar.

Dein Vertrauen bedeutet mir viel: [[Dank|Dass du mir deine Katze anvertraust, ist ein großes Geschenk]]. Ich werde sie wie ein Familienmitglied behandeln. Und ich hoffe, [[Wunsch|dass du eine schöne, entspannte Zeit in Dänemark hast]].

Eine letzte Frage zur Katze: [[Frage|Soll ich ihr etwas von dir ausrichten]]? Das klingt vielleicht komisch, aber ich finde es schön, [[Gefühl|dass ich etwas Persönliches weitergeben kann]]. Ich sorge gut für sie.

Ich bin dankbar für meinen Sommer, [[Dank|für Freunde wie dich und für meine Arbeit]]. Ich plane [[Plan|ein paar freie Tage und einen Ausflug]], und ich freue mich auf alles Schöne. Danke, dass du mich in deine Pläne einbeziehst, das bedeutet mir viel.

Danke für alles, schreib mir bald, [[Frage an die Freundin|wann du abreist]].

[[Grußformel|Dankbare Grüße]]
[[Dein Name|Nina]]` },
];

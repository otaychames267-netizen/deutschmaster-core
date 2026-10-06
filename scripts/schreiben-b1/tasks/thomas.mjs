// Thomas – organisiert wieder einen Ausflug mit Bus und Schiff (Ziel geheim, übernächster Samstag, 9:30 Uhr bei ihm); er hat sich beim Basketball das Bein gebrochen. Points: Alternativvorschlag für schlechtes Wetter · Einladung annehmen · was Sie noch über den Ausflug wissen wollen · auf den Sportunfall reagieren.
export default [
  // 1
  { label: "Gute Besserung, Museum bei Regen, Zusage, Frage nach dem Ziel", t: `Lieber [[Name des Freundes|Thomas]],

dass du dir beim Basketball das Bein gebrochen hast, tut mir sehr leid! [[Reaktion auf den Unfall|Gute Besserung, ich hoffe, dass es dir schon besser geht]] und dass du keine zu großen Schmerzen mehr hast.

Die Einladung zum Ausflug nehme ich sehr gern an, und ich freue mich schon darauf, euch alle wiederzusehen. Der Termin am übernächsten Samstag passt mir gut.

Wenn das Wetter schlecht wird, habe ich einen Vorschlag: [[Alternative bei Regen|Wir besuchen ein Museum, in dem man sitzen kann, und trinken danach etwas im Café]]. Das ist für dein Bein auch bequemer.

Ich habe noch eine Frage: [[Frage|Wohin geht es denn, und wie lange dauert der Ausflug]]? Ich bin sehr neugierig auf die Überraschung.

Ich freue mich auf deine Antwort.

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "Schreck über den Unfall, Schwimmbad bei Regen, Zusage, Frage nach dem Essen", t: `Hallo [[Name des Freundes|Thomas]],

oje, was für eine schlechte Nachricht mit deinem Bein! [[Reaktion auf den Unfall|Ich bin erschrocken und wünsche dir eine schnelle Heilung]]. Ruh dich gut aus.

Zu deinem Ausflug sage ich gern zu. Eine Fahrt mit Bus und Schiff ist genau richtig, wenn man nicht so gut zu Fuß ist. Dass es eine Überraschung wird, macht mich besonders neugierig.

Falls das Wetter schlecht ist, schlage ich vor: [[Alternative bei Regen|Wir gehen in ein Schwimmbad mit Sauna, wo man auch im Regen Spaß hat]]. Dein Bein darfst du dann natürlich schonen.

Ich möchte noch wissen: [[Frage|Gibt es unterwegs etwas zu essen, oder sollen wir selbst etwas mitbringen]]?

Schreib mir bitte zurück.

[[Grußformel|Bis bald]]
[[Dein Name|Karim]]` },

  // 3
  { label: "Mitgefühl, Kino bei schlechtem Wetter, Zusage, Frage nach der Rückkehr", t: `Lieber [[Name des Freundes|Thomas]],

danke für deine Einladung! Dass du dir beim Basketball das Bein gebrochen hast, tut mir sehr leid. [[Reaktion auf den Unfall|Ich hoffe, dass du bald wieder gesund bist, und ich wünsche dir viel Geduld]].

Natürlich komme ich gern mit. Der Ausflug klingt nach einem schönen Tag, und ich freue mich besonders auf die Schifffahrt. Ich schreibe mir den Termin gleich in den Kalender.

Wenn es regnet, habe ich eine Idee: [[Alternative bei Regen|Wir gehen zusammen ins Kino und sehen einen schönen Film]]. Danach können wir noch irgendwo essen.

Eine Frage habe ich: [[Frage|Wann sind wir ungefähr wieder zurück, damit ich am Abend etwas planen kann]]?

Ich freue mich auf deine Antwort.

[[Grußformel|Herzliche Grüße]]
[[Dein Name|Amira]]` },

  // 4
  { label: "Arztbesuch angesprochen, Café bei Regen, Zusage, Frage nach der Kleidung", t: `Hallo [[Name des Freundes|Thomas]],

wie schön, dass du wieder einen Ausflug planst, aber leider tut mir dein Unfall sehr leid! [[Reaktion auf den Unfall|Warst du schon beim Arzt, und wie lange musst du den Gips tragen]]? Ich hoffe, dass es dir bald besser geht.

Ich nehme die Einladung sehr gern an, und ich freue mich auf den Samstag. Bus und Schiff sind für dich bestimmt gut, wenn du nicht viel laufen kannst.

Falls das Wetter nicht mitspielt, schlage ich vor: [[Alternative bei Regen|Wir gehen in ein gemütliches Café in der Stadt und spielen Karten]]. Das ist unkompliziert.

Ich möchte noch wissen: [[Frage|Was soll ich anziehen, und brauche ich eine Jacke für das Schiff]]?

Schreib mir bitte bald zurück.

[[Grußformel|Alles Liebe]]
[[Dein Name|Youssef]]` },

  // 5
  { label: "Hilfe anbieten, Therme bei Regen, Zusage, Frage nach den Kosten", t: `Lieber [[Name des Freundes|Thomas]],

danke, dass du uns wieder einlädst! Dass du dir das Bein gebrochen hast, finde ich sehr schade. [[Reaktion auf den Unfall|Wenn du Hilfe beim Einkaufen brauchst, sag mir einfach Bescheid, ich helfe dir gern]]. Gute Besserung!

Zum Ausflug sage ich sofort zu. Es freut mich, dass du trotz des gebrochenen Beins etwas planst, und ich bin gespannt auf die Überraschung.

Falls das Wetter schlecht ist, schlage ich vor: [[Alternative bei Regen|Wir fahren in eine Therme und entspannen im warmen Wasser]]. Das ist gut für alle, und dein Bein ist dabei kein Problem.

Eine Frage habe ich noch: [[Frage|Was kostet der Ausflug ungefähr, und soll ich das Geld vorher überweisen]]?

Ich freue mich auf deine Antwort.

[[Grußformel|Viele Grüße]]
[[Dein Name|Hamza]]` },

  // 6
  { label: "Besuch angeboten, Brunch bei Regen, Zusage, Frage nach dem Treffpunkt", t: `Hallo [[Name des Freundes|Thomas]],

deine Nachricht hat mich gefreut, aber der Unfall tut mir leid! [[Reaktion auf den Unfall|Ich möchte dich bald besuchen, wenn du das möchtest, und etwas Schönes mitbringen]]. Gute Besserung!

Zum Ausflug sage ich gern zu: Ich komme sehr gern mit, und ich freue mich schon auf den Samstag. Eine Überraschung als Ziel macht es noch spannender.

Falls das Wetter schlecht wird, habe ich einen Alternativvorschlag: [[Alternative bei Regen|Wir machen einen gemeinsamen Brunch bei dir zu Hause oder in einem Lokal]]. Dann musst du nicht so viel laufen.

Eine Frage: [[Frage|Treffen wir uns um 9:30 Uhr bei dir, oder sollen wir direkt zur Haltestelle kommen]]?

Schreib mir bitte kurz zurück.

[[Grußformel|Bis bald]]
[[Dein Name|Lina]]` },

  // 7
  { label: "Sorge um das Bein, Spieleabend bei Regen, Zusage, Frage nach dem Gepäck", t: `Lieber [[Name des Freundes|Thomas]],

ich habe mich über deine Einladung sehr gefreut, aber ich mache mir auch Sorgen um dein Bein! [[Reaktion auf den Unfall|Hoffentlich hast du nicht zu viele Schmerzen, und ich wünsche dir, dass es schnell heilt]]. Ein gebrochenes Bein ist wirklich lästig.

Ich komme sehr gern zum Ausflug. Bus und Schiff sind eine tolle Idee, und das Datum passt mir hervorragend. Ich freue mich auf die Überraschung.

Bei schlechtem Wetter schlage ich vor: [[Alternative bei Regen|Wir verbringen den Tag bei dir und machen einen Spieleabend mit Essen]]. Das ist für dich am bequemsten.

Ich möchte noch wissen: [[Frage|Soll ich Rucksack und Verpflegung mitbringen, oder bekommen wir etwas an Bord]]?

Ich freue mich auf deine Antwort.

[[Grußformel|Herzliche Grüße]]
[[Dein Name|Nour]]` },

  // 8
  { label: "Gute Besserung und Krücken, Bowling bei Regen, Zusage, Frage nach Mitreisenden", t: `Hallo [[Name des Freundes|Thomas]],

danke für deine Zeilen und deine Einladung! Dass du dich verletzt hast, tut mir leid. [[Reaktion auf den Unfall|Mit Krücken zu gehen, ist bestimmt anstrengend, ich wünsche dir viel Kraft und Gute Besserung]].

Zu deinem Ausflug: Ich komme sehr gern, und ich bin gespannt, wohin die Reise geht. Dein Plan mit Bus und Schiff ist sehr vernünftig.

Falls das Wetter schlecht ist, schlage ich vor: [[Alternative bei Regen|Wir gehen zusammen Bowling spielen, da bleibst du sitzen und siehst zu]]. Danach können wir etwas essen.

Ich möchte noch wissen: [[Frage|Wer kommt noch mit, und kenne ich die anderen schon]]?

Antworte mir bitte bald. Ich freue mich schon auf den Samstag und auf die Überraschung.

[[Grußformel|Alles Liebe]]
[[Dein Name|Fares]]` },

  // 9
  { label: "Mitgefühl, Schlossführung bei Regen, Zusage, Frage nach der Fahrzeit", t: `Lieber [[Name des Freundes|Thomas]],

wie schön, dass du wieder einen Ausflug organisierst! Aber dein Beinbruch tut mir sehr leid. [[Reaktion auf den Unfall|Ich hoffe, dass die Heilung gut verläuft, und ich wünsche dir viel Geduld]].

Die Einladung nehme ich sehr gern an. Der Samstag passt mir perfekt, und ich freue mich schon auf die Überraschung. Ein Ausflug mit Bus und Schiff ist ruhig und entspannt.

Falls es regnet, habe ich einen Vorschlag: [[Alternative bei Regen|Wir besuchen ein Schloss mit Führung, dort sind wir im Trockenen]]. Das ist interessant und nicht anstrengend.

Ich habe eine Frage: [[Frage|Wie lange dauert die Fahrt mit dem Bus, und wie lange sind wir auf dem Schiff]]?

Schreib mir bitte zurück.

[[Grußformel|Viele Grüße]]
[[Dein Name|Aymen]]` },

  // 10
  { label: "Gute Besserung, Minigolf in der Halle, Zusage, Frage nach dem Mittagessen", t: `Hallo [[Name des Freundes|Thomas]],

danke für deine E-Mail und die Einladung! Der Unfall beim Basketball tut mir sehr leid. [[Reaktion auf den Unfall|Gute Besserung, Thomas, ich hoffe, dass du bald wieder ohne Schmerzen laufen kannst]].

Ich nehme die Einladung gern an und freue mich auf den Ausflug. Bus und Schiff, das klingt nach einem gemütlichen Tag. Auch ich bin gespannt auf die Überraschung.

Wenn das Wetter schlecht wird, kann ich mir gut vorstellen: [[Alternative bei Regen|Wir spielen in einer Halle Minigolf, das geht auch mit einem gebrochenen Bein]]. Es macht auch bei Regen Spaß.

Eine Frage habe ich noch: [[Frage|Gibt es ein Mittagessen unterwegs, und wo essen wir]]?

Ich freue mich auf deine Antwort.

[[Grußformel|Bis bald]]
[[Dein Name|Rim]]` },

  // 11
  { label: "Schmerzen gewünscht weg, Therme und Café, Zusage, Frage nach dem Fahrplan", t: `Lieber [[Name des Freundes|Thomas]],

deine Nachricht hat mich sehr gefreut, aber dein Unfall macht mich traurig. [[Reaktion auf den Unfall|Ich wünsche dir, dass die Schmerzen bald weggehen, und ich denke an dich]]. Gute Besserung!

Ich komme sehr gern zum Ausflug, und ich bin gespannt auf das geheime Ziel. Dass du an uns denkst, obwohl du das Bein gebrochen hast, ist sehr nett.

Falls das Wetter schlecht ist, habe ich einen Vorschlag: [[Alternative bei Regen|Wir gehen in ein Thermalbad und danach in ein Café]]. Dort können wir lange sitzen und reden.

Ich habe noch eine Frage: [[Frage|Wie ist der Fahrplan, und wann fährt das Schiff zurück]]?

Antworte mir bitte bald.

[[Grußformel|Herzliche Grüße]]
[[Dein Name|Emna]]` },

  // 12
  { label: "Gute Besserung, Stadtrundfahrt bei Regen, Zusage, Frage zur Kleidung und Schuhen", t: `Hallo [[Name des Freundes|Thomas]],

wie nett, dass du uns einlädst! Dass du dir beim Basketball das Bein gebrochen hast, tut mir sehr leid. [[Reaktion auf den Unfall|Ich hoffe, dass du keine bleibenden Schäden hast, und wünsche dir schnelle Besserung]].

Zu deinem Ausflug: Ich komme sehr gern. Der Plan klingt gemütlich, und ich freue mich besonders auf die Fahrt mit dem Schiff. Das Ziel soll ja eine Überraschung sein.

Falls das Wetter schlecht ist, schlage ich vor: [[Alternative bei Regen|Wir machen eine Stadtrundfahrt im Bus und halten bei einem Café]]. So bleiben wir trocken.

Eine Frage habe ich noch: [[Frage|Brauchen wir besondere Schuhe, und müssen wir viel laufen]]?

Ich freue mich auf deine Antwort.

[[Grußformel|Alles Liebe]]
[[Dein Name|Walid]]` },

  // 13
  { label: "Mitleid, Einkaufszentrum bei Regen, Zusage, Frage nach dem Wetterbericht", t: `Lieber [[Name des Freundes|Thomas]],

danke für deine Einladung, ich freue mich sehr! Dass du dich beim Basketball verletzt hast, tut mir leid. [[Reaktion auf den Unfall|Ich hoffe, dass du dich gut erholst, und wünsche dir viel Geduld]].

Ich nehme die Einladung gern an und komme am Samstag mit. Dein Plan mit Bus und Schiff klingt gut, und ich bin gespannt auf die Überraschung.

Wenn es regnet, könnten wir [[Alternative bei Regen|ein großes Einkaufszentrum besuchen und dort essen]]. Das ist trocken und warm.

Ich möchte noch wissen: [[Frage|Hast du schon den Wetterbericht gesehen, und was passiert, wenn es nur ein bisschen regnet]]?

Schreib mir bitte zurück. Ich freue mich auf einen schönen Tag mit euch allen.

[[Grußformel|Viele Grüße]]
[[Dein Name|Sana]]` },

  // 14
  { label: "Gute Besserung, Zoohaus bei Regen, Zusage, Frage nach dem Essen und dem Treffpunkt", t: `Hallo [[Name des Freundes|Thomas]],

ich habe mich über deine Einladung gefreut! Dein Unfall beim Basketball tut mir leid. [[Reaktion auf den Unfall|Gute Besserung und viel Ruhe, ich hoffe, dass du bald wieder fit bist]].

Ich komme sehr gern zum Ausflug. Ein gemütlicher Tag mit Bus und Schiff ist genau das, was ich mag, und das Datum passt mir sehr gut. Ich bin gespannt auf deine Überraschung.

Falls das Wetter schlecht wird, schlage ich vor: [[Alternative bei Regen|Wir gehen ins Tropenhaus im Zoo und sehen Tiere in der Wärme]]. Das ist für alle schön.

Eine Frage: [[Frage|Gibt es unterwegs etwas zu essen, und treffen wir uns um halb zehn direkt bei dir]]?

Ich freue mich auf deine Antwort.

[[Grußformel|Bis bald]]
[[Dein Name|Anis]]` },

  // 15
  { label: "Mitgefühl, Kochabend bei Regen, Zusage, Frage zur Kamera und Ausrüstung", t: `Lieber [[Name des Freundes|Thomas]],

vielen Dank für die Einladung! Dass du das Bein gebrochen hast, tut mir leid. [[Reaktion auf den Unfall|Ich wünsche dir eine schnelle Heilung, und ich hoffe, dass der Gips bald wieder ab ist]]. Gute Besserung!

Ich komme sehr gern zum Ausflug und freue mich auf die Fahrt mit Bus und Schiff. Es ist schön, dass du trotzdem alles organisierst, und ich bin gespannt, wohin es geht.

Falls es regnet, habe ich einen Vorschlag: [[Alternative bei Regen|Wir machen einen Kochabend bei dir zu Hause, und jeder bringt etwas mit]]. Dann kannst du dein Bein hochlegen.

Ich habe noch eine Frage: [[Frage|Soll ich meine Kamera mitnehmen, und gibt es auf dem Schiff schöne Plätze zum Fotografieren]]?

Schreib mir bitte bald.

[[Grußformel|Herzliche Grüße]]
[[Dein Name|Salma]]` },
];

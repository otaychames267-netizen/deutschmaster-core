// v2 (B2-style): Miroslav hat eine kleine Firma gegründet (Gartenarbeiten, Reparaturen rund ums Haus, Lieferwagen, viele Kunden, eigener Chef). Points: welche Arbeit Sie machen oder suchen ·
// was Sie von Miroslavs Tätigkeit halten · was es bei Ihnen Neues gibt · eine Frage zu Miroslavs Kunden — plus: Entschuldigung ("lange nicht gemeldet"), "endlich mein eigener Chef".
export const kw = [/Arbeit|arbeite|Job|Stelle|suche|Beruf/i, /Firma|Idee|Tätigkeit|toll|mutig|gratul|Garten|Chef/i, /Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /Kunden/, /\?/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Miroslav]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Du musst dich nicht entschuldigen, dass du dich lange nicht gemeldet hast. [[Reaktion auf die Entschuldigung|Wenn man eine Firma gründet, hat man kaum Zeit für Briefe]]. Herzlichen Glückwunsch, dass du jetzt dein eigener Chef bist!

Zu deiner Frage nach meiner Arbeit: [[Eigene Arbeit|Ich arbeite seit zwei Jahren in einem Büro und mache die Buchhaltung]]. Das gefällt mir, weil [[Grund für die Zufriedenheit|die Kollegen nett sind und ich selbstständig arbeiten kann]].

Deine Tätigkeit finde ich großartig und mutig. [[Meinung zur Firma|Gartenarbeit und Reparaturen sind gefragt, und du bist bestimmt schnell erfolgreich]]. Dass du schon viele Kunden hast, beeindruckt mich.

Bei mir gibt es folgende Neuigkeit: [[Neuigkeit|Ich habe eine Weiterbildung zur Bilanzbuchhalterin begonnen]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Wie hast du sie gefunden, und was wünschen sich die meisten]]?

Dass du Blumen pflanzt und Bäume schneidest, finde ich schön, weil [[Begründung|man am Ende des Tages sieht, was man geschafft hat]]. In meinem Büro sehe ich nur Zahlen. Ich beneide dich ein wenig, [[Gefühl|auch wenn die Arbeit körperlich anstrengend ist]]. Hast du schon Hilfe, oder machst du alles allein?

Zu meiner eigenen Arbeit möchte ich noch hinzufügen: [[Aufgabe|Ich plane Termine, schreibe Berichte und telefoniere viel]]. Das ist nicht aufregend, aber sicher. Wenn ich ehrlich bin, [[Gedanke|träume ich manchmal von einem Beruf an der frischen Luft]], so wie deinem.

Bei mir gibt es noch eine Neuigkeit: [[Weitere Neuigkeit|Ich habe angefangen, Gitarre zu lernen]]. Jeden Abend übe ich eine halbe Stunde, und es macht mir Spaß. Vielleicht spiele ich dir etwas vor, [[Plan|wenn ich dich einmal besuche]].

Schreib mir bitte, [[Frage an den Freund|wie dein erster Sommer als Chef läuft]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Miroslav]],

schön, von dir zu hören! Kein Stress wegen der Pause, [[Reaktion auf die Entschuldigung|bei mir meldet sich auch keiner pünktlich]]. Eine eigene Firma, Respekt!

Meine Arbeit? [[Eigene Arbeit|Ich arbeite im Verkauf in einem Möbelhaus]]. Passt gut, [[Grund für die Zufriedenheit|die Kollegen sind locker]].

Deine Gartenarbeit finde ich cool. [[Meinung zur Firma|Draußen arbeiten, eigener Chef und Lieferwagen, das ist ein Traum]]. Kein Wunder, dass die Kunden dich anrufen.

Neues bei mir? [[Neuigkeit|Ich habe angefangen zu laufen und trainiere für einen Zehn-Kilometer-Lauf]].

Frage zu deinen Kunden: [[Frage zu den Kunden|Gibt es Stammkunden, und wer ist der netteste]]?

Ein eigener Lieferwagen ist ein großer Schritt: [[Kommentar|Er kostet viel, aber er macht dich flexibel]]. Ich habe selbst überlegt, [[Überlegung|mir ein Auto zu kaufen]], aber noch nicht den Mut gehabt. Du bist da schon weiter, und das beeindruckt mich sehr.

Ich suche gerade [[Suche|eine neue Herausforderung im Beruf]], aber ich weiß noch nicht, wohin. Deine Mail hat mich inspiriert. Vielleicht [[Idee|probiere ich ein Praktikum bei einem Handwerker aus]], nur um zu sehen, ob das etwas für mich wäre.

Seit einigen Wochen [[Veränderung|treffe ich mich regelmäßig mit alten Freunden zum Kochen]]. Das tut gut nach einem langen Arbeitstag. Es wäre schön, wenn du auch einmal dabei wärst, [[Einladung|wenn dein Terminkalender es erlaubt]].

Meld dich, [[Frage an den Freund|wie es weitergeht]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Miroslav]],

wow, was für eine tolle Nachricht! Entschuldige dich nicht, [[Reaktion auf die Entschuldigung|ich weiß ja, wie viel Arbeit eine Gründung macht]]. Herzlichen Glückwunsch zur eigenen Firma!

Meine Arbeit: [[Eigene Arbeit|Ich bin Krankenpflegerin und arbeite im Schichtdienst]]. Ich liebe sie, weil [[Grund für die Zufriedenheit|ich Menschen helfen kann]].

Deine Idee finde ich genial. [[Meinung zur Firma|Gartenarbeit, Reparaturen und ein eigener Lieferwagen, das ist mutig und klug]]. Ich bin stolz auf dich.

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich fahre im Sommer drei Wochen nach Griechenland]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Was war dein ungewöhnlichster Auftrag]]?

Eine Firma zu gründen, [[Einschätzung|ist ein Traum vieler Menschen, aber nur wenige trauen sich]]. Du hast es getan, und das verdient Respekt. Ich wünsche dir, dass du [[Wunsch|viele zufriedene Kunden und genug Zeit für dich]] hast.

Ich liebe meine Arbeit, weil [[Grund|jeder Tag anders ist und ich viele Menschen treffe]]. Manchmal ist es stressig, aber [[Folge|am Abend bin ich zufrieden]]. Das wünsche ich jedem, und ich hoffe, du hast dieses Gefühl bei deiner Firma auch jeden Tag.

Zum Thema Neuigkeiten: [[Neuigkeit|Ich habe eine neue Wohnung gefunden und ziehe im Herbst um]]. Ich bin schon ganz aufgeregt und freue mich auf mehr Platz. Wenn du Zeit hast, [[Bitte|hilfst du mir vielleicht beim Umzug mit deinem Lieferwagen]]?

Schreib mir bald, [[Frage an den Freund|wie viele Kunden du schon hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Miroslav]],

vielen Dank für deine Nachricht. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, die Pause: [[Reaktion auf die Entschuldigung|Du musst dich nicht entschuldigen, die Gründung hat dich sicher gefordert]]. Ich gratuliere dir herzlich zur Firma.

Zweitens, meine Arbeit: [[Eigene Arbeit|Ich arbeite als Sachbearbeiter in einer Versicherung]].

Drittens, deine Tätigkeit: [[Meinung zur Firma|Ich halte sie für sinnvoll, weil der Bedarf an Garten- und Reparaturarbeiten hoch ist]].

Viertens, meine Neuigkeiten: [[Neuigkeit|Ich bin im Büro befördert worden]].

Fünftens, eine Frage zu deinen Kunden: [[Frage zu den Kunden|Wie gewinnst du neue Kunden, durch Empfehlung oder Werbung]]?

Ergänzend empfehle ich dir, [[Empfehlung|von Anfang an Rechnungen und Belege ordentlich zu sortieren]]. Das erspart dir später viel Ärger mit dem Finanzamt. Ich kenne mich damit aus, [[Hilfsangebot|und kann dir bei Fragen gern helfen]].

Im Büro habe ich [[Aufgabe|Verantwortung für ein kleines Team übernommen]]. Das ist neu für mich, aber ich lerne schnell. Deine Mail zeigt mir, dass man mit Mut viel erreichen kann, und das motiviert mich sehr.

Bei mir hat sich auch etwas geändert: [[Veränderung|Ich mache jetzt dreimal pro Woche Sport]]. Das hat meine Laune sehr verbessert. Dir als Gärtner und Handwerker bleibt das wohl erspart, denn du bist den ganzen Tag in Bewegung.

Ich freue mich auf [[Vorfreude|deine nächste Mail]] und auf [[Wunsch|ein Treffen im Sommer]]. Bitte teile mir mit, [[Frage an den Freund|wie es weitergeht]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Miroslav]],

danke für deine Mail! [[Reaktion auf die Entschuldigung|Es ist völlig in Ordnung, dass du lange nicht geschrieben hast]]. Glückwunsch zur Firma, und wenn ich dir helfen kann, sag Bescheid.

Meine Arbeit: [[Eigene Arbeit|Ich arbeite als Technikerin in einer Werkstatt]]. Das ist praktisch, denn [[Praktische Hilfe|ich kann dir bei Fragen zu Werkzeug und Reparaturen helfen]].

Deine Tätigkeit finde ich toll. [[Meinung zur Firma|Mit Lieferwagen und Werkzeug bist du gut aufgestellt]]. Ich kann [[Hilfsangebot|dir gern eine Internetseite oder Visitenkarten gestalten]], wenn du magst.

Bei mir gibt es [[Neuigkeit|eine neue Kollegin, die mich entlastet]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Brauchst du Hilfe bei den Rechnungen oder der Terminplanung]]?

Wenn du Hilfe bei der Werbung brauchst, [[Hilfsangebot|gestalte ich dir einen Flyer und eine kleine Seite im Internet]]. Das mache ich gern. Ich schlage vor, dass du [[Idee|Fotos von deiner Arbeit machst, vorher und nachher]], das wirkt sehr gut.

Mein Job ist [[Beschreibung|praktisch und gut organisiert]], und ich verstehe mich mit allen. Ich habe Glück, [[Folge|dass ich mich auf die Arbeit freue]]. Wenn ich dir bei etwas aus dem Büro helfen kann, sag es bitte, ich bin da.

Eine Kleinigkeit noch aus meinem Leben: [[Neuigkeit|Ich habe einen kleinen Hund aus dem Tierheim geholt]], er heißt Rex. Er hält mich auf Trab, aber ich liebe ihn. Vielleicht kannst du ihn bei Gelegenheit einmal in deinem Garten toben lassen.

Sag mir bitte, [[Frage an den Freund|ob ich dir sonst noch helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Miroslav]],

du brauchst dich nicht zu entschuldigen, denn [[Begründung für die Nachsicht|eine Firmengründung braucht viel Zeit]]. Ich gratuliere dir herzlich.

Meine Arbeit: [[Eigene Arbeit|Ich arbeite als Lehrerin an einer Grundschule]], weil [[Grund für den Beruf|ich gern mit Kindern arbeite]].

Deine Tätigkeit halte ich für eine gute Idee, weil [[Begründung zur Firma|Garten- und Reparaturarbeiten immer gebraucht werden]]. [[Meinung zur Firma|Du hast Mut bewiesen]].

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Warum rufen sie dich immer wieder an, und was machst du besser als andere]]?

Du hast bewiesen, dass du [[Eigenschaft|ein guter Handwerker und ein mutiger Unternehmer bist]]. Das ist eine seltene Kombination. Deshalb bin ich sicher, [[Folge|dass deine Firma wachsen wird]]. Ich drücke dir die Daumen, und ich glaube fest an dich.

Ich habe mich für meinen Beruf entschieden, weil [[Grund|ich gern mit Zahlen und Menschen arbeite]]. Deine Entscheidung ist mutiger, aber ich verstehe sie. Beide Wege haben Vor- und Nachteile, [[Folge|und wichtig ist, dass man zufrieden ist]].

Meine Neuigkeit ist ein bisschen traurig und schön zugleich: [[Neuigkeit|Meine Oma ist ins Altersheim gezogen, aber sie fühlt sich dort wohl]]. Ich besuche sie jede Woche. Familie ist mir wichtig, und ich denke, dir auch.

Schreib mir, [[Frage an den Freund|wie du den Erfolg erklärst]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Miroslav]],

danke für deine Mail, hier kurz meine Antworten.

Pause: [[Reaktion auf die Entschuldigung|Kein Problem]]. Glückwunsch zur Firma!

Meine Arbeit: [[Eigene Arbeit|Büro, Buchhaltung]].

Deine Tätigkeit: [[Meinung zur Firma|Toll und mutig]].

Neues bei mir: [[Neuigkeit|Neue Aufgabe im Büro]].

Frage zu deinen Kunden: [[Frage zu den Kunden|Wie viele hast du schon]]?

Mich interessiert noch: Wie findest du die Arbeit im Winter, wenn der Garten schläft? [[Idee|Vielleicht bietest du dann Schneeräumen oder Reparaturen im Haus an]]. So hast du das ganze Jahr Aufträge. Das hat sich bei meinem Onkel bewährt.

Ich arbeite im Moment [[Arbeitszeit|dreißig Stunden pro Woche]], das reicht mir. Dadurch habe ich Zeit für Hobbys, und ich fühle mich ausgeglichen. Dein Weg bedeutet vielleicht mehr Stunden, [[Folge|aber auch mehr Freiheit]].

In letzter Zeit [[Erlebnis|habe ich mir einen lang gehegten Wunsch erfüllt und eine Reise nach Spanien gebucht]]. Ich freue mich riesig darauf. Wenn ich zurück bin, erzähle ich dir alles ganz genau und zeige dir Fotos.

Ich freue mich sehr für dich und wünsche dir viel Erfolg, denn mit so einer Idee, [[Wunsch|ein eigener Betrieb mit netten Kunden]], kann man weit kommen. Ich bin gespannt auf [[Neugier|deine nächsten Pläne]]. Gib mir bitte kurz Bescheid, [[Frage an den Freund|wie es läuft]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Miroslav]],

du hast eine Firma gegründet und meldest dich erst jetzt? [[Reaktion auf die Entschuldigung|Verziehen, Chefs haben ja nie Zeit]]. Glückwunsch, jetzt bist du dein eigener Chef und dein eigener Kritiker.

Meine Arbeit: [[Eigene Arbeit|Ich sitze im Büro und sortiere Rechnungen, spannender als es klingt]]. Aber [[Grund für die Zufriedenheit|der Kaffee ist gut]].

Deine Tätigkeit ist beneidenswert. [[Meinung zur Firma|Draußen arbeiten, Blumen pflanzen, Gras schneiden, was für ein Leben]]. Ich würde sofort tauschen, aber nur im Sommer.

Neues bei mir: [[Neuigkeit|Ich habe meinen Schreibtisch aufgeräumt, ein Wunder]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Wer ist der anstrengendste, der Rasen oder der Mensch]]?

Dass du jetzt dein eigener Chef bist, [[Kommentar|bedeutet auch, dass du dir selbst Urlaub genehmigen musst]]. Vergiss das nicht, denn Erholung ist wichtig. Ich habe das bei meinem Schwager gesehen, [[Erinnerung|der drei Jahre ohne Pause gearbeitet hat]].

In meinem Büro gibt es gerade viel Wirbel: [[Ereignis|Wir bekommen neue Computer und müssen alles neu lernen]]. Ich beschwere mich nicht, aber ich träume von deinem Garten. Dort ist alles klar, und man sieht Ergebnisse.

Neu bei mir ist [[Neuigkeit|ein Kochkurs, den ich jeden Mittwoch besuche]]. Ich habe schon drei Rezepte gelernt und koche jetzt für meine Freunde. Es macht mir großen Spaß, auch wenn die Küche danach wie ein Schlachtfeld aussieht.

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit dir]]. Schreib bald, [[Frage an den Freund|ob du mir auch den Garten machst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Miroslav]],

als ich deine Mail gelesen habe, musste ich an unsere gemeinsame Zeit denken. [[Erinnerung an früher|Du hast damals schon gesagt, dass du einmal dein eigener Chef sein willst]]. Es freut mich, dass du es geschafft hast.

Zu meiner Arbeit: [[Eigene Arbeit|Ich arbeite seit drei Jahren im Büro einer Spedition]].

Deine Firma finde ich bewundernswert. [[Meinung zur Firma|Du hast Mut gehabt, einen Lieferwagen zu kaufen und neu anzufangen]].

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Gibt es einen, der dir besonders in Erinnerung geblieben ist]]?

Ich erinnere mich, wie du als Kind schon [[Erinnerung|im Garten deines Vaters geholfen hast]]. Es war immer klar, dass du etwas mit den Händen machst. Jetzt hast du dein Hobby zum Beruf gemacht, [[Folge|und das ist wunderbar]].

Ich arbeite gern, aber ich habe [[Erinnerung|als Kind immer gesagt, ich werde Förster]]. Daran musste ich denken, als ich deine Mail las. Vielleicht gibt es ein Mittelding, [[Folge|etwas mit Natur und Menschen]].

Eine Neuigkeit, an der ich lange gearbeitet habe: [[Neuigkeit|Ich habe meinen Führerschein bestanden]]. Das war ein langer Weg, und ich bin stolz darauf. Jetzt kann ich dich endlich einmal besuchen, [[Angebot|wenn du mich einlädst]].

Erzähl mir, [[Frage an den Freund|wie dein Alltag jetzt aussieht]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Miroslav]],

danke für deine Mail, und Glückwunsch zur Firma! [[Reaktion auf die Entschuldigung|Die Pause ist kein Problem]]. Ich habe gleich mehrere Vorschläge für dich.

Mein erster Vorschlag: [[Vorschlag 1|Mach eine kleine Internetseite mit Fotos deiner Arbeit]]. Mein zweiter: [[Vorschlag 2|Frag deine Kunden nach Empfehlungen]]. Mein dritter: [[Vorschlag 3|Biete im Winter Schneeräumen an]].

Meine Arbeit: [[Eigene Arbeit|Ich arbeite im Verkauf]]. Bei mir gibt es [[Neuigkeit|einen neuen Chef]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Wie viele davon kommen aus deiner Nachbarschaft]]?

Mein vierter Vorschlag: [[Vorschlag|Schreib Rechnungen mit einem kostenlosen Programm]], das spart Zeit. Mein fünfter: [[Vorschlag 2|Frag deine ersten Kunden um eine kurze Bewertung für deine Seite]]. So bekommst du Vertrauen und neue Aufträge.

Zu meiner Arbeit noch ein Vorschlag: Wenn du Hilfe bei den Finanzen brauchst, [[Angebot|schaue ich mir gern mit dir deine Zahlen an]]. Ich arbeite ja genau damit, und es wäre eine Freude, dir zu helfen.

Bei mir gibt es nur kleine Veränderungen, [[Veränderung|zum Beispiel ein neues Sofa im Wohnzimmer]]. Aber ich freue mich darüber. Manchmal sind es die kleinen Dinge, die den Alltag schöner machen, und ich hoffe, dir geht es genauso.

Was hältst du davon? Ich freue mich auf deine Antwort. Schreib mir, [[Frage an den Freund|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Miroslav]],

danke für deine Mail. [[Reaktion auf die Entschuldigung|Du brauchst dich nicht zu entschuldigen]]. Zu deiner Firma möchte ich vorsichtig antworten.

Einerseits [[Vorteil der Selbstständigkeit|bist du frei und dein eigener Chef]], andererseits [[Nachteil der Selbstständigkeit|trägst du das ganze Risiko]]. Ich finde deine Idee gut, [[Meinung zur Firma|solange du dich nicht überlastest]].

Meine Arbeit: [[Eigene Arbeit|Ich arbeite im Büro und bin zufrieden, aber ohne große Veränderungen]].

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Zahlen sie pünktlich, und wie planst du den Winter]]?

Ich möchte noch erwähnen, dass Selbstständigkeit auch [[Hinweis|Phasen mit wenig Aufträgen bringen kann]]. Dafür solltest du [[Rat|Rücklagen bilden]], damit du ruhig bleiben kannst. Aber du bist ein vernünftiger Mensch und hast das sicher schon bedacht.

Ich bin mit meiner Arbeit insgesamt zufrieden, [[Einschränkung|auch wenn es manchmal Tage gibt, an denen ich mich langweile]]. Aber das gehört dazu. Du wirst sicher auch solche Tage haben, [[Folge|auch wenn du es nicht zugibst]].

Zur Planung für das Wochenende: [[Plan|Ich könnte dich in zwei Wochen besuchen und dir bei etwas helfen]]. Das wäre mein Beitrag für deinen Erfolg. Sag mir, [[Frage|ob dir ein Besuch gerade recht ist]], dann plane ich die Fahrt.

Schreib mir bitte, [[Frage an den Freund|wie du dich fühlst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Miroslav]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Entschuldigung|Entschuldige dich nicht]]. Glückwunsch zur Firma.

Als Nächstes zu meiner Arbeit: [[Eigene Arbeit|Büro, Buchhaltung]].

Dann zu deiner Tätigkeit: [[Meinung zur Firma|Ich finde sie mutig und toll]].

Danach zu den Neuigkeiten bei mir: [[Neuigkeit|Neue Aufgabe]].

Zuletzt eine Frage zu deinen Kunden: [[Frage zu den Kunden|Wie findest du neue]]?

Ein weiterer Schritt für dich: [[Schritt|Mach dir einen Plan für das nächste Jahr, mit Zielen und Preisen]]. Das gibt Sicherheit und hilft bei Entscheidungen. Ich helfe dir gern, wenn du magst, einen solchen Plan zu schreiben.

Als zweiten Schritt für meine Karriere habe ich vor, [[Schritt|eine Weiterbildung zu machen]]. Das dauert ein Jahr, und dann habe ich bessere Chancen. Dein Beispiel zeigt mir, dass sich Mut lohnt, [[Folge|und dass man nicht zu lange warten sollte]].

Mein Leben ist im Moment recht ruhig: [[Beschreibung|Arbeit, Freunde, ein bisschen Sport]]. Aber das ist gut so. Du hast bestimmt mehr zu erzählen, [[Wunsch|und ich freue mich auf deine nächste Mail]].

Ich freue mich auf [[Vorfreude|ein Wiedersehen]] und wünsche dir viel Erfolg bei allem, was du dir vorgenommen hast, und auf viele neue Aufträge. Wie geht es weiter? Schreib mir, [[Frage an den Freund|wie es läuft]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Miroslav]],

deine Mail hat mich sehr gefreut. [[Reaktion auf die Entschuldigung|Mach dir keine Gedanken wegen der Pause, Hauptsache, es geht dir gut]]. Ich freue mich so für dich, dass du jetzt dein eigener Chef bist.

Meine Arbeit: [[Eigene Arbeit|Ich arbeite in einem kleinen Büro, mit netten Kollegen]].

Deine Tätigkeit finde ich wunderbar. [[Meinung zur Firma|Du bist mutig, und ich glaube, dass du Erfolg haben wirst]].

Bei mir gibt es [[Neuigkeit|ein neues Hobby, das mir Freude macht]].

Eine Frage zu deinen Kunden: [[Frage zu den Kunden|Sind sie nett zu dir, und fühlst du dich geschätzt]]?

Ich glaube, dass du ein sehr guter Chef bist: [[Eigenschaft|Du bist fleißig, ehrlich und freundlich zu deinen Kunden]]. Das spricht sich herum. Und auch ich werde dich weiterempfehlen, [[Angebot|wenn ich jemanden kenne, der einen Gärtner braucht]].

Ich bin mit meiner Arbeit zufrieden, [[Grund|weil ich nette Kollegen habe und mein Chef mich unterstützt]]. Trotzdem beneide ich dich ein wenig um deine Freiheit. Wenn es nicht klappt, sagst du mir ehrlich, wie es dir damit geht, oder?

Neues von mir: [[Neuigkeit|Ich habe angefangen, Spanisch zu lernen]], weil ich im nächsten Jahr verreisen möchte. Es macht Spaß, und ich komme gut voran. Wenn du magst, übe ich bei einem Treffen mit dir, [[Idee|vielleicht über Gartenbegriffe]].

Ich freue mich auf [[Vorfreude|ein Wiedersehen]]. Erzähl mir, [[Frage an den Freund|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Miroslav]],

eigene Firma, stark! [[Reaktion auf die Entschuldigung|Kein Stress wegen der Pause]].

Meine Arbeit: [[Eigene Arbeit|Büro, ganz okay]].

Deine Tätigkeit: [[Meinung zur Firma|Cool und mutig]].

Neues: [[Neuigkeit|Nichts Besonderes]].

Kunden: [[Frage zu den Kunden|Wie viele hast du schon]]?

Ein Tipp noch: [[Tipp|Visitenkarten und ein Schild am Lieferwagen]] bringen oft neue Kunden. Das kostet wenig, und die Leute sehen dich jeden Tag. Ich habe das bei einem Bekannten erlebt, [[Folge|er hatte nach einem Monat doppelt so viele Anfragen]].

Mein Alltag ist [[Beschreibung|ziemlich geregelt: aufstehen, arbeiten, Feierabend]]. Das ist angenehm, aber auch ein bisschen eintönig. Dein Leben klingt bunter, [[Folge|und ich wünsche dir, dass es so bleibt]].

Zu mir: Ich habe [[Neuigkeit|eine neue Kollegin, mit der ich mich super verstehe]]. Das verändert den Büroalltag zum Guten. Und ich hoffe, dass auch dein Alltag bunt und voller guter Begegnungen ist.

Ich freue mich echt für dich und bin gespannt auf [[Vorfreude|deine nächsten Geschichten]]. Dass du jetzt ganz allein entscheidest, was du machst und wann, finde ich beeindruckend, und ich bin sicher, dass du mit deiner freundlichen Art viele Kunden gewinnst, die dich weiterempfehlen. Wenn ich dir einmal helfen kann, sag einfach Bescheid, das meine ich ernst. Meld dich, [[Frage an den Freund|wie es läuft]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

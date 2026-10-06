// v2 (B2-style): Naco hat eine neue Wohnung in einer neuen Stadt, ist manchmal einsam und fragt nach Tipps, wie er Nachbarn kennenlernen kann. Points: Reaktion auf den Vorschlag (ob Sie Naco besuchen möchten) ·
// etwas über Ihre Wohnung · Tipps für Naco, wie er Nachbarn kennenlernen kann · was es bei Ihnen Neues gibt — plus: "Hattest du schon mal dieses Problem? Was würdest du tun?"
export const kw = [/besuch/i, /Wohnung|Zimmer|Küche|Balkon|Miete|wohne/i, /Nachbar/i, /Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /Tipp|Verein|Kurs|Gruppe|Fest|vorstellen|klingeln|Kuchen|Sport|Chor|Hausflur/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Naco]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Schön, dass du eine Wohnung nahe an deiner Firma gefunden hast. [[Reaktion auf die Wohnung|Der Weg zu Fuß zur Arbeit ist ein großes Plus]].

Dein Vorschlag, dich zu besuchen, gefällt mir sehr. Ich komme gern [[Zeitpunkt des Besuchs|im Frühjahr für ein langes Wochenende]], und wir entdecken zusammen die Stadt. [[Anreise|Ich fahre mit dem Zug]], das ist bequem.

Meine eigene Wohnung hat [[Größe der Wohnung|zwei Zimmer und eine kleine Küche]]. Am liebsten mag ich [[Lieblingsplatz|das Fensterbrett mit meinen Pflanzen]].

Zu deinem Problem mit den Nachbarn: Ich hatte das auch, als ich neu in die Stadt kam. Mein Tipp ist, [[Tipp 1|sich im Treppenhaus vorzustellen und ein paar Worte zu wechseln]]. Außerdem [[Tipp 2|kannst du an einem Sportverein oder an einem Chor teilnehmen]].

Bei mir gibt es folgende Neuigkeit: [[Neuigkeit|Ich habe angefangen, Gitarre zu lernen]].

Zur Stadt selbst habe ich auch eine Frage: Wie gefällt dir [[Eindruck von der Stadt|das Essen und die Altstadt]]? Du schreibst, dass sie schön ist, und ich bin neugierig. Zusammen können wir [[Programm bei meinem Besuch|am Samstag auf den Markt gehen und abends in ein Lokal]], das du empfiehlst.

Was bei mir sonst noch so passiert ist: [[Weitere Neuigkeit|Ich habe mit einem Freund einen Ausflug in die Berge gemacht]], und danach [[Folge|war ich eine ganze Woche entspannt]]. Das hat mir gezeigt, wie wichtig Pausen sind. Du solltest dir das auch gönnen, besonders in der neuen Umgebung.

Zum Besuch noch eine Frage: Wo kann ich bei dir [[Übernachtung|schlafen, im Arbeitszimmer oder auf dem Sofa]]? Ich bringe [[Mitbringsel|einen Schlafsack und ein kleines Geschenk]] mit, damit es für dich einfach ist. Sag mir einfach, was dir am liebsten ist.

Schreib mir bitte, [[Frage an den Freund|wann dir mein Besuch am besten passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Naco]],

schön, von dir zu hören! Glückwunsch zur neuen Wohnung! [[Reaktion auf die Wohnung|Drei Zimmer, Balkon und zu Fuß zur Arbeit, das klingt perfekt]]. Umzüge sind der Horror, aber danach fühlt man sich super.

Besuch? Klar, gern! [[Zeitpunkt des Besuchs|Ich könnte im Sommer für ein Wochenende kommen]]. Wir erkunden die Stadt und probieren das Essen.

Meine Wohnung? Ziemlich klein: [[Größe der Wohnung|ein Zimmer, Bad und eine Mini-Küche]]. Aber [[Besonderheit der Wohnung|der Balkon ist toll und die Lage super]].

Zu den Nachbarn, mein Tipp: [[Tipp 1|Klingel einfach mal und bring einen Kuchen mit]]. Das klappt fast immer! Oder [[Tipp 2|geh in ein Café in deiner Straße und komm mit Leuten ins Gespräch]].

Was bei mir los ist? [[Neuigkeit|Ich habe eine neue Kollegin und wir verstehen uns gut]].

Noch ein Gedanke zu deinem Arbeitsweg: Es ist ein Luxus, [[Vorteil des Arbeitswegs|zu Fuß zur Arbeit zu gehen und die frische Luft zu genießen]]. Ich fahre jeden Tag [[Mein Arbeitsweg|dreißig Minuten mit der Bahn]] und wünsche mir deine Lage. Das spart viel Zeit und Stress.

Übrigens habe ich in letzter Zeit [[Hobby|wieder angefangen zu kochen]], und ich probiere jedes Wochenende ein neues Rezept aus. Bei deinem Besuch bei mir, [[Gegenbesuch|wenn du einmal kommst]], koche ich für dich. Dann zeige ich dir auch meine kleine Küche und die Nachbarn im Haus.

Wenn ich zu dir komme, möchte ich [[Wunsch|das beste Café und den schönsten Park der Stadt sehen]]. Du kennst sicher schon [[Vermutung|ein paar tolle Ecken]], oder? Ich lasse mich von dir gern überraschen und nehme mir viel Zeit dafür.

Meld dich, [[Frage an den Freund|wann es bei dir passt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Naco]],

wow, eine neue Wohnung! [[Reaktion auf die Wohnung|Ich freue mich riesig für dich, besonders über den Balkon und das Arbeitszimmer]]. Dass du zu Fuß zur Arbeit gehen kannst, ist traumhaft.

Dein Vorschlag, dich zu besuchen, macht mich glücklich! [[Zeitpunkt des Besuchs|Ich komme am liebsten im Herbst]], und wir erkunden zusammen die ganze Stadt.

Meine Wohnung? [[Größe der Wohnung|Zwei Zimmer mit einer sonnigen Küche]]. Ich liebe [[Besonderheit der Wohnung|die hohen Decken und die große Fensterfront]].

Die Nachbarn kennenzulernen, ist einfacher, als du denkst! Mein Tipp: [[Tipp 1|Lade sie zu einem kleinen Einweihungsfest ein]]. Außerdem [[Tipp 2|tritt einem Verein bei, zum Beispiel einem Lesekreis]].

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich habe beim Marathon in unserer Stadt mitgemacht]].

Dein Arbeitszimmer mit den Lieblingsbüchern finde ich wunderbar. Ich möchte es bei meinem Besuch gern sehen und [[Wunsch|ein Buch ausleihen, das du empfiehlst]]. Bei mir stehen [[Meine Bücher|zwei Regale mit Krimis und Reiseführern]], und ich zeige dir gern, was ich lese.

Wegen deines Besuchs habe ich schon Pläne: Wir könnten [[Programmpunkt 1|das Museum der Stadt besuchen]] und [[Programmpunkt 2|abends am Fluss spazieren gehen]]. Wenn das Wetter schön ist, setzen wir uns auf deinen Balkon und reden. Ich freue mich darauf, deine Wohnung zu sehen.

Um die Nachbarn kennenzulernen, könntest du auch [[Idee|beim nächsten Straßenfest helfen]], wenn es eines gibt. Dann siehst du viele Leute auf einmal. Ich war einmal bei so einem Fest und habe [[Erfahrung|gleich drei neue Freunde gefunden]]. Das hat mir sehr geholfen.

Schreib mir bald, [[Frage an den Freund|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Naco]],

ich danke dir für deine E-Mail. Ich beantworte deine Fragen einzeln.

Erstens, deine Wohnung: [[Reaktion auf die Wohnung|Ich freue mich, dass sie nah an der Firma liegt und ein Arbeitszimmer hat]].

Zweitens, dein Vorschlag: Ich besuche dich gern, [[Zeitpunkt des Besuchs|am liebsten im Mai]].

Drittens, meine Wohnung: Sie hat [[Größe der Wohnung|drei Zimmer und einen Balkon]], und [[Besonderheit der Wohnung|sie liegt in einer ruhigen Straße]].

Viertens, die Nachbarn: Ich empfehle, [[Tipp 1|sich freundlich im Haus vorzustellen]] und [[Tipp 2|an Hausgemeinschaftsfesten teilzunehmen]].

Fünftens, mein Alltag: [[Neuigkeit|Ich habe eine neue Aufgabe im Büro übernommen]].

Auch zum Balkon habe ich einen Tipp: Wenn du [[Balkonidee|ein paar Blumen und zwei Stühle hinstellst]], kannst du dort Nachbarn auf einen Tee einladen. So kommt man leicht ins Gespräch, [[Vorteil|ohne dass es zu förmlich wird]]. Ich habe das selbst ausprobiert.

Bei mir gibt es auch Veränderungen im Alltag: [[Veränderung|Ich stehe jetzt früher auf und gehe vor der Arbeit eine Runde laufen]]. Das tut mir gut, und ich habe [[Ergebnis|schon zwei Kilo abgenommen]]. Vielleicht können wir bei deinem Besuch morgens zusammen laufen.

Dein Satz über das Essen in der Stadt hat mich überzeugt: [[Wunsch|Ich möchte unbedingt deine Lieblingsspeise probieren]]. Danach laden wir [[Gäste|ein paar Nachbarn zu einem Dessert ein]], dann hast du gleich eine Gelegenheit, Leute kennenzulernen. Was hältst du davon?

Bitte teile mir mit, [[Frage an den Freund|ob dir mein Besuch im Mai passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Naco]],

danke für deine Zeilen und deine guten Worte. [[Reaktion auf die Wohnung|Ich freue mich über deine neue Wohnung und helfe dir gern beim Einrichten]]. Wenn du Hilfe brauchst, sag Bescheid.

Dein Besuch-Vorschlag gefällt mir. [[Zeitpunkt des Besuchs|Ich komme gern im Juni]], und ich bringe [[Mitbringsel|ein Regal-Set für deine Bücher]] mit.

Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer]], und [[Besonderheit der Wohnung|ich habe viele praktische Möbel gekauft]]. Ich kann dir Tipps geben.

Bei den Nachbarn helfen meist kleine Dinge: [[Tipp 1|Ein Zettel im Hausflur mit deinem Namen und einer Einladung zum Kaffee]]. Dazu [[Tipp 2|kannst du eine App für die Nachbarschaft nutzen]].

Bei mir gibt es [[Neuigkeit|eine kleine Veränderung, ich habe das Büro gewechselt]].

Zur Einsamkeit noch etwas: Du bist nicht der Einzige, dem es so geht, [[Beruhigung|viele Menschen fühlen sich in den ersten Monaten fremd]]. Wichtig ist, [[Rat|nicht aufzugeben und regelmäßig rauszugehen]]. Bei mir hat es etwa [[Zeitraum|ein halbes Jahr]] gedauert, bis ich mich heimisch gefühlt habe.

Ein bisschen Neues gibt es auch aus meiner Familie: [[Familiennachricht|Meine Schwester hat ein Baby bekommen]], und ich bin jetzt Onkel. Das ist ein schönes Gefühl, und ich besuche sie oft. Ich erzähle dir bei einem Treffen alles ganz genau, mit vielen Fotos.

Zur Wohnung noch eine Idee: Hänge [[Dekoration|Bilder und Pflanzen auf]], dann wird sie gemütlich. Das gibt auch Gesprächsstoff, wenn Nachbarn zu Besuch kommen. Ich helfe dir [[Hilfsangebot|gern beim Einrichten, wenn ich komme]], das mache ich wirklich gern.

Sag mir bitte, [[Frage an den Freund|ob ich dir noch beim Umzug helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Naco]],

ich freue mich über deine neue Wohnung, denn [[Begründung für die Freude|sie hat alles, was du dir gewünscht hast]]. Dass der Umzug dich müde macht, verstehe ich gut.

Ich besuche dich gern, weil [[Grund für den Besuch|wir uns lange nicht gesehen haben und ich deine Stadt kennenlernen möchte]]. [[Zeitpunkt des Besuchs|Der Spätsommer passt mir am besten]].

Meine Wohnung ist [[Größe der Wohnung|klein, aber gemütlich]], weil [[Grund für die Gemütlichkeit|ich sie selbst eingerichtet habe]].

Um Nachbarn kennenzulernen, rate ich, [[Tipp 1|freundlich zu grüßen]], denn [[Grund für den Tipp 1|dann kommen schnell Gespräche zustande]]. Außerdem [[Tipp 2|hilft ein Sportverein]].

Bei mir gibt es [[Neuigkeit|eine neue Hobbygruppe, in der ich mitmache]].

Eine weitere Idee: In vielen Städten gibt es [[Angebot|Sprachcafés, Spieleabende oder Wandergruppen]], bei denen man leicht Leute trifft. Schau am besten [[Suchort|im Internet oder am schwarzen Brett im Supermarkt]] nach. Ich bin sicher, dass du dort nette Menschen kennenlernst.

Seit einigen Wochen habe ich auch [[Neue Aufgabe|einen neuen Kollegen im Team]], der aus deiner Gegend kommt. Wir verstehen uns gut, und ich habe ihm von dir erzählt. Vielleicht kannst du ihn bei deiner Suche nach neuen Kontakten kennenlernen, wenn du magst.

Ich überlege, ob wir gemeinsam [[Idee|ein Wochenende in der Umgebung verbringen]] können, zum Beispiel [[Ausflug|an einem See oder in den Bergen]]. Das wäre ein schöner Anlass, wieder viel zu reden. Dein Arbeitsweg zu Fuß macht dich bestimmt fit für lange Wanderungen.

Schreib mir, [[Frage an den Freund|ob du meine Tipps gut findest]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Naco]],

danke für deine Mail, ich halte mich kurz und beantworte alles.

Wohnung: [[Reaktion auf die Wohnung|Glückwunsch, die Lage klingt perfekt]].

Besuch: Ja, gern. [[Zeitpunkt des Besuchs|Im Frühling]].

Meine Wohnung: [[Größe der Wohnung|Zwei Zimmer, Balkon]].

Tipps zu den Nachbarn: [[Tipp 1|Hallo sagen und sich vorstellen]]. [[Tipp 2|Verein oder Kurs besuchen]].

Neues bei mir: [[Neuigkeit|Ich habe eine neue Stelle]].

Wenn du Kollegen hast, kannst du mit ihnen [[Vorschlag|mittags einen Spaziergang machen oder zusammen essen gehen]]. So entstehen auch Freundschaften außerhalb der Arbeit. Ich habe das bei meiner Firma so gemacht, und [[Ergebnis|heute treffe ich zwei Kollegen jedes Wochenende]].

Eine Sache war in letzter Zeit besonders schön: [[Schönes Erlebnis|Ich habe ein altes Buch wiedergefunden und es noch einmal gelesen]]. Das hat mich an dich erinnert, denn [[Grund|du hast mir es einmal empfohlen]]. Ich bringe es dir bei meinem Besuch mit, wenn du magst.

Eine Sache möchte ich noch klarstellen: Du musst dich nicht schämen, [[Hinweis|dass du manchmal einsam bist]], das passiert vielen Menschen. Wichtig ist, dass du [[Rat|darüber sprichst und Hilfe annimmst]]. Ich bin immer für dich da, auch wenn wir weit auseinander wohnen.

Ich freue mich auf deine Antwort und auf unser Wiedersehen. Gib mir bitte kurz Bescheid, [[Frage an den Freund|wann du Zeit hast]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Naco]],

zu Fuß zur Arbeit, Balkon und Arbeitszimmer, du lebst ja fast wie ein Minister! [[Reaktion auf die Wohnung|Glückwunsch, ich bin ein bisschen neidisch]]. Dass der Umzug müde macht, ist der Preis für den Luxus.

Besuchen? Aber sofort! [[Zeitpunkt des Besuchs|Im Sommer, wenn dein Balkon nicht zu voll ist]].

Meine Wohnung: [[Größe der Wohnung|Ein Zimmer, ein Bad und ein sprechender Kühlschrank]]. Sie [[Besonderheit der Wohnung|ist klein, aber meine]].

Nachbarn kennenlernen: [[Tipp 1|Backe einen Kuchen und klingle bei allen]], danach kennen dich alle. Oder [[Tipp 2|verliere regelmäßig deine Post, dann bringen sie dir sie]].

Neues bei mir: [[Neuigkeit|Ich habe versucht zu kochen, und der Rauchmelder kennt mich jetzt]].

Zum Umzug noch ein Hinweis: Packe zuerst [[Rat zum Umzug|die Dinge aus, die du jeden Tag brauchst]], und lasse den Rest etwas liegen. Dann fühlst du dich schneller wohl. Wenn du magst, helfe ich dir [[Hilfsangebot|beim Streichen oder beim Aufbauen der Regale]], wenn ich komme.

In letzter Zeit habe ich auch gespart: [[Sparziel|Ich möchte im nächsten Jahr eine längere Reise machen]]. Vielleicht kann ich einen Teil davon mit deinem Besuch verbinden und länger bleiben. Dann hätten wir mehr Zeit für die Stadt und unsere Gespräche.

Neben dem Besuch könnten wir auch [[Idee|regelmäßig telefonieren, zum Beispiel am Sonntagabend]]. Das ist ein fester Termin, auf den du dich freuen kannst. Und [[Zusatzidee|wenn du magst, schicke ich dir Fotos von meinem Alltag]], damit du dich nicht allein fühlst.

Schreib bald, [[Frage an den Freund|ob du Sofa oder Luxus-Bett hast]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Naco]],

als ich deine Mail gelesen habe, musste ich an meinen ersten Umzug denken. [[Erinnerung an den eigenen Umzug|Ich war damals auch erschöpft und glücklich zugleich]]. Deine neue Wohnung klingt wunderbar.

Ein Besuch bei dir? [[Zeitpunkt des Besuchs|Ich komme gern im Herbst]]. Ich war lange nicht mehr in deiner Stadt.

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer in einem alten Haus]], und [[Besonderheit der Wohnung|ich habe viele Erinnerungsstücke darin]].

Einsamkeit kenne ich selbst: [[Eigene Erfahrung|Nach meinem Umzug habe ich Monate lang niemanden gekannt]]. Geholfen hat mir, [[Tipp 1|jeden Abend im Hof einen Tee zu trinken]] und [[Tipp 2|in einen Lesekreis zu gehen]].

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Eine Sache möchte ich noch sagen: Ich bewundere, dass du so offen darüber schreibst, wie es dir geht. [[Anerkennung|Das ist nicht selbstverständlich]], und es zeigt, dass du dein Leben aktiv gestaltest. Ich bin sicher, dass es bald besser wird, und [[Wunsch|du wirst viele neue Freunde finden]].

Meine Nachbarn haben mich letzte Woche zu einem Grillabend eingeladen: [[Erlebnis mit den Nachbarn|Es war nett, wir haben viel gelacht und Salate geteilt]]. Seitdem grüßen wir uns jeden Tag. Das zeigt, wie schnell sich ein Kontakt ergeben kann, wenn man offen ist.

Wenn du neue Leute treffen willst, schau doch mal, ob es [[Angebot|in deiner Nähe einen Deutschkurs oder einen Computerkurs]] gibt, den du gern machen möchtest. Dort sitzen oft Menschen in deiner Situation. Ich habe selbst [[Erfahrung|in einem Kurs meine besten Freunde gefunden]].

Erzähl mir, [[Frage an den Freund|wie dir die Stadt gefällt]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Naco]],

danke für deine Mail, und Glückwunsch zur neuen Wohnung! [[Reaktion auf die Wohnung|Ein Balkon und ein Arbeitszimmer, das klingt prima]]. Ich habe gleich mehrere Vorschläge.

Mein erster Vorschlag: Ich besuche dich [[Zeitpunkt des Besuchs|im Juli]], und wir entdecken zusammen die Stadt. Mein zweiter Vorschlag: Du besuchst mich auch, [[Gegenbesuch|damit du meine Wohnung siehst]].

Meine Wohnung hat [[Größe der Wohnung|drei Zimmer]].

Mein dritter Vorschlag für die Nachbarn: [[Tipp 1|Lade zwei oder drei von ihnen zum Kaffee ein]]. Mein vierter Vorschlag: [[Tipp 2|Tritt einer Hausgemeinschaft oder einem Verein bei]].

Bei mir gibt es [[Neuigkeit|eine neue Radtour-Gruppe]].

Bei den Nachbarn kannst du auch einmal [[Idee|einen Zettel an die Haustür hängen, auf dem du dich vorstellst]]. Das ist eine freundliche Geste, und [[Wirkung|viele freuen sich darüber und kommen vorbei]]. Ich habe das in meinem Haus gemacht, und seither grüßen mich alle.

Bei der Arbeit habe ich jetzt [[Arbeitsänderung|mehr Verantwortung und ein größeres Büro]], und das macht mir Freude. Es ist anstrengend, aber ich lerne viel. Ich erzähle dir bei deinem Besuch ausführlich davon und freue mich auf deine Meinung dazu.

Zu den Nachbarn gehört auch der Hausmeister, den du freundlich ansprechen solltest: [[Tipp|Er kennt alle im Haus und kann dir viel erzählen]]. Außerdem [[Zusatztipp|hilft es, kleine Dienste anzubieten, zum Beispiel Blumen gießen]]. So entsteht Vertrauen, und die Leute lernen dich schätzen.

Schreib mir, [[Frage an den Freund|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Naco]],

danke für deine Mail. [[Reaktion auf die Wohnung|Ich freue mich über deine Wohnung, auch wenn der Umzug dich müde gemacht hat]]. Einsamkeit in einer neuen Stadt ist normal, das braucht Zeit.

Einen Besuch finde ich schön, aber ich muss prüfen, ob es klappt. [[Zeitpunkt des Besuchs|Vielleicht im Frühjahr, wenn ich Urlaub bekomme]].

Meine Wohnung ist [[Größe der Wohnung|ziemlich klein]], aber [[Besonderheit der Wohnung|ich fühle mich wohl]].

Bei den Nachbarn bin ich mit meinem Tipp vorsichtig: Einerseits [[Vorteil von Kontakt|hilft Kontakt gegen Einsamkeit]], andererseits [[Nachteil von Kontakt|braucht man Geduld]]. Ich würde [[Tipp 1|zuerst freundlich grüßen]] und später [[Tipp 2|zu einem Kaffee einladen]].

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

Ich würde mich freuen, wenn wir uns bald sehen: [[Wunsch|Wir haben uns so lange nicht getroffen, und ich vermisse unsere Gespräche]]. Bei meinem Besuch bringe ich [[Mitbringsel|etwas Leckeres aus meiner Heimatstadt]] mit. Das gibt uns einen Anlass für ein schönes Essen.

In meiner Freizeit gehe ich gern [[Freizeitaktivität|in ein kleines Kino in der Nähe]], wo man alte Filme sieht. Das ist eine gute Möglichkeit, Leute zu treffen, falls du so etwas auch in deiner Stadt findest. Vielleicht gibt es dort [[Möglichkeit|Filmabende mit Diskussion]].

Ich freue mich auch darauf, mit dir über alte Zeiten zu reden: [[Erinnerung|über die Schulzeit, unsere Reisen und die lustigen Streiche]]. Das wird ein schöner Abend, und vielleicht [[Plan|schauen wir alte Fotos an]]. Ich bringe die Fotos mit, die ich noch habe.

Schreib mir bitte, [[Frage an den Freund|ob dir das hilft]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Naco]],

danke für deine Mail, hier meine Antwort in mehreren Schritten. Als Erstes: [[Reaktion auf die Wohnung|Glückwunsch zur Wohnung]].

Als Nächstes zum Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Frühling]].

Dann zu meiner Wohnung: [[Größe der Wohnung|Zwei Zimmer]].

Dann zu den Nachbarn: Erstens [[Tipp 1|grüßen]], zweitens [[Tipp 2|zum Kaffee einladen]].

Zuletzt zu meinen Neuigkeiten: [[Neuigkeit|Neue Arbeit]].

Dein Satz, dass das Essen in der Stadt lecker ist, hat mich neugierig gemacht: [[Neugier|Welche Spezialität soll ich unbedingt probieren]]? Ich esse gern [[Vorliebe|regionale Gerichte und frisches Brot]]. Vielleicht kochen wir zusammen, wenn ich bei dir bin.

Ich überlege außerdem, [[Plan|im Herbst einen Kurs für Fotografie zu belegen]]. Dort lernt man bestimmt viele Leute kennen, und ich kann dir später Fotos von meinem Besuch bei dir schicken. Vielleicht hast du auch Lust, so etwas zu machen, wenn du magst.

Falls du magst, könnten wir auch beim Besuch [[Idee|dein Arbeitszimmer neu einrichten]], damit du dort noch lieber sitzt. Du hast bestimmt viele Bücher, die einen schönen Platz verdienen. Ich helfe gern, [[Hilfsangebot|ein paar Regale aufzubauen]], wenn du das möchtest.

Ich freue mich sehr auf deine Antwort und auf unser Wiedersehen in deiner neuen Stadt. Wie geht es weiter? Schreib mir, [[Frage an den Freund|wann du Zeit hast]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Naco]],

deine Mail hat mich sehr berührt. [[Reaktion auf die Wohnung|Ich freue mich so für dich und wünsche dir viel Glück]]. Dass du manchmal einsam bist, verstehe ich gut.

Ich besuche dich sehr gern, [[Zeitpunkt des Besuchs|am liebsten im Herbst]], und wir verbringen Zeit zusammen.

Meine Wohnung ist [[Größe der Wohnung|klein und gemütlich]].

Mein Tipp für die Nachbarn: [[Tipp 1|Lächle und sag Hallo, jeder freut sich darüber]]. Und [[Tipp 2|geh in einen Kurs, dort lernt man Menschen kennen]]. Du bist nicht allein.

Bei mir gibt es [[Neuigkeit|ein neues Hobby, das mir Freude macht]].

Noch ein Tipp für den Alltag: Schreib dir auf, [[Aufgabe|an welchem Tag du welche Aktivität machst]], dann bist du abends nicht so oft allein. Das mache ich auch so, und [[Wirkung|es hilft, die Woche zu strukturieren]]. Plane auch kleine Pausen und Treffen mit ein.

Eine kleine Neuigkeit noch: [[Neuigkeit|Ich habe meinen Führerschein gemacht]]. Dadurch bin ich viel flexibler und könnte dich auch mit dem Auto besuchen. Ich wollte dir das schon lange erzählen, aber ich bin nicht dazu gekommen, und nun freue ich mich über die Gelegenheit.

Wenn dich die Stadt zu sehr müde macht, nimm dir [[Rat|jeden Tag zehn Minuten Pause auf dem Balkon]]. Das klingt klein, aber es hilft. Ich mache das auch, und [[Wirkung|danach bin ich viel entspannter]]. Und du hast einen so schönen Balkon, nutze ihn!

Erzähl mir, [[Frage an den Freund|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Naco]],

neue Wohnung, cool! [[Reaktion auf die Wohnung|Klingt gemütlich und praktisch]].

Besuch? Gern! [[Zeitpunkt des Besuchs|Im Sommer]].

Meine Wohnung: [[Größe der Wohnung|klein, aber fein]].

Nachbarn: [[Tipp 1|Einfach Hallo sagen]], [[Tipp 2|Kuchen mitbringen]].

Neues: [[Neuigkeit|Nichts Besonderes]].

Wenn dir die Wohnung noch leer vorkommt, hilft es, [[Wohnidee|Fotos, Pflanzen und Musik zu nutzen]], damit sie wohnlich wird. Meine Wohnung habe ich auch langsam eingerichtet, und [[Erfahrung|nach einem Monat fühlte ich mich schon zu Hause]]. Du schaffst das, da bin ich sicher.

Zuletzt noch etwas Schönes: [[Schönes Ereignis|Ich habe in meiner Straße einen kleinen Flohmarkt entdeckt]], der jeden Sonntag stattfindet. Dort habe ich [[Fund|ein hübsches Bild für meine Wand]] gekauft. Bei deinem Besuch gehen wir gemeinsam hin, wenn du magst.

Zum Schluss: Ich freue mich wirklich auf [[Vorfreude|den Besuch bei dir, das gute Essen und die Gespräche]]. Du bist ein guter Freund, und ich möchte, dass es dir gut geht. Schreib mir bitte regelmäßig, damit ich weiß, [[Bitte|wie es dir in der neuen Wohnung geht]].

Ich freue mich echt auf deinen Besuch und auf alles, was wir zusammen machen können, denn wir haben uns viel zu lange nicht gesehen und hatten bestimmt beide viel zu erzählen. Meld dich, [[Frage an den Freund|wann du Zeit hast]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Lieber [[Name des Freundes|Naco]],

ich danke dir für deine Mail. [[Reaktion auf die Wohnung|Ich freue mich sehr für dich, deine Wohnung klingt wunderbar]]. Danke, dass du mir davon erzählst.

Für deine Einladung zum Besuch bin ich dankbar. [[Zeitpunkt des Besuchs|Ich komme gern im Spätsommer]].

Meine Wohnung ist [[Größe der Wohnung|klein und freundlich]].

Dein Vertrauen, mir von deiner Einsamkeit zu erzählen, schätze ich sehr. Mein Tipp: [[Tipp 1|Sag den Nachbarn freundlich Hallo]], und [[Tipp 2|geh zu Veranstaltungen im Viertel]].

Bei mir gibt es [[Neuigkeit|eine schöne Nachricht aus der Familie]].

Noch ein Wort zu den Menschen in deiner Stadt: [[Beobachtung|Viele Leute sind freundlich, wenn man sie zuerst anspricht]]. Du kannst zum Beispiel [[Tipp|im Bus oder beim Bäcker ein paar Worte wechseln]], das macht den Alltag leichter. Ich habe das ausprobiert, und [[Ergebnis|nach zwei Wochen kannte mich die ganze Straße]].

Auch beruflich bewegt sich etwas: [[Berufliche Neuigkeit|Ich soll im nächsten Jahr ein kleines Team leiten]]. Das freut mich, ist aber auch eine große Aufgabe. Ich werde [[Plan|einen Kurs zur Mitarbeiterführung besuchen]], und ich erzähle dir gern mehr, wenn wir uns sehen oder telefonieren.

Falls du dich einmal ganz allein fühlst, ruf mich einfach an: [[Angebot|Ich habe fast jeden Abend ab acht Uhr Zeit]]. Wir können [[Plan|über alles reden, was dich beschäftigt]]. Das ist kein Problem für mich, denn Freunde sind mir wichtig, auch wenn wir weit voneinander entfernt wohnen.

Danke für alles, schreib mir bald, [[Frage an den Freund|wann du Zeit hast]].

[[Grußformel|Dankbare Grüße]]
[[Dein Name|Nina]]` },
];

// v2 (B2-style): Karla hat sich in Bamberg eingelebt (Altstadt, Rezeptionistin im Hotel "Zur Residenz") und lädt zum Besuch ein. Points: etwas über Ihren Wohnort · etwas über Ihre Wohnung ·
// ob Sie Karla besuchen möchten · eine Frage zu Karlas Arbeit — plus: "Wie geht es dir?", kein Auto/Fahrrad, "wir können endlich mal wieder lange reden".
export const kw = [/Stadt|Wohnort|Dorf|Gegend|wohne|Viertel/i, /Wohnung|Zimmer|Küche|Balkon|Miete/i, /besuch/i, /Arbeit|Job|Hotel|Rezeption|Kunden|Gäste|Arbeitszeit|Kollegen/i, /Bamberg|Altstadt|Fahrrad|Auto/i, /\?/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Karla]],

vielen Dank für deine Mail, ich habe mich sehr gefreut! Mir geht es gut, danke der Nachfrage. Es freut mich, dass du dich in Bamberg schon gut eingelebt hast. [[Reaktion auf die Neuigkeiten|Altstadt und Hotelrezeption klingen nach einem tollen Neuanfang]].

Über meinen Wohnort kann ich dir erzählen: Ich wohne in [[Wohnort|einer mittelgroßen Stadt am Fluss]], und [[Besonderheit des Wohnorts|es gibt viele Parks und eine schöne Fußgängerzone]]. Ein Auto brauche ich auch nicht, weil [[Verkehr|der Bus alle zehn Minuten fährt]].

Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer, eine kleine Küche und einen Balkon]]. Am liebsten mag ich [[Lieblingsplatz|den Platz am Fenster, wo ich morgens Kaffee trinke]].

Dein Angebot, dich zu besuchen, nehme ich gern an. [[Zeitpunkt des Besuchs|Im Frühling habe ich eine Woche Urlaub]], und ich komme gern für ein verlängertes Wochenende.

Zu deiner Arbeit habe ich eine Frage: [[Frage zur Arbeit|Wie sind die Arbeitszeiten an der Rezeption, und was gefällt dir an den Gästen]]?

Bamberg kenne ich nur aus Büchern, deshalb freue ich mich schon sehr auf [[Sehenswürdigkeit 1|den Dom und das alte Rathaus mitten im Fluss]]. Außerdem möchte ich unbedingt [[Spezialität|das berühmte Rauchbier probieren]], falls du mir eine Kneipe zeigst.

Was bei mir sonst passiert: [[Neuigkeit|Ich habe angefangen, Yoga zu machen, und gehe zweimal pro Woche in einen Kurs]]. Vielleicht kannst du mir erzählen, [[Frage|wie du nach einem langen Arbeitstag abschaltest]], denn Stress an der Rezeption ist bestimmt nicht ohne.

Eine Bitte habe ich noch: Sag mir, [[Bitte|welche Tage dir passen, und ob du Frühschicht oder Spätschicht hast]]. Dann kann ich mir die Zugverbindung heraussuchen. Ich möchte nicht, dass du wegen mir extra frei nehmen musst, aber ich würde mich freuen, wenn wir zwei volle Tage haben.

Schreib mir bitte, [[Frage an die Freundin|welcher Termin dir am besten passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Karla]],

schön, von dir zu hören! Bei mir ist alles gut. Bamberg klingt super, [[Reaktion auf die Neuigkeiten|Altstadt, Fahrrad und ein cooler Job im Hotel, das gefällt mir]].

Mein Wohnort? Ich lebe in [[Wohnort|einer Kleinstadt in der Nähe von Köln]], und [[Besonderheit des Wohnorts|hier ist abends nicht viel los, aber es ist ruhig]]. Ein Auto habe ich, aber ich nutze es selten.

Meine Wohnung: [[Größe der Wohnung|ein Zimmer, Bad und eine Mini-Küche]], nichts Großes. Aber [[Besonderheit der Wohnung|der Balkon ist toll]].

Besuch? Klar, gern! [[Zeitpunkt des Besuchs|Ich könnte im Sommer für ein Wochenende kommen]].

Zu deinem Job: [[Frage zur Arbeit|Hast du auch Nachtschichten, und wie viele Sprachen sprichst du an der Rezeption]]?

Zur Anreise: Ich fahre [[Anreise|mit dem Zug, weil ich kein Auto brauche]], und komme [[Ankunftszeit|am Freitagabend gegen 19 Uhr]] am Bahnhof an. Wenn du Zeit hast, holst du mich ab, wenn nicht, finde ich den Weg zu dir auch allein mit [[Orientierung|dem Stadtplan auf meinem Handy]].

Ich habe in letzter Zeit [[Veränderung|viel mit meiner Familie unternommen]], und das hat mich daran erinnert, wie wichtig Menschen sind. Deshalb ist mir dein Besuchsangebot so wichtig. Ich möchte, dass wir Zeit [[Wunsch|ohne Handy und ohne Stress]] zusammen verbringen und uns wirklich unterhalten.

Wenn du Lust hast, machen wir [[Programm|eine kleine Stadtführung, bei der du mir deine Lieblingsplätze zeigst]]. Ich zahle dafür [[Angebot|ein Eis und einen Kaffee]], versprochen. So bekomme ich einen persönlichen Eindruck von deiner neuen Heimat und deinem neuen Leben.

Meld dich, [[Frage an die Freundin|wann es bei dir passt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Karla]],

wow, was für tolle Neuigkeiten! Mir geht es sehr gut, danke. [[Reaktion auf die Neuigkeiten|Bamberg mit Altstadt, Fahrrad und einem Job im Hotel, das klingt wie ein Traum]]. Ich freue mich riesig für dich.

Über meinen Wohnort: Ich wohne in [[Wohnort|einer lebendigen Studentenstadt]], und [[Besonderheit des Wohnorts|es gibt jeden Abend irgendwo Musik]]. Für den Alltag brauche ich [[Verkehr|nur ein Fahrrad und die Straßenbahn]].

Meine Wohnung ist [[Größe der Wohnung|hell, mit zwei Zimmern und einem Erker]], und [[Besonderheit der Wohnung|ich habe viele Pflanzen]].

Dein Angebot, dich zu besuchen, macht mich glücklich! [[Zeitpunkt des Besuchs|Ich komme am liebsten im Herbst]].

Zu deiner Arbeit: [[Frage zur Arbeit|Was war dein schönster Moment mit einem Gast, und gibt es viel Stress]]?

Bei meinem Besuch möchte ich gern [[Wunsch|alles sehen, was dir wichtig ist]]: deinen Arbeitsplatz von außen, dein Lieblingscafé und die kleinen Gassen der Altstadt. Du kannst mir als Rezeptionistin sicher [[Tipp|die besten Tipps für Restaurants und Biergärten]] geben, denn du kennst die Gäste und ihre Wünsche.

Meine Stadt hat auch einiges zu bieten: [[Sehenswürdigkeit|eine alte Burg, einen großen Markt und eine Insel im Fluss]]. Wenn du irgendwann Urlaub hast, zeige ich dir alles. Das ist mein Gegenangebot, denn ich möchte, dass du mich ebenfalls besuchst, wenn du Zeit findest.

Ich bin schon gespannt auf deine Kollegen: [[Neugier|Sind sie nett, und gibt es einen Chef, der dich unterstützt]]? Wenn ich das Hotel von außen sehe, möchte ich gern einen Blick in die Lobby werfen. Aber nur, wenn es dir recht ist und dich nicht stört.

Schreib mir bald, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Karla]],

vielen Dank für deine Nachricht. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, dein Neuanfang: [[Reaktion auf die Neuigkeiten|Ich freue mich, dass du dich gut eingelebt hast]].

Zweitens, mein Wohnort: Ich lebe in [[Wohnort|einer Stadt mit etwa 200.000 Einwohnern]], die [[Besonderheit des Wohnorts|gut mit Bus und Bahn erreichbar ist]].

Drittens, meine Wohnung: Sie hat [[Größe der Wohnung|zwei Zimmer und einen Balkon]].

Viertens, dein Besuchsangebot: Ich komme gern, [[Zeitpunkt des Besuchs|am liebsten im Mai]].

Fünftens, eine Frage zur Arbeit: [[Frage zur Arbeit|Welche Aufgaben hast du an der Rezeption, und wie sind deine Arbeitszeiten]]?

Weil du ohne Auto lebst, bin ich beeindruckt: [[Anerkennung|Fahrrad und Fußwege machen dich bestimmt sehr fit]]. Ich versuche das auch öfter, aber [[Schwierigkeit|bei Regen fällt es mir schwer]]. Vielleicht kannst du mir ein paar Tipps geben, wie du im Alltag zurechtkommst.

Zu deiner Wohnung in der Altstadt habe ich viele Fragen: [[Frage|Wie hoch wohnst du, und gibt es einen Aufzug oder nur eine Treppe]]? Und: [[Frage 2|Hört man nachts die Touristen]]? Ich bin neugierig, weil ich selbst gern in einer lebendigen Gegend wohnen würde.

Bei der Rezeptionsarbeit braucht man viel Geduld und Freundlichkeit: [[Eigenschaft|Das ist bestimmt nicht einfach, wenn Gäste schlecht gelaunt sind]]. Ich bewundere dich dafür. Und wenn du abends müde nach Hause kommst, sollst du dich bei mir erst recht entspannen können, dafür sorge ich.

Bitte teile mir mit, [[Frage an die Freundin|welcher Termin dir passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Karla]],

danke für deine Mail! [[Reaktion auf die Neuigkeiten|Ich freue mich, dass du dich in Bamberg eingelebt hast]].

Zu meinem Wohnort: Ich wohne in [[Wohnort|einer ruhigen Stadt]], und [[Besonderheit des Wohnorts|alles ist gut zu Fuß erreichbar]].

Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer]], und [[Besonderheit der Wohnung|ich habe einiges selbst gebaut]].

Dein Angebot zum Besuch finde ich schön. [[Zeitpunkt des Besuchs|Ich komme gern im Juni]], und ich bringe [[Mitbringsel|eine Spezialität aus meiner Stadt]] mit. Gern buche ich [[Praktische Hilfe|die Bahnfahrkarte schon vorher]].

Zu deiner Arbeit: [[Frage zur Arbeit|Brauchst du für den Hotelkontakt Fremdsprachen, und kann ich dir mit Übersetzungen helfen]]?

Wenn du magst, bringe ich [[Mitbringsel|ein Gesellschaftsspiel und etwas Leckeres von hier]] mit, damit wir abends gemütlich zusammensitzen können. Ich glaube, dass wir viel zu erzählen haben, denn [[Grund|wir haben uns über ein Jahr nicht gesehen]].

Weil du kein Auto brauchst, sparst du viel Geld und Nerven: [[Vorteil|keine Parkplatzsuche, keine Werkstatt, keine Tankstelle]]. Das ist ein großer Vorteil. Ich habe selbst überlegt, [[Überlegung|mein Auto zu verkaufen]], aber bisher habe ich mich nicht getraut.

Dein Hinweis, dass du alles zu Fuß erreichen kannst, hat mich beeindruckt: [[Vorteil|Das ist wie eine Stadt im Miniformat]]. Ich liebe solche Orte, an denen man kurze Wege hat. Wenn ich bei dir bin, möchte ich möglichst viel zu Fuß machen und [[Wunsch|die Fahrräder stehen lassen]].

Ich helfe dir gern, falls du etwas brauchst, und freue mich schon sehr auf unser Wiedersehen. Sag mir bitte, [[Frage an die Freundin|ob ich dir etwas mitbringen soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Karla]],

ich freue mich über deine Mail, denn [[Begründung für die Freude|ich habe lange nichts von dir gehört]]. Dass du dich in Bamberg wohlfühlst, ist ein gutes Zeichen.

Mein Wohnort ist [[Wohnort|eine mittelgroße Stadt]], die ich mag, weil [[Grund für das Mögen|sie zentral liegt und alles bietet]].

Meine Wohnung ist [[Größe der Wohnung|klein, aber praktisch]], weil [[Grund für die Praktik|alles in der Nähe ist]].

Ich besuche dich gern, denn [[Grund für den Besuch|wir haben uns lange nicht gesehen]]. [[Zeitpunkt des Besuchs|Der September wäre ideal]].

Zu deinem Job habe ich eine Frage: [[Frage zur Arbeit|Warum hast du dich für ein Hotel entschieden, und was war dein Traumberuf]]?

Dass du im Hotel arbeitest, interessiert mich besonders, weil [[Interesse|ich selbst gern in einem kleinen Hotel arbeiten würde]]. Vielleicht erklärst du mir, [[Frage|wie man sich als Rezeptionistin bewirbt und welche Sprachen man braucht]]. Das wäre für mich sehr spannend.

Mein Wohnort hat auch Nachteile: [[Nachteil|Im Winter ist es oft neblig und kalt]]. Aber ich habe mich daran gewöhnt, und im Sommer wiegt das alles auf. Vielleicht kommst du einmal im Sommer, wenn [[Vorteil|der Garten blüht und man abends draußen sitzen kann]].

Weil du neu in der Stadt bist, interessiert mich auch, [[Frage|ob du schon Freunde gefunden hast]]. Ich weiß, dass es am Anfang nicht leicht ist. Wenn du magst, kann ich [[Hilfsangebot|ein paar Tipps geben, wie man neue Leute kennenlernt]], denn das habe ich selbst erlebt.

Schreib mir, [[Frage an die Freundin|ob dir der September passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Karla]],

danke für deine Mail, hier kurz meine Antworten.

Neuanfang: [[Reaktion auf die Neuigkeiten|Glückwunsch, Bamberg klingt schön]].

Mein Wohnort: [[Wohnort|Mittelgroße Stadt, gute Verbindungen]].

Meine Wohnung: [[Größe der Wohnung|Zwei Zimmer, Balkon]].

Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Mai]].

Frage zur Arbeit: [[Frage zur Arbeit|Wie viele Stunden arbeitest du pro Woche]]?

Meine Reise nach Bamberg plane ich so: [[Reiseplan|Ich komme am Freitag, bleibe zwei Nächte und fahre am Sonntag wieder zurück]]. Das ist für dich nicht zu lang und nicht zu kurz. Natürlich passe ich mich deinem Dienstplan an, wenn du an dem Wochenende arbeiten musst.

Beim Thema Arbeit bin ich neugierig: [[Neugier|Wie läuft ein normaler Tag bei dir ab, von der Ankunft bis zum Feierabend]]? Ich arbeite selbst [[Mein Beruf|im Büro und sitze fast nur am Computer]], daher klingt dein Job viel lebendiger. Aber auch anstrengender, oder?

Mit dem Hotel „Zur Residenz“ verbinde ich [[Vermutung|schöne alte Möbel, einen Frühstücksraum mit Kronleuchtern und viele Stammgäste]]. Stimmt das ungefähr? Ich habe keine Ahnung, aber ich stelle es mir so vor. Du kannst mir bei meinem Besuch gern alles erzählen.

Ich freue mich auf [[Vorfreude|ein langes Wochenende bei dir]] und auf [[Wunsch|viele gute Gespräche]], denn wir haben uns lange nicht gesehen. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|wann es dir passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Karla]],

Altstadt, Fahrrad und ein Job im Hotel, du lebst ja wie in einem Film! [[Reaktion auf die Neuigkeiten|Glückwunsch, ich bin ein bisschen neidisch, aber vor allem froh für dich]].

Mein Wohnort? [[Wohnort|Eine Stadt, in der man den Bus nur verpasst, wenn man ihn sieht]]. Dafür [[Besonderheit des Wohnorts|gibt es eine Eisdiele, die ich fast täglich besuche]].

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer und ein Kühlschrank mit eigenem Willen]]. [[Besonderheit der Wohnung|Der Balkon ist mein Lieblingsplatz]].

Besuchen? Aber sicher! [[Zeitpunkt des Besuchs|Im Sommer, wenn dein Hotel nicht zu voll ist]].

Zu deiner Arbeit: [[Frage zur Arbeit|Was war der seltsamste Gast, den du je hattest]]?

Falls dein Hotel noch ein günstiges Zimmer frei hat, [[Frage|würde ich vielleicht dort übernachten]], wenn du Mitarbeiterrabatt hast. Ansonsten suche ich mir [[Alternative|eine Pension in der Altstadt]]. Ich möchte dir keine Umstände machen, und ein bisschen Abstand tut manchmal gut.

Falls du am Wochenende arbeiten musst, kann ich auch [[Alternative|an einem Wochentag kommen]], wenn du frei hast. Ich bin da flexibel und passe mich an. Hauptsache, wir haben Zeit für uns und können in Ruhe reden, ohne dass der Dienstplan dazwischenkommt.

Wenn ich dich besuche, möchte ich auch ein Foto von dir an der Rezeption machen, [[Frage|wenn es erlaubt ist]]. Ich möchte es mir daheim an die Wand hängen und an dich denken. Das ist vielleicht ein bisschen sentimental, aber es ist ehrlich gemeint.

Schreib bald, [[Frage an die Freundin|ob du mich in der Altstadt unterbringst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Karla]],

als ich deine Mail gelesen habe, musste ich an unsere gemeinsame Zeit denken. [[Erinnerung an früher|Wir haben damals lange auf deinem Sofa gesessen und gequatscht]]. Schön, dass du dich in Bamberg wohlfühlst.

Mein Wohnort ist [[Wohnort|eine Stadt am Fluss]], in der ich seit drei Jahren lebe, und [[Besonderheit des Wohnorts|ich liebe den Spaziergang am Ufer]].

Meine Wohnung: [[Größe der Wohnung|zwei Zimmer in einem alten Haus]], mit [[Besonderheit der Wohnung|Dielenboden und hohen Fenstern]].

Dein Besuchsangebot nehme ich gern an, [[Zeitpunkt des Besuchs|am liebsten im Herbst]].

Zu deiner Arbeit: [[Frage zur Arbeit|Was machst du, wenn ein Gast sich beschwert]]?

Aus der Ferne habe ich schon etwas über deine Stadt gelesen: [[Wissen über die Stadt|Bamberg gehört zum Weltkulturerbe, und es gibt viele alte Häuser]]. Ich bin gespannt, was davon wahr ist. Vielleicht erzählst du mir mehr, wenn wir zusammen durch die Gassen gehen.

Ich habe mir überlegt, dir [[Geschenk|ein kleines Fotobuch mit Bildern von unseren gemeinsamen Erlebnissen]] mitzubringen. Es soll dich an die alten Zeiten erinnern, wenn du mal Heimweh hast. Ich hoffe, dass du dich freust, und ich zeige es dir gern bei meinem Besuch.

Ich habe schon eine kleine Liste mit Fragen für dich: [[Frage 1|Was ist deine Lieblingsstelle in der Stadt]]? [[Frage 2|Welches Essen sollte ich unbedingt probieren]]? Ich bin gespannt auf deine Antworten und freue mich, dass wir bald wieder miteinander sprechen.

Erzähl mir, [[Frage an die Freundin|wie dein Alltag aussieht]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Karla]],

danke für deine Mail, und Glückwunsch zum Neuanfang! [[Reaktion auf die Neuigkeiten|Bamberg klingt wunderbar]]. Ich habe gleich mehrere Vorschläge.

Mein erster Vorschlag: Ich besuche dich [[Zeitpunkt des Besuchs|im Mai für ein langes Wochenende]]. Mein zweiter Vorschlag: Du besuchst mich auch, [[Gegenbesuch|damit du meine Stadt und meine Wohnung siehst]].

Mein Wohnort ist [[Wohnort|eine ruhige Stadt]]. Meine Wohnung hat [[Größe der Wohnung|zwei Zimmer]].

Mein dritter Vorschlag: Wir machen [[Programmidee|eine Radtour durch die Altstadt und essen Rauchbier-Schinken]]. Mein vierter: [[Zusatzvorschlag|ein gemeinsames Frühstück in deinem Lieblingscafé]].

Zu deiner Arbeit: [[Frage zur Arbeit|Wann hast du frei, damit wir planen können]]?

Ich habe noch eine Idee: Wir könnten an einem Abend [[Programm|in einem Biergarten sitzen und lange erzählen]], so wie früher. Ich lade dich [[Einladung|zu deinem Lieblingsessen ein]], als Dankeschön für die Einladung. Das ist mir wichtig, und ich freue mich darauf.

Das Beste an deinem Angebot ist [[Lieblingsgrund|dass wir endlich wieder lange reden können]]. Am Telefon geht es nicht immer so gut, und ich möchte alles hören: [[Wunsch|von deinen neuen Kollegen, deinen Gästen und deinen Plänen]]. Das wird ein schönes Wochenende werden, da bin ich sicher.

Zum Schluss ein Gedanke: Dein neues Leben in Bamberg klingt [[Eindruck|abwechslungsreich, lebendig und glücklich]]. Ich hoffe, dass es so bleibt. Und wenn dir irgendwann einmal etwas zu viel wird, [[Angebot|ruf mich an, ich bin immer für dich da]]. Das verspreche ich dir.

Schreib mir, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Karla]],

danke für deine Mail. [[Reaktion auf die Neuigkeiten|Ich freue mich, dass du dich in Bamberg eingelebt hast]].

Ich wünsche dir, dass die Arbeit dich nicht zu sehr anstrengt. Mein Wohnort ist [[Wohnort|eine mittelgroße Stadt]], die einerseits [[Vorteil des Wohnorts|gut erreichbar ist]], andererseits [[Nachteil des Wohnorts|etwas teuer]].

Meine Wohnung ist [[Größe der Wohnung|nicht groß]], aber [[Besonderheit der Wohnung|ich fühle mich wohl]].

Ich würde dich gern besuchen, muss aber prüfen, ob es klappt. [[Zeitpunkt des Besuchs|Vielleicht im Frühjahr, wenn ich Urlaub bekomme]].

Zu deiner Arbeit: [[Frage zur Arbeit|Ist die Arbeit nicht zu anstrengend, und hast du genug Pausen]]?

Wenn die Arbeit dich anstrengt, kannst du dich bei meinem Besuch ausruhen: [[Angebot|Ich kümmere mich um das Programm, und du musst nur mitkommen]]. Du bist so lange auf den Beinen, dass ein ruhiger Tag dir guttut. Und ich kann dir [[Hilfsangebot|beim Einkaufen und Kochen helfen]].

Wenn ich komme, bringe ich dir [[Mitbringsel|ein kleines Stück Heimat mit, zum Beispiel unsere Lieblingsschokolade]]. Das ist keine große Sache, aber ich weiß, dass du dich darüber freust. Und ich hoffe, dass du mir im Gegenzug [[Wunsch|ein Stück Bamberger Spezialität einpackst]], wenn ich abreise.

Wenn ich mich in deinem Viertel umsehe, hoffe ich, [[Wunsch|ein nettes kleines Café zu finden, in dem wir lange sitzen können]]. Ich mag kleine Läden und alte Gassen. Wir können dort eine Kleinigkeit essen, und ich lade dich [[Einladung|zum Frühstück ein]], als Dankeschön für die Einladung.

Schreib mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Karla]],

danke für deine Nachricht, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Neuigkeiten|Glückwunsch zum Neuanfang in Bamberg]].

Als Nächstes zu meinem Wohnort: [[Wohnort|Eine mittelgroße Stadt am Fluss]].

Dann zu meiner Wohnung: [[Größe der Wohnung|Zwei Zimmer, Balkon]].

Danach zum Besuch: Ja, gern, [[Zeitpunkt des Besuchs|im Mai]].

Zuletzt zu deiner Arbeit: [[Frage zur Arbeit|Wie ist dein Alltag an der Rezeption]]?

Zu deiner Altstadt: Wohnst du in [[Frage|einem alten Haus mit knarrenden Dielen]] oder in einem neuen Gebäude? Ich liebe alte Häuser und bin neugierig, wie es bei dir aussieht. Auf meinen Besuch freue ich mich auch deshalb, weil [[Grund|ich endlich dein neues Zuhause sehen darf]].

In meiner Wohnung habe ich viele Bilder aufgehängt, die ich auf Reisen gesammelt habe: [[Dekoration|Postkarten, Poster und ein paar kleine Gemälde]]. Wenn du magst, schicke ich dir ein paar Fotos davon. Dann siehst du, wie ich lebe, und ich sehe, wie du lebst, wenn du mir Bilder schickst.

Weil du nach meinem Leben fragst: Es ist gerade [[Beschreibung|ruhig, aber mit vielen kleinen Freuden]]. Ich habe ein neues Hobby und treffe oft Freunde. Aber ich vermisse dich, und deshalb freue ich mich auf das Wochenende bei dir mehr, als ich sagen kann.

Ich freue mich auf [[Vorfreude|ein Wiedersehen in Bamberg]] und auf [[Wunsch|eine schöne gemeinsame Zeit]]. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Karla]],

deine Mail hat mich sehr gefreut. [[Reaktion auf die Neuigkeiten|Es tut gut zu hören, dass du dich in Bamberg wohlfühlst]]. Ich wünsche dir viel Freude an deinem neuen Leben.

Mein Wohnort ist [[Wohnort|eine ruhige Stadt, in der ich mich zu Hause fühle]].

Meine Wohnung ist [[Größe der Wohnung|klein und gemütlich]].

Ich besuche dich sehr gern, [[Zeitpunkt des Besuchs|am liebsten im Sommer]], und freue mich, dir zuzuhören.

Zu deiner Arbeit: [[Frage zur Arbeit|Geht es dir mit der vielen Arbeit gut, und hast du Zeit für dich]]? Ich mache mir manchmal Sorgen.

Ich stelle mir vor, dass wir [[Idee|abends am Fluss spazieren gehen und den Tag ausklingen lassen]]. Das ist für mich die schönste Art, eine Stadt kennenzulernen. Und wenn es regnet, [[Alternative|trinken wir einen heißen Tee in deiner Wohnung]], das ist mindestens genauso gemütlich.

Ich möchte noch erwähnen, dass ich mich sehr freue, dass wir uns nach so langer Zeit wiedersehen: [[Gefühl|Du bist mir wichtig, und ich habe dich vermisst]]. Wenn du Zeit hast, rufe mich gern vorher einmal an. Dann können wir schon einmal ein bisschen plaudern und den Besuch planen.

Falls es bei dir im Hotel gerade stressig ist, [[Angebot|kann ich auch später kommen, wenn die Saison ruhiger wird]]. Ich möchte nicht, dass du dich wegen mir unter Druck setzt. Es reicht mir, wenn wir uns irgendwann sehen, und ich warte gern, wenn es nötig ist.

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit dir]] und auf [[Wunsch|lange Gespräche]]. Erzähl mir, [[Frage an die Freundin|was dich im Moment am meisten freut]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Karla]],

Bamberg, cool! [[Reaktion auf die Neuigkeiten|Klingt gemütlich und der Job im Hotel auch]].

Mein Wohnort: [[Wohnort|Kleinstadt, ruhig]].

Meine Wohnung: [[Größe der Wohnung|klein, aber fein]].

Besuch? [[Zeitpunkt des Besuchs|Gern, im Sommer]].

Dein Job: [[Frage zur Arbeit|Wie ist die Arbeit so, und wie sind die Gäste]]?

Eine praktische Frage noch: Gibt es bei dir [[Frage|einen Waschmaschinenraum oder eine Wäscherei in der Nähe]]? Ich bleibe zwei Nächte und möchte nicht zu viel Gepäck mitbringen. Ich passe mich da ganz nach dir an und bin pflegeleicht, versprochen.

Ach ja, noch eine Frage zum Wetter in Bamberg: [[Frage|Ist es im Mai eher warm oder noch kühl]]? Ich möchte die richtige Kleidung einpacken. Meistens [[Gewohnheit|nehme ich eine leichte Jacke und feste Schuhe mit]], falls wir viel laufen. Das hat sich bisher bewährt.

Danke, dass du mich eingeladen hast: [[Dank|Das bedeutet mir wirklich viel]]. Es ist schön zu wissen, dass es jemanden gibt, [[Gefühl|der sich auch nach langer Zeit freut, mich zu sehen]]. Ich werde es dir mit einem schönen Wochenende danken, da kannst du sicher sein.

Ich freue mich echt auf [[Vorfreude|das Wochenende bei dir]] und hoffe, dass wir [[Wunsch|viel Zeit zum Quatschen haben]], denn es gibt bestimmt viel zu erzählen. Meld dich, [[Frage an die Freundin|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

// v2 (B2-style): Vera hat eine neue Arbeitsstelle, aber einen schwierigen Arbeitsweg (zu weit zu Fuß, Bus alle 30 Minuten, keine Radwege, Sohn Daniel im Kindergarten) und fragt, wie Sie zur Arbeit/zum Deutschkurs kommen. Points: was es bei Ihnen Neues gibt ·
// was Sie zur Arbeit kommen · was Sie über Veras neue Stelle wissen wollen · Vorschlag für eine gemeinsame Unternehmung — plus: "Wie geht es dir und deiner Familie?", "Wollen wir uns mal wiedersehen und alle zusammen etwas unternehmen?"
export const kw = [/Neues|Neuigkeit|erlebt|passiert|in letzter Zeit|bei mir/i, /Bus|Bahn|Fahrrad|Auto|U-Bahn|zu Fuß|fahre|Straßenbahn/i, /Stelle|Arbeit|Firma|Job/i, /vorschlagen|treffen|unternehmen|Kino|Café|Ausflug|Wochenende|Picknick|Park|Vorschlag/i, /Daniel|Familie|Kindergarten/i, /\?/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Vera]],

vielen Dank für deinen Brief, ich habe mich sehr gefreut! Uns geht es gut, auch meiner Familie. Herzlichen Glückwunsch zur neuen Arbeitsstelle! [[Reaktion auf die neue Stelle|Nach der langen Suche hast du das wirklich verdient]]. Ich bin sicher, dass du das gut machst.

Bei mir gibt es folgende Neuigkeit: [[Neuigkeit|Ich habe mit einem Fotokurs angefangen und mache am Wochenende viele Ausflüge]].

Du fragst, wie ich zur Arbeit komme: [[Arbeitsweg|Ich fahre jeden Tag mit der Straßenbahn, das dauert etwa 25 Minuten]]. Das ist bequem, weil [[Grund für das Verkehrsmittel|die Bahn alle zehn Minuten fährt]].

Zu deiner neuen Stelle habe ich eine Frage: [[Frage zur Stelle|Was genau machst du dort, und wie sind deine Arbeitszeiten]]?

Dein Vorschlag, dass wir uns wiedersehen, gefällt mir sehr. Ich schlage vor, [[Gemeinsame Unternehmung|dass wir mit Daniel in den Zoo gehen]].

Zu deinem Arbeitsweg habe ich noch einen Gedanken: Wenn es keine Radwege gibt, [[Idee|könntest du mit der Firma sprechen, ob sie einen Pendlerbus oder ein Jobrad anbietet]]. Viele Firmen helfen heute bei so etwas. Und wenn der Bus nur alle dreißig Minuten fährt, [[Tipp|plane die Zeit so, dass du nie in Hektik gerätst]].

Mich interessiert an deiner neuen Stelle auch noch: [[Frage 1|Wie groß ist die Firma, und gibt es einen Betriebskindergarten]]? Und [[Frage 2|wie lange hast du dich beworben, bis es geklappt hat]]? Ich frage, weil ich selbst manchmal über einen Wechsel nachdenke und gern von deinen Erfahrungen lerne.

Für unser Treffen schlage ich auch einen Plan B vor: [[Regenplan|Falls es regnet, gehen wir ins Kinderkino und danach in ein Café]]. So wird der Tag auf jeden Fall schön. Und ich bringe [[Mitbringsel|ein kleines Spiel für Daniel und die Kinder]] mit, damit niemand sich langweilt.

Schreib mir bitte, [[Frage an die Freundin|welcher Tag dir am besten passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Vera]],

schön, von dir zu hören! Bei uns ist alles gut. Glückwunsch zum neuen Job! [[Reaktion auf die neue Stelle|Endlich hat es geklappt, und die Firma neben dem Kindergarten ist ein Glücksfall]].

Neues bei mir? [[Neuigkeit|Ich habe angefangen zu klettern, und ich bin schon halbwegs fit]]. Sonst läuft alles normal.

Mein Arbeitsweg: [[Arbeitsweg|Ich fahre mit dem Rad, zwanzig Minuten durch den Park]]. Ich weiß, du hast keine Radwege, [[Tipp zum Arbeitsweg|vielleicht hilft dir ein E-Bike oder eine Fahrgemeinschaft]].

Zu deinem neuen Job: [[Frage zur Stelle|Was machst du da genau, und gibt es nette Kollegen]]? Das würde mich interessieren.

Wir sollten uns wirklich mal wieder treffen! [[Gemeinsame Unternehmung|Wie wäre es mit einem Grillnachmittag am See, mit Daniel und allen Kindern]]?

Wegen Daniel noch eine Idee: Du könntest [[Vorschlag|morgens mit ihm zum Kindergarten laufen und dann mit dem Bus weiterfahren]]. So ist alles zeitlich gut verbunden. Vielleicht gibt es auch [[Alternative|Eltern in der Nähe, mit denen du dich bei der Fahrt abwechseln kannst]].

Zur neuen Firma möchte ich gern wissen: [[Frage|Welche Branche ist es, und wie gefällt dir das Team]]? Wenn du magst, erzähl mir auch, [[Frage 2|wie dein erster Tag war]]. Neue Stellen sind immer aufregend, und ich bin neugierig auf alles, was du erlebst.

Wenn ihr Lust habt, könnten wir auch [[Idee|gemeinsam grillen, bei mir im Garten]]. Dann können die Kinder spielen, und wir haben Zeit zum Reden. Ich kümmere mich um [[Aufgabe|Fleisch, Salate und Getränke]], und ihr bringt nur gute Laune mit.

Meld dich, [[Frage an die Freundin|wann es bei dir klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Vera]],

wow, was für eine tolle Nachricht! Mir und meiner Familie geht es sehr gut. Herzlichen Glückwunsch zur neuen Stelle! [[Reaktion auf die neue Stelle|Ich habe mich so für dich gefreut, du hast so lange gesucht]].

Bei mir gibt es tolle Neuigkeiten: [[Neuigkeit|Ich habe eine neue Wohnung gefunden, mit Balkon und Blick auf den Fluss]].

Mein Weg zur Arbeit: [[Arbeitsweg|Ich nehme die U-Bahn, das sind zwanzig Minuten]]. Das ist herrlich, weil [[Grund für das Verkehrsmittel|ich dort lesen kann]].

Zu deiner Stelle habe ich eine Frage: [[Frage zur Stelle|Was ist deine Aufgabe, und was gefällt dir am meisten]]?

Dein Vorschlag, uns zu treffen, ist wunderbar! [[Gemeinsame Unternehmung|Wir könnten gemeinsam einen Ausflug in den Wildpark machen, mit Daniel und meinen Kindern]].

Bei so einem langen Weg hilft ein guter Plan: [[Plan|Stell dir den Wecker zehn Minuten früher und mache am Vorabend schon alles fertig]]. Ich habe das auch so gemacht, als ich einen Job hatte, bei dem ich [[Erfahrung|jeden Tag eine Stunde pendeln musste]]. Es war anstrengend, aber es hat funktioniert.

Ich bin gespannt, wie dein Alltag jetzt aussieht: [[Neugier|Arbeitest du Vollzeit oder Teilzeit, und wie klappt das mit Daniel]]? Ich weiß, dass das eine Herausforderung sein kann, aber ich bin sicher, [[Zuversicht|dass du alles gut organisierst]].

Was meine Familie betrifft: Wir freuen uns auf ein Wiedersehen, [[Gefühl|meine Kinder fragen schon nach Daniel]]. Sie haben euch nicht vergessen. Es wird ein fröhlicher Tag werden, davon bin ich überzeugt, [[Wunsch|mit viel Lachen und Eis]].

Schreib mir bald, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Vera]],

vielen Dank für deinen Brief. Zu deinen Punkten nehme ich der Reihe nach Stellung.

Erstens, deine Stelle: Ich gratuliere dir herzlich. [[Reaktion auf die neue Stelle|Das ist eine gute Nachricht für dich und Daniel]].

Zweitens, meine Neuigkeiten: [[Neuigkeit|Ich bin im Büro befördert worden]].

Drittens, mein Arbeitsweg: [[Arbeitsweg|Ich fahre mit dem Bus, etwa 30 Minuten]].

Viertens, meine Fragen zu deiner Stelle: [[Frage zur Stelle|Welche Aufgaben hast du, und wie lange arbeitest du pro Tag]]?

Fünftens, ein Vorschlag: Ich schlage [[Gemeinsame Unternehmung|einen Ausflug an den See am Samstag vor, mit allen Familien]].

Ergänzend empfehle ich, [[Empfehlung|die Fahrzeiten der Busse genau aufzuschreiben und mit den Arbeitszeiten zu vergleichen]]. Dann siehst du, ob du flexible Zeiten verhandeln kannst. Das ist bei neuen Stellen nicht immer einfach, aber [[Folge|ein höfliches Gespräch mit dem Chef lohnt sich fast immer]].

Weitere Fragen zur Stelle: [[Frage|Wie sind die Pausenzeiten, und gibt es eine Kantine]]? Außerdem [[Frage 2|ob du auch Weiterbildungen machen kannst]]. Das ist wichtig für die Zukunft, und viele Firmen bieten es an.

Ich schlage vor, dass wir den Termin [[Terminvorschlag|am Samstag um 14 Uhr]] machen, weil [[Grund|dann die Kinder nach dem Mittagsschlaf ausgeruht sind]]. Ich reserviere gern [[Reservierung|einen Tisch im Café am Spielplatz]], wenn du einverstanden bist.

Bitte teile mir mit, [[Frage an die Freundin|ob dir der Samstag passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Vera]],

danke für deinen Brief! [[Reaktion auf die neue Stelle|Glückwunsch zur neuen Arbeit, ich helfe dir gern bei dem Arbeitsweg]].

Bei mir gibt es [[Neuigkeit|eine kleine Veränderung, ich habe mein Auto verkauft]].

Mein Arbeitsweg: [[Arbeitsweg|Ich fahre mit dem Fahrrad, eine halbe Stunde]]. Praktische Tipps für dich: [[Tipp 1|Prüfe, ob es einen Fahrradanhänger für Daniel gibt]]. Außerdem [[Tipp 2|frag die Firma nach einem Jobticket]].

Zu deiner Stelle: [[Frage zur Stelle|Gibt es flexible Arbeitszeiten, und bietet die Firma Hilfe für Eltern an]]?

Mein Vorschlag: [[Gemeinsame Unternehmung|Wir treffen uns am Sonntag im Park, die Kinder können spielen]].

Praktisch wäre auch [[Idee|ein Elterntreffen im Kindergarten]], bei dem man Fahrgemeinschaften bilden kann. Ich habe das einmal organisiert, und [[Ergebnis|sechs Familien haben sich beteiligt]]. Das spart Zeit und Geld, und die Kinder lernen sich besser kennen.

Wie ist dein Chef? [[Frage|Ist er freundlich, oder eher streng]]? Das beeinflusst den Alltag stark. Ich habe selbst [[Erfahrung|einmal einen sehr strengen Chef gehabt]] und weiß, wie viel das ausmacht. Hoffentlich hast du Glück gehabt.

Wenn wir uns treffen, hilft es, [[Hinweis|dass wir gleich einen Spielplatz in der Nähe haben]], damit die Kinder sich austoben können. Ich kenne einen schönen Platz, [[Beschreibung|mit Rutsche, Schaukel und einem kleinen Café]]. Das wäre perfekt für uns alle.

Sag mir bitte, [[Frage an die Freundin|ob ich dir noch helfen kann]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Vera]],

ich gratuliere dir zur neuen Stelle, denn [[Begründung für den Glückwunsch|du hast lange gesucht und viel dafür getan]]. Das Problem mit dem Arbeitsweg lässt sich bestimmt lösen.

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Mein Weg zur Arbeit: [[Arbeitsweg|Ich fahre mit der Bahn]], weil [[Grund für die Bahn|ich im Zug entspannen kann]].

Zu deiner Stelle habe ich Fragen, weil [[Grund für die Fragen|ich neugierig bin und dich gut unterstützen möchte]]: [[Frage zur Stelle|Was machst du, und wie viele Kollegen hast du]]?

Als Unternehmung schlage ich [[Gemeinsame Unternehmung|einen Ausflug mit den Kindern an den See]] vor, weil [[Grund für den Vorschlag|Daniel dort gut spielen kann]].

Dass du den Weg zu Fuß nicht schaffst, ist verständlich. Aber vielleicht [[Idee|ist ein Elektroroller eine Lösung]], wenn du ihn im Bus mitnehmen darfst. Das ist natürlich nur ein Gedanke, und ich weiß nicht, ob es [[Einschränkung|Regeln dagegen gibt]]. Du kennst die Lage besser.

Ich würde gern erfahren, [[Frage|ob du neue Kollegen schon kennengelernt hast]]. Kontakte am Arbeitsplatz machen vieles leichter. Und [[Wunsch|vielleicht lerne ich sie auch einmal kennen, wenn wir uns treffen]].

Falls ihr lieber zu mir kommt, bin ich auch damit einverstanden: [[Angebot|Ich koche, und ihr müsst nur kommen]]. Das ist für dich nach der Arbeit bestimmt angenehmer als ein langer Ausflug. Wir können es ruhig angehen und [[Wunsch|viel reden, während die Kinder spielen]].

Schreib mir, [[Frage an die Freundin|ob dir der Vorschlag gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Vera]],

danke für deinen Brief, hier kurz meine Antworten.

Stelle: [[Reaktion auf die neue Stelle|Glückwunsch zur neuen Arbeit]].

Neues: [[Neuigkeit|Neue Stelle]].

Mein Arbeitsweg: [[Arbeitsweg|Straßenbahn, 25 Minuten]].

Frage zur Stelle: [[Frage zur Stelle|Welche Aufgaben hast du]]?

Unternehmung: [[Gemeinsame Unternehmung|Zoo mit Daniel]].

Mich interessiert noch, ob du in der neuen Firma [[Frage|Kolleginnen und Kollegen in deiner Nähe hast]], die auch mit dem Bus kommen. Dann könntet ihr zusammen fahren, und der Weg würde schneller vergehen. Das hat bei mir den Arbeitsweg richtig verändert.

Ich bin neugierig: Was war das Besondere bei deinem Vorstellungsgespräch? [[Frage|Welche Fragen hat man dir gestellt, und was hat den Ausschlag gegeben]]? Das hilft mir, wenn ich einmal wieder eines habe, [[Folge|und ich kann von deiner Erfahrung profitieren]].

Mein Vorschlag ist vielleicht kein großes Abenteuer, aber [[Beschreibung|ein Nachmittag im Park mit Decke und Picknick ist einfach schön]]. Das kostet wenig, und die Kinder lieben es. Ich bringe [[Mitbringsel|Obst, Brote und Saft]] mit, und du kannst etwas zu essen mitbringen.

Ich freue mich sehr auf ein Wiedersehen mit dir und Daniel, auf [[Vorfreude|einen schönen Nachmittag im Zoo]] und darauf, endlich wieder in Ruhe mit dir zu reden. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|wann es dir passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Vera]],

eine Firma direkt neben dem Kindergarten, wer hat sich das ausgedacht? [[Reaktion auf die neue Stelle|Glückwunsch, nur der Bus alle dreißig Minuten ist ein Abenteuer]].

Neues bei mir: [[Neuigkeit|Ich habe versucht, ein Regal aufzubauen, es steht, aber schief]].

Mein Arbeitsweg: [[Arbeitsweg|Ich nehme das Fahrrad und fluche über Schlaglöcher]]. Dein Vorschlag, [[Tipp zum Arbeitsweg|Daniel in einen Anhänger zu setzen, könnte die Lösung sein]].

Zu deiner Stelle: [[Frage zur Stelle|Gibt es Kaffee gratis, und wie ist die Kantine]]?

Unternehmung: [[Gemeinsame Unternehmung|Ein Eis-Nachmittag im Park mit allen Kindern, Eltern dürfen mit]].

Vielleicht ist die Lösung auch ganz einfach: [[Idee|Du ziehst irgendwann näher an die Firma]]. Aber das ist natürlich eine große Entscheidung, die man nicht nebenbei trifft. Ich wollte es nur sagen, [[Folge|falls du ohnehin einen Umzug planst]].

Zu deiner Stelle noch eine Frage: [[Frage|Gibt es die Möglichkeit, ab und zu von zu Hause zu arbeiten]]? Das würde dir den langen Weg erleichtern. Viele Firmen haben so etwas, [[Hinweis|besonders seit der Pandemie]]. Es lohnt sich zu fragen.

Ein weiterer Gedanke: Weil Daniel noch klein ist, [[Hinweis|sollten wir nicht zu viel planen]]. Ein Ausflug mit Pausen ist besser. Ich habe schon überlegt, [[Plan|nach dem Spielplatz Eis zu essen und dann nach Hause zu gehen]]. Das klingt entspannt, oder?

Schreib bald, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Vera]],

als ich deinen Brief gelesen habe, musste ich an unsere Spaziergänge mit den Kindern denken. [[Erinnerung an früher|Daniel war damals noch ein Baby]]. Glückwunsch zur neuen Stelle!

Bei mir gibt es [[Neuigkeit|eine Veränderung im Beruf]].

Mein Arbeitsweg: [[Arbeitsweg|Ich laufe zu Fuß, zwanzig Minuten durch die Stadt]]. Das ist angenehm, [[Folge|ich komme ausgeruht an]].

Zu deiner Stelle: [[Frage zur Stelle|Was gefällt dir an der Firma, und wie sind die Kollegen]]?

Mein Vorschlag: [[Gemeinsame Unternehmung|Ein Wochenende mit Spaziergang und Kaffee in unserem alten Café]].

Ich erinnere mich, dass du immer gern Fahrrad gefahren bist: [[Erinnerung|Du bist früher sogar bei Regen gefahren]]. Vielleicht gibt es doch einen Weg, [[Idee|über Seitenstraßen oder Parks ohne Radwege auszuweichen]]. Frag doch in der Nachbarschaft, die kennen die besten Strecken.

Als wir uns zuletzt gesehen haben, hast du erzählt, [[Erinnerung|dass du dir eine Stelle mit festen Zeiten wünschst]]. Ist das jetzt der Fall? Ich frage, weil das für dich und Daniel sehr wichtig ist, [[Folge|und ich hoffe, dass es so ist]].

Weißt du noch, wie wir früher einmal [[Erinnerung|einen ganzen Tag am Fluss verbracht haben]]? Das war einer meiner schönsten Tage. Vielleicht können wir das wiederholen, [[Idee|mit den Kindern und viel Obst]]. Es wäre schön, die Tradition fortzusetzen.

Erzähl mir, [[Frage an die Freundin|wie es euch geht]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Vera]],

danke für deinen Brief und Glückwunsch zur neuen Stelle! [[Reaktion auf die neue Stelle|Das ist toll]]. Ich habe gleich mehrere Vorschläge.

Zum Arbeitsweg: Mein erster Vorschlag: [[Vorschlag 1|Frag Kollegen nach einer Fahrgemeinschaft]]. Mein zweiter: [[Vorschlag 2|Prüfe, ob es einen Shuttle-Bus der Firma gibt]].

Mein Arbeitsweg: [[Arbeitsweg|Straßenbahn, 25 Minuten]]. Bei mir gibt es [[Neuigkeit|eine neue Hobbygruppe]].

Frage zu deiner Stelle: [[Frage zur Stelle|Wie viele Stunden arbeitest du]]?

Mein dritter Vorschlag: [[Gemeinsame Unternehmung|Wir treffen uns am Samstag im Zoo]].

Mein dritter Vorschlag zum Arbeitsweg: [[Vorschlag|Kauf dir ein Monatsticket, wenn sich der Bus für dich lohnt]]. Das ist oft billiger als Einzelfahrten. Mein vierter: [[Vorschlag 2|Frag bei der Stadt nach, ob eine zusätzliche Buslinie geplant ist]].

Mein fünfter Vorschlag zum Thema Arbeit: [[Vorschlag|Mach dir eine kleine Notiz mit allen Fragen, die du im Büro stellen möchtest]]. Am Anfang vergisst man vieles. Und ich frage dich auch gern später, [[Frage|wie es dir nach drei Monaten geht]].

Mein vierter Vorschlag für die Unternehmung: [[Vorschlag|Wir fahren zusammen mit der Bahn zu einem Ausflugsziel]], dann ist auch dein Arbeitsweg kein Thema. Mein fünfter: [[Vorschlag 2|Wir bleiben in der Stadt und machen eine kleine Entdeckungstour]].

Was hältst du davon? Grüß Daniel von mir. Schreib mir, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Vera]],

danke für deinen Brief. [[Reaktion auf die neue Stelle|Ich freue mich über die neue Stelle, auch wenn der Weg ein Problem ist]].

Bei mir [[Neuigkeit|hat sich nicht viel verändert]].

Mein Arbeitsweg: Einerseits [[Vorteil des Arbeitswegs|fahre ich bequem mit der Bahn]], andererseits [[Nachteil des Arbeitswegs|brauche ich lange]].

Zu deiner Stelle: [[Frage zur Stelle|Ist die Arbeit nicht zu anstrengend mit Daniel]]?

Ich würde mich über ein Treffen freuen, [[Gemeinsame Unternehmung|vielleicht ein ruhiger Nachmittag im Park]].

Ich möchte nicht zu viel raten, aber vielleicht [[Idee|reicht schon eine kleine Verbesserung, zum Beispiel ein früherer Bus]]. Es kann sein, dass die Stadtwerke Verbesserungen für Berufstätige planen. Ein Anruf kostet nichts, [[Folge|und du erfährst vielleicht Neues]].

Ich würde gern wissen, [[Frage|ob du dich in der Firma schon eingelebt hast]]. Das braucht manchmal Zeit, und ich verstehe, wenn du noch unsicher bist. Wichtig ist, dass du dich wohlfühlst, [[Wunsch|und ich hoffe, dass das bald der Fall ist]].

Falls es Terminprobleme gibt, bin ich flexibel: [[Alternative|Wir können uns auch an einem Sonntag treffen]], wenn dir das lieber ist. Oder [[Alternative 2|an einem Abend unter der Woche für ein Abendessen]]. Hauptsache, wir sehen uns bald, und ich verspreche, mich anzupassen.

Schreib mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Vera]],

danke für deinen Brief, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die neue Stelle|Glückwunsch zur neuen Stelle]].

Als Nächstes zu den Neuigkeiten bei mir: [[Neuigkeit|Neue Aufgabe]].

Dann zum Arbeitsweg: [[Arbeitsweg|Straßenbahn]].

Danach zu deiner Stelle: [[Frage zur Stelle|Was machst du dort]]?

Zuletzt zu deiner Idee: [[Gemeinsame Unternehmung|Ein Ausflug mit den Kindern]].

Zum Schluss ein Schritt: [[Schritt|Sprich mit dem Personalbüro über deine Situation]]. Viele Firmen haben Lösungen, von Homeoffice-Tagen bis zu angepassten Arbeitszeiten. Das macht dir das Leben leichter, und [[Folge|die Firma gewinnt eine zufriedene Mitarbeiterin]].

Als dritten Schritt interessiert mich: [[Frage|Welche Aufgaben sind dir am liebsten, und welche eher nicht]]? So kann ich mir ein Bild von deinem Alltag machen. Und ich kann dir vielleicht sogar Tipps geben, [[Angebot|wenn du Schwierigkeiten hast]].

Als letzten Schritt schlage ich vor, [[Schritt|dass wir uns telefonisch noch einmal abstimmen]], sobald du deinen Dienstplan kennst. Dann können wir den Termin festlegen und alles planen. Ich rufe dich gern an, [[Angebot|am Abend, wenn Daniel schläft]].

Ich freue mich sehr auf unser Treffen und auf Daniel, und ich hoffe, dass wir bald einen Termin finden, der für alle passt, damit wir uns in Ruhe unterhalten können. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|wann du Zeit hast]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Vera]],

dein Brief hat mich sehr gefreut. [[Reaktion auf die neue Stelle|Ich freue mich so für dich, du hast hart gearbeitet]]. Dass der Arbeitsweg schwierig ist, tut mir leid, aber es lässt sich bestimmt lösen.

Bei mir gibt es [[Neuigkeit|ein neues Hobby, das mir Freude macht]].

Mein Arbeitsweg: [[Arbeitsweg|Ich fahre mit der Bahn]].

Zu deiner Stelle: [[Frage zur Stelle|Fühlst du dich wohl, und sind die Kollegen nett zu dir]]?

Dein Vorschlag, uns zu treffen, rührt mich. [[Gemeinsame Unternehmung|Ein gemütlicher Nachmittag mit Kuchen und Spielen für die Kinder]].

Ich weiß, dass das für dich eine stressige Zeit ist: [[Mitgefühl|Neue Stelle, kleines Kind und ein langer Weg]]. Aber du schaffst das, weil [[Eigenschaft|du organisiert und stark bist]]. Wenn du mal Hilfe brauchst, [[Angebot|ruf mich an, ich bin immer für dich da]].

Ich möchte gern mehr über dich und deine Arbeit hören: [[Frage|Wie fühlst du dich, wenn du abends nach Hause kommst]]? Bist du müde oder zufrieden? Ich mache mir manchmal Sorgen, [[Sorge|dass du dich überforderst]], deshalb frage ich.

Ich möchte, dass du dich wohlfühlst: [[Wunsch|kein Stress, keine große Planung, nur Zeit zusammen]]. Das ist mir wichtig, weil du gerade so viel schaffst. Ich bin sicher, dass ein ruhiger Tag dir und Daniel guttut, [[Folge|und uns allen]].

Erzähl mir, [[Frage an die Freundin|wie ich dich unterstützen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Vera]],

Glückwunsch zum Job! [[Reaktion auf die neue Stelle|Endlich]].

Neues: [[Neuigkeit|Nichts Besonderes]].

Arbeitsweg: [[Arbeitsweg|Bahn, passt]].

Dein Job: [[Frage zur Stelle|Was machst du, und wie sind die Kollegen]]?

Treffen? [[Gemeinsame Unternehmung|Gern, am Wochenende im Park]].

Noch ein schneller Tipp: [[Tipp|Fahr eine Woche lang mit dem Bus und notiere, wie lange alles wirklich dauert]]. Dann hast du Zahlen für ein Gespräch. Und vielleicht [[Folge|ist es gar nicht so schlimm, wie du jetzt denkst]].

Eine schnelle Frage: [[Frage|Was ist das Beste an deiner neuen Stelle]]? Und [[Frage 2|was nervt dich am meisten]]? Ich bin neugierig und freue mich, wenn du mir ehrlich antwortest. Dann können wir beim Treffen darüber reden.

Ich habe auch noch eine kleine Überraschung: [[Überraschung|Ich bringe für Daniel ein kleines Geschenk zum Start deines Jobs mit]]. Es ist nichts Großes, aber ich freue mich schon darauf, [[Wunsch|sein Gesicht zu sehen]]. Und für dich habe ich auch etwas, das bleibt aber geheim.

Ich freue mich echt auf ein Wiedersehen mit dir und Daniel und hoffe, dass wir bald einen schönen Tag zusammen verbringen, denn es gibt bestimmt viel zu erzählen. Wenn der Arbeitsweg zu anstrengend ist, ruf einfach an, ich höre gern zu. Meld dich, [[Frage an die Freundin|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

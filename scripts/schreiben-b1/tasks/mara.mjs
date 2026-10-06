// v2 (B2-style): Mara will mit ihrem neuen Freund eine Autoreise machen und dich treffen. Points: warum Sie so lange nicht geschrieben haben · Reaktion auf Maras neuen Freund ·
// ein Vorschlag zur Übernachtung (Hotel, Homestay …) · ein Vorschlag für ein Treffen, oder warum es nicht geht — plus: "Idee, wo wir uns treffen", "schönes Hotel in der Nähe".
export const kw = [/geschrieben|gemeldet|leider|Entschuldig|tut mir leid|viel zu tun|Funkstille/i, /Freund/, /Hotel|übernacht|Homestay|Gästezimmer|Pension|schlafen|Zimmer|Wohnung|Campingplatz/i, /treff/i, /Urlaub|Reise|Auto/i, /vorstell|kennenlern|gratul|freu/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Mara]],

vielen Dank für deine Mail, ich habe mich riesig gefreut! Du hast recht, ich habe lange nicht geschrieben, und das tut mir sehr leid. [[Grund für die Pause|Ich hatte in den letzten Wochen viel Arbeit und kaum Zeit für private Briefe]].

Dass du einen neuen Freund hast, freut mich wirklich. [[Reaktion auf den neuen Freund|Du klingst so glücklich, und ich bin schon gespannt, ihn kennenzulernen]]. Er muss ein besonderer Mensch sein.

Zur Übernachtung habe ich einen Vorschlag: Ich empfehle euch [[Unterkunft|ein kleines Hotel in der Altstadt, nur zehn Minuten von meiner Wohnung entfernt]]. Es ist [[Eigenschaft des Hotels|gemütlich, günstig und hat ein gutes Frühstück]].

Für unser Treffen schlage ich vor, dass wir uns [[Treffpunkt|am Samstagabend in einem Restaurant am Marktplatz]] treffen. Danach können wir [[Programm nach dem Essen|noch einen Spaziergang am Fluss machen]].

Ich freue mich sehr auf eure Autoreise und auf das Wiedersehen mit dir. Wenn ihr länger bleiben wollt, [[Weiteres Angebot|zeige ich euch gern die Stadt]].

Für eure Autoreise habe ich noch einen Tipp: Es gibt bei mir [[Parkmöglichkeit|einen großen Parkplatz hinter dem Hotel]], damit ihr nicht lange suchen müsst. Und wenn ihr aus dem Süden kommt, lohnt sich [[Zwischenstopp|ein Halt an einem schönen See auf halbem Weg]]. Da könnt ihr euch die Beine vertreten.

Weißt du, ich habe dich in letzter Zeit sehr vermisst, und ich freue mich, dass unser Treffen jetzt wirklich klappt. [[Wunsch an den Abend|Wir haben so viel nachzuholen, dass eine Nacht kaum reicht]]. Dein Freund soll sich bei uns [[Wunsch für den Freund|sofort wie zu Hause fühlen]].

Schreib mir bitte, [[Frage an die Freundin|an welchem Tag ihr ungefähr ankommt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hallo [[Name der Freundin|Mara]],

oh je, du hast recht, ich habe leider lange nicht geschrieben und war total abgetaucht! Sorry. [[Grund für die Pause|Ich hatte einen Haufen Arbeit und danach keine Lust mehr auf den Computer]]. Schön, dass du dich meldest.

Du hast einen neuen Freund? Wie toll! [[Reaktion auf den neuen Freund|Ich will alles wissen, wie ihr euch kennengelernt habt und wie er ist]].

Hotel? Ganz in meiner Nähe gibt es [[Unterkunft|eine kleine Pension mit netten Zimmern und Garten]]. Sie ist [[Eigenschaft der Pension|günstig, und die Besitzerin ist total freundlich]]. Alternativ [[Alternative zur Pension|könnt ihr auch bei mir auf dem Sofa schlafen]].

Treffen? Unbedingt! Ich würde sagen, wir [[Treffpunkt|gehen abends in mein Lieblingscafé und quatschen]]. Danach [[Programm nach dem Essen|zeige ich euch die Stadt bei Nacht]].

Eine Autoreise ist eine super Idee. Freut mich, euch zu sehen!

Außerdem möchte ich euch gern etwas von meiner Stadt zeigen: [[Sehenswürdigkeit|den Dom, den alten Markt und den Park am Fluss]]. Das schaffen wir an einem Nachmittag, und danach [[Abschluss|trinken wir einen Kaffee in meiner Lieblingsbäckerei]]. Ich bin sicher, dass euch das gefällt.

Ich bin schon gespannt, wie dein Freund aussieht und was er arbeitet: [[Neugier|ob er auch gern wandert, tanzt oder kocht]]. Bei unserem Treffen möchte ich [[Wunsch|viel über euch beide erfahren]]. Dann können wir bestimmt schnell Freunde werden.

Melde dich, [[Frage an die Freundin|wann genau ihr kommt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Mara]],

wow, was für eine tolle Nachricht! Es tut mir wirklich leid, dass ich mich so lange nicht gemeldet habe. [[Grund für die Pause|Die letzten Wochen waren so stressig, dass ich kaum zum Atmen kam]]. Umso mehr freue ich mich über deine Mail.

Du hast einen neuen Freund, das ist wunderbar! [[Reaktion auf den neuen Freund|Ich freue mich riesig für dich und kann es kaum erwarten, ihn zu treffen]].

Für die Übernachtung kann ich euch [[Unterkunft|ein wunderschönes Hotel am See]] empfehlen. Es hat [[Eigenschaft des Hotels|große Zimmer, einen Pool und ein tolles Frühstück]]. Das wird euch gefallen.

Mein Vorschlag für das Treffen: Wir verabreden uns [[Treffpunkt|an einem Sonntagnachmittag in einem Biergarten]], und danach [[Programm nach dem Essen|machen wir eine Bootsfahrt auf dem See]].

Eure Autoreise klingt nach einem Abenteuer! Ich freue mich so auf euch beide.

Ich überlege schon, was ich euch kochen könnte: Vielleicht [[Gericht|ein einfaches Gericht aus meiner Heimat mit Reis und Gemüse]]. Wenn ihr etwas nicht esst, [[Frage zum Essen|sagt es mir einfach vorher]]. Zum Nachtisch [[Dessert|gibt es etwas Süßes]], das ich selbst backe.

Wenn ihr zwei Tage Zeit habt, schlage ich vor, [[Zeitvorschlag|dass wir den Samstag für die Stadt und den Sonntag für die Natur nehmen]]. Dann habt ihr beides, und niemand muss hetzen. Ich plane auch [[Pause|genug Zeit zum Ausruhen und Quatschen]] ein.

Schreib mir bald, [[Frage an die Freundin|wo ihr unterwegs noch Halt macht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Mara]],

vielen Dank für deine Nachricht. Zu deinen Fragen nehme ich der Reihe nach Stellung.

Erstens, die Pause: Es stimmt, dass ich länger nicht geschrieben habe. [[Grund für die Pause|Ich hatte beruflich viel zu tun und wenig Freizeit]]. Das tut mir leid.

Zweitens, dein neuer Freund: [[Reaktion auf den neuen Freund|Ich freue mich sehr für dich und möchte ihn gern kennenlernen]].

Drittens, die Übernachtung: Ich empfehle [[Unterkunft|ein Hotel in der Innenstadt, das zentral und preiswert ist]]. Es gibt [[Eigenschaft des Hotels|Einzel- und Doppelzimmer mit Frühstück]].

Viertens, das Treffen: Ich schlage vor, uns [[Treffpunkt|am Freitagabend im Restaurant am Bahnhof]] zu treffen. Danach [[Programm nach dem Essen|können wir einen kurzen Rundgang machen]].

Zur Zeit habe ich noch ein kleines Anliegen: [[Wunsch|Bringt bitte ein paar Fotos von eurer Reise mit]], damit ich sehe, wo ihr überall wart. Ich freue mich auch darauf, [[Neugier|deinen Freund beim Erzählen zu erleben]]. Das ist für mich die beste Art, jemanden kennenzulernen.

Vielleicht möchtet ihr auch einmal [[Besonderes Erlebnis|bei mir zu Hause die Spezialitäten meiner Heimat probieren]], bevor ihr weiterfahrt. Ich zeige euch [[Besonderheit|meine Lieblingsorte, die kein Reiseführer kennt]]. Das ist meine Art, Gäste zu begrüßen.

Ich freue mich sehr auf [[Vorfreude|ein Wiedersehen nach so langer Zeit]]. Bitte teile mir mit, [[Frage an die Freundin|an welchem Tag ihr bei mir vorbeikommt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Mara]],

danke für deine Mail! Entschuldige, dass ich so lange nicht geschrieben habe. [[Grund für die Pause|Ich hatte eine stressige Zeit und war oft unterwegs]]. Dafür helfe ich euch jetzt gern bei der Planung der Reise.

Dein neuer Freund interessiert mich sehr. [[Reaktion auf den neuen Freund|Ich freue mich für euch beide und hoffe, dass wir uns gut verstehen]].

Bei der Übernachtung kann ich helfen: Ich habe [[Unterkunft|ein Hotel mit Parkplatz für euer Auto]] gefunden. Es liegt [[Lage des Hotels|nur zehn Minuten von mir entfernt]]. Ich kann [[Praktische Hilfe|das Zimmer für euch reservieren]], wenn ihr möchtet.

Für ein Treffen schlage ich vor, [[Treffpunkt|dass wir uns am Samstagmittag im Café neben dem Hotel treffen]]. Danach [[Programm nach dem Essen|zeige ich euch die Stadt mit dem Auto]].

Wenn ihr Hilfe bei der Reiseplanung braucht, melde ich mich gern: Ich kenne [[Wissen|die Straßen und Staus in unserer Gegend sehr gut]], und ich kann [[Hilfe|euch eine Route ohne Baustellen heraussuchen]]. Das spart euch bestimmt Zeit und Nerven.

Wenn ihr mit dem Auto unterwegs seid, bleibt am besten [[Reisetipp|nicht länger als vier Stunden am Stück im Auto]], denn [[Grund|das ist anstrengend und gefährlich]]. Ich mache mir immer Sorgen, wenn Freunde lange fahren, deshalb meldet euch bitte [[Bitte|kurz, wenn ihr angekommen seid]].

Sagt mir bitte, [[Frage an die Freundin|ob ich noch etwas vorbereiten soll]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Mara]],

ich habe lange nicht geschrieben, weil [[Grund für die Pause|ich bei der Arbeit sehr beschäftigt war und abends müde war]]. Das tut mir leid. Dafür freue ich mich jetzt über deine Mail.

Dass du einen neuen Freund hast, finde ich gut, denn [[Begründung für die Freude|du hast schon lange jemanden gesucht, der zu dir passt]]. Ich möchte ihn bald kennenlernen.

Bei der Übernachtung empfehle ich [[Unterkunft|ein kleines Hotel in meiner Nähe]], weil [[Grund für das Hotel|es günstig ist und ihr euch dort wohlfühlt]]. Ein Homestay [[Einschränkung beim Homestay|wäre bei mir leider nicht möglich, weil mein Zimmer sehr klein ist]].

Als Treffen schlage ich [[Treffpunkt|ein gemeinsames Abendessen]] vor, denn [[Grund für das Treffen|dabei können wir in Ruhe reden und uns kennenlernen]].

Ein Gedanke noch zur Reise: Weil ihr mit dem Auto kommt, [[Hinweis|achtet bitte auf den Berufsverkehr am Freitagnachmittag]]. Am besten fahrt ihr [[Reisetipp|vormittags los oder erst am Abend]]. Dann seid ihr entspannter, wenn ihr bei mir ankommt.

Ihr beide werdet meine Gäste sein, und deshalb möchte ich [[Wunsch|ein kleines Willkommensfest für euch geben]]. Ich lade [[Weitere Gäste|zwei oder drei gemeinsame Freunde]] ein, damit der Abend noch schöner wird. Natürlich nur, wenn ihr das möchtet.

Schreib mir, [[Frage an die Freundin|ob dir mein Vorschlag gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Mara]],

danke für deine Mail, ich antworte dir kurz und der Reihe nach.

Pause: Entschuldige, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Ich hatte viel zu tun]].

Dein Freund: [[Reaktion auf den neuen Freund|Ich freue mich für dich und freue mich auf das Kennenlernen]].

Übernachtung: [[Unterkunft|Hotel am Marktplatz]], [[Eigenschaft des Hotels|günstig und sauber]].

Treffen: [[Treffpunkt|Samstagabend im Restaurant am Fluss]].

Wenn das Wetter schön ist, könnten wir [[Ausflugsidee|ein Picknick im Park machen]], und ich bringe [[Mitbringsel|eine Decke und kalte Getränke]] mit. Falls es regnet, haben wir [[Regenplan|das Museum und das Kino]] als Alternative. So ist für jedes Wetter gesorgt.

Zu eurer Reise fällt mir noch ein: [[Reisetipp|Nehmt unterwegs auch kleine Straßen, nicht nur die Autobahn]], dann seht ihr mehr vom Land. Ich kann euch [[Empfehlung|ein paar schöne Dörfer auf der Strecke nennen]]. Das wäre ein schöner Umweg für einen Urlaub.

Ich habe in den letzten Wochen oft an dich gedacht und mich gefragt, wie es dir geht, und ich freue mich, dass du wieder von dir hören lässt. Euer Besuch ist für mich [[Bedeutung des Besuchs|eine schöne Abwechslung im Alltag]]. Ich freue mich sehr auf eure Reise und auf einen schönen gemeinsamen Abend mit euch beiden. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|wann ihr ankommt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Mara]],

du fragst, warum ich so lange nicht geschrieben habe? Gute Frage! [[Grund für die Pause|Ich war so beschäftigt, dass ich fast vergessen hätte, wie man Briefe schreibt]]. Verzeih mir bitte.

Du hast einen neuen Freund, und ich erfahre es erst jetzt? [[Reaktion auf den neuen Freund|Ich bin gespannt, ob er so nett ist, wie du schreibst]].

Übernachten könnt ihr [[Unterkunft|in einem Hotel mit dem besten Frühstücksbuffet der Stadt]]. Das ist [[Eigenschaft des Hotels|so gut, dass ihr nie wieder abreisen wollt]]. Ein Homestay bei mir wäre zu laut, denn [[Einschränkung beim Homestay|mein Nachbar übt Trompete]].

Treffen wir uns doch [[Treffpunkt|an einem Abend in meiner Lieblingspizzeria]], damit ich deinen Freund gleich auf Herz und Pizza prüfen kann.

Ich freue mich besonders darauf, dass wir uns nach so langer Zeit wiedersehen: [[Gefühl|Ich habe dich wirklich vermisst]]. Und dein Freund ist willkommen, [[Einladung|auch wenn er etwas schüchtern ist]]. Bei mir gibt es keinen Stress, nur gute Gespräche.

Weil du mich nach einem schönen Hotel gefragt hast, habe ich zwei Möglichkeiten: [[Möglichkeit 1|ein Hotel am Fluss mit Frühstück]] oder [[Möglichkeit 2|eine Pension mitten in der Altstadt]]. Beide sind ruhig und gut. Sag mir, welche Art euch lieber ist.

Ich freue mich auf [[Vorfreude|ein langes Wochenende voller Lachen]]. Schreib bald, [[Frage an die Freundin|wann ihr die Hauptstadt erreicht]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Mara]],

als ich deine Mail gelesen habe, musste ich an unsere letzte Reise denken. [[Erinnerung an die gemeinsame Zeit|Wir haben damals im Auto gesungen und uns tausendmal verfahren]]. Dass wir uns so lange nicht gesehen haben, tut mir leid.

Warum ich nicht geschrieben habe? [[Grund für die Pause|Ich war ein paar Wochen krank und danach mit Nachholen beschäftigt]]. Jetzt geht es mir wieder gut.

Dass du einen neuen Freund hast, freut mich. [[Reaktion auf den neuen Freund|Ich habe sofort gedacht, dass es endlich jemand Passendes ist]].

Für die Übernachtung kenne ich [[Unterkunft|ein Hotel mit Garten]], in dem [[Erinnerung an das Hotel|meine Eltern früher oft Gäste untergebracht haben]]. Es liegt in meiner Nähe.

Wir können uns [[Treffpunkt|an einem Nachmittag im Café treffen, wo wir früher oft saßen]].

Falls ihr länger bleiben möchtet, sagt mir bitte Bescheid: Ich habe [[Verfügbarkeit|am Montag und Dienstag frei]], und wir könnten [[Programm|einen Ausflug in die Berge machen]]. Dann hättet ihr noch mehr von eurem Urlaub, und ich eine Gelegenheit, euch besser kennenzulernen.

Ich möchte euch auch von meinem Leben erzählen: [[Thema|von meiner Arbeit, meinen Plänen und meinen Hobbys]]. Außerdem [[Weiteres Thema|habe ich viele Fotos aus dieser Zeit, die ich euch zeigen möchte]]. Ich glaube, wir haben viel Spaß zusammen.

Ich freue mich auf [[Vorfreude|ein Wiedersehen mit euch beiden]]. Erzähl mir, [[Frage an die Freundin|wo ihr schon überall wart]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Mara]],

danke für deine Mail, und entschuldige meine lange Pause. [[Grund für die Pause|Ich hatte viel Arbeit]]. Ich habe gleich mehrere Vorschläge für euer Treffen.

Zuerst zu deinem Freund: [[Reaktion auf den neuen Freund|Ich freue mich, dass du jemanden gefunden hast]]. Mein erster Vorschlag: Ihr kommt [[Zeitpunkt des Besuchs|am Wochenende]], dann habe ich Zeit.

Mein zweiter Vorschlag betrifft die Übernachtung: [[Unterkunft|Ein Hotel in der Nähe des Bahnhofs]] ist praktisch und [[Eigenschaft des Hotels|hat einen eigenen Parkplatz]]. Mein dritter Vorschlag: Falls ihr lieber privat schlafen möchtet, [[Alternative Unterkunft|frage ich meine Nachbarn nach einem Gästezimmer]].

Mein vierter Vorschlag: Wir treffen uns [[Treffpunkt|zum Abendessen in einem schönen Lokal]].

Zur Planung noch eine praktische Sache: Schickt mir [[Information|eure Handynummern und die ungefähre Ankunftszeit]], dann kann ich euch am Hotel begrüßen. Ich werde [[Begrüßung|mit einem kleinen Willkommensgeschenk da sein]]. Das ist nicht viel, aber es kommt von Herzen.

Bei der Gelegenheit könnten wir [[Idee|einen gemeinsamen Ausflug in die Natur machen]], wenn ihr Lust habt. Mein Auto ist leider [[Einschränkung|in der Werkstatt]], aber [[Alternative|wir fahren mit dem Bus oder mit eurem Wagen]]. Ihr seht also, ich habe an alles gedacht.

Was haltet ihr davon? Ich freue mich sehr auf euch beide. Schreib mir, [[Frage an die Freundin|welcher Vorschlag euch gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Mara]],

danke für deine Mail, und es tut mir leid, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Es lag nicht an dir, ich hatte nur sehr viel zu tun]].

Dass du einen neuen Freund hast, freut mich. [[Reaktion auf den neuen Freund|Ich hoffe, dass er so gut zu dir passt, wie du es dir wünschst]]. Ich lerne ihn gern kennen.

Bei der Übernachtung auf eurer Reise bin ich unsicher. Einerseits [[Vorteil des Hotels|ist ein Hotel bequem]], andererseits [[Nachteil des Hotels|kann es teuer sein]]. Ich würde eher [[Unterkunft|eine einfache Pension in meiner Nähe]] empfehlen.

Ein Treffen finde ich sehr schön, aber ich muss prüfen, ob es klappt. [[Voraussetzung für das Treffen|Ich habe in zwei Wochen vielleicht einen Termin]]. Wenn es geht, schlage ich [[Treffpunkt|ein Treffen am Abend im Restaurant]] vor.

Für den Abend könnte ich einen Tisch reservieren: [[Restaurantidee|in einem kleinen italienischen Restaurant mit gutem Essen]]. Wenn ihr lieber etwas anderes möchtet, [[Alternative|suche ich ein Lokal mit vegetarischer Küche]]. Sagt mir einfach, was euch lieber ist.

Und noch etwas: Ich bringe [[Mitbringsel|ein kleines Geschenk für euch beide]] mit, als Willkommensgruß. Du darfst gespannt sein, [[Neugier|was ich ausgesucht habe]]. Das ist nicht viel, aber es zeigt, wie sehr ich mich freue, euch endlich zu treffen.

Schreib mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Mara]],

danke fürs Schreiben, ich arbeite deine Fragen nacheinander ab. Als Erstes: Entschuldige, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Ich war beruflich eingespannt]].

Als Nächstes zu deinem Freund: [[Reaktion auf den neuen Freund|Ich freue mich für dich und möchte ihn kennenlernen]].

Dann zur Übernachtung: Ich empfehle [[Unterkunft|ein Hotel mit Frühstück]]. Zuletzt zum Treffen: Wir treffen uns [[Treffpunkt|am Samstag um 19 Uhr im Restaurant]].

Ein kleiner Wunsch noch: Erzählt mir bitte beim Treffen von eurer ganzen Reise, besonders [[Reisethema|von den Orten, die euch am besten gefallen haben]]. Ich möchte auch hören, [[Frage|wie ihr euch kennengelernt habt]]. Das ist bestimmt eine schöne Geschichte.

Zum Schluss möchte ich dir sagen, dass ich wirklich froh bin, dass du dich meldest. [[Dank|Ohne deine Mail hätte ich so lange nichts von dir gehört]]. Ich verspreche, dass ich in Zukunft öfter schreibe, und [[Versprechen|rufe dich auch zwischendurch an]].

Ich freue mich sehr auf euer Kommen und auf ein langes, schönes Wochenende mit euch. Bei der Reise [[Reisehinweis|achtet bitte auf die Baustellen]], und für den Abend plane ich [[Abendplan|ein gemeinsames Essen mit Wein]]. Ich bin gespannt auf [[Vorfreude|deinen Freund und eure Geschichten]]. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|ob dir das gefällt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Mara]],

deine Mail hat mich sehr gefreut. Es tut mir leid, dass ich lange nicht geschrieben habe. [[Grund für die Pause|Ich wollte oft schreiben, aber die Tage vergingen so schnell]]. Ich hoffe, du verzeihst mir.

Dass du einen neuen Freund hast, freut mich von Herzen. [[Reaktion auf den neuen Freund|Ich wünsche euch beiden viel Glück und freue mich auf das Kennenlernen]].

Für euch beide habe ich [[Unterkunft|ein gemütliches Hotel ausgesucht, in dem ihr euch wohlfühlt]]. Wenn ihr möchtet, [[Hilfsangebot|reserviere ich es für euch]].

Für unser Treffen wünsche ich mir [[Treffpunkt|einen ruhigen Abend in einem netten Restaurant]], damit wir in Ruhe reden können.

Falls ihr etwas Besonderes braucht, etwa [[Besonderer Bedarf|ein ruhiges Zimmer oder ein Bett für zwei]], sagt es mir bitte rechtzeitig. Ich frage dann im Hotel nach. Ich möchte, dass ihr euch bei uns wohlfühlt und die Reise genießt.

Falls es doch nicht klappt, wegen des Wetters oder weil [[Möglicher Grund|ihr zu spät ankommt]], können wir uns auch kurz an einem Rastplatz treffen. Das wäre dann [[Alternative|ein schneller Kaffee, aber ein wunderbares Wiedersehen]]. Ich bin da flexibel und freue mich sehr.

Ich freue mich auf [[Vorfreude|ein langes Gespräch]], auf [[Weitere Vorfreude|eure Fotos]] und auf [[Dritte Vorfreude|einen schönen Abend]]. Erzähl mir, [[Frage an die Freundin|wie ihr zueinander gefunden habt]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Mara]],

ja, ich war ewig weg und habe leider nicht geschrieben, sorry! [[Grund für die Pause|Ich hatte viel um die Ohren]].

Dein neuer Freund? [[Reaktion auf den neuen Freund|Cool, ich freue mich und will ihn unbedingt kennenlernen]].

Hotel: [[Unterkunft|Es gibt eins in meiner Straße, günstig und nett]]. Oder [[Alternative Unterkunft|ihr schlaft bei mir, wenn es euch nicht stört]].

Treffen: [[Treffpunkt|Abends ein Bier oder Eis in der Stadt]], das passt.

Zuletzt noch ein praktischer Hinweis zum Treffen: Ich komme [[Ankunftszeit|pünktlich um sieben Uhr]] und warte [[Treffpunkt|vor dem Eingang]], damit wir uns nicht verpassen. Mein Handy habe ich dabei, und ich freue mich schon auf [[Vorfreude|euer Gesicht, wenn ihr mich seht]].

Ach ja, bitte sag deinem Freund viele Grüße von mir: [[Gruß|Ich freue mich darauf, ihn kennenzulernen und mit euch beiden zu lachen]]. Ich hoffe, dass wir uns schnell verstehen, denn [[Grund|Freunde von Freunden sind für mich immer willkommen]].

Ich freue mich echt auf euch beide und auf [[Vorfreude|eure Reise und eure Geschichten]], das wird richtig schön. Das wird bestimmt ein toller Abend mit vielen Geschichten, und ich hoffe, dass euer Auto gut durchhält, damit ihr gut bei mir ankommt. Meld dich, [[Frage an die Freundin|wann ihr da seid]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];

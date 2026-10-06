// v2 (B2-style): Jan schickt Urlaubsgrüße aus Rom (Museen, Parks, Essen, Rockkonzert, in drei Tagen zurück). Points: Ihre Lieblingsstadt · welche Musik Sie mögen · Ihre Pläne für den nächsten Urlaub ·
// ob Sie sich mit Jan treffen möchten — plus: Reaktion auf die Grüße aus Rom ("Du weißt ja, wie sehr mir diese Stadt gefällt"), das Rockkonzert.
export const kw = [/Lieblingsstadt|Stadt/i, /Musik|Lieder|Band|Rock|Pop|Konzert|Jazz|Klassik|Songs|Playlist/i, /Urlaub|Ferien|Reise|verreis|reise|fahre/i, /treff/i, /Rom|Grüße|Rockkonzert|Konzert|Museen/i];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Lieber [[Name des Freundes|Jan]],

vielen Dank für deine Grüße aus Rom, ich habe mich sehr gefreut! [[Reaktion auf die Grüße|Dass du viel unterwegs bist und alles genießt, klingt nach einem perfekten Urlaub]]. Dein Rockkonzert muss ein tolles Erlebnis gewesen sein.

Du fragst nach meiner Lieblingsstadt: [[Lieblingsstadt|Das ist für mich Lissabon]], weil [[Grund für die Lieblingsstadt|die Altstadt, das Meer und die Straßenbahnen so charmant sind]].

Zur Musik: Ich höre am liebsten [[Musikrichtung|Pop und Soul]], und manchmal [[Zweite Musikrichtung|Jazz am Abend]]. Ein Rockkonzert würde mir auch gefallen.

Für meinen nächsten Urlaub plane ich [[Urlaubsziel|eine Reise nach Portugal]]. Ich möchte [[Aktivität im Urlaub|am Strand entspannen und kleine Städte besuchen]].

Deine Idee, uns wiederzusehen, gefällt mir sehr. [[Treffvorschlag|Wie wäre es am Samstag nach deiner Rückkehr bei einem Kaffee]]?

Rom kenne ich nur von Fotos, deshalb interessiert mich: [[Frage|Welches Museum hat dir am besten gefallen, und was war das beste Essen]]? Ich träume schon lange davon, [[Wunsch|einmal im Kolosseum zu stehen und danach Eis zu essen]]. Vielleicht fahre ich auch bald hin, [[Plan|wenn ich Urlaub bekomme]].

Zu meiner Musik noch etwas: [[Beschreibung|Ich gehe gern auf Konzerte und habe schon viele Bands gesehen]]. Mein bestes Konzert war [[Konzert|ein Jazzabend in einer kleinen Bar]]. Wenn du magst, gehen wir einmal zusammen, [[Idee|wenn eine gute Band in der Nähe spielt]].

Für unser Treffen habe ich auch Ideen: Wir könnten [[Idee|in ein italienisches Restaurant gehen, damit du mir von Rom erzählen kannst]]. Dazu [[Zusatzidee|bringst du ein paar Fotos mit]], und ich bringe [[Mitbringsel|ein kleines Willkommensgeschenk]] mit. So wird der Abend noch schöner.

Ich wünsche dir noch einen [[Wunsch|erholsamen und sonnigen Rest des Urlaubs]] und eine [[Wunsch 2|gute Heimreise]]. Pass auf dich auf, und lass dich nicht von den Touristenmassen stressen.

Schreib mir bitte, [[Frage an den Freund|wann du wieder in Deutschland bist]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name des Freundes|Jan]],

danke für die Grüße aus Rom! [[Reaktion auf die Grüße|Museen, Parks, Pizza und ein Rockkonzert, das klingt nach einem Traumurlaub]]. Ich bin ein bisschen neidisch.

Meine Lieblingsstadt? [[Lieblingsstadt|Barcelona]], [[Grund für die Lieblingsstadt|wegen Strand, Tapas und Gaudí]].

Musik: [[Musikrichtung|Ich höre alles Mögliche, aber am liebsten Indie und elektronische Musik]].

Mein nächster Urlaub: [[Urlaubsziel|Ich fahre im Herbst mit Freunden nach Berlin]]. Dort [[Aktivität im Urlaub|wollen wir Clubs und Museen besuchen]].

Treffen? Klar! [[Treffvorschlag|Wir könnten am Wochenende nach deiner Rückkehr ein Bier trinken gehen]].

Dein Rockkonzert klingt toll: [[Frage|Welche Band war es, und wie war die Stimmung]]? Ich liebe Konzerte, [[Vorliebe|besonders Open-Air im Sommer]]. Wenn du mir die Band nennst, höre ich mir ihre Lieder an, [[Folge|dann können wir darüber reden, wenn wir uns sehen]].

Ich höre auch gern [[Musikrichtung|Lieder aus anderen Ländern, spanisch, französisch, arabisch]]. Das gibt mir ein Gefühl von Fernweh. Vielleicht gefällt dir das auch, [[Idee|ich schicke dir gern eine Playlist]].

Wenn du zurück bist, bist du bestimmt müde: [[Hinweis|Dann machen wir es ruhig, ein Kaffee und ein Spaziergang]]. Ich plane nichts Großes, [[Folge|damit du dich erholen kannst]]. Und wir haben noch viel Zeit, uns zu sehen.

Falls du noch Zeit hast, schau dir [[Tipp|die Spanische Treppe bei Sonnenuntergang]] an, das ist wunderschön. Und probier [[Tipp 2|ein Eis in einer kleinen Gasse]], dort schmeckt es besser als an den großen Plätzen.

Meld dich, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Lieber [[Name des Freundes|Jan]],

wow, Grüße aus Rom, was für eine schöne Überraschung! [[Reaktion auf die Grüße|Rom ist ein Traum, und ein Rockkonzert dort muss unglaublich gewesen sein]]. Ich freue mich riesig für dich.

Meine Lieblingsstadt: [[Lieblingsstadt|Wien]], weil [[Grund für die Lieblingsstadt|dort Kultur, Kaffee und Musik zusammenkommen]].

Musik: Ich liebe [[Musikrichtung|Klassik und Rock]], und [[Zweite Musikrichtung|am liebsten live auf Konzerten]].

Mein nächster Urlaub: [[Urlaubsziel|Ich fahre im Sommer nach Schottland]], und ich freue mich auf [[Aktivität im Urlaub|Wanderungen und Burgen]].

Ein Treffen? Unbedingt! [[Treffvorschlag|Ich schlage Samstagabend bei mir vor, ich koche etwas Italienisches]].

Wenn ich an Rom denke, fällt mir sofort [[Bild|der Trevi-Brunnen mit den vielen Menschen und dem Glitzern des Wassers]] ein. Ich war einmal dort, [[Erinnerung|und habe wie jeder eine Münze hineingeworfen]]. Es ist ein Ort, der Hoffnung macht, finde ich.

Musik ist für mich [[Bedeutung|ein Weg, mich zu entspannen und gleichzeitig Energie zu bekommen]]. Beim Kochen höre ich Soul, beim Joggen Rock. Für jede Situation habe ich die passende Musik, [[Folge|und das macht den Alltag leichter]].

Ich schlage ein Treffen [[Terminvorschlag|am Sonntagnachmittag]] vor, weil [[Grund|ich da Zeit habe und du dich vom Flug erholt hast]]. Wir können in meinem Lieblingscafé sitzen, [[Beschreibung|mit den besten Kuchen der Stadt]]. Das wird gemütlich.

Genieße die letzten Tage und [[Rat|nimm dir Zeit für einen langen Abendspaziergang]] durch die Altstadt. Die Beleuchtung macht Rom nachts zu einem Märchen, [[Folge|und das vergisst man nie wieder]].

Schreib mir bald, [[Frage an den Freund|wann du landest]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Lieber [[Name des Freundes|Jan]],

vielen Dank für deine Grüße. Jeden deiner Punkte beantworte ich in der Reihenfolge, in der du ihn genannt hast.

Erstens, Rom: [[Reaktion auf die Grüße|Ich freue mich, dass dir der Urlaub gefällt und dass du so viel erlebst]].

Zweitens, meine Lieblingsstadt: [[Lieblingsstadt|Hamburg]], weil [[Grund für die Lieblingsstadt|sie am Wasser liegt und viel Kultur bietet]].

Drittens, die Musik: [[Musikrichtung|Ich höre am liebsten Pop und Rock]].

Viertens, mein nächster Urlaub: [[Urlaubsziel|Eine Woche in Kroatien]].

Fünftens, ein Treffen: Ich schlage [[Treffvorschlag|Samstag, 15 Uhr in einem Café in der Innenstadt]] vor.

Ergänzend interessiert mich, [[Frage|wie du dich in Rom bewegst, zu Fuß oder mit der Metro]]. Das ist wichtig für meine eigene Reiseplanung. Ich habe gehört, [[Information|dass man in Rom viel laufen muss, aber alles sehenswert ist]].

Ergänzend: Ich spiele selbst [[Instrument|ein bisschen Gitarre]], aber nur für mich. Ich liebe es, nach der Arbeit ein paar Akkorde zu spielen. Wenn du Lust hast, [[Angebot|spiele ich dir beim Treffen etwas vor]], aber erwarte nicht zu viel.

Ergänzend schlage ich vor, [[Vorschlag|das Treffen mit einem Konzertbesuch zu verbinden]], falls in den nächsten Wochen etwas spielt. Dann haben wir ein Thema, und die Musik tut uns beiden gut. Ich recherchiere gern, [[Angebot|welche Bands auftreten]].

Bitte vergiss nicht, [[Hinweis|dein Handy aufzuladen und die Fotos zu sichern]], damit du nichts verlierst. Ich bin gespannt auf alle Bilder, [[Wunsch|besonders auf die vom Konzert und vom Essen]].

Bitte teile mir mit, [[Frage an den Freund|ob dir der Termin passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Lieber [[Name des Freundes|Jan]],

danke für deine Grüße aus Rom! [[Reaktion auf die Grüße|Schön, dass du so viel siehst, ich helfe dir gern mit Tipps]].

Meine Lieblingsstadt: [[Lieblingsstadt|Prag]], weil [[Grund für die Lieblingsstadt|man dort alles zu Fuß erreicht und günstig essen kann]]. Ich kann dir [[Praktische Hilfe|einen Reiseführer leihen]], wenn du magst.

Musik: [[Musikrichtung|Rock, Pop und manchmal Klassik]].

Mein nächster Urlaub: [[Urlaubsziel|Südtirol]], und [[Aktivität im Urlaub|wir wandern dort eine Woche]].

Ein Treffen? Gern! [[Treffvorschlag|Ich hole dich nach deiner Rückkehr vom Bahnhof ab, dann gehen wir essen]].

Weil du in Rom viel unterwegs bist, empfehle ich dir, [[Tipp|abends in Trastevere zu essen, dort gibt es authentische Küche]]. Ich habe das Viertel bei meinem letzten Besuch entdeckt, [[Erfahrung|und es war der schönste Abend meiner Reise]]. Ein bisschen Ruhe tut dem Urlaub gut.

Praktisch: Ich nutze [[Hilfsmittel|eine Musik-App, die mir jede Woche neue Lieder vorschlägt]]. So entdecke ich immer wieder Neues. Wenn du magst, [[Hilfsangebot|zeige ich dir, wie das funktioniert]], dann bekommst du auch Vorschläge für Rockkonzerte.

Ich helfe dir gern, die Rückkehr zu organisieren: [[Hilfsangebot|Ich hole dich am Flughafen ab, wenn du magst]]. Dann sparst du Zeit und Geld. Sag mir einfach, [[Frage|wann dein Flug ankommt]], und ich bin da.

Wenn du Hilfe mit dem Gepäck oder dem Rückflug brauchst, [[Angebot|ruf mich einfach an]]. Ich bin zu Hause erreichbar. Und ich freue mich, [[Gefühl|bald wieder deine Stimme zu hören]].

Sag mir bitte, [[Frage an den Freund|wann du ankommst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name des Freundes|Jan]],

ich danke dir für deine Grüße, denn [[Begründung für die Freude|ich habe lange nichts von dir gehört]]. [[Reaktion auf die Grüße|Rom ist ein toller Ort für einen Urlaub]].

Meine Lieblingsstadt ist [[Lieblingsstadt|München]], weil [[Grund für die Lieblingsstadt|dort Berge, Seen und Kultur nah beieinander liegen]].

Ich mag [[Musikrichtung|Rock und Pop]], da [[Grund für die Musik|sie mich antreibt und gute Laune macht]].

Mein nächster Urlaub: [[Urlaubsziel|Spanien]], weil [[Grund für das Urlaubsziel|ich Sonne brauche]].

Ich treffe dich gern, denn [[Grund für das Treffen|wir haben uns lange nicht gesehen]]. [[Treffvorschlag|Der Samstag passt mir gut]].

Ich verstehe gut, warum dir Rom so gefällt: [[Grund|Es gibt Geschichte, Kunst und Genuss auf engem Raum]]. Das ist selten. Deshalb bin ich froh, dass du dort bist, [[Folge|und ich freue mich auf deine Fotos]].

Ich mag Rock, weil [[Grund|er mich antreibt und mir gute Laune macht]], und Pop, weil [[Grund 2|man dazu singen und tanzen kann]]. Beides ist für mich wichtig. Dein Rockkonzert hat mich daran erinnert, [[Folge|wie schön Livemusik ist]].

Ein Treffen ist wichtig, weil [[Grund|wir uns lange nicht gesehen haben und viel zu erzählen haben]]. Außerdem [[Zweiter Grund|brauchen wir beide etwas Gutes nach der Arbeit]]. Deshalb bin ich sicher, dass es klappt.

Hoffentlich hast du genug Zeit für Erholung, denn [[Hinweis|nach so einem aufregenden Urlaub braucht man oft einen Tag Pause]]. Plane den Montag am besten frei, [[Folge|dann kommst du gut an]].

Schreib mir, [[Frage an den Freund|ob dir das passt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Lieber [[Name des Freundes|Jan]],

danke für deine Grüße, hier kurz meine Antworten.

Rom: [[Reaktion auf die Grüße|Klingt toll]].

Lieblingsstadt: [[Lieblingsstadt|Lissabon]].

Musik: [[Musikrichtung|Pop und Jazz]].

Nächster Urlaub: [[Urlaubsziel|Portugal]].

Treffen: [[Treffvorschlag|Samstag, Café]].

Wenn du zurück bist, würde ich gern [[Wunsch|deine Fotos und Geschichten hören]], bei einem Kaffee. Ich habe viel Zeit und höre gern zu. Außerdem möchte ich wissen, [[Frage|ob du ein kleines Souvenir für mich hast, vielleicht eine Postkarte]].

Mein Lieblingslied ist [[Lied|ein alter Rocksong aus meiner Jugend]]. Immer wenn ich ihn höre, werde ich emotional. Vielleicht hast du auch so ein Lied, [[Frage|erzähl mir davon, wenn wir uns sehen]].

Ich schlage vor, [[Vorschlag|dass wir uns am Freitagabend treffen und ein Glas Wein trinken]]. Das ist entspannt und kostet nicht viel. Wenn du lieber am Wochenende möchtest, [[Alternative|passt mir auch der Samstag]]. Hauptsache, wir sehen uns.

Ich bin neugierig, welche [[Frage|Souvenirs du mitbringst und ob du einen Magneten für deinen Kühlschrank gekauft hast]]. Das gehört für mich zum Urlaub dazu, [[Folge|und man erinnert sich später daran]].

Ich freue mich sehr darauf, von deinem Urlaub zu hören, und ich hoffe, dass du dich gut erholst, bevor der Alltag wieder beginnt. Gib mir bitte kurz Bescheid, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Lieber [[Name des Freundes|Jan]],

Rom, Museen, Pizza und ein Rockkonzert, und ich sitze im Büro! [[Reaktion auf die Grüße|Ich bin neidisch, aber ich verzeihe dir]].

Meine Lieblingsstadt: [[Lieblingsstadt|Wien, wegen der Schnitzel und der Sachertorte]].

Musik: [[Musikrichtung|Ich höre alles, was keine Nachbarn stört]]. Rock ist okay, [[Einschränkung|aber nicht um sechs Uhr morgens]].

Mein nächster Urlaub: [[Urlaubsziel|Ich fahre irgendwohin, wo es nicht regnet]].

Treffen? [[Treffvorschlag|Gern, ich bringe auch Kekse mit]].

Rom hat auch Schattenseiten: [[Hinweis|viele Touristen, Hitze und lange Schlangen]]. Aber ich glaube, du hast sie gut gemeistert. Ich beneide dich trotzdem, [[Folge|weil ich selbst gern einmal dort wäre]].

In der Musik habe ich einen Geschmack, den viele komisch finden: [[Geschmack|Ich mag Schlager, wenn ich allein bin]]. Aber ich gebe es nur Freunden zu. Dir vertraue ich das an, [[Folge|bitte nicht weitersagen]].

Wir könnten uns auch [[Idee|in einer Pizzeria treffen, um Rom noch einmal zu feiern]]. Du erzählst von deinen Erlebnissen, ich von meinen Plänen. Das hat etwas Symbolisches, [[Folge|und es wird sicher lustig]].

Falls das Wetter in Rom sehr heiß ist, [[Tipp|trink viel Wasser und mach mittags eine Pause im Schatten]]. Das habe ich bei meinem Besuch gelernt, [[Erfahrung|nachdem ich einen Sonnenstich bekommen hatte]].

Schreib bald, [[Frage an den Freund|ob du Souvenirs mitbringst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Lieber [[Name des Freundes|Jan]],

als ich deine Grüße gelesen habe, musste ich an unsere gemeinsame Reise denken. [[Erinnerung an früher|Wir waren damals in Italien und haben nächtelang geredet]]. Rom ist wunderbar.

Meine Lieblingsstadt: [[Lieblingsstadt|Florenz]], weil [[Grund für die Lieblingsstadt|ich dort als Kind war und es nie vergessen habe]].

Musik: [[Musikrichtung|Ich höre gern Lieder, die mich an früher erinnern]].

Mein nächster Urlaub: [[Urlaubsziel|Ich fahre zu meiner Familie ans Meer]].

Ein Treffen? [[Treffvorschlag|Sehr gern, bei uns im Café]].

Ich erinnere mich an meinen ersten Auslandsurlaub: [[Erinnerung|Wir waren in Italien, ich war sieben, und ich aß das erste Mal Pizza]]. Seitdem liebe ich das Land, [[Folge|und ich träume von der Rückkehr]].

Musik erinnert mich an meine Kindheit: [[Erinnerung|Mein Vater hat jeden Sonntag Platten gehört, und wir haben getanzt]]. Deshalb mag ich Musik, die Geschichten erzählt. Rock von früher, [[Beispiel|zum Beispiel von den Beatles oder Queen]], gehört dazu.

Mir fällt ein Treffpunkt ein, an dem wir früher oft waren: [[Erinnerung|das kleine Café an der Ecke, in dem wir lange gesessen haben]]. Dort sind die Kellner nett, und der Kuchen ist gut. Ich lade dich dorthin ein, [[Einladung|auf meine Kosten]].

Es ist schön, dass wir uns auch über Entfernung verstehen: [[Gefühl|Freundschaft hält, auch wenn man sich lange nicht sieht]]. Das beweist du mit deinen Grüßen, [[Dank|und dafür danke ich dir]].

Erzähl mir, [[Frage an den Freund|wie das Konzert war]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name des Freundes|Jan]],

danke für deine Grüße. [[Reaktion auf die Grüße|Schön, dass dir Rom so gefällt]]. Dazu hätte ich einige Vorschläge.

Meine Lieblingsstadt: [[Lieblingsstadt|Hamburg]]. Mein erster Vorschlag: Wir fahren [[Vorschlag|zusammen für ein Wochenende dorthin]].

Musik: [[Musikrichtung|Rock und Pop]]. Mein zweiter Vorschlag: [[Vorschlag 2|Wir gehen gemeinsam auf ein Konzert]].

Mein nächster Urlaub: [[Urlaubsziel|Griechenland]].

Mein dritter Vorschlag: [[Treffvorschlag|Wir treffen uns nach deiner Rückkehr zum Essen]].

Mein vierter Vorschlag: [[Vorschlag|Wir planen zusammen eine Reise nach Italien im nächsten Jahr]]. Mein fünfter: [[Vorschlag 2|Wir machen vorher einen Italienischkurs]]. Das wäre ein großer Spaß, und Rom wäre unser erstes Ziel.

Mein sechster Vorschlag: [[Vorschlag|Wir gehen im Herbst zusammen auf ein Konzert]], zum Beispiel [[Beispiel|zu einer Rockband in unserer Stadt]]. Mein siebter: [[Vorschlag 2|Wir hören vorher zusammen die Lieder]]. Das macht Spaß und bereitet vor.

Mein achter Vorschlag: [[Vorschlag|Wir treffen uns zu einem gemeinsamen Kochabend]], bei dem du ein römisches Rezept zeigst. Mein neunter: [[Vorschlag 2|Wir hören dabei Musik aus Italien]]. Das passt zu deinem Urlaub und macht Laune.

Ich habe schon überlegt, [[Idee|ob wir nächstes Jahr eine Städtereise zu zweit planen]]. Es muss nicht Rom sein, aber eine Stadt mit Musik und gutem Essen. Das wäre ein schönes Ziel für uns, [[Folge|und wir hätten viel Freude]].

Was hältst du davon? Sag mir bitte kurz, [[Frage an den Freund|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Lieber [[Name des Freundes|Jan]],

danke für deine Grüße. [[Reaktion auf die Grüße|Rom klingt wunderbar, auch wenn der Urlaub bald endet]].

Meine Lieblingsstadt zu nennen, ist schwer. Einerseits [[Vorteil einer Stadt|mag ich Wien wegen der Kultur]], andererseits [[Vorteil einer anderen Stadt|liebe ich Lissabon wegen des Meeres]]. Ich würde sagen, [[Lieblingsstadt|Wien]].

Musik: [[Musikrichtung|Ich höre je nach Stimmung Pop oder Klassik]].

Mein nächster Urlaub ist noch unsicher: [[Urlaubsziel|Vielleicht Italien, aber das hängt von der Arbeit ab]].

Ein Treffen finde ich schön, [[Treffvorschlag|wenn es am Wochenende klappt]].

Ich bin gespannt, was du in Rom noch erlebst: [[Frage|Hast du noch ein Konzert geplant, oder besichtigst du die Vatikanischen Museen]]? Wenn du magst, schreibe mir kurz davon. [[Hinweis|Aber nur, wenn du Zeit hast, Urlaub ist zum Erholen da]].

Bei der Musik bin ich eher vorsichtig: [[Hinweis|Ich mag nicht alles, was laut ist]]. Aber ein gutes Rockkonzert kann auch mich begeistern. Es hängt von der Qualität ab, [[Folge|und vom Mitsingen]].

Ich würde mich über ein Treffen freuen, [[Bedingung|wenn du nach der Reise nicht zu müde bist]]. Ich plane es lieber flexibel. Sag mir einfach, welcher Tag dir recht ist, [[Folge|dann passe ich mich an]].

Ich möchte dich nicht drängen, aber [[Hinweis|wenn es dir nach dem Urlaub zu viel wird, sag es ehrlich]]. Dann verschieben wir das Treffen einfach. Wichtig ist, [[Folge|dass du dich erholst]], danach sehen wir uns.

Sag mir bitte, [[Frage an den Freund|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Lieber [[Name des Freundes|Jan]],

danke für deine Grüße, ich antworte Schritt für Schritt. Als Erstes: [[Reaktion auf die Grüße|Schön, dass dir Rom gefällt]].

Als Nächstes zu meiner Lieblingsstadt: [[Lieblingsstadt|Lissabon]].

Dann zur Musik: [[Musikrichtung|Pop, Jazz]].

Danach zum Urlaub: [[Urlaubsziel|Portugal]].

Zuletzt zum Treffen: [[Treffvorschlag|Samstag im Café]].

Zum Schluss ein Schritt: [[Schritt|Schick mir bitte ein Foto, das dir besonders gefällt]]. Ich mache daraus ein Hintergrundbild. So habe ich ein Stück Rom bei mir, [[Folge|bis ich selbst hinfahre]].

Als dritten Schritt schlage ich vor, [[Schritt|dass wir uns über Musik austauschen, bevor wir uns treffen]]. Schick mir drei Lieder, die du magst, ich schicke dir drei von mir. So kennen wir den Geschmack des anderen, [[Folge|und das Gespräch ist leichter]].

Als vierten Schritt schlage ich vor, [[Schritt|dass wir kurz telefonieren, sobald du angekommen bist]]. Dann finden wir gemeinsam den Termin. Das ist unkomplizierter als viele Nachrichten, [[Folge|und ich höre deine Stimme]].

Zum Abschluss ein letzter Schritt: [[Schritt|Schick mir bitte eine kurze Nachricht, wenn du gut gelandet bist]]. Das beruhigt mich, [[Folge|und ich weiß, dass alles in Ordnung ist]].

Ich freue mich auf unser Wiedersehen und auf deine Geschichten aus Rom. Wie geht es weiter? Schreib mir, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Lieber [[Name des Freundes|Jan]],

deine Grüße haben mich sehr gefreut. [[Reaktion auf die Grüße|Ich freue mich, dass du so einen schönen Urlaub hast]].

Meine Lieblingsstadt: [[Lieblingsstadt|Wien]], weil [[Grund für die Lieblingsstadt|ich mich dort geborgen fühle]].

Musik: [[Musikrichtung|Ich höre gern ruhige Lieder und manchmal Klassik]].

Mein nächster Urlaub: [[Urlaubsziel|ein ruhiger Ort am See]].

Ich würde mich freuen, dich zu treffen: [[Treffvorschlag|am Wochenende bei einem Spaziergang]].

Ich wünsche dir noch drei wunderschöne Tage in Rom: [[Wunsch|mit viel Sonne, gutem Essen und schönen Begegnungen]]. Genieße jeden Moment, [[Rat|und vergiss das Eis nicht]]. Danach darfst du mir alles erzählen.

Musik hilft mir, wenn ich traurig bin: [[Wirkung|Ein ruhiges Lied und ein Tee, und alles ist besser]]. Vielleicht kennst du das auch. Wenn nicht, zeige ich dir gern meine Lieblingslieder, [[Angebot|bei einem gemütlichen Abend]].

Es wäre schön, wenn wir uns bald sehen: [[Wunsch|Ich vermisse unsere Gespräche und den Humor]]. Ich freue mich darauf, dich in den Arm zu nehmen, [[Folge|und alles über Rom zu hören]]. Komm gesund zurück.

Ich denke an dich und wünsche dir [[Wunsch|noch viele schöne Stunden in der Ewigen Stadt]]. Danke, dass du an mich gedacht hast. Das ist ein schönes Gefühl, [[Folge|und es macht den Alltag heller]].

Erzähl mir, [[Frage an den Freund|wie es dir geht]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name des Freundes|Jan]],

Rom, wow! [[Reaktion auf die Grüße|Klingt super]].

Lieblingsstadt: [[Lieblingsstadt|Berlin]].

Musik: [[Musikrichtung|Alles, hauptsache laut]].

Urlaub: [[Urlaubsziel|Spanien]].

Treffen? [[Treffvorschlag|Klar, am Wochenende]].

Ein kurzer Wunsch: [[Wunsch|Iss ein Eis für mich mit]]. Und denk an mich, wenn du am Trevi-Brunnen stehst. Dann wirf eine Münze für uns beide, [[Folge|damit wir bald wieder zusammen verreisen]].

Mein Musikgeschmack ist breit: [[Beschreibung|alles, was Rhythmus hat]]. Ich tanze gern, auch allein in der Küche. Du siehst, ich bin kein Kenner, [[Folge|aber ich habe Spaß]].

Ein kurzer Vorschlag noch: [[Vorschlag|Treffen wir uns am Wochenende im Park, mit Decke und Eis]]. Das ist einfach und schön. Und du erzählst mir alles, [[Folge|während wir die Sonne genießen]].

Ach ja, noch ein kleiner Wunsch: [[Wunsch|Bring mir eine Postkarte mit]]. Ich sammle sie, und aus Rom fehlt mir noch eine. Das wäre eine schöne Erinnerung, [[Folge|und ich hänge sie neben mein Bett]].

Ich freue mich echt auf deine Fotos und Geschichten und hoffe, dass wir uns bald sehen, denn ich habe dich vermisst. Genieß die letzten Tage in Rom, und iss ein Eis für mich mit, das wäre toll. Bis bald und eine gute Reise nach Hause! Meld dich, [[Frage an den Freund|wann du zurück bist]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },

  // 15
  { label: "dankbar, wertschätzend", t: `Lieber [[Name des Freundes|Jan]],

ich danke dir für deine Grüße. [[Reaktion auf die Grüße|Es freut mich sehr, dass du an mich denkst, auch im Urlaub]]. Du bist ein toller Freund.

Meine Lieblingsstadt: [[Lieblingsstadt|Lissabon]].

Musik: [[Musikrichtung|Ich höre gern Pop und Jazz]].

Mein nächster Urlaub: [[Urlaubsziel|Portugal]].

Für die Idee eines Treffens bin ich dankbar: [[Treffvorschlag|Gern nach deiner Rückkehr]].

Ich bin dankbar für deine Grüße aus Rom: [[Dank|Sie haben meinen Tag erhellt]]. Es ist schön zu wissen, dass jemand an einen denkt, [[Gefühl|auch aus der Ferne]]. Das bedeutet mir mehr, als du dir vorstellst.

Ich bin dankbar für die Musik in meinem Leben: [[Dank|Sie begleitet mich durch gute und schlechte Zeiten]]. Und ich bin froh, Freunde zu haben, die meine Leidenschaft teilen, [[Gefühl|so wie du]].

Ich danke dir für die Idee eines Treffens: [[Dank|Es zeigt mir, dass dir unsere Freundschaft wichtig ist]]. Ich freue mich so sehr darauf, [[Gefühl|und werde jede Minute genießen]]. Komm gut nach Hause.

Ich bin froh, dass du im Urlaub so glücklich bist: [[Gefühl|Man spürt es in jedem Satz]]. Das freut mich ehrlich. Und ich hoffe, dass die Freude bis zu deiner Rückkehr bleibt, [[Wunsch|und noch lange danach]].

Danke für alles, schreib mir bald, [[Frage an den Freund|wann du landest]].

[[Grußformel|Dankbare Grüße]]
[[Dein Name|Nina]]` },
];
